import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all rentals (both active and returned)
    const rentals = await prisma.gameRental.findMany({
      include: {
        game: {
          select: {
            name: true,
            nameJa: true
          }
        },
        customer: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        checkOutDate: 'desc'
      }
    })

    // Transform data for frontend
    const transformedRentals = rentals.map(rental => {
      const now = new Date()
      const expectedReturn = new Date(rental.expectedReturnDate)
      const checkOut = new Date(rental.checkOutDate)
      const actualReturn = rental.actualReturnDate ? new Date(rental.actualReturnDate) : null
      
      // Calculate days
      const daysOut = Math.max(1, Math.ceil((now.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24)))
      const daysUntilDue = Math.ceil((expectedReturn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine if overdue (only for active rentals)
      const isOverdue = rental.status === 'out' && now > expectedReturn

      return {
        id: rental.id,
        game: rental.game,
        customer: rental.customer,
        checkOutDate: rental.checkOutDate,
        expectedReturnDate: rental.expectedReturnDate,
        actualReturnDate: rental.actualReturnDate,
        depositAmount: rental.depositAmount,
        totalCharged: rental.totalCharged || (rental.baseFee + rental.nightlyFee + rental.premiumFee),
        status: rental.status,
        isOverdue,
        daysOut: rental.status === 'out' ? daysOut : null,
        daysUntilDue: rental.status === 'out' ? daysUntilDue : null
      }
    })

    return NextResponse.json(transformedRentals)
  } catch (error) {
    console.error('Failed to fetch rentals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rentals' },
      { status: 500 }
    )
  }
}