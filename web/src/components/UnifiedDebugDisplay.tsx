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
  maxHeight = '400px',
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
  const categories = ['all', ...new Set(entries.map(entry => entry.category))]

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  // Get category emoji
  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'user': return '👤'
      case 'system': return '⚙️'
      case 'audio': return '🔊'
      case 'midi': return '🎹'
      case 'soundfont': return '🎼'
      case 'error': return '❌'
      default: return '📝'
    }
  }

  // Copy log to clipboard
  const copyLog = async () => {
    try {
      const summary = debugManager.getSummary()
      const exportData = {
        summary,
        entries: filteredEntries,
        timestamp: new Date().toISOString(),
        filter: selectedCategory
      }
      
      const logText = JSON.stringify(exportData, null, 2)
      await navigator.clipboard.writeText(logText)
      
      setCopyStatus('✅ Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
      
      debugManager.logUserAction('Debug log copied to clipboard', { 
        entryCount: filteredEntries.length,
        category: selectedCategory 
      })
    } catch (error) {
      setCopyStatus('❌ Copy failed')
      setTimeout(() => setCopyStatus(''), 2000)
      debugManager.logError('Failed to copy debug log', { error })
    }
  }

  // Clear log
  const clearLog = () => {
    debugManager.clear()
    debugManager.logUserAction('Debug log cleared')
    setCopyStatus('🗑️ Cleared!')
    setTimeout(() => setCopyStatus(''), 2000)
  }

  // Format entry data for display
  const formatEntryData = (entry: DebugEntry) => {
    const parts = []
    
    if (entry.data) {
      parts.push(`Data: ${JSON.stringify(entry.data)}`)
    }
    
    if (entry.wasmDiagnostics) {
      parts.push('WASM Diagnostics:')
      Object.entries(entry.wasmDiagnostics).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
          parts.push(`  ${key}: ${JSON.stringify(value, null, 2)}`)
        } else if (value) {
          parts.push(`  ${key}: ${value}`)
        }
      })
    }
    
    return parts.length > 0 ? parts.join('\n') : null
  }

  return (
    <div className={`unified-debug-display ${className}`}>
      {/* Header with controls */}
      <div className="debug-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #ddd',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <strong>Debug Log ({filteredEntries.length} entries)</strong>
          
          {showCategories && (
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '2px 6px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '12px'
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : `${getCategoryEmoji(cat)} ${cat}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {copyStatus && (
            <span style={{ fontSize: '12px', color: copyStatus.includes('❌') ? '#d32f2f' : '#2e7d32' }}>
              {copyStatus}
            </span>
          )}
          
          <button
            onClick={copyLog}
            disabled={filteredEntries.length === 0}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #007bff',
              backgroundColor: '#007bff',
              color: 'white',
              borderRadius: '3px',
              cursor: filteredEntries.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredEntries.length === 0 ? 0.5 : 1
            }}
          >
            📋 Copy
          </button>
          
          <button
            onClick={clearLog}
            disabled={entries.length === 0}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #dc3545',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '3px',
              cursor: entries.length === 0 ? 'not-allowed' : 'pointer',
              opacity: entries.length === 0 ? 0.5 : 1
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Debug entries */}
      <div 
        style={{
          maxHeight,
          overflowY: 'auto',
          padding: '8px',
          backgroundColor: '#fafafa',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.4'
        }}
      >
        {filteredEntries.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            fontStyle: 'italic',
            padding: '20px'
          }}>
            No debug entries {selectedCategory !== 'all' ? `for category "${selectedCategory}"` : ''}
          </div>
        ) : (
          <div>
            {filteredEntries.map((entry, index) => {
              const extraData = formatEntryData(entry)
              
              return (
                <div 
                  key={index}
                  style={{
                    marginBottom: '8px',
                    padding: '6px',
                    backgroundColor: entry.category === 'error' ? '#ffebee' : '#ffffff',
                    border: `1px solid ${entry.category === 'error' ? '#ffcdd2' : '#e0e0e0'}`,
                    borderRadius: '3px'
                  }}
                >
                  {/* Entry header */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: extraData ? '6px' : '0'
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: entry.category === 'error' ? '#d32f2f' : '#333'
                      }}>
                        {showCategories && `${getCategoryEmoji(entry.category)} `}
                        {entry.event}
                      </span>
                      {entry.wasmDiagnostics && (
                        <span style={{ 
                          marginLeft: '8px',
                          padding: '2px 4px',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '2px',
                          fontSize: '10px'
                        }}>
                          WASM
                        </span>
                      )}
                    </div>
                    
                    {showTimestamps && (
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#666',
                        marginLeft: '8px',
                        flexShrink: 0
                      }}>
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    )}
                  </div>

                  {/* Entry details */}
                  {extraData && (
                    <div style={{ 
                      fontSize: '11px',
                      color: '#555',
                      backgroundColor: '#f8f8f8',
                      padding: '4px',
                      borderRadius: '2px',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {extraData}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {entries.length > 0 && (
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#f0f0f0',
          borderTop: '1px solid #ddd',
          fontSize: '11px',
          color: '#666'
        }}>
          Summary: {Object.entries(
            entries.reduce((acc, entry) => {
              acc[entry.category] = (acc[entry.category] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          ).map(([cat, count]) => `${getCategoryEmoji(cat)}${cat}:${count}`).join(' • ')}
        </div>
      )}
    </div>
  )
}

export default UnifiedDebugDisplay