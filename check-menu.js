const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMenu() {
  const items = await prisma.menuItem.findMany({
    include: { category: true },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { sortOrder: 'asc' }
    ]
  })
  
  console.log('Current menu items in database:')
  console.log('================================')
  
  let currentCategory = ''
  for (const item of items) {
    if (item.category && item.category.name !== currentCategory) {
      currentCategory = item.category.name
      console.log(`\n${currentCategory}:`)
    }
    const price = Math.floor(item.customerPrice/100)
    console.log(`  - ${item.name} - ¥${price} - ${item.quantity || 'N/A'}`)
    if (item.nameJa) {
      console.log(`    (${item.nameJa})`)
    }
  }
  
  console.log(`\nTotal items: ${items.length}`)
  await prisma.$disconnect()
}

checkMenu().catch(console.error)