'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useRetailMode } from '@/contexts/RetailModeContext'
import { UserRole } from '@prisma/client'

type NavigationProps = {
  userRole: UserRole
  userName: string | null
  userEmail: string
}

export default function Navigation({ userRole, userName, userEmail }: NavigationProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isRetailMode } = useRetailMode()

  // Determine dashboard based on role
  const getDashboardHref = () => {
    if (userRole === 'admin') return '/admin'
    if (userRole === 'manager') return '/manager'
    return '/dashboard'
  }

  const navItems = [
    {
      name: 'Dashboard',
      href: getDashboardHref(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      show: () => !isRetailMode, // Hide in retail mode
    },
    {
      name: 'Floor Map',
      href: '/floor',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      show: () => true,
    },
    {
      name: 'Transactions',
      href: '/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      ),
      show: () => true,
    },
    {
      name: 'Games',
      href: '/games',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
      show: () => true,
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      show: () => !isRetailMode, // Hide in retail mode
    },
    {
      name: 'Inventory',
      href: '/admin/inventory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      show: () => !isRetailMode && ['admin', 'manager'].includes(userRole),
    },
    {
      name: 'Employees',
      href: '/admin/employees',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      show: () => !isRetailMode && ['admin', 'manager'].includes(userRole),
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      show: () => !isRetailMode && userRole === 'admin',
    },
  ]

  const filteredNavItems = navItems.filter(item => item.show())

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-48'} bg-gray-900 text-white h-screen fixed left-0 top-0 transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className={`font-bold text-xl ${isCollapsed ? 'hidden' : 'block'}`}>
            KOMA POS {isRetailMode && <span className="text-yellow-400 text-sm">(Retail)</span>}
          </h1>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className={`${isCollapsed ? 'text-center' : ''}`}>
          <div className={`text-sm text-gray-400 ${isCollapsed ? 'hidden' : 'block'}`}>
            {userName || userEmail}
          </div>
          <div className={`text-xs text-gray-500 mt-1 ${isCollapsed ? 'hidden' : 'block'}`}>
            Role: {userRole}
          </div>
          {isCollapsed && (
            <div className="text-xs text-gray-400">
              {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className={`${isCollapsed ? 'hidden' : 'block'}`}>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Coming Soon Section */}
      {!isCollapsed && userRole === 'admin' && (
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-2">Coming Soon:</div>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Pickup Queue</li>
            <li>• Square Checkout</li>
            <li>• Catalog Sync</li>
            <li>• Rentals</li>
            <li>• Events</li>
          </ul>
        </div>
      )}

      {/* Sign Out */}
      <div className="p-4 border-t border-gray-800">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`${isCollapsed ? 'hidden' : 'block'}`}>Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  )
}