'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type RetailItem = {
  id: string
  name: string
  nameJa: string | null
  barcode: string | null
  category: string | null
  costPrice: number
  retailPrice: number
  stockQuantity: number
  minStock: number
  maxStock: number | null
  reorderPoint: number | null
  reorderQuantity: number | null
  supplier: string | null
  supplierSKU: string | null
  imageUrl: string | null
  description: string | null
  isActive: boolean
}

const RETAIL_CATEGORIES = [
  'Snacks',
  'Drinks',
  'Candy',
  'Merchandise',
  'Books',
  'Games',
  'Other'
]

export default function RetailPage() {
  const [retailItems, setRetailItems] = useState<RetailItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RetailItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [formData, setFormData] = useState({
    name: '',
    nameJa: '',
    barcode: '',
    category: '',
    costPrice: '',
    retailPrice: '',
    stockQuantity: '',
    minStock: '',
    maxStock: '',
    reorderPoint: '',
    reorderQuantity: '',
    supplier: '',
    supplierSKU: '',
    imageUrl: '',
    description: '',
    isActive: true
  })

  useEffect(() => {
    fetchRetailItems()
  }, [])

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        nameJa: editingItem.nameJa || '',
        barcode: editingItem.barcode || '',
        category: editingItem.category || '',
        costPrice: (editingItem.costPrice / 100).toString(),
        retailPrice: (editingItem.retailPrice / 100).toString(),
        stockQuantity: editingItem.stockQuantity.toString(),
        minStock: editingItem.minStock.toString(),
        maxStock: editingItem.maxStock?.toString() || '',
        reorderPoint: editingItem.reorderPoint?.toString() || '',
        reorderQuantity: editingItem.reorderQuantity?.toString() || '',
        supplier: editingItem.supplier || '',
        supplierSKU: editingItem.supplierSKU || '',
        imageUrl: editingItem.imageUrl || '',
        description: editingItem.description || '',
        isActive: editingItem.isActive
      })
    } else {
      setFormData({
        name: '',
        nameJa: '',
        barcode: '',
        category: '',
        costPrice: '',
        retailPrice: '',
        stockQuantity: '',
        minStock: '',
        maxStock: '',
        reorderPoint: '',
        reorderQuantity: '',
        supplier: '',
        supplierSKU: '',
        imageUrl: '',
        description: '',
        isActive: true
      })
    }
  }, [editingItem])

  const fetchRetailItems = async () => {
    try {
      const response = await fetch('/api/admin/retail')
      if (response.ok) {
        const data = await response.json()
        setRetailItems(data)
      }
    } catch (error) {
      console.error('Error fetching retail items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      name: formData.name,
      nameJa: formData.nameJa || null,
      barcode: formData.barcode || null,
      category: formData.category || null,
      costPrice: Math.round(parseFloat(formData.costPrice || '0') * 100),
      retailPrice: Math.round(parseFloat(formData.retailPrice || '0') * 100),
      stockQuantity: parseFloat(formData.stockQuantity || '0'),
      minStock: parseFloat(formData.minStock || '0'),
      maxStock: formData.maxStock ? parseFloat(formData.maxStock) : null,
      reorderPoint: formData.reorderPoint ? parseFloat(formData.reorderPoint) : null,
      reorderQuantity: formData.reorderQuantity ? parseFloat(formData.reorderQuantity) : null,
      supplier: formData.supplier || null,
      supplierSKU: formData.supplierSKU || null,
      imageUrl: formData.imageUrl || null,
      description: formData.description || null,
      isActive: formData.isActive
    }

    try {
      const url = editingItem 
        ? `/api/admin/retail/${editingItem.id}`
        : '/api/admin/retail'
      
      const response = await fetch(url, {
        method: editingItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowModal(false)
        setEditingItem(null)
        fetchRetailItems()
      } else {
        alert('Failed to save retail item')
      }
    } catch (error) {
      console.error('Error saving retail item:', error)
      alert('Failed to save retail item')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this retail item?')) return

    try {
      const response = await fetch(`/api/admin/retail/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchRetailItems()
      } else {
        alert('Failed to delete retail item')
      }
    } catch (error) {
      console.error('Error deleting retail item:', error)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  const calculateMarkup = (cost: number, retail: number) => {
    if (cost === 0) return 0
    return Math.round(((retail - cost) / cost) * 100)
  }

  const filteredItems = retailItems.filter(item => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'uncategorized') return !item.category
    return item.category === selectedCategory
  })

  const lowStockItems = retailItems.filter(item => 
    item.reorderPoint && item.stockQuantity <= item.reorderPoint
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading retail items...</div>
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
          <h1 className="text-2xl font-bold">Retail Inventory</h1>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowModal(true)
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Retail Item
          </button>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-yellow-800 mb-2">Low Stock Alert</h3>
            <div className="text-sm text-yellow-700">
              {lowStockItems.map(item => (
                <div key={item.id}>
                  {item.name}: {item.stockQuantity} units 
                  (reorder at {item.reorderPoint})
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
            All ({retailItems.length})
          </button>
          {RETAIL_CATEGORIES.map(category => {
            const count = retailItems.filter(i => i.category === category).length
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
          {retailItems.some(i => !i.category) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                selectedCategory === 'uncategorized'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Uncategorized ({retailItems.filter(i => !i.category).length})
            </button>
          )}
        </div>
      </div>

      {/* Retail Items Table */}
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
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Retail
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Markup
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Value
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
              {filteredItems.map((item) => {
                const needsReorder = item.reorderPoint && item.stockQuantity <= item.reorderPoint
                const outOfStock = item.stockQuantity === 0
                const markup = calculateMarkup(item.costPrice, item.retailPrice)
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.nameJa && (
                        <div className="text-xs text-gray-500">{item.nameJa}</div>
                      )}
                      {item.barcode && (
                        <div className="text-xs text-gray-400">BC: {item.barcode}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        outOfStock ? 'text-red-600' : 
                        needsReorder ? 'text-yellow-600' : 
                        'text-gray-900'
                      }`}>
                        {item.stockQuantity} units
                      </div>
                      {item.minStock > 0 && (
                        <div className="text-xs text-gray-500">
                          Min: {item.minStock}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(item.costPrice)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMoney(item.retailPrice)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        markup >= 100 ? 'text-green-600' :
                        markup >= 50 ? 'text-blue-600' :
                        markup >= 20 ? 'text-gray-900' :
                        'text-red-600'
                      }`}>
                        {markup}%
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(item.stockQuantity * item.costPrice)}
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
                          setEditingItem(item)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No retail items found. Click "Add Retail Item" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Retail Item' : 'Add Retail Item'}
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
                    Japanese Name
                  </label>
                  <input
                    type="text"
                    value={formData.nameJa}
                    onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
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
                    {RETAIL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price (¥) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retail Price (¥) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.retailPrice}
                    onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
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
                    step="1"
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
                    step="1"
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
                    step="1"
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
                    step="1"
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    setEditingItem(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}