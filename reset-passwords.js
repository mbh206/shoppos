const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPasswords() {
  try {
    // Reset admin password
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { hashedPassword: adminPassword }
    });
    console.log('Reset password for admin@example.com to: admin123');
    
    // Reset manager password
    const managerPassword = await bcrypt.hash('manager123', 10);
    const manager = await prisma.user.update({
      where: { email: 'dude@dude.com' },
      data: { hashedPassword: managerPassword }
    });
    console.log('Reset password for dude@dude.com (manager) to: manager123');
    
    console.log('\nYou can now login with:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Manager: dude@dude.com / manager123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();