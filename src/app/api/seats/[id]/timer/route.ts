import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateTimeCharge, formatTimeCharge, getTimeChargeDescription } from '@/lib/time-billing'
import { MembershipService } from '@/lib/membership-service'

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

    // Add any active games at this table to the new order
    const activeTableGames = await prisma.tableGameSession.findMany({
      where: {
        tableId: seatSession.seat.tableId,
        endedAt: null,
      },
      include: {
        game: true,
      },
    })

    for (const gameSession of activeTableGames) {
      await prisma.orderItem.create({
        data: {
          orderId,
          kind: 'retail',
          name: `Game: ${gameSession.game.name}`,
          qty: 1,
          unitPriceMinor: 0,
          taxMinor: 0,
          totalMinor: 0,
          meta: {
            isGame: true,
            gameId: gameSession.gameId,
            sessionId: gameSession.id,
            startedAt: gameSession.startedAt.toISOString(),
          },
        },
      })
    }

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
    const durationHours = durationMinutes / 60
    
    // Check for membership and calculate charges
    let totalPrice = 0
    let chargeDescription = ''
    let membershipUsed = null
    let membershipHoursUsed = 0
    let overageHours = 0
    
    if (seatSession.customerId) {
      // Check for active membership
      const membershipCharges = await MembershipService.calculateTimeCharges(
        seatSession.customerId,
        durationHours,
        50000 // ¥500/hour regular rate in minor units
      )
      
      // Round to nearest ¥10 to avoid odd prices like ¥866.67
      totalPrice = Math.round(membershipCharges.totalCharge / 1000) * 10 // Convert to major units and round to ¥10
      
      if (membershipCharges.membership) {
        // Member with free hours
        membershipUsed = membershipCharges.membership
        membershipHoursUsed = membershipCharges.includedHours
        overageHours = membershipCharges.overageHours
        
        if (membershipCharges.includedHours > 0 && membershipCharges.overageHours > 0) {
          chargeDescription = `${membershipCharges.includedHours.toFixed(1)}h free + ${membershipCharges.overageHours.toFixed(1)}h @ ¥300/h`
        } else if (membershipCharges.includedHours > 0) {
          chargeDescription = `${membershipCharges.includedHours.toFixed(1)}h free (membership)`
        } else {
          chargeDescription = `${membershipCharges.overageHours.toFixed(1)}h @ ¥300/h (overage)`
        }
      } else {
        // Non-member, use regular billing
        const billing = calculateTimeCharge(durationMinutes)
        totalPrice = billing.totalCharge
        chargeDescription = getTimeChargeDescription(billing)
      }
    } else {
      // No customer, use regular billing
      const billing = calculateTimeCharge(durationMinutes)
      totalPrice = billing.totalCharge
      chargeDescription = getTimeChargeDescription(billing)
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Track membership usage if applicable
      if (membershipUsed && (membershipHoursUsed > 0 || overageHours > 0)) {
        const membership = await tx.customerMembership.findFirst({
          where: {
            customerId: seatSession.customerId!,
            status: 'ACTIVE',
            endDate: { gte: new Date() }
          }
        })
        
        if (membership) {
          // Update membership hours used
          await tx.customerMembership.update({
            where: { id: membership.id },
            data: {
              hoursUsed: membership.hoursUsed + membershipHoursUsed + overageHours
            }
          })
          
          // Create usage record
          // Round overage charge to nearest ¥10 to avoid odd prices
          const overageChargeMinor = Math.round(overageHours * 300) * 100 // Round to nearest ¥10
          await tx.membershipUsage.create({
            data: {
              membershipId: membership.id,
              seatSessionId: seatSession.id,
              hoursUsed: membershipHoursUsed + overageHours,
              overageHours: overageHours,
              overageCharge: overageChargeMinor,
              description: `Table ${seatSession.seat.table.name} - Seat ${seatSession.seat.number}`
            }
          })
        }
      }
      
      // Create order item for seat time (only if there's a charge)
      let orderItem = null
      if (totalPrice > 0 || chargeDescription) {
        orderItem = await tx.orderItem.create({
          data: {
            orderId: seatSession.orderId,
            kind: 'seat_time',
            name: `Seat ${seatSession.seat.table.name}-${seatSession.seat.number} (${chargeDescription || `${durationMinutes} min`})`,
            qty: 1,
            unitPriceMinor: totalPrice * 100, // Tax-inclusive price
            taxMinor: 0, // Tax already included in price
            totalMinor: totalPrice * 100, // Total (tax inclusive)
            meta: {
              seatId: id,
              sessionId: seatSession.id,
              durationMinutes,
              membershipUsed: membershipUsed ? {
                hoursIncluded: membershipHoursUsed,
                hoursOverage: overageHours,
                planName: membershipUsed.planName
              } : null,
            },
          },
        })
      }

      // Update seat session with metadata indicating timer stopped
      const updatedSession = await tx.seatSession.update({
        where: { id: seatSession.id },
        data: {
          endedAt,
          billedMinutes: durationMinutes,
          billedItemId: orderItem?.id || null,
          meta: {
            ...seatSession.meta,
            timerStopped: true,
            stoppedAt: endedAt.toISOString()
          }
        },
      })

      // Update order status to awaiting_payment since timer has stopped
      await tx.order.update({
        where: { id: seatSession.orderId },
        data: { status: 'awaiting_payment' },
      })

      // IMPORTANT: Keep seat as occupied so customer can add items or checkout
      // Seat will be cleared only after payment is complete
      // Do NOT update seat status to 'open' here
      
      // Keep table as seated since seats are still occupied
      // Table will be marked as dirty only after all seats are cleared post-payment

      // Note: The following code block for checking other occupied seats is now removed
      // as we're keeping the seat occupied until checkout is complete

      // Note: Game sessions remain active until the seat is fully cleared after payment
      // This allows customers to continue playing while waiting to pay

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