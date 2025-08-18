'use client'

import { useState } from 'react'
import { useRetailMode } from '@/contexts/RetailModeContext'

export default function RetailModeExitButton() {
  const { isRetailMode, exitRetailMode } = useRetailMode()
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Only show when in retail mode
  if (!isRetailMode) {
    return null
  }

  const handleExitRetailMode = async () => {
    if (!email || !password) {
      setError('Email and password required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        exitRetailMode()
        setShowExitDialog(false)
        setEmail('')
        setPassword('')
        // Redirect to appropriate dashboard
        window.location.href = data.role === 'admin' ? '/admin' : '/manager'
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('Failed to verify credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowExitDialog(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 shadow-lg z-40 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Exit Retail Mode
      </button>

      {showExitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Exit Retail Mode</h2>
            <p className="text-gray-600 mb-4">
              Admin or Manager credentials required to exit retail mode
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleExitRetailMode()
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-4">{error}</div>
            )}
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowExitDialog(false)
                  setEmail('')
                  setPassword('')
                  setError('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleExitRetailMode}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}