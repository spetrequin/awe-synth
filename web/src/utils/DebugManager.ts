/**
 * Unified Debug Manager - Consolidates Web and WASM Diagnostics
 * Replaces the old flooding text-based debug system
 */

interface DebugEntry {
  timestamp: number
  category: 'user' | 'system' | 'audio' | 'midi' | 'soundfont' | 'error'
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
        // Test one function at a time to isolate the crash
        const diagnostics: any = {}
        
        try {
          diagnostics.audioPipeline = this.parseJSON(this.wasmModule.diagnose_audio_pipeline())
        } catch (e) {
          diagnostics.audioPipeline = { error: `diagnose_audio_pipeline failed: ${e}` }
        }
        
        try {
          diagnostics.soundfontData = this.parseJSON(this.wasmModule.diagnose_soundfont_data())
        } catch (e) {
          diagnostics.soundfontData = { error: `diagnose_soundfont_data failed: ${e}` }
        }
        
        try {
          diagnostics.midiProcessing = this.parseJSON(this.wasmModule.diagnose_midi_processing())
        } catch (e) {
          diagnostics.midiProcessing = { error: `diagnose_midi_processing failed: ${e}` }
        }
        
        try {
          diagnostics.systemDiagnostics = this.parseJSON(this.wasmModule.get_system_diagnostics())
        } catch (e) {
          diagnostics.systemDiagnostics = { error: `get_system_diagnostics failed: ${e}` }
        }
        
        try {
          diagnostics.audioTest = this.parseJSON(this.wasmModule.run_audio_test())
        } catch (e) {
          diagnostics.audioTest = { error: `run_audio_test failed: ${e}` }
        }
        
        entry.wasmDiagnostics = diagnostics
      } catch (error) {
        entry.wasmDiagnostics = { error: `WASM diagnostics failed: ${error}` }
      }
    }

    // Add to entries and maintain size limit
    this.entries.push(entry)
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }

    // Notify listeners
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
    this.addEntry('audio', event, data, true) // Include diagnostics for audio events
  }

  logMidiEvent(event: string, data?: any) {
    this.addEntry('midi', event, data)
  }

  logSoundFontEvent(event: string, data?: any) {
    this.addEntry('soundfont', event, data, true) // Include diagnostics for SoundFont events
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