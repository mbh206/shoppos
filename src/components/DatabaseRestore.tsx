'use client'

import { useState, useRef } from 'react'

type RestoreFormat = 'sql' | 'json' | 'csv' | 'excel'

type RestoreResult = {
  success: boolean
  tablesRestored?: string[]
  recordsRestored?: number
  warnings?: string[]
  errors?: string[]
  safetyBackup?: string
}

export default function DatabaseRestore() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<RestoreFormat | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [clearExisting, setClearExisting] = useState(true)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-detect format from file extension
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension === 'sql') setSelectedFormat('sql')
      else if (extension === 'json') setSelectedFormat('json')
      else if (extension === 'zip') setSelectedFormat('csv')
      else if (extension === 'xlsx') setSelectedFormat('excel')
    }
  }

  const handleRestore = async () => {
    if (!selectedFile || !selectedFormat) return

    setShowConfirmation(false)
    setIsRestoring(true)
    setRestoreResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('format', selectedFormat)
      formData.append('clearExisting', clearExisting.toString())

      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setRestoreResult({
          success: true,
          ...result
        })
      } else {
        setRestoreResult({
          success: false,
          errors: [result.error || 'Restore failed']
        })
      }
    } catch (error: any) {
      setRestoreResult({
        success: false,
        errors: [error.message || 'Network error during restore']
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const getFormatInfo = (format: RestoreFormat) => {
    switch (format) {
      case 'sql':
        return {
          icon: '🗄️',
          name: 'SQL',
          description: 'Database dump file (.sql)',
          color: 'blue'
        }
      case 'json':
        return {
          icon: '📋',
          name: 'JSON',
          description: 'JSON data file (.json)',
          color: 'green'
        }
      case 'csv':
        return {
          icon: '📊',
          name: 'CSV',
          description: 'ZIP archive with CSV files (.zip)',
          color: 'yellow'
        }
      case 'excel':
        return {
          icon: '📈',
          name: 'Excel',
          description: 'Excel workbook (.xlsx)',
          color: 'purple'
        }
    }
  }

  return (
    <div className="space-y-4">
      {/* File Selection */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Backup File</h3>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".sql,.json,.zip,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          disabled={isRestoring}
        >
          {selectedFile ? (
            <div className="text-left">
              <div className="font-semibold text-gray-700">{selectedFile.name}</div>
              <div className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
                {selectedFormat && ` • ${getFormatInfo(selectedFormat).name} format`}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-2xl mb-2">📁</div>
              <div>Click to select backup file</div>
              <div className="text-xs mt-1">Supports: .sql, .json, .zip (CSV), .xlsx</div>
            </div>
          )}
        </button>
      </div>

      {/* Format Selection (if not auto-detected) */}
      {selectedFile && !selectedFormat && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 mb-3">Select Backup Format</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['sql', 'json', 'csv', 'excel'] as RestoreFormat[]).map(format => {
              const info = getFormatInfo(format)
              return (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-3 rounded border-2 transition-all ${
                    selectedFormat === format
                      ? `border-${info.color}-500 bg-${info.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isRestoring}
                >
                  <div className="text-2xl">{info.icon}</div>
                  <div className="font-semibold">{info.name}</div>
                  <div className="text-xs mt-1">{info.description}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Restore Options */}
      {selectedFile && selectedFormat && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Restore Options</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              disabled={isRestoring}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">
              Clear existing data before restore
              <span className="text-xs text-gray-500 block">
                Unchecking will attempt to merge data (may cause conflicts)
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Restore Button */}
      {selectedFile && selectedFormat && (
        <div>
          {!showConfirmation ? (
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={isRestoring}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {isRestoring ? 'Restoring...' : 'Restore Database'}
            </button>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="text-red-800 font-semibold mb-2">⚠️ Confirm Database Restore</div>
              <div className="text-sm text-red-700 mb-3">
                {clearExisting 
                  ? 'This will DELETE ALL existing data and replace it with the backup data.'
                  : 'This will attempt to merge backup data with existing data.'}
                <br />
                A safety backup will be created before restoration.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isRestoring ? 'Restoring...' : 'Yes, Restore'}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Restore Result */}
      {restoreResult && (
        <div className={`p-4 rounded-lg ${
          restoreResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className={`font-semibold mb-2 ${
            restoreResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {restoreResult.success ? '✅ Restore Successful' : '❌ Restore Failed'}
          </div>
          
          {restoreResult.success && (
            <>
              {restoreResult.recordsRestored !== undefined && (
                <div className="text-sm text-green-700">
                  Restored {restoreResult.recordsRestored.toLocaleString()} records
                </div>
              )}
              {restoreResult.tablesRestored && restoreResult.tablesRestored.length > 0 && (
                <div className="text-sm text-green-700">
                  Tables restored: {restoreResult.tablesRestored.length}
                </div>
              )}
              {restoreResult.safetyBackup && (
                <div className="text-xs text-green-600 mt-2">
                  Safety backup saved at: {restoreResult.safetyBackup}
                </div>
              )}
            </>
          )}
          
          {restoreResult.warnings && restoreResult.warnings.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-semibold text-yellow-700">Warnings:</div>
              <ul className="text-xs text-yellow-600 list-disc list-inside">
                {restoreResult.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {restoreResult.errors && restoreResult.errors.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-semibold text-red-700">Errors:</div>
              <ul className="text-xs text-red-600 list-disc list-inside">
                {restoreResult.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-semibold">Restore Instructions:</p>
        <p>1. Select a backup file created by the backup system</p>
        <p>2. The format will be auto-detected from the file extension</p>
        <p>3. Choose whether to clear existing data (recommended)</p>
        <p>4. A safety backup will be created before restoration</p>
        <p>5. After restoration, verify your data and reset user passwords if needed</p>
      </div>
    </div>
  )
}