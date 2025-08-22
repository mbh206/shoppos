import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customerId')
  const orderId = searchParams.get('orderId')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const where: any = {}
    
    if (customerId) {
      where.customerId = customerId
    }
    
    if (orderId) {
      where.orderId = orderId
    }

    const transactions = await prisma.pointsTransaction.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        },
        order: {
          select: {
            id: true,
            openedAt: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching points transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch points transactions' },
      { status: 500 }
    )
  }
}