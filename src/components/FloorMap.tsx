'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type SeatSession = {
  id: string
  startedAt: string
  customer?: {
    displayName?: string | null
  }
  order: {
    id: string
  }
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
  floor: number
  zone: string
  shape: 'rectangle' | 'circle' | 'booth' | 'bar'
  posX: number
  posY: number
  width: number
  height: number
  rotation: number
  seats: Seat[]
}

export default function FloorMap() {
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchFloorData()
    const interval = setInterval(fetchFloorData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchFloorData = async () => {
    try {
      const response = await fetch('/api/floor')
      const data = await response.json()
      if (Array.isArray(data)) {
        setTables(data)
      } else {
        setTables([])
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching floor data:', error)
      setTables([])
      setLoading(false)
    }
  }

  const getTableColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500'
      case 'seated':
        return 'bg-blue-500'
      case 'dirty':
        return 'bg-yellow-500'
      case 'reserved':
        return 'bg-purple-500'
      case 'offline':
        return 'bg-gray-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getOccupiedSeatsCount = (table: Table) => {
    return table.seats.filter(seat => seat.status === 'occupied').length
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading floor map...</div>
      </div>
    )
  }

  // Get unique floors from tables
  const floors = [...new Set(tables.map(t => t.floor))].sort()

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Floor Map</h1>
          {floors.length > 1 && (
            <div className="flex gap-2">
              {floors.map(floor => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-3 py-1 rounded ${
                    selectedFloor === floor
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Floor {floor}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm">Seated</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm">Dirty</span>
          </div>
          {/* <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
            <span className="text-sm">Reserved</span>
          </div> */}
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
            <span className="text-sm">Offline</span>
          </div>
        </div>
      </div>

      <div className="relative bg-gray-100 rounded-lg" style={{ height: '600px', width: '100%' }}>
        {tables.filter(table => table.floor === selectedFloor).map((table) => {
          // Apply shape-specific styles
          const isCircle = table.shape === 'circle'
          const borderRadius = isCircle ? '50%' : '8px'
          
          return (
            <div
              key={table.id}
              className={`absolute p-2 cursor-pointer transition-all hover:scale-105 ${getTableColor(
                table.status
              )} text-white flex flex-col justify-center items-center`}
              style={{
                left: `${table.posX}px`,
                top: `${table.posY}px`,
                width: `${table.width}px`,
                height: `${table.height}px`,
                transform: `rotate(${table.rotation}deg)`,
                transformOrigin: 'center',
                borderRadius: borderRadius,
              }}
              onClick={() => router.push(`/floor/table/${table.id}`)}
            >
              <div 
                className="text-sm flex flex-col items-center justify-center"
                style={{ transform: `rotate(-${table.rotation}deg)` }}
              >
                <div className="font-bold text-center">
                  {table.name}
                </div>
                <div className="text-xs text-center">
                  {getOccupiedSeatsCount(table)}/{table.capacity} seats
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}