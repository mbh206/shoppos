'use client'

import { useState, useEffect } from 'react'

type Supplier = {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  paymentTerms: string | null
  deliveryDays: string | null
  minimumOrder: number | null
  notes: string | null
  isActive: boolean
}

interface SupplierModalProps {
  supplier: Supplier | null
  onClose: () => void
  onSave: () => void
}

// Remove common suppliers - will add local suppliers as needed

const PAYMENT_TERMS = [
  'Cash on Delivery',
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 60',
  'Due on Receipt',
  'Credit Card',
]

export default function SupplierModal({ supplier, onClose, onSave }: SupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    paymentTerms: '',
    deliveryDays: '',
    minimumOrder: '',
    notes: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        website: supplier.website || '',
        paymentTerms: supplier.paymentTerms || '',
        deliveryDays: supplier.deliveryDays || '',
        minimumOrder: supplier.minimumOrder ? (supplier.minimumOrder / 100).toString() : '',
        notes: supplier.notes || '',
        isActive: supplier.isActive,
      })
    }
  }, [supplier])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setSaving(true)
    
    try {
      const payload = {
        name: formData.name,
        contactName: formData.contactName || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        website: formData.website || null,
        paymentTerms: formData.paymentTerms || null,
        deliveryDays: formData.deliveryDays || null,
        minimumOrder: formData.minimumOrder ? Math.round(parseFloat(formData.minimumOrder) * 100) : null,
        notes: formData.notes || null,
        isActive: formData.isActive,
      }

      const url = supplier 
        ? `/api/admin/suppliers/${supplier.id}`
        : '/api/admin/suppliers'
      
      const response = await fetch(url, {
        method: supplier ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save supplier')
      }

      onSave()
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert(error instanceof Error ? error.message : 'Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {supplier ? 'Edit Supplier' : 'Add New Supplier'}
        </h2>


        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., Costco"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Sales representative name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="supplier@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="03-1234-5678"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={2}
                placeholder="Supplier address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="www.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="">Select payment terms</option>
                {PAYMENT_TERMS.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Days
              </label>
              <input
                type="text"
                value={formData.deliveryDays}
                onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="e.g., Mon, Wed, Fri"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Order (¥)
              </label>
              <input
                type="number"
                step="1"
                value={formData.minimumOrder}
                onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="0"
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
                rows={3}
                placeholder="Any additional notes about this supplier"
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
                <span className="text-sm font-medium text-gray-700">
                  Active Supplier
                </span>
              </label>
            </div>
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
              {saving ? 'Saving...' : (supplier ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}