'use client'

import { useState, useEffect } from 'react'

type MenuItem = {
  id: string
  name: string
  nameJa: string | null
  description: string | null
  customerPrice: number
  quantity: string | null
  isAvailable: boolean
  categoryId: string | null
  category: {
    id: string
    name: string
  } | null
  availability?: {
    isAvailable: boolean
    status: 'available' | 'low_stock' | 'out_of_stock'
    maxServings: number
    limitingIngredient?: {
      name: string
      available: number
      required: number
      unit: string
    }
  }
}

type Category = {
  id: string
  name: string
  nameJa: string | null
}

interface MenuItemSelectorProps {
  orderId: string
  onItemsAdded?: () => void
  onClose: () => void
}

export default function MenuItemSelector({ orderId, onItemsAdded, onClose }: MenuItemSelectorProps) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    fetchMenuData()
  }, [])

  const fetchMenuData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('/api/menu/items'),
        fetch('/api/menu/categories')
      ])

      const itemsData = await itemsRes.json()
      const categoriesData = await categoriesRes.json()

      // Include all items to show stock status
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

  const handleAddItem = async (item: MenuItem) => {
    setAdding(item.id)
    
    try {
      const unitPrice = item.customerPrice
      const tax = Math.floor(unitPrice * 0.1) // 10% tax
      
      const response = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'fnb', // Changed from 'regular' to match OrderItemKind enum
          name: item.name,
          qty: 1,
          unitPriceMinor: unitPrice,
          taxMinor: tax,
          menuItemId: item.id, // Add menuItemId at top level for inventory tracking
          meta: {
            menuItemId: item.id,
            nameJa: item.nameJa,
            quantity: item.quantity
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to add item:', error)
        if (error.details) {
          // If there are stock issues, show detailed message
          alert(`Cannot add item:\n${error.details.join('\n')}`)
        } else {
          alert(error.error || 'Failed to add item to order')
        }
        return
      }

      onItemsAdded?.()
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item to order')
    } finally {
      setAdding(null)
    }
  }

  const formatPrice = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl">Loading menu...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="p-4 border-b">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
              selectedCategory === 'all'
                ? 'bg-brand-main text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                selectedCategory === category.id
                  ? 'bg-brand-main text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No items available in this category
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map(item => {
              const stockAvailable = item.availability?.isAvailable !== false
              const isLowStock = item.availability?.status === 'low_stock'
              const maxServings = item.availability?.maxServings || 0
              
              return (
                <button
                  key={item.id}
                  onClick={() => stockAvailable && handleAddItem(item)}
                  disabled={adding === item.id || !stockAvailable}
                  className={`p-4 rounded-lg border text-left transition-all relative ${
                    !stockAvailable
                      ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                      : adding === item.id
                      ? 'bg-blue-100 border-blue-300'
                      : isLowStock
                      ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-md'
                      : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Stock status badge */}
                  {item.availability && (
                    <div className="absolute top-2 right-2">
                      {!stockAvailable ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          {maxServings} left
                        </span>
                      ) : null}
                    </div>
                  )}
                  
                  <div className="font-medium text-sm mb-1">
                    {item.name}
                  </div>
                  {item.nameJa && (
                    <div className="text-xs text-gray-500 mb-1">
                      {item.nameJa}
                    </div>
                  )}
                  {item.quantity && (
                    <div className="text-xs text-gray-600 mb-2">
                      {item.quantity}
                    </div>
                  )}
                  
                  {/* Show limiting ingredient if low stock */}
                  {isLowStock && item.availability?.limitingIngredient && (
                    <div className="text-xs text-yellow-700 mb-1">
                      Low on {item.availability.limitingIngredient.name}
                    </div>
                  )}
                  
                  <div className={`text-lg font-bold ${
                    !stockAvailable ? 'text-gray-400' : 'text-green-600'
                  }`}>
                    {formatPrice(item.customerPrice)}
                  </div>
                  {adding === item.id && (
                    <div className="text-xs text-blue-600 mt-1">Adding...</div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* If no items at all */}
        {items.length === 0 && !loading && (
          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">No menu items available</p>
            <p className="text-sm text-gray-500">
              Please add items in the admin menu management
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Done
        </button>
      </div>
    </div>
  )
}