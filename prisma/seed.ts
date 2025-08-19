import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean up existing data
  await prisma.orderEvent.deleteMany()
  await prisma.paymentAttempt.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.seatSession.deleteMany()
  await prisma.eventTicket.deleteMany()
  await prisma.event.deleteMany()
  await prisma.rental.deleteMany()
  await prisma.inventoryReservation.deleteMany()
  await prisma.order.deleteMany()
  await prisma.seat.deleteMany()
  await prisma.table.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      hashedPassword: adminPassword,
    },
  })

  // Create tables with seats
  const tables = [
    { name: 'T1', capacity: 4, posX: 100, posY: 100 },
    { name: 'T2', capacity: 4, posX: 250, posY: 100 },
    { name: 'T3', capacity: 2, posX: 400, posY: 100 },
    { name: 'T4', capacity: 6, posX: 100, posY: 250 },
    { name: 'Booth A', capacity: 4, posX: 250, posY: 250 },
    { name: 'Booth B', capacity: 4, posX: 400, posY: 250 },
    { name: 'Bar 1', capacity: 1, posX: 100, posY: 400 },
    { name: 'Bar 2', capacity: 1, posX: 200, posY: 400 },
    { name: 'Bar 3', capacity: 1, posX: 300, posY: 400 },
  ]

  for (const tableData of tables) {
    const table = await prisma.table.create({
      data: {
        name: tableData.name,
        capacity: tableData.capacity,
        posX: tableData.posX,
        posY: tableData.posY,
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

  // Create sample customers
  const customers = [
    { displayName: 'John Doe', email: 'john@example.com', phone: '090-1234-5678' },
    { displayName: 'Jane Smith', email: 'jane@example.com', phone: '090-8765-4321' },
    { displayName: 'Bob Johnson', email: 'bob@example.com', phone: '080-1111-2222' },
  ]

  for (const customerData of customers) {
    await prisma.customer.create({
      data: customerData,
    })
  }

  console.log('Seed data created successfully!')
  console.log('Users created:')
  console.log('  admin@example.com / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })