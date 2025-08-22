import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TableStatus } from '@prisma/client'

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
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        seats: {
          include: {
            seatSessions: {
              where: {
                OR: [
                  { endedAt: null }, // Active sessions
                  { 
                    AND: [
                      { endedAt: { not: null } }, // Timer stopped
                      { order: { status: 'awaiting_payment' } } // But not paid yet
                    ]
                  }
                ]
              },
              include: {
                customer: true,
                order: {
                  include: {
                    customer: true,
                    items: true,
                  },
                },
              },
            },
          },
        },
        gameSessions: {
          where: {
            endedAt: null,
          },
          include: {
            game: true,
          },
        },
      },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error fetching table:', error)
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !['admin', 'host'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status } = body as { status: TableStatus }

  try {
    const table = await prisma.table.update({
      where: { id },
      data: { status },
      include: {
        seats: true,
      },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    )
  }
}