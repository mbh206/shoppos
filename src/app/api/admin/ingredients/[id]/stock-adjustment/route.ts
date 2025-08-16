import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !['admin', 'host'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  try {
    const data = await request.json()
    const { type, quantity, newStockQuantity, notes } = data

    // Get current ingredient
    const ingredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    // Update stock quantity
    const updatedIngredient = await prisma.ingredient.update({
      where: { id },
      data: {
        stockQuantity: newStockQuantity,
        lastRestocked: type === 'purchase' ? new Date() : undefined,
      }
    })

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        ingredientId: id,
        type: type as any,
        quantity,
        unitCost: ingredient.costPerUnit,
        totalCost: Math.round(Math.abs(quantity) * ingredient.costPerUnit),
        reason: notes || `Stock ${type}`,
        performedBy: session.user.id,
        notes: `Adjusted from ${ingredient.stockQuantity} to ${newStockQuantity}. ${notes || ''}`.trim()
      }
    })
    
    return NextResponse.json(updatedIngredient)
  } catch (error) {
    console.error('Error adjusting stock:', error)
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}