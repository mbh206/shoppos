import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { timeEntryId, userId } = await request.json()
    
    if (!timeEntryId || !userId) {
      return NextResponse.json(
        { error: 'Time entry ID and user ID are required' },
        { status: 400 }
      )
    }
    
    // Get the time entry
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId }
    })
    
    if (!timeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      )
    }
    
    if (timeEntry.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    if (timeEntry.clockOut) {
      return NextResponse.json(
        { error: 'Already clocked out' },
        { status: 400 }
      )
    }
    
    // Calculate hours worked
    const clockIn = new Date(timeEntry.clockIn)
    const clockOut = new Date()
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
    
    // Calculate break time if any
    let breakHours = 0
    if (timeEntry.breakStart && timeEntry.breakEnd) {
      const breakStart = new Date(timeEntry.breakStart)
      const breakEnd = new Date(timeEntry.breakEnd)
      breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60)
    }
    
    const totalHours = hoursWorked - breakHours
    
    // Determine if overtime (>8 hours in Japan)
    const regularHours = Math.min(totalHours, 8)
    const overtimeHours = Math.max(0, totalHours - 8)
    
    // Update time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clockOut,
        totalHours,
        regularHours,
        overtimeHours,
        status: 'approved' // Auto-approve for now
      }
    })
    
    return NextResponse.json({
      totalHours: totalHours,
      regularHours: regularHours,
      overtimeHours: overtimeHours,
      clockOut: clockOut.toISOString()
    })
  } catch (error) {
    console.error('Clock out error:', error)
    return NextResponse.json(
      { error: 'Failed to clock out' },
      { status: 500 }
    )
  }
}