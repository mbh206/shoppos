import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get all rentable games
    const games = await prisma.game.findMany({
      where: {
        isRentable: true
      },
      include: {
        rentals: {
          where: {
            status: 'out'
          },
          select: {
            id: true,
            expectedReturnDate: true,
            customer: {
              select: {
                displayName: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format response with rental status
    const gamesWithStatus = games.map(game => {
      const isCurrentlyRented = game.rentals.length > 0
      const currentRental = isCurrentlyRented ? game.rentals[0] : null
      
      return {
        id: game.id,
        name: game.name,
        nameJa: game.nameJa,
        description: game.description,
        descriptionJa: game.descriptionJa,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        duration: game.duration,
        complexity: game.complexity,
        imageUrl: game.imageUrl,
        thumbnailUrl: game.thumbnailUrl,
        retailPrice: game.retailPrice || 5000,
        isPremium: game.isPremium,
        maxRentalDays: game.maxRentalDays,
        available: game.available && !isCurrentlyRented,
        isCurrentlyRented,
        expectedReturn: currentRental?.expectedReturnDate,
        rentedTo: currentRental ? (
          currentRental.customer.displayName || 
          `${currentRental.customer.firstName || ''} ${currentRental.customer.lastName || ''}`.trim()
        ) : null,
        fees: {
          base: Math.floor((game.retailPrice || 5000) * 0.1),
          nightly: 100,
          premium: game.isPremium ? 1000 : 0,
          deposit: game.retailPrice || 5000
        }
      }
    })

    return NextResponse.json(gamesWithStatus)
  } catch (error) {
    console.error('Failed to fetch rentable games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rentable games' },
      { status: 500 }
    )
  }
}

// Update game rental settings
export async function PUT(request: NextRequest) {
  try {
    const {
      gameId,
      isRentable,
      retailPrice,
      isPremium,
      maxRentalDays
    } = await request.json()

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        isRentable: isRentable ?? undefined,
        retailPrice: retailPrice ?? undefined,
        isPremium: isPremium ?? undefined,
        maxRentalDays: maxRentalDays ?? undefined
      }
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Failed to update game rental settings:', error)
    return NextResponse.json(
      { error: 'Failed to update game rental settings' },
      { status: 500 }
    )
  }
}