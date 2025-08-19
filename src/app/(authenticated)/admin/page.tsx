import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RetailModeToggle from '@/components/RetailModeToggle'
import { prisma } from '@/lib/prisma'

export default async function AdminDashboard() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Check if user has admin access
  if (session.user.role !== 'admin') {
    redirect('/employee')
  }

  // Get stats for dashboard
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const [employeeCount, activeOrders, paidOrdersToday, lowStockItems] = await Promise.all([
    prisma.user.count(),
    prisma.order.count({ where: { status: 'open' } }),
    prisma.order.findMany({
      where: {
        status: 'paid',
        closedAt: {
          gte: today
        }
      },
      include: {
        items: true
      }
    }),
    prisma.ingredient.count({
      where: {
        stockQuantity: {
          lte: 10
        }
      }
    })
  ])
  
  const todaysSales = paidOrdersToday.reduce((sum, order) => {
    const orderTotal = order.items.reduce((itemSum: number, item: any) => itemSum + item.totalMinor, 0)
    return sum + orderTotal
  }, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">System Overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active Employees</div>
          <div className="text-2xl font-bold">{employeeCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Today's Sales</div>
          <div className="text-2xl font-bold">¥{(todaysSales / 100).toFixed(0)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active Orders</div>
          <div className="text-2xl font-bold">{activeOrders}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Low Stock Items</div>
          <div className="text-2xl font-bold text-red-600">{lowStockItems}</div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/employees"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Employee Management</h2>
          <p className="text-gray-600">Manage staff accounts, roles, and permissions</p>
        </Link>

        <Link
          href="/admin/inventory"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Inventory Management</h2>
          <p className="text-gray-600">Track ingredients, supplies, and retail items</p>
        </Link>

        <Link
          href="/admin/menu"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Menu Management</h2>
          <p className="text-gray-600">Update menu items, recipes, and pricing</p>
        </Link>

        <Link
          href="/admin/floor-layout"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Floor Layout</h2>
          <p className="text-gray-600">Configure table layout and seating arrangements</p>
        </Link>

        <Link
          href="/admin/time-billing"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Time & Billing</h2>
          <p className="text-gray-600">Configure time-based billing and pricing tiers</p>
        </Link>

        <Link
          href="/admin/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Reports & Analytics</h2>
          <p className="text-gray-600">View sales, inventory, and staff reports</p>
        </Link>

        <Link
          href="/games"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Games Library</h2>
          <p className="text-gray-600">Manage board game inventory and rentals</p>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">System Settings</h2>
          <p className="text-gray-600">Configure POS settings and integrations</p>
        </Link>

        <Link
          href="/orders"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Order Management</h2>
          <p className="text-gray-600">View and manage all customer orders</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/floor" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Floor Operations
          </Link>
          <Link href="/admin/employees" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Add Employee
          </Link>
          <Link href="/admin/inventory/ingredients" className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
            Check Inventory
          </Link>
          <Link href="/admin/reports" className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
            Daily Report
          </Link>
        </div>
      </div>

      {/* Retail Mode Toggle */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">System Mode</h2>
        <p className="text-gray-600 mb-4">
          Switch to Retail Mode for a simplified interface ideal for daily operations. 
          This hides administrative functions and focuses on core POS features.
        </p>
        <RetailModeToggle userRole={session.user.role} />
      </div>
    </div>
  )
}