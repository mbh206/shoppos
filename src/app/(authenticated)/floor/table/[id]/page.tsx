'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getEstimatedCharge, formatTimeCharge } from '@/lib/time-billing'
import MenuItemSelector from '@/components/MenuItemSelector'
import CustomerSelector from '@/components/CustomerSelector'

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
  meta?: any
}

type Order = {
  id: string
  status: string
  customer?: Customer | null
  items: OrderItem[]
  meta?: any
}

type SeatSession = {
  id: string
  startedAt: string
  endedAt?: string | null
  billedMinutes: number
  customer?: Customer | null
  order: Order
  meta?: any
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
  duration: number
  complexity: string
  complexityJa?: string | null
  description?: string | null
  descriptionJa?: string | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
  bggRating?: number | null
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
  const [showingAddItems, setShowingAddItems] = useState<Seat | null>(null)
  const [transferringSeat, setTransferringSeat] = useState<Seat | null>(null)
  const [availableSeats, setAvailableSeats] = useState<{id: string, number: number, tableName: string}[]>([])
  const [showGameModal, setShowGameModal] = useState(false)
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const [editingSession, setEditingSession] = useState<SeatSession | null>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectingCustomerFor, setSelectingCustomerFor] = useState<Seat | null>(null)
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchTableData()
    checkAdminStatus()
    const dataInterval = setInterval(fetchTableData, 5000)
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(timeInterval)
    }
  }, [])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const session = await response.json()
        setIsAdmin(session?.user?.role === 'admin')
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

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
    // Find any unpaid session
    const activeSession = seat.seatSessions.find(s => 
      s.order.status === 'open' || s.order.status === 'awaiting_payment'
    )
    if (!activeSession) return 0

    // Calculate time charge
    let timeCharge = 0
    if (activeSession.startedAt) {
      if (activeSession.endedAt) {
        // Timer stopped - use the billed amount
        const billedItem = activeSession.order.items.find(item => item.kind === 'seat_time')
        timeCharge = billedItem ? billedItem.totalMinor : 0
      } else {
        // Timer still running - calculate current charge
        const billing = getEstimatedCharge(activeSession.startedAt)
        timeCharge = billing.totalCharge * 100 // Convert to minor units
      }
    }

    // Calculate items total (excluding seat_time which is already in timeCharge)
    const itemsTotal = activeSession.order.items
      .filter(item => item.kind !== 'seat_time')
      .reduce((sum, item) => sum + item.totalMinor, 0)

    return timeCharge + itemsTotal
  }

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat)
  }

  const handleStartTimer = async (seat: Seat, customerId?: string) => {
    try {
      // First create an order for this seat
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'in_store',
          tableId: table?.id,
          customerId,
        }),
      })
      const order = await orderResponse.json()

      // Start the timer with customer if provided
      const response = await fetch(`/api/seats/${seat.id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerId,
        }),
      })

      if (response.ok) {
        fetchTableData()
        setSelectedSeat(null)
        setSelectingCustomerFor(null)
        setPendingCustomer(null)
      }
    } catch (error) {
      console.error('Error starting timer:', error)
    }
  }

  const handleStartTimerClick = (seat: Seat) => {
    setSelectingCustomerFor(seat)
  }

  const handleCustomerSelected = (customer: Customer | null) => {
    if (selectingCustomerFor) {
      handleStartTimer(selectingCustomerFor, customer?.id)
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
      } else {
        const error = await response.json()
        console.error('Error stopping timer:', error)
        alert(error.error || 'Failed to stop timer')
      }
    } catch (error) {
      console.error('Error stopping timer:', error)
      alert('Failed to stop timer')
    }
  }

  const handleStopTimerClick = (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    handleStopTimer(seat)
  }

  const handleAddItemsClick = (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    setShowingAddItems(seat)
  }

  const handleCheckoutClick = (e: React.MouseEvent, seat: Seat) => {
    e.stopPropagation()
    // Find any unpaid session (awaiting_payment status means timer stopped but not paid)
    const activeSession = seat.seatSessions.find(s => 
      s.order.status === 'open' || s.order.status === 'awaiting_payment'
    )
    if (activeSession) {
      router.push(`/checkout/${activeSession.order.id}`)
    }
  }

  const handleEditTimeClick = (e: React.MouseEvent, seatSession: SeatSession) => {
    e.stopPropagation()
    setEditingSession(seatSession)
    // Format dates for datetime-local input in local timezone
    const startDate = new Date(seatSession.startedAt)
    // Convert to local timezone format for datetime-local input
    const tzOffset = startDate.getTimezoneOffset() * 60000
    const localStart = new Date(startDate.getTime() - tzOffset)
    const formattedStart = localStart.toISOString().slice(0, 16)
    setEditStartTime(formattedStart)
    
    if (seatSession.endedAt) {
      const endDate = new Date(seatSession.endedAt)
      const localEnd = new Date(endDate.getTime() - tzOffset)
      const formattedEnd = localEnd.toISOString().slice(0, 16)
      setEditEndTime(formattedEnd)
    } else {
      setEditEndTime('')
    }
  }

  const handleSaveEditedTime = async () => {
    if (!editingSession) return

    try {
      const response = await fetch(`/api/admin/seat-sessions/${editingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startedAt: editStartTime ? new Date(editStartTime).toISOString() : undefined,
          endedAt: editEndTime ? new Date(editEndTime).toISOString() : undefined
        })
      })

      if (response.ok) {
        fetchTableData()
        setEditingSession(null)
        setEditStartTime('')
        setEditEndTime('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update session times')
      }
    } catch (error) {
      console.error('Error updating session times:', error)
      alert('Failed to update session times')
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
            // Find any unpaid session (either timer running or stopped but not checked out)
            const activeSession = seat.seatSessions.find(s => 
              s.order.status === 'open' || s.order.status === 'awaiting_payment'
            )
            const isOccupied = seat.status === 'occupied'
            const currentTotal = calculateSeatTotal(seat)
            // Timer is running if there's a startedAt but no endedAt
            const hasTimer = activeSession && activeSession.startedAt && !activeSession.endedAt
            // Timer was stopped but seat still occupied (ready for checkout)
            const timerStopped = activeSession && activeSession.endedAt && activeSession.order.status === 'awaiting_payment'
            const hasItems = activeSession && activeSession.order.items.filter(item => item.kind !== 'seat_time' && !item.meta?.isGame).length > 0

            return (
              <div
                key={seat.id}
                className={`border rounded-lg p-4 transition-all ${
                  timerStopped ? 'bg-yellow-50 border-yellow-400 hover:shadow-lg' :
                  isOccupied ? 'bg-blue-50 border-blue-300 cursor-pointer hover:shadow-lg' :
                  seat.status === 'closed' ? 'bg-gray-100 border-gray-300' :
                  'bg-white border-gray-200 cursor-pointer hover:shadow-lg'
                }`}
                onClick={() => !timerStopped && handleSeatClick(seat)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Seat {seat.number}</h3>
                  <span className={`px-2 py-1 rounded text-xs text-white ${
                    timerStopped ? 'bg-yellow-500' :
                    isOccupied ? 'bg-blue-500' :
                    seat.status === 'closed' ? 'bg-gray-500' :
                    'bg-green-500'
                  }`}>
                    {timerStopped ? 'ready to pay' : seat.status}
                  </span>
                </div>

                {activeSession && (
                  <div className="space-y-2">
                    {/* Timer Section or No Timer Status */}
                    {timerStopped ? (
                      <>
                        <div className="bg-yellow-100 border border-yellow-300 rounded p-2">
                          <div className="text-sm font-medium text-yellow-800">⏱️ Timer Stopped</div>
                          <div className="text-xs text-yellow-700">
                            Duration: {activeSession.billedMinutes ? `${Math.floor(activeSession.billedMinutes / 60)}h ${activeSession.billedMinutes % 60}m` : 'Calculating...'}
                          </div>
                          <div className="text-sm font-bold text-yellow-900 mt-1">
                            Ready for checkout
                          </div>
                        </div>
                      </>
                    ) : hasTimer ? (
                      <>
                        <div className="text-sm flex justify-between items-center">
                          <div>
                            <span className="font-medium">Started:</span>{' '}
                            {new Date(activeSession.startedAt).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleEditTimeClick(e, activeSession)}
                              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                              title="Edit session times"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Duration:</span>{' '}
                          <span className="font-semibold text-yellow-600">
                            {formatDuration(activeSession.startedAt)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Time Charge:</span>{' '}
                          <span className="text-red-700 font-semibold">
                            {(() => {
                              const billing = getEstimatedCharge(activeSession.startedAt)
                              if (billing.totalCharge === 0) {
                                return '¥0'
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
                    {activeSession && activeSession.customer && (
                      <div className="text-sm">
                        <span className="font-medium">Customer:</span>{' '}
                        <span className='text-blue-600'>{activeSession.customer.displayName || 'Guest'}</span>
                      </div>
                    )}

                    {/* Merge Status */}
                    {activeSession && activeSession.meta?.mergedToSessionId && (
                      <div className="text-sm bg-purple-100 text-purple-800 p-2 rounded">
                        <span className="font-medium">💳 Bill Merged</span>
                        <div className="text-xs">Bill has been merged to another seat</div>
                      </div>
                    )}
                    {activeSession && activeSession.order.meta?.mergedToOrderId && (
                      <div className="text-sm bg-purple-100 text-purple-800 p-2 rounded">
                        <span className="font-medium">💳 Bill Merged</span>
                        <div className="text-xs">Bill has been merged to another seat</div>
                      </div>
                    )}

                    {/* Order Items */}
                    {activeSession && hasItems && (
                      <div className="text-sm border-t pt-2">
                        <div className="font-medium mb-1">Ordered Items:</div>
                        {activeSession.order.items
                          .filter(item => item.kind !== 'seat_time' && !item.meta?.isGame)
                          .slice(0, 3)
                          .map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              {item.qty}x {item.name} - {formatMoney(item.totalMinor)}
                            </div>
                          ))}
                        {activeSession.order.items.filter(item => item.kind !== 'seat_time' && !item.meta?.isGame).length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{activeSession.order.items.filter(item => item.kind !== 'seat_time' && !item.meta?.isGame).length - 3} more items
                          </div>
                        )}
                      </div>
                    )}

                    {/* Games Played */}
                    {activeSession && activeSession.order.items.some(item => item.meta?.isGame) && (
                      <div className="text-sm border-t pt-2">
                        <div className="font-medium mb-1">Games Played:</div>
                        {activeSession.order.items
                          .filter(item => item.meta?.isGame)
                          .map((item, idx) => (
                            <div key={idx} className="text-xs text-purple-600">
                              🎲 {item.name.replace('Game: ', '')}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Total Bill */}
                    {activeSession && (
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">Current Bill:</span>
                          <span className="font-bold text-lg text-green-600">
                            {activeSession.meta?.mergedToSessionId || activeSession.order.meta?.mergedToOrderId
                              ? '¥0 (Merged)'
                              : formatMoney(currentTotal)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {activeSession && (
                      <div className={`grid ${timerStopped ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-3`}>
                        {!timerStopped && (
                          <>
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
                                  handleStartTimerClick(seat)
                                }}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                              >
                                Start Timer
                              </button>
                            )}
                            <button
                              onClick={(e) => handleAddItemsClick(e, seat)}
                              disabled={!!(activeSession?.meta?.mergedToSessionId || activeSession?.order.meta?.mergedToOrderId)}
                              className={`px-2 py-1 rounded text-xs ${
                                activeSession?.meta?.mergedToSessionId || activeSession?.order.meta?.mergedToOrderId
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-purple-500 text-white hover:bg-purple-600'
                              }`}
                              title={activeSession?.meta?.mergedToSessionId || activeSession?.order.meta?.mergedToOrderId ? 'Bill has been merged' : 'Add Items'}
                            >
                              Add Items
                            </button>
                            <button
                              onClick={(e) => handleTransferClick(e, seat)}
                              className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                            >
                              Transfer
                            </button>
                          </>
                        )}
                        {timerStopped && (
                          <>
                            <button
                              onClick={(e) => handleAddItemsClick(e, seat)}
                              disabled={!!(activeSession?.meta?.mergedToSessionId || activeSession?.order.meta?.mergedToOrderId)}
                              className={`px-3 py-2 rounded font-medium ${
                                activeSession?.meta?.mergedToSessionId || activeSession?.order.meta?.mergedToOrderId
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-purple-500 text-white hover:bg-purple-600'
                              }`}
                              title={activeSession?.meta?.mergedToSessionId || activeSession?.order.meta?.mergedToOrderId ? 'Bill has been merged' : 'Add Items'}
                            >
                              + Add Items
                            </button>
                            <button
                              onClick={(e) => handleCheckoutClick(e, seat)}
                              className="px-3 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 animate-pulse"
                            >
                              Checkout →
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isOccupied && seat.status === 'open' && (
                  <div className="space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartTimerClick(seat)
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
      {selectedSeat && !showingAddItems && (
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
                // Find any unpaid session (either active or stopped but awaiting payment)
                const activeSession = showingAddItems.seatSessions.find(s => 
                  s.order.status === 'open' || s.order.status === 'awaiting_payment'
                )
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
                <div className="grid grid-cols-1 gap-4 mb-6 max-h-[60vh] overflow-y-auto">
                  {availableGames.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleAssignGame(game.id)}
                      className="flex gap-4 p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-all text-left"
                    >
                      {/* Game Image */}
                      <div className="flex-shrink-0">
                        {game.thumbnailUrl || game.imageUrl ? (
                          <img 
                            src={game.thumbnailUrl || game.imageUrl || ''} 
                            alt={game.name}
                            className="w-24 h-24 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Game Details */}
                      <div className="flex-1 min-w-0">
                        {/* Title Section */}
                        <div className="mb-2">
                          <div className="font-semibold text-lg">{game.name}</div>
                          {game.nameJa && (
                            <div className="text-gray-700 font-medium">{game.nameJa}</div>
                          )}
                        </div>
                        
                        {/* Game Stats */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {game.minPlayers}-{game.maxPlayers} players
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {game.duration} min
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            game.complexity === 'easy' ? 'bg-green-100 text-green-800' :
                            game.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            game.complexity === 'hard' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {game.complexity}
                            {game.complexityJa && <span className="ml-1">({game.complexityJa})</span>}
                          </span>
                          {game.bggRating && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-medium">{game.bggRating.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        
                        {/* Descriptions */}
                        {(game.description || game.descriptionJa) && (
                          <div className="text-xs text-gray-600 space-y-1">
                            {game.description && (
                              <p className="line-clamp-2">{game.description}</p>
                            )}
                            {game.descriptionJa && (
                              <p className="line-clamp-2 text-gray-500">{game.descriptionJa}</p>
                            )}
                          </div>
                        )}
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

      {/* Edit Session Time Modal (Admin Only) */}
      {editingSession && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Edit Session Times
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time (Japan Time)
                </label>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editStartTime && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(editStartTime).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      weekday: 'short'
                    })}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  End Time (Japan Time - optional, leave empty for ongoing session)
                </label>
                <input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editEndTime && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(editEndTime).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      weekday: 'short'
                    })}
                  </div>
                )}
              </div>
              
              {editStartTime && editEndTime && (
                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-sm">
                    <span className="font-medium">Duration:</span>{' '}
                    {(() => {
                      const start = new Date(editStartTime)
                      const end = new Date(editEndTime)
                      const diffMs = end.getTime() - start.getTime()
                      const diffMins = Math.floor(diffMs / 60000)
                      const hours = Math.floor(diffMins / 60)
                      const mins = diffMins % 60
                      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                    })()}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditingSession(null)
                    setEditStartTime('')
                    setEditEndTime('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedTime}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Selector Modal */}
      {selectingCustomerFor && (
        <CustomerSelector
          onSelectCustomer={handleCustomerSelected}
          onClose={() => {
            setSelectingCustomerFor(null)
            setPendingCustomer(null)
          }}
        />
      )}
    </div>
  )
}