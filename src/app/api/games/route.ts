import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const availableOnly = searchParams.get('available') === 'true'

  try {
    const games = await prisma.game.findMany({
      where: availableOnly ? { available: true } : undefined,
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    const game = await prisma.game.create({
      data: {
        name: data.name,
        nameJa: data.nameJa || null,
        location: data.location,
        type: data.type,
        minPlayers: data.minPlayers,
        maxPlayers: data.maxPlayers,
        duration: data.duration,
        complexity: data.complexity,
        setupTime: data.setupTime,
        description: data.description || null,
      },
    })
    
    return NextResponse.json(game)
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
}