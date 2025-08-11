'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

type OrderItem = {
  id: string
  name: string
  qty: number
  unitPriceMinor: number
  taxMinor: number
  totalMinor: number
}

type Order = {
  id: string
  status: string
  customer?: {
    displayName?: string | null
  } | null
  items: OrderItem[]
}

export default function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card')
  const router = useRouter()

  useEffect(() => {
    fetchOrder()
  }, [])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      const data = await response.json()
      setOrder(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching order:', error)
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const getSubtotal = () => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + (item.totalMinor - item.taxMinor), 0)
  }

  const getTax = () => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + item.taxMinor, 0)
  }

  const getTotal = () => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + item.totalMinor, 0)
  }

  const handlePayment = async () => {
    setProcessing(true)
    
    // Simulate payment processing
    setTimeout(() => {
      alert(`Payment of ${formatMoney(getTotal())} processed via ${paymentMethod}`)
      router.push('/orders')
    }, 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading checkout...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Order not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/orders/${resolvedParams.id}`)}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Order
          </button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-2 mb-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.qty} × {formatMoney(item.unitPriceMinor)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{formatMoney(item.totalMinor - item.taxMinor)}</div>
                    {item.taxMinor > 0 && (
                      <div className="text-xs text-gray-500">
                        +{formatMoney(item.taxMinor)} tax
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (10%)</span>
                <span>{formatMoney(getTax())}</span>
              </div>
              <div className="flex justify-between text-xl font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatMoney(getTotal())}</span>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            
            <div className="space-y-4">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">Square Terminal</div>
                  <div className="text-sm text-gray-500">Pay with card via Square Terminal</div>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </label>

              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">Cash</div>
                  <div className="text-sm text-gray-500">Pay with cash at counter</div>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : `Pay ${formatMoney(getTotal())}`}
              </button>
              
              <button
                onClick={() => router.push(`/orders/${resolvedParams.id}`)}
                disabled={processing}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {paymentMethod === 'card' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Square Terminal integration will be activated once Square credentials are configured.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}