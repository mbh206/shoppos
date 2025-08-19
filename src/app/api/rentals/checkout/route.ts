import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      customerId,
      gameId,
      expectedReturnDate,
      checkOutPhotoUrl,
      paymentMethodId
    } = await request.json()

    // Validate required fields
    if (!customerId || !gameId || !expectedReturnDate || !checkOutPhotoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get game details
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    if (!game.isRentable) {
      return NextResponse.json(
        { error: 'Game is not available for rental' },
        { status: 400 }
      )
    }

    if (!game.available) {
      return NextResponse.json(
        { error: 'Game is currently not available' },
        { status: 400 }
      )
    }

    // Check if game is already rented
    const existingRental = await prisma.gameRental.findFirst({
      where: {
        gameId,
        status: 'out'
      }
    })

    if (existingRental) {
      return NextResponse.json(
        { error: 'Game is already rented out' },
        { status: 400 }
      )
    }

    // Calculate fees
    const retailPrice = game.retailPrice || 5000 // Default ¥5000 if not set
    const depositAmount = retailPrice
    const baseFee = Math.floor(retailPrice * 0.1) // 10% of retail
    const premiumFee = game.isPremium ? 1000 : 0
    
    // Calculate expected nights (minimum 1)
    const checkOutDate = new Date()
    const returnDate = new Date(expectedReturnDate)
    const nights = Math.max(1, Math.ceil((returnDate.getTime() - checkOutDate.getTime()) / (1000 * 60 * 60 * 24)))
    const nightlyFee = 100 * nights

    // Create an order for the rental checkout (deposit hold)
    const order = await prisma.order.create({
      data: {
        channel: 'in_store',
        status: 'paid',
        customerId,
        openedByUserId: session.user.id,
        closedByUserId: session.user.id,
        openedAt: checkOutDate,
        closedAt: checkOutDate,
        notes: `Game rental checkout: ${game.name}`,
        meta: { 
          type: 'rental_checkout',
          gameId,
          gameName: game.name
        }
      }
    })

    // Add order item for the rental deposit (this is just a hold, not a charge)
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        kind: 'rental_deposit',
        name: `Rental Deposit: ${game.name}`,
        qty: 1,
        unitPriceMinor: depositAmount,
        taxMinor: 0,
        totalMinor: depositAmount,
        meta: { 
          isDeposit: true,
          gameId,
          expectedReturnDate: returnDate.toISOString()
        }
      }
    })

    // Create rental record
    const rental = await prisma.gameRental.create({
      data: {
        customerId,
        gameId,
        checkOutDate,
        expectedReturnDate: returnDate,
        checkOutPhotoUrl,
        depositAmount,
        baseFee,
        nightlyFee,
        premiumFee,
        paymentMethodId,
        checkOutStaffId: session.user.id,
        checkoutOrderId: order.id,
        status: 'out'
      },
      include: {
        game: true,
        customer: true
      }
    })

    // Update game availability
    await prisma.game.update({
      where: { id: gameId },
      data: { available: false }
    })

    // TODO: Process credit card hold for deposit amount
    // This would integrate with your payment processor (Square, Stripe, etc.)

    return NextResponse.json({
      rental,
      fees: {
        deposit: depositAmount,
        base: baseFee,
        nightly: nightlyFee,
        premium: premiumFee,
        estimatedTotal: baseFee + nightlyFee + premiumFee
      }
    })
  } catch (error) {
    console.error('Rental checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to process rental checkout' },
      { status: 500 }
    )
  }
}