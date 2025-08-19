import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupRentableGames() {
  try {
    console.log('Setting up rentable games...')
    
    // Get all games
    const games = await prisma.game.findMany()
    console.log(`Found ${games.length} games`)
    
    // Update all games to be rentable with default pricing
    for (const game of games) {
      // Set retail price based on complexity/type
      let retailPrice = 5000 // Default ¥5000
      
      if (game.complexity === 'expert' || game.complexity === 'hard') {
        retailPrice = 8000 // ¥8000 for complex games
      } else if (game.complexity === 'medium') {
        retailPrice = 6000 // ¥6000 for medium games
      } else {
        retailPrice = 4000 // ¥4000 for simple games
      }
      
      // Mark premium games (expert complexity or specific popular titles)
      const isPremium = game.complexity === 'expert' || 
                       game.name.toLowerCase().includes('gloomhaven') ||
                       game.name.toLowerCase().includes('twilight imperium') ||
                       game.name.toLowerCase().includes('kingdom death')
      
      // Set max rental days (7 for premium, 14 for regular)
      const maxRentalDays = isPremium ? 7 : 14
      
      await prisma.game.update({
        where: { id: game.id },
        data: {
          isRentable: true,
          retailPrice,
          isPremium,
          maxRentalDays
        }
      })
      
      console.log(`✓ ${game.name} - ¥${retailPrice} ${isPremium ? '(Premium)' : ''} - Max ${maxRentalDays} days`)
    }
    
    console.log('\n✅ All games have been set up for rental!')
    
    // Show summary
    const summary = await prisma.game.aggregate({
      _count: { isRentable: true },
      where: { isRentable: true }
    })
    
    const premiumCount = await prisma.game.count({
      where: { isPremium: true }
    })
    
    console.log(`\nSummary:`)
    console.log(`- Total rentable games: ${summary._count.isRentable}`)
    console.log(`- Premium games: ${premiumCount}`)
    console.log(`- Regular games: ${summary._count.isRentable - premiumCount}`)
    
  } catch (error) {
    console.error('Error setting up rentable games:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupRentableGames()