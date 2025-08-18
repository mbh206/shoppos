import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  try {
    const { recipes } = await request.json()
    
    // Delete existing recipes
    await prisma.menuItemIngredient.deleteMany({
      where: { menuItemId: id }
    })
    
    // Create new recipes
    if (recipes && recipes.length > 0) {
      await prisma.menuItemIngredient.createMany({
        data: recipes.map((recipe: any) => ({
          menuItemId: id,
          ingredientId: recipe.ingredientId,
          quantity: recipe.quantity,
          isOptional: recipe.isOptional || false
        }))
      })
    }
    
    // Fetch updated menu item with recipes
    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        }
      }
    })
    
    return NextResponse.json(menuItem)
  } catch (error) {
    console.error('Error updating recipes:', error)
    return NextResponse.json(
      { error: 'Failed to update recipes' },
      { status: 500 }
    )
  }
}