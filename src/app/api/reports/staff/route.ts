import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    // Parse dates
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Get time entries for the date range
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        clockIn: {
          gte: start,
          lte: end
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profile: {
              select: {
                payRate: true,
                hourlyRate: true,
                overtimeRate: true
              }
            }
          }
        }
      },
      orderBy: { clockIn: 'asc' }
    })

    // Calculate totals and format employee data
    let totalHours = 0
    let laborCost = 0
    const activeStaff = new Set<string>()
    
    const employees = timeEntries.map(entry => {
      activeStaff.add(entry.userId)
      
      // Calculate break time in minutes
      let breakMinutes = 0
      if (entry.breakStart && entry.breakEnd) {
        breakMinutes = Math.round((entry.breakEnd.getTime() - entry.breakStart.getTime()) / 60000)
      }

      // Add to totals
      totalHours += entry.totalHours
      
      // Calculate labor cost for this entry
      if (entry.user.profile) {
        const regularCost = entry.regularHours * (entry.user.profile.hourlyRate || 0) * 100 // Convert to minor units
        const overtimeCost = entry.overtimeHours * (entry.user.profile.overtimeRate || entry.user.profile.hourlyRate || 0) * 100
        laborCost += regularCost + overtimeCost
      }

      return {
        name: entry.user.name || entry.user.email,
        clockIn: entry.clockIn.toISOString(),
        clockOut: entry.clockOut?.toISOString() || null,
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        breaks: breakMinutes
      }
    })

    // Get currently active staff (clocked in but not out)
    const currentlyActive = await prisma.timeEntry.count({
      where: {
        clockOut: null,
        clockIn: { lte: end }
      }
    })

    return NextResponse.json({
      activeToday: activeStaff.size,
      currentlyActive,
      totalHours,
      laborCost: Math.round(laborCost),
      employees
    })
  } catch (error) {
    console.error('Error generating staff report:', error)
    return NextResponse.json(
      { error: 'Failed to generate staff report' },
      { status: 500 }
    )
  }
}