import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { sessionIds, primarySessionId } = body

  console.log('Merge bills request:', { sessionIds, primarySessionId })

  if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0 || !primarySessionId) {
    return NextResponse.json(
      { error: 'Invalid request: sessionIds and primarySessionId are required' },
      { status: 400 }
    )
  }

  try {
    // Fetch all sessions to merge (they should have stopped timers and be awaiting payment)
    console.log('Fetching sessions to merge...')
    const sessionsToMerge = await prisma.seatSession.findMany({
      where: {
        id: { in: sessionIds },
        order: {
          status: 'awaiting_payment', // Only merge bills that are awaiting payment
        },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    })

    console.log('Sessions found:', sessionsToMerge.length, 'Expected:', sessionIds.length)
    console.log('Sessions:', sessionsToMerge.map(s => ({ 
      id: s.id, 
      orderId: s.orderId, 
      orderStatus: s.order.status 
    })))

    if (sessionsToMerge.length !== sessionIds.length) {
      console.log('Not all sessions found or ready for payment')
      return NextResponse.json(
        { error: 'Some sessions not found or not ready for payment' },
        { status: 400 }
      )
    }

    // Fetch the primary session
    console.log('Fetching primary session:', primarySessionId)
    const primarySession = await prisma.seatSession.findUnique({
      where: { id: primarySessionId },
      include: {
        order: true,
      },
    })

    console.log('Primary session:', primarySession ? {
      id: primarySession.id,
      orderId: primarySession.orderId,
      orderStatus: primarySession.order.status
    } : 'NOT FOUND')

    if (!primarySession || primarySession.order.status !== 'awaiting_payment') {
      console.log('Primary session issue:', !primarySession ? 'not found' : `status is ${primarySession.order.status}`)
      return NextResponse.json(
        { error: 'Primary session not found or not ready for payment' },
        { status: 400 }
      )
    }

    // Perform the merge in a transaction
    console.log('Starting merge transaction...')
    await prisma.$transaction(async (tx) => {
      // Move all items from merged orders to the primary order
      for (const session of sessionsToMerge) {
        console.log(`Processing session ${session.id} with order ${session.orderId}`)
        // Copy all items to the primary order
        const itemsToMove = session.order.items.map(item => ({
          orderId: primarySession.orderId,
          kind: item.kind,
          name: item.name,
          qty: item.qty,
          unitPriceMinor: item.unitPriceMinor,
          taxMinor: item.taxMinor,
          totalMinor: item.totalMinor,
          meta: {
            ...((item.meta as any) || {}),
            mergedFromOrderId: session.orderId,
            mergedFromSeatId: session.seatId,
          },
        }))

        if (itemsToMove.length > 0) {
          await tx.orderItem.createMany({
            data: itemsToMove,
          })
        }

        // Delete items from the original order
        await tx.orderItem.deleteMany({
          where: { orderId: session.orderId },
        })

        // Get existing order meta and update it
        const existingOrder = await tx.order.findUnique({
          where: { id: session.orderId },
        })
        
        const orderMeta = (existingOrder?.meta as any) || {}
        
        // Mark the order as merged
        await tx.order.update({
          where: { id: session.orderId },
          data: {
            meta: {
              ...orderMeta,
              mergedToOrderId: primarySession.orderId,
              mergedAt: new Date().toISOString(),
            },
            notes: `Bill merged to Order ${primarySession.orderId}`,
          },
        })

        // Get existing session meta and update it
        const existingSession = await tx.seatSession.findUnique({
          where: { id: session.id },
        })
        
        const sessionMeta = (existingSession?.meta as any) || {}
        
        // Update the seat session to indicate it's been merged
        await tx.seatSession.update({
          where: { id: session.id },
          data: {
            meta: {
              ...sessionMeta,
              mergedToSessionId: primarySessionId,
              mergedAt: new Date().toISOString(),
            },
          },
        })
      }
    })

    console.log('Merge completed successfully!')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error merging bills - Full error:', error)
    console.error('Error type:', typeof error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Failed to merge bills' },
      { status: 500 }
    )
  }
}