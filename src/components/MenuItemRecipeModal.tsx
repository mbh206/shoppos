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
  id?: string
  ingredientId: string
  quantity: number
  isOptional: boolean
  ingredient?: Ingredient
}

type MenuItem = {
  id: string
  name: string
  nameJa?: string | null
  customerPrice: number
  monthlySales: number
  expectedWaste: number
  ingredients: Recipe[]
}

interface MenuItemRecipeModalProps {
  menuItem: MenuItem
  ingredients: Ingredient[]
  onClose: () => void
  onSave: () => void
}

export default function MenuItemRecipeModal({ 
  menuItem, 
  ingredients, 
  onClose, 
  onSave 
}: MenuItemRecipeModalProps) {
  const [formData, setFormData] = useState({
    name: menuItem.name,
    nameJa: menuItem.nameJa || '',
    customerPrice: menuItem.customerPrice / 100, // Convert from minor units
    monthlySales: menuItem.monthlySales,
    expectedWaste: menuItem.expectedWaste,
  })
  
  const [recipes, setRecipes] = useState<Recipe[]>(menuItem.ingredients || [])
  const [saving, setSaving] = useState(false)
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)

  const handleAddIngredient = (ingredientId: string) => {
    const ingredient = ingredients.find(i => i.id === ingredientId)
    if (ingredient && !recipes.find(r => r.ingredientId === ingredientId)) {
      setRecipes([...recipes, {
        ingredientId,
        quantity: 1,
        isOptional: false,
        ingredient
      }])
    }
    setShowIngredientSelector(false)
  }

  const handleRemoveIngredient = (ingredientId: string) => {
    setRecipes(recipes.filter(r => r.ingredientId !== ingredientId))
  }

  const handleRecipeChange = (ingredientId: string, field: string, value: any) => {
    setRecipes(recipes.map(r => 
      r.ingredientId === ingredientId 
        ? { ...r, [field]: value }
        : r
    ))
  }

  const calculateCOGS = () => {
    return recipes.reduce((total, recipe) => {
      if (!recipe.isOptional && recipe.ingredient) {
        return total + (recipe.quantity * recipe.ingredient.costPerUnit)
      }
      return total
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Update menu item basic info
      const itemResponse = await fetch(`/api/admin/menu-items/${menuItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameJa: formData.nameJa || null,
          customerPrice: Math.round(formData.customerPrice * 100),
          monthlySales: formData.monthlySales,
          expectedWaste: formData.expectedWaste,
          costPrice: calculateCOGS()
        })
      })

      if (!itemResponse.ok) {
        throw new Error('Failed to update menu item')
      }

      // Update recipes
      const recipeResponse = await fetch(`/api/admin/menu-items/${menuItem.id}/recipes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipes: recipes.map(r => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
            isOptional: r.isOptional
          }))
        })
      })

      if (!recipeResponse.ok) {
        throw new Error('Failed to update recipes')
      }

      onSave()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  const cogs = calculateCOGS()
  const profit = (formData.customerPrice * 100) - cogs
  const marginPercent = formData.customerPrice > 0 ? (profit / (formData.customerPrice * 100)) * 100 : 0
  const markup = cogs > 0 ? (profit / cogs) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Edit Menu Item: {menuItem.name}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
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
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price (¥)
                </label>
                <input
                  type="number"
                  value={formData.customerPrice}
                  onChange={(e) => setFormData({ ...formData, customerPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Sales (units)
                </label>
                <input
                  type="number"
                  value={formData.monthlySales}
                  onChange={(e) => setFormData({ ...formData, monthlySales: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Waste (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.expectedWaste}
                  onChange={(e) => setFormData({ ...formData, expectedWaste: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3">Profitability Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-600">COGS</div>
                <div className="text-lg font-bold">{formatMoney(cogs)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-600">Profit</div>
                <div className="text-lg font-bold text-green-600">{formatMoney(profit)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-600">Margin</div>
                <div className="text-lg font-bold">{marginPercent.toFixed(2)}%</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-600">Markup</div>
                <div className="text-lg font-bold">{markup.toFixed(2)}%</div>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Recipe Ingredients</h3>
              <button
                type="button"
                onClick={() => setShowIngredientSelector(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Add Ingredient
              </button>
            </div>

            {recipes.length > 0 ? (
              <table className="w-full mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Ingredient
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cost
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Optional
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recipes.map((recipe) => {
                    const ingredient = recipe.ingredient || ingredients.find(i => i.id === recipe.ingredientId)
                    if (!ingredient) return null
                    
                    return (
                      <tr key={recipe.ingredientId}>
                        <td className="px-3 py-2 text-sm">{ingredient.name}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={recipe.quantity}
                            onChange={(e) => handleRecipeChange(
                              recipe.ingredientId, 
                              'quantity', 
                              parseFloat(e.target.value) || 0
                            )}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm">{ingredient.unit}</td>
                        <td className="px-3 py-2 text-sm">
                          {formatMoney(recipe.quantity * ingredient.costPerUnit)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={recipe.isOptional}
                            onChange={(e) => handleRecipeChange(
                              recipe.ingredientId, 
                              'isOptional', 
                              e.target.checked
                            )}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(recipe.ingredientId)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 mb-4">No ingredients added yet</p>
            )}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Ingredient Selector Modal */}
        {showIngredientSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Select Ingredient</h3>
              <div className="space-y-2">
                {ingredients
                  .filter(i => !recipes.find(r => r.ingredientId === i.id))
                  .map(ingredient => (
                    <button
                      key={ingredient.id}
                      onClick={() => handleAddIngredient(ingredient.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex justify-between items-center"
                    >
                      <span>{ingredient.name}</span>
                      <span className="text-sm text-gray-500">
                        {formatMoney(ingredient.costPerUnit)}/{ingredient.unit}
                      </span>
                    </button>
                  ))
                }
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowIngredientSelector(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}