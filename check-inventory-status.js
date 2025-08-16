const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check menu items with recipes
  const menuItems = await prisma.menuItem.findMany({
    where: {
      ingredients: {
        some: {}
      }
    },
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      }
    }
  })

  console.log('\n=== MENU ITEMS WITH RECIPES ===')
  for (const item of menuItems) {
    console.log(`\n${item.name}:`)
    console.log(`  Selling Price: ¥${item.customerPrice / 100}`)
    console.log(`  Cost (COGS): ¥${item.costPrice / 100}`)
    const margin = item.customerPrice - item.costPrice
    const marginPercent = item.customerPrice > 0 ? (margin / item.customerPrice) * 100 : 0
    console.log(`  Margin: ¥${margin / 100} (${marginPercent.toFixed(1)}%)`)
    console.log('  Ingredients:')
    
    for (const recipe of item.ingredients) {
      const ing = recipe.ingredient
      const servingsAvailable = Math.floor(ing.stockQuantity / recipe.quantity)
      console.log(`    - ${recipe.quantity} ${ing.unit} of ${ing.name}`)
      console.log(`      Stock: ${ing.stockQuantity} ${ing.unit} (can make ${servingsAvailable} servings)`)
      if (ing.stockQuantity <= ing.reorderPoint) {
        console.log(`      ⚠️  LOW STOCK - Reorder point: ${ing.reorderPoint}`)
      }
    }
    
    // Calculate max servings
    const maxServings = Math.min(
      ...item.ingredients
        .filter(r => !r.isOptional)
        .map(r => Math.floor(r.ingredient.stockQuantity / r.quantity))
    )
    console.log(`  ✅ Can make: ${maxServings} servings`)
  }

  // Check ingredients status
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { stockQuantity: 'asc' }
  })

  console.log('\n=== INGREDIENT STOCK STATUS ===')
  const outOfStock = ingredients.filter(i => i.stockQuantity === 0)
  const lowStock = ingredients.filter(i => i.stockQuantity > 0 && i.stockQuantity <= i.reorderPoint)
  const inStock = ingredients.filter(i => i.stockQuantity > i.reorderPoint)

  console.log(`\nOut of Stock (${outOfStock.length}):`)
  outOfStock.forEach(i => console.log(`  - ${i.name}`))

  console.log(`\nLow Stock (${lowStock.length}):`)
  lowStock.forEach(i => console.log(`  - ${i.name}: ${i.stockQuantity} ${i.unit} (reorder at ${i.reorderPoint})`))

  console.log(`\nIn Stock (${inStock.length}):`)
  inStock.forEach(i => console.log(`  - ${i.name}: ${i.stockQuantity} ${i.unit}`))

  // Calculate total inventory value
  const totalValue = ingredients.reduce((sum, ing) => {
    return sum + (ing.stockQuantity * ing.costPerUnit)
  }, 0)
  console.log(`\n💰 Total Inventory Value: ¥${(totalValue / 100).toLocaleString('ja-JP')}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())