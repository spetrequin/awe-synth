import React, { useState, useEffect } from 'react'
import { debugManager, type DebugEntry } from '../utils/DebugManager'

interface UnifiedDebugDisplayProps {
  className?: string
  maxHeight?: string
  showCategories?: boolean
  showTimestamps?: boolean
}

const UnifiedDebugDisplay: React.FC<UnifiedDebugDisplayProps> = ({
  className = '',
  maxHeight = '500px',
  showCategories = true,
  showTimestamps = true
}) => {
  const [entries, setEntries] = useState<DebugEntry[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [copyStatus, setCopyStatus] = useState<string>('')

  // Subscribe to debug updates
  useEffect(() => {
    const unsubscribe = debugManager.subscribe(setEntries)
    setEntries(debugManager.getEntries())
    return unsubscribe
  }, [])

  // Filter entries by selected category
  const filteredEntries = selectedCategory === 'all' 
    ? entries 
    : entries.filter(entry => entry.category === selectedCategory)

  // Get available categories
  const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category)))]

  // Copy logs to clipboard with detailed data
  const copyToClipboard = async () => {
    try {
      const logText = filteredEntries
        .map(entry => {
          let text = `[${entry.timestamp}] ${entry.category.toUpperCase()}: ${entry.event}`
          
          // Include data details for all entries
          if (entry.data) {
            text += '\n  📊 Details: ' + JSON.stringify(entry.data, null, 2).replace(/\n/g, '\n  ')
          }
          
          // Include WASM diagnostics for all entries
          if (entry.wasmDiagnostics) {
            text += '\n  🔧 WASM Diagnostics: ' + JSON.stringify(entry.wasmDiagnostics, null, 2).replace(/\n/g, '\n  ')
          }
          
          return text
        })
        .join('\n\n')
      
      await navigator.clipboard.writeText(logText)
      setCopyStatus('✅ Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    } catch (error) {
      setCopyStatus('❌ Copy failed')
      setTimeout(() => setCopyStatus(''), 2000)
    }
  }

  // Clear all logs
  const clearLogs = () => {
    debugManager.clear()
  }

  // Get entry styling based on category
  const getEntryStyles = (category: string) => {
    switch (category) {
      case 'user': return 'border-l-4 border-blue-500 bg-blue-50 text-blue-900'
      case 'system': return 'border-l-4 border-green-500 bg-green-50 text-green-900'
      case 'audio': return 'border-l-4 border-purple-500 bg-purple-50 text-purple-900'
      case 'midi': return 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-900'
      case 'error': return 'border-l-4 border-red-500 bg-red-50 text-red-900'
      default: return 'border-l-4 border-gray-500 bg-gray-50 text-gray-900'
    }
  }

  // Get category badge styling
  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'user': return 'bg-blue-100 text-blue-800'
      case 'system': return 'bg-green-100 text-green-800'
      case 'audio': return 'bg-purple-100 text-purple-800'
      case 'midi': return 'bg-indigo-100 text-indigo-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">🐛 Debug Log</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </span>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              {copyStatus || '📋 Copy'}
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Category Filter */}
        {showCategories && (
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? '🔍 All' : category}
                <span className="ml-1 text-xs opacity-75">
                  ({category === 'all' ? entries.length : entries.filter(e => e.category === category).length})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log Entries */}
      <div 
        className="overflow-auto p-2 space-y-1" 
        style={{ maxHeight }}
      >
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">📝</div>
            <p>No debug entries</p>
            <p className="text-sm">Debug messages will appear here</p>
          </div>
        ) : (
          filteredEntries.map((entry, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg text-sm font-mono ${getEntryStyles(entry.category)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${getCategoryBadgeStyles(entry.category)}`}>
                    {entry.category.toUpperCase()}
                  </span>
                  {showTimestamps && (
                    <span className="text-xs opacity-75">
                      {entry.timestamp}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="whitespace-pre-wrap break-words">
                {entry.event}
              </div>
              
              {entry.data && (
                <details className="mt-2" open={entry.category === 'error'}>
                  <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                    📊 View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-auto">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </details>
              )}
              
              {entry.wasmDiagnostics && (
                <details className="mt-2" open={entry.category === 'error'}>
                  <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                    🔧 WASM Diagnostics
                  </summary>
                  <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-auto">
                    {JSON.stringify(entry.wasmDiagnostics, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default UnifiedDebugDisplay