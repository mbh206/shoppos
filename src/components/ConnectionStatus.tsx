'use client'

import { useState, useEffect } from 'react'
import { triggerOfflineSync } from '@/lib/service-worker'

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [queuedRequests, setQueuedRequests] = useState(0)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete'>('idle')

  useEffect(() => {
    // Check initial online status - default to true if navigator.onLine is undefined
    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    setIsOnline(initialOnline)
    setShowStatus(!initialOnline)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus('syncing')
      // Trigger sync after a short delay
      setTimeout(() => {
        triggerOfflineSync()
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowStatus(true)
    }

    // Listen for sync completion
    const handleSyncComplete = (event: CustomEvent) => {
      setSyncStatus('complete')
      setQueuedRequests(event.detail.failed)
      
      // Hide status after successful sync
      if (event.detail.failed === 0) {
        setTimeout(() => {
          setShowStatus(false)
          setSyncStatus('idle')
        }, 3000)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-sync-complete', handleSyncComplete as EventListener)

    // Check connection periodically
    const interval = setInterval(() => {
      const online = navigator.onLine
      if (online !== isOnline) {
        setIsOnline(online)
        setShowStatus(true)
        if (online) {
          handleOnline()
        }
      }
    }, 5000)

    // Check for queued requests in IndexedDB
    checkQueuedRequests()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-sync-complete', handleSyncComplete as EventListener)
      clearInterval(interval)
    }
  }, [isOnline])

  const checkQueuedRequests = async () => {
    try {
      const request = indexedDB.open('ShopPOS', 1)
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (db.objectStoreNames.contains('offline-queue')) {
          const transaction = db.transaction(['offline-queue'], 'readonly')
          const store = transaction.objectStore('offline-queue')
          const getRequest = store.get('offline-queue')
          
          getRequest.onsuccess = () => {
            const queue = getRequest.result || []
            setQueuedRequests(queue.length)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check queued requests:', error)
    }
  }

  if (!showStatus && isOnline && queuedRequests === 0) {
    return null
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      showStatus ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline 
          ? syncStatus === 'syncing' 
            ? 'bg-blue-500 text-white' 
            : syncStatus === 'complete'
            ? 'bg-green-500 text-white'
            : 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {!isOnline ? (
            <>
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
              <span>Offline Mode - Changes will sync when connection is restored</span>
              {queuedRequests > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-600 rounded-full text-xs">
                  {queuedRequests} pending
                </span>
              )}
            </>
          ) : syncStatus === 'syncing' ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Syncing offline changes...</span>
            </>
          ) : syncStatus === 'complete' ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>All changes synced successfully</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span>Online</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}