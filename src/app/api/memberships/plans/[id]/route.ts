import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    
    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: {
        name: body.name,
        nameJa: body.nameJa || null,
        description: body.description || null,
        price: body.price,
        hoursIncluded: body.hoursIncluded,
        overageRate: body.overageRate,
        pointsOnPurchase: body.pointsOnPurchase,
        earnRateDenominator: body.earnRateDenominator
      }
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error updating membership plan:', error)
    return NextResponse.json(
      { error: 'Failed to update membership plan' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Check if plan has active memberships
    const activeMemberships = await prisma.customerMembership.count({
      where: {
        planId: id,
        status: 'ACTIVE'
      }
    })

    if (activeMemberships > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active memberships' },
        { status: 400 }
      )
    }

    // Soft delete by marking as inactive
    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Error deleting membership plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete membership plan' },
      { status: 500 }
    )
  }
}