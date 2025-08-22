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
    id: string
    displayName?: string | null
    pointsBalance: number
  } | null
  items: OrderItem[]
  paymentGroupId?: string | null
  isPrimaryPayer?: boolean
  paidByOrderId?: string | null
}

type MergedOrder = {
  id: string
  customer?: {
    displayName?: string | null
  } | null
  items: OrderItem[]
  seatSessions?: Array<{
    seat: {
      number: number
      table: {
        name: string
      }
    }
    customer?: {
      displayName?: string | null
    } | null
  }>
}

export default function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [mergedOrders, setMergedOrders] = useState<MergedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('card')
  const [splitPayments, setSplitPayments] = useState({
    cash: 0,
    card: 0,
    points: 0
  })
  const [showSplitModal, setShowSplitModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchOrder()
  }, [])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      const data = await response.json()
      setOrder(data)
      
      // If this order is part of a payment group, fetch all merged orders
      if (data.paymentGroupId) {
        const mergedResponse = await fetch(`/api/orders?paymentGroupId=${data.paymentGroupId}`)
        if (mergedResponse.ok) {
          const mergedData = await mergedResponse.json()
          // Filter out the current order from merged list
          setMergedOrders(mergedData.filter((o: MergedOrder) => o.id !== resolvedParams.id))
        }
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching order:', error)
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100)}`
  }

  const getTotal = () => {
    if (!order) return 0
    let total = order.items.reduce((sum, item) => sum + item.totalMinor, 0)
    
    // Add totals from merged orders if this is the primary payer
    if (order.isPrimaryPayer && mergedOrders.length > 0) {
      for (const mergedOrder of mergedOrders) {
        total += mergedOrder.items.reduce((sum, item) => sum + item.totalMinor, 0)
      }
    }
    
    return total
  }

  const getTaxIncluded = () => {
    const total = getTotal()
    // Calculate 10% tax that's included in the total
    return Math.round(total / 10) // Tax is 1/11 of tax-inclusive price
  }

  const handlePayment = async () => {
    // For split payments, show the modal first
    if (paymentMethod === 'split') {
      setShowSplitModal(true)
      return
    }

    setProcessing(true)
    
    try {
      // For card payments, use Square Payments API for sandbox testing
      if (paymentMethod === 'card') {
        // Try the simpler payment API for sandbox testing
        const paymentResponse = await fetch('/api/square/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: resolvedParams.id,
              amountMinor: getTotal()
            })
          })
          
          if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json()
            
            // Process the payment in our system
            const response = await fetch(`/api/orders/${resolvedParams.id}/payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payments: [{ method: 'card', amount: getTotal() }],
                amountMinor: getTotal(),
              })
            })
            
            if (response.ok) {
              router.push(`/receipt/${resolvedParams.id}`)
            } else {
              const error = await response.json()
              alert(error.error || 'Payment recording failed')
              setProcessing(false)
            }
            
            return
          } else {
            const error = await paymentResponse.json()
            console.error('Square payment failed:', error)
            // Fall through to manual payment processing
          }
      }
      
      // Build payment array based on selected method
      let payments = []
      if (paymentMethod === 'cash') {
        payments = [{ method: 'cash', amount: getTotal() }]
      } else if (paymentMethod === 'card') {
        payments = [{ method: 'card', amount: getTotal() }]
      }

      const response = await fetch(`/api/orders/${resolvedParams.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments,
          amountMinor: getTotal(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/receipt/${resolvedParams.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Payment failed')
        setProcessing(false)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  const handleSplitPayment = async () => {
    setProcessing(true)
    setShowSplitModal(false)
    
    try {
      // Build payments array from split amounts
      const payments = []
      if (splitPayments.cash > 0) {
        payments.push({ method: 'cash', amount: splitPayments.cash * 100 }) // Convert to minor units
      }
      if (splitPayments.card > 0) {
        payments.push({ method: 'card', amount: splitPayments.card * 100 })
      }
      if (splitPayments.points > 0) {
        payments.push({ method: 'points', amount: splitPayments.points * 100 })
      }

      const response = await fetch(`/api/orders/${resolvedParams.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments,
          amountMinor: getTotal(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // Redirect to receipt page to show payment summary and points earned
        router.push(`/receipt/${resolvedParams.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Payment failed')
        setProcessing(false)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
      setProcessing(false)
    }
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
            <h2 className="text-xl font-semibold mb-4">
              Order Summary
              {order.isPrimaryPayer && mergedOrders.length > 0 && (
                <span className="ml-2 text-sm font-normal text-green-600">
                  (Paying for {mergedOrders.length + 1} orders)
                </span>
              )}
            </h2>
            
            {/* Merged Bills Notice */}
            {order.paymentGroupId && !order.isPrimaryPayer && order.paidByOrderId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  This bill will be paid together with other orders in the group.
                  <br />
                  Payment will be processed by the primary order.
                </div>
              </div>
            )}
            
            {/* Customer Info */}
            {order.customer && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-900 font-medium mb-1">Customer</div>
                <div className="text-blue-800">{order.customer.displayName || 'Guest'}</div>
                {order.customer.pointsBalance > 0 && (
                  <div className="text-sm text-blue-600 mt-1">
                    Points available: ¥{order.customer.pointsBalance}
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2 mb-4">
              {/* Current Order Items */}
              <div className="bg-gray-50 p-2 rounded mb-2">
                <div className="font-medium text-sm text-gray-700">Your Order</div>
                <div className="text-sm text-blue-600 font-medium">
                  Customer: {order.customer?.displayName || 'Guest (No Customer)'}
                </div>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between py-2 border-b">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.qty > 1 && (
                      <div className="text-sm text-gray-500">
                        {item.qty} × {formatMoney(item.totalMinor / item.qty)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div>{formatMoney(item.totalMinor)}</div>
                  </div>
                </div>
              ))}
              
              {/* Merged Orders Items */}
              {order.isPrimaryPayer && mergedOrders.map((mergedOrder) => (
                <div key={mergedOrder.id} className="mt-4">
                  <div className="bg-gray-50 p-2 rounded mb-2">
                    <div className="font-medium text-sm text-gray-700">
                      {mergedOrder.seatSessions && mergedOrder.seatSessions[0] && (
                        <>
                          Table {mergedOrder.seatSessions[0].seat.table.name}, Seat {mergedOrder.seatSessions[0].seat.number}
                        </>
                      )}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      Customer: {mergedOrder.customer?.displayName || 
                               mergedOrder.seatSessions?.[0]?.customer?.displayName || 
                               'Guest (No Customer)'}
                    </div>
                  </div>
                  {mergedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.qty > 1 && (
                          <div className="text-sm text-gray-500">
                            {item.qty} × {formatMoney(item.totalMinor / item.qty)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div>{formatMoney(item.totalMinor)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-xl font-semibold">
                <span>Total</span>
                <span>{formatMoney(getTotal())}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 italic mt-1">
                <span>Tax included (10%)</span>
                <span>{formatMoney(getTaxIncluded())}</span>
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
                  <div className="font-medium">Credit/Debit Card</div>
                  <div className="text-sm text-gray-500">Pay with card (Square Sandbox)</div>
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

              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="split"
                  checked={paymentMethod === 'split'}
                  onChange={() => setPaymentMethod('split')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">Split Payment</div>
                  <div className="text-sm text-gray-500">
                    Pay with multiple methods
                    {order?.customer?.pointsBalance && order.customer.pointsBalance > 0 && (
                      <span className="ml-1">(¥{order.customer.pointsBalance} points available)</span>
                    )}
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
                  Square Sandbox Mode: Test card payments will be simulated automatically.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Using test card: Visa ending in 1111 (always approved)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Split Payment Modal */}
      {showSplitModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSplitModal(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Split Payment</h2>
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="text-lg font-semibold mb-2">
                  Total: {formatMoney(getTotal())}
                </div>
                {order?.customer?.pointsBalance && order.customer.pointsBalance > 0 && (
                  <div className="text-sm text-gray-600">
                    Available Points: ¥{order.customer.pointsBalance}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Points */}
                {order?.customer?.pointsBalance && order.customer.pointsBalance > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points (¥{order.customer.pointsBalance} available)
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2">¥</span>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(order.customer.pointsBalance, Math.floor(getTotal() / 100))}
                        value={splitPayments.points}
                        onChange={(e) => {
                          const value = Math.min(
                            parseInt(e.target.value) || 0,
                            Math.min(order.customer.pointsBalance, Math.floor(getTotal() / 100))
                          )
                          setSplitPayments({
                            ...splitPayments,
                            points: value
                          })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const maxPoints = Math.min(
                            order.customer?.pointsBalance || 0,
                            Math.floor(getTotal() / 100)
                          )
                          setSplitPayments({
                            ...splitPayments,
                            points: maxPoints
                          })
                        }}
                        className="ml-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                )}

                {/* Cash */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">¥</span>
                    <input
                      type="number"
                      min="0"
                      value={splitPayments.cash}
                      onChange={(e) => setSplitPayments({
                        ...splitPayments,
                        cash: parseInt(e.target.value) || 0
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Card */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">¥</span>
                    <input
                      type="number"
                      min="0"
                      value={splitPayments.card}
                      onChange={(e) => setSplitPayments({
                        ...splitPayments,
                        card: parseInt(e.target.value) || 0
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const remaining = Math.floor(getTotal() / 100) - splitPayments.cash - splitPayments.points
                        setSplitPayments({
                          ...splitPayments,
                          card: Math.max(0, remaining)
                        })
                      }}
                      className="ml-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                      Remaining
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1 text-sm">
                  {splitPayments.points > 0 && (
                    <div className="flex justify-between">
                      <span>Points:</span>
                      <span>¥{splitPayments.points}</span>
                    </div>
                  )}
                  {splitPayments.cash > 0 && (
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <span>¥{splitPayments.cash}</span>
                    </div>
                  )}
                  {splitPayments.card > 0 && (
                    <div className="flex justify-between">
                      <span>Card:</span>
                      <span>¥{splitPayments.card}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total:</span>
                    <span>¥{splitPayments.points + splitPayments.cash + splitPayments.card}</span>
                  </div>
                </div>
                {(splitPayments.points + splitPayments.cash + splitPayments.card) * 100 !== getTotal() && (
                  <div className="mt-2 text-sm text-red-600">
                    Payment amounts must equal {formatMoney(getTotal())}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSplitPayment}
                  disabled={
                    (splitPayments.points + splitPayments.cash + splitPayments.card) * 100 !== getTotal() ||
                    processing
                  }
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}