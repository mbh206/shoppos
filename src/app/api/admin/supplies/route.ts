import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supplies = await prisma.supply.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(supplies)
  } catch (error) {
    console.error('Error fetching supplies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplies' },
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
    
    const supply = await prisma.supply.create({
      data: {
        name: body.name,
        category: body.category || null,
        unit: body.unit,
        costPerUnit: body.costPerUnit,
        stockQuantity: body.stockQuantity || 0,
        minStock: body.minStock || 0,
        maxStock: body.maxStock || null,
        reorderPoint: body.reorderPoint || null,
        reorderQuantity: body.reorderQuantity || null,
        supplier: body.supplier || null,
        supplierSKU: body.supplierSKU || null,
        leadTimeDays: body.leadTimeDays || 1,
        notes: body.notes || null,
        isActive: body.isActive !== false
      }
    })

    return NextResponse.json(supply)
  } catch (error) {
    console.error('Error creating supply:', error)
    return NextResponse.json(
      { error: 'Failed to create supply' },
      { status: 500 }
    )
  }
}