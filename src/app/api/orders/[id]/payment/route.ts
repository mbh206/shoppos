import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { method = 'cash', amountMinor } = body

  try {
    // Get the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        seatSessions: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'open' && order.status !== 'awaiting_payment') {
      return NextResponse.json({ error: 'Order is not payable' }, { status: 400 })
    }

    // Calculate order total
    const orderTotal = order.items.reduce((sum, item) => sum + item.totalMinor, 0)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment attempt
      const payment = await tx.paymentAttempt.create({
        data: {
          orderId: id,
          method: method === 'cash' ? 'cash' : 'square_terminal',
          amountMinor: amountMinor || orderTotal,
          status: 'succeeded',
        },
      })

      // Update order status to paid
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'paid',
          closedAt: new Date(),
          closedByUserId: session.user.id,
        },
      })

      // If there are seat sessions, end them
      if (order.seatSessions.length > 0) {
        for (const seatSession of order.seatSessions) {
          if (!seatSession.endedAt) {
            // End the seat session
            await tx.seatSession.update({
              where: { id: seatSession.id },
              data: {
                endedAt: new Date(),
              },
            })

            // Update seat status to open
            await tx.seat.update({
              where: { id: seatSession.seatId },
              data: { status: 'open' },
            })
          }
        }

        // Check if any tables should be marked as available
        const seatIds = order.seatSessions.map(s => s.seatId)
        const seats = await tx.seat.findMany({
          where: { id: { in: seatIds } },
          include: { table: true },
        })

        const tableIds = [...new Set(seats.map(s => s.tableId))]
        
        for (const tableId of tableIds) {
          const occupiedSeats = await tx.seat.count({
            where: {
              tableId,
              status: 'occupied',
            },
          })

          if (occupiedSeats === 0) {
            await tx.table.update({
              where: { id: tableId },
              data: { status: 'available' },
            })
          }
        }
      }

      // Log payment event
      await tx.orderEvent.create({
        data: {
          orderId: id,
          kind: 'payment.completed',
          payload: {
            method,
            amountMinor: amountMinor || orderTotal,
            paymentId: payment.id,
            closedBy: session.user.id,
          },
        },
      })

      return { order: updatedOrder, payment }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}