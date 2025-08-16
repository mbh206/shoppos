'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type OrderItem = {
  id: string
  name: string
  qty: number
  unitPriceMinor: number
  totalMinor: number
  kind: string
}

type Order = {
  id: string
  channel: string
  status: string
  customer?: {
    displayName?: string | null
  } | null
  items: OrderItem[]
  openedAt: string
  seatSessions: Array<{
    seat: {
      number: number
      table: {
        name: string
      }
    }
  }>
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const initialFilter = (searchParams.get('filter') || 'open') as 'all' | 'open' | 'paid'
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>(initialFilter)
  const router = useRouter()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [filter])

  const fetchOrders = async () => {
    try {
      const params = filter === 'all' ? '' : `?status=${filter}`
      const response = await fetch(`/api/orders${params}`)
      const data = await response.json()
      setOrders(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getOrderTotal = (order: Order) => {
    return order.items.reduce((sum, item) => sum + item.totalMinor, 0)
  }

  const getTableInfo = (order: Order) => {
    if (order.seatSessions.length > 0) {
      const session = order.seatSessions[0]
      return `${session.seat.table.name}-${session.seat.number}`
    }
    return null
  }

  const handleCreateOrder = async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'in_store' }),
      })
      const order = await response.json()
      router.push(`/orders/${order.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Orders</h1>
          <div className="flex gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded ${
                  filter === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-4 py-2 rounded ${
                  filter === 'open' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setFilter('paid')}
                className={`px-4 py-2 rounded ${
                  filter === 'paid' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-300'
                }`}
              >
                Paid
              </button>
            </div>
            <button
              onClick={handleCreateOrder}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + New Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const tableInfo = getTableInfo(order)
            const total = getOrderTotal(order)

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-lg">
                      {tableInfo || `Order #${order.id.slice(-6)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(order.openedAt)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs text-white ${
                    order.status === 'open' ? 'bg-blue-500' :
                    order.status === 'paid' ? 'bg-green-500' :
                    order.status === 'canceled' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {order.customer && (
                  <div className="text-sm text-gray-600 mb-2">
                    {order.customer.displayName || 'Guest'}
                  </div>
                )}

                <div className="space-y-1 mb-3">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-sm flex justify-between">
                      <span className="truncate flex-1">
                        {item.qty}x {item.name}
                      </span>
                      <span className="ml-2">{formatMoney(item.totalMinor)}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{order.items.length - 3} more items
                    </div>
                  )}
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No {filter !== 'all' ? filter : ''} orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}