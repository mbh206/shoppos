'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

type OrderItem = {
  id: string
  name: string
  qty: number
  unitPriceMinor: number
  taxMinor: number
  totalMinor: number
  kind: string
  meta?: any
}

type SeatSession = {
  id: string
  startedAt: string
  endedAt?: string | null
  billedMinutes: number
  seat: {
    number: number
    table: {
      name: string
    }
  }
  customer?: {
    displayName?: string | null
  } | null
}

type Order = {
  id: string
  channel: string
  status: string
  customer?: {
    id: string
    displayName?: string | null
    email?: string | null
    phone?: string | null
  } | null
  items: OrderItem[]
  seatSessions: SeatSession[]
  openedAt: string
  closedAt?: string | null
}

// Sample catalog items for quick add
const QUICK_ITEMS = [
  { name: 'Coffee', price: 400, kind: 'fnb' },
  { name: 'Latte', price: 500, kind: 'fnb' },
  { name: 'Cappuccino', price: 500, kind: 'fnb' },
  { name: 'Tea', price: 350, kind: 'fnb' },
  { name: 'Sandwich', price: 800, kind: 'fnb' },
  { name: 'Cake', price: 600, kind: 'fnb' },
  { name: 'Pasta', price: 1200, kind: 'fnb' },
  { name: 'Salad', price: 900, kind: 'fnb' },
]

export default function OrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [customItem, setCustomItem] = useState({
    name: '',
    price: '',
    qty: 1,
  })
  const router = useRouter()

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      const data = await response.json()
      setOrder(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching order:', error)
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const getOrderTotal = () => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + item.totalMinor, 0)
  }

  const handleAddItem = async (name: string, unitPrice: number, qty: number = 1, kind: string = 'fnb') => {
    try {
      const unitPriceMinor = unitPrice * 100

      const response = await fetch(`/api/orders/${resolvedParams.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name,
          qty,
          unitPriceMinor,
          taxMinor: 0, // Tax included in price
        }),
      })

      if (response.ok) {
        fetchOrder()
      }
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })

      if (response.ok) {
        fetchOrder()
      }
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const handleAddCustomItem = () => {
    if (customItem.name && customItem.price) {
      handleAddItem(
        customItem.name,
        parseFloat(customItem.price),
        customItem.qty,
        'retail'
      )
      setCustomItem({ name: '', price: '', qty: 1 })
    }
  }

  const handleCheckout = () => {
    router.push(`/checkout/${resolvedParams.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading order...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Order not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Orders
            </button>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(-6)}</h1>
            <span className={`px-3 py-1 rounded-full text-white text-sm ${
              order.status === 'open' ? 'bg-blue-500' :
              order.status === 'paid' ? 'bg-green-500' :
              order.status === 'canceled' ? 'bg-red-500' :
              'bg-gray-500'
            }`}>
              {order.status}
            </span>
          </div>
          {order.status === 'open' && (
            <button
              onClick={handleCheckout}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Checkout
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            
            {order.seatSessions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <div className="text-sm font-medium text-blue-800">
                  Table: {order.seatSessions[0].seat.table.name} - Seat {order.seatSessions[0].seat.number}
                </div>
              </div>
            )}

            {/* Regular Items */}
            <div className="space-y-2 mb-4">
              {order.items.filter(item => item.kind !== 'seat_time' && !item.meta?.isGame).map((item) => (
                <div key={item.id} className="flex justify-between items-start py-2 border-b">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.qty} × {formatMoney(item.unitPriceMinor)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatMoney(item.totalMinor)}</span>
                    {order.status === 'open' && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Games Played */}
            {order.items.some(item => item.meta?.isGame) && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-purple-700 mb-2">Games Played</h3>
                <div className="space-y-1">
                  {order.items.filter(item => item.meta?.isGame).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm text-purple-600">
                      <span>🎲</span>
                      <span>{item.name.replace('Game: ', '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Charges */}
            {order.items.filter(item => item.kind === 'seat_time').map((item) => (
              <div key={item.id} className="border-t pt-2 mb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    {item.meta && (
                      <>
                        <div className="text-xs text-gray-600 mt-1">
                          Duration: {item.meta.durationMinutes} minutes
                        </div>
                        {item.meta.sessionId && order.seatSessions && (
                          (() => {
                            const session = order.seatSessions.find(s => s.id === item.meta.sessionId)
                            if (session) {
                              const startTime = new Date(session.startedAt)
                              const endTime = session.endedAt ? new Date(session.endedAt) : new Date()
                              return (
                                <>
                                  <div className="text-xs text-gray-600">
                                    Start: {startTime.toLocaleString('ja-JP', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  {session.endedAt && (
                                    <div className="text-xs text-gray-600">
                                      End: {endTime.toLocaleString('ja-JP', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  )}
                                </>
                              )
                            }
                            return null
                          })()
                        )}
                      </>
                    )}
                  </div>
                  <span className="font-medium">{formatMoney(item.totalMinor)}</span>
                </div>
              </div>
            ))}

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatMoney(getOrderTotal())}</span>
              </div>
            </div>
          </div>

          {/* Quick Add Items */}
          {order.status === 'open' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Add Items</h2>
              
              {/* Quick Add Buttons */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Add</h3>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ITEMS.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleAddItem(item.name, item.price, 1, item.kind)}
                      className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      {item.name} ({formatMoney(item.price * 100)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Item */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Item</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={customItem.name}
                    onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Price (¥)"
                      value={customItem.price}
                      onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={customItem.qty}
                      onChange={(e) => setCustomItem({ ...customItem, qty: parseInt(e.target.value) || 1 })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddCustomItem}
                      disabled={!customItem.name || !customItem.price}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}