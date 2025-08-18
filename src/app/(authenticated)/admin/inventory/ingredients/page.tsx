'use client'

import { useState, useEffect } from 'react'
import IngredientModal from '@/components/IngredientModal'
import Link from 'next/link'

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
  lastRestocked: string | null
  expiryDate: string | null
  notes: string | null
  isActive: boolean
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [filter, setFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('all')

  useEffect(() => {
    fetchIngredients()
  }, [])

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/admin/ingredients')
      if (response.ok) {
        const data = await response.json()
        setIngredients(Array.isArray(data) ? data : [])
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching ingredients:', error)
      setIngredients([])
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100)}`
  }

  const getStockStatus = (ingredient: Ingredient) => {
    if (ingredient.stockQuantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    }
    if (ingredient.reorderPoint && ingredient.stockQuantity <= ingredient.reorderPoint) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' }
    }
    if (ingredient.maxStock && ingredient.stockQuantity >= ingredient.maxStock * 0.9) {
      return { label: 'Overstocked', color: 'bg-orange-100 text-orange-800' }
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/ingredients/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchIngredients()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete ingredient')
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error)
      alert('Failed to delete ingredient')
    }
  }

  const filteredIngredients = ingredients.filter(ing => {
    if (filter && !ing.name.toLowerCase().includes(filter.toLowerCase()) && 
        !(ing.supplier && ing.supplier.toLowerCase().includes(filter.toLowerCase()))) {
      return false
    }
    if (stockFilter === 'out' && ing.stockQuantity > 0) return false
    if (stockFilter === 'low') {
      const status = getStockStatus(ing)
      if (status.label !== 'Low Stock') return false
    }
    if (stockFilter === 'in' && ing.stockQuantity === 0) return false
    return true
  })


  const totalInventoryValue = ingredients.reduce((sum, ing) => {
    return sum + (ing.stockQuantity * ing.costPerUnit)
  }, 0)

  const lowStockCount = ingredients.filter(ing => {
    const status = getStockStatus(ing)
    return status.label === 'Low Stock' || status.label === 'Out of Stock'
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading ingredients...</div>
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
        <h1 className="text-2xl font-bold mb-4">Ingredient Inventory</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Items</div>
            <div className="text-2xl font-bold">{ingredients.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Value</div>
            <div className="text-2xl font-bold">{formatMoney(totalInventoryValue)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Low Stock Items</div>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">
              {ingredients.filter(i => i.stockQuantity === 0).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search ingredients..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded flex-1"
            />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Ingredient
            </button>
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngredients.map((ingredient) => {
                  const status = getStockStatus(ingredient)
                  return (
                    <tr 
                      key={ingredient.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setEditingIngredient(ingredient)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ingredient.name}
                        </div>
                        {ingredient.supplierSKU && (
                          <div className="text-xs text-gray-500">
                            SKU: {ingredient.supplierSKU}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {ingredient.stockQuantity} {ingredient.unit}
                        </div>
                        {ingredient.reorderPoint && (
                          <div className="text-xs text-gray-500">
                            Reorder at: {ingredient.reorderPoint} {ingredient.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatMoney(ingredient.costPerUnit)}/{ingredient.unit}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatMoney(ingredient.stockQuantity * ingredient.costPerUnit)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.supplier || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(ingredient.id)
                          }}
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
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingIngredient) && (
        <IngredientModal
          ingredient={editingIngredient}
          onClose={() => {
            setShowAddModal(false)
            setEditingIngredient(null)
          }}
          onSave={() => {
            fetchIngredients()
            setShowAddModal(false)
            setEditingIngredient(null)
          }}
        />
      )}
    </div>
  )
}