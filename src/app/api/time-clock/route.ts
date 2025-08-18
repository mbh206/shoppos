import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get current active time entry for the user
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        clockOut: null
      },
      orderBy: {
        clockIn: 'desc'
      }
    })

    // Get today's time entries
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        clockIn: {
          gte: today
        }
      },
      orderBy: {
        clockIn: 'desc'
      }
    })

    // Calculate today's total hours
    const todayHours = todayEntries.reduce((total, entry) => {
      return total + (entry.totalHours || 0)
    }, 0)

    return NextResponse.json({
      activeEntry,
      todayEntries,
      todayHours
    })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
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
    const body = await request.json()
    const { action } = body // 'clock-in', 'clock-out', 'start-break', 'end-break'

    // Check for existing active entry
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        clockOut: null
      },
      orderBy: {
        clockIn: 'desc'
      }
    })

    if (action === 'clock-in') {
      if (activeEntry) {
        return NextResponse.json(
          { error: 'Already clocked in' },
          { status: 400 }
        )
      }

      const entry = await prisma.timeEntry.create({
        data: {
          userId: session.user.id,
          clockIn: new Date()
        }
      })

      return NextResponse.json(entry)
    }

    if (!activeEntry) {
      return NextResponse.json(
        { error: 'Not clocked in' },
        { status: 400 }
      )
    }

    if (action === 'clock-out') {
      const clockOut = new Date()
      const clockIn = new Date(activeEntry.clockIn)
      
      // Calculate hours worked
      let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60)
      
      // Subtract break time if any
      if (activeEntry.breakStart && activeEntry.breakEnd) {
        const breakMinutes = (new Date(activeEntry.breakEnd).getTime() - 
                            new Date(activeEntry.breakStart).getTime()) / (1000 * 60)
        totalMinutes -= breakMinutes
      }
      
      const totalHours = totalMinutes / 60
      
      // Calculate regular vs overtime (over 8 hours)
      const regularHours = Math.min(totalHours, 8)
      const overtimeHours = Math.max(0, totalHours - 8)
      
      // Calculate night hours (22:00-05:00)
      const nightHours = calculateNightHours(clockIn, clockOut)
      
      const entry = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          clockOut,
          totalHours,
          regularHours,
          overtimeHours,
          nightHours
        }
      })

      return NextResponse.json(entry)
    }

    if (action === 'start-break') {
      if (activeEntry.breakStart && !activeEntry.breakEnd) {
        return NextResponse.json(
          { error: 'Already on break' },
          { status: 400 }
        )
      }

      const entry = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          breakStart: new Date()
        }
      })

      return NextResponse.json(entry)
    }

    if (action === 'end-break') {
      if (!activeEntry.breakStart || activeEntry.breakEnd) {
        return NextResponse.json(
          { error: 'Not on break' },
          { status: 400 }
        )
      }

      const entry = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          breakEnd: new Date()
        }
      })

      return NextResponse.json(entry)
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error handling time clock:', error)
    return NextResponse.json(
      { error: 'Failed to process time clock action' },
      { status: 500 }
    )
  }
}

// Helper function to calculate night hours (22:00-05:00)
function calculateNightHours(start: Date, end: Date): number {
  let nightMinutes = 0
  const current = new Date(start)
  
  while (current < end) {
    const hour = current.getHours()
    if (hour >= 22 || hour < 5) {
      nightMinutes++
    }
    current.setMinutes(current.getMinutes() + 1)
  }
  
  return nightMinutes / 60
}