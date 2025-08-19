import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInHours } from 'date-fns'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }
    
    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)
    
    // Get all employees with their time entries in the date range
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['employee', 'manager', 'admin'] }
      },
      include: {
        timeEntries: {
          where: {
            clockIn: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            clockIn: 'desc'
          }
        }
      }
    })
    
    // Calculate totals for each employee
    const employees = users.map(user => {
      const today = new Date()
      const todayStart = startOfDay(today)
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const monthStart = startOfMonth(today)
      
      // Calculate total hours for different periods
      const todayHours = user.timeEntries
        .filter(entry => entry.clockIn >= todayStart)
        .reduce((sum, entry) => sum + entry.totalHours, 0)
      
      const weekHours = user.timeEntries
        .filter(entry => entry.clockIn >= weekStart)
        .reduce((sum, entry) => sum + entry.totalHours, 0)
      
      const monthHours = user.timeEntries
        .filter(entry => entry.clockIn >= monthStart)
        .reduce((sum, entry) => sum + entry.totalHours, 0)
      
      return {
        id: user.id,
        name: user.name || user.email,
        employeeId: user.employeeId || 'N/A',
        email: user.email,
        totalHours: {
          today: todayHours,
          week: weekHours,
          month: monthHours
        },
        entries: user.timeEntries.map(entry => ({
          id: entry.id,
          userId: entry.userId,
          clockIn: entry.clockIn.toISOString(),
          clockOut: entry.clockOut?.toISOString() || null,
          breakStart: entry.breakStart?.toISOString() || null,
          breakEnd: entry.breakEnd?.toISOString() || null,
          regularHours: entry.regularHours,
          overtimeHours: entry.overtimeHours,
          totalHours: entry.totalHours,
          status: entry.status,
          user: {
            id: user.id,
            name: user.name || user.email,
            employeeId: user.employeeId || 'N/A',
            email: user.email
          }
        }))
      }
    })
    
    // Sort employees by name
    employees.sort((a, b) => a.name.localeCompare(b.name))
    
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Failed to fetch time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}