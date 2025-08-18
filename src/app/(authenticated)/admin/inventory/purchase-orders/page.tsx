'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PurchaseOrder = {
  id: string
  orderNumber: string
  supplierName: string
  supplier: {
    id: string
    name: string
  } | null
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  orderDate: string
  expectedDate: string | null
  receivedDate: string | null
  subtotal: number
  tax: number
  total: number
  invoiceNumber: string | null
  paymentStatus: string | null
  _count: {
    items: number
  }
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

const PAYMENT_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800'
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/admin/purchase-orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toFixed(0)}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading purchase orders...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <Link
            href="/admin/inventory/purchase-orders/new"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Purchase Order
          </Link>
        </div>

        {/* Quick Links */}
        <div className="flex gap-4 mb-4">
          <Link
            href="/admin/inventory"
            className="text-blue-500 hover:text-blue-700"
          >
            ← Back to Inventory
          </Link>
          <Link
            href="/admin/inventory/suppliers"
            className="text-blue-500 hover:text-blue-700"
          >
            Manage Suppliers
          </Link>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded ${
              statusFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1 rounded ${
              statusFilter === 'draft'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setStatusFilter('sent')}
            className={`px-3 py-1 rounded ${
              statusFilter === 'sent'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3 py-1 rounded ${
              statusFilter === 'partial'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Partial
          </button>
          <button
            onClick={() => setStatusFilter('received')}
            className={`px-3 py-1 rounded ${
              statusFilter === 'received'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Received
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expected
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/inventory/purchase-orders/${order.id}`)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </div>
                    {order.invoiceNumber && (
                      <div className="text-xs text-gray-500">
                        Invoice: {order.invoiceNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.supplier?.name || order.supplierName}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(order.orderDate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(order.expectedDate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order._count.items}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatMoney(order.total)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      STATUS_COLORS[order.status]
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.paymentStatus && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        PAYMENT_STATUS_COLORS[order.paymentStatus as keyof typeof PAYMENT_STATUS_COLORS] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/inventory/purchase-orders/${order.id}`)
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {order.status === 'sent' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/inventory/purchase-orders/${order.id}/receive`)
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No purchase orders found.
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Orders</div>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending Receipt</div>
          <div className="text-2xl font-bold">
            {orders.filter(o => o.status === 'sent' || o.status === 'partial').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending Payment</div>
          <div className="text-2xl font-bold">
            {orders.filter(o => o.paymentStatus === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold">
            {formatMoney(orders.reduce((sum, o) => sum + o.total, 0))}
          </div>
        </div>
      </div>
    </div>
  )
}