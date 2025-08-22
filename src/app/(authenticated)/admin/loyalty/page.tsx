'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type MembershipPlan = {
  id: string
  name: string
  nameJa?: string | null
  description?: string | null
  price: number
  hoursIncluded: number
  overageRate: number
  earnRateDenominator: number
  pointsOnPurchase: number
  isActive: boolean
}

type PointsSettings = {
  regularEarnRate: number
  memberEarnRate: number
  redemptionRate: number
}

type Customer = {
  id: string
  displayName?: string | null
  email: string
  pointsBalance: number
  memberships: Array<{
    id: string
    status: string
    startDate: string
    endDate: string
    hoursUsed: number
    plan: MembershipPlan
  }>
}

export default function LoyaltyManagementPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'plans' | 'customers' | 'transactions'>('settings')
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [pointsSettings, setPointsSettings] = useState<PointsSettings>({
    regularEarnRate: 50,
    memberEarnRate: 40,
    redemptionRate: 1
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    nameJa: '',
    description: '',
    price: 800000, // ¥8,000 in minor units
    hoursIncluded: 20,
    overageRate: 30000, // ¥300 in minor units
    pointsOnPurchase: 200,
    earnRateDenominator: 40
  })
  const [showPointsAdjustModal, setShowPointsAdjustModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [pointsAdjustment, setPointsAdjustment] = useState({
    amount: 0,
    reason: '',
    type: 'add' as 'add' | 'subtract'
  })
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'settings' || activeTab === 'plans') {
        // Fetch membership plans
        const plansResponse = await fetch('/api/memberships/plans')
        if (plansResponse.ok) {
          const plans = await plansResponse.json()
          setMembershipPlans(plans)
        }

        // Fetch points settings
        const settingsResponse = await fetch('/api/points/settings')
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          setPointsSettings({
            regularEarnRate: settings.regularEarnRate || 50,
            memberEarnRate: settings.memberEarnRate || 40,
            redemptionRate: settings.redemptionRate || 1
          })
        }
      }

      if (activeTab === 'customers') {
        // Fetch customers with loyalty info
        const customersResponse = await fetch('/api/customers?includeLoyalty=true')
        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          setCustomers(customersData)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/points/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointsSettings)
      })

      if (response.ok) {
        alert('Points settings updated successfully')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const handleSavePlan = async () => {
    try {
      const url = editingPlan 
        ? `/api/memberships/plans/${editingPlan.id}`
        : '/api/memberships/plans'
      
      const method = editingPlan ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm)
      })

      if (response.ok) {
        alert(`Plan ${editingPlan ? 'updated' : 'created'} successfully`)
        setShowPlanModal(false)
        setEditingPlan(null)
        fetchData()
      }
    } catch (error) {
      console.error('Error saving plan:', error)
      alert('Failed to save plan')
    }
  }

  const handleAdjustPoints = async () => {
    if (!selectedCustomer) return

    try {
      const response = await fetch('/api/points/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: pointsAdjustment.type === 'add' 
            ? pointsAdjustment.amount 
            : -pointsAdjustment.amount,
          reason: pointsAdjustment.reason
        })
      })

      if (response.ok) {
        alert('Points adjusted successfully')
        setShowPointsAdjustModal(false)
        setSelectedCustomer(null)
        setPointsAdjustment({ amount: 0, reason: '', type: 'add' })
        fetchData()
      }
    } catch (error) {
      console.error('Error adjusting points:', error)
      alert('Failed to adjust points')
    }
  }

  const formatMoney = (minorUnits: number) => {
    return `¥${(minorUnits / 100).toLocaleString('ja-JP')}`
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
          <h1 className="text-3xl font-bold">Loyalty & Membership Management</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'settings'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Points Settings
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'plans'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Membership Plans
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'customers'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Customer Loyalty
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'transactions'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Transactions
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                {/* Points Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4">Points System Configuration</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Regular Customer Earn Rate
                        </label>
                        <div className="flex items-center gap-2">
                          <span>1 point per ¥</span>
                          <input
                            type="number"
                            min="1"
                            value={pointsSettings.regularEarnRate || 50}
                            onChange={(e) => setPointsSettings({
                              ...pointsSettings,
                              regularEarnRate: parseInt(e.target.value) || 50
                            })}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span>spent</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Member Earn Rate
                        </label>
                        <div className="flex items-center gap-2">
                          <span>1 point per ¥</span>
                          <input
                            type="number"
                            min="1"
                            value={pointsSettings.memberEarnRate || 40}
                            onChange={(e) => setPointsSettings({
                              ...pointsSettings,
                              memberEarnRate: parseInt(e.target.value) || 40
                            })}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span>spent</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Redemption Rate
                        </label>
                        <div className="flex items-center gap-2">
                          <span>1 point = ¥</span>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={pointsSettings.redemptionRate || 1}
                            onChange={(e) => setPointsSettings({
                              ...pointsSettings,
                              redemptionRate: parseFloat(e.target.value) || 1
                            })}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Settings
                    </button>
                  </div>
                )}

                {/* Membership Plans Tab */}
                {activeTab === 'plans' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Membership Plans</h2>
                      <button
                        onClick={() => {
                          setEditingPlan(null)
                          setPlanForm({
                            name: '',
                            nameJa: '',
                            description: '',
                            price: 800000,
                            hoursIncluded: 20,
                            overageRate: 30000,
                            pointsOnPurchase: 200,
                            earnRateDenominator: 40
                          })
                          setShowPlanModal(true)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Add New Plan
                      </button>
                    </div>

                    <div className="space-y-4">
                      {membershipPlans.map((plan) => (
                        <div key={plan.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {plan.name}
                                {plan.nameJa && <span className="ml-2 text-gray-500">({plan.nameJa})</span>}
                              </h3>
                              {plan.description && (
                                <p className="text-gray-600 mt-1">{plan.description}</p>
                              )}
                              <div className="mt-2 space-y-1 text-sm">
                                <div>Price: {formatMoney(plan.price)}/month</div>
                                <div>Included: {plan.hoursIncluded} hours</div>
                                <div>Overage: {formatMoney(plan.overageRate)}/hour</div>
                                <div>Bonus Points: {plan.pointsOnPurchase}</div>
                                <div>Earn Rate: 1 point per ¥{plan.earnRateDenominator}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingPlan(plan)
                                  setPlanForm({
                                    name: plan.name,
                                    nameJa: plan.nameJa || '',
                                    description: plan.description || '',
                                    price: plan.price,
                                    hoursIncluded: plan.hoursIncluded,
                                    overageRate: plan.overageRate,
                                    pointsOnPurchase: plan.pointsOnPurchase,
                                    earnRateDenominator: plan.earnRateDenominator
                                  })
                                  setShowPlanModal(true)
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                className={`px-3 py-1 rounded ${
                                  plan.isActive
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {plan.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Loyalty Tab */}
                {activeTab === 'customers' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Customer Loyalty Overview</h2>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Customer</th>
                            <th className="text-left py-2">Points Balance</th>
                            <th className="text-left py-2">Membership</th>
                            <th className="text-left py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((customer) => (
                            <tr key={customer.id} className="border-b hover:bg-gray-50">
                              <td className="py-3">
                                <div>
                                  <div className="font-medium">
                                    {customer.displayName || 'Guest'}
                                  </div>
                                  <div className="text-sm text-gray-500">{customer.email}</div>
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="font-semibold">
                                  ¥{customer.pointsBalance}
                                </div>
                              </td>
                              <td className="py-3">
                                {customer.memberships.find(m => m.status === 'ACTIVE') ? (
                                  <div>
                                    <div className="text-sm font-medium">
                                      {customer.memberships.find(m => m.status === 'ACTIVE')?.plan.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {customer.memberships.find(m => m.status === 'ACTIVE')?.hoursUsed.toFixed(1)} hours used
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No active membership</span>
                                )}
                              </td>
                              <td className="py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedCustomer(customer)
                                      setShowPointsAdjustModal(true)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    Adjust Points
                                  </button>
                                  <button
                                    onClick={() => router.push(`/customers/${customer.id}`)}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    View Profile
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Recent Points Transactions</h2>
                    <div className="text-center py-8 text-gray-500">
                      Transaction history coming soon...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name (English)
                  </label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name (Japanese)
                  </label>
                  <input
                    type="text"
                    value={planForm.nameJa}
                    onChange={(e) => setPlanForm({ ...planForm, nameJa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Price (¥)
                  </label>
                  <input
                    type="number"
                    value={planForm.price / 100}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseInt(e.target.value) * 100 || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Included Hours
                  </label>
                  <input
                    type="number"
                    value={planForm.hoursIncluded}
                    onChange={(e) => setPlanForm({ ...planForm, hoursIncluded: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overage Rate (¥/hour)
                  </label>
                  <input
                    type="number"
                    value={planForm.overageRate / 100}
                    onChange={(e) => setPlanForm({ ...planForm, overageRate: parseInt(e.target.value) * 100 || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bonus Points on Purchase
                  </label>
                  <input
                    type="number"
                    value={planForm.pointsOnPurchase}
                    onChange={(e) => setPlanForm({ ...planForm, pointsOnPurchase: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {showPointsAdjustModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Adjust Points</h3>
            
            <div className="mb-4">
              <div className="font-medium">{selectedCustomer.displayName || 'Guest'}</div>
              <div className="text-sm text-gray-500">{selectedCustomer.email}</div>
              <div className="text-sm mt-2">
                Current Balance: <span className="font-semibold">¥{selectedCustomer.pointsBalance}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={pointsAdjustment.type}
                  onChange={(e) => setPointsAdjustment({
                    ...pointsAdjustment,
                    type: e.target.value as 'add' | 'subtract'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="add">Add Points</option>
                  <option value="subtract">Subtract Points</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={pointsAdjustment.amount}
                  onChange={(e) => setPointsAdjustment({
                    ...pointsAdjustment,
                    amount: parseInt(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={pointsAdjustment.reason}
                  onChange={(e) => setPointsAdjustment({
                    ...pointsAdjustment,
                    reason: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="e.g., Customer service compensation, loyalty bonus, etc."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowPointsAdjustModal(false)
                  setSelectedCustomer(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={!pointsAdjustment.amount || !pointsAdjustment.reason}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}