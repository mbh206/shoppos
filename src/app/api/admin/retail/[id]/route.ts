import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const retailItem = await prisma.retailItem.update({
      where: { id },
      data: {
        name: body.name,
        nameJa: body.nameJa || null,
        barcode: body.barcode || null,
        category: body.category || null,
        costPrice: body.costPrice,
        retailPrice: body.retailPrice,
        stockQuantity: body.stockQuantity,
        minStock: body.minStock || 0,
        maxStock: body.maxStock || null,
        reorderPoint: body.reorderPoint || null,
        reorderQuantity: body.reorderQuantity || null,
        supplier: body.supplier || null,
        supplierSKU: body.supplierSKU || null,
        imageUrl: body.imageUrl || null,
        description: body.description || null,
        isActive: body.isActive
      }
    })

    return NextResponse.json(retailItem)
  } catch (error) {
    console.error('Error updating retail item:', error)
    return NextResponse.json(
      { error: 'Failed to update retail item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.retailItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting retail item:', error)
    return NextResponse.json(
      { error: 'Failed to delete retail item' },
      { status: 500 }
    )
  }
}