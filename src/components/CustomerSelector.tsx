'use client'

import { useState, useEffect } from 'react'

type Customer = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  firstNameJa?: string | null
  lastNameJa?: string | null
  displayName?: string | null
  phone?: string | null
  _count?: {
    seatSessions: number
    orders: number
  }
}

type CustomerSelectorProps = {
  onSelectCustomer: (customer: Customer | null) => void
  onClose: () => void
}

export default function CustomerSelector({ onSelectCustomer, onClose }: CustomerSelectorProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    firstNameJa: '',
    lastNameJa: '',
    email: '',
    phone: '',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchCustomers()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchCustomers = async () => {
    setSearching(true)
    setError('')
    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.email || !newCustomer.firstName) {
      setError('First name and email are required')
      return
    }

    setCreating(true)
    setError('')
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      })

      if (response.ok) {
        const customer = await response.json()
        onSelectCustomer(customer)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create customer 1')
      }
    } catch (error) {
      setError(`Failed to create customer 2 ${newCustomer.email}`)
    } finally {
      setCreating(false)
    }
  }

  const handleSkip = () => {
    onSelectCustomer(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Customer Information</h2>

        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('search')}
              className={`px-4 py-2 rounded ${
                mode === 'search'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Returning Customer
            </button>
            <button
              onClick={() => setMode('create')}
              className={`px-4 py-2 rounded ${
                mode === 'create'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              New Customer
            </button>
          </div>

          {mode === 'search' && (
            <div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />

              {searching && (
                <div className="text-center py-4 text-gray-500">Searching...</div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => onSelectCustomer(customer)}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="font-medium">{customer.displayName || customer.email}</div>
                      <div className="text-sm text-gray-600">{customer.email}</div>
                      {customer._count && (
                        <div className="text-xs text-gray-500 mt-1">
                          {customer._count.seatSessions} visit{customer._count.seatSessions !== 1 ? 's' : ''} • 
                          {' '}{customer._count.orders} order{customer._count.orders !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="text-center py-4 text-gray-500">
                  No customers found. Try creating a new customer.
                </div>
              )}
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={newCustomer.firstName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newCustomer.lastName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="名 (First Name in Japanese)"
                  value={newCustomer.firstNameJa}
                  onChange={(e) => setNewCustomer({ ...newCustomer, firstNameJa: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="姓 (Last Name in Japanese)"
                  value={newCustomer.lastNameJa}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastNameJa: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <input
                type="email"
                placeholder="Email *"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <button
                onClick={handleCreateCustomer}
                disabled={creating}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {creating ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Skip (No Profile)
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}