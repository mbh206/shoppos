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
  
  try {
    const data = await request.json()
    
    console.log('Updating ingredient with data:', {
      id,
      ...data
    })
    
    // Get current ingredient to check for stock changes
    const currentIngredient = await prisma.ingredient.findUnique({
      where: { id }
    })

    if (!currentIngredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    // Update the ingredient
    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name: data.name,
        unit: data.unit,
        costPerUnit: data.costPerUnit,
        stockQuantity: data.stockQuantity,
        minStock: data.minStock,
        maxStock: data.maxStock,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        supplier: data.supplier,
        supplierSKU: data.supplierSKU,
        leadTimeDays: data.leadTimeDays,
        notes: data.notes,
        isActive: data.isActive,
      },
    })

    // If stock quantity changed, create a stock movement record
    if (currentIngredient.stockQuantity !== data.stockQuantity) {
      const difference = data.stockQuantity - currentIngredient.stockQuantity
      
      console.log('Creating stock movement:', {
        difference,
        userId: session.user?.id,
        currentStock: currentIngredient.stockQuantity,
        newStock: data.stockQuantity
      })
      
      await prisma.stockMovement.create({
        data: {
          ingredientId: id,
          type: 'adjustment',
          quantity: difference,
          unitCost: data.costPerUnit,
          totalCost: Math.round(Math.abs(difference) * data.costPerUnit),
          reason: 'Manual adjustment',
          performedBy: session.user?.id || null,
          notes: `Stock adjusted from ${currentIngredient.stockQuantity} to ${data.stockQuantity}`
        }
      })
    }
    
    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error updating ingredient - Full error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update ingredient' },
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
    // Check if ingredient is used in any recipes
    const recipesCount = await prisma.menuItemIngredient.count({
      where: { ingredientId: id }
    })

    if (recipesCount > 0) {
      return NextResponse.json(
        { error: `This ingredient is used in ${recipesCount} recipe(s). Remove it from all recipes before deleting.` },
        { status: 400 }
      )
    }

    // Delete the ingredient (this will cascade delete stock movements)
    await prisma.ingredient.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to delete ingredient' },
      { status: 500 }
    )
  }
}