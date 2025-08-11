'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  displayName?: string | null
  email?: string | null
  phone?: string | null
}

type OrderItem = {
  id: string
  name: string
  qty: number
  totalMinor: number
}

type Order = {
  id: string
  status: string
  customer?: Customer | null
  items: OrderItem[]
}

type SeatSession = {
  id: string
  startedAt: string
  endedAt?: string | null
  billedMinutes: number
  customer?: Customer | null
  order: Order
}

type Seat = {
  id: string
  number: number
  status: 'open' | 'occupied' | 'closed'
  seatSessions: SeatSession[]
}

type Table = {
  id: string
  name: string
  capacity: number
  status: 'available' | 'seated' | 'dirty' | 'reserved' | 'offline'
  seats: Seat[]
}

export default function TableDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchTableData()
    const interval = setInterval(fetchTableData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTableData = async () => {
    try {
      const response = await fetch(`/api/tables/${resolvedParams.id}`)
      const data = await response.json()
      setTable(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching table:', error)
      setLoading(false)
    }
  }

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat)
  }

  const handleStartTimer = async (seat: Seat) => {
    try {
      // First create an order for this seat
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'in_store',
          tableId: table?.id,
        }),
      })
      const order = await orderResponse.json()

      // Start the timer
      const response = await fetch(`/api/seats/${seat.id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
        }),
      })

      if (response.ok) {
        fetchTableData()
        setSelectedSeat(null)
      }
    } catch (error) {
      console.error('Error starting timer:', error)
    }
  }

  const handleStopTimer = async (seat: Seat) => {
    try {
      const response = await fetch(`/api/seats/${seat.id}/timer`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        fetchTableData()
        setSelectedSeat(null)
      }
    } catch (error) {
      console.error('Error stopping timer:', error)
    }
  }

  const handleUpdateTableStatus = async (status: Table['status']) => {
    try {
      const response = await fetch(`/api/tables/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchTableData()
      }
    } catch (error) {
      console.error('Error updating table status:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading table...</div>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Table not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/floor')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Floor
            </button>
            <h1 className="text-2xl font-bold">{table.name}</h1>
            <span className={`px-3 py-1 rounded-full text-white text-sm ${
              table.status === 'available' ? 'bg-green-500' :
              table.status === 'seated' ? 'bg-blue-500' :
              table.status === 'dirty' ? 'bg-yellow-500' :
              table.status === 'reserved' ? 'bg-purple-500' :
              'bg-gray-500'
            }`}>
              {table.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdateTableStatus('available')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Available
            </button>
            <button
              onClick={() => handleUpdateTableStatus('dirty')}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Dirty
            </button>
            <button
              onClick={() => handleUpdateTableStatus('offline')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Offline
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {table.seats.map((seat) => {
            const activeSession = seat.seatSessions.find(s => !s.endedAt)
            const isOccupied = seat.status === 'occupied'

            return (
              <div
                key={seat.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                  isOccupied ? 'bg-blue-50 border-blue-300' :
                  seat.status === 'closed' ? 'bg-gray-100 border-gray-300' :
                  'bg-white border-gray-200'
                }`}
                onClick={() => handleSeatClick(seat)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Seat {seat.number}</h3>
                  <span className={`px-2 py-1 rounded text-xs text-white ${
                    isOccupied ? 'bg-blue-500' :
                    seat.status === 'closed' ? 'bg-gray-500' :
                    'bg-green-500'
                  }`}>
                    {seat.status}
                  </span>
                </div>

                {activeSession && (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Timer:</span>{' '}
                      {formatDuration(activeSession.startedAt)}
                    </div>
                    {activeSession.customer && (
                      <div className="text-sm">
                        <span className="font-medium">Customer:</span>{' '}
                        {activeSession.customer.displayName || 'Guest'}
                      </div>
                    )}
                    {activeSession.order.items.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Order Total:</span>{' '}
                        {formatMoney(
                          activeSession.order.items.reduce((sum, item) => sum + item.totalMinor, 0)
                        )}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStopTimer(seat)
                      }}
                      className="w-full px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Stop Timer
                    </button>
                  </div>
                )}

                {!isOccupied && seat.status === 'open' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartTimer(seat)
                    }}
                    className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Start Timer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedSeat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Seat {selectedSeat.number} Details
            </h2>
            
            {selectedSeat.seatSessions.find(s => !s.endedAt) && (
              <div className="space-y-2 mb-4">
                <div>
                  <span className="font-medium">Status:</span> {selectedSeat.status}
                </div>
                <div>
                  <span className="font-medium">Active Timer:</span>{' '}
                  {formatDuration(selectedSeat.seatSessions.find(s => !s.endedAt)!.startedAt)}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedSeat(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
              {selectedSeat.status === 'occupied' ? (
                <button
                  onClick={() => router.push(`/orders/${selectedSeat.seatSessions.find(s => !s.endedAt)?.order.id}`)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  View Order
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}