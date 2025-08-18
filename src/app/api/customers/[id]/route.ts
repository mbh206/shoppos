import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        seatSessions: {
          include: {
            seat: {
              include: {
                table: true,
              },
            },
            order: {
              include: {
                items: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 50,
        },
        orders: {
          include: {
            items: true,
          },
          orderBy: {
            openedAt: 'desc',
          },
          take: 20,
        },
        eventTickets: {
          include: {
            event: true,
          },
          orderBy: {
            event: {
              startAt: 'desc',
            },
          },
        },
        _count: {
          select: {
            seatSessions: true,
            orders: true,
            eventTickets: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate total spent
    const totalSpent = customer.orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.totalMinor, 0)
    }, 0)

    // Get games played
    const gamesPlayed = new Set()
    customer.orders.forEach(order => {
      order.items.forEach(item => {
        if (item.meta && typeof item.meta === 'object' && 'isGame' in item.meta) {
          const meta = item.meta as any
          if (meta.isGame) {
            gamesPlayed.add(item.name.replace('Game: ', ''))
          }
        }
      })
    })

    return NextResponse.json({
      ...customer,
      stats: {
        totalSpent,
        gamesPlayed: Array.from(gamesPlayed),
      },
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}