import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tables = await prisma.table.findMany({
      include: {
        seats: {
          include: {
            seatSessions: {
              where: {
                endedAt: null,
              },
              include: {
                customer: true,
                order: {
                  include: {
                    customer: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(tables)
  } catch (error) {
    console.error('Error fetching floor data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch floor data' },
      { status: 500 }
    )
  }
}