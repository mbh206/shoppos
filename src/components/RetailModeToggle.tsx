'use client'

import { useState } from 'react'
import { useRetailMode } from '@/contexts/RetailModeContext'
import { UserRole } from '@prisma/client'

interface RetailModeToggleProps {
  userRole: UserRole
}

export default function RetailModeToggle({ userRole }: RetailModeToggleProps) {
  const { isRetailMode, enterRetailMode, exitRetailMode } = useRetailMode()
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Only show for admin and manager roles
  if (!['admin', 'manager'].includes(userRole)) {
    return null
  }

  const handleEnterRetailMode = () => {
    if (confirm('Enter Retail Mode? This will hide administrative functions.')) {
      enterRetailMode()
      // Redirect to floor map
      window.location.href = '/floor'
    }
  }

  const handleExitRetailMode = async () => {
    if (!email || !password) {
      setError('Email and password required')
      return
    }

    try {
      // Verify admin/manager credentials
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        if (['admin', 'manager'].includes(data.role)) {
          exitRetailMode()
          setShowExitDialog(false)
          setEmail('')
          setPassword('')
          setError('')
          // Redirect to appropriate dashboard
          window.location.href = data.role === 'admin' ? '/admin' : '/manager'
        } else {
          setError('Admin or Manager access required')
        }
      } else {
        setError('Invalid password')
      }
    } catch (err) {
      setError('Failed to verify credentials')
    }
  }

  if (isRetailMode) {
    return (
      <>
        <button
          onClick={() => setShowExitDialog(true)}
          className="fixed top-4 right-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 z-50"
        >
          Exit Retail Mode
        </button>

        {showExitDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Exit Retail Mode</h2>
              <p className="text-gray-600 mb-4">
                Admin or Manager credentials required to exit retail mode
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="toggle-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="toggle-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="toggle-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="toggle-password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                >
                  Cancel
                </button>
                <button
                  onClick={handleExitRetailMode}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Verify & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <button
      onClick={handleEnterRetailMode}
      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
    >
      Enter Retail Mode
    </button>
  )
}