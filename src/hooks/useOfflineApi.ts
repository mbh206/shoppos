import { useState, useCallback } from 'react'

interface OfflineApiOptions {
  onOffline?: () => void
  onQueued?: () => void
  onSync?: () => void
  optimisticUpdate?: () => void
}

export function useOfflineApi(options: OfflineApiOptions = {}) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)

  const apiCall = useCallback(async (url: string, init?: RequestInit) => {
    try {
      // Apply optimistic update immediately
      if (options.optimisticUpdate) {
        options.optimisticUpdate()
      }

      const response = await fetch(url, init)
      const data = await response.json()

      // Check if request was queued for offline sync
      if (data.offline && data.queued) {
        setIsOffline(true)
        if (options.onQueued) {
          options.onQueued()
        }
        return { ...data, optimistic: true }
      }

      // Request succeeded
      return data
    } catch (error) {
      // Network error - request will be queued by service worker
      setIsOffline(true)
      if (options.onOffline) {
        options.onOffline()
      }
      
      // Return optimistic response
      return { 
        offline: true, 
        optimistic: true,
        error: 'Request queued for sync'
      }
    }
  }, [options])

  return {
    apiCall,
    isOffline,
    isSyncing
  }
}

// Example usage in a component:
/*
const { apiCall, isOffline } = useOfflineApi({
  optimisticUpdate: () => {
    // Update UI immediately
    setOrders(prev => [...prev, newOrder])
  },
  onQueued: () => {
    toast.info('Order saved offline, will sync when online')
  }
})

const createOrder = async (orderData) => {
  const result = await apiCall('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  })
  
  if (!result.offline) {
    // Update with server response
    setOrders(prev => prev.map(o => 
      o.optimistic ? result.order : o
    ))
  }
}
*/