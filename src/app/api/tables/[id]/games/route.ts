import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tableId } = await params
  const { gameId } = await request.json()

  try {
    // Check if game is available
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        tableSessions: {
          where: { endedAt: null },
        },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.tableSessions.length > 0) {
      return NextResponse.json(
        { error: 'Game is already in use at another table' },
        { status: 400 }
      )
    }

    // Create game session and update game availability
    const [gameSession, updatedGame] = await prisma.$transaction([
      prisma.tableGameSession.create({
        data: {
          tableId,
          gameId,
        },
        include: {
          game: true,
        },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { available: false },
      }),
    ])

    return NextResponse.json(gameSession)
  } catch (error) {
    console.error('Error assigning game to table:', error)
    return NextResponse.json(
      { error: 'Failed to assign game' },
      { status: 500 }
    )
  }
}