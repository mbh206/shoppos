'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ReportTab = 'daily' | 'sales' | 'inventory' | 'staff' | 'customers'

type DailySalesData = {
  date: string
  totalSales: number
  orderCount: number
  averageOrderValue: number
  paymentMethods: {
    cash: number
    card: number
    points: number
  }
  categories: {
    retail: number
    fnb: number
    seatTime: number
    rental: number
    membership: number
  }
  topItems: Array<{
    name: string
    quantity: number
    revenue: number
  }>
}

type InventoryData = {
  lowStockItems: Array<{
    id: string
    name: string
    currentStock: number
    minStock: number
    unit: string
    category: 'ingredient' | 'supply' | 'retail'
  }>
  stockValue: {
    ingredients: number
    supplies: number
    retail: number
    total: number
  }
  recentMovements: Array<{
    itemName: string
    type: string
    quantity: number
    date: string
    reason: string
  }>
}

type StaffData = {
  activeToday: number
  totalHours: number
  laborCost: number
  employees: Array<{
    name: string
    clockIn: string
    clockOut: string | null
    regularHours: number
    overtimeHours: number
    breaks: number
  }>
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily')
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [dailyData, setDailyData] = useState<DailySalesData | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [staffData, setStaffData] = useState<StaffData | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchReportData()
  }, [activeTab, dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end
      })

      switch (activeTab) {
        case 'daily':
        case 'sales':
          const salesResponse = await fetch(`/api/reports/sales?${params}`)
          if (salesResponse.ok) {
            const data = await salesResponse.json()
            setDailyData(data)
          }
          break
        
        case 'inventory':
          const inventoryResponse = await fetch(`/api/reports/inventory?${params}`)
          if (inventoryResponse.ok) {
            const data = await inventoryResponse.json()
            setInventoryData(data)
          }
          break
        
        case 'staff':
          const staffResponse = await fetch(`/api/reports/staff?${params}`)
          if (staffResponse.ok) {
            const data = await staffResponse.json()
            setStaffData(data)
          }
          break
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    let csvContent = ''
    let filename = ''

    switch (activeTab) {
      case 'daily':
      case 'sales':
        if (!dailyData) return
        filename = `sales-report-${dateRange.start}-to-${dateRange.end}.csv`
        csvContent = 'Date,Total Sales,Orders,Avg Order Value,Cash,Card,Points\n'
        csvContent += `${dailyData.date},${dailyData.totalSales},${dailyData.orderCount},${dailyData.averageOrderValue},${dailyData.paymentMethods.cash},${dailyData.paymentMethods.card},${dailyData.paymentMethods.points}\n`
        csvContent += '\nCategory,Revenue\n'
        Object.entries(dailyData.categories).forEach(([category, revenue]) => {
          csvContent += `${category},${revenue}\n`
        })
        csvContent += '\nTop Items,Quantity,Revenue\n'
        dailyData.topItems.forEach(item => {
          csvContent += `${item.name},${item.quantity},${item.revenue}\n`
        })
        break

      case 'inventory':
        if (!inventoryData) return
        filename = `inventory-report-${dateRange.start}.csv`
        csvContent = 'Low Stock Items\nName,Current Stock,Min Stock,Unit,Category\n'
        inventoryData.lowStockItems.forEach(item => {
          csvContent += `${item.name},${item.currentStock},${item.minStock},${item.unit},${item.category}\n`
        })
        break

      case 'staff':
        if (!staffData) return
        filename = `staff-report-${dateRange.start}.csv`
        csvContent = 'Staff Report\nName,Clock In,Clock Out,Regular Hours,Overtime,Breaks\n'
        staffData.employees.forEach(emp => {
          csvContent += `${emp.name},${emp.clockIn},${emp.clockOut || 'Active'},${emp.regularHours},${emp.overtimeHours},${emp.breaks}\n`
        })
        break
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return `¥${(amount / 100).toLocaleString('ja-JP')}`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Admin
          </button>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={() => setDateRange({
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Today
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                setDateRange({
                  start: weekAgo.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
                setDateRange({
                  start: monthAgo.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Last 30 Days
            </button>
            <button
              onClick={exportToCSV}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'daily'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Daily Summary
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'sales'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sales Analysis
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'inventory'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'staff'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Staff Hours
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'customers'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Customers
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">Loading report data...</div>
            ) : (
              <>
                {/* Daily Summary Tab */}
                {activeTab === 'daily' && dailyData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600">Total Sales</div>
                        <div className="text-2xl font-bold">{formatCurrency(dailyData.totalSales)}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600">Orders</div>
                        <div className="text-2xl font-bold">{dailyData.orderCount}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600">Avg Order Value</div>
                        <div className="text-2xl font-bold">{formatCurrency(dailyData.averageOrderValue)}</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="text-sm text-yellow-600">Active Staff</div>
                        <div className="text-2xl font-bold">{staffData?.activeToday || 0}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Payment Methods</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Cash</span>
                            <span className="font-medium">{formatCurrency(dailyData.paymentMethods.cash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Card</span>
                            <span className="font-medium">{formatCurrency(dailyData.paymentMethods.card)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points</span>
                            <span className="font-medium">{formatCurrency(dailyData.paymentMethods.points)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-3">Sales by Category</h3>
                        <div className="space-y-2">
                          {Object.entries(dailyData.categories).map(([category, amount]) => (
                            <div key={category} className="flex justify-between">
                              <span className="capitalize">{category}</span>
                              <span className="font-medium">{formatCurrency(amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Top Selling Items</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Item</th>
                              <th className="text-right py-2">Quantity</th>
                              <th className="text-right py-2">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyData.topItems.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2">{item.name}</td>
                                <td className="text-right py-2">{item.quantity}</td>
                                <td className="text-right py-2">{formatCurrency(item.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sales Analysis Tab */}
                {activeTab === 'sales' && dailyData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600">Gross Revenue</div>
                        <div className="text-2xl font-bold">{formatCurrency(dailyData.totalSales)}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600">Total Transactions</div>
                        <div className="text-2xl font-bold">{dailyData.orderCount}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600">Avg Transaction</div>
                        <div className="text-2xl font-bold">{formatCurrency(dailyData.averageOrderValue)}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Revenue Breakdown</h3>
                      <div className="space-y-3">
                        {Object.entries(dailyData.categories).map(([category, amount]) => {
                          const percentage = dailyData.totalSales > 0 
                            ? ((amount / dailyData.totalSales) * 100).toFixed(1)
                            : '0'
                          return (
                            <div key={category}>
                              <div className="flex justify-between mb-1">
                                <span className="capitalize">{category}</span>
                                <span>{formatCurrency(amount)} ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && inventoryData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600">Total Stock Value</div>
                        <div className="text-2xl font-bold">{formatCurrency(inventoryData.stockValue.total)}</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-sm text-red-600">Low Stock Items</div>
                        <div className="text-2xl font-bold">{inventoryData.lowStockItems.length}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600">Ingredients Value</div>
                        <div className="text-2xl font-bold">{formatCurrency(inventoryData.stockValue.ingredients)}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600">Retail Value</div>
                        <div className="text-2xl font-bold">{formatCurrency(inventoryData.stockValue.retail)}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Low Stock Alert</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Item</th>
                              <th className="text-left py-2">Category</th>
                              <th className="text-right py-2">Current</th>
                              <th className="text-right py-2">Min Stock</th>
                              <th className="text-left py-2">Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryData.lowStockItems.map((item) => (
                              <tr key={item.id} className="border-b">
                                <td className="py-2 font-medium">{item.name}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    item.category === 'ingredient' ? 'bg-green-100 text-green-800' :
                                    item.category === 'supply' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {item.category}
                                  </span>
                                </td>
                                <td className="text-right py-2 text-red-600 font-medium">
                                  {item.currentStock}
                                </td>
                                <td className="text-right py-2">{item.minStock}</td>
                                <td className="py-2">{item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Recent Stock Movements</h3>
                      <div className="space-y-2">
                        {inventoryData.recentMovements.map((movement, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b">
                            <div>
                              <div className="font-medium">{movement.itemName}</div>
                              <div className="text-sm text-gray-500">{movement.reason}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${
                                movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(movement.date).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Hours Tab */}
                {activeTab === 'staff' && staffData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600">Active Staff</div>
                        <div className="text-2xl font-bold">{staffData.activeToday}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600">Total Hours</div>
                        <div className="text-2xl font-bold">{staffData.totalHours.toFixed(1)}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600">Labor Cost</div>
                        <div className="text-2xl font-bold">{formatCurrency(staffData.laborCost)}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Staff Time Records</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Employee</th>
                              <th className="text-left py-2">Clock In</th>
                              <th className="text-left py-2">Clock Out</th>
                              <th className="text-right py-2">Regular</th>
                              <th className="text-right py-2">Overtime</th>
                              <th className="text-right py-2">Breaks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffData.employees.map((emp, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2 font-medium">{emp.name}</td>
                                <td className="py-2">{formatTime(emp.clockIn)}</td>
                                <td className="py-2">
                                  {emp.clockOut ? formatTime(emp.clockOut) : 
                                    <span className="text-green-600">Active</span>
                                  }
                                </td>
                                <td className="text-right py-2">{emp.regularHours.toFixed(1)}h</td>
                                <td className="text-right py-2">
                                  {emp.overtimeHours > 0 && 
                                    <span className="text-orange-600">{emp.overtimeHours.toFixed(1)}h</span>
                                  }
                                </td>
                                <td className="text-right py-2">{emp.breaks}m</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customers Tab */}
                {activeTab === 'customers' && (
                  <div className="text-center py-8 text-gray-500">
                    Customer analytics coming soon...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}