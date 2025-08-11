import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderItemKind } from '@prisma/client'

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
  const {
    kind,
    name,
    squareCatalogObjectId,
    qty,
    unitPriceMinor,
    taxMinor = 0,
    meta,
  } = body

  try {
    // Calculate total
    const totalMinor = (qty * unitPriceMinor) + taxMinor

    const item = await prisma.orderItem.create({
      data: {
        orderId: id,
        kind: kind as OrderItemKind,
        name,
        squareCatalogObjectId,
        qty,
        unitPriceMinor,
        taxMinor,
        totalMinor,
        meta,
      },
    })

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        kind: 'item.added',
        payload: {
          itemId: item.id,
          name,
          qty,
          totalMinor,
        },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error adding item:', error)
    return NextResponse.json(
      { error: 'Failed to add item' },
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
  const body = await request.json()
  const { itemId } = body

  try {
    const item = await prisma.orderItem.delete({
      where: { id: itemId },
    })

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        kind: 'item.removed',
        payload: {
          itemId: item.id,
          name: item.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing item:', error)
    return NextResponse.json(
      { error: 'Failed to remove item' },
      { status: 500 }
    )
  }
}