import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { timeEntryId, action, userId } = await request.json()
    
    if (!timeEntryId || !action || !userId) {
      return NextResponse.json(
        { error: 'Time entry ID, action, and user ID are required' },
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
        { error: 'Cannot modify break for completed shift' },
        { status: 400 }
      )
    }
    
    let updateData: any = {}
    
    if (action === 'start') {
      if (timeEntry.breakStart && !timeEntry.breakEnd) {
        return NextResponse.json(
          { error: 'Already on break' },
          { status: 400 }
        )
      }
      updateData.breakStart = new Date()
      updateData.breakEnd = null
    } else if (action === 'end') {
      if (!timeEntry.breakStart) {
        return NextResponse.json(
          { error: 'Not on break' },
          { status: 400 }
        )
      }
      if (timeEntry.breakEnd) {
        return NextResponse.json(
          { error: 'Break already ended' },
          { status: 400 }
        )
      }
      updateData.breakEnd = new Date()
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "end"' },
        { status: 400 }
      )
    }
    
    // Update time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: updateData
    })
    
    return NextResponse.json({
      timeEntry: {
        id: updatedEntry.id,
        userId: updatedEntry.userId,
        clockIn: updatedEntry.clockIn.toISOString(),
        clockOut: updatedEntry.clockOut?.toISOString() || null,
        breakStart: updatedEntry.breakStart?.toISOString() || null,
        breakEnd: updatedEntry.breakEnd?.toISOString() || null,
        totalHours: updatedEntry.totalHours
      }
    })
  } catch (error) {
    console.error('Break management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage break' },
      { status: 500 }
    )
  }
}