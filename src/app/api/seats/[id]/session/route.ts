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

  const { id } = await params
  const body = await request.json()
  const { orderId, customerId } = body

  try {
    // Check if seat already has an active session
    const existingSession = await prisma.seatSession.findFirst({
      where: {
        seatId: id,
        endedAt: null,
      },
    })

    if (existingSession) {
      return NextResponse.json(
        { error: 'Seat already has an active session' },
        { status: 400 }
      )
    }

    // Create new seat session WITHOUT startedAt (no timer)
    const seatSession = await prisma.seatSession.create({
      data: {
        seatId: id,
        orderId,
        customerId,
        // Note: NOT setting startedAt - this means no timer
      },
      include: {
        seat: {
          include: {
            table: true,
          },
        },
        order: true,
        customer: true,
      },
    })

    // Update seat status to occupied
    await prisma.seat.update({
      where: { id },
      data: { status: 'occupied' },
    })

    // Update table status to seated
    await prisma.table.update({
      where: { id: seatSession.seat.tableId },
      data: { status: 'seated' },
    })

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId,
        kind: 'seat.session.started',
        payload: {
          seatId: id,
          sessionId: seatSession.id,
          hasTimer: false,
        },
      },
    })

    return NextResponse.json(seatSession)
  } catch (error) {
    console.error('Error starting seat session:', error)
    return NextResponse.json(
      { error: 'Failed to start seat session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Find active session
    const seatSession = await prisma.seatSession.findFirst({
      where: {
        seatId: id,
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

    if (!seatSession) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      )
    }

    // End the session (no time billing since there's no timer)
    const endedAt = new Date()

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update seat session
      const updatedSession = await tx.seatSession.update({
        where: { id: seatSession.id },
        data: {
          endedAt,
        },
      })

      // Update seat status
      await tx.seat.update({
        where: { id },
        data: { status: 'open' },
      })

      // Check if table should be marked as dirty
      const otherOccupiedSeats = await tx.seat.count({
        where: {
          tableId: seatSession.seat.tableId,
          status: 'occupied',
          id: { not: id },
        },
      })

      if (otherOccupiedSeats === 0) {
        // All seats are now empty, mark table as dirty
        await tx.table.update({
          where: { id: seatSession.seat.tableId },
          data: { status: 'dirty' },
        })
      }

      // Log order event
      await tx.orderEvent.create({
        data: {
          orderId: seatSession.orderId,
          kind: 'seat.session.ended',
          payload: {
            seatId: id,
            sessionId: seatSession.id,
            endedAt: endedAt.toISOString(),
          },
        },
      })

      return { session: updatedSession }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error ending seat session:', error)
    return NextResponse.json(
      { error: 'Failed to end seat session' },
      { status: 500 }
    )
  }
}