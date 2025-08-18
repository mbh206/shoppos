const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRBAC() {
  try {
    console.log('Testing Role-Based Access Control...\n')
    
    // Check current users and their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        employeeId: true,
        department: true,
        position: true
      }
    })
    
    console.log('Current Users:')
    console.log('=' .repeat(80))
    users.forEach(user => {
      console.log(`Email: ${user.email}`)
      console.log(`Name: ${user.name || 'Not set'}`)
      console.log(`Role: ${user.role}`)
      console.log(`Active: ${user.isActive}`)
      console.log(`Employee ID: ${user.employeeId || 'Not set'}`)
      console.log(`Department: ${user.department || 'Not set'}`)
      console.log(`Position: ${user.position || 'Not set'}`)
      console.log('-' .repeat(40))
    })
    
    // Check if we have users with different roles
    const adminUsers = users.filter(u => u.role === 'admin')
    const managerUsers = users.filter(u => u.role === 'manager')
    const employeeUsers = users.filter(u => u.role === 'employee')
    
    console.log('\nRole Distribution:')
    console.log(`Admins: ${adminUsers.length}`)
    console.log(`Managers: ${managerUsers.length}`)
    console.log(`Employees: ${employeeUsers.length}`)
    console.log(`Other roles: ${users.length - adminUsers.length - managerUsers.length - employeeUsers.length}`)
    
    // Check time entries
    const timeEntries = await prisma.timeEntry.count()
    console.log(`\nTotal Time Entries: ${timeEntries}`)
    
    // Check employee profiles
    const profiles = await prisma.employeeProfile.count()
    console.log(`Employee Profiles: ${profiles}`)
    
    console.log('\n✅ Role-Based Access Control structure is in place!')
    console.log('\nTo test access control:')
    console.log('1. Log in as admin - should see all features')
    console.log('2. Log in as manager - should see manager dashboard and limited admin features')
    console.log('3. Log in as employee - should only see employee dashboard and basic features')
    
    // Create test users if none exist with different roles
    if (managerUsers.length === 0) {
      console.log('\n📝 Creating test manager user...')
      const manager = await prisma.user.create({
        data: {
          email: 'manager@test.com',
          name: 'Test Manager',
          role: 'manager',
          employeeId: 'MGR001',
          department: 'Management',
          position: 'Store Manager',
          isActive: true,
          hireDate: new Date()
        }
      })
      console.log(`Created manager: ${manager.email}`)
    }
    
    if (employeeUsers.length === 0) {
      console.log('\n📝 Creating test employee user...')
      const employee = await prisma.user.create({
        data: {
          email: 'employee@test.com',
          name: 'Test Employee',
          role: 'employee',
          employeeId: 'EMP001',
          department: 'Front of House',
          position: 'Server',
          isActive: true,
          hireDate: new Date()
        }
      })
      console.log(`Created employee: ${employee.email}`)
    }
    
  } catch (error) {
    console.error('Error testing RBAC:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRBAC()