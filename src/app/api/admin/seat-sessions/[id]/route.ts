import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateTimeCharge, getTimeChargeDescription } from '@/lib/time-billing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const seatSession = await prisma.seatSession.findUnique({
      where: { id },
      include: {
        seat: {
          include: {
            table: true
          }
        },
        order: {
          include: {
            items: true
          }
        },
        customer: true
      }
    })

    if (!seatSession) {
      return NextResponse.json({ error: 'Seat session not found' }, { status: 404 })
    }

    return NextResponse.json(seatSession)
  } catch (error) {
    console.error('Error fetching seat session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seat session' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { startedAt, endedAt } = body

  try {
    // Get the current seat session
    const currentSession = await prisma.seatSession.findUnique({
      where: { id },
      include: {
        seat: {
          include: {
            table: true
          }
        },
        order: true
      }
    })

    if (!currentSession) {
      return NextResponse.json({ error: 'Seat session not found' }, { status: 404 })
    }

    // Only allow editing if session has a timer (startedAt is not null)
    if (!currentSession.startedAt) {
      return NextResponse.json(
        { error: 'Cannot edit times for non-timer sessions' },
        { status: 400 }
      )
    }

    // Parse the new times
    const newStartTime = startedAt ? new Date(startedAt) : currentSession.startedAt
    const newEndTime = endedAt ? new Date(endedAt) : currentSession.endedAt

    // Calculate new duration and billing if session is ended
    let billedMinutes = currentSession.billedMinutes
    let updatedOrderItem = null

    if (newEndTime) {
      const durationMs = newEndTime.getTime() - newStartTime.getTime()
      billedMinutes = Math.floor(durationMs / (1000 * 60))
      
      // Calculate new billing
      const billing = calculateTimeCharge(billedMinutes)
      const totalPrice = billing.totalCharge
      const chargeDescription = getTimeChargeDescription(billing)

      // Update or create the order item for seat time
      if (currentSession.billedItemId) {
        // Update existing order item
        updatedOrderItem = await prisma.orderItem.update({
          where: { id: currentSession.billedItemId },
          data: {
            name: `Seat ${currentSession.seat.table.name}-${currentSession.seat.number} (${chargeDescription})`,
            unitPriceMinor: totalPrice * 100,
            taxMinor: 0,
            totalMinor: totalPrice * 100,
            meta: {
              seatId: currentSession.seatId,
              sessionId: currentSession.id,
              durationMinutes: billedMinutes,
              billing: {
                rateApplied: billing.rateApplied,
                breakdown: billing.breakdown,
              },
              editedBy: session.user.email,
              editedAt: new Date().toISOString()
            }
          }
        })
      } else if (totalPrice > 0) {
        // Create new order item if there's a charge
        updatedOrderItem = await prisma.orderItem.create({
          data: {
            orderId: currentSession.orderId,
            kind: 'seat_time',
            name: `Seat ${currentSession.seat.table.name}-${currentSession.seat.number} (${chargeDescription})`,
            qty: 1,
            unitPriceMinor: totalPrice * 100,
            taxMinor: 0,
            totalMinor: totalPrice * 100,
            meta: {
              seatId: currentSession.seatId,
              sessionId: currentSession.id,
              durationMinutes: billedMinutes,
              billing: {
                rateApplied: billing.rateApplied,
                breakdown: billing.breakdown,
              },
              editedBy: session.user.email,
              editedAt: new Date().toISOString()
            }
          }
        })
      }
    }

    // Update the seat session
    const updatedSession = await prisma.seatSession.update({
      where: { id },
      data: {
        startedAt: newStartTime,
        endedAt: newEndTime,
        billedMinutes,
        billedItemId: updatedOrderItem?.id || currentSession.billedItemId
      },
      include: {
        seat: {
          include: {
            table: true
          }
        },
        order: {
          include: {
            items: true
          }
        },
        customer: true
      }
    })

    // Log the edit in order events
    await prisma.orderEvent.create({
      data: {
        orderId: currentSession.orderId,
        kind: 'seat.session.edited',
        payload: {
          sessionId: id,
          editedBy: session.user.email,
          originalStartedAt: currentSession.startedAt?.toISOString(),
          originalEndedAt: currentSession.endedAt?.toISOString(),
          newStartedAt: newStartTime.toISOString(),
          newEndedAt: newEndTime?.toISOString(),
          originalBilledMinutes: currentSession.billedMinutes,
          newBilledMinutes: billedMinutes
        }
      }
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating seat session:', error)
    return NextResponse.json(
      { error: 'Failed to update seat session' },
      { status: 500 }
    )
  }
}