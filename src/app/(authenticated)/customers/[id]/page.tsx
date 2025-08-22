'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

type Customer = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  firstNameJa?: string | null
  lastNameJa?: string | null
  displayName?: string | null
  phone?: string | null
  pointsBalance: number
  createdAt: string
  seatSessions: any[]
  orders: any[]
  eventTickets: any[]
  pointsTransactions: any[]
  memberships: any[]
  _count: {
    seatSessions: number
    orders: number
    eventTickets: number
  }
  stats: {
    totalSpent: number
    gamesPlayed: string[]
  }
  loyalty: {
    pointsBalance: number
    activeMembership: {
      planName: string
      planNameJa?: string
      hoursRemaining: number
      hoursUsed: number
      hoursIncluded: number
      endDate: string
      autoRenew: boolean
    } | null
  }
}

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

type Order = {
  id: string
  openedAt: string
  closedAt?: string | null
  status: string
  items: OrderItem[]
  paymentMethod?: string | null
  tipMinor?: number | null
  discountMinor?: number | null
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    firstNameJa: '',
    lastNameJa: '',
    email: '',
    phone: ''
  })
  const [saving, setSaving] = useState(false)
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false)
  const [purchasingMembership, setPurchasingMembership] = useState(false)
  const [membershipPlans, setMembershipPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [autoRenew, setAutoRenew] = useState(false)
  const [gameHistory, setGameHistory] = useState<any>(null)
  const [loadingGames, setLoadingGames] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchCustomer()
    fetchMembershipPlans()
  }, [])
  
  useEffect(() => {
    if (activeTab === 'games' && !gameHistory) {
      fetchGameHistory()
    }
  }, [activeTab])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data)
        // Initialize edit form with customer data
        setEditForm({
          displayName: data.displayName || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          firstNameJa: data.firstNameJa || '',
          lastNameJa: data.lastNameJa || '',
          email: data.email || '',
          phone: data.phone || ''
        })
      } else {
        router.push('/customers')
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const updatedCustomer = await response.json()
        setCustomer(updatedCustomer)
        setIsEditModalOpen(false)
      } else {
        console.error('Failed to update customer')
      }
    } catch (error) {
      console.error('Error updating customer:', error)
    } finally {
      setSaving(false)
    }
  }

  const fetchMembershipPlans = async () => {
    try {
      const response = await fetch('/api/memberships/plans')
      if (response.ok) {
        const plans = await response.json()
        setMembershipPlans(plans)
        if (plans.length > 0) {
          setSelectedPlanId(plans[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching membership plans:', error)
    }
  }
  
  const fetchGameHistory = async () => {
    setLoadingGames(true)
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}/games`)
      if (response.ok) {
        const data = await response.json()
        setGameHistory(data)
      }
    } catch (error) {
      console.error('Error fetching game history:', error)
    } finally {
      setLoadingGames(false)
    }
  }

  const handlePurchaseMembership = async () => {
    if (!selectedPlanId || !customer) return
    
    setPurchasingMembership(true)
    try {
      const response = await fetch('/api/memberships/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          planId: selectedPlanId,
          autoRenew,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // Refresh customer data to show new membership
        await fetchCustomer()
        setIsMembershipModalOpen(false)
        setAutoRenew(false)
        alert(result.message || 'Membership purchased successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to purchase membership')
      }
    } catch (error) {
      console.error('Error purchasing membership:', error)
      alert('Failed to purchase membership')
    } finally {
      setPurchasingMembership(false)
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
                {customer.firstNameJa && (
                  <p className="text-lg text-gray-600">
                    {customer.lastNameJa} {customer.firstNameJa}
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
              <button
                onClick={() => {
                  // Reset form with current customer data when opening modal
                  setEditForm({
                    displayName: customer.displayName || '',
                    firstName: customer.firstName || '',
                    lastName: customer.lastName || '',
                    firstNameJa: customer.firstNameJa || '',
                    lastNameJa: customer.lastNameJa || '',
                    email: customer.email || '',
                    phone: customer.phone || ''
                  })
                  setIsEditModalOpen(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Customer
              </button>
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

        {/* Loyalty Card Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Loyalty & Membership</h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Points Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-2">Points Balance</div>
              <div className="text-4xl font-bold mb-4">
                ¥{customer.loyalty.pointsBalance.toLocaleString('ja-JP')}
              </div>
              <div className="text-xs opacity-75">
                Earn 1 point per ¥{customer.loyalty.activeMembership ? '40' : '50'} spent
              </div>
              <div className="text-xs opacity-75">
                1 point = ¥1 redemption value
              </div>
            </div>

            {/* Membership Card */}
            {customer.loyalty.activeMembership ? (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-6 text-white">
                <div className="text-sm opacity-90 mb-2">
                  {customer.loyalty.activeMembership.planName}
                  {customer.loyalty.activeMembership.planNameJa && (
                    <span className="ml-2 text-xs">
                      ({customer.loyalty.activeMembership.planNameJa})
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold mb-2">
                  {customer.loyalty.activeMembership.hoursRemaining.toFixed(1)}h
                  <span className="text-lg font-normal ml-2">remaining</span>
                </div>
                <div className="text-xs opacity-75">
                  {customer.loyalty.activeMembership.hoursUsed.toFixed(1)} / {customer.loyalty.activeMembership.hoursIncluded} hours used
                </div>
                <div className="text-xs opacity-75 mt-2">
                  Valid until {new Date(customer.loyalty.activeMembership.endDate).toLocaleDateString('ja-JP')}
                </div>
                {customer.loyalty.activeMembership.autoRenew && (
                  <div className="text-xs bg-white/20 rounded px-2 py-1 inline-block mt-2">
                    Auto-renewal ON
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-gray-600 font-semibold mb-2">No Active Membership</div>
                <div className="text-sm text-gray-500 text-center mb-4">
                  Get 20 hours of table time for ¥8,000/month
                </div>
                <button 
                  onClick={() => setIsMembershipModalOpen(true)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Purchase Monthly Pass
                </button>
              </div>
            )}
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
                  <div 
                    key={order.id} 
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
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
              <div>
                {loadingGames ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading game history...</div>
                  </div>
                ) : gameHistory ? (
                  <div>
                    {/* Game Statistics */}
                    {gameHistory.stats && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="text-sm text-purple-600">Total Games</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {gameHistory.stats.totalGamesPlayed}
                          </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="text-sm text-blue-600">Unique Games</div>
                          <div className="text-2xl font-bold text-blue-900">
                            {gameHistory.stats.uniqueGamesPlayed}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="text-sm text-green-600">Total Play Time</div>
                          <div className="text-2xl font-bold text-green-900">
                            {Math.floor(gameHistory.stats.totalPlayTime / 60)}h {gameHistory.stats.totalPlayTime % 60}m
                          </div>
                        </div>
                        {gameHistory.stats.favoriteGame && (
                          <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="text-sm text-yellow-600">Favorite Game</div>
                            <div className="text-lg font-bold text-yellow-900">
                              {gameHistory.stats.favoriteGame.name}
                            </div>
                            <div className="text-xs text-yellow-700">
                              Played {gameHistory.stats.favoriteGame.timesPlayed} times
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Frequent Players */}
                    {gameHistory.stats?.frequentPlayers?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold mb-2">Frequent Co-Players</h4>
                        <div className="flex flex-wrap gap-2">
                          {gameHistory.stats.frequentPlayers.map((player: any) => (
                            <div key={player.name} className="bg-gray-100 rounded-full px-3 py-1 text-sm">
                              {player.name} ({player.gamesPlayedTogether} games)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Game History List */}
                    <h4 className="font-semibold mb-3">Game History</h4>
                    <div className="space-y-3">
                      {gameHistory.history?.map((entry: any) => (
                        <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎲</span>
                                <span className="font-medium">{entry.game.name}</span>
                                {entry.game.nameJa && (
                                  <span className="text-sm text-gray-500">({entry.game.nameJa})</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Table {entry.table} • {entry.playerCount} players
                                {entry.coPlayerNames.length > 0 && (
                                  <span> • With: {entry.coPlayerNames.join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">
                                {new Date(entry.playedAt).toLocaleDateString('ja-JP')}
                              </div>
                              <div className="text-sm font-medium text-purple-600">
                                {entry.durationFormatted}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!gameHistory.history || gameHistory.history.length === 0) && (
                        <div className="text-center text-gray-500 py-8">
                          No games played yet
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No game history available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Edit Customer Information</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Display name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名 (First Name in Japanese)
                  </label>
                  <input
                    type="text"
                    value={editForm.firstNameJa}
                    onChange={(e) => setEditForm({ ...editForm, firstNameJa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓 (Last Name in Japanese)
                  </label>
                  <input
                    type="text"
                    value={editForm.lastNameJa}
                    onChange={(e) => setEditForm({ ...editForm, lastNameJa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="姓"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={saving || !editForm.email}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">Order #{selectedOrder.id.slice(-6)}</h2>
                  <p className="text-gray-600">{formatDate(selectedOrder.openedAt)}</p>
                  {selectedOrder.closedAt && (
                    <p className="text-gray-600 text-sm">Closed: {formatDate(selectedOrder.closedAt)}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedOrder.status === 'paid' 
                    ? 'bg-green-100 text-green-800'
                    : selectedOrder.status === 'open'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
                {selectedOrder.paymentMethod && (
                  <span className="ml-2 text-sm text-gray-600">
                    Payment: {selectedOrder.paymentMethod}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-semibold mb-4">Order Items</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start pb-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.qty > 1 && `${item.qty} × `}
                        {formatMoney(item.unitPriceMinor)}
                        {item.kind && (
                          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {item.kind}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(item.totalMinor - item.taxMinor)}</div>
                      {item.taxMinor > 0 && (
                        <div className="text-xs text-gray-500">+{formatMoney(item.taxMinor)} tax</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(
                    selectedOrder.items.reduce((sum, item) => sum + item.totalMinor - item.taxMinor, 0)
                  )}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatMoney(
                    selectedOrder.items.reduce((sum, item) => sum + item.taxMinor, 0)
                  )}</span>
                </div>
                {selectedOrder.discountMinor && selectedOrder.discountMinor > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatMoney(selectedOrder.discountMinor)}</span>
                  </div>
                )}
                {selectedOrder.tipMinor && selectedOrder.tipMinor > 0 && (
                  <div className="flex justify-between">
                    <span>Tip</span>
                    <span>{formatMoney(selectedOrder.tipMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatMoney(
                    selectedOrder.items.reduce((sum, item) => sum + item.totalMinor, 0) +
                    (selectedOrder.tipMinor || 0) -
                    (selectedOrder.discountMinor || 0)
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Membership Purchase Modal */}
      {isMembershipModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsMembershipModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Purchase Monthly Pass</h3>
            
            {membershipPlans.length > 0 ? (
              <div className="space-y-4">
                {/* Plan Selection */}
                <div className="space-y-2">
                  {membershipPlans.map((plan) => (
                    <label 
                      key={plan.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPlanId === plan.id 
                          ? 'border-yellow-500 bg-yellow-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlanId === plan.id}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {plan.name}
                            {plan.nameJa && <span className="ml-2 text-sm text-gray-500">({plan.nameJa})</span>}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {plan.description || `${plan.hoursIncluded} hours included per month`}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            • Overage rate: ¥{plan.overageRate / 100}/hour after included hours
                          </div>
                          <div className="text-xs text-gray-500">
                            • {plan.pointsOnPurchase} bonus points on purchase
                          </div>
                          <div className="text-xs text-gray-500">
                            • Better points earning rate (1 per ¥{plan.earnRateDenominator})
                          </div>
                        </div>
                        <div className="text-xl font-bold">
                          ¥{(plan.price / 100).toLocaleString('ja-JP')}
                          <div className="text-xs font-normal text-gray-500">/month</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Auto Renewal Option */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="w-5 h-5 text-yellow-500"
                  />
                  <div>
                    <div className="font-medium">Enable Auto-Renewal</div>
                    <div className="text-sm text-gray-600">
                      Automatically renew membership each month
                    </div>
                  </div>
                </label>

                {/* Customer Info */}
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="font-medium text-blue-900 mb-1">Customer Information</div>
                  <div className="text-blue-700">
                    {customer?.displayName || 'Guest Customer'}
                  </div>
                  <div className="text-blue-600">
                    {customer?.email}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsMembershipModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={purchasingMembership}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchaseMembership}
                    className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    disabled={purchasingMembership || !selectedPlanId}
                  >
                    {purchasingMembership ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No membership plans available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}