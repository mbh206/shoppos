import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get low stock items
    const [ingredients, supplies, retailItems] = await Promise.all([
      // Low stock ingredients
      prisma.ingredient.findMany({
        where: {
          isActive: true,
          OR: [
            { stockQuantity: { lte: prisma.ingredient.fields.minStock } },
            {
              AND: [
                { reorderPoint: { not: null } },
                { stockQuantity: { lte: prisma.ingredient.fields.reorderPoint } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          minStock: true,
          reorderPoint: true,
          unit: true,
          costPerUnit: true
        }
      }),
      
      // Low stock supplies
      prisma.supply.findMany({
        where: {
          isActive: true,
          OR: [
            { stockQuantity: { lte: prisma.supply.fields.minStock } },
            {
              AND: [
                { reorderPoint: { not: null } },
                { stockQuantity: { lte: prisma.supply.fields.reorderPoint } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          minStock: true,
          reorderPoint: true,
          unit: true,
          costPerUnit: true
        }
      }),
      
      // Low stock retail items
      prisma.retailItem.findMany({
        where: {
          isActive: true,
          OR: [
            { stockQuantity: { lte: prisma.retailItem.fields.minStock } },
            {
              AND: [
                { reorderPoint: { not: null } },
                { stockQuantity: { lte: prisma.retailItem.fields.reorderPoint } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          minStock: true,
          reorderPoint: true,
          costPrice: true
        }
      })
    ])

    // Format low stock items
    const lowStockItems = [
      ...ingredients.map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.stockQuantity,
        minStock: item.minStock,
        unit: item.unit,
        category: 'ingredient' as const
      })),
      ...supplies.map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.stockQuantity,
        minStock: item.minStock,
        unit: item.unit,
        category: 'supply' as const
      })),
      ...retailItems.map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.stockQuantity,
        minStock: item.minStock,
        unit: 'unit',
        category: 'retail' as const
      }))
    ].filter(item => item.currentStock <= item.minStock)

    // Calculate stock values
    const [allIngredients, allSupplies, allRetailItems] = await Promise.all([
      prisma.ingredient.findMany({
        where: { isActive: true },
        select: { stockQuantity: true, costPerUnit: true }
      }),
      prisma.supply.findMany({
        where: { isActive: true },
        select: { stockQuantity: true, costPerUnit: true }
      }),
      prisma.retailItem.findMany({
        where: { isActive: true },
        select: { stockQuantity: true, costPrice: true }
      })
    ])

    const stockValue = {
      ingredients: allIngredients.reduce((sum, item) => 
        sum + (item.stockQuantity * item.costPerUnit), 0),
      supplies: allSupplies.reduce((sum, item) => 
        sum + (item.stockQuantity * item.costPerUnit), 0),
      retail: allRetailItems.reduce((sum, item) => 
        sum + (item.stockQuantity * item.costPrice), 0),
      total: 0
    }
    stockValue.total = stockValue.ingredients + stockValue.supplies + stockValue.retail

    // Get recent stock movements
    let recentMovements = []
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const movements = await prisma.stockMovement.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        include: {
          ingredient: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      recentMovements = movements.map(movement => ({
        itemName: movement.ingredient.name,
        type: movement.type,
        quantity: movement.quantity,
        date: movement.createdAt.toISOString(),
        reason: movement.reason || movement.type
      }))
    }

    return NextResponse.json({
      lowStockItems,
      stockValue,
      recentMovements
    })
  } catch (error) {
    console.error('Error generating inventory report:', error)
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
      { status: 500 }
    )
  }
}