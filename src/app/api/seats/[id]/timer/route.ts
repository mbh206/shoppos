import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateTimeCharge, formatTimeCharge, getTimeChargeDescription } from '@/lib/time-billing'

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
  const { orderId, customerId } = body

  try {
    // Check if seat already has an active session
    const existingSession = await prisma.seatSession.findFirst({
      where: {
        seatId: id,
        endedAt: null,
      },
    })

    if (existingSession) {
      return NextResponse.json(
        { error: 'Seat already has an active timer' },
        { status: 400 }
      )
    }

    // Create new seat session
    const seatSession = await prisma.seatSession.create({
      data: {
        seatId: id,
        orderId,
        customerId,
        startedAt: new Date(),
      },
      include: {
        seat: {
          include: {
            table: true,
          },
        },
        order: true,
        customer: true,
      },
    })

    // Update seat status to occupied
    await prisma.seat.update({
      where: { id },
      data: { status: 'occupied' },
    })

    // Update table status to seated
    await prisma.table.update({
      where: { id: seatSession.seat.tableId },
      data: { status: 'seated' },
    })

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId,
        kind: 'seat.timer.started',
        payload: {
          seatId: id,
          sessionId: seatSession.id,
          startedAt: seatSession.startedAt.toISOString(),
        },
      },
    })

    return NextResponse.json(seatSession)
  } catch (error) {
    console.error('Error starting timer:', error)
    return NextResponse.json(
      { error: 'Failed to start timer' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Find active session
    const seatSession = await prisma.seatSession.findFirst({
      where: {
        seatId: id,
        endedAt: null,
      },
      include: {
        seat: {
          include: {
            table: true,
          },
        },
        order: true,
      },
    })

    if (!seatSession) {
      return NextResponse.json(
        { error: 'No active timer found' },
        { status: 404 }
      )
    }

    const endedAt = new Date()
    const durationMs = endedAt.getTime() - seatSession.startedAt.getTime()
    const durationMinutes = Math.floor(durationMs / (1000 * 60))
    
    // Calculate time charge using our complex billing rules
    const billing = calculateTimeCharge(durationMinutes)
    const totalPrice = billing.totalCharge
    const chargeDescription = getTimeChargeDescription(billing)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order item for seat time (only if there's a charge)
      let orderItem = null
      if (totalPrice > 0) {
        orderItem = await tx.orderItem.create({
          data: {
            orderId: seatSession.orderId,
            kind: 'seat_time',
            name: `Seat ${seatSession.seat.table.name}-${seatSession.seat.number} (${chargeDescription})`,
            qty: 1,
            unitPriceMinor: totalPrice * 100, // Convert to minor units (yen)
            taxMinor: Math.floor(totalPrice * 10), // 10% tax in minor units
            totalMinor: Math.floor(totalPrice * 110), // Total with tax in minor units
            meta: {
              seatId: id,
              sessionId: seatSession.id,
              durationMinutes,
              billing: {
                rateApplied: billing.rateApplied,
                breakdown: billing.breakdown,
              },
            },
          },
        })
      }

      // Update seat session
      const updatedSession = await tx.seatSession.update({
        where: { id: seatSession.id },
        data: {
          endedAt,
          billedMinutes: durationMinutes,
          billedItemId: orderItem?.id || null,
        },
      })

      // Update seat status
      await tx.seat.update({
        where: { id },
        data: { status: 'open' },
      })

      // Check if table should be marked as available
      const otherOccupiedSeats = await tx.seat.count({
        where: {
          tableId: seatSession.seat.tableId,
          status: 'occupied',
          id: { not: id },
        },
      })

      if (otherOccupiedSeats === 0) {
        await tx.table.update({
          where: { id: seatSession.seat.tableId },
          data: { status: 'available' },
        })
      }

      // Log order event
      await tx.orderEvent.create({
        data: {
          orderId: seatSession.orderId,
          kind: 'seat.timer.stopped',
          payload: {
            seatId: id,
            sessionId: seatSession.id,
            endedAt: endedAt.toISOString(),
            durationMinutes,
            totalPrice,
            orderItemId: orderItem?.id || null,
          },
        },
      })

      return { session: updatedSession, orderItem }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error stopping timer:', error)
    return NextResponse.json(
      { error: 'Failed to stop timer' },
      { status: 500 }
    )
  }
}