const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const activeSessions = await prisma.tableGameSession.findMany({
    where: { endedAt: null },
    include: {
      game: true,
      table: true
    }
  })
  
  console.log(`Active game sessions: ${activeSessions.length}\n`)
  
  activeSessions.forEach(session => {
    console.log(`Table: ${session.table.name}`)
    console.log(`Game: ${session.game.name}`)
    console.log(`Started: ${session.startedAt}`)
    console.log('---')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())