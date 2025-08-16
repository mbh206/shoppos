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
      orderBy: [
        { floor: 'asc' },
        { zone: 'asc' },
        { name: 'asc' },
      ],
    })

    // Ensure we return an array even if empty
    return NextResponse.json(tables || [])
  } catch (error) {
    console.error('Error fetching floor data - Full error:', error)
    // Return empty array on error so UI can handle gracefully
    return NextResponse.json([])
  }
}