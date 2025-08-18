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

    // Create game session, update game availability, and add to all active orders
    const result = await prisma.$transaction(async (tx) => {
      // Create the game session
      const gameSession = await tx.tableGameSession.create({
        data: {
          tableId,
          gameId,
        },
        include: {
          game: true,
        },
      })

      // Update game availability
      await tx.game.update({
        where: { id: gameId },
        data: { available: false },
      })

      // Find all active seat sessions at this table
      const activeSeatSessions = await tx.seatSession.findMany({
        where: {
          seat: {
            tableId,
          },
          endedAt: null,
        },
      })

      // Add the game to all active orders at this table
      for (const seatSession of activeSeatSessions) {
        await tx.orderItem.create({
          data: {
            orderId: seatSession.orderId,
            kind: 'retail',
            name: `Game: ${game.name}`,
            qty: 1,
            unitPriceMinor: 0,
            taxMinor: 0,
            totalMinor: 0,
            meta: {
              isGame: true,
              gameId: game.id,
              sessionId: gameSession.id,
              startedAt: gameSession.startedAt.toISOString(),
            },
          },
        })
      }

      return gameSession
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error assigning game to table:', error)
    return NextResponse.json(
      { error: 'Failed to assign game' },
      { status: 500 }
    )
  }
}