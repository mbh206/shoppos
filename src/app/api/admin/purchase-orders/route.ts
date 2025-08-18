import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')

    const where: any = {}
    if (status) {
      where.status = status as PurchaseOrderStatus
    }
    if (supplierId) {
      where.supplierId = supplierId
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            ingredient: true
          }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { orderDate: 'desc' }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
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
    const {
      supplierId,
      expectedDate,
      items,
      notes
    } = body

    // Generate order number (PO-YYYYMMDD-XXX)
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const count = await prisma.purchaseOrder.count({
      where: {
        orderNumber: {
          startsWith: `PO-${dateStr}`
        }
      }
    })
    const orderNumber = `PO-${dateStr}-${String(count + 1).padStart(3, '0')}`

    // Get supplier name
    const supplier = supplierId ? await prisma.supplier.findUnique({
      where: { id: supplierId }
    }) : null

    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      subtotal += item.totalCost
    }
    const tax = Math.floor(subtotal * 0.1) // 10% tax
    const total = subtotal + tax

    // Create purchase order with items
    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        supplierName: supplier?.name || 'Direct Purchase',
        status: 'draft',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        tax,
        shipping: 0,
        total,
        notes,
        createdBy: session.user.id,
        items: {
          create: items.map((item: any) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes
          }))
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            ingredient: true
          }
        }
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}