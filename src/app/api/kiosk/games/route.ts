import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint - no authentication required for kiosk
export async function GET(request: NextRequest) {
  try {
    // Fetch all games with their current availability
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' },
    })
    
    // Get currently playing games (tables with active game sessions)
    const activeSessions = await prisma.tableGameSession.findMany({
      where: {
        endedAt: null
      },
      select: {
        gameId: true
      }
    })
    
    // Get currently rented out games
    const activeRentals = await prisma.gameRental.findMany({
      where: {
        status: 'out'
      },
      select: {
        gameId: true
      }
    })
    
    const activeGameIds = new Set(activeSessions.map(s => s.gameId))
    const rentedGameIds = new Set(activeRentals.map(r => r.gameId))
    
    // Update availability based on active sessions AND rentals
    const gamesWithAvailability = games.map(game => ({
      ...game,
      available: !activeGameIds.has(game.id) && !rentedGameIds.has(game.id)
    }))
    
    return NextResponse.json(gamesWithAvailability)
  } catch (error) {
    console.error('Failed to fetch games for kiosk:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}