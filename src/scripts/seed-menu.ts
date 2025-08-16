import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding menu data...')

  // Create categories
  const categories = await Promise.all([
    prisma.menuCategory.create({
      data: {
        name: 'Sets',
        nameJa: 'セット',
        sortOrder: 1,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Beverages',
        nameJa: 'ドリンク',
        sortOrder: 2,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Snacks',
        nameJa: 'スナック',
        sortOrder: 3,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Food',
        nameJa: 'フード',
        sortOrder: 4,
      },
    }),
  ])

  const [setsCategory, beveragesCategory, snacksCategory, foodCategory] = categories

  // Create menu items
  const menuItems = [
    // Sets
    {
      categoryId: setsCategory.id,
      name: 'Lunch Set (Main Item, Side, Soda)',
      nameJa: 'ランチセット（メイン、サイド、ドリンク込）',
      customerPrice: 130000, // ¥1300 in minor units
      quantity: '1 set',
      sortOrder: 1,
    },
    // Beverages
    {
      categoryId: beveragesCategory.id,
      name: 'Fountain Drinks',
      nameJa: 'ドリンクバー（ファウンテン）',
      customerPrice: 30000, // ¥300
      quantity: '500ml',
      sortOrder: 1,
    },
    {
      categoryId: beveragesCategory.id,
      name: 'Energy drink',
      nameJa: 'エナジードリンク',
      customerPrice: 45000, // ¥450
      quantity: '300ml',
      sortOrder: 2,
    },
    {
      categoryId: beveragesCategory.id,
      name: 'Drip Coffee',
      nameJa: 'コーヒー',
      customerPrice: 30000, // ¥300
      quantity: '300ml',
      sortOrder: 3,
    },
    {
      categoryId: beveragesCategory.id,
      name: 'Latte',
      nameJa: 'ラテ',
      customerPrice: 55000, // ¥550
      quantity: '300ml',
      sortOrder: 4,
    },
    {
      categoryId: beveragesCategory.id,
      name: 'Beer',
      nameJa: 'ビール',
      customerPrice: 60000, // ¥600
      quantity: '350ml',
      sortOrder: 5,
    },
    {
      categoryId: beveragesCategory.id,
      name: 'Wine',
      nameJa: 'ワイン',
      customerPrice: 70000, // ¥700
      quantity: '300ml',
      sortOrder: 6,
    },
    // Snacks
    {
      categoryId: snacksCategory.id,
      name: 'Fresh popcorn (bag)',
      nameJa: 'フレッシュポップコーン（袋）',
      customerPrice: 30000, // ¥300
      quantity: '50g bag',
      sortOrder: 1,
    },
    {
      categoryId: snacksCategory.id,
      name: 'Baby Star Ramen',
      nameJa: 'ベビースターラーメン',
      customerPrice: 20000, // ¥200
      quantity: '21g bag',
      sortOrder: 2,
    },
    {
      categoryId: snacksCategory.id,
      name: 'Kakinotane',
      nameJa: '柿の種',
      customerPrice: 30000, // ¥300
      quantity: '63g bag',
      sortOrder: 3,
    },
    // Food
    {
      categoryId: foodCategory.id,
      name: 'Muffin',
      nameJa: 'マフィン',
      customerPrice: 50000, // ¥500
      quantity: '1 piece',
      sortOrder: 1,
    },
    {
      categoryId: foodCategory.id,
      name: 'Mini Pizzas',
      nameJa: 'ミニピザ',
      customerPrice: 30000, // ¥300
      quantity: '2 pizzas',
      sortOrder: 2,
    },
    {
      categoryId: foodCategory.id,
      name: 'Pizza Sandwich',
      nameJa: 'ピザサンド',
      customerPrice: 60000, // ¥600
      quantity: '1 sandwich',
      sortOrder: 3,
    },
    {
      categoryId: foodCategory.id,
      name: 'Hot dog',
      nameJa: 'ホットドッグ',
      customerPrice: 40000, // ¥400
      quantity: '1 brat & bun',
      sortOrder: 4,
    },
    {
      categoryId: foodCategory.id,
      name: 'Panini',
      nameJa: 'パニーニ',
      customerPrice: 80000, // ¥800
      quantity: '1 ham or veggie',
      sortOrder: 5,
    },
    {
      categoryId: foodCategory.id,
      name: 'Peanut Butter & Jam Sandwich',
      nameJa: 'ピーナッツバタージャムサンド',
      customerPrice: 60000, // ¥600
      quantity: '1 sandwich',
      sortOrder: 6,
    },
  ]

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: item,
    })
  }

  console.log('Menu seeded successfully!')
  console.log(`Created ${categories.length} categories and ${menuItems.length} menu items`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })