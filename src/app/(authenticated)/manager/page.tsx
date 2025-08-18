import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/rbac'
import Link from 'next/link'
import TimeClockWidget from '@/components/TimeClockWidget'
import RetailModeToggle from '@/components/RetailModeToggle'
import { prisma } from '@/lib/prisma'

export default async function ManagerDashboard() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  // Check if user has manager access
  if (!hasRole(session.user.role, 'manager')) {
    redirect('/employee')
  }

  // Get stats for dashboard
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const [employeeCount, activeOrders, paidOrdersToday] = await Promise.all([
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
    })
  ])
  
  const todaysSales = paidOrdersToday.reduce((sum, order) => {
    const orderTotal = order.items.reduce((itemSum: number, item: any) => itemSum + item.totalMinor, 0)
    return sum + orderTotal
  }, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">Operations Overview</p>
      </div>

      {/* Time Clock Widget */}
      <div className="mb-6">
        <TimeClockWidget userName={session.user.name} userEmail={session.user.email} />
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Staff On Duty</div>
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
          <div className="text-sm text-gray-600">Labor Cost</div>
          <div className="text-2xl font-bold">¥0</div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/floor"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Floor Operations</h2>
          <p className="text-gray-600">Manage tables and customer seating</p>
        </Link>

        <Link
          href="/admin/inventory"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Inventory</h2>
          <p className="text-gray-600">Track stock levels and supplies</p>
        </Link>

        <Link
          href="/manager/staff"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Staff Management</h2>
          <p className="text-gray-600">View schedules and time records</p>
        </Link>

        <Link
          href="/manager/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Reports</h2>
          <p className="text-gray-600">Sales, labor, and inventory reports</p>
        </Link>

        <Link
          href="/orders"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Orders</h2>
          <p className="text-gray-600">View and manage all orders</p>
        </Link>

        <Link
          href="/admin/menu"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Menu Management</h2>
          <p className="text-gray-600">Update menu items and pricing</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            View Daily Report
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Check Inventory
          </button>
          <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
            Staff Schedule
          </button>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
            Low Stock Alert
          </button>
        </div>
      </div>

      {/* Staff Currently Working */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Staff On Duty</h2>
        <div className="text-gray-500">No staff currently clocked in</div>
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