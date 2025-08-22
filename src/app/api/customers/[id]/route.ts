import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MembershipService } from '@/lib/membership-service'

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
        pointsTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        memberships: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            plan: true,
            usage: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 10,
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
    
    // Get active membership if any
    const activeMembership = customer.memberships.find(m => m.status === 'ACTIVE')

    return NextResponse.json({
      ...customer,
      stats: {
        totalSpent,
        gamesPlayed: Array.from(gamesPlayed),
      },
      loyalty: {
        pointsBalance: customer.pointsBalance,
        activeMembership: activeMembership ? {
          planName: activeMembership.plan.name,
          planNameJa: activeMembership.plan.nameJa,
          hoursRemaining: Math.max(0, activeMembership.plan.hoursIncluded - activeMembership.hoursUsed),
          hoursUsed: activeMembership.hoursUsed,
          hoursIncluded: activeMembership.plan.hoursIncluded,
          endDate: activeMembership.endDate,
          autoRenew: activeMembership.autoRenew,
        } : null,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { displayName, firstName, lastName, firstNameJa, lastNameJa, email, phone } = body

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        displayName: displayName || null,
        firstName: firstName || null,
        lastName: lastName || null,
        firstNameJa: firstNameJa || null,
        lastNameJa: lastNameJa || null,
        email,
        phone: phone || null,
      },
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

    // Calculate total spent
    const totalSpent = updatedCustomer.orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.totalMinor, 0)
    }, 0)

    // Get games played
    const gamesPlayed = new Set()
    updatedCustomer.orders.forEach(order => {
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
      ...updatedCustomer,
      stats: {
        totalSpent,
        gamesPlayed: Array.from(gamesPlayed),
      },
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}