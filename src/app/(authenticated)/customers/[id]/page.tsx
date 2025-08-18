'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  phone?: string | null
  createdAt: string
  seatSessions: any[]
  orders: any[]
  eventTickets: any[]
  _count: {
    seatSessions: number
    orders: number
    eventTickets: number
  }
  stats: {
    totalSpent: number
    gamesPlayed: string[]
  }
}

export default function CustomerProfilePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'visits' | 'orders' | 'games'>('visits')
  const router = useRouter()

  useEffect(() => {
    fetchCustomer()
  }, [])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data)
      } else {
        router.push('/customers')
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100).toLocaleString('ja-JP')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading customer profile...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Customer not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/customers')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Customers
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {customer.displayName || 'Guest Customer'}
                </h1>
                {customer.firstName && (
                  <p className="text-lg text-gray-600">
                    {customer.firstName} {customer.lastName}
                  </p>
                )}
                <p className="text-gray-600">{customer.email}</p>
                {customer.phone && (
                  <p className="text-gray-600">{customer.phone}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Member since {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">Total Visits</div>
                <div className="text-2xl font-bold text-blue-900">
                  {customer._count.seatSessions}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-green-900">
                  {customer._count.orders}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-sm text-yellow-600 mb-1">Total Spent</div>
                <div className="text-2xl font-bold text-yellow-900">
                  {formatMoney(customer.stats.totalSpent)}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">Games Played</div>
                <div className="text-2xl font-bold text-purple-900">
                  {customer.stats.gamesPlayed.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('visits')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'visits'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Visit History
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'orders'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Order History
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'games'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Games Played
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'visits' && (
              <div className="space-y-4">
                {customer.seatSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">
                          Table {session.seat.table.name} - Seat {session.seat.number}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(session.startedAt)}
                        </div>
                        {session.billedMinutes > 0 && (
                          <div className="text-sm text-gray-600">
                            Duration: {formatDuration(session.billedMinutes)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatMoney(
                            session.order.items.reduce((sum: number, item: any) => sum + item.totalMinor, 0)
                          )}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                          session.order.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : session.order.status === 'open'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.order.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                {customer.orders.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">Order #{order.id.slice(-6)}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(order.openedAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatMoney(
                            order.items.reduce((sum: number, item: any) => sum + item.totalMinor, 0)
                          )}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                          order.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'open'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items
                        .filter((item: any) => !item.meta?.isGame)
                        .slice(0, 3)
                        .map((item: any) => item.name)
                        .join(', ')}
                      {order.items.filter((item: any) => !item.meta?.isGame).length > 3 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'games' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {customer.stats.gamesPlayed.map((game) => (
                  <div key={game} className="bg-purple-50 rounded-lg p-4">
                    <div className="text-purple-900 font-medium flex items-center gap-2">
                      <span>🎲</span>
                      <span>{game}</span>
                    </div>
                  </div>
                ))}
                {customer.stats.gamesPlayed.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    No games played yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}