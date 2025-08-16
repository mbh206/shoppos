import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tableId, sessionId } = await params

  try {
    // Get the game session to find the game ID
    const gameSession = await prisma.tableGameSession.findUnique({
      where: { id: sessionId },
    })

    if (!gameSession) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      )
    }

    if (gameSession.tableId !== tableId) {
      return NextResponse.json(
        { error: 'Game session does not belong to this table' },
        { status: 400 }
      )
    }

    // End the game session and update game availability
    await prisma.$transaction([
      prisma.tableGameSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      }),
      prisma.game.update({
        where: { id: gameSession.gameId },
        data: { available: true },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing game from table:', error)
    return NextResponse.json(
      { error: 'Failed to remove game' },
      { status: 500 }
    )
  }
}