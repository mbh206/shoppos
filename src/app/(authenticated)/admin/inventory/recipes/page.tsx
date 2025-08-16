'use client'

import { useState, useEffect } from 'react'

type Ingredient = {
  id: string
  name: string
  unit: string
  costPerUnit: number
  stockQuantity: number
}

type Recipe = {
  id: string
  ingredientId: string
  quantity: number
  isOptional: boolean
  ingredient: Ingredient
}

type MenuItem = {
  id: string
  name: string
  nameJa?: string | null
  customerPrice: number
  costPrice: number
  ingredients: Recipe[]
}

type MenuItemWithAnalytics = MenuItem & {
  margin: number
  marginPercent: number
  markup: number
}

export default function RecipesPage() {
  const [menuItems, setMenuItems] = useState<MenuItemWithAnalytics[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<MenuItemWithAnalytics | null>(null)
  const [editingRecipe, setEditingRecipe] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [itemsRes, ingredientsRes] = await Promise.all([
        fetch('/api/admin/menu-items-with-recipes'),
        fetch('/api/admin/ingredients')
      ])
      
      if (itemsRes.ok && ingredientsRes.ok) {
        const itemsData = await itemsRes.json()
        const ingredientsData = await ingredientsRes.json()
        
        // Calculate analytics for each item
        const itemsWithAnalytics = itemsData.map((item: MenuItem) => {
          const costPrice = calculateCOGS(item.ingredients)
          const margin = item.customerPrice - costPrice
          const marginPercent = item.customerPrice > 0 ? (margin / item.customerPrice) * 100 : 0
          const markup = costPrice > 0 ? ((item.customerPrice - costPrice) / costPrice) * 100 : 0
          
          return {
            ...item,
            costPrice,
            margin,
            marginPercent,
            markup
          }
        })
        
        setMenuItems(itemsWithAnalytics)
        setIngredients(ingredientsData)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const calculateCOGS = (recipes: Recipe[]) => {
    return recipes.reduce((total, recipe) => {
      return total + (recipe.quantity * recipe.ingredient.costPerUnit)
    }, 0)
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getMarginColor = (percent: number) => {
    if (percent < 20) return 'text-red-600'
    if (percent < 40) return 'text-yellow-600'
    if (percent < 60) return 'text-blue-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading recipes...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Recipe Management & COGS Analysis</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Menu Items</div>
            <div className="text-2xl font-bold">{menuItems.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Average Margin</div>
            <div className="text-2xl font-bold">
              {formatPercent(
                menuItems.reduce((sum, item) => sum + item.marginPercent, 0) / menuItems.length || 0
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Items Without Recipe</div>
            <div className="text-2xl font-bold text-yellow-600">
              {menuItems.filter(item => item.ingredients.length === 0).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Low Margin Items</div>
            <div className="text-2xl font-bold text-red-600">
              {menuItems.filter(item => item.marginPercent < 30).length}
            </div>
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    COGS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Markup %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredients
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menuItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      {item.nameJa && (
                        <div className="text-xs text-gray-500">
                          {item.nameJa}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(item.customerPrice)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(item.costPrice)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMoney(item.margin)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${getMarginColor(item.marginPercent)}`}>
                      {formatPercent(item.marginPercent)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(item.markup)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.ingredients.length > 0 ? (
                        <span className="text-blue-600">
                          {item.ingredients.length} items
                        </span>
                      ) : (
                        <span className="text-yellow-600">
                          No recipe
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedItem(item)
                          setEditingRecipe(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit Recipe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && !editingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedItem.name} - Recipe Details
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Selling Price</div>
                <div className="text-2xl font-bold">{formatMoney(selectedItem.customerPrice)}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">Cost (COGS)</div>
                <div className="text-2xl font-bold">{formatMoney(selectedItem.costPrice)}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">Profit Margin</div>
                <div className={`text-2xl font-bold ${getMarginColor(selectedItem.marginPercent)}`}>
                  {formatMoney(selectedItem.margin)} ({formatPercent(selectedItem.marginPercent)})
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">Markup</div>
                <div className="text-2xl font-bold">{formatPercent(selectedItem.markup)}</div>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Ingredients Breakdown</h3>
            {selectedItem.ingredients.length > 0 ? (
              <table className="w-full mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Ingredient
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Cost
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Cost
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      % of COGS
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedItem.ingredients.map((recipe) => {
                    const cost = recipe.quantity * recipe.ingredient.costPerUnit
                    const percentOfCOGS = selectedItem.costPrice > 0 ? (cost / selectedItem.costPrice) * 100 : 0
                    return (
                      <tr key={recipe.id}>
                        <td className="px-4 py-2 text-sm">
                          {recipe.ingredient.name}
                          {recipe.isOptional && (
                            <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {recipe.quantity} {recipe.ingredient.unit}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {formatMoney(recipe.ingredient.costPerUnit)}/{recipe.ingredient.unit}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {formatMoney(cost)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {formatPercent(percentOfCOGS)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {recipe.ingredient.stockQuantity > 0 ? (
                            <span className="text-green-600">
                              {recipe.ingredient.stockQuantity} {recipe.ingredient.unit}
                            </span>
                          ) : (
                            <span className="text-red-600">Out of Stock</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 mb-4">No ingredients defined for this item</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => setEditingRecipe(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}