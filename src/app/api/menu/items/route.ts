import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateMenuItemAvailability } from '@/lib/inventory'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    // Add availability information to each item
    const itemsWithAvailability = await Promise.all(
      items.map(async (item) => {
        const availability = await calculateMenuItemAvailability(item.id)
        return {
          ...item,
          availability
        }
      })
    )

    return NextResponse.json({ items: itemsWithAvailability })
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      ingredients = []
    } = body

    // Calculate cost price from ingredients if provided
    let costPrice = 0
    if (ingredients.length > 0) {
      for (const ing of ingredients) {
        const ingredient = await prisma.ingredient.findUnique({
          where: { id: ing.ingredientId }
        })
        if (ingredient) {
          costPrice += Math.floor(ingredient.costPerUnit * ing.quantity)
        }
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        categoryId,
        name,
        nameJa,
        description,
        customerPrice,
        costPrice,
        quantity,
        isAvailable: isAvailable ?? true,
        sortOrder: sortOrder ?? 0,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
          })),
        },
      },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    )
  }
}