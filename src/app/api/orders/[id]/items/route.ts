import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderItemKind } from '@prisma/client'
import { 
  checkIngredientsAvailable, 
  deductIngredientsForOrderItem,
  returnIngredientsForOrderItem 
} from '@/lib/inventory'

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
    menuItemId, // Add menuItemId to link to inventory
  } = body

  try {
    // If this is a regular menu item, check stock availability
    if (menuItemId && kind === 'regular') {
      const stockCheck = await checkIngredientsAvailable(menuItemId, qty)
      if (!stockCheck.available) {
        return NextResponse.json(
          { 
            error: 'Insufficient stock', 
            details: stockCheck.issues 
          },
          { status: 400 }
        )
      }
    }

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
        meta: {
          ...meta,
          menuItemId, // Store menuItemId in meta for reference
        },
      },
    })

    // Deduct ingredients from stock if this is a menu item
    if (menuItemId && kind === 'regular') {
      try {
        await deductIngredientsForOrderItem(menuItemId, qty, id)
      } catch (error) {
        // If stock deduction fails, delete the created item
        await prisma.orderItem.delete({ where: { id: item.id } })
        throw error
      }
    }

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
    // First get the item to check if we need to return stock
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // If this item has a menuItemId, return ingredients to stock
    if (item.meta && typeof item.meta === 'object' && 'menuItemId' in item.meta) {
      const menuItemId = (item.meta as any).menuItemId
      if (menuItemId && item.kind === 'regular') {
        await returnIngredientsForOrderItem(menuItemId, item.qty, id)
      }
    }

    // Now delete the item
    await prisma.orderItem.delete({
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