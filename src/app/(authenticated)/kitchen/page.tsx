'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type OrderItem = {
  id: string
  name: string
  qty: number
  kind: string
}

type Order = {
  id: string
  status: string
  openedAt: string
  items: OrderItem[]
  seatSessions: Array<{
    seat: {
      number: number
      table: {
        name: string
      }
    }
  }>
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=open')
      const data = await response.json()
      // Filter for food & beverage items only
      const kitchenOrders = data.filter((order: Order) => 
        order.items.some((item: OrderItem) => item.kind === 'fnb')
      )
      setOrders(kitchenOrders)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m ago`
  }

  const getTableInfo = (order: Order) => {
    if (order.seatSessions.length > 0) {
      const session = order.seatSessions[0]
      return `${session.seat.table.name}-${session.seat.number}`
    }
    return `Order #${order.id.slice(-6)}`
  }

  const getFoodItems = (order: Order) => {
    return order.items.filter(item => item.kind === 'fnb')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading kitchen orders...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Kitchen Display</h1>
          <div className="text-sm text-gray-600">
            Auto-refresh: 5 seconds
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-xl text-gray-500">No pending orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => {
              const foodItems = getFoodItems(order)
              const timeElapsed = formatTime(order.openedAt)
              const isUrgent = timeElapsed.includes('h') || parseInt(timeElapsed) > 15

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                    isUrgent ? 'border-red-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-lg">
                        {getTableInfo(order)}
                      </div>
                      <div className={`text-sm ${isUrgent ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                        {timeElapsed}
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded animate-pulse">
                        URGENT
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {foodItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b last:border-b-0"
                      >
                        <span className="font-medium">
                          {item.qty}x {item.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        // In a real implementation, this would mark items as prepared
                        console.log('Mark as prepared:', order.id)
                      }}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium"
                    >
                      Ready
                    </button>
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold mb-2">Status Guide:</h3>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-transparent bg-white"></div>
              <span>Normal (&lt; 15 minutes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-500 bg-white"></div>
              <span>Urgent (&gt; 15 minutes)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}