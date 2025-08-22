'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { log } from 'console'

type Order = {
  id: string
  openedAt: string
  closedAt?: string | null
  status: string
  customer?: {
    id: string
    displayName?: string | null
    pointsBalance: number
  } | null
  items: Array<{
    id: string
    name: string
    qty: number
    unitPriceMinor: number
    taxMinor: number
    totalMinor: number
    meta?: any
  }>
  payments: Array<{
    id: string
    method: string
    amountMinor: number
    processedAt: string
  }>
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
    startedAt: string
    endedAt?: string | null
    billedMinutes?: number | null
  }>
  tipMinor?: number | null
  discountMinor?: number | null
  pointsEarned?: number
  pointsRedeemed?: number
  paymentGroupId?: string | null
}

export default function ReceiptPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchOrder()
  }, [])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        // Calculate points earned from payments
        let pointsEarned = 0
        let pointsRedeemed = 0
        
        // Check for points transactions
        const pointsResponse = await fetch(`/api/points/transactions?orderId=${resolvedParams.id}`)
        if (pointsResponse.ok) {
          const transactions = await pointsResponse.json()
          transactions.forEach((tx: any) => {
            if (tx.type === 'EARNED') {
              pointsEarned += tx.amount
            } else if (tx.type === 'REDEEMED') {
              pointsRedeemed += Math.abs(tx.amount)
            }
          })
        }
        
        // If this is a group payment, fetch all merged orders
        let mergedOrders = []
        if (data.paymentGroupId && data.isPrimaryPayer) {
          const mergedResponse = await fetch(`/api/orders?paymentGroupId=${data.paymentGroupId}`)
          if (mergedResponse.ok) {
            const mergedData = await mergedResponse.json()
            // Combine all seat sessions and items from merged orders
            mergedOrders = mergedData.filter((o: any) => o.id !== resolvedParams.id)
            
            // Combine seat sessions
            const allSeatSessions = [...(data.seatSessions || [])]
            mergedOrders.forEach((order: any) => {
              if (order.seatSessions) {
                allSeatSessions.push(...order.seatSessions)
              }
            })
            data.seatSessions = allSeatSessions
            
            // Combine game items
            const allItems = [...data.items]
            mergedOrders.forEach((order: any) => {
              if (order.items) {
                allItems.push(...order.items)
              }
            })
            data.items = allItems
          }
        }
        
        setOrder({
          ...data,
          pointsEarned,
          pointsRedeemed
        })
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${Math.floor(minorUnits / 100).toLocaleString('ja-JP')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTotal = () => {
    if (!order) return 0
    const subtotal = order.items.reduce((sum, item) => sum + item.totalMinor, 0)
    return subtotal + (order.tipMinor || 0) - (order.discountMinor || 0)
  }

  const getTaxIncluded = () => {
    if (!order) return 0
    // Calculate 10% tax that's included in the total
    const total = getTotal()
    return Math.round(total / 10) // Tax is 1/11 of tax-inclusive price
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading receipt...</div>
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
    <div className="min-h-screen bg-gray-50 p-4 print:p-0 print:bg-white">
      <div className="max-w-2xl mx-auto">
        {/* Header with actions - hidden when printing */}
        <div className="mb-6 print:hidden">
          <button
            onClick={() => router.push('/orders')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Orders
          </button>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none">
          {/* Store Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Board Game Café</h1>
            <p className="text-gray-600">123 Gaming Street, Tokyo</p>
            <p className="text-gray-600">Tel: 03-1234-5678</p>
          </div>

          {/* Order Info */}
          <div className="border-t border-b py-4 mb-4">
            <div className="flex justify-between text-sm">
              <span>Order #</span>
              <span className="font-mono">{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Date</span>
              <span>{formatDate(order.closedAt || order.openedAt)}</span>
            </div>
            {order.customer && (
              <div className="flex justify-between text-sm">
                <span>Customer</span>
                <span>{order.customer.displayName || 'Guest'}</span>
              </div>
            )}
            {order.paymentGroupId && order.isPrimaryPayer && (
              <div className="flex justify-between text-sm font-semibold text-green-600">
                <span>Type</span>
                <span>Group Payment</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-4">
            {/* Regular Items */}
            {order.items.filter(item => !item.meta?.isGame).map((item) => (
              <div key={item.id} className="flex justify-between py-2">
                <div className="flex-1">
                  <div>{item.name}</div>
                  {item.qty > 1 && (
                    <div className="text-sm text-gray-600">
                      {item.qty} × {formatMoney(item.totalMinor / item.qty)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {formatMoney(item.totalMinor)}
                </div>
              </div>
            ))}
          </div>

          {/* Seat/Player Details with Games Section */}
          {order.seatSessions && order.seatSessions.length > 0 && (
            <div className="border-t border-b py-3 mb-3">
              <div className="text-sm font-semibold mb-2">Seat & Game Details</div>
              {order.seatSessions.map((session, idx) => {
                // Find games played at this seat's table
                const tableGames = order.items.filter(item => 
                  item.meta?.isGame && 
                  session.seat?.table?.id
                ).map(game => game.name.replace('Game: ', ''))
                
                return (
                  <div key={idx} className="text-sm mb-3 bg-gray-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        Table {session.seat.table.name}, Seat {session.seat.number}
                      </span>
                      {session.billedMinutes && (
                        <span className="text-gray-600">
                          {Math.floor(session.billedMinutes / 60)}h {session.billedMinutes % 60}m
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Player: {session.customer?.displayName || 'Guest'}
                    </div>
                    {tableGames.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs font-medium text-gray-700 mb-1">Games Played:</div>
                        {tableGames.map((gameName, gameIdx) => (
                          <div key={gameIdx} className="text-xs text-purple-600 ml-2">
                            🎲 {gameName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            {order.discountMinor && order.discountMinor > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatMoney(order.discountMinor)}</span>
              </div>
            )}
            {order.tipMinor && order.tipMinor > 0 && (
              <div className="flex justify-between">
                <span>Tip</span>
                <span>{formatMoney(order.tipMinor)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatMoney(getTotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>(Tax included 10%)</span>
              <span>{formatMoney(getTaxIncluded())}</span>
            </div>
          </div>

          {/* Payment Methods */}
          {order.payments && order.payments.length > 0 && (
            <div className="border-t mt-4 pt-4">
              <div className="text-sm font-semibold mb-2">Payment</div>
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span className="capitalize">{payment.method}</span>
                  <span>{formatMoney(payment.amountMinor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Points Section */}
          {(order.pointsEarned || order.pointsRedeemed || order.customer) && (
            <div className="border-t mt-4 pt-4 bg-yellow-50 -mx-8 px-8 py-4 print:bg-white">
              <div className="text-sm font-semibold mb-2">Points Summary</div>
              
              {order.pointsRedeemed && order.pointsRedeemed > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span>Points Redeemed</span>
                  <span className="text-red-600">-¥{order.pointsRedeemed}</span>
                </div>
              )}
              
              {order.pointsEarned && order.pointsEarned > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span>Points Earned</span>
                  <span className="text-green-600">+¥{order.pointsEarned}</span>
                </div>
              )}
              
              {order.customer && (
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Current Balance</span>
                  <span>¥{order.customer.pointsBalance}</span>
                </div>
              )}
              
              {!order.customer && order.pointsEarned && order.pointsEarned > 0 && (
                <div className="text-xs text-gray-600 mt-2 italic">
                  Sign up for our loyalty program to start earning points!
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600">Thank you for your visit!</p>
            <p className="text-sm text-gray-600">We hope to see you again soon</p>
            {order.customer && order.customer.pointsBalance > 0 && (
              <p className="text-sm font-semibold mt-2">
                You have ¥{order.customer.pointsBalance} in points to use on your next visit!
              </p>
            )}
          </div>
        </div>

        {/* Actions - hidden when printing */}
        <div className="mt-6 flex gap-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Print Receipt
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
          >
            Back to Orders
          </button>
        </div>
      </div>
    </div>
  )
}