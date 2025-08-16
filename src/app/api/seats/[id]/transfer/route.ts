import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sourceSeatId } = await params
  const body = await request.json()
  const { targetSeatId } = body

  if (!targetSeatId) {
    return NextResponse.json({ error: 'Target seat ID is required' }, { status: 400 })
  }

  if (sourceSeatId === targetSeatId) {
    return NextResponse.json({ error: 'Cannot transfer to the same seat' }, { status: 400 })
  }

  try {
    // Start transaction to ensure atomic transfer
    const result = await prisma.$transaction(async (tx) => {
      // Find active session on source seat
      const activeSession = await tx.seatSession.findFirst({
        where: {
          seatId: sourceSeatId,
          endedAt: null,
        },
        include: {
          seat: {
            include: {
              table: true,
            },
          },
          order: true,
        },
      })

      if (!activeSession) {
        throw new Error('No active session found on source seat')
      }

      // Check if target seat is available
      const targetSeat = await tx.seat.findUnique({
        where: { id: targetSeatId },
        include: {
          table: true,
          seatSessions: {
            where: { endedAt: null },
          },
        },
      })

      if (!targetSeat) {
        throw new Error('Target seat not found')
      }

      if (targetSeat.status === 'occupied' || targetSeat.seatSessions.length > 0) {
        throw new Error('Target seat is not available')
      }

      // Update the seat session to point to the new seat
      const updatedSession = await tx.seatSession.update({
        where: { id: activeSession.id },
        data: {
          seatId: targetSeatId,
        },
      })

      // Update source seat status to open
      await tx.seat.update({
        where: { id: sourceSeatId },
        data: { status: 'open' },
      })

      // Update target seat status to occupied
      await tx.seat.update({
        where: { id: targetSeatId },
        data: { status: 'occupied' },
      })

      // Check if source table should be marked as available
      const sourceTableOccupiedSeats = await tx.seat.count({
        where: {
          tableId: activeSession.seat.tableId,
          status: 'occupied',
        },
      })

      if (sourceTableOccupiedSeats === 0) {
        await tx.table.update({
          where: { id: activeSession.seat.tableId },
          data: { status: 'available' },
        })
      }

      // Update target table status to seated
      await tx.table.update({
        where: { id: targetSeat.tableId },
        data: { status: 'seated' },
      })

      // Log the transfer event
      await tx.orderEvent.create({
        data: {
          orderId: activeSession.orderId,
          kind: 'seat.transferred',
          payload: {
            fromSeatId: sourceSeatId,
            fromSeatNumber: activeSession.seat.number,
            fromTableName: activeSession.seat.table.name,
            toSeatId: targetSeatId,
            toSeatNumber: targetSeat.number,
            toTableName: targetSeat.table.name,
            sessionId: activeSession.id,
            transferredAt: new Date().toISOString(),
          },
        },
      })

      return {
        success: true,
        fromSeat: {
          id: sourceSeatId,
          number: activeSession.seat.number,
          tableName: activeSession.seat.table.name,
        },
        toSeat: {
          id: targetSeatId,
          number: targetSeat.number,
          tableName: targetSeat.table.name,
        },
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error transferring seat:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transfer seat' },
      { status: 400 }
    )
  }
}