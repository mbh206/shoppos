import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get all active time entries (not clocked out)
    const activeEntries = await prisma.timeEntry.findMany({
      where: {
        clockOut: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true
          }
        }
      },
      orderBy: {
        clockIn: 'asc'
      }
    })
    
    // Format the response
    const formattedEntries = activeEntries.map(entry => ({
      id: entry.id,
      userId: entry.userId,
      clockIn: entry.clockIn.toISOString(),
      breakStart: entry.breakStart?.toISOString() || null,
      breakEnd: entry.breakEnd?.toISOString() || null,
      user: {
        name: entry.user.name || 'Unknown',
        employeeId: entry.user.employeeId || 'N/A'
      }
    }))
    
    return NextResponse.json(formattedEntries)
  } catch (error) {
    console.error('Failed to fetch active employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active employees' },
      { status: 500 }
    )
  }
}