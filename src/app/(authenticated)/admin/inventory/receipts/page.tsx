'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Receipt = {
  id: string
  orderNumber: string
  supplierName: string
  supplier: {
    id: string
    name: string
  } | null
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  orderDate: string
  receivedDate: string | null
  subtotal: number
  tax: number
  total: number
  notes: string | null
  _count: {
    items: number
  }
}

export default function ReceiptsPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    try {
      // Fetch all purchase orders (which are actually receipts in this workflow)
      const response = await fetch('/api/admin/purchase-orders?status=received')
      if (response.ok) {
        const data = await response.json()
        setReceipts(data)
      }
    } catch (error) {
      console.error('Error fetching receipts:', error)
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

  const extractReceiptNumber = (notes: string | null) => {
    if (!notes) return ''
    const match = notes.match(/Receipt #: ([^\n]+)/)
    return match ? match[1] : ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading receipts...</div>
      </div>
    )
  }

  // Calculate totals
  const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0)
  const thisMonth = receipts.filter(r => {
    const date = new Date(r.orderDate)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const monthlySpent = thisMonth.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Purchase Receipts</h1>
          <Link
            href="/admin/inventory/receipts/new"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Enter New Receipt
          </Link>
        </div>

      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Receipts</div>
          <div className="text-2xl font-bold">{receipts.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">This Month</div>
          <div className="text-2xl font-bold">{thisMonth.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Monthly Spent</div>
          <div className="text-2xl font-bold">{formatMoney(monthlySpent)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Spent</div>
          <div className="text-2xl font-bold">{formatMoney(totalSpent)}</div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Receipt #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subtotal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tax
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipts.map((receipt) => {
                const receiptNum = extractReceiptNumber(receipt.notes)
                
                return (
                  <tr
                    key={receipt.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/inventory/purchase-orders/${receipt.id}`)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {formatDate(receipt.orderDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {receiptNum || receipt.orderNumber}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {receipt.supplier?.name || receipt.supplierName}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt._count.items}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(receipt.subtotal)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(receipt.tax)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatMoney(receipt.total)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/inventory/purchase-orders/${receipt.id}`)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {receipts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No receipts found. Click "Enter New Receipt" to add your first receipt.
            </div>
          )}
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => {
            const date = new Date()
            date.setMonth(date.getMonth() - i)
            const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            const monthReceipts = receipts.filter(r => {
              const receiptDate = new Date(r.orderDate)
              return receiptDate.getMonth() === date.getMonth() && 
                     receiptDate.getFullYear() === date.getFullYear()
            })
            const total = monthReceipts.reduce((sum, r) => sum + r.total, 0)
            
            return (
              <div key={i} className="text-center">
                <div className="text-sm text-gray-600">{month}</div>
                <div className="text-xl font-bold">{formatMoney(total)}</div>
                <div className="text-xs text-gray-500">{monthReceipts.length} receipts</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}