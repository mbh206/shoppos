'use client'

import { useState, useRef, useEffect } from 'react'

type Table = {
  id: string
  name: string
  capacity: number
  floor: number
  zone: string
  shape: 'rectangle' | 'circle' | 'booth' | 'bar'
  posX: number
  posY: number
  width: number
  height: number
  rotation: number
  status: string
}

type FloorEditorProps = {
  tables: Table[]
  editMode: boolean
  selectedTable: Table | null
  onSelectTable: (table: Table | null) => void
  onUpdateTable: (table: Table) => void
}

export default function FloorEditor({
  tables,
  editMode,
  selectedTable,
  onSelectTable,
  onUpdateTable,
}: FloorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [tableStart, setTableStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent, table: Table, action: 'move' | 'resize') => {
    if (!editMode) return
    
    e.preventDefault()
    e.stopPropagation()
    
    onSelectTable(table)
    setDragStart({ x: e.clientX, y: e.clientY })
    setTableStart({ 
      x: table.posX, 
      y: table.posY, 
      width: table.width, 
      height: table.height 
    })
    
    if (action === 'move') {
      setIsDragging(true)
    } else {
      setIsResizing(true)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!selectedTable) return

    const deltaX = (e.clientX - dragStart.x) / zoom
    const deltaY = (e.clientY - dragStart.y) / zoom

    if (isDragging) {
      onUpdateTable({
        ...selectedTable,
        posX: Math.max(0, tableStart.x + deltaX),
        posY: Math.max(0, tableStart.y + deltaY),
      })
    } else if (isResizing) {
      onUpdateTable({
        ...selectedTable,
        width: Math.max(50, tableStart.width + deltaX),
        height: Math.max(50, tableStart.height + deltaY),
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, selectedTable, dragStart, tableStart])

  const getTableColor = (table: Table) => {
    if (selectedTable?.id === table.id) return 'ring-2 ring-blue-500'
    
    switch (table.zone) {
      case 'bar': return 'bg-purple-200'
      case 'booth': return 'bg-green-200'
      case 'outdoor': return 'bg-yellow-200'
      default: return 'bg-gray-200'
    }
  }

  const renderTableShape = (table: Table) => {
    const isSelected = selectedTable?.id === table.id
    const color = getTableColor(table)
    
    switch (table.shape) {
      case 'circle':
        return (
          <div
            key={table.id}
            className={`absolute flex flex-col items-center justify-center rounded-full ${color} border-2 border-gray-400 ${
              editMode ? 'cursor-move hover:shadow-lg' : 'cursor-pointer'
            } ${isSelected ? 'z-10' : ''}`}
            style={{
              left: `${table.posX}px`,
              top: `${table.posY}px`,
              width: `${table.width}px`,
              height: `${table.height}px`,
              transform: `rotate(${table.rotation}deg)`,
            }}
            onMouseDown={(e) => editMode && handleMouseDown(e, table, 'move')}
            onClick={() => !editMode && onSelectTable(table)}
          >
            <div className="text-xs font-bold">{table.name}</div>
            <div className="text-xs">{table.capacity} seats</div>
            {editMode && isSelected && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                onMouseDown={(e) => handleMouseDown(e, table, 'resize')}
              />
            )}
          </div>
        )
      
      case 'booth':
        return (
          <div
            key={table.id}
            className={`absolute flex flex-col items-center justify-center ${color} border-2 border-gray-400 rounded-lg ${
              editMode ? 'cursor-move hover:shadow-lg' : 'cursor-pointer'
            } ${isSelected ? 'z-10' : ''}`}
            style={{
              left: `${table.posX}px`,
              top: `${table.posY}px`,
              width: `${table.width}px`,
              height: `${table.height}px`,
              transform: `rotate(${table.rotation}deg)`,
              borderRadius: '8px 8px 24px 24px',
            }}
            onMouseDown={(e) => editMode && handleMouseDown(e, table, 'move')}
            onClick={() => !editMode && onSelectTable(table)}
          >
            <div className="text-xs font-bold">{table.name}</div>
            <div className="text-xs">{table.capacity} seats</div>
            {editMode && isSelected && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                onMouseDown={(e) => handleMouseDown(e, table, 'resize')}
              />
            )}
          </div>
        )
      
      case 'bar':
        return (
          <div
            key={table.id}
            className={`absolute flex items-center justify-center ${color} border-2 border-gray-400 rounded ${
              editMode ? 'cursor-move hover:shadow-lg' : 'cursor-pointer'
            } ${isSelected ? 'z-10' : ''}`}
            style={{
              left: `${table.posX}px`,
              top: `${table.posY}px`,
              width: `${table.width}px`,
              height: `${table.height}px`,
              transform: `rotate(${table.rotation}deg)`,
            }}
            onMouseDown={(e) => editMode && handleMouseDown(e, table, 'move')}
            onClick={() => !editMode && onSelectTable(table)}
          >
            <div className="flex items-center gap-2">
              {Array.from({ length: table.capacity }).map((_, i) => (
                <div key={i} className="w-6 h-6 bg-gray-400 rounded-full" />
              ))}
            </div>
            <div className="absolute -top-6 text-xs font-bold">{table.name}</div>
            {editMode && isSelected && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                onMouseDown={(e) => handleMouseDown(e, table, 'resize')}
              />
            )}
          </div>
        )
      
      default: // rectangle
        return (
          <div
            key={table.id}
            className={`absolute flex flex-col items-center justify-center ${color} border-2 border-gray-400 rounded ${
              editMode ? 'cursor-move hover:shadow-lg' : 'cursor-pointer'
            } ${isSelected ? 'z-10' : ''}`}
            style={{
              left: `${table.posX}px`,
              top: `${table.posY}px`,
              width: `${table.width}px`,
              height: `${table.height}px`,
              transform: `rotate(${table.rotation}deg)`,
            }}
            onMouseDown={(e) => editMode && handleMouseDown(e, table, 'move')}
            onClick={() => !editMode && onSelectTable(table)}
          >
            <div className="text-xs font-bold">{table.name}</div>
            <div className="text-xs">{table.capacity} seats</div>
            {editMode && isSelected && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                onMouseDown={(e) => handleMouseDown(e, table, 'resize')}
              />
            )}
          </div>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Floor Layout</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            -
          </button>
          <span className="px-2 py-1">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            +
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative bg-gray-50 border-2 border-gray-200 rounded overflow-hidden"
        style={{ 
          height: '600px',
          cursor: editMode ? 'crosshair' : 'default',
        }}
        onClick={(e) => {
          if (editMode && e.target === e.currentTarget) {
            onSelectTable(null)
          }
        }}
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'top left',
          }}
        >
          {/* Grid lines for guidance */}
          {editMode && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute w-full border-t border-gray-300 opacity-20"
                  style={{ top: `${i * 50}px` }}
                />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute h-full border-l border-gray-300 opacity-20"
                  style={{ left: `${i * 50}px` }}
                />
              ))}
            </div>
          )}
          
          {/* Render tables */}
          {tables.map(table => renderTableShape(table))}
        </div>
      </div>
      
      {editMode && (
        <div className="mt-2 text-xs text-gray-500">
          Click and drag to move tables. Click the blue handle to resize. Click empty space to deselect.
        </div>
      )}
    </div>
  )
}