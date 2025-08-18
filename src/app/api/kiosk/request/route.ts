import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { gameId, tableName, customerName } = await request.json()
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }
    
    // Get the game details
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    // Create a notification/request (for now, we'll log it)
    // In a real implementation, this could:
    // - Create a notification in the database
    // - Send a real-time notification to staff
    // - Add to a queue displayed on the admin dashboard
    
    console.log('Game Request:', {
      game: game.name,
      gameId,
      tableName,
      customerName,
      requestedAt: new Date().toISOString()
    })
    
    // You could also create an order event or notification here
    // For example:
    /*
    await prisma.orderEvent.create({
      data: {
        orderId: 'system', // or create a special order for requests
        kind: 'game_request',
        payload: {
          gameId,
          gameName: game.name,
          tableName,
          customerName,
          location: game.location
        }
      }
    })
    */
    
    return NextResponse.json({ 
      success: true,
      message: 'Game request received',
      game: {
        name: game.name,
        location: game.location
      }
    })
  } catch (error) {
    console.error('Failed to process game request:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}