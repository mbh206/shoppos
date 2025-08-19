import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params

    // Get customer's rental history
    const rentals = await prisma.gameRental.findMany({
      where: {
        customerId
      },
      include: {
        game: true,
        checkOutStaff: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        checkInStaff: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        checkOutDate: 'desc'
      }
    })

    // Calculate statistics
    const stats = {
      totalRentals: rentals.length,
      activeRentals: rentals.filter(r => r.status === 'out').length,
      totalSpent: rentals
        .filter(r => r.totalCharged)
        .reduce((sum, r) => sum + (r.totalCharged || 0), 0),
      totalDamages: rentals.reduce((sum, r) => sum + r.damageFee, 0),
      favoriteGames: Object.entries(
        rentals.reduce((acc, r) => {
          acc[r.game.name] = (acc[r.game.name] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    }

    return NextResponse.json({
      rentals,
      stats
    })
  } catch (error) {
    console.error('Failed to fetch customer rentals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer rentals' },
      { status: 500 }
    )
  }
}