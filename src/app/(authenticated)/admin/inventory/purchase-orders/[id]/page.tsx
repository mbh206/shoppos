'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type PurchaseOrder = {
  id: string
  orderNumber: string
  supplierName: string
  supplier: {
    id: string
    name: string
    contactName: string | null
    phone: string | null
    email: string | null
    paymentTerms: string | null
  } | null
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  orderDate: string
  expectedDate: string | null
  receivedDate: string | null
  subtotal: number
  tax: number
  shipping: number
  total: number
  notes: string | null
  invoiceNumber: string | null
  paymentStatus: string | null
  paymentDate: string | null
  items: {
    id: string
    quantity: number
    unitCost: number
    totalCost: number
    receivedQty: number
    notes: string | null
    ingredient: {
      id: string
      name: string
      unit: string
      stockQuantity: number
    }
  }[]
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function PurchaseOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [receiving, setReceiving] = useState(false)
  const [receivingData, setReceivingData] = useState<Record<string, { qty: number, notes: string }>>({})

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/admin/purchase-orders/${id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        
        // Initialize receiving data
        const initData: Record<string, { qty: number, notes: string }> = {}
        data.items.forEach((item: any) => {
          initData[item.id] = {
            qty: item.quantity - item.receivedQty,
            notes: ''
          }
        })
        setReceivingData(initData)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrder()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleReceive = async () => {
    if (!receiving) {
      setReceiving(true)
      return
    }

    // Process receiving
    try {
      const items = Object.entries(receivingData).map(([itemId, data]) => ({
        itemId,
        receivedQty: data.qty,
        notes: data.notes
      }))

      const response = await fetch(`/api/admin/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })

      if (response.ok) {
        setReceiving(false)
        fetchOrder()
        alert('Items received successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to receive items')
      }
    } catch (error) {
      console.error('Error receiving items:', error)
      alert('Failed to receive items')
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
        <div className="text-xl">Loading purchase order...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-xl">Purchase order not found</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/inventory/purchase-orders"
          className="text-blue-500 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Purchase Orders
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Purchase Order {order.orderNumber}</h1>
            <div className="mt-2 flex gap-3">
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                STATUS_COLORS[order.status]
              }`}>
                {order.status}
              </span>
              {order.paymentStatus && (
                <span className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800">
                  Payment: {order.paymentStatus}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {order.status === 'draft' && (
              <button
                onClick={() => handleStatusUpdate('sent')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Mark as Sent
              </button>
            )}
            {(order.status === 'sent' || order.status === 'partial') && (
              <button
                onClick={handleReceive}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                {receiving ? 'Save Receipt' : 'Receive Items'}
              </button>
            )}
            {receiving && (
              <button
                onClick={() => setReceiving(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-medium">{formatDate(order.orderDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expected Date:</span>
              <span className="font-medium">{formatDate(order.expectedDate)}</span>
            </div>
            {order.receivedDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Received Date:</span>
                <span className="font-medium">{formatDate(order.receivedDate)}</span>
              </div>
            )}
            {order.invoiceNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice #:</span>
                <span className="font-medium">{order.invoiceNumber}</span>
              </div>
            )}
            {order.notes && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-gray-600">Notes:</span>
                <p className="mt-1">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Supplier Information</h2>
          <div className="space-y-2 text-sm">
            <div className="font-medium text-lg">
              {order.supplier?.name || order.supplierName}
            </div>
            {order.supplier && (
              <>
                {order.supplier.contactName && (
                  <div>
                    <span className="text-gray-600">Contact:</span> {order.supplier.contactName}
                  </div>
                )}
                {order.supplier.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span> {order.supplier.phone}
                  </div>
                )}
                {order.supplier.email && (
                  <div>
                    <span className="text-gray-600">Email:</span> {order.supplier.email}
                  </div>
                )}
                {order.supplier.paymentTerms && (
                  <div>
                    <span className="text-gray-600">Payment Terms:</span> {order.supplier.paymentTerms}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Order Items</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Ordered
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Received
                </th>
                {receiving && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Receiving Now
                  </th>
                )}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit Cost
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                {receiving && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map((item) => {
                const pending = item.quantity - item.receivedQty
                
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.ingredient.name}</div>
                      <div className="text-xs text-gray-500">
                        Current stock: {item.ingredient.stockQuantity} {item.ingredient.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.quantity} {item.ingredient.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className={item.receivedQty === item.quantity ? 'text-green-600' : ''}>
                        {item.receivedQty} {item.ingredient.unit}
                      </span>
                      {pending > 0 && !receiving && (
                        <div className="text-xs text-gray-500">
                          ({pending} pending)
                        </div>
                      )}
                    </td>
                    {receiving && (
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={receivingData[item.id]?.qty || 0}
                          onChange={(e) => setReceivingData({
                            ...receivingData,
                            [item.id]: {
                              ...receivingData[item.id],
                              qty: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {formatMoney(item.unitCost)}/{item.ingredient.unit}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(item.totalCost)}
                    </td>
                    {receiving && (
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={receivingData[item.id]?.notes || ''}
                          onChange={(e) => setReceivingData({
                            ...receivingData,
                            [item.id]: {
                              ...receivingData[item.id],
                              notes: e.target.value
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="Optional notes"
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t pt-4">
          <div className="flex justify-end">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-8">
                <span>Subtotal:</span>
                <span className="font-medium">{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Tax:</span>
                <span className="font-medium">{formatMoney(order.tax)}</span>
              </div>
              {order.shipping > 0 && (
                <div className="flex justify-between gap-8">
                  <span>Shipping:</span>
                  <span className="font-medium">{formatMoney(order.shipping)}</span>
                </div>
              )}
              <div className="flex justify-between gap-8 text-lg font-bold">
                <span>Total:</span>
                <span>{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}