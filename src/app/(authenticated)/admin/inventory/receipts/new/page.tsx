'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Supplier = {
  id: string
  name: string
  paymentTerms: string | null
  minimumOrder: number | null
}

type Ingredient = {
  id: string
  name: string
  unit: string
  costPerUnit: number
  stockQuantity: number
  minStock: number
  reorderPoint: number | null
  reorderQuantity: number | null
  supplier: string | null
}

type ReceiptItem = {
  ingredientId: string
  ingredient?: Ingredient
  quantity: number
  unitCost: number
  totalCost: number
  notes: string
}

export default function NewReceiptPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    notes: ''
  })
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [suppliersRes, ingredientsRes] = await Promise.all([
        fetch('/api/admin/suppliers'),
        fetch('/api/admin/ingredients')
      ])

      const suppliersData = await suppliersRes.json()
      const ingredientsData = await ingredientsRes.json()

      setSuppliers(suppliersData.filter((s: Supplier) => s))
      setIngredients(ingredientsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = (ingredient: Ingredient) => {
    const existingItem = items.find(i => i.ingredientId === ingredient.id)
    
    if (existingItem) {
      // If item already exists, increase quantity
      setItems(items.map(item => 
        item.ingredientId === ingredient.id
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              totalCost: (item.quantity + 1) * item.unitCost
            }
          : item
      ))
    } else {
      // Add new item with default quantity of 1
      const quantity = 1
      const unitCost = ingredient.costPerUnit
      setItems([...items, {
        ingredientId: ingredient.id,
        ingredient,
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        notes: ''
      }])
    }
    
    setShowIngredientSelector(false)
  }

  const handleUpdateItem = (index: number, updates: Partial<ReceiptItem>) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item
      
      const updated = { ...item, ...updates }
      // Recalculate total if quantity or unit cost changed
      if ('quantity' in updates || 'unitCost' in updates) {
        updated.totalCost = updated.quantity * updated.unitCost
      }
      return updated
    }))
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0)
    const tax = Math.floor(subtotal * 0.1)
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSaving(true)

    try {
      // Create purchase order as "received" status since we're entering a receipt
      const response = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId || null,
          expectedDate: formData.purchaseDate,
          notes: formData.receiptNumber ? `Receipt #: ${formData.receiptNumber}\n${formData.notes}` : formData.notes,
          items: items.map(item => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes || null
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save receipt')
      }

      const order = await response.json()
      
      // Immediately receive all items since this is a receipt entry
      await fetch(`/api/admin/purchase-orders/${order.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: order.items.map((item: any) => ({
            itemId: item.id,
            receivedQty: item.quantity,
            notes: ''
          }))
        })
      })

      router.push('/admin/inventory/receipts')
    } catch (error) {
      console.error('Error saving receipt:', error)
      alert('Failed to save receipt')
    } finally {
      setSaving(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const { subtotal, tax, total } = calculateTotals()

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/inventory/receipts"
          className="text-blue-500 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Receipts
        </Link>
        
        <h1 className="text-2xl font-bold">Enter Receipt</h1>
        <p className="text-gray-600 mt-1">Record purchases after shopping</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Receipt Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Receipt Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store/Supplier
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="">Cash Purchase</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Or <Link href="/admin/inventory/suppliers" className="text-blue-500">add new supplier</Link>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Number
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Optional receipt/invoice number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Any additional notes"
              />
            </div>
          </div>
        </div>

        {/* Receipt Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Items Purchased</h2>
            <button
              type="button"
              onClick={() => setShowIngredientSelector(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items added yet. Click "Add Item" to start entering your receipt.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Cost
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Notes
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.ingredient?.name}</div>
                        <div className="text-xs text-gray-500">
                          Current stock: {item.ingredient?.stockQuantity} {item.ingredient?.unit}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, { 
                            quantity: parseFloat(e.target.value) || 0 
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                        />
                        <span className="ml-1 text-sm text-gray-600">
                          {item.ingredient?.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="1"
                          value={item.unitCost}
                          onChange={(e) => handleUpdateItem(index, { 
                            unitCost: parseInt(e.target.value) || 0 
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(item.totalCost)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleUpdateItem(index, { notes: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="Optional"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span>Tax (10%):</span>
                    <span className="font-medium">{formatMoney(tax)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Link
            href="/admin/inventory/receipts"
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Receipt & Update Stock'}
          </button>
        </div>
      </form>

      {/* Ingredient Selector Modal */}
      {showIngredientSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select Ingredient</h3>
            
            <div className="space-y-2">
              {ingredients.map(ingredient => (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() => handleAddItem(ingredient)}
                  className="w-full text-left p-3 rounded border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{ingredient.name}</div>
                      <div className="text-sm text-gray-600">
                        Stock: {ingredient.stockQuantity} {ingredient.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(ingredient.costPerUnit)}</div>
                      <div className="text-xs text-gray-500">per {ingredient.unit}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIngredientSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}