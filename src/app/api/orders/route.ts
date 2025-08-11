import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const channel = searchParams.get('channel')

  try {
    const orders = await prisma.order.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(channel && { channel: channel as any }),
      },
      include: {
        customer: true,
        payer: true,
        items: true,
        seatSessions: {
          include: {
            seat: {
              include: {
                table: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        openedAt: 'desc',
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { channel = 'in_store', customerId, tableId } = body

  try {
    const order = await prisma.order.create({
      data: {
        channel,
        status: 'open',
        customerId,
        openedByUserId: session.user.id,
      },
      include: {
        customer: true,
        items: true,
      },
    })

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        kind: 'order.created',
        payload: {
          channel,
          customerId,
          tableId,
          openedBy: session.user.id,
        },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}