import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PointsService } from '@/lib/points-service'

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
  const { 
    payments = [],  // Array of { method: 'cash' | 'card' | 'points', amount: number }
    // Legacy support for single payment method
    method,
    amountMinor 
  } = body
  
  // Convert legacy single payment to new format
  let paymentMethods = payments
  if (payments.length === 0 && method) {
    paymentMethods = [{ method, amount: amountMinor }]
  }

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
    
    // Validate payment amounts
    const totalPaid = paymentMethods.reduce((sum, p) => sum + p.amount, 0)
    if (totalPaid < orderTotal) {
      return NextResponse.json(
        { error: `Insufficient payment. Total: ¥${orderTotal/100}, Paid: ¥${totalPaid/100}` },
        { status: 400 }
      )
    }
    
    // Check points if being used
    let pointsToRedeem = 0
    let pointsCustomerId: string | null = null
    
    for (const payment of paymentMethods) {
      if (payment.method === 'points') {
        // Convert payment amount from minor units to major units (points)
        // payment.amount is in minor units (e.g., 29800 = ¥298)
        // points are stored as major units (e.g., 298 points = ¥298)
        pointsToRedeem = Math.floor(payment.amount / 100)
        
        // Must have a customer to use points
        if (!order.customerId) {
          return NextResponse.json(
            { error: 'Customer required to use points' },
            { status: 400 }
          )
        }
        
        // Check points balance
        const customer = await prisma.customer.findUnique({
          where: { id: order.customerId },
          select: { pointsBalance: true }
        })
        
        if (!customer || customer.pointsBalance < pointsToRedeem) {
          return NextResponse.json(
            { error: `Insufficient points. Balance: ${customer?.pointsBalance || 0}, Required: ${pointsToRedeem}` },
            { status: 400 }
          )
        }
        
        pointsCustomerId = order.customerId
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log(`Processing payment for order ${id}, status: ${order.status}, seatSessions: ${order.seatSessions.length}`)
      const payments = []
      
      // Process each payment method
      for (const paymentInfo of paymentMethods) {
        if (paymentInfo.amount > 0) {
          const payment = await tx.paymentAttempt.create({
            data: {
              orderId: id,
              method: paymentInfo.method === 'card' ? 'square_terminal' : 
                      paymentInfo.method === 'points' ? 'points' :
                      paymentInfo.method === 'cash' ? 'cash' : 'mixed',
              amountMinor: paymentInfo.amount,
              status: 'succeeded',
            },
          })
          payments.push(payment)
        }
      }
      
      // Redeem points if used
      if (pointsToRedeem > 0 && pointsCustomerId) {
        await PointsService.redeemPoints(
          pointsCustomerId,
          pointsToRedeem,
          id,
          `Payment for order ${id}`
        )
      }

      // Update order status to paid
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'paid',
          closedAt: new Date(),
          closedByUserId: session.user.id,
        },
      })
      
      // Award points for the purchase (excluding points used and membership purchases)
      if (order.customerId) {
        // Calculate amount eligible for points (exclude points payments and membership items)
        const cashAndCardPayments = paymentMethods
          .filter(p => p.method !== 'points')
          .reduce((sum, p) => sum + p.amount, 0)
        
        // Exclude membership purchases from points earning
        const eligibleItems = order.items.filter(item => item.kind !== 'membership')
        const eligibleTotal = eligibleItems.reduce((sum, item) => sum + item.totalMinor, 0)
        
        // Use the lesser of paid amount or eligible items total
        const amountForPoints = Math.min(cashAndCardPayments, eligibleTotal)
        
        if (amountForPoints > 0) {
          const pointsEarned = await PointsService.calculatePointsEarned(
            amountForPoints,
            order.customerId
          )
          
          if (pointsEarned > 0) {
            await PointsService.awardPoints(
              order.customerId,
              pointsEarned,
              id,
              `Earned from order ${id}`
            )
          }
        }
      }

      // If there are seat sessions, clear the seats
      if (order.seatSessions.length > 0) {
        for (const seatSession of order.seatSessions) {
          // End the seat session if not already ended
          if (!seatSession.endedAt) {
            await tx.seatSession.update({
              where: { id: seatSession.id },
              data: {
                endedAt: new Date(),
              },
            })
          }

          // Check if seat exists before updating
          const seatExists = await tx.seat.findUnique({
            where: { id: seatSession.seatId }
          })
          
          if (seatExists) {
            // Always update seat status to open when payment is complete
            await tx.seat.update({
              where: { id: seatSession.seatId },
              data: { status: 'open' },
            })
          } else {
            console.warn(`Seat ${seatSession.seatId} not found, skipping seat update`)
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
            
            // End any active game sessions for this table
            const activeGameSessions = await tx.tableGameSession.findMany({
              where: {
                tableId,
                endedAt: null,
              },
            })
            
            for (const gameSession of activeGameSessions) {
              // End the game session
              await tx.tableGameSession.update({
                where: { id: gameSession.id },
                data: { endedAt: new Date() },
              })
              
              // Mark the game as available again
              await tx.game.update({
                where: { id: gameSession.gameId },
                data: { available: true },
              })
            }
          }
        }
        
        // Track game history for customers
        if (order.customerId) {
          try {
            // Find all game items in this order
            const gameItems = order.items.filter(item => item.meta?.isGame)
            
            for (const gameItem of gameItems) {
              if (gameItem.meta?.sessionId) {
                // Check if game history already exists for this order
                const existingHistory = await tx.customerGameHistory.findFirst({
                  where: {
                    customerId: order.customerId,
                    sessionId: gameItem.meta.sessionId,
                    orderId: id,
                  }
                })
                
                if (!existingHistory) {
                  // Get the game session details
                  const gameSession = await tx.tableGameSession.findUnique({
                    where: { id: gameItem.meta.sessionId },
                    include: {
                      table: {
                        include: {
                          seats: {
                            include: {
                              seatSessions: {
                                where: {
                                  OR: [
                                    { endedAt: null },
                                    { 
                                      AND: [
                                        { endedAt: { not: null } },
                                        { order: { status: { in: ['paid', 'awaiting_payment'] } } }
                                      ]
                                    }
                                  ]
                                },
                                include: {
                                  customer: true,
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  })
                  
                  if (gameSession) {
                    // Calculate duration
                    const endTime = gameSession.endedAt || new Date()
                    const durationMinutes = Math.floor((endTime.getTime() - gameSession.startedAt.getTime()) / 60000)
                    
                    // Get all customers at the table
                    const coPlayers: string[] = []
                    const coPlayerNames: string[] = []
                    
                    for (const seat of gameSession.table.seats) {
                      for (const session of seat.seatSessions) {
                        if (session.customer && session.customer.id !== order.customerId) {
                          coPlayers.push(session.customer.id)
                          coPlayerNames.push(session.customer.displayName || 'Guest')
                        }
                      }
                    }
                    
                    // Create game history entry
                    await tx.customerGameHistory.create({
                      data: {
                        customerId: order.customerId,
                        gameId: gameItem.meta.gameId,
                        sessionId: gameItem.meta.sessionId,
                        tableId: gameSession.tableId,
                        durationMinutes,
                        coPlayers: [...new Set(coPlayers)], // Remove duplicates
                        coPlayerNames: [...new Set(coPlayerNames)],
                        orderId: id,
                      }
                    })
                  }
                }
              }
            }
          } catch (gameHistoryError) {
            // Log error but don't fail the payment
            console.error('Error tracking game history:', gameHistoryError)
          }
        }
      }

      // Log payment event
      await tx.orderEvent.create({
        data: {
          orderId: id,
          kind: 'payment.completed',
          payload: {
            methods: paymentMethods,
            totalPaid,
            paymentIds: payments.map(p => p.id),
            closedBy: session.user.id,
          },
        },
      })

      return { order: updatedOrder, payments }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error processing payment for order', id, ':', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    })
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    )
  }
}