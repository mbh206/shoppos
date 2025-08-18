import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch only seat sessions that are awaiting payment (stopped timers ready to checkout)
    const unpaidSessions = await prisma.seatSession.findMany({
      where: {
        order: {
          status: 'awaiting_payment', // Only stopped timers ready for payment
        },
      },
      include: {
        seat: {
          include: {
            table: true,
          },
        },
        customer: true,
        order: {
          include: {
            items: true,
          },
        },
      },
      orderBy: [
        {
          seat: {
            table: {
              name: 'asc',
            },
          },
        },
        {
          seat: {
            number: 'asc',
          },
        },
      ],
    })

    // Add merge status to sessions
    const sessionsWithMergeStatus = unpaidSessions.map(session => ({
      ...session,
      mergedToSessionId: session.order.meta?.mergedToOrderId 
        ? unpaidSessions.find(s => s.orderId === session.order.meta?.mergedToOrderId)?.id || null
        : null,
    }))

    return NextResponse.json(sessionsWithMergeStatus)
  } catch (error) {
    console.error('Error fetching active sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active sessions' },
      { status: 500 }
    )
  }
}