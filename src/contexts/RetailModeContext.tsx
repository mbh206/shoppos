'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface RetailModeContextType {
  isRetailMode: boolean
  enterRetailMode: () => void
  exitRetailMode: () => void
}

const RetailModeContext = createContext<RetailModeContextType | undefined>(undefined)

export function RetailModeProvider({ children }: { children: ReactNode }) {
  const [isRetailMode, setIsRetailMode] = useState(false)

  // Load retail mode state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('retailMode')
    if (stored === 'true') {
      setIsRetailMode(true)
    }
  }, [])

  const enterRetailMode = () => {
    setIsRetailMode(true)
    localStorage.setItem('retailMode', 'true')
  }

  const exitRetailMode = () => {
    setIsRetailMode(false)
    localStorage.removeItem('retailMode')
  }

  return (
    <RetailModeContext.Provider value={{ isRetailMode, enterRetailMode, exitRetailMode }}>
      {children}
    </RetailModeContext.Provider>
  )
}

export function useRetailMode() {
  const context = useContext(RetailModeContext)
  if (context === undefined) {
    throw new Error('useRetailMode must be used within a RetailModeProvider')
  }
  return context
}