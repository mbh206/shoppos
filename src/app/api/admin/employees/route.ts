import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
        hireDate: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            phoneNumber: true,
            address: true,
            hourlyRate: true,
            emergencyContact: true
          }
        },
        _count: {
          select: {
            timeEntries: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('Creating employee with data:', body)
    const {
      email,
      name,
      role,
      employeeId,
      position,
      hireDate,
      hourlyRate,
      phoneNumber,
      address,
      hashedPassword
    } = body

    // Check if employee ID already exists
    if (employeeId) {
      const existing = await prisma.user.findFirst({
        where: { employeeId }
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 400 }
        )
      }
    }

    // Create user with employee profile
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role as UserRole,
        employeeId,
        position,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        hashedPassword: hashedPassword || 'temp123', // Default password
        profile: {
          create: {
            payRate: Math.floor((hourlyRate || 0) * 100), // Convert to minor units
            hourlyRate: hourlyRate || 0,
            phoneNumber,
            address
          }
        }
      },
      include: {
        profile: true
      }
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error creating employee:', error)
    console.error('Error details:', error.message)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email or Employee ID already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}