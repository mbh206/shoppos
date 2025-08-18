'use client'

import { useState, useEffect } from 'react'

type SeatSession = {
  id: string
  seat: {
    id: string
    number: number
    table: {
      id: string
      name: string
    }
  }
  customer?: {
    id: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  order: {
    id: string
    items: Array<{
      id: string
      name: string
      totalMinor: number
    }>
  }
  startedAt: string
  billedMinutes: number
  mergedToSessionId?: string | null
}

type MergeBillsModalProps = {
  onClose: () => void
  onMergeComplete: () => void
}

export default function MergeBillsModal({ onClose, onMergeComplete }: MergeBillsModalProps) {
  const [sessions, setSessions] = useState<SeatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [primarySessionId, setPrimarySessionId] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    fetchActiveSessions()
  }, [])

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/seats/active-sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSelection = prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
      
      // If unselecting the primary session, clear it
      if (!newSelection.includes(sessionId) && primarySessionId === sessionId) {
        setPrimarySessionId(null)
      }
      
      // If only one session selected, make it primary
      if (newSelection.length === 1) {
        setPrimarySessionId(newSelection[0])
      }
      
      return newSelection
    })
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100).toLocaleString('ja-JP')}`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getSessionTotal = (session: SeatSession) => {
    return session.order.items
      .filter(item => !(item as any).meta?.isGame)
      .reduce((sum, item) => sum + item.totalMinor, 0)
  }

  const getTotalAmount = () => {
    return selectedSessions.reduce((sum, sessionId) => {
      const session = sessions.find(s => s.id === sessionId)
      return sum + (session ? getSessionTotal(session) : 0)
    }, 0)
  }

  const handleMergeBills = async () => {
    if (selectedSessions.length < 2 || !primarySessionId) {
      alert('Please select at least 2 sessions and a primary payer')
      return
    }

    setMerging(true)
    try {
      // Send all OTHER sessions (not including primary) to be merged INTO the primary
      const sessionsToMergeIntoPrimary = selectedSessions.filter(id => id !== primarySessionId)
      
      console.log('Merging sessions:', sessionsToMergeIntoPrimary, 'into primary:', primarySessionId)
      
      const response = await fetch('/api/seats/merge-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionIds: sessionsToMergeIntoPrimary,
          primarySessionId,
        }),
      })

      if (response.ok) {
        onMergeComplete()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to merge bills')
      }
    } catch (error) {
      console.error('Error merging bills:', error)
      alert('Failed to merge bills')
    } finally {
      setMerging(false)
    }
  }

  // Group sessions by merge status
  const availableSessions = sessions.filter(s => !s.mergedToSessionId)
  const mergedSessions = sessions.filter(s => s.mergedToSessionId)

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6">
          <div className="text-xl">Loading active sessions...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Merge Bills</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Select multiple unpaid bills (with stopped timers) to merge them into one. The primary payer will receive the combined bill.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {availableSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No unpaid bills available to merge. Bills must have stopped timers to be merged.
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Unpaid Bills (Ready for Checkout)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSessions.map((session) => {
                  const isSelected = selectedSessions.includes(session.id)
                  const isPrimary = primarySessionId === session.id
                  const total = getSessionTotal(session)

                  return (
                    <div
                      key={session.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? isPrimary
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => toggleSessionSelection(session.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5"
                          />
                          <div>
                            <div className="font-semibold">
                              {session.seat.table.name} - Seat {session.seat.number}
                            </div>
                            <div className="text-sm text-gray-600">
                              {session.customer?.displayName || session.customer?.firstName || 'Guest'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Duration: {formatDuration(session.billedMinutes)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatMoney(total)}</div>
                          {isPrimary && (
                            <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded">
                              Primary Payer
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && selectedSessions.length > 1 && !isPrimary && (
                        <div className="mt-3 pt-3 border-t">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPrimarySessionId(session.id)
                            }}
                            className="text-sm text-purple-600 hover:text-purple-800"
                          >
                            Set as primary payer
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {mergedSessions.length > 0 && (
                <>
                  <h3 className="font-semibold text-lg mt-6">Already Merged</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50">
                    {mergedSessions.map((session) => {
                      const primarySession = sessions.find(s => s.id === session.mergedToSessionId)
                      return (
                        <div
                          key={session.id}
                          className="border border-gray-300 rounded-lg p-4 bg-gray-50"
                        >
                          <div className="font-semibold">
                            {session.seat.table.name} - Seat {session.seat.number}
                          </div>
                          <div className="text-sm text-gray-600">
                            {session.customer?.displayName || session.customer?.firstName || 'Guest'}
                          </div>
                          <div className="text-sm text-red-600 mt-2">
                            Merged to: {primarySession?.seat.table.name} Seat {primarySession?.seat.number}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {selectedSessions.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-sm text-gray-600">
                  Selected: {selectedSessions.length} session{selectedSessions.length !== 1 ? 's' : ''}
                </div>
                {primarySessionId && (
                  <div className="text-sm text-purple-600">
                    Primary payer: {
                      sessions.find(s => s.id === primarySessionId)?.seat.table.name
                    } Seat {
                      sessions.find(s => s.id === primarySessionId)?.seat.number
                    }
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Combined Total</div>
                <div className="text-2xl font-bold">{formatMoney(getTotalAmount())}</div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeBills}
                disabled={selectedSessions.length < 2 || !primarySessionId || merging}
                className={`px-4 py-2 rounded text-white ${
                  selectedSessions.length < 2 || !primarySessionId || merging
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {merging ? 'Merging...' : 'Merge Bills'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}