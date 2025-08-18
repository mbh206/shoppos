const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Check for all the models we expect
    const tables = [
      'user', 'customer', 'table', 'seat', 'order', 'orderItem',
      'game', 'menuItem', 'ingredient', 'menuCategory', 'supplier',
      'retailItem', 'timeEntry', 'employeeProfile'
    ];
    
    console.log('Checking database tables:\n');
    
    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        console.log(`✅ ${table}: ${count} records`);
      } catch (error) {
        console.log(`❌ ${table}: NOT FOUND or ERROR`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();