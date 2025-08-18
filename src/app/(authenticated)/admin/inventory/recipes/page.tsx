'use client'

import { useState, useEffect } from 'react'
import MenuItemRecipeModal from '@/components/MenuItemRecipeModal'
import Link from 'next/link'

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

type MenuCategory = {
  id: string
  name: string
}

type MenuItem = {
  id: string
  name: string
  nameJa?: string | null
  customerPrice: number
  costPrice: number
  monthlySales: number
  expectedWaste: number
  category?: MenuCategory | null
  ingredients: Recipe[]
}

type MenuItemWithAnalytics = MenuItem & {
  unitCost: number
  unitSellPrice: number
  margin: number
  marginPercent: number
  markup: number
  profit: number
  unitCostTotal: number
  unitSalesTotal: number
  totalProfit: number
}

export default function InventoryAnalysisPage() {
  const [menuItems, setMenuItems] = useState<MenuItemWithAnalytics[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItemWithAnalytics | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

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
          const unitCost = calculateCOGS(item.ingredients)
          const unitSellPrice = item.customerPrice
          const profit = unitSellPrice - unitCost
          const marginPercent = unitSellPrice > 0 ? (profit / unitSellPrice) * 100 : 0
          const markup = unitCost > 0 ? ((unitSellPrice - unitCost) / unitCost) * 100 : 0
          const unitCostTotal = unitCost * item.monthlySales
          const unitSalesTotal = unitSellPrice * item.monthlySales
          const totalProfit = profit * item.monthlySales
          
          return {
            ...item,
            unitCost,
            unitSellPrice,
            margin: profit,
            marginPercent,
            markup,
            profit,
            unitCostTotal,
            unitSalesTotal,
            totalProfit
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
      if (!recipe.isOptional) {
        return total + (recipe.quantity * recipe.ingredient.costPerUnit)
      }
      return total
    }, 0)
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const getMarginColor = (percent: number) => {
    if (percent < 20) return 'text-red-600'
    if (percent < 40) return 'text-yellow-600'
    if (percent < 60) return 'text-blue-600'
    return 'text-green-600'
  }

  const categories = Array.from(new Set(menuItems.map(item => item.category?.name || 'Uncategorized')))
  
  const filteredItems = categoryFilter === 'all' 
    ? menuItems 
    : menuItems.filter(item => (item.category?.name || 'Uncategorized') === categoryFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading inventory analysis...</div>
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
        <h1 className="text-2xl font-bold mb-4">Inventory Management & COGS Analysis</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Items</div>
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
            <div className="text-sm text-gray-600">Total Monthly Sales</div>
            <div className="text-2xl font-bold">
              {formatMoney(menuItems.reduce((sum, item) => sum + item.unitSalesTotal, 0))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Monthly COGS</div>
            <div className="text-2xl font-bold">
              {formatMoney(menuItems.reduce((sum, item) => sum + item.unitCostTotal, 0))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Monthly Profit</div>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(menuItems.reduce((sum, item) => sum + item.totalProfit, 0))}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Monthly Sales</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Margin</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Markup</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit/Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sales Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit Total</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Waste %</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.nameJa && (
                        <div className="text-xs text-gray-500">{item.nameJa}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {item.category?.name || 'Uncategorized'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {item.monthlySales}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatMoney(item.unitCost)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatMoney(item.unitSellPrice)}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap text-center font-medium ${getMarginColor(item.marginPercent)}`}>
                      {formatPercent(item.marginPercent)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {formatPercent(item.markup)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                      {formatMoney(item.profit)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatMoney(item.unitCostTotal)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {formatMoney(item.unitSalesTotal)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-medium text-green-600">
                      {formatMoney(item.totalProfit)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {item.expectedWaste > 0 ? formatPercent(item.expectedWaste) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-right">Totals:</td>
                  <td className="px-3 py-2 text-center">
                    {filteredItems.reduce((sum, item) => sum + item.monthlySales, 0)}
                  </td>
                  <td colSpan={5}></td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(filteredItems.reduce((sum, item) => sum + item.unitCostTotal, 0))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(filteredItems.reduce((sum, item) => sum + item.unitSalesTotal, 0))}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600">
                    {formatMoney(filteredItems.reduce((sum, item) => sum + item.totalProfit, 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <MenuItemRecipeModal
          menuItem={editingItem}
          ingredients={ingredients}
          onClose={() => setEditingItem(null)}
          onSave={() => {
            fetchData()
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}