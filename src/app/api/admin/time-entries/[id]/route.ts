import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { differenceInHours } from 'date-fns'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clockIn, clockOut, breakStart, breakEnd } = await request.json()
    
    if (!clockIn) {
      return NextResponse.json(
        { error: 'Clock in time is required' },
        { status: 400 }
      )
    }
    
    // Validate time logic
    const clockInDate = new Date(clockIn)
    const clockOutDate = clockOut ? new Date(clockOut) : null
    const breakStartDate = breakStart ? new Date(breakStart) : null
    const breakEndDate = breakEnd ? new Date(breakEnd) : null
    
    // Validate chronological order
    if (clockOutDate && clockOutDate <= clockInDate) {
      return NextResponse.json(
        { error: 'Clock out time must be after clock in time' },
        { status: 400 }
      )
    }
    
    if (breakStartDate && breakEndDate && breakEndDate <= breakStartDate) {
      return NextResponse.json(
        { error: 'Break end time must be after break start time' },
        { status: 400 }
      )
    }
    
    if (breakStartDate && clockInDate && breakStartDate < clockInDate) {
      return NextResponse.json(
        { error: 'Break cannot start before clock in' },
        { status: 400 }
      )
    }
    
    if (breakEndDate && clockOutDate && breakEndDate > clockOutDate) {
      return NextResponse.json(
        { error: 'Break cannot end after clock out' },
        { status: 400 }
      )
    }
    
    // Calculate hours
    let totalHours = 0
    let regularHours = 0
    let overtimeHours = 0
    
    if (clockOutDate) {
      // Calculate total hours worked
      const totalMinutes = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60)
      
      // Subtract break time if applicable
      let breakMinutes = 0
      if (breakStartDate && breakEndDate) {
        breakMinutes = (breakEndDate.getTime() - breakStartDate.getTime()) / (1000 * 60)
      }
      
      const workedMinutes = totalMinutes - breakMinutes
      totalHours = workedMinutes / 60
      
      // Calculate regular and overtime (8 hours regular, rest is overtime)
      regularHours = Math.min(totalHours, 8)
      overtimeHours = Math.max(0, totalHours - 8)
    }
    
    // Update the time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        clockIn: clockInDate,
        clockOut: clockOutDate,
        breakStart: breakStartDate,
        breakEnd: breakEndDate,
        totalHours,
        regularHours,
        overtimeHours,
        status: clockOutDate ? 'approved' : 'active'
      }
    })
    
    return NextResponse.json({
      success: true,
      entry: updatedEntry
    })
  } catch (error) {
    console.error('Failed to update time entry:', error)
    return NextResponse.json(
      { error: 'Failed to update time entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.timeEntry.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete time entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete time entry' },
      { status: 500 }
    )
  }
}