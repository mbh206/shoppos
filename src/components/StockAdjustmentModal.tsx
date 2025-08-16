'use client'

import { useState } from 'react'

type Ingredient = {
  id: string
  name: string
  unit: string
  stockQuantity: number
  costPerUnit: number
}

interface StockAdjustmentModalProps {
  ingredient: Ingredient
  onClose: () => void
  onSave: () => void
}

const ADJUSTMENT_TYPES = [
  { value: 'purchase', label: 'Purchase/Delivery', positive: true },
  { value: 'sale', label: 'Sale/Usage', positive: false },
  { value: 'waste', label: 'Waste/Spoilage', positive: false },
  { value: 'adjustment', label: 'Inventory Count Adjustment', positive: null },
  { value: 'return', label: 'Return to Supplier', positive: false },
]

export default function StockAdjustmentModal({ ingredient, onClose, onSave }: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState('adjustment')
  const [quantity, setQuantity] = useState(0)
  const [newTotal, setNewTotal] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [useNewTotal, setUseNewTotal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (useNewTotal && newTotal === null) {
      alert('Please enter the new total stock quantity')
      return
    }
    
    if (!useNewTotal && quantity === 0) {
      alert('Please enter an adjustment quantity')
      return
    }
    
    setSaving(true)
    
    try {
      // Calculate the actual quantity change
      let actualQuantity = quantity
      if (useNewTotal && newTotal !== null) {
        actualQuantity = newTotal - ingredient.stockQuantity
      }
      
      // Determine if this is an addition or subtraction
      const typeInfo = ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)
      if (typeInfo?.positive === false && actualQuantity > 0) {
        actualQuantity = -actualQuantity
      }
      
      const newStockQuantity = ingredient.stockQuantity + actualQuantity
      
      if (newStockQuantity < 0) {
        alert('Stock quantity cannot be negative')
        setSaving(false)
        return
      }
      
      const response = await fetch(`/api/admin/ingredients/${ingredient.id}/stock-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: adjustmentType,
          quantity: actualQuantity,
          newStockQuantity,
          notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to adjust stock')
      }

      onSave()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert(error instanceof Error ? error.message : 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const getAdjustmentPreview = () => {
    let actualQuantity = quantity
    if (useNewTotal && newTotal !== null) {
      actualQuantity = newTotal - ingredient.stockQuantity
    }
    
    const typeInfo = ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)
    if (typeInfo?.positive === false && actualQuantity > 0) {
      actualQuantity = -actualQuantity
    }
    
    const finalStock = ingredient.stockQuantity + actualQuantity
    
    return {
      change: actualQuantity,
      final: finalStock,
      valid: finalStock >= 0
    }
  }

  const preview = getAdjustmentPreview()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">
          Adjust Stock: {ingredient.name}
        </h2>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Current Stock</div>
          <div className="text-lg font-semibold">
            {ingredient.stockQuantity} {ingredient.unit}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              {ADJUSTMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="useNewTotal"
                checked={useNewTotal}
                onChange={(e) => setUseNewTotal(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useNewTotal" className="text-sm font-medium text-gray-700">
                Set new total quantity
              </label>
            </div>
            
            {useNewTotal ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Total Quantity ({ingredient.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTotal ?? ''}
                  onChange={(e) => setNewTotal(parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter new total"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Quantity ({ingredient.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter quantity"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)?.positive === false
                    ? 'This will be subtracted from stock'
                    : ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)?.positive === true
                    ? 'This will be added to stock'
                    : 'Enter positive to add, negative to subtract'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={2}
              placeholder="Reason for adjustment..."
            />
          </div>

          {/* Preview */}
          {(quantity !== 0 || (useNewTotal && newTotal !== null)) && (
            <div className={`p-3 rounded ${preview.valid ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className="text-sm font-medium mb-1">Preview</div>
              <div className="text-sm">
                Current: {ingredient.stockQuantity} {ingredient.unit}
              </div>
              <div className="text-sm">
                Change: {preview.change > 0 ? '+' : ''}{preview.change} {ingredient.unit}
              </div>
              <div className={`text-sm font-semibold ${preview.valid ? 'text-blue-700' : 'text-red-700'}`}>
                New Total: {preview.final} {ingredient.unit}
              </div>
              {!preview.valid && (
                <div className="text-xs text-red-600 mt-1">
                  Stock cannot be negative
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={saving || !preview.valid}
            >
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}