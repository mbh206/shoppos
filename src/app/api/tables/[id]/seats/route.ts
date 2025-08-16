import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get the table with its current seats
    const table = await prisma.table.findUnique({
      where: { id },
      include: { seats: true },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Find the highest seat number
    const maxSeatNumber = Math.max(...table.seats.map(s => s.number), 0)
    
    // Create a new seat with the next number
    const newSeat = await prisma.seat.create({
      data: {
        tableId: id,
        number: maxSeatNumber + 1,
        status: 'open',
      },
    })

    // Update the table's capacity
    await prisma.table.update({
      where: { id },
      data: {
        capacity: table.capacity + 1,
      },
    })

    return NextResponse.json(newSeat)
  } catch (error) {
    console.error('Error adding seat:', error)
    return NextResponse.json(
      { error: 'Failed to add seat' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get the table with its current seats
    const table = await prisma.table.findUnique({
      where: { id },
      include: { 
        seats: {
          orderBy: { number: 'desc' },
          include: {
            seatSessions: {
              where: { endedAt: null }
            }
          }
        },
      },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    if (table.seats.length === 0) {
      return NextResponse.json({ error: 'No seats to remove' }, { status: 400 })
    }

    // Find the last seat that's not occupied
    const seatToRemove = table.seats.find(s => s.seatSessions.length === 0)

    if (!seatToRemove) {
      return NextResponse.json({ error: 'All seats are occupied' }, { status: 400 })
    }

    // Delete the seat
    await prisma.seat.delete({
      where: { id: seatToRemove.id },
    })

    // Update the table's capacity
    await prisma.table.update({
      where: { id },
      data: {
        capacity: Math.max(1, table.capacity - 1),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing seat:', error)
    return NextResponse.json(
      { error: 'Failed to remove seat' },
      { status: 500 }
    )
  }
}