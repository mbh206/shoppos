'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'

type TimeEntry = {
  id: string
  userId: string
  clockIn: string
  clockOut?: string | null
  breakStart?: string | null
  breakEnd?: string | null
  regularHours: number
  overtimeHours: number
  totalHours: number
  status: string
  user: {
    id: string
    name: string
    employeeId: string
    email: string
  }
}

type Employee = {
  id: string
  name: string
  employeeId: string
  email: string
  totalHours: {
    today: number
    week: number
    month: number
  }
  entries: TimeEntry[]
}

type ViewPeriod = 'today' | 'week' | 'month' | 'custom'

export default function TimeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchTimeData()
  }, [viewPeriod, customStartDate, customEndDate])

  const fetchTimeData = async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date
      const now = new Date()
      
      switch (viewPeriod) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          endDate = new Date(now.setHours(23, 59, 59, 999))
          break
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 }) // Monday
          endDate = endOfWeek(now, { weekStartsOn: 1 })
          break
        case 'month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'custom':
          if (!customStartDate || !customEndDate) {
            setLoading(false)
            return
          }
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          break
      }
      
      const response = await fetch('/api/admin/time-entries?' + new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }))
      
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Failed to fetch time data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setShowEditModal(true)
  }

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'h:mm a')
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy')
  }

  const calculateDuration = (start: string, end?: string | null) => {
    if (!end) {
      const now = new Date()
      const minutes = differenceInMinutes(now, new Date(start))
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}h ${mins}m (ongoing)`
    }
    const minutes = differenceInMinutes(new Date(end), new Date(start))
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Date', 'Clock In', 'Clock Out', 'Break Start', 'Break End', 'Regular Hours', 'Overtime Hours', 'Total Hours']
    const rows = employees.flatMap(emp => 
      emp.entries.map(entry => [
        emp.employeeId,
        emp.name,
        formatDate(entry.clockIn),
        formatTime(entry.clockIn),
        formatTime(entry.clockOut),
        formatTime(entry.breakStart),
        formatTime(entry.breakEnd),
        entry.regularHours.toFixed(2),
        entry.overtimeHours.toFixed(2),
        entry.totalHours.toFixed(2)
      ])
    )
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-report-${viewPeriod}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6">
        {/* Period Selector */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as ViewPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setViewPeriod(period)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  viewPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
            <button
              onClick={() => setViewPeriod('custom')}
              className={`px-4 py-2 rounded-lg ${
                viewPeriod === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Custom Range
            </button>
          </div>
          
          {viewPeriod === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
          )}
          
          <button
            onClick={exportToCSV}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Employees</h2>
              </div>
              <div className="divide-y">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                      selectedEmployee?.id === employee.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-gray-500">ID: {employee.employeeId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {viewPeriod === 'today' && (
                            <span>{employee.totalHours.today.toFixed(1)}h today</span>
                          )}
                          {viewPeriod === 'week' && (
                            <span>{employee.totalHours.week.toFixed(1)}h this week</span>
                          )}
                          {viewPeriod === 'month' && (
                            <span>{employee.totalHours.month.toFixed(1)}h this month</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.entries.length} entries
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Entries Detail */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">{selectedEmployee.name}'s Time Entries</h2>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Today: {selectedEmployee.totalHours.today.toFixed(1)}h</span>
                    <span>Week: {selectedEmployee.totalHours.week.toFixed(1)}h</span>
                    <span>Month: {selectedEmployee.totalHours.month.toFixed(1)}h</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Clock In</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Clock Out</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Break</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Hours</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedEmployee.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{formatDate(entry.clockIn)}</td>
                          <td className="px-4 py-2 text-sm">{formatTime(entry.clockIn)}</td>
                          <td className="px-4 py-2 text-sm">
                            {entry.clockOut ? formatTime(entry.clockOut) : (
                              <span className="text-green-600 font-medium">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {entry.breakStart && entry.breakEnd ? 
                              calculateDuration(entry.breakStart, entry.breakEnd) : 
                              entry.breakStart ? 
                              <span className="text-yellow-600">On Break</span> : 
                              '-'
                            }
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {calculateDuration(entry.clockIn, entry.clockOut)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div>
                              <span className="font-medium">{entry.totalHours.toFixed(2)}</span>
                              {entry.overtimeHours > 0 && (
                                <span className="text-xs text-orange-600 ml-1">
                                  (OT: {entry.overtimeHours.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select an employee to view their time entries
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          onClose={() => {
            setShowEditModal(false)
            setEditingEntry(null)
          }}
          onSave={() => {
            setShowEditModal(false)
            setEditingEntry(null)
            fetchTimeData()
          }}
        />
      )}
    </div>
  )
}

// Edit Modal Component
function TimeEntryEditModal({ 
  entry, 
  onClose, 
  onSave 
}: { 
  entry: TimeEntry
  onClose: () => void
  onSave: () => void 
}) {
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [breakStart, setBreakStart] = useState('')
  const [breakEnd, setBreakEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Format dates for datetime-local input
    const formatForInput = (dateString: string | null | undefined) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toISOString().slice(0, 16)
    }
    
    setClockIn(formatForInput(entry.clockIn))
    setClockOut(formatForInput(entry.clockOut))
    setBreakStart(formatForInput(entry.breakStart))
    setBreakEnd(formatForInput(entry.breakEnd))
  }, [entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/time-entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockIn: new Date(clockIn).toISOString(),
          clockOut: clockOut ? new Date(clockOut).toISOString() : null,
          breakStart: breakStart ? new Date(breakStart).toISOString() : null,
          breakEnd: breakEnd ? new Date(breakEnd).toISOString() : null,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to update time entry')
        return
      }

      onSave()
    } catch (error) {
      setError('Failed to update time entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Edit Time Entry</h2>
        <p className="text-sm text-gray-600 mb-4">
          Employee: {entry.user.name} ({entry.user.employeeId})
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clock In
            </label>
            <input
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clock Out
            </label>
            <input
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break Start
            </label>
            <input
              type="datetime-local"
              value={breakStart}
              onChange={(e) => setBreakStart(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break End
            </label>
            <input
              type="datetime-local"
              value={breakEnd}
              onChange={(e) => setBreakEnd(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}