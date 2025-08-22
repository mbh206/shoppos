import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get settings from PointsSettings table or return defaults
    const settings = await prisma.pointsSettings.findFirst()
    
    if (!settings) {
      // Return default settings
      return NextResponse.json({
        regularEarnRate: 50,
        memberEarnRate: 40,
        redemptionRate: 1
      })
    }

    return NextResponse.json({
      regularEarnRate: settings.regularEarnRate,
      memberEarnRate: settings.memberEarnRate,
      redemptionRate: settings.redemptionRate
    })
  } catch (error) {
    console.error('Error fetching points settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch points settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { regularEarnRate, memberEarnRate, redemptionRate } = body

    // Upsert settings (create if doesn't exist, update if does)
    const settings = await prisma.pointsSettings.upsert({
      where: { id: 'default' },
      update: {
        regularEarnRate,
        memberEarnRate,
        redemptionRate
      },
      create: {
        id: 'default',
        regularEarnRate,
        memberEarnRate,
        redemptionRate
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating points settings:', error)
    return NextResponse.json(
      { error: 'Failed to update points settings' },
      { status: 500 }
    )
  }
}