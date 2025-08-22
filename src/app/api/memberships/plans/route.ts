import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MembershipService } from '@/lib/membership-service'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plans = await MembershipService.getPlans()
    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching membership plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch membership plans' },
      { status: 500 }
    )
  }
}