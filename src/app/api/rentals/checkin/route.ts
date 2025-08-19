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
      rentalId,
      checkInPhotoUrl,
      damageFee,
      notes
    } = await request.json()

    if (!rentalId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get rental details
    const rental = await prisma.gameRental.findUnique({
      where: { id: rentalId },
      include: {
        game: true,
        customer: true
      }
    })

    if (!rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    if (rental.status !== 'out') {
      return NextResponse.json(
        { error: 'Rental is not currently active' },
        { status: 400 }
      )
    }

    // Calculate actual nights rented
    const returnDate = new Date()
    const checkOutDate = new Date(rental.checkOutDate)
    const actualNights = Math.max(1, Math.ceil((returnDate.getTime() - checkOutDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Recalculate nightly fee based on actual return
    const actualNightlyFee = 100 * actualNights
    
    // Calculate total charge
    const totalCharged = rental.baseFee + actualNightlyFee + rental.premiumFee + (damageFee || 0)

    // Create an order for the rental return charges
    const order = await prisma.order.create({
      data: {
        channel: 'in_store',
        status: 'paid',
        customerId: rental.customerId,
        openedByUserId: session.user.id,
        closedByUserId: session.user.id,
        openedAt: returnDate,
        closedAt: returnDate,
        notes: `Game rental return: ${rental.game.name}`,
        meta: { 
          type: 'rental_return',
          gameId: rental.gameId,
          gameName: rental.game.name,
          rentalId: rental.id
        }
      }
    })

    // Add order items for the rental charges
    const orderItems = []
    
    // Base fee
    if (rental.baseFee > 0) {
      orderItems.push({
        orderId: order.id,
        kind: 'rental_fee',
        name: `Rental Base Fee (10%): ${rental.game.name}`,
        qty: 1,
        unitPriceMinor: rental.baseFee,
        taxMinor: 0,
        totalMinor: rental.baseFee,
        meta: { type: 'base_fee' }
      })
    }

    // Nightly fee
    if (actualNightlyFee > 0) {
      orderItems.push({
        orderId: order.id,
        kind: 'rental_fee',
        name: `Rental Daily Fee (${actualNights} days): ${rental.game.name}`,
        qty: actualNights,
        unitPriceMinor: 100,
        taxMinor: 0,
        totalMinor: actualNightlyFee,
        meta: { type: 'nightly_fee' }
      })
    }

    // Premium fee
    if (rental.premiumFee > 0) {
      orderItems.push({
        orderId: order.id,
        kind: 'rental_fee',
        name: `Premium Game Fee: ${rental.game.name}`,
        qty: 1,
        unitPriceMinor: rental.premiumFee,
        taxMinor: 0,
        totalMinor: rental.premiumFee,
        meta: { type: 'premium_fee' }
      })
    }

    // Damage fee
    if (damageFee > 0) {
      orderItems.push({
        orderId: order.id,
        kind: 'rental_fee',
        name: `Damage Fee: ${rental.game.name}`,
        qty: 1,
        unitPriceMinor: damageFee,
        taxMinor: 0,
        totalMinor: damageFee,
        meta: { type: 'damage_fee' }
      })
    }

    // Create all order items
    if (orderItems.length > 0) {
      await prisma.orderItem.createMany({
        data: orderItems
      })
    }

    // Update rental record
    const updatedRental = await prisma.gameRental.update({
      where: { id: rentalId },
      data: {
        actualReturnDate: returnDate,
        checkInPhotoUrl,
        checkInStaffId: session.user.id,
        nightlyFee: actualNightlyFee,
        damageFee: damageFee || 0,
        totalCharged,
        status: 'returned',
        notes: notes || rental.notes,
        returnOrderId: order.id
      },
      include: {
        game: true,
        customer: true
      }
    })

    // Update game availability
    await prisma.game.update({
      where: { id: rental.gameId },
      data: { available: true }
    })

    // TODO: Process actual charge and release deposit hold
    // This would integrate with your payment processor

    return NextResponse.json({
      rental: updatedRental,
      charges: {
        base: rental.baseFee,
        nightly: actualNightlyFee,
        premium: rental.premiumFee,
        damage: damageFee || 0,
        total: totalCharged,
        nights: actualNights
      }
    })
  } catch (error) {
    console.error('Rental checkin error:', error)
    return NextResponse.json(
      { error: 'Failed to process rental checkin' },
      { status: 500 }
    )
  }
}