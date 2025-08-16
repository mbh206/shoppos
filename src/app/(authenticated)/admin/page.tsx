import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600 mt-2">System configuration and management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Square Integration</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                Not Configured
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Printer</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                Not Setup
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Webhook Endpoint</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                Not Configured
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Terminal Device</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                Not Connected
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Square Terminal Integration
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Catalog Sync
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Rental Management
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Event Ticketing
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Customer Loyalty
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Offline Mode
            </li>
          </ul>
        </div>

        {/* Configuration Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>
          <div className="space-y-3">
            <a
              href="/admin/floor-layout"
              className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
            >
              Manage Floor Layout
            </a>
            <a
              href="/admin/menu"
              className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
            >
              Manage Menu Items
            </a>
            <button 
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Configure Square Integration
            </button>
            <button 
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Setup Printer Connection
            </button>
            <button 
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Configure Webhooks
            </button>
            <button 
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Connect Terminal Device
            </button>
          </div>
        </div>

        {/* Inventory Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Management</h2>
          <div className="space-y-3">
            <a
              href="/admin/inventory/ingredients"
              className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
            >
              Manage Ingredients
            </a>
            <a
              href="/admin/inventory/recipes"
              className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
            >
              Recipe & COGS Analysis
            </a>
            <a
              href="/admin/inventory/stock"
              className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
            >
              Stock Movements
            </a>
            <a
              href="/admin/inventory/purchase-orders"
              className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
            >
              Purchase Orders
            </a>
            <a
              href="/admin/inventory/reports"
              className="block w-full px-4 py-2 bg-purple-500 text-white text-center rounded hover:bg-purple-600"
            >
              Inventory Reports
            </a>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
          <div className="space-y-3">
            <button 
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Sync Catalog (Coming Soon)
            </button>
            <button 
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Export Reports (Coming Soon)
            </button>
            <button 
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Backup Database (Coming Soon)
            </button>
            <button 
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Print Daily Report (Coming Soon)
            </button>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-3">
              Current user: {session.user.email} (Admin)
            </div>
            <button 
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Manage Users (Coming Soon)
            </button>
            <button 
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              View Activity Logs (Coming Soon)
            </button>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Mode:</span>
              <span className="font-mono">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Square Mode:</span>
              <span className="font-mono">{process.env.SQUARE_ENVIRONMENT || 'sandbox'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Timezone:</span>
              <span className="font-mono">Asia/Tokyo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Currency:</span>
              <span className="font-mono">JPY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Configure Square API credentials in environment variables</li>
          <li>Set up webhook endpoint for Square events</li>
          <li>Connect Square Terminal device for card payments</li>
          <li>Configure printer for receipt printing</li>
          <li>Run initial catalog sync from Square</li>
        </ol>
      </div>
    </div>
  )
}