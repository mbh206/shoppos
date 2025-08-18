import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetMonthlySales() {
  console.log('Resetting monthly sales counters...')
  
  try {
    // Get current sales data for reporting
    const currentSales = await prisma.menuItem.findMany({
      where: {
        monthlySales: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        monthlySales: true,
        customerPrice: true
      },
      orderBy: { monthlySales: 'desc' }
    })

    if (currentSales.length > 0) {
      console.log('\nCurrent month sales summary:')
      console.log('================================')
      let totalRevenue = 0
      currentSales.forEach(item => {
        const revenue = (item.customerPrice * item.monthlySales) / 100
        totalRevenue += revenue
        console.log(`${item.name}: ${item.monthlySales} units (¥${revenue.toFixed(0)})`)
      })
      console.log('================================')
      console.log(`Total Revenue: ¥${totalRevenue.toFixed(0)}`)
      console.log('')
    }

    // Reset all monthly sales to 0
    const result = await prisma.menuItem.updateMany({
      data: {
        monthlySales: 0
      }
    })

    console.log(`Reset ${result.count} menu items' monthly sales to 0`)
  } catch (error) {
    console.error('Error resetting monthly sales:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  resetMonthlySales()
}

export default resetMonthlySales