import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    
    const activeGameIds = new Set(activeSessions.map(s => s.gameId))
    
    // Update availability based on active sessions
    const gamesWithAvailability = games.map(game => ({
      ...game,
      available: !activeGameIds.has(game.id)
    }))
    
    return NextResponse.json(gamesWithAvailability)
  } catch (error) {
    console.error('Failed to fetch games for kiosk:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}