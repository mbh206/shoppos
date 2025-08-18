const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log('Current users in database:');
    users.forEach(u => {
      console.log(`- ${u.email} (${u.name}) - Role: ${u.role}`);
    });
    
    console.log('\nTotal users:', users.length);
    
    // Check for admin/manager users specifically
    const adminUsers = users.filter(u => u.role === 'admin');
    const managerUsers = users.filter(u => u.role === 'manager');
    
    console.log('\nAdmin users:', adminUsers.length);
    console.log('Manager users:', managerUsers.length);
    
    if (adminUsers.length === 0) {
      console.log('\nNo admin users found! Creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@koma.com',
          name: 'Admin',
          role: 'admin',
          hashedPassword: hashedPassword
        }
      });
      console.log('Created admin user:', admin.email);
    }
    
    if (managerUsers.length === 0) {
      console.log('\nNo manager users found! Creating default manager...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('manager123', 10);
      
      const manager = await prisma.user.create({
        data: {
          email: 'manager@koma.com',
          name: 'Manager',
          role: 'manager',
          hashedPassword: hashedPassword
        }
      });
      console.log('Created manager user:', manager.email);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();