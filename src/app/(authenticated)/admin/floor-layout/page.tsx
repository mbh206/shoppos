'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FloorEditor from '@/components/FloorEditor'
import TableTemplates from '@/components/TableTemplates'
import './styles.css'

type Table = {
  id: string
  name: string
  capacity: number
  floor: number
  zone: string
  shape: 'rectangle' | 'circle' | 'bar'
  posX: number
  posY: number
  width: number
  height: number
  rotation: number
  status: string
}

export default function FloorLayoutPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/admin/tables')
      if (!response.ok) {
        console.error('Failed to fetch tables:', response.statusText)
        setTables([])
        setLoading(false)
        return
      }
      const data = await response.json()
      // Ensure we have an array
      if (Array.isArray(data)) {
        setTables(data)
      } else {
        console.error('Unexpected data format:', data)
        setTables([])
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tables:', error)
      setTables([])
      setLoading(false)
    }
  }

  const handleSaveLayout = async () => {
    try {
      const response = await fetch('/api/admin/tables/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables }),
      })
      
      if (response.ok) {
        alert('Layout saved successfully!')
        setEditMode(false)
        // Refresh the tables from the database
        await fetchTables()
      } else {
        const error = await response.text()
        console.error('Error response:', error)
        alert('Failed to save layout')
      }
    } catch (error) {
      console.error('Error saving layout:', error)
      alert('Failed to save layout')
    }
  }

  const handleAddTable = (template: any) => {
    const newTable: Table = {
      id: `temp_${Date.now()}`,
      name: `${template.type}-${tables.length + 1}`,
      capacity: template.seats,
      floor: selectedFloor,
      zone: template.zone || 'main',
      shape: template.shape,
      posX: 100,
      posY: 100,
      width: template.width || 100,
      height: template.height || 100,
      rotation: 0,
      status: 'available',
    }
    setTables([...tables, newTable])
  }

  const handleUpdateTable = (updatedTable: Table) => {
    setTables(tables.map(t => t.id === updatedTable.id ? updatedTable : t))
  }

  const handleDeleteTable = (tableId: string) => {
    if (confirm('Are you sure you want to delete this table?')) {
      setTables(tables.filter(t => t.id !== tableId))
      setSelectedTable(null)
    }
  }

  const floors = [1, 2] // You can make this dynamic later
  const zones = ['main', 'bar', 'outdoor', 'private']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading floor layout...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Floor Layout Manager</h1>
          <p className="text-gray-600 mt-2">Design and manage your restaurant floor plan</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back to Admin
          </button>
          {editMode ? (
            <>
              <button
                onClick={() => {
                  setEditMode(false)
                  fetchTables() // Reset changes
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLayout}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save Layout
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit Layout
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel - Floors and Templates */}
        <div className="lg:col-span-1 space-y-6">
          {/* Floor Selector */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Floors</h3>
            <div className="space-y-2">
              {floors.map(floor => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`w-full px-3 py-2 rounded text-left transition-colors ${
                    selectedFloor === floor
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Floor {floor}
                </button>
              ))}
              {editMode && (
                <button className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-gray-400">
                  + Add Floor
                </button>
              )}
            </div>
          </div>

          {/* Table Templates */}
          {editMode && (
            <TableTemplates onAddTable={handleAddTable} />
          )}
        </div>

        {/* Middle Panel - Floor Map */}
        <div className={`${editMode && selectedTable ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <FloorEditor
            tables={Array.isArray(tables) ? tables.filter(t => t.floor === selectedFloor) : []}
            editMode={editMode}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            onUpdateTable={handleUpdateTable}
          />
        </div>

        {/* Right Panel - Selected Table Properties */}
        {editMode && selectedTable && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-6">
              <h3 className="font-semibold mb-3 text-lg">Table Properties</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedTable.name}
                    onChange={(e) => handleUpdateTable({
                      ...selectedTable,
                      name: e.target.value,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={selectedTable.capacity}
                      onChange={(e) => handleUpdateTable({
                        ...selectedTable,
                        capacity: parseInt(e.target.value) || 1,
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <span className="text-sm text-gray-500">seats</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                  <select
                    value={selectedTable.zone}
                    onChange={(e) => handleUpdateTable({
                      ...selectedTable,
                      zone: e.target.value,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {zones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                  <select
                    value={selectedTable.shape === 'booth' ? 'rectangle' : selectedTable.shape}
                    onChange={(e) => handleUpdateTable({
                      ...selectedTable,
                      shape: e.target.value as any,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="bar">Counter Seat</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rotation: <span className="font-normal text-blue-600">{selectedTable.rotation}°</span>
                  </label>
                  <button
                    onClick={() => {
                      // Rotate by 45 degrees clockwise
                      const newRotation = (selectedTable.rotation + 45) % 360
                      handleUpdateTable({
                        ...selectedTable,
                        rotation: newRotation,
                      })
                    }}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rotate 45° Clockwise
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">X</label>
                      <input
                        type="number"
                        value={selectedTable.posX}
                        onChange={(e) => handleUpdateTable({
                          ...selectedTable,
                          posX: parseInt(e.target.value) || 0,
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Y</label>
                      <input
                        type="number"
                        value={selectedTable.posY}
                        onChange={(e) => handleUpdateTable({
                          ...selectedTable,
                          posY: parseInt(e.target.value) || 0,
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Width</label>
                      <input
                        type="number"
                        value={selectedTable.width}
                        onChange={(e) => handleUpdateTable({
                          ...selectedTable,
                          width: parseInt(e.target.value) || 100,
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Height</label>
                      <input
                        type="number"
                        value={selectedTable.height}
                        onChange={(e) => handleUpdateTable({
                          ...selectedTable,
                          height: parseInt(e.target.value) || 100,
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <button
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Tables</div>
          <div className="text-2xl font-bold">{Array.isArray(tables) ? tables.length : 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Seats</div>
          <div className="text-2xl font-bold">
            {Array.isArray(tables) ? tables.reduce((sum, t) => sum + t.capacity, 0) : 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Floor {selectedFloor} Tables</div>
          <div className="text-2xl font-bold">
            {Array.isArray(tables) ? tables.filter(t => t.floor === selectedFloor).length : 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Floor {selectedFloor} Seats</div>
          <div className="text-2xl font-bold">
            {Array.isArray(tables) ? tables.filter(t => t.floor === selectedFloor).reduce((sum, t) => sum + t.capacity, 0) : 0}
          </div>
        </div>
      </div>
    </div>
  )
}