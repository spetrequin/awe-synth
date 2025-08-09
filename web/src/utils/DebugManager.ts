/**
 * Unified Debug Manager - Consolidates Web and WASM Diagnostics
 * Replaces the old flooding text-based debug system
 */

interface DebugEntry {
  timestamp: number
  category: 'user' | 'system' | 'audio' | 'midi' | 'soundfont' | 'error' | 'envelope' | 'voice'
  event: string
  data?: any
  wasmDiagnostics?: {
    audioPipeline?: any
    soundfontData?: any
    midiProcessing?: any
    systemDiagnostics?: any
    audioTest?: any
  }
}

interface WasmModule {
  diagnose_audio_pipeline: () => string
  diagnose_soundfont_data: () => string
  diagnose_midi_processing: () => string
  get_system_diagnostics: () => string
  run_audio_test: () => string
}

class DebugManager {
  private entries: DebugEntry[] = []
  private maxEntries = 100
  private wasmModule: WasmModule | null = null
  private listeners: ((entries: DebugEntry[]) => void)[] = []

  setWasmModule(module: WasmModule | null) {
    this.wasmModule = module
  }

  // Update an existing entry by event name, or create new if not found
  updateEntry(category: DebugEntry['category'], event: string, data?: any, includeWasmDiagnostics = false) {
    // Find existing entry with same category and event
    const existingIndex = this.entries.findIndex(entry => 
      entry.category === category && entry.event === event
    )
    
    const entry: DebugEntry = {
      timestamp: Date.now(), // Always update timestamp
      category,
      event,
      data
    }

    // Capture WASM diagnostics if requested
    if (includeWasmDiagnostics && this.wasmModule) {
      try {
        entry.wasmDiagnostics = {
          audioPipeline: JSON.parse(this.wasmModule.diagnose_audio_pipeline()),
          soundfontData: JSON.parse(this.wasmModule.diagnose_soundfont_data()),
          midiProcessing: JSON.parse(this.wasmModule.diagnose_midi_processing()),
          systemDiagnostics: JSON.parse(this.wasmModule.get_system_diagnostics()),
          audioTest: JSON.parse(this.wasmModule.run_audio_test())
        }
      } catch (error) {
        // Ignore WASM diagnostic errors
      }
    }

    if (existingIndex >= 0) {
      // Update existing entry
      this.entries[existingIndex] = entry
    } else {
      // Create new entry
      this.addNewEntry(entry)
    }
    
    this.notifyListeners()
  }

  // Helper method to add new entry and maintain size limit
  private addNewEntry(entry: DebugEntry) {
    this.entries.push(entry)
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }
  }

  // Add a debug entry with optional WASM diagnostics
  addEntry(category: DebugEntry['category'], event: string, data?: any, includeWasmDiagnostics = false) {
    const entry: DebugEntry = {
      timestamp: Date.now(),
      category,
      event,
      data
    }

    // Capture WASM diagnostics if requested and available
    if (includeWasmDiagnostics && this.wasmModule) {
      try {
        entry.wasmDiagnostics = {
          audioPipeline: this.parseJSON(this.wasmModule.diagnose_audio_pipeline()),
          soundfontData: this.parseJSON(this.wasmModule.diagnose_soundfont_data()),
          midiProcessing: this.parseJSON(this.wasmModule.diagnose_midi_processing()),
          systemDiagnostics: this.parseJSON(this.wasmModule.get_system_diagnostics()),
          audioTest: this.parseJSON(this.wasmModule.run_audio_test())
        }
      } catch (error) {
        entry.wasmDiagnostics = { error: `WASM diagnostics failed: ${error}` }
      }
    }

    this.addNewEntry(entry)
    this.notifyListeners()
  }

  // Convenience methods for different event types
  logUserAction(event: string, data?: any) {
    this.addEntry('user', event, data, true) // Always include diagnostics for user actions
  }

  logSystemEvent(event: string, data?: any) {
    this.addEntry('system', event, data)
  }

  logAudioEvent(event: string, data?: any) {
    // Only include full diagnostics for critical audio events to reduce noise
    const criticalEvents = ['Audio Buffer Analysis During Sustain', 'Audio Synthesis Pipeline Test Started']
    const includeDiagnostics = criticalEvents.some(critical => event.includes(critical))
    this.addEntry('audio', event, data, includeDiagnostics)
  }

  logAudioSummary(event: string, data?: any) {
    // Special method for audio summary without full diagnostics spam
    this.addEntry('audio', event, data, false)
  }

  updateAudioSummary(event: string, data?: any) {
    // Update existing audio summary entry instead of creating new ones
    this.updateEntry('audio', event, data, false)
  }

  logMidiEvent(event: string, data?: any) {
    this.addEntry('midi', event, data)
  }

  logSoundFontEvent(event: string, data?: any) {
    this.addEntry('soundfont', event, data, true) // Include diagnostics for SoundFont events
  }

  logEnvelopeEvent(event: string, data?: any) {
    this.addEntry('envelope', event, data)
  }

  logVoiceEvent(event: string, data?: any) {
    this.addEntry('voice', event, data)
  }

  logError(event: string, data?: any) {
    this.addEntry('error', event, data, true) // Always include diagnostics for errors
  }

  // Get all entries or filter by category
  getEntries(category?: DebugEntry['category']): DebugEntry[] {
    if (category) {
      return this.entries.filter(entry => entry.category === category)
    }
    return [...this.entries]
  }

  // Get recent entries (last N)
  getRecentEntries(count = 10): DebugEntry[] {
    return this.entries.slice(-count)
  }

  // Clear all entries
  clear() {
    this.entries = []
    this.notifyListeners()
  }

  // Export entries as JSON
  exportAsJSON(): string {
    return JSON.stringify(this.entries, null, 2)
  }

  // Subscribe to debug updates
  subscribe(listener: (entries: DebugEntry[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Get summary statistics
  getSummary() {
    const categoryCounts = this.entries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recentErrors = this.entries
      .filter(entry => entry.category === 'error')
      .slice(-5)

    const latestDiagnostics = this.entries
      .filter(entry => entry.wasmDiagnostics)
      .slice(-1)[0]?.wasmDiagnostics

    return {
      totalEntries: this.entries.length,
      categoryCounts,
      recentErrors,
      latestDiagnostics,
      timeRange: this.entries.length > 0 ? {
        start: new Date(this.entries[0].timestamp).toISOString(),
        end: new Date(this.entries[this.entries.length - 1].timestamp).toISOString()
      } : null
    }
  }

  private parseJSON(jsonString: string): any {
    try {
      return JSON.parse(jsonString)
    } catch {
      return { rawString: jsonString }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.entries]))
  }
}

// Create singleton instance
export const debugManager = new DebugManager()

// Export types for use in components
export type { DebugEntry, WasmModule as DebugWasmModule }