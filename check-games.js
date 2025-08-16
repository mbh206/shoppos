const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const gameCount = await prisma.game.count()
  console.log(`Total games in database: ${gameCount}`)
  
  const availableGames = await prisma.game.count({ where: { available: true } })
  console.log(`Available games: ${availableGames}`)
  
  const assignedGames = await prisma.tableGameSession.count({ where: { endedAt: null } })
  console.log(`Currently assigned games: ${assignedGames}`)
  
  // Show first 5 games
  const games = await prisma.game.findMany({ take: 5 })
  console.log('\nFirst 5 games:')
  games.forEach(game => {
    console.log(`- ${game.name} (${game.location}) - Available: ${game.available}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())