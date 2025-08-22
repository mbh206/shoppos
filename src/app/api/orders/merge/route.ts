import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { primaryOrderId, orderIds } = body

  if (!primaryOrderId || !orderIds || !Array.isArray(orderIds)) {
    return NextResponse.json(
      { error: 'Primary order ID and order IDs array are required' },
      { status: 400 }
    )
  }

  if (!orderIds.includes(primaryOrderId)) {
    return NextResponse.json(
      { error: 'Primary order must be included in order IDs' },
      { status: 400 }
    )
  }

  try {
    // Verify all orders exist and are payable
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: { in: ['open', 'awaiting_payment'] }
      },
      include: {
        items: true,
        seatSessions: {
          include: {
            seat: {
              include: {
                table: true
              }
            }
          }
        }
      }
    })

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { error: 'Some orders not found or not payable' },
        { status: 400 }
      )
    }

    // Generate a unique payment group ID
    const paymentGroupId = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update all orders with payment group
      const updatedOrders = await Promise.all(
        orderIds.map(orderId => 
          tx.order.update({
            where: { id: orderId },
            data: {
              paymentGroupId,
              isPrimaryPayer: orderId === primaryOrderId,
              paidByOrderId: orderId === primaryOrderId ? null : primaryOrderId
            }
          })
        )
      )

      // Calculate combined totals
      const combinedTotal = orders.reduce((sum, order) => {
        const orderTotal = order.items.reduce((itemSum, item) => itemSum + item.totalMinor, 0)
        return sum + orderTotal
      }, 0)

      // Get all seat and table information
      const allSeats = orders.flatMap(o => o.seatSessions.map(s => ({
        seatId: s.seatId,
        seatNumber: s.seat.number,
        tableName: s.seat.table.name,
        tableId: s.seat.tableId
      })))

      // Get unique tables
      const uniqueTables = [...new Set(allSeats.map(s => s.tableId))]

      // Log merge event for primary order
      await tx.orderEvent.create({
        data: {
          orderId: primaryOrderId,
          kind: 'bills.merged',
          payload: {
            paymentGroupId,
            mergedOrderIds: orderIds,
            totalAmount: combinedTotal,
            seatCount: allSeats.length,
            tableCount: uniqueTables.length,
            mergedBy: session.user.id
          }
        }
      })

      // Log merge event for secondary orders
      for (const orderId of orderIds.filter(id => id !== primaryOrderId)) {
        await tx.orderEvent.create({
          data: {
            orderId,
            kind: 'bills.merged.secondary',
            payload: {
              paymentGroupId,
              primaryOrderId,
              mergedBy: session.user.id
            }
          }
        })
      }

      return {
        paymentGroupId,
        primaryOrderId,
        orders: updatedOrders,
        combinedTotal,
        seats: allSeats,
        tableCount: uniqueTables.length
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error merging bills:', error)
    return NextResponse.json(
      { error: 'Failed to merge bills' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { paymentGroupId } = body

  if (!paymentGroupId) {
    return NextResponse.json(
      { error: 'Payment group ID is required' },
      { status: 400 }
    )
  }

  try {
    // Find all orders in this payment group
    const orders = await prisma.order.findMany({
      where: {
        paymentGroupId,
        status: { in: ['open', 'awaiting_payment'] }
      }
    })

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'No orders found in payment group or already paid' },
        { status: 404 }
      )
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove payment group from all orders
      const updatedOrders = await Promise.all(
        orders.map(order => 
          tx.order.update({
            where: { id: order.id },
            data: {
              paymentGroupId: null,
              isPrimaryPayer: false,
              paidByOrderId: null
            }
          })
        )
      )

      // Log unmerge events
      for (const order of orders) {
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            kind: 'bills.unmerged',
            payload: {
              paymentGroupId,
              unmergedBy: session.user.id
            }
          }
        })
      }

      return {
        unmergedOrders: updatedOrders.length,
        orderIds: orders.map(o => o.id)
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error unmerging bills:', error)
    return NextResponse.json(
      { error: 'Failed to unmerge bills' },
      { status: 500 }
    )
  }
}