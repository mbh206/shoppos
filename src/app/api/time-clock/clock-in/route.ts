import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { employeeId, userId } = await request.json()
    
    if (!employeeId || !userId) {
      return NextResponse.json(
        { error: 'Employee ID and user ID are required' },
        { status: 400 }
      )
    }
    
    // Check if already clocked in
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        clockOut: null
      }
    })
    
    if (existingEntry) {
      return NextResponse.json(
        { error: 'Already clocked in' },
        { status: 400 }
      )
    }
    
    // Create new time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId,
        clockIn: new Date(),
        status: 'active'
      }
    })
    
    return NextResponse.json({
      timeEntry: {
        id: timeEntry.id,
        userId: timeEntry.userId,
        clockIn: timeEntry.clockIn.toISOString(),
        clockOut: null,
        breakStart: null,
        breakEnd: null,
        totalHours: 0
      }
    })
  } catch (error) {
    console.error('Clock in error:', error)
    return NextResponse.json(
      { error: 'Failed to clock in' },
      { status: 500 }
    )
  }
}