import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || !['admin', 'host'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { menuItems: true }
        }
      }
    })
    
    return NextResponse.json(ingredients)
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
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
    const data = await request.json()
    
    const ingredient = await prisma.ingredient.create({
      data: {
        name: data.name,
        unit: data.unit,
        costPerUnit: data.costPerUnit,
        stockQuantity: data.stockQuantity || 0,
        minStock: data.minStock || 0,
        maxStock: data.maxStock,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        supplier: data.supplier,
        supplierSKU: data.supplierSKU,
        leadTimeDays: data.leadTimeDays || 1,
        notes: data.notes,
      },
    })

    // Create initial stock movement
    if (data.stockQuantity > 0) {
      await prisma.stockMovement.create({
        data: {
          ingredientId: ingredient.id,
          type: 'initial',
          quantity: data.stockQuantity,
          unitCost: data.costPerUnit,
          totalCost: Math.round(data.stockQuantity * data.costPerUnit),
          reason: 'Initial stock',
          performedBy: session.user.id,
        }
      })
    }
    
    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error creating ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to create ingredient' },
      { status: 500 }
    )
  }
}