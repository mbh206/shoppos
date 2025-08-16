import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedInventory() {
  console.log('Seeding inventory data...')

  // Create ingredients
  const ingredients = await Promise.all([
    // Bread and Bakery
    prisma.ingredient.upsert({
      where: { name: 'White Bread' },
      update: {},
      create: {
        name: 'White Bread',
        unit: 'slice',
        costPerUnit: 1000, // ¥10 per slice
        stockQuantity: 100,
        minStock: 20,
        reorderPoint: 30,
        reorderQuantity: 100,
        supplier: 'Tokyo Bakery',
        leadTimeDays: 1,
      }
    }),
    prisma.ingredient.upsert({
      where: { name: 'Croissant' },
      update: {},
      create: {
        name: 'Croissant',
        unit: 'piece',
        costPerUnit: 15000, // ¥150 per piece
        stockQuantity: 30,
        minStock: 10,
        reorderPoint: 15,
        reorderQuantity: 50,
        supplier: 'French Bakery Co',
        leadTimeDays: 2,
      }
    }),

    // Spreads and Condiments
    prisma.ingredient.upsert({
      where: { name: 'Peanut Butter' },
      update: {},
      create: {
        name: 'Peanut Butter',
        unit: 'g',
        costPerUnit: 500, // ¥5 per gram
        stockQuantity: 2000,
        minStock: 500,
        reorderPoint: 750,
        reorderQuantity: 2000,
        supplier: 'Skippy Japan',
        leadTimeDays: 3,
      }
    }),
    prisma.ingredient.upsert({
      where: { name: 'Strawberry Jam' },
      update: {},
      create: {
        name: 'Strawberry Jam',
        unit: 'g',
        costPerUnit: 300, // ¥3 per gram
        stockQuantity: 1500,
        minStock: 300,
        reorderPoint: 500,
        reorderQuantity: 1500,
        supplier: 'Aohata Co',
        leadTimeDays: 2,
      }
    }),

    // Coffee Ingredients
    prisma.ingredient.upsert({
      where: { name: 'Espresso Beans' },
      update: {},
      create: {
        name: 'Espresso Beans',
        unit: 'g',
        costPerUnit: 1000, // ¥10 per gram
        stockQuantity: 5000,
        minStock: 1000,
        reorderPoint: 2000,
        reorderQuantity: 5000,
        supplier: 'Tokyo Coffee Roasters',
        leadTimeDays: 2,
      }
    }),
    prisma.ingredient.upsert({
      where: { name: 'Milk' },
      update: {},
      create: {
        name: 'Milk',
        unit: 'ml',
        costPerUnit: 20, // ¥0.2 per ml
        stockQuantity: 10000,
        minStock: 2000,
        reorderPoint: 4000,
        reorderQuantity: 10000,
        supplier: 'Meiji Dairy',
        leadTimeDays: 1,
      }
    }),
    prisma.ingredient.upsert({
      where: { name: 'Vanilla Syrup' },
      update: {},
      create: {
        name: 'Vanilla Syrup',
        unit: 'ml',
        costPerUnit: 100, // ¥1 per ml
        stockQuantity: 1000,
        minStock: 200,
        reorderPoint: 400,
        reorderQuantity: 1000,
        supplier: 'Monin Japan',
        leadTimeDays: 3,
        notes: 'Optional flavoring'
      }
    }),

    // Snacks
    prisma.ingredient.upsert({
      where: { name: 'Popcorn Kernels' },
      update: {},
      create: {
        name: 'Popcorn Kernels',
        unit: 'g',
        costPerUnit: 50, // ¥0.5 per gram
        stockQuantity: 3000,
        minStock: 500,
        reorderPoint: 1000,
        reorderQuantity: 3000,
        supplier: 'American Snacks Inc',
        leadTimeDays: 5,
      }
    }),
    prisma.ingredient.upsert({
      where: { name: 'Popcorn Bag' },
      update: {},
      create: {
        name: 'Popcorn Bag',
        unit: 'piece',
        costPerUnit: 500, // ¥5 per bag
        stockQuantity: 500,
        minStock: 100,
        reorderPoint: 200,
        reorderQuantity: 500,
        supplier: 'Tokyo Packaging',
        leadTimeDays: 2,
      }
    }),
    prisma.ingredient.upsert({
      where: { name: 'Sandwich Paper' },
      update: {},
      create: {
        name: 'Sandwich Paper',
        unit: 'piece',
        costPerUnit: 200, // ¥2 per piece
        stockQuantity: 1000,
        minStock: 200,
        reorderPoint: 400,
        reorderQuantity: 1000,
        supplier: 'Tokyo Packaging',
        leadTimeDays: 2,
      }
    }),

    // Tea
    prisma.ingredient.upsert({
      where: { name: 'Green Tea Leaves' },
      update: {},
      create: {
        name: 'Green Tea Leaves',
        unit: 'g',
        costPerUnit: 500, // ¥5 per gram
        stockQuantity: 1000,
        minStock: 200,
        reorderPoint: 400,
        reorderQuantity: 1000,
        supplier: 'Ito En',
        leadTimeDays: 2,
      }
    }),
  ])

  console.log(`Created ${ingredients.length} ingredients`)

  // Now let's link some menu items to ingredients (recipes)
  // First, get some menu items
  const menuItems = await prisma.menuItem.findMany({
    where: {
      name: {
        in: ['Croissant', 'Espresso', 'Latte', 'Cappuccino']
      }
    }
  })

  // Create recipes for menu items
  for (const item of menuItems) {
    // Clear existing recipes
    await prisma.menuItemIngredient.deleteMany({
      where: { menuItemId: item.id }
    })

    if (item.name === 'Croissant') {
      await prisma.menuItemIngredient.create({
        data: {
          menuItemId: item.id,
          ingredientId: ingredients.find(i => i.name === 'Croissant')!.id,
          quantity: 1, // 1 piece
        }
      })
    }

    if (item.name === 'Espresso') {
      await prisma.menuItemIngredient.create({
        data: {
          menuItemId: item.id,
          ingredientId: ingredients.find(i => i.name === 'Espresso Beans')!.id,
          quantity: 18, // 18g of coffee
        }
      })
    }

    if (item.name === 'Latte') {
      await prisma.menuItemIngredient.createMany({
        data: [
          {
            menuItemId: item.id,
            ingredientId: ingredients.find(i => i.name === 'Espresso Beans')!.id,
            quantity: 18, // 18g of coffee
          },
          {
            menuItemId: item.id,
            ingredientId: ingredients.find(i => i.name === 'Milk')!.id,
            quantity: 200, // 200ml of milk
          },
          {
            menuItemId: item.id,
            ingredientId: ingredients.find(i => i.name === 'Vanilla Syrup')!.id,
            quantity: 15, // 15ml of syrup
            isOptional: true,
          }
        ]
      })
    }

    if (item.name === 'Cappuccino') {
      await prisma.menuItemIngredient.createMany({
        data: [
          {
            menuItemId: item.id,
            ingredientId: ingredients.find(i => i.name === 'Espresso Beans')!.id,
            quantity: 18, // 18g of coffee
          },
          {
            menuItemId: item.id,
            ingredientId: ingredients.find(i => i.name === 'Milk')!.id,
            quantity: 150, // 150ml of milk
          }
        ]
      })
    }
  }

  // Update cost prices for menu items based on recipes
  for (const item of menuItems) {
    const recipes = await prisma.menuItemIngredient.findMany({
      where: { menuItemId: item.id },
      include: { ingredient: true }
    })

    const costPrice = recipes.reduce((sum, recipe) => {
      if (recipe.isOptional) return sum // Don't include optional ingredients in base cost
      return sum + Math.floor(recipe.quantity * recipe.ingredient.costPerUnit)
    }, 0)

    await prisma.menuItem.update({
      where: { id: item.id },
      data: { costPrice }
    })

    console.log(`Updated ${item.name} with cost price: ¥${costPrice / 100}`)
  }

  console.log('Inventory seeding complete!')
}

seedInventory()
  .catch(console.error)
  .finally(() => prisma.$disconnect())