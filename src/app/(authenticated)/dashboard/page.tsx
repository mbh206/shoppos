import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [tables, orders, openOrders] = await Promise.all([
    prisma.table.count(),
    prisma.order.count({
      where: {
        openedAt: {
          gte: today,
        },
      },
    }),
    prisma.order.count({
      where: {
        status: 'open',
      },
    }),
  ])

  // Get today's paid orders with items to calculate revenue
  const paidOrdersToday = await prisma.order.findMany({
    where: {
      status: 'paid',
      closedAt: {
        gte: today,
      },
    },
    include: {
      items: true,
    },
  })

  // Calculate total revenue from paid orders
  const todayRevenue = paidOrdersToday.reduce((total, order) => {
    const orderTotal = order.items.reduce((sum, item) => sum + item.totalMinor, 0)
    return total + orderTotal
  }, 0)

  const occupiedSeats = await prisma.seat.count({
    where: {
      status: 'occupied',
    },
  })

  const totalSeats = await prisma.seat.count()

  return {
    tables,
    todayOrders: orders,
    openOrders,
    todayRevenue,
    occupiedSeats,
    totalSeats,
  }
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const stats = await getDashboardStats()

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-100 rounded-lg shadow p-4 ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Open Orders</p>
              <p className="text-xl font-semibold text-gray-900">{stats.openOrders}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-green-100 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Seats Occupied</p>
              <p className="text-xl font-semibold text-gray-900">
                {stats.occupiedSeats}/{stats.totalSeats}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-purple-100 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Today's Orders</p>
              <p className="text-xl font-semibold text-gray-900">{stats.todayOrders}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-yellow-100 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Today's Revenue</p>
              <p className="text-xl font-semibold text-gray-900">{formatMoney(stats.todayRevenue)}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-full">
              <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Floor Map */}
        {['admin', 'host', 'server'].includes(session.user.role) && (
          <Link href="/floor" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Floor Map</h2>
              <p className="text-gray-600">Manage tables, seats, and timers</p>
            </div>
          </Link>
        )}

        {/* Orders */}
        {['admin', 'host', 'server'].includes(session.user.role) && (
          <Link href="/orders" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Orders</h2>
              <p className="text-gray-600">View and manage all orders</p>
            </div>
          </Link>
        )}

        {/* Kitchen Display */}
        {session.user.role === 'kitchen' && (
          <Link href="/kitchen" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Kitchen Display</h2>
              <p className="text-gray-600">View and manage kitchen orders</p>
            </div>
          </Link>
        )}

        {/* Rentals - Coming Soon */}
        <div className="block">
          <div className="bg-white rounded-lg shadow-md p-6 opacity-75">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Rentals</h2>
            <p className="text-gray-600">Manage rentals (Coming Soon)</p>
          </div>
        </div>
        
        {/* Game List */}
        <Link href="/games" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Game Library</h2>
            <p className="text-gray-600">Manage board games and assignments</p>
          </div>
        </Link>

        {/* Events - Coming Soon */}
        <div className="block">
          <div className="bg-white rounded-lg shadow-md p-6 opacity-75">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Events</h2>
            <p className="text-gray-600">Event management (Coming Soon)</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {/* <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          {['admin', 'host', 'server'].includes(session.user.role) && (
            <>
              <Link 
                href="/orders" 
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                View Orders
              </Link>
              <Link 
                href="/floor" 
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Floor Map
              </Link>
            </>
          )}
          
          {session.user.role === 'kitchen' && (
            <Link 
              href="/kitchen" 
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Kitchen Display
            </Link>
          )}
          
          {session.user.role === 'admin' && (
            <Link 
              href="/admin" 
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
            >
              Admin Settings
            </Link>
          )}
        </div>
      </div> */}

      {/* Role-specific content */}
      {session.user.role === 'kitchen' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kitchen Status</h3>
          <p className="text-gray-600">
            {stats.openOrders > 0 
              ? `You have ${stats.openOrders} orders pending in the kitchen.`
              : 'No pending orders in the kitchen.'}
          </p>
        </div>
      )}

      {['host', 'server'].includes(session.user.role) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Orders:</span>
              <span className="font-medium">{stats.openOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tables Occupied:</span>
              <span className="font-medium">{Math.floor((stats.occupiedSeats / stats.totalSeats) * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}