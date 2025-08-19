import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { employeeId } = await request.json()
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }
    
    // Find user by employee ID
    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: {
        profile: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Employee ID not found' },
        { status: 401 }
      )
    }
    
    // Check for active time entry
    const currentShift = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockOut: null
      },
      orderBy: {
        clockIn: 'desc'
      }
    })
    
    // Return employee info and current shift if any
    return NextResponse.json({
      employee: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role
      },
      currentShift: currentShift ? {
        id: currentShift.id,
        userId: currentShift.userId,
        clockIn: currentShift.clockIn.toISOString(),
        clockOut: currentShift.clockOut?.toISOString() || null,
        breakStart: currentShift.breakStart?.toISOString() || null,
        breakEnd: currentShift.breakEnd?.toISOString() || null,
        totalHours: currentShift.totalHours
      } : null
    })
  } catch (error) {
    console.error('Time clock auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}