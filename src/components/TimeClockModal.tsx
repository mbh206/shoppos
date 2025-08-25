'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

type TimeEntry = {
  id: string
  userId: string
  clockIn: string
  clockOut?: string | null
  breakStart?: string | null
  breakEnd?: string | null
  totalHours: number
  user: {
    name: string
    employeeId: string
  }
}

type Employee = {
  id: string
  name: string
  employeeId: string
  email: string
  role: string
}

interface TimeClockModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: {
    id: string
    name: string
    role: string
  } | null
}

export default function TimeClockModal({ isOpen, onClose, currentUser }: TimeClockModalProps) {
  const [step, setStep] = useState<'auth' | 'status'>('auth')
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [currentShift, setCurrentShift] = useState<TimeEntry | null>(null)
  const [activeEmployees, setActiveEmployees] = useState<TimeEntry[]>([])
  const [showActiveList, setShowActiveList] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchActiveEmployees()
      setStep('auth')
      setEmployeeId('')
      setError('')
      setEmployee(null)
      setCurrentShift(null)
    }
  }, [isOpen])

  const fetchActiveEmployees = async () => {
    try {
      const response = await fetch('/api/time-clock/active')
      if (response.ok) {
        const data = await response.json()
        setActiveEmployees(data)
      }
    } catch (error) {
      console.error('Failed to fetch active employees:', error)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employeeId.trim()) {
      setError('Please enter your employee ID')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/time-clock/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Employee ID not found')
        setLoading(false)
        return
      }

      const data = await response.json()
      setEmployee(data.employee)
      setCurrentShift(data.currentShift)
      setStep('status')
    } catch (error) {
      setError('Failed to look up employee')
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = async () => {
    if (!employee) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/time-clock/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: employee.employeeId,
          userId: employee.id 
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to clock in')
        setLoading(false)
        return
      }

      const data = await response.json()
      setCurrentShift(data.timeEntry)
      fetchActiveEmployees()
    } catch (error) {
      setError('Failed to clock in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!employee || !currentShift) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/time-clock/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeEntryId: currentShift.id,
          userId: employee.id
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to clock out')
        setLoading(false)
        return
      }

      const data = await response.json()
      setCurrentShift(null)
      fetchActiveEmployees()
      
      // Show success message
      setError(`Clocked out successfully. Total hours: ${data.totalHours.toFixed(2)}`)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setError('Failed to clock out')
    } finally {
      setLoading(false)
    }
  }

  const handleBreak = async (action: 'start' | 'end') => {
    if (!employee || !currentShift) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/time-clock/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeEntryId: currentShift.id,
          action,
          userId: employee.id
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || `Failed to ${action} break`)
        setLoading(false)
        return
      }

      const data = await response.json()
      setCurrentShift(data.timeEntry)
    } catch (error) {
      setError(`Failed to ${action} break`)
    } finally {
      setLoading(false)
    }
  }

  const calculateElapsedTime = (start: string, end?: string | null) => {
    const startTime = new Date(start)
    const endTime = end ? new Date(end) : new Date()
    const diff = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time Clock
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Active Employees Summary */}
        <div className="mb-4 p-3 bg-brand-secondary-1 rounded-lg">
          <button
            onClick={() => setShowActiveList(!showActiveList)}
            className="w-full flex justify-between items-center text-sm"
          >
            <span className="font-medium text-brand-main">
              {activeEmployees.length} employees currently working
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${showActiveList ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showActiveList && activeEmployees.length > 0 && (
            <div className="mt-2 pt-2 border-t border-brand-accent-1">
              {activeEmployees.map((entry) => (
                <div key={entry.id} className="text-xs text-brand-main py-1 flex justify-between">
                  <span>{entry.user.name}</span>
                  <span>{calculateElapsedTime(entry.clockIn)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Authentication Step */}
        {step === 'auth' && (
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950"
                placeholder="Enter your employee ID (e.g., 001)"
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !employeeId.trim()}
              className="w-full py-2 bg-brand-main text-white rounded-lg hover:bg-brand-accent-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Looking up...' : 'Continue'}
            </button>
            
            <div className="text-xs text-gray-500 text-center">
              Enter your employee ID to clock in/out
            </div>
          </form>
        )}

        {/* Status Step */}
        {step === 'status' && employee && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Hi, {employee.name}!</h3>
              <p className="text-sm text-gray-600">Employee ID: {employee.employeeId}</p>
            </div>

            {currentShift ? (
              <div className="space-y-3">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-800">
                    <div className="flex justify-between mb-2">
                      <span>Clocked in:</span>
                      <span className="font-medium">
                        {format(new Date(currentShift.clockIn), 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time worked:</span>
                      <span className="font-medium">
                        {calculateElapsedTime(currentShift.clockIn)}
                      </span>
                    </div>
                    
                    {currentShift.breakStart && !currentShift.breakEnd && (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <div className="flex justify-between text-yellow-700">
                          <span>On break since:</span>
                          <span className="font-medium">
                            {format(new Date(currentShift.breakStart), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {currentShift.breakStart && !currentShift.breakEnd ? (
                    <button
                      onClick={() => handleBreak('end')}
                      disabled={loading}
                      className="col-span-2 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      End Break
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleBreak('start')}
                        disabled={loading || currentShift.breakStart !== null}
                        className="py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        Take Break
                      </button>
                      <button
                        onClick={handleClockOut}
                        disabled={loading}
                        className="py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Clock Out
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-gray-600">You are not clocked in</p>
                </div>
                
                <button
                  onClick={handleClockIn}
                  disabled={loading}
                  className="w-full py-3 bg-brand-main text-white rounded-lg hover:bg-brand-accent-2 disabled:opacity-50 text-lg font-medium"
                >
                  Clock In
                </button>
              </div>
            )}

            {error && (
              <div className={`text-sm p-2 rounded ${
                error.includes('successfully') 
                  ? 'bg-green-50 text-green-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {error}
              </div>
            )}

            {/* Manager Override Section */}
            {currentUser?.role === 'admin' || currentUser?.role === 'manager' ? (
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 text-center">
                  Manager mode: You can adjust times in the admin panel
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}