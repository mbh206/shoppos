'use client'

import { useState, useEffect } from 'react'

type Ingredient = {
  id: string
  name: string
  unit: string
  costPerUnit: number
  stockQuantity: number
  minStock: number
  maxStock: number | null
  reorderPoint: number | null
  reorderQuantity: number | null
  supplier: string | null
  supplierSKU: string | null
  leadTimeDays: number
  notes: string | null
  isActive: boolean
}

interface IngredientModalProps {
  ingredient: Ingredient | null
  onClose: () => void
  onSave: () => void
}

const UNITS = ['g', 'kg', 'ml', 'l', 'piece', 'slice', 'cup', 'tbsp', 'tsp', 'oz', 'lb']

export default function IngredientModal({ ingredient, onClose, onSave }: IngredientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'piece',
    costPerUnit: 0,
    stockQuantity: 0,
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    supplier: '',
    supplierSKU: '',
    leadTimeDays: 1,
    notes: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name || '',
        unit: ingredient.unit || 'piece',
        costPerUnit: ingredient.costPerUnit ? ingredient.costPerUnit / 100 : 0, // Convert from minor units
        stockQuantity: ingredient.stockQuantity || 0,
        minStock: ingredient.minStock || 0,
        maxStock: ingredient.maxStock || 0,
        reorderPoint: ingredient.reorderPoint || 0,
        reorderQuantity: ingredient.reorderQuantity || 0,
        supplier: ingredient.supplier || '',
        supplierSKU: ingredient.supplierSKU || '',
        leadTimeDays: ingredient.leadTimeDays || 1,
        notes: ingredient.notes || '',
        isActive: ingredient.isActive !== undefined ? ingredient.isActive : true,
      })
    }
  }, [ingredient])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.unit) {
      newErrors.unit = 'Unit is required'
    }
    if (formData.costPerUnit < 0) {
      newErrors.costPerUnit = 'Cost must be positive'
    }
    if (formData.stockQuantity < 0) {
      newErrors.stockQuantity = 'Stock quantity must be positive'
    }
    if (formData.minStock < 0) {
      newErrors.minStock = 'Minimum stock must be positive'
    }
    if (formData.maxStock && formData.maxStock < formData.minStock) {
      newErrors.maxStock = 'Maximum stock must be greater than minimum'
    }
    if (formData.reorderPoint && formData.reorderPoint < formData.minStock) {
      newErrors.reorderPoint = 'Reorder point should be at or above minimum stock'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }
    
    setSaving(true)
    
    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        costPerUnit: Math.round(formData.costPerUnit * 100), // Convert to minor units
        stockQuantity: formData.stockQuantity,
        minStock: formData.minStock,
        maxStock: formData.maxStock || null,
        reorderPoint: formData.reorderPoint || null,
        reorderQuantity: formData.reorderQuantity || null,
        supplier: formData.supplier || null,
        supplierSKU: formData.supplierSKU || null,
        leadTimeDays: formData.leadTimeDays,
        notes: formData.notes || null,
        isActive: formData.isActive,
      }

      const url = ingredient 
        ? `/api/admin/ingredients/${ingredient.id}`
        : '/api/admin/ingredients'
      
      const response = await fetch(url, {
        method: ingredient ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)
        throw new Error(error.error || 'Failed to save ingredient')
      }

      onSave()
    } catch (error) {
      console.error('Error saving ingredient:', error)
      alert(error instanceof Error ? error.message : 'Failed to save ingredient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {ingredient ? 'Edit Ingredient' : 'Add New Ingredient'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., White Bread"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className={`w-full px-3 py-2 border rounded ${errors.unit ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost per Unit (¥) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPerUnit || ''}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className={`w-full px-3 py-2 border rounded ${errors.costPerUnit ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0.00"
                />
                {errors.costPerUnit && <p className="text-red-500 text-xs mt-1">{errors.costPerUnit}</p>}
              </div>
            </div>
          </div>

          {/* Stock Management */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">Stock Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stock *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stockQuantity || ''}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className={`w-full px-3 py-2 border rounded ${errors.stockQuantity ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0"
                />
                {errors.stockQuantity && <p className="text-red-500 text-xs mt-1">{errors.stockQuantity}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stock *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minStock || ''}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className={`w-full px-3 py-2 border rounded ${errors.minStock ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0"
                />
                {errors.minStock && <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Stock
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.maxStock || ''}
                  onChange={(e) => setFormData({ ...formData, maxStock: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className={`w-full px-3 py-2 border rounded ${errors.maxStock ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Optional"
                />
                {errors.maxStock && <p className="text-red-500 text-xs mt-1">{errors.maxStock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Point
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.reorderPoint || ''}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className={`w-full px-3 py-2 border rounded ${errors.reorderPoint ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="When to reorder"
                />
                {errors.reorderPoint && <p className="text-red-500 text-xs mt-1">{errors.reorderPoint}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.reorderQuantity || ''}
                  onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="How much to order"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  value={formData.leadTimeDays || 1}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value ? parseInt(e.target.value) : 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">Supplier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier SKU
                </label>
                <input
                  type="text"
                  value={formData.supplierSKU}
                  onChange={(e) => setFormData({ ...formData, supplierSKU: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Product code"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="font-semibold mb-3">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={!!formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (uncheck to hide from menus)
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
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
              disabled={saving}
            >
              {saving ? 'Saving...' : (ingredient ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}