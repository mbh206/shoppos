import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const retailItems = await prisma.retailItem.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(retailItems)
  } catch (error) {
    console.error('Error fetching retail items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retail items' },
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
    
    const retailItem = await prisma.retailItem.create({
      data: {
        name: body.name,
        nameJa: body.nameJa || null,
        barcode: body.barcode || null,
        category: body.category || null,
        costPrice: body.costPrice,
        retailPrice: body.retailPrice,
        stockQuantity: body.stockQuantity || 0,
        minStock: body.minStock || 0,
        maxStock: body.maxStock || null,
        reorderPoint: body.reorderPoint || null,
        reorderQuantity: body.reorderQuantity || null,
        supplier: body.supplier || null,
        supplierSKU: body.supplierSKU || null,
        imageUrl: body.imageUrl || null,
        description: body.description || null,
        isActive: body.isActive !== false
      }
    })

    return NextResponse.json(retailItem)
  } catch (error) {
    console.error('Error creating retail item:', error)
    return NextResponse.json(
      { error: 'Failed to create retail item' },
      { status: 500 }
    )
  }
}