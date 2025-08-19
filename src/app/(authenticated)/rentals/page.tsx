'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

type Game = {
  id: string
  name: string
  nameJa: string | null
  minPlayers: number
  maxPlayers: number
  duration: string
  retailPrice: number
  isRentable: boolean
  isPremium: boolean
  maxRentalDays: number | null
  available: boolean
  isCurrentlyRented: boolean
  expectedReturn: string | null
  rentedTo: string | null
  fees: {
    base: number
    nightly: number
    premium: number
    deposit: number
  }
}

type Customer = {
  id: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  email: string | null
}

type ActiveRental = {
  id: string
  game: {
    name: string
    nameJa: string | null
  }
  customer: {
    displayName: string | null
    firstName: string | null
    lastName: string | null
  }
  checkOutDate: string
  expectedReturnDate: string
  actualReturnDate?: string | null
  depositAmount: number
  totalCharged?: number
  status: 'out' | 'returned'
  isOverdue: boolean
  daysOut: number | null
  daysUntilDue: number | null
}

export default function RentalsPage() {
  const [activeTab, setActiveTab] = useState<'checkout' | 'checkin' | 'rentals'>('checkout')
  const [games, setGames] = useState<Game[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([])
  const [allRentals, setAllRentals] = useState<ActiveRental[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedRental, setSelectedRental] = useState<ActiveRental | null>(null)
  const [returnDate, setReturnDate] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [damageFee, setDamageFee] = useState(0)
  const [returnNotes, setReturnNotes] = useState('')
  
  useEffect(() => {
    fetchRentableGames()
    fetchCustomers()
    fetchActiveRentals()
    fetchAllRentals()
    
    // Set default return date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setReturnDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const fetchRentableGames = async () => {
    try {
      // Fetch all games
      const gamesResponse = await fetch('/api/games')
      if (!gamesResponse.ok) return
      
      const gamesData = await gamesResponse.json()
      
      // Fetch active rentals to check which games are out
      const rentalsResponse = await fetch('/api/rentals/active')
      const activeRentals = rentalsResponse.ok ? await rentalsResponse.json() : []
      
      // Create a set of currently rented game IDs
      const rentedGameIds = new Set(activeRentals.map((r: any) => r.gameId))
      
      // Transform games to include rental information
      const gamesWithRentalInfo = gamesData.map((game: any) => {
        const isRented = rentedGameIds.has(game.id)
        const rental = activeRentals.find((r: any) => r.gameId === game.id)
        
        return {
          ...game,
          retailPrice: game.retailPrice || 5000,
          isPremium: game.isPremium || false,
          maxRentalDays: game.maxRentalDays || null,
          isRentable: game.isRentable || false,
          isCurrentlyRented: isRented,
          available: game.available && !isRented,
          expectedReturn: rental?.expectedReturnDate || null,
          rentedTo: rental ? (
            rental.customer.displayName || 
            `${rental.customer.firstName || ''} ${rental.customer.lastName || ''}`.trim()
          ) : null,
          fees: {
            base: Math.floor((game.retailPrice || 5000) * 0.1),
            nightly: 100,
            premium: game.isPremium ? 1000 : 0,
            deposit: game.retailPrice || 5000
          }
        }
      })
      setGames(gamesWithRentalInfo)
    } catch (error) {
      console.error('Failed to fetch games:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const fetchActiveRentals = async () => {
    try {
      const response = await fetch('/api/rentals/active')
      if (response.ok) {
        const data = await response.json()
        setActiveRentals(data)
      }
    } catch (error) {
      console.error('Failed to fetch active rentals:', error)
    }
  }

  const fetchAllRentals = async () => {
    try {
      const response = await fetch('/api/rentals')
      if (response.ok) {
        const data = await response.json()
        setAllRentals(data)
      }
    } catch (error) {
      console.error('Failed to fetch all rentals:', error)
    }
  }

  const handleCheckout = async () => {
    if (!selectedGame || !selectedCustomer || !photoUrl) {
      alert('Please select a game, customer, and upload a photo')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/rentals/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          gameId: selectedGame.id,
          expectedReturnDate: new Date(returnDate).toISOString(),
          checkOutPhotoUrl: photoUrl,
          paymentMethodId: 'temp-payment-method' // TODO: Implement payment method selection
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Rental processed! Total estimated charge: ¥${data.fees.estimatedTotal}`)
        
        // Reset form
        setSelectedGame(null)
        setSelectedCustomer(null)
        setPhotoUrl('')
        
        // Refresh data
        fetchRentableGames()
        fetchActiveRentals()
        fetchAllRentals()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to process rental')
      }
    } catch (error) {
      alert('Failed to process rental')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async () => {
    if (!selectedRental) {
      alert('Please select a rental to check in')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/rentals/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalId: selectedRental.id,
          checkInPhotoUrl: photoUrl || undefined,
          damageFee: damageFee,
          notes: returnNotes || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Rental returned! Total charge: ¥${data.charges.total}`)
        
        // Reset form
        setSelectedRental(null)
        setPhotoUrl('')
        setDamageFee(0)
        setReturnNotes('')
        setShowReturnModal(false)
        
        // Refresh data
        fetchActiveRentals()
        fetchAllRentals()
        fetchRentableGames()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to process return')
      }
    } catch (error) {
      alert('Failed to process return')
    } finally {
      setLoading(false)
    }
  }

  const openReturnModal = (rental: ActiveRental) => {
    setSelectedRental(rental)
    setShowReturnModal(true)
    setDamageFee(0)
    setReturnNotes('')
    setPhotoUrl('')
  }

  const filteredGames = games.filter(game => 
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (game.nameJa && game.nameJa.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredCustomers = customers.filter(customer => {
    const search = customerSearch.toLowerCase()
    return (
      (customer.firstName && customer.firstName.toLowerCase().includes(search)) ||
      (customer.lastName && customer.lastName.toLowerCase().includes(search)) ||
      (customer.displayName && customer.displayName.toLowerCase().includes(search)) ||
      (customer.email && customer.email.toLowerCase().includes(search)) ||
      (customer.phone && customer.phone.includes(search))
    )
  })

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Game Rentals</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'checkout'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Check Out
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'checkin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Check In ({activeRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('rentals')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rentals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Rentals ({allRentals.length})
          </button>
        </nav>
      </div>

      {/* Check Out Tab */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Selection */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Select Game</h2>
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  disabled={!game.available}
                  className={`w-full p-3 rounded-lg text-left transition ${
                    selectedGame?.id === game.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : game.available
                      ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      : 'bg-gray-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{game.name}</div>
                      {game.nameJa && (
                        <div className="text-sm text-gray-600">{game.nameJa}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {game.minPlayers}-{game.maxPlayers} players • {game.duration} min
                      </div>
                      {!game.isRentable ? (
                        <div className="text-xs text-amber-600 mt-1">⚠️ Not set up for rental</div>
                      ) : (
                        <div className="text-xs text-blue-600 mt-1">Ready rental</div>
                      )}
                    </div>
                    <div className="text-right">
                      {game.available ? (
                        <>
                          <div className="text-sm font-medium">¥{game.fees.base + game.fees.premium}/base</div>
                          <div className="text-xs text-gray-500">+¥{game.fees.nightly}/night</div>
                          {game.isPremium && (
                            <div className="text-xs text-orange-600">Premium</div>
                          )}
                          {game.maxRentalDays && (
                            <div className="text-xs text-gray-500">Max {game.maxRentalDays} days</div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-red-600">
                          {game.isCurrentlyRented ? (
                            <>Rented until {game.expectedReturn && format(new Date(game.expectedReturn), 'MMM d')}</>
                          ) : (
                            <>Not available</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Customer & Details */}
          <div className="space-y-4">
            {/* Customer Selection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-4"
              />
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full p-2 rounded text-left ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-blue-100 border border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">
                      {customer.displayName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {customer.email} • {customer.phone}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rental Details */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Rental Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={selectedGame?.maxRentalDays ? 
                      new Date(Date.now() + selectedGame.maxRentalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
                      undefined
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Game Contents Photo (Required)
                  </label>
                  <input
                    type="text"
                    placeholder="Photo URL (temporary - will add upload)"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                {selectedGame && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="font-medium mb-2">Fee Breakdown</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Fee (10%):</span>
                        <span>¥{selectedGame.fees.base}</span>
                      </div>
                      {selectedGame.isPremium && (
                        <div className="flex justify-between text-orange-600">
                          <span>Premium Fee:</span>
                          <span>¥{selectedGame.fees.premium}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Nightly Fee:</span>
                        <span>¥{selectedGame.fees.nightly}/night</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Deposit (Hold):</span>
                        <span>¥{selectedGame.fees.deposit}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={!selectedGame || !selectedCustomer || !photoUrl || loading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Process Rental'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check In Tab */}
      {activeTab === 'checkin' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Select Rental to Return</h2>
          </div>
          <div className="divide-y">
            {activeRentals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No active rentals to return
              </div>
            ) : (
              activeRentals.map((rental) => (
                <div
                  key={rental.id}
                  className={`p-4 hover:bg-gray-50 transition ${
                    rental.isOverdue ? 'border-l-4 border-red-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{rental.game.name}</div>
                      <div className="text-sm text-gray-600">
                        {rental.customer.displayName || 
                         `${rental.customer.firstName || ''} ${rental.customer.lastName || ''}`.trim()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Out: {format(new Date(rental.checkOutDate), 'MMM d')} • 
                        Due: {format(new Date(rental.expectedReturnDate), 'MMM d')}
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      {rental.isOverdue ? (
                        <div className="text-red-600 font-medium">Overdue</div>
                      ) : (
                        <div className="text-gray-600">{rental.daysUntilDue} days left</div>
                      )}
                      <div className="text-sm text-gray-500">{rental.daysOut} days out</div>
                    </div>
                    <button
                      onClick={() => openReturnModal(rental)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Return
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* All Rentals Tab */}
      {activeTab === 'rentals' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allRentals.map((rental) => (
                <tr key={rental.id} className={rental.isOverdue ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{rental.game.name}</div>
                    {rental.game.nameJa && (
                      <div className="text-xs text-gray-500">{rental.game.nameJa}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {rental.customer.displayName || 
                     `${rental.customer.firstName || ''} ${rental.customer.lastName || ''}`.trim()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {format(new Date(rental.checkOutDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {rental.status === 'returned' && rental.actualReturnDate ? (
                      format(new Date(rental.actualReturnDate), 'MMM d, yyyy')
                    ) : (
                      <span className="text-gray-500">
                        Due: {format(new Date(rental.expectedReturnDate), 'MMM d')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {rental.status === 'returned' ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        Returned
                      </span>
                    ) : rental.isOverdue ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        Overdue
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ¥{rental.totalCharged || rental.depositAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Process Return</h2>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700">Returning:</h3>
              <div className="text-sm mt-1">
                <div className="font-medium">{selectedRental.game.name}</div>
                <div className="text-gray-600">
                  {selectedRental.customer.displayName || 
                   `${selectedRental.customer.firstName || ''} ${selectedRental.customer.lastName || ''}`.trim()}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              {/* Fee Breakdown */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-medium mb-2">Charges</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base Fee (10%):</span>
                    <span>¥{Math.floor((selectedRental.depositAmount || 5000) * 0.1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Rented ({selectedRental.daysOut || 1} days):</span>
                    <span>¥{100 * (selectedRental.daysOut || 1)}</span>
                  </div>
                  {damageFee > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Damage Fee:</span>
                      <span>¥{damageFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total Charge:</span>
                    <span>
                      ¥{Math.floor((selectedRental.depositAmount || 5000) * 0.1) + 
                        100 * (selectedRental.daysOut || 1) + 
                        damageFee}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Deposit to Release:</span>
                    <span>¥{selectedRental.depositAmount}</span>
                  </div>
                </div>
              </div>

              {/* Damage Fee Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damage Fee (if any)
                </label>
                <input
                  type="number"
                  value={damageFee}
                  onChange={(e) => setDamageFee(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              {/* Return Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Photo URL (optional - for damage documentation)
                </label>
                <input
                  type="text"
                  placeholder="Photo URL"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowReturnModal(false)
                  setSelectedRental(null)
                  setDamageFee(0)
                  setReturnNotes('')
                  setPhotoUrl('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckin}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Return & Charge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}