import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const gameHistory = await prisma.customerGameHistory.findMany({
      where: { customerId: id },
      include: {
        game: true,
        table: true,
      },
      orderBy: { playedAt: 'desc' },
    })

    // Format the response with additional statistics
    const formattedHistory = gameHistory.map(entry => ({
      id: entry.id,
      game: {
        id: entry.game.id,
        name: entry.game.name,
        nameJa: entry.game.nameJa,
        complexity: entry.game.complexity,
      },
      table: entry.table.name,
      playedAt: entry.playedAt,
      durationMinutes: entry.durationMinutes,
      durationFormatted: entry.durationMinutes 
        ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
        : 'Unknown',
      coPlayerNames: entry.coPlayerNames,
      playerCount: entry.coPlayerNames.length + 1, // Include the customer themselves
    }))

    // Calculate statistics
    const stats = {
      totalGamesPlayed: gameHistory.length,
      uniqueGamesPlayed: new Set(gameHistory.map(h => h.gameId)).size,
      totalPlayTime: gameHistory.reduce((sum, h) => sum + (h.durationMinutes || 0), 0),
      favoriteGame: gameHistory.length > 0 
        ? getMostPlayedGame(gameHistory)
        : null,
      frequentPlayers: getFrequentPlayers(gameHistory),
    }

    return NextResponse.json({
      history: formattedHistory,
      stats,
    })
  } catch (error) {
    console.error('Error fetching customer game history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game history' },
      { status: 500 }
    )
  }
}

function getMostPlayedGame(history: any[]) {
  const gameCounts = history.reduce((acc, h) => {
    acc[h.gameId] = (acc[h.gameId] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostPlayedId = Object.entries(gameCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0]
  
  if (!mostPlayedId) return null
  
  const game = history.find(h => h.gameId === mostPlayedId)?.game
  return {
    ...game,
    timesPlayed: gameCounts[mostPlayedId],
  }
}

function getFrequentPlayers(history: any[]) {
  const playerCounts: Record<string, number> = {}
  
  history.forEach(h => {
    h.coPlayerNames.forEach((name: string) => {
      playerCounts[name] = (playerCounts[name] || 0) + 1
    })
  })
  
  return Object.entries(playerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, gamesPlayedTogether: count }))
}