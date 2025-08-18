'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type InventoryStats = {
  ingredients: {
    total: number
    lowStock: number
    outOfStock: number
    value: number
  }
  supplies: {
    total: number
    lowStock: number
    outOfStock: number
    value: number
  }
  retail: {
    total: number
    lowStock: number
    outOfStock: number
    value: number
  }
}

export default function InventoryPage() {
  const [stats, setStats] = useState<InventoryStats>({
    ingredients: { total: 0, lowStock: 0, outOfStock: 0, value: 0 },
    supplies: { total: 0, lowStock: 0, outOfStock: 0, value: 0 },
    retail: { total: 0, lowStock: 0, outOfStock: 0, value: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch ingredients stats
      const ingredientsRes = await fetch('/api/admin/ingredients')
      if (ingredientsRes.ok) {
        const ingredients = await ingredientsRes.json()
        const lowStock = ingredients.filter((i: any) => 
          i.reorderPoint && i.stockQuantity <= i.reorderPoint
        ).length
        const outOfStock = ingredients.filter((i: any) => i.stockQuantity === 0).length
        const value = ingredients.reduce((sum: number, i: any) => 
          sum + (i.stockQuantity * i.costPerUnit), 0
        )
        
        setStats(prev => ({
          ...prev,
          ingredients: {
            total: ingredients.length,
            lowStock,
            outOfStock,
            value
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading inventory...</div>
      </div>
    )
  }

  const totalValue = stats.ingredients.value + stats.supplies.value + stats.retail.value
  const totalItems = stats.ingredients.total + stats.supplies.total + stats.retail.total
  const totalLowStock = stats.ingredients.lowStock + stats.supplies.lowStock + stats.retail.lowStock
  const totalOutOfStock = stats.ingredients.outOfStock + stats.supplies.outOfStock + stats.retail.outOfStock

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-blue-500 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Admin
        </Link>
        
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-gray-600 mt-2">Track ingredients, supplies, and retail items</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Inventory Value</div>
          <div className="text-2xl font-bold text-green-600">{formatMoney(totalValue)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-2xl font-bold">{totalItems}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Low Stock Items</div>
          <div className="text-2xl font-bold text-yellow-600">{totalLowStock}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">{totalOutOfStock}</div>
        </div>
      </div>

      {/* Inventory Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Ingredients */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Ingredients</h2>
            <p className="text-sm text-gray-600 mt-1">Raw materials for menu items</p>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium">{stats.ingredients.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inventory Value</span>
                <span className="font-medium">{formatMoney(stats.ingredients.value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Low Stock</span>
                <span className="font-medium text-yellow-600">{stats.ingredients.lowStock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Out of Stock</span>
                <span className="font-medium text-red-600">{stats.ingredients.outOfStock}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Link
                href="/admin/inventory/ingredients"
                className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
              >
                Manage Ingredients
              </Link>
              <Link
                href="/admin/inventory/recipes"
                className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
              >
                Recipe & COGS Analysis
              </Link>
            </div>
          </div>
        </div>

        {/* Supplies */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Supplies</h2>
            <p className="text-sm text-gray-600 mt-1">Cups, napkins, cleaning, etc.</p>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium">{stats.supplies.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inventory Value</span>
                <span className="font-medium">{formatMoney(stats.supplies.value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Low Stock</span>
                <span className="font-medium text-yellow-600">{stats.supplies.lowStock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Out of Stock</span>
                <span className="font-medium text-red-600">{stats.supplies.outOfStock}</span>
              </div>
            </div>
            <Link
              href="/admin/inventory/supplies"
              className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
            >
              Manage Supplies
            </Link>
          </div>
        </div>

        {/* Retail */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Retail Items</h2>
            <p className="text-sm text-gray-600 mt-1">Products for direct sale</p>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium">{stats.retail.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inventory Value</span>
                <span className="font-medium">{formatMoney(stats.retail.value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Low Stock</span>
                <span className="font-medium text-yellow-600">{stats.retail.lowStock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Out of Stock</span>
                <span className="font-medium text-red-600">{stats.retail.outOfStock}</span>
              </div>
            </div>
            <Link
              href="/admin/inventory/retail"
              className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
            >
              Manage Retail Items
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Purchase Management</h3>
          <div className="space-y-3">
            <Link
              href="/admin/inventory/receipts/new"
              className="block w-full px-4 py-2 bg-green-500 text-white text-center rounded hover:bg-green-600"
            >
              Enter New Receipt
            </Link>
            <Link
              href="/admin/inventory/receipts"
              className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded hover:bg-blue-600"
            >
              View Receipt History
            </Link>
            <Link
              href="/admin/inventory/suppliers"
              className="block w-full px-4 py-2 bg-purple-500 text-white text-center rounded hover:bg-purple-600"
            >
              Manage Suppliers
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Reports & Analysis</h3>
          <div className="space-y-3">
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed opacity-50"
            >
              Stock Movement Report (Coming Soon)
            </button>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed opacity-50"
            >
              Waste Report (Coming Soon)
            </button>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed opacity-50"
            >
              Export Inventory (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}