const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showJapaneseDescriptions() {
  try {
    // Get a sample of games with their Japanese descriptions
    const games = await prisma.game.findMany({
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameJa: true,
        descriptionJa: true,
        complexityJa: true,
        minPlayers: true,
        maxPlayers: true,
        duration: true,
        complexity: true
      }
    });
    
    console.log('Sample of games with Japanese descriptions in the database:\n');
    console.log('='.repeat(80));
    
    games.forEach((game, index) => {
      console.log(`\nGame #${index + 1}:`);
      console.log('  English Name:', game.name);
      console.log('  Japanese Name (nameJa):', game.nameJa || '[NOT SET]');
      console.log('  Japanese Complexity (complexityJa):', game.complexityJa || '[NOT SET]');
      console.log('  Japanese Description (descriptionJa):', game.descriptionJa || '[NOT SET]');
      console.log('-'.repeat(80));
    });
    
    // Also count how many games have Japanese descriptions
    const totalGames = await prisma.game.count();
    const gamesWithJaNames = await prisma.game.count({
      where: { NOT: { nameJa: null } }
    });
    const gamesWithJaDescriptions = await prisma.game.count({
      where: { NOT: { descriptionJa: null } }
    });
    
    console.log('\nDatabase Statistics:');
    console.log(`Total games: ${totalGames}`);
    console.log(`Games with Japanese names (nameJa): ${gamesWithJaNames}`);
    console.log(`Games with Japanese descriptions (descriptionJa): ${gamesWithJaDescriptions}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showJapaneseDescriptions();