'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function SquareTestPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/square/test')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Test failed:', error)
      setTestResults({ error: 'Failed to run test' })
    } finally {
      setLoading(false)
    }
  }

  const testPayment = async () => {
    // Create a test order
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          name: 'Test Item',
          qty: 1,
          unitPriceMinor: 100,
          totalMinor: 100
        }]
      })
    })
    
    const order = await orderResponse.json()
    
    // Test payment
    const paymentResponse = await fetch('/api/square/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        amountMinor: 100
      })
    })
    
    const paymentResult = await paymentResponse.json()
    alert(paymentResult.success 
      ? `Payment successful! ID: ${paymentResult.paymentId}` 
      : `Payment failed: ${paymentResult.error}`)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Square Integration Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={loading}>
            {loading ? 'Testing...' : 'Run Configuration Test'}
          </Button>

          {testResults && (
            <div className="mt-4 space-y-4">
              {/* Configuration Status */}
              <div>
                <h3 className="font-semibold mb-2">Environment Variables</h3>
                <div className="space-y-1">
                  {Object.entries(testResults.configuration || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {key}: {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Tests */}
              {testResults.apiTests && (
                <div>
                  <h3 className="font-semibold mb-2">API Connection Tests</h3>
                  
                  {/* Merchant Test */}
                  {testResults.apiTests.merchant && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        {testResults.apiTests.merchant.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">Merchant API</span>
                      </div>
                      {testResults.apiTests.merchant.success ? (
                        <div className="ml-6 text-sm text-gray-600">
                          <div>ID: {testResults.apiTests.merchant.data?.merchantId}</div>
                          <div>Business: {testResults.apiTests.merchant.data?.businessName}</div>
                          <div>Country: {testResults.apiTests.merchant.data?.country}</div>
                        </div>
                      ) : (
                        <div className="ml-6 text-sm text-red-600">
                          {testResults.apiTests.merchant.error}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Locations Test */}
                  {testResults.apiTests.locations && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        {testResults.apiTests.locations.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">Locations API</span>
                      </div>
                      {testResults.apiTests.locations.success ? (
                        <div className="ml-6 text-sm text-gray-600">
                          <div>Found {testResults.apiTests.locations.count} location(s)</div>
                          {testResults.apiTests.locations.locations?.map((loc: any) => (
                            <div key={loc.id} className="mt-1 p-2 bg-gray-50 rounded">
                              <div>ID: {loc.id}</div>
                              <div>Name: {loc.name}</div>
                              <div>Status: {loc.status}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="ml-6 text-sm text-red-600">
                          {testResults.apiTests.locations.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation */}
              {testResults.recommendation && (
                <div className="p-3 bg-blue-50 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">{testResults.recommendation}</span>
                  </div>
                </div>
              )}

              {/* Test Payment Button */}
              {testResults.apiTests?.merchant?.success && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Test Payment</h3>
                  <Button onClick={testPayment} variant="outline">
                    Send Test Payment to Square
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    This will create a real payment in your Square {testResults.environment} environment
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Verify Square Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold">1. Check Configuration</h3>
            <p className="text-sm text-gray-600">
              Click "Run Configuration Test" above to verify your Square credentials are working
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">2. Test Payment</h3>
            <p className="text-sm text-gray-600">
              If configuration is successful, use "Send Test Payment" to create a real transaction in Square
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">3. Verify in Square Dashboard</h3>
            <p className="text-sm text-gray-600">
              Log into your Square Sandbox dashboard at{' '}
              <a href="https://squareupsandbox.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                squareupsandbox.com
              </a>
              {' '}to see test payments
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">4. Required Environment Variables</h3>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              <li>SQUARE_ACCESS_TOKEN - Your sandbox access token</li>
              <li>SQUARE_APPLICATION_ID - Your application ID</li>
              <li>SQUARE_LOCATION_ID - A valid location ID from your account</li>
              <li>SQUARE_ENVIRONMENT - Set to "sandbox" for testing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}