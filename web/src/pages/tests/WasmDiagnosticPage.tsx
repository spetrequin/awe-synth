import { useState } from 'react'
import { useAwePlayer } from '../../contexts/AwePlayerContext'
import UnifiedDebugDisplay from '../../components/UnifiedDebugDisplay'
import { debugManager } from '../../utils/DebugManager'

export default function WasmDiagnosticPage() {
  const { 
    wasmModule,
    systemStatus,
    debugLog,
    soundFontLoaded,
    updateDebugLog,
    loadTestSoundFont,
    sendMidiEvent,
    copyDebugLog
  } = useAwePlayer()

  const [wasmOutput, setWasmOutput] = useState<string>('')

  // Format JSON output as readable text
  const formatOutput = (title: string, result: string): string => {
    try {
      const parsed = JSON.parse(result)
      let formatted = `=== ${title} ===\n`
      
      if (parsed.success !== undefined) {
        formatted += `Success: ${parsed.success}\n`
      }
      if (parsed.error) {
        formatted += `Error: ${parsed.error}\n`
      }
      if (parsed.preset) {
        if (typeof parsed.preset === 'string') {
          formatted += `Preset: ${parsed.preset}\n`
        } else {
          formatted += `Preset Name: ${parsed.preset.name || 'Unknown'}\n`
          formatted += `Bank: ${parsed.preset.bank || 0}\n`
          formatted += `Program: ${parsed.preset.program || 0}\n`
          formatted += `Status: ${parsed.preset.status || 'Unknown'}\n`
        }
      }
      if (parsed.version) {
        formatted += `Version: ${parsed.version}\n`
      }
      if (parsed.supports) {
        formatted += `Supports: ${parsed.supports.join(', ')}\n`
      }
      if (parsed.status) {
        formatted += `Status: ${parsed.status}\n`
      }
      if (parsed.pipelineReady !== undefined) {
        formatted += `Pipeline Ready: ${parsed.pipelineReady}\n`
      }
      if (parsed.events_queued) {
        formatted += `Events Queued: ${parsed.events_queued}\n`
        formatted += `Sequence: ${parsed.sequence}\n`
      }
      if (parsed.name) {
        formatted += `Name: ${parsed.name}\n`
      }
      if (parsed.architecture) {
        formatted += `Architecture: ${parsed.architecture}\n`
      }
      if (parsed.phase) {
        formatted += `Phase: ${parsed.phase}\n`
      }
      if (parsed.average_processing_time !== undefined) {
        formatted += `Average Processing Time: ${parsed.average_processing_time}ms\n`
        formatted += `Max Processing Time: ${parsed.max_processing_time}ms\n`
        formatted += `Underruns: ${parsed.underruns}\n`
        formatted += `Overruns: ${parsed.overruns}\n`
        formatted += `Samples Processed: ${parsed.samples_processed}\n`
        formatted += `Uptime: ${parsed.uptime_ms}ms\n`
      }
      
      return formatted + '\n'
    } catch (error) {
      // Not JSON, return as-is with title
      return `=== ${title} ===\n${result}\n\n`
    }
  }

  const runWasmDiagnostics = async () => {
    debugManager.logUserAction('Full WASM Diagnostic requested')
    setWasmOutput('=== WASM Function Diagnostic Results ===\n')
    debugManager.logSystemEvent('Running comprehensive WASM diagnostics')

    // Ensure SoundFont is loaded
    if (!soundFontLoaded) {
      updateDebugLog('📦 Loading test SoundFont first...')
      await loadTestSoundFont()
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    let output = '=== WASM Function Diagnostic Results ===\n\n'

    // Test 1: System Status
    if (wasmModule?.get_system_status) {
      try {
        const result = wasmModule.get_system_status()
        output += formatOutput('get_system_status()', result)
        updateDebugLog('✅ System status retrieved')
      } catch (error) {
        output += `=== get_system_status() ===\nERROR: ${error}\n\n`
        updateDebugLog('❌ System status failed')
      }
    }

    // Test 2: Pipeline Status
    if (wasmModule?.get_pipeline_status_global) {
      try {
        const result = wasmModule.get_pipeline_status_global()
        output += formatOutput('get_pipeline_status_global()', result)
        updateDebugLog('✅ Pipeline status retrieved')
      } catch (error) {
        output += `=== get_pipeline_status_global() ===\nERROR: ${error}\n\n`
        updateDebugLog('❌ Pipeline status failed')
      }
    }

    // Test 3: SoundFont Info
    if (wasmModule?.get_soundfont_info) {
      try {
        const result = wasmModule.get_soundfont_info()
        output += formatOutput('get_soundfont_info()', result)
        updateDebugLog('✅ SoundFont info retrieved')
      } catch (error) {
        output += '=== get_soundfont_info() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ SoundFont info failed')
      }
    }

    // Test 4: Current Preset Info
    if (wasmModule?.get_current_preset_info_global) {
      try {
        const result = wasmModule.get_current_preset_info_global()
        output += formatOutput('get_current_preset_info_global()', result)
        updateDebugLog('✅ Preset info retrieved')
      } catch (error) {
        output += '=== get_current_preset_info_global() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ Preset info failed')
      }
    }

    // Test 5: SoundFont Synthesis Test
    if (wasmModule?.test_soundfont_synthesis) {
      try {
        const result = wasmModule.test_soundfont_synthesis()
        output += formatOutput('test_soundfont_synthesis()', result)
        updateDebugLog('✅ SoundFont synthesis test completed')
      } catch (error) {
        output += '=== test_soundfont_synthesis() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ SoundFont synthesis test failed')
      }
    }

    // Test 6: Quick C Major Test
    if (wasmModule?.quick_c_major_test) {
      try {
        const result = wasmModule.quick_c_major_test()
        output += formatOutput('quick_c_major_test()', result)
        updateDebugLog('✅ Quick C major test completed')
      } catch (error) {
        output += '=== quick_c_major_test() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ Quick C major test failed')
      }
    }

    // Test 7: Buffer Metrics
    if (wasmModule?.get_buffer_metrics_global) {
      try {
        const result = wasmModule.get_buffer_metrics_global()
        output += formatOutput('get_buffer_metrics_global()', result)
        updateDebugLog('✅ Buffer metrics retrieved')
      } catch (error) {
        output += '=== get_buffer_metrics_global() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ Buffer metrics failed')
      }
    }

    // Test 8: Version Info
    if (wasmModule?.get_version_info) {
      try {
        const result = wasmModule.get_version_info()
        output += formatOutput('get_version_info()', result)
        updateDebugLog('✅ Version info retrieved')
      } catch (error) {
        output += '=== get_version_info() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ Version info failed')
      }
    }

    // Test 9: WASM Debug Log
    if (wasmModule?.get_debug_log_global) {
      try {
        const result = wasmModule.get_debug_log_global()
        output += '=== get_debug_log_global() ===\n' + result + '\n\n'
        updateDebugLog('✅ WASM debug log retrieved')
      } catch (error) {
        output += '=== get_debug_log_global() ===\nERROR: ' + error + '\n\n'
        updateDebugLog('❌ WASM debug log failed')
      }
    }

    output += '=== End of WASM Diagnostics ===\n'
    setWasmOutput(output)
    updateDebugLog('🏁 WASM diagnostics complete!')
  }

  const testBasicMidi = async () => {
    updateDebugLog('🎵 Testing basic MIDI synthesis...')
    
    // Send a simple MIDI sequence and capture any WASM output
    sendMidiEvent(0, 0x90, 60, 100) // Note On
    await new Promise(resolve => setTimeout(resolve, 1000))
    sendMidiEvent(0, 0x80, 60, 0) // Note Off
    
    // Get any debug output that was generated
    if (wasmModule?.get_debug_log_global) {
      const debugLog = wasmModule.get_debug_log_global()
      setWasmOutput(prev => prev + '\n=== MIDI Test Debug Output ===\n' + debugLog + '\n')
    }
    
    updateDebugLog('🎵 MIDI test complete')
  }

  return (
    <div className="test-page">
      <div className="container">
        <div className="test-header">
          <h1>🧪 WASM Function Diagnostics</h1>
          <p>Direct examination of WASM function outputs to identify synthesis issues</p>
          <div className={`status-indicator ${
            systemStatus === 'ready' ? 'success' : 
            systemStatus === 'error' ? 'error' : 'pending'
          }`}>
            {systemStatus === 'ready' && '✅ System Ready'}
            {systemStatus === 'error' && '❌ System Error'}
            {systemStatus === 'initializing' && '⏳ Initializing...'}
          </div>
        </div>

        <div className="test-content">
          {/* Controls */}
          <div className="test-section">
            <h2>🎮 WASM Diagnostic Controls</h2>
            <div className="test-controls">
              <button 
                onClick={() => {
                  updateDebugLog('🔴 USER ACTION: Full WASM Diagnostic button clicked')
                  runWasmDiagnostics()
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-primary"
                style={{ background: 'var(--color-accent)', fontWeight: 'bold' }}
              >
                🔍 Run Full WASM Diagnostic
              </button>
              
              <button 
                onClick={testBasicMidi}
                disabled={systemStatus !== 'ready'}
                className="btn btn-secondary"
              >
                🎵 Test Basic MIDI
              </button>
              
              <button 
                onClick={async () => {
                  updateDebugLog('🔴 USER ACTION: Audio Pipeline Test button clicked')
                  updateDebugLog('🧪 Running comprehensive audio synthesis pipeline test...')
                  
                  if (!wasmModule?.test_audio_synthesis_pipeline) {
                    updateDebugLog('❌ ERROR: test_audio_synthesis_pipeline function not available in WASM module')
                    return
                  }
                  
                  try {
                    updateDebugLog('⏳ Executing test_audio_synthesis_pipeline()...')
                    const result = wasmModule.test_audio_synthesis_pipeline()
                    updateDebugLog(`📊 Raw test result: ${result}`)
                    
                    setWasmOutput(prev => prev + '\n=== Audio Pipeline Test Results ===\n' + result + '\n')
                    updateDebugLog('✅ Audio synthesis pipeline test complete - results added to WASM output')
                  } catch (error) {
                    updateDebugLog(`❌ ERROR executing audio pipeline test: ${error}`)
                  }
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-primary"
                style={{ background: 'var(--color-warning)', fontWeight: 'bold' }}
              >
                🧪 Test Audio Pipeline
              </button>
              
              <button 
                onClick={async () => {
                  // Log user action directly in WASM system
                  if (wasmModule?.log_message_global) {
                    wasmModule.log_message_global('🔴 USER ACTION: Zero Samples Debug button clicked')
                  }
                  
                  if (!wasmModule?.test_zero_samples_debug) {
                    if (wasmModule?.log_message_global) {
                      wasmModule.log_message_global('❌ ERROR: test_zero_samples_debug function not available')
                    }
                    return
                  }
                  
                  try {
                    const result = wasmModule.test_zero_samples_debug()
                    if (wasmModule?.log_message_global) {
                      wasmModule.log_message_global(`🔍 Zero samples debug result: ${result}`)
                    }
                    setWasmOutput(prev => prev + '\n=== Zero Samples Debug ===\n' + result + '\n')
                  } catch (error) {
                    if (wasmModule?.log_message_global) {
                      wasmModule.log_message_global(`❌ ERROR in zero samples debug: ${error}`)
                    }
                  }
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-warning"
                style={{ fontWeight: 'bold' }}
              >
                🔍 Debug Zero Samples
              </button>
              
              <button 
                onClick={async () => {
                  if (wasmModule?.log_message_global) {
                    wasmModule.log_message_global('🔴 USER ACTION: Zone Creation Debug button clicked')
                  }
                  
                  if (!wasmModule?.debug_zone_creation_pipeline) {
                    if (wasmModule?.log_message_global) {
                      wasmModule.log_message_global('❌ ERROR: debug_zone_creation_pipeline function not available')
                    }
                    return
                  }
                  
                  try {
                    const result = wasmModule.debug_zone_creation_pipeline()
                    if (wasmModule?.log_message_global) {
                      wasmModule.log_message_global(`🔬 Zone creation debug result: ${result}`)
                    }
                    setWasmOutput(prev => prev + '\n=== Zone Creation Debug ===\n' + result + '\n')
                  } catch (error) {
                    if (wasmModule?.log_message_global) {
                      wasmModule.log_message_global(`❌ ERROR in zone creation debug: ${error}`)
                    }
                  }
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-info"
                style={{ fontWeight: 'bold' }}
              >
                🔬 Debug Zone Creation
              </button>
              
              <button 
                onClick={() => {
                  setWasmOutput('')
                  updateDebugLog('🔄 WASM diagnostics cleared')
                }}
                className="btn btn-outline"
              >
                🗑️ Clear Output
              </button>
            </div>
          </div>

          {/* WASM Output */}
          {wasmOutput && (
            <div className="test-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h2>🖥️ WASM Function Outputs</h2>
                <button 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(wasmOutput)
                      updateDebugLog('📋 WASM output copied to clipboard')
                    } catch (error) {
                      updateDebugLog('❌ Failed to copy WASM output')
                    }
                  }}
                  className="btn btn-sm btn-outline"
                >
                  📋 Copy All Output
                </button>
              </div>
              
              <textarea
                value={wasmOutput}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '400px',
                  maxHeight: '600px',
                  background: 'var(--color-bg-secondary)',
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.4',
                  border: '1px solid var(--color-border)',
                  resize: 'vertical',
                  color: 'var(--color-text)'
                }}
              />
              
              <p style={{ marginTop: 'var(--spacing-md)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <strong>Raw WASM Output:</strong> Direct function results from the synthesis engine. 
                This shows exactly what each WASM function returns, including errors and status information.
              </p>
            </div>
          )}

          {/* Analysis Guide */}
          <div className="test-section">
            <h2>🔍 What to Look For</h2>
            <div style={{ 
              background: 'var(--color-bg-secondary)', 
              padding: 'var(--spacing-md)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <h3>Key Indicators:</h3>
              <ul>
                <li><strong>System Status:</strong> Should show "ready" and initialized components</li>
                <li><strong>Pipeline Status:</strong> Should show active voices and processing state</li>
                <li><strong>SoundFont Info:</strong> Should show loaded samples and presets</li>
                <li><strong>Preset Info:</strong> Should show active instrument details</li>
                <li><strong>Synthesis Test:</strong> Should show successful audio generation</li>
                <li><strong>Buffer Metrics:</strong> Should show healthy processing times</li>
                <li><strong>Debug Log:</strong> Should show recent synthesis activity</li>
              </ul>
              
              <h3>Common Issues:</h3>
              <ul>
                <li><strong>"ERROR" messages:</strong> Function calls are failing</li>
                <li><strong>"Placeholder implementation":</strong> Function not fully implemented</li>
                <li><strong>Empty or null returns:</strong> Data not being generated</li>
                <li><strong>JSON parse errors:</strong> Malformed data structures</li>
                <li><strong>No synthesis activity:</strong> MIDI events not reaching synthesis</li>
              </ul>
            </div>
          </div>

          {/* Debug Log */}
          <div className="test-section">
            <h2>🐛 Test Log</h2>
            <UnifiedDebugDisplay 
              maxHeight="300px"
              showCategories={true}
              showTimestamps={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}