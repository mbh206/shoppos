import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MembershipService } from '@/lib/membership-service'
import { PointsService } from '@/lib/points-service'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { customerId, planId, autoRenew = false, orderId } = body

    // Validate customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, displayName: true, email: true }
    })
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Purchase membership
    const membership = await MembershipService.purchaseMembership(
      customerId,
      planId,
      autoRenew
    )

    // If part of an order, add the membership item to the order
    if (orderId) {
      await prisma.orderItem.create({
        data: {
          orderId,
          kind: 'membership',
          name: membership.plan.name,
          qty: 1,
          unitPriceMinor: membership.plan.price,
          totalMinor: membership.plan.price,
          taxMinor: 0,
          meta: {
            membershipId: membership.id,
            planId: membership.planId,
          }
        }
      })
    }

    return NextResponse.json({
      membership,
      message: `Monthly Pass purchased successfully! ${membership.plan.pointsOnPurchase} bonus points awarded.`
    })
  } catch (error: any) {
    console.error('Error purchasing membership:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to purchase membership' },
      { status: 500 }
    )
  }
}