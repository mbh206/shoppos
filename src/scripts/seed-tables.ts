import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing tables
  await prisma.seat.deleteMany()
  await prisma.table.deleteMany()

  // Create tables for Floor 1
  const tables = [
    // Bar area - Floor 1
    { name: 'Bar-1', capacity: 1, floor: 1, zone: 'bar', shape: 'bar' as const, posX: 50, posY: 50, width: 60, height: 60 },
    { name: 'Bar-2', capacity: 1, floor: 1, zone: 'bar', shape: 'bar' as const, posX: 120, posY: 50, width: 60, height: 60 },
    { name: 'Bar-3', capacity: 1, floor: 1, zone: 'bar', shape: 'bar' as const, posX: 190, posY: 50, width: 60, height: 60 },
    { name: 'Bar-4', capacity: 1, floor: 1, zone: 'bar', shape: 'bar' as const, posX: 260, posY: 50, width: 60, height: 60 },
    { name: 'Bar-5', capacity: 1, floor: 1, zone: 'bar', shape: 'bar' as const, posX: 330, posY: 50, width: 60, height: 60 },
    { name: 'Bar-6', capacity: 1, floor: 1, zone: 'bar', shape: 'bar' as const, posX: 400, posY: 50, width: 60, height: 60 },
    
    // Regular tables - Floor 1
    { name: 'T-1', capacity: 4, floor: 1, zone: 'main', shape: 'rectangle' as const, posX: 50, posY: 200, width: 100, height: 80 },
    { name: 'T-2', capacity: 4, floor: 1, zone: 'main', shape: 'rectangle' as const, posX: 200, posY: 200, width: 100, height: 80 },
    { name: 'T-3', capacity: 2, floor: 1, zone: 'main', shape: 'rectangle' as const, posX: 350, posY: 200, width: 80, height: 60 },
    
    // Booth area - Floor 1
    { name: 'Booth-1', capacity: 6, floor: 1, zone: 'booth', shape: 'booth' as const, posX: 50, posY: 350, width: 120, height: 100 },
    { name: 'Booth-2', capacity: 6, floor: 1, zone: 'booth', shape: 'booth' as const, posX: 200, posY: 350, width: 120, height: 100 },
    
    // Floor 2 tables
    { name: 'T2-1', capacity: 4, floor: 2, zone: 'main', shape: 'rectangle' as const, posX: 100, posY: 100, width: 100, height: 80 },
    { name: 'T2-2', capacity: 4, floor: 2, zone: 'main', shape: 'rectangle' as const, posX: 250, posY: 100, width: 100, height: 80 },
    { name: 'T2-3', capacity: 8, floor: 2, zone: 'main', shape: 'rectangle' as const, posX: 150, posY: 250, width: 150, height: 100 },
    { name: 'Round-1', capacity: 6, floor: 2, zone: 'main', shape: 'circle' as const, posX: 400, posY: 200, width: 100, height: 100 },
  ]

  for (const tableData of tables) {
    const table = await prisma.table.create({
      data: {
        name: tableData.name,
        capacity: tableData.capacity,
        floor: tableData.floor,
        zone: tableData.zone,
        shape: tableData.shape,
        posX: tableData.posX,
        posY: tableData.posY,
        width: tableData.width,
        height: tableData.height,
        rotation: 0,
        status: 'available',
      },
    })

    // Create seats for each table
    for (let i = 1; i <= tableData.capacity; i++) {
      await prisma.seat.create({
        data: {
          tableId: table.id,
          number: i,
          status: 'open',
        },
      })
    }
  }

  console.log('✅ Seeded tables and seats successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })