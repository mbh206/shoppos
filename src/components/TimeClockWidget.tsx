'use client'

import { useState, useEffect } from 'react'

type TimeEntry = {
  id: string
  clockIn: string
  clockOut: string | null
  breakStart: string | null
  breakEnd: string | null
  totalHours: number
}

type TimeClockWidgetProps = {
  userName?: string | null
  userEmail?: string
}

export default function TimeClockWidget({ userName, userEmail }: TimeClockWidgetProps = {}) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [todayHours, setTodayHours] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchTimeData()
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second
    
    return () => clearInterval(interval)
  }, [])

  const fetchTimeData = async () => {
    try {
      const response = await fetch('/api/time-clock')
      if (response.ok) {
        const data = await response.json()
        setActiveEntry(data.activeEntry)
        setTodayHours(data.todayHours)
      }
    } catch (error) {
      console.error('Error fetching time data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeAction = async (action: string) => {
    setProcessing(true)
    
    try {
      const response = await fetch('/api/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        await fetchTimeData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to process action')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to process action')
    } finally {
      setProcessing(false)
    }
  }

  const formatDuration = (start: string, end?: string | null) => {
    const startTime = new Date(start)
    const endTime = end ? new Date(end) : currentTime
    const diffMs = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-3">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  const isOnBreak = activeEntry?.breakStart && !activeEntry.breakEnd
  const isClockedIn = !!activeEntry && !activeEntry.clockOut

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {userName || userEmail || 'User'}
            </span>
            {isClockedIn && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                Working
              </span>
            )}
            {isOnBreak && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                On Break
              </span>
            )}
          </div>
          
          {isClockedIn && activeEntry && (
            <div className="text-xs text-gray-600 mt-1">
              Since {formatTime(new Date(activeEntry.clockIn))} • 
              {formatDuration(activeEntry.clockIn)}
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-1">
            Today: {todayHours.toFixed(2)} hours
          </div>
        </div>

        <div className="flex gap-2">
          {!isClockedIn ? (
            <button
              onClick={() => handleTimeAction('clock-in')}
              disabled={processing}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
            >
              Clock In
            </button>
          ) : (
            <>
              {!isOnBreak ? (
                <button
                  onClick={() => handleTimeAction('start-break')}
                  disabled={processing}
                  className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  Break
                </button>
              ) : (
                <button
                  onClick={() => handleTimeAction('end-break')}
                  disabled={processing}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Resume
                </button>
              )}
              <button
                onClick={() => handleTimeAction('clock-out')}
                disabled={processing}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
              >
                Clock Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}