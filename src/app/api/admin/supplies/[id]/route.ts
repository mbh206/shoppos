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
    const supply = await prisma.supply.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category || null,
        unit: body.unit,
        costPerUnit: body.costPerUnit,
        stockQuantity: body.stockQuantity,
        minStock: body.minStock || 0,
        maxStock: body.maxStock || null,
        reorderPoint: body.reorderPoint || null,
        reorderQuantity: body.reorderQuantity || null,
        supplier: body.supplier || null,
        supplierSKU: body.supplierSKU || null,
        leadTimeDays: body.leadTimeDays || 1,
        notes: body.notes || null,
        isActive: body.isActive
      }
    })

    return NextResponse.json(supply)
  } catch (error) {
    console.error('Error updating supply:', error)
    return NextResponse.json(
      { error: 'Failed to update supply' },
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
    await prisma.supply.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supply:', error)
    return NextResponse.json(
      { error: 'Failed to delete supply' },
      { status: 500 }
    )
  }
}