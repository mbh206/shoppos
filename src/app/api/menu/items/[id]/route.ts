import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching menu item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { 
      categoryId, 
      name, 
      nameJa, 
      description, 
      customerPrice, 
      quantity,
      isAvailable,
      sortOrder,
      ingredients
    } = body

    // If ingredients are provided, recalculate cost price
    let costPrice = undefined
    if (ingredients !== undefined) {
      costPrice = 0
      
      // Delete existing ingredients
      await prisma.menuItemIngredient.deleteMany({
        where: { menuItemId: id }
      })

      // Calculate new cost
      for (const ing of ingredients) {
        const ingredient = await prisma.ingredient.findUnique({
          where: { id: ing.ingredientId }
        })
        if (ingredient) {
          costPrice += Math.floor(ingredient.costPerUnit * ing.quantity)
        }
      }
    }

    const updateData: any = {
      ...(categoryId !== undefined && { categoryId }),
      ...(name !== undefined && { name }),
      ...(nameJa !== undefined && { nameJa }),
      ...(description !== undefined && { description }),
      ...(customerPrice !== undefined && { customerPrice }),
      ...(costPrice !== undefined && { costPrice }),
      ...(quantity !== undefined && { quantity }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(sortOrder !== undefined && { sortOrder }),
    }

    // Update the item
    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    // Create new ingredients if provided
    if (ingredients !== undefined && ingredients.length > 0) {
      await prisma.menuItemIngredient.createMany({
        data: ingredients.map((ing: any) => ({
          menuItemId: id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
        })),
      })
    }

    // Fetch the updated item with ingredients
    const updatedItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.menuItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}