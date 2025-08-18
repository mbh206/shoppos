'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Supply = {
  id: string
  name: string
  category: string | null
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

const SUPPLY_CATEGORIES = [
  'Packaging',
  'Cleaning',
  'Office',
  'Disposables',
  'Maintenance',
  'Other'
]

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'pack',
    costPerUnit: '',
    stockQuantity: '',
    minStock: '',
    maxStock: '',
    reorderPoint: '',
    reorderQuantity: '',
    supplier: '',
    supplierSKU: '',
    leadTimeDays: '1',
    notes: '',
    isActive: true
  })

  useEffect(() => {
    fetchSupplies()
  }, [])

  useEffect(() => {
    if (editingSupply) {
      setFormData({
        name: editingSupply.name,
        category: editingSupply.category || '',
        unit: editingSupply.unit,
        costPerUnit: (editingSupply.costPerUnit / 100).toString(),
        stockQuantity: editingSupply.stockQuantity.toString(),
        minStock: editingSupply.minStock.toString(),
        maxStock: editingSupply.maxStock?.toString() || '',
        reorderPoint: editingSupply.reorderPoint?.toString() || '',
        reorderQuantity: editingSupply.reorderQuantity?.toString() || '',
        supplier: editingSupply.supplier || '',
        supplierSKU: editingSupply.supplierSKU || '',
        leadTimeDays: editingSupply.leadTimeDays.toString(),
        notes: editingSupply.notes || '',
        isActive: editingSupply.isActive
      })
    } else {
      setFormData({
        name: '',
        category: '',
        unit: 'pack',
        costPerUnit: '',
        stockQuantity: '',
        minStock: '',
        maxStock: '',
        reorderPoint: '',
        reorderQuantity: '',
        supplier: '',
        supplierSKU: '',
        leadTimeDays: '1',
        notes: '',
        isActive: true
      })
    }
  }, [editingSupply])

  const fetchSupplies = async () => {
    try {
      const response = await fetch('/api/admin/supplies')
      if (response.ok) {
        const data = await response.json()
        setSupplies(data)
      }
    } catch (error) {
      console.error('Error fetching supplies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      name: formData.name,
      category: formData.category || null,
      unit: formData.unit,
      costPerUnit: Math.round(parseFloat(formData.costPerUnit || '0') * 100),
      stockQuantity: parseFloat(formData.stockQuantity || '0'),
      minStock: parseFloat(formData.minStock || '0'),
      maxStock: formData.maxStock ? parseFloat(formData.maxStock) : null,
      reorderPoint: formData.reorderPoint ? parseFloat(formData.reorderPoint) : null,
      reorderQuantity: formData.reorderQuantity ? parseFloat(formData.reorderQuantity) : null,
      supplier: formData.supplier || null,
      supplierSKU: formData.supplierSKU || null,
      leadTimeDays: parseInt(formData.leadTimeDays || '1'),
      notes: formData.notes || null,
      isActive: formData.isActive
    }

    try {
      const url = editingSupply 
        ? `/api/admin/supplies/${editingSupply.id}`
        : '/api/admin/supplies'
      
      const response = await fetch(url, {
        method: editingSupply ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowModal(false)
        setEditingSupply(null)
        fetchSupplies()
      } else {
        alert('Failed to save supply')
      }
    } catch (error) {
      console.error('Error saving supply:', error)
      alert('Failed to save supply')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supply item?')) return

    try {
      const response = await fetch(`/api/admin/supplies/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchSupplies()
      } else {
        alert('Failed to delete supply')
      }
    } catch (error) {
      console.error('Error deleting supply:', error)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  const filteredSupplies = supplies.filter(supply => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'uncategorized') return !supply.category
    return supply.category === selectedCategory
  })

  const lowStockSupplies = supplies.filter(s => 
    s.reorderPoint && s.stockQuantity <= s.reorderPoint
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading supplies...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/inventory"
          className="text-blue-500 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Inventory
        </Link>
        
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Supplies Inventory</h1>
          <button
            onClick={() => {
              setEditingSupply(null)
              setShowModal(true)
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Supply Item
          </button>
        </div>

        {/* Low Stock Alert */}
        {lowStockSupplies.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-yellow-800 mb-2">Low Stock Alert</h3>
            <div className="text-sm text-yellow-700">
              {lowStockSupplies.map(supply => (
                <div key={supply.id}>
                  {supply.name}: {supply.stockQuantity} {supply.unit} 
                  (reorder at {supply.reorderPoint})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All ({supplies.length})
          </button>
          {SUPPLY_CATEGORIES.map(category => {
            const count = supplies.filter(s => s.category === category).length
            if (count === 0) return null
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {category} ({count})
              </button>
            )
          })}
          {supplies.some(s => !s.category) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                selectedCategory === 'uncategorized'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Uncategorized ({supplies.filter(s => !s.category).length})
            </button>
          )}
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reorder
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSupplies.map((supply) => {
                const needsReorder = supply.reorderPoint && supply.stockQuantity <= supply.reorderPoint
                const outOfStock = supply.stockQuantity === 0
                
                return (
                  <tr key={supply.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supply.name}</div>
                      {supply.supplierSKU && (
                        <div className="text-xs text-gray-500">SKU: {supply.supplierSKU}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supply.category || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        outOfStock ? 'text-red-600' : 
                        needsReorder ? 'text-yellow-600' : 
                        'text-gray-900'
                      }`}>
                        {supply.stockQuantity} {supply.unit}
                      </div>
                      {supply.minStock > 0 && (
                        <div className="text-xs text-gray-500">
                          Min: {supply.minStock}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(supply.costPerUnit)}/{supply.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMoney(supply.stockQuantity * supply.costPerUnit)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supply.reorderPoint ? (
                        <div>
                          <div>At: {supply.reorderPoint}</div>
                          {supply.reorderQuantity && (
                            <div className="text-xs text-gray-500">
                              Qty: {supply.reorderQuantity}
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supply.supplier || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {outOfStock ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          Out of Stock
                        </span>
                      ) : needsReorder ? (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setEditingSupply(supply)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(supply.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {filteredSupplies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No supplies found. Click "Add Supply Item" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSupply ? 'Edit Supply Item' : 'Add Supply Item'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">Select category</option>
                    {SUPPLY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., pack, box, roll"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost per Unit (¥) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reorderQuantity}
                    onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
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
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingSupply(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingSupply ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}