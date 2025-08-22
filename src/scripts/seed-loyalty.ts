import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Setting up loyalty system...')

  // Create default points settings
  const pointsSettings = await prisma.pointsSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      regularEarnRate: 50,  // Earn 1 point per ¥50 spent
      memberEarnRate: 40,   // Members earn 1 point per ¥40 spent
      pointsPerYen: 1,      // 1 point = ¥1 redemption value
    }
  })

  console.log('✅ Points settings created:', {
    regularRate: `1 point per ¥${pointsSettings.regularEarnRate}`,
    memberRate: `1 point per ¥${pointsSettings.memberEarnRate}`,
    value: `1 point = ¥${pointsSettings.pointsPerYen}`
  })

  // Create monthly pass membership plan
  const monthlyPass = await prisma.membershipPlan.upsert({
    where: { name: 'Monthly Pass' },
    update: {},
    create: {
      name: 'Monthly Pass',
      nameJa: '月額パス',
      description: '20 hours of table time per month with discounted overage rates',
      descriptionJa: '月20時間のテーブル利用時間、超過料金割引付き',
      price: 800000,  // ¥8,000 in minor units
      hoursIncluded: 20,
      overageRate: 30000,  // ¥300/hour in minor units
      pointsOnPurchase: 200,  // 200 bonus points when purchasing
      earnRateDenominator: 40,  // Members earn at 1 point per ¥40
      isActive: true
    }
  })

  console.log('✅ Monthly Pass created:', {
    name: monthlyPass.name,
    price: `¥${monthlyPass.price / 100}`,
    hours: monthlyPass.hoursIncluded,
    overageRate: `¥${monthlyPass.overageRate / 100}/hour`,
    bonusPoints: monthlyPass.pointsOnPurchase
  })

  // Give some test customers initial points (optional)
  const customers = await prisma.customer.findMany({ take: 3 })
  
  for (const customer of customers) {
    const points = Math.floor(Math.random() * 500) + 100  // Random 100-600 points
    
    await prisma.customer.update({
      where: { id: customer.id },
      data: { pointsBalance: points }
    })

    await prisma.pointsTransaction.create({
      data: {
        customerId: customer.id,
        type: 'BONUS',
        amount: points,
        balanceAfter: points,
        description: 'Initial loyalty program bonus'
      }
    })

    console.log(`  - ${customer.displayName || customer.email}: ${points} points`)
  }

  console.log('\n🎉 Loyalty system setup complete!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })