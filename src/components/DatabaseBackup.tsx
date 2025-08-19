'use client'

import { useState, useEffect } from 'react'

type BackupFormat = 'sql' | 'json' | 'csv' | 'excel'

type BackupInfo = {
  totalRecords: number
  tableCounts: Record<string, number>
  estimatedSizes: Record<BackupFormat, number>
  lastBackup: string | null
}

type BackupHistory = {
  timestamp: string
  format: BackupFormat
  size: number
  status: 'success' | 'failed'
}

export default function DatabaseBackup() {
  const [selectedFormat, setSelectedFormat] = useState<BackupFormat>('sql')
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [progress, setProgress] = useState(0)
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([])
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchBackupInfo()
    // Load backup history from localStorage
    const history = localStorage.getItem('backupHistory')
    if (history) {
      setBackupHistory(JSON.parse(history))
    }
  }, [])

  const fetchBackupInfo = async () => {
    try {
      const response = await fetch('/api/admin/backup/info')
      if (response.ok) {
        const data = await response.json()
        setBackupInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch backup info:', error)
    } finally {
      setLoadingInfo(false)
    }
  }

  const handleBackup = async () => {
    setIsBackingUp(true)
    setProgress(0)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 500)

    try {
      const response = await fetch(`/api/admin/backup?format=${selectedFormat}`)
      
      clearInterval(progressInterval)
      setProgress(100)

      if (response.ok) {
        const blob = await response.blob()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
        const filename = `shoppos-backup-${timestamp}.${getFileExtension(selectedFormat)}`
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)

        // Add to history
        const newHistory: BackupHistory = {
          timestamp: new Date().toISOString(),
          format: selectedFormat,
          size: blob.size,
          status: 'success'
        }
        const updatedHistory = [newHistory, ...backupHistory].slice(0, 10) // Keep last 10
        setBackupHistory(updatedHistory)
        localStorage.setItem('backupHistory', JSON.stringify(updatedHistory))

        // Refresh backup info
        fetchBackupInfo()
      } else {
        throw new Error('Backup failed')
      }
    } catch (error) {
      console.error('Backup error:', error)
      clearInterval(progressInterval)
      
      // Add failure to history
      const newHistory: BackupHistory = {
        timestamp: new Date().toISOString(),
        format: selectedFormat,
        size: 0,
        status: 'failed'
      }
      const updatedHistory = [newHistory, ...backupHistory].slice(0, 10)
      setBackupHistory(updatedHistory)
      localStorage.setItem('backupHistory', JSON.stringify(updatedHistory))
    } finally {
      setIsBackingUp(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const getFileExtension = (format: BackupFormat) => {
    switch (format) {
      case 'sql': return 'sql'
      case 'json': return 'json'
      case 'csv': return 'zip'
      case 'excel': return 'xlsx'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Format Selection */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Backup Format</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedFormat('sql')}
            className={`p-3 rounded border-2 transition-all ${
              selectedFormat === 'sql'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            disabled={isBackingUp}
          >
            <div className="font-semibold">SQL</div>
            <div className="text-xs mt-1">Full database dump</div>
            {backupInfo && (
              <div className="text-xs mt-1 opacity-60">~{backupInfo.estimatedSizes.sql} MB</div>
            )}
          </button>
          
          <button
            onClick={() => setSelectedFormat('json')}
            className={`p-3 rounded border-2 transition-all ${
              selectedFormat === 'json'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            disabled={isBackingUp}
          >
            <div className="font-semibold">JSON</div>
            <div className="text-xs mt-1">Human-readable</div>
            {backupInfo && (
              <div className="text-xs mt-1 opacity-60">~{backupInfo.estimatedSizes.json} MB</div>
            )}
          </button>
          
          <button
            onClick={() => setSelectedFormat('csv')}
            className={`p-3 rounded border-2 transition-all ${
              selectedFormat === 'csv'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            disabled={isBackingUp}
          >
            <div className="font-semibold">CSV</div>
            <div className="text-xs mt-1">ZIP archive</div>
            {backupInfo && (
              <div className="text-xs mt-1 opacity-60">~{backupInfo.estimatedSizes.csv} MB</div>
            )}
          </button>
          
          <button
            onClick={() => setSelectedFormat('excel')}
            className={`p-3 rounded border-2 transition-all ${
              selectedFormat === 'excel'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            disabled={isBackingUp}
          >
            <div className="font-semibold">Excel</div>
            <div className="text-xs mt-1">Multi-sheet workbook</div>
            {backupInfo && (
              <div className="text-xs mt-1 opacity-60">~{backupInfo.estimatedSizes.excel} MB</div>
            )}
          </button>
        </div>
      </div>

      {/* Database Info */}
      {backupInfo && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Database Statistics</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <div>Total Records: {backupInfo.totalRecords.toLocaleString()}</div>
            {showDetails && (
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {Object.entries(backupInfo.tableCounts)
                  .filter(([_, count]) => count > 0)
                  .map(([table, count]) => (
                    <div key={table} className="flex justify-between">
                      <span className="capitalize">{table.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backup Button with Progress */}
      <div className="relative">
        <button
          onClick={handleBackup}
          disabled={isBackingUp || loadingInfo}
          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
            isBackingUp
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
        >
          {isBackingUp ? 'Creating Backup...' : 'Download Backup'}
        </button>
        
        {/* Progress Bar */}
        {isBackingUp && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Backups</h3>
          <div className="space-y-2">
            {backupHistory.slice(0, 5).map((backup, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    backup.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span>{formatDate(backup.timestamp)}</span>
                  <span className="font-mono bg-gray-200 px-1 rounded">
                    {backup.format.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-500">
                  {backup.size > 0 ? formatFileSize(backup.size) : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Text */}
      <div className="text-xs text-gray-500">
        <p>• SQL format includes complete database structure and data</p>
        <p>• JSON format is human-readable and can be processed programmatically</p>
        <p>• CSV format creates a ZIP with separate CSV files for each table</p>
        <p>• Excel format creates a workbook with each table as a sheet</p>
        <p className="mt-2 font-semibold">All formats include all data from all tables.</p>
      </div>
    </div>
  )
}