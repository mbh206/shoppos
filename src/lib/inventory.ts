import { prisma } from '@/lib/prisma'

export type StockStatus = 'available' | 'low_stock' | 'out_of_stock'

export interface MenuItemAvailability {
  isAvailable: boolean
  status: StockStatus
  maxServings: number // How many of this item can be made with current stock
  limitingIngredient?: {
    name: string
    available: number
    required: number
    unit: string
  }
}

/**
 * Calculate how many servings of a menu item can be made with current stock
 */
export async function calculateMenuItemAvailability(menuItemId: string): Promise<MenuItemAvailability> {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      }
    }
  })

  if (!menuItem || menuItem.ingredients.length === 0) {
    // If no recipe defined, assume always available
    return {
      isAvailable: true,
      status: 'available',
      maxServings: 999
    }
  }

  let minServings = Infinity
  let limitingIngredient = null

  // Check each required (non-optional) ingredient
  for (const recipe of menuItem.ingredients.filter(r => !r.isOptional)) {
    const servingsFromIngredient = Math.floor(
      recipe.ingredient.stockQuantity / recipe.quantity
    )

    if (servingsFromIngredient < minServings) {
      minServings = servingsFromIngredient
      limitingIngredient = {
        name: recipe.ingredient.name,
        available: recipe.ingredient.stockQuantity,
        required: recipe.quantity,
        unit: recipe.ingredient.unit
      }
    }
  }

  // Determine status based on servings available
  let status: StockStatus = 'available'
  if (minServings === 0) {
    status = 'out_of_stock'
  } else if (minServings <= 5) { // Consider low stock if 5 or fewer servings can be made
    status = 'low_stock'
  }

  return {
    isAvailable: minServings > 0,
    status,
    maxServings: minServings === Infinity ? 999 : minServings,
    limitingIngredient
  }
}

/**
 * Get availability for all menu items
 */
export async function getAllMenuItemAvailability() {
  const menuItems = await prisma.menuItem.findMany({
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      },
      category: true
    }
  })

  const availability = await Promise.all(
    menuItems.map(async (item) => {
      const itemAvailability = await calculateMenuItemAvailability(item.id)
      return {
        ...item,
        availability: itemAvailability
      }
    })
  )

  return availability
}

/**
 * Deduct ingredients from stock when an order item is added
 */
export async function deductIngredientsForOrderItem(
  menuItemId: string,
  quantity: number,
  orderId?: string
) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      }
    }
  })

  if (!menuItem || menuItem.ingredients.length === 0) {
    return // No ingredients to deduct
  }

  const stockMovements = []

  for (const recipe of menuItem.ingredients) {
    if (recipe.isOptional) continue // Skip optional ingredients for now

    const totalQuantityNeeded = recipe.quantity * quantity

    // Check if sufficient stock
    if (recipe.ingredient.stockQuantity < totalQuantityNeeded) {
      throw new Error(
        `Insufficient stock for ${recipe.ingredient.name}. ` +
        `Need ${totalQuantityNeeded} ${recipe.ingredient.unit}, ` +
        `but only ${recipe.ingredient.stockQuantity} available.`
      )
    }

    // Update ingredient stock
    await prisma.ingredient.update({
      where: { id: recipe.ingredient.id },
      data: {
        stockQuantity: {
          decrement: totalQuantityNeeded
        }
      }
    })

    // Create stock movement record
    stockMovements.push({
      ingredientId: recipe.ingredient.id,
      type: 'sale' as const,
      quantity: -totalQuantityNeeded, // Negative for deduction
      unitCost: recipe.ingredient.costPerUnit,
      totalCost: Math.round(totalQuantityNeeded * recipe.ingredient.costPerUnit),
      reason: `Sold: ${quantity}x ${menuItem.name}`,
      referenceId: orderId,
      referenceType: 'order'
    })
  }

  // Create all stock movements
  if (stockMovements.length > 0) {
    await prisma.stockMovement.createMany({
      data: stockMovements
    })
  }
}

/**
 * Return ingredients to stock when an order item is removed
 */
export async function returnIngredientsForOrderItem(
  menuItemId: string,
  quantity: number,
  orderId?: string
) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      }
    }
  })

  if (!menuItem || menuItem.ingredients.length === 0) {
    return // No ingredients to return
  }

  const stockMovements = []

  for (const recipe of menuItem.ingredients) {
    if (recipe.isOptional) continue

    const totalQuantityToReturn = recipe.quantity * quantity

    // Update ingredient stock
    await prisma.ingredient.update({
      where: { id: recipe.ingredient.id },
      data: {
        stockQuantity: {
          increment: totalQuantityToReturn
        }
      }
    })

    // Create stock movement record
    stockMovements.push({
      ingredientId: recipe.ingredient.id,
      type: 'adjustment' as const,
      quantity: totalQuantityToReturn, // Positive for addition
      unitCost: recipe.ingredient.costPerUnit,
      totalCost: Math.round(totalQuantityToReturn * recipe.ingredient.costPerUnit),
      reason: `Returned: ${quantity}x ${menuItem.name}`,
      referenceId: orderId,
      referenceType: 'order'
    })
  }

  // Create all stock movements
  if (stockMovements.length > 0) {
    await prisma.stockMovement.createMany({
      data: stockMovements
    })
  }
}

/**
 * Check if ingredients are available for a menu item
 */
export async function checkIngredientsAvailable(
  menuItemId: string,
  quantity: number = 1
): Promise<{ available: boolean; issues: string[] }> {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      ingredients: {
        where: { isOptional: false }, // Only check required ingredients
        include: {
          ingredient: true
        }
      }
    }
  })

  if (!menuItem || menuItem.ingredients.length === 0) {
    return { available: true, issues: [] }
  }

  const issues: string[] = []

  for (const recipe of menuItem.ingredients) {
    const totalNeeded = recipe.quantity * quantity
    if (recipe.ingredient.stockQuantity < totalNeeded) {
      issues.push(
        `${recipe.ingredient.name}: need ${totalNeeded} ${recipe.ingredient.unit}, ` +
        `only ${recipe.ingredient.stockQuantity} available`
      )
    }
  }

  return {
    available: issues.length === 0,
    issues
  }
}