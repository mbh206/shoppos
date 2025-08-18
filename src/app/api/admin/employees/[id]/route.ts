import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        timeEntries: {
          orderBy: { clockIn: 'desc' },
          take: 10
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const {
      name,
      role,
      employeeId,
      position,
      hireDate,
      hourlyRate,
      phoneNumber,
      address
    } = body

    // Check if employee ID is being changed and already exists
    if (employeeId) {
      const existing = await prisma.user.findFirst({
        where: {
          employeeId,
          NOT: { id }
        }
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 400 }
        )
      }
    }

    // Update user and profile
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        role: role as UserRole,
        employeeId,
        position,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        profile: {
          upsert: {
            create: {
              payRate: Math.floor((hourlyRate || 0) * 100), // Convert to minor units
              hourlyRate: hourlyRate || 0,
              phoneNumber,
              address
            },
            update: {
              payRate: hourlyRate ? Math.floor(hourlyRate * 100) : undefined,
              hourlyRate,
              phoneNumber,
              address
            }
          }
        }
      },
      include: {
        profile: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Delete the user profile first if it exists
    await prisma.employeeProfile.deleteMany({
      where: { userId: id }
    })
    
    // Then delete the user
    const user = await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}