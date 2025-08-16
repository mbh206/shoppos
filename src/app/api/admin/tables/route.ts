import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tables = await prisma.table.findMany({
      include: {
        seats: true,
      },
      orderBy: [
        { floor: 'asc' },
        { zone: 'asc' },
        { name: 'asc' },
      ],
    })

    // Ensure we return an array even if empty
    return NextResponse.json(tables || [])
  } catch (error) {
    console.error('Error fetching tables - Full error:', error)
    // Return empty array on error so UI can handle gracefully
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  const session = await auth()
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, capacity, floor, zone, shape, posX, posY, width, height, rotation } = body

    const table = await prisma.table.create({
      data: {
        name,
        capacity,
        floor: floor || 1,
        zone: zone || 'main',
        shape: shape || 'rectangle',
        posX: posX || 0,
        posY: posY || 0,
        width: width || 100,
        height: height || 100,
        rotation: rotation || 0,
      },
    })

    // Create seats for the table
    const seatPromises = []
    for (let i = 1; i <= capacity; i++) {
      seatPromises.push(
        prisma.seat.create({
          data: {
            tableId: table.id,
            number: i,
            status: 'open',
          },
        })
      )
    }
    await Promise.all(seatPromises)

    const tableWithSeats = await prisma.table.findUnique({
      where: { id: table.id },
      include: { seats: true },
    })

    return NextResponse.json(tableWithSeats)
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    )
  }
}