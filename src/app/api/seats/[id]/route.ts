import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SeatStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status } = body as { status: SeatStatus }

  try {
    const seat = await prisma.seat.update({
      where: { id },
      data: { status },
      include: {
        table: true,
        seatSessions: {
          where: {
            endedAt: null,
          },
        },
      },
    })

    // Update table status based on seat statuses
    const allSeats = await prisma.seat.findMany({
      where: { tableId: seat.tableId },
    })

    const hasOccupied = allSeats.some(s => s.status === 'occupied')
    const allClosed = allSeats.every(s => s.status === 'closed')

    let tableStatus = seat.table.status
    if (allClosed) {
      tableStatus = 'offline'
    } else if (hasOccupied) {
      tableStatus = 'seated'
    } else if (seat.table.status === 'seated' && !hasOccupied) {
      tableStatus = 'available'
    }

    if (tableStatus !== seat.table.status) {
      await prisma.table.update({
        where: { id: seat.tableId },
        data: { status: tableStatus },
      })
    }

    return NextResponse.json(seat)
  } catch (error) {
    console.error('Error updating seat:', error)
    return NextResponse.json(
      { error: 'Failed to update seat' },
      { status: 500 }
    )
  }
}