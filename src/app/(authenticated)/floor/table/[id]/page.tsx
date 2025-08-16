'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getEstimatedCharge, formatTimeCharge } from '@/lib/time-billing'
import MenuItemSelector from '@/components/MenuItemSelector'

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
  kind: string
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

type Game = {
  id: string
  name: string
  nameJa?: string | null
  type: string
  minPlayers: number
  maxPlayers: number
  complexity: string
}

type TableGameSession = {
  id: string
  gameId: string
  startedAt: string
  endedAt?: string | null
  game: Game
}

type Table = {
  id: string
  name: string
  capacity: number
  status: 'available' | 'seated' | 'dirty' | 'reserved' | 'offline'
  seats: Seat[]
  gameSessions?: TableGameSession[]
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
  const [currentTime, setCurrentTime] = useState(new Date())
  const [confirmingStop, setConfirmingStop] = useState<Seat | null>(null)
  const [showingAddItems, setShowingAddItems] = useState<Seat | null>(null)
  const [transferringSeat, setTransferringSeat] = useState<Seat | null>(null)
  const [availableSeats, setAvailableSeats] = useState<{id: string, number: number, tableName: string}[]>([])
  const [showGameModal, setShowGameModal] = useState(false)
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchTableData()
    const dataInterval = setInterval(fetchTableData, 5000)
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(timeInterval)
    }
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
    const diffMs = currentTime.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getMinutesSince = (startedAt: string) => {
    const start = new Date(startedAt)
    const diffMs = currentTime.getTime() - start.getTime()
    return Math.floor(diffMs / 60000)
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const calculateSeatTotal = (seat: Seat) => {
    const activeSession = seat.seatSessions.find(s => !s.endedAt)
    if (!activeSession) return 0

    // Calculate current time charge
    let timeCharge = 0
    if (activeSession.startedAt) {
      const billing = getEstimatedCharge(activeSession.startedAt)
      timeCharge = billing.totalCharge * 100 // Convert to minor units
    }

    // Calculate items total
    const itemsTotal = activeSession.order.items.reduce((sum, item) => sum + item.totalMinor, 0)

    return timeCharge + itemsTotal
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
        setConfirmingStop(null)
      }
    } catch (error) {
      console.error('Error stopping timer:', error)
    }
  }

  const handleStopTimerClick = (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    setConfirmingStop(seat)
  }

  const handleAddItemsClick = (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    setShowingAddItems(seat)
  }

  const handleCheckoutClick = (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    const activeSession = seat.seatSessions.find(s => !s.endedAt)
    if (activeSession) {
      router.push(`/checkout/${activeSession.order.id}`)
    }
  }

  const handleStartSeat = async (seat: Seat) => {
    try {
      // Create an order for this seat without starting timer
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'in_store',
          tableId: table?.id,
        }),
      })
      const order = await orderResponse.json()

      // Create a seat session without timer
      const response = await fetch(`/api/seats/${seat.id}/session`, {
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
      console.error('Error starting seat:', error)
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

  const handleAddSeat = async () => {
    try {
      const response = await fetch(`/api/tables/${resolvedParams.id}/seats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        fetchTableData()
      }
    } catch (error) {
      console.error('Error adding seat:', error)
    }
  }

  const handleRemoveSeat = async () => {
    try {
      const response = await fetch(`/api/tables/${resolvedParams.id}/seats`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        fetchTableData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove seat')
      }
    } catch (error) {
      console.error('Error removing seat:', error)
    }
  }

  const handleTransferClick = async (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    setTransferringSeat(seat)
    
    // Fetch all available seats
    try {
      const response = await fetch('/api/floor')
      if (!response.ok) {
        throw new Error('Failed to fetch floor data')
      }
      
      const tables = await response.json()
      
      const available: {id: string, number: number, tableName: string}[] = []
      
      // The API returns an array of tables directly
      if (Array.isArray(tables)) {
        tables.forEach((t: any) => {
          if (t.seats && Array.isArray(t.seats)) {
            t.seats
              .filter((s: any) => s.status === 'open' && s.id !== seat.id)
              .forEach((s: any) => {
                available.push({
                  id: s.id,
                  number: s.number,
                  tableName: t.name
                })
              })
          }
        })
      }
      
      console.log('Found available seats:', available.length)
      
      setAvailableSeats(available.sort((a, b) => {
        if (a.tableName !== b.tableName) {
          return a.tableName.localeCompare(b.tableName)
        }
        return a.number - b.number
      }))
    } catch (error) {
      console.error('Error fetching available seats:', error)
      alert('Failed to fetch available seats')
    }
  }

  const handleTransferSeat = async (targetSeatId: string) => {
    if (!transferringSeat) return
    
    try {
      const response = await fetch(`/api/seats/${transferringSeat.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSeatId }),
      })

      if (response.ok) {
        const result = await response.json()
        fetchTableData()
        setTransferringSeat(null)
        setAvailableSeats([])
        alert(`Seat transferred from ${result.fromSeat.tableName} Seat ${result.fromSeat.number} to ${result.toSeat.tableName} Seat ${result.toSeat.number}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to transfer seat')
      }
    } catch (error) {
      console.error('Error transferring seat:', error)
      alert('Failed to transfer seat')
    }
  }

  const fetchAvailableGames = async () => {
    try {
      const response = await fetch('/api/games?available=true')
      if (response.ok) {
        const games = await response.json()
        setAvailableGames(games)
      }
    } catch (error) {
      console.error('Error fetching available games:', error)
    }
  }

  const handleAssignGame = async (gameId: string) => {
    try {
      const response = await fetch(`/api/tables/${resolvedParams.id}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      })

      if (response.ok) {
        fetchTableData()
        setShowGameModal(false)
        setAvailableGames([])
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign game')
      }
    } catch (error) {
      console.error('Error assigning game:', error)
      alert('Failed to assign game')
    }
  }

  const handleRemoveGame = async (sessionId: string) => {
    if (!confirm('Remove this game from the table?')) return
    
    try {
      const response = await fetch(`/api/tables/${resolvedParams.id}/games/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTableData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove game')
      }
    } catch (error) {
      console.error('Error removing game:', error)
      alert('Failed to remove game')
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

        <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Total Seats: <span className="font-semibold text-gray-900">{table.capacity}</span></span>
            <span className="text-gray-600">Available: <span className="font-semibold text-green-600">{table.seats.filter(s => s.status === 'open').length}</span></span>
            <span className="text-gray-600">Occupied: <span className="font-semibold text-blue-600">{table.seats.filter(s => s.status === 'occupied').length}</span></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSeat}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
              title="Add a seat to this table"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Seat
            </button>
            <button
              onClick={handleRemoveSeat}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
              title="Remove an empty seat from this table"
              disabled={table.seats.filter(s => s.status !== 'occupied').length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Remove Seat
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {table.seats
            .sort((a, b) => a.number - b.number)
            .map((seat) => {
            const activeSession = seat.seatSessions.find(s => !s.endedAt)
            const isOccupied = seat.status === 'occupied'
            const currentTotal = calculateSeatTotal(seat)
            const hasTimer = activeSession && activeSession.startedAt
            const hasItems = activeSession && activeSession.order.items.filter(item => item.kind !== 'seat_time').length > 0

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
                    {/* Timer Section or No Timer Status */}
                    {hasTimer ? (
                      <>
                        <div className="text-sm">
                          <span className="font-medium">Timer:</span>{' '}
                          {formatDuration(activeSession.startedAt)}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Time Charge:</span>{' '}
                          <span className="text-blue-600 font-semibold">
                            {(() => {
                              const billing = getEstimatedCharge(activeSession.startedAt)
                              if (billing.totalCharge === 0) {
                                return '¥0 (grace period)'
                              }
                              if (billing.rateApplied === '5hour') {
                                return `¥${billing.totalCharge.toLocaleString('ja-JP')} (5hr cap)`
                              }
                              if (billing.rateApplied === '3hour') {
                                return `¥${billing.totalCharge.toLocaleString('ja-JP')} (3hr rate)`
                              }
                              return `¥${billing.totalCharge.toLocaleString('ja-JP')}`
                            })()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          No Timer - Order Only
                        </span>
                      </div>
                    )}

                    {/* Customer Info */}
                    {activeSession.customer && (
                      <div className="text-sm">
                        <span className="font-medium">Customer:</span>{' '}
                        {activeSession.customer.displayName || 'Guest'}
                      </div>
                    )}

                    {/* Order Items */}
                    {hasItems && (
                      <div className="text-sm border-t pt-2">
                        <div className="font-medium mb-1">Order Items:</div>
                        {activeSession.order.items
                          .filter(item => item.kind !== 'seat_time')
                          .slice(0, 3)
                          .map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              {item.qty}x {item.name} - {formatMoney(item.totalMinor)}
                            </div>
                          ))}
                        {activeSession.order.items.filter(item => item.kind !== 'seat_time').length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{activeSession.order.items.filter(item => item.kind !== 'seat_time').length - 3} more items
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total Bill */}
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">Current Bill:</span>
                        <span className="font-bold text-lg text-green-600">
                          {formatMoney(currentTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {hasTimer && (
                        <button
                          onClick={(e) => handleStopTimerClick(e, seat)}
                          className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
                        >
                          Stop Timer
                        </button>
                      )}
                      {!hasTimer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartTimer(seat)
                          }}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Start Timer
                        </button>
                      )}
                      <button
                        onClick={(e) => handleAddItemsClick(e, seat)}
                        className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                      >
                        Add Items
                      </button>
                      <button
                        onClick={(e) => handleTransferClick(e, seat)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                      >
                        Transfer
                      </button>
                      <button
                        onClick={(e) => handleCheckoutClick(e, seat)}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                )}

                {!isOccupied && seat.status === 'open' && (
                  <div className="space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartTimer(seat)
                      }}
                      className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Start Timer
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartSeat(seat)
                      }}
                      className="w-full px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                    >
                      Start Seat (No Timer)
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Games Section */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Table Games</h3>
              <button
                onClick={() => {
                  setShowGameModal(true)
                  fetchAvailableGames()
                }}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Game
              </button>
            </div>
            
            {table.gameSessions && table.gameSessions.filter(gs => !gs.endedAt).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {table.gameSessions
                  .filter(gs => !gs.endedAt)
                  .map(gameSession => (
                    <div key={gameSession.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{gameSession.game.name}</div>
                          {gameSession.game.nameJa && (
                            <div className="text-xs text-gray-500">{gameSession.game.nameJa}</div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {gameSession.game.minPlayers}-{gameSession.game.maxPlayers} players • {gameSession.game.complexity}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveGame(gameSession.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove game"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No games currently assigned to this table</p>
            )}
          </div>
        </div>
      </div>

      {/* Seat Detail Modal */}
      {selectedSeat && !confirmingStop && !showingAddItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Seat {selectedSeat.number} Details
            </h2>
            
            {selectedSeat.seatSessions.find(s => !s.endedAt) && (() => {
              const session = selectedSeat.seatSessions.find(s => !s.endedAt)!
              const billing = session.startedAt ? getEstimatedCharge(session.startedAt) : null
              const hasTimer = session.startedAt
              const hasItems = session.order.items.filter(item => item.kind !== 'seat_time').length > 0
              
              return (
                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Status:</span> {selectedSeat.status}
                  </div>
                  
                  {hasTimer && billing && (
                    <>
                      <div>
                        <span className="font-medium">Active Timer:</span>{' '}
                        {formatDuration(session.startedAt)}
                      </div>
                      <div className="p-3 bg-blue-50 rounded">
                        <div className="text-sm font-medium text-blue-900 mb-1">Time Charge Estimate</div>
                        <div className="text-lg font-bold text-blue-600">
                          ¥{billing.totalCharge.toLocaleString('ja-JP')}
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          {(() => {
                            const minutes = getMinutesSince(session.startedAt)
                            const hours = Math.floor(minutes / 60)
                            const mins = minutes % 60
                            return (
                              <>
                                {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                                {billing.rateApplied === '5hour' && ' • 5-hour cap applied'}
                                {billing.rateApplied === '3hour' && ' • 3-hour discount rate'}
                                {billing.breakdown.graceApplied && ' • Within grace period'}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {hasItems && (
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium text-gray-900 mb-2">Order Items</div>
                      <div className="space-y-1">
                        {session.order.items
                          .filter(item => item.kind !== 'seat_time')
                          .map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.qty}x {item.name}</span>
                              <span>{formatMoney(item.totalMinor)}</span>
                            </div>
                          ))}
                      </div>
                      <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                        <span>Items Total:</span>
                        <span>{formatMoney(
                          session.order.items
                            .filter(item => item.kind !== 'seat_time')
                            .reduce((sum, item) => sum + item.totalMinor, 0)
                        )}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Bill:</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatMoney(calculateSeatTotal(selectedSeat))}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setSelectedSeat(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
              {selectedSeat.status === 'occupied' && (
                <>
                  <button
                    onClick={() => setShowingAddItems(selectedSeat)}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Add Items
                  </button>
                  <button
                    onClick={() => {
                      const activeSession = selectedSeat.seatSessions.find(s => !s.endedAt)
                      if (activeSession) {
                        router.push(`/checkout/${activeSession.order.id}`)
                      }
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Checkout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stop Timer Confirmation */}
      {confirmingStop && (() => {
        const activeSession = confirmingStop.seatSessions.find(s => !s.endedAt)
        if (!activeSession) return null
        
        const billing = getEstimatedCharge(activeSession.startedAt)
        const minutes = getMinutesSince(activeSession.startedAt)
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">
                Stop Timer for Seat {confirmingStop.number}?
              </h2>
              
              <div className="space-y-3 mb-6">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600 mb-1">Duration</div>
                  <div className="text-lg font-semibold">
                    {hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}` : `${mins} minute${mins !== 1 ? 's' : ''}`}
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm text-blue-600 mb-1">Time Charge</div>
                  <div className="text-2xl font-bold text-blue-700">
                    ¥{billing.totalCharge.toLocaleString('ja-JP')}
                  </div>
                  {billing.totalCharge > 0 && (
                    <div className="text-xs text-blue-600 mt-2">
                      {billing.rateApplied === '5hour' && '5-hour cap applied (¥420/hr, max ¥2,100)'}
                      {billing.rateApplied === '3hour' && '3-hour discount rate applied (¥450/hr)'}
                      {billing.rateApplied === 'standard' && `Standard rate (¥500/hr)`}
                      {billing.breakdown.graceApplied && ' - Includes grace period'}
                      {billing.breakdown.halfHours > 0 && ` - Includes ${billing.breakdown.halfHours} half-hour charge`}
                    </div>
                  )}
                  {billing.totalCharge === 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      No charge - within 10-minute grace period
                    </div>
                  )}
                </div>
                
                {activeSession.order.items.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600 mb-1">Order Items</div>
                    <div className="text-lg font-semibold">
                      {formatMoney(
                        activeSession.order.items.reduce((sum, item) => sum + item.totalMinor, 0)
                      )}
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-green-50 rounded border-2 border-green-200">
                  <div className="text-sm text-green-700 mb-1">Total Bill</div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatMoney(
                      (billing.totalCharge * 100) + 
                      activeSession.order.items.reduce((sum, item) => sum + item.totalMinor, 0)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmingStop(null)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStopTimer(confirmingStop)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Stop Timer & Add Charge
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add Items Modal */}
      {showingAddItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">
                Add Items to Seat {showingAddItems.number}
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              {(() => {
                const activeSession = showingAddItems.seatSessions.find(s => !s.endedAt)
                if (!activeSession) return <div className="p-4">No active session</div>
                
                return (
                  <MenuItemSelector
                    orderId={activeSession.order.id}
                    onItemsAdded={() => {
                      fetchTableData()
                      setShowingAddItems(null)
                    }}
                    onClose={() => setShowingAddItems(null)}
                  />
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Seat Modal */}
      {transferringSeat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Transfer Seat {transferringSeat.number}
            </h2>
            
            {availableSeats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No available seats to transfer to</p>
                <button
                  onClick={() => {
                    setTransferringSeat(null)
                    setAvailableSeats([])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Select a seat to transfer this customer to. The timer will continue running and all items will be moved.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {availableSeats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => handleTransferSeat(seat.id)}
                      className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all"
                    >
                      <div className="font-semibold">{seat.tableName}</div>
                      <div className="text-sm text-gray-600">Seat {seat.number}</div>
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setTransferringSeat(null)
                      setAvailableSeats([])
                    }}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game Selection Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Select a Game for {table?.name}
            </h2>
            
            {availableGames.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No available games at the moment</p>
                <button
                  onClick={() => {
                    setShowGameModal(false)
                    setAvailableGames([])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {availableGames.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleAssignGame(game.id)}
                      className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-all text-left"
                    >
                      <div className="font-semibold">{game.name}</div>
                      {game.nameJa && (
                        <div className="text-xs text-gray-500">{game.nameJa}</div>
                      )}
                      <div className="text-sm text-gray-600 mt-2">
                        <div>{game.minPlayers}-{game.maxPlayers} players</div>
                        <div className="capitalize">{game.complexity} • {game.type.replace(/_/g, ' ')}</div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowGameModal(false)
                      setAvailableGames([])
                    }}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}