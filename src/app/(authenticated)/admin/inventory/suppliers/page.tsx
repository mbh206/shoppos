'use client'

import { useState, useEffect } from 'react'
import SupplierModal from '@/components/SupplierModal'
import Link from 'next/link'

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
  _count?: {
    purchaseOrders: number
  }
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return
    
    try {
      const response = await fetch(`/api/admin/suppliers/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchSuppliers()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete supplier')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
    }
  }

  const formatMoney = (minorUnits: number | null) => {
    if (!minorUnits) return '-'
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading suppliers...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
          <Link
            href="/admin/inventory"
            className="text-blue-500 hover:text-blue-700"
          >
            ← Back to Inventory
          </Link>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <button
            onClick={() => {
              setEditingSupplier(null)
              setShowModal(true)
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Supplier
          </button>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Delivery Days
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Payment Terms
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Min Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Orders
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
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setEditingSupplier(supplier)
                      setShowModal(true)
                    }}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {supplier.name}
                      </div>
                      {supplier.website && (
                        <div className="text-xs text-blue-600">
                          {supplier.website}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supplier.contactName || '-'}
                      </div>
                      {supplier.phone && (
                        <div className="text-xs text-gray-500">{supplier.phone}</div>
                      )}
                      {supplier.email && (
                        <div className="text-xs text-gray-500">{supplier.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.deliveryDays || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier.paymentTerms || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(supplier.minimumOrder)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {supplier._count?.purchaseOrders || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        supplier.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(supplier.id)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {suppliers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No suppliers added yet. Click "Add Supplier" to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowModal(false)
            setEditingSupplier(null)
          }}
          onSave={() => {
            fetchSuppliers()
            setShowModal(false)
            setEditingSupplier(null)
          }}
        />
      )}
    </div>
  )
}