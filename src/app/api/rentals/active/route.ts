import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all active rentals
    const activeRentals = await prisma.gameRental.findMany({
      where: {
        status: 'out'
      },
      include: {
        game: true,
        customer: true,
        checkOutStaff: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        expectedReturnDate: 'asc'
      }
    })

    // Calculate overdue status
    const now = new Date()
    const rentalsWithStatus = activeRentals.map(rental => {
      const isOverdue = new Date(rental.expectedReturnDate) < now
      const daysOut = Math.ceil((now.getTime() - new Date(rental.checkOutDate).getTime()) / (1000 * 60 * 60 * 24))
      const daysUntilDue = Math.ceil((new Date(rental.expectedReturnDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...rental,
        isOverdue,
        daysOut,
        daysUntilDue: isOverdue ? 0 : daysUntilDue
      }
    })

    return NextResponse.json(rentalsWithStatus)
  } catch (error) {
    console.error('Failed to fetch active rentals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active rentals' },
      { status: 500 }
    )
  }
}