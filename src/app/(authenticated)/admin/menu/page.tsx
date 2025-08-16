'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Ingredient = {
  id: string
  ingredientId: string
  quantity: number
  ingredient: {
    id: string
    name: string
    unit: string
    costPerUnit: number
  }
}

type MenuItem = {
  id: string
  categoryId: string | null
  name: string
  nameJa: string | null
  description: string | null
  customerPrice: number
  costPrice: number
  quantity: string | null
  isAvailable: boolean
  sortOrder: number
  category: {
    id: string
    name: string
  } | null
  ingredients: Ingredient[]
}

type Category = {
  id: string
  name: string
  nameJa: string | null
  sortOrder: number
  _count: {
    items: number
  }
}

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const router = useRouter()

  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    nameJa: '',
    description: '',
    customerPrice: '',
    quantity: '',
    isAvailable: true,
    sortOrder: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('/api/menu/items'),
        fetch('/api/menu/categories')
      ])

      const itemsData = await itemsRes.json()
      const categoriesData = await categoriesRes.json()

      setItems(itemsData.items || [])
      setCategories(categoriesData.categories || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching menu data:', error)
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true
    return item.categoryId === selectedCategory
  })

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      categoryId: item.categoryId || '',
      name: item.name,
      nameJa: item.nameJa || '',
      description: item.description || '',
      customerPrice: (item.customerPrice / 100).toString(),
      quantity: item.quantity || '',
      isAvailable: item.isAvailable,
      sortOrder: item.sortOrder,
    })
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingItem(null)
    setFormData({
      categoryId: '',
      name: '',
      nameJa: '',
      description: '',
      customerPrice: '',
      quantity: '',
      isAvailable: true,
      sortOrder: 0,
    })
  }

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        customerPrice: Math.round(parseFloat(formData.customerPrice) * 100),
        categoryId: formData.categoryId || null,
      }

      if (editingItem) {
        // Update existing item
        const response = await fetch(`/api/menu/items/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          await fetchData()
          setEditingItem(null)
        }
      } else {
        // Create new item
        const response = await fetch('/api/menu/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          await fetchData()
          setIsCreating(false)
        }
      }
    } catch (error) {
      console.error('Error saving menu item:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/menu/items/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error deleting menu item:', error)
    }
  }

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error updating availability:', error)
    }
  }

  const formatPrice = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const calculateMargin = (customerPrice: number, costPrice: number) => {
    if (customerPrice === 0) return 0
    return Math.round(((customerPrice - costPrice) / customerPrice) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading menu...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add New Item
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back to Admin
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
              selectedCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category.name} ({category._count.items})
            </button>
          ))}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cost</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Margin</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.nameJa && (
                        <div className="text-sm text-gray-500">{item.nameJa}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.category?.name || '-'}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatPrice(item.customerPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatPrice(item.costPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${
                      calculateMargin(item.customerPrice, item.costPrice) > 50
                        ? 'text-green-600'
                        : calculateMargin(item.customerPrice, item.costPrice) > 30
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {calculateMargin(item.customerPrice, item.costPrice)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.quantity || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.isAvailable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit/Create Modal */}
        {(editingItem || isCreating) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name (English) *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name (Japanese)</label>
                    <input
                      type="text"
                      value={formData.nameJa}
                      onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Price (¥) *</label>
                    <input
                      type="number"
                      value={formData.customerPrice}
                      onChange={(e) => setFormData({ ...formData, customerPrice: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="10"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity/Size</label>
                    <input
                      type="text"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 300ml, 1 piece"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isAvailable" className="text-sm font-medium">
                    Available for ordering
                  </label>
                </div>

                {editingItem && editingItem.ingredients.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Ingredients</h3>
                    <div className="text-sm text-gray-600">
                      {editingItem.ingredients.map(ing => (
                        <div key={ing.id}>
                          {ing.quantity} {ing.ingredient.unit} of {ing.ingredient.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setIsCreating(false)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}