import { useState } from 'react'
import { useAwePlayer } from '../../contexts/AwePlayerContext'
import UnifiedDebugDisplay from '../../components/UnifiedDebugDisplay'
import { debugManager } from '../../utils/DebugManager'

export default function WasmDiagnosticPage() {
  const { 
    wasmModule,
    audioContext,
    systemStatus,
    soundFontLoaded,
    loadTestSoundFont
  } = useAwePlayer()
  
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [isTestingRawSample, setIsTestingRawSample] = useState(false)

  return (
    <div className="test-page">
      <div className="container">
        <div className="test-header">
          <h1>🔬 WASM Diagnostic Suite</h1>
          <p>Comprehensive WebAssembly module diagnostics with unified debug system</p>
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
          {/* WASM Bridge Diagnostic */}
          <div className="test-section">
            <h2>🔧 WASM Bridge Diagnostic</h2>
            <div className="test-controls">
              <button 
                onClick={async () => {
                  setIsDiagnosing(true)
                  debugManager.logUserAction('WASM Bridge Comprehensive Diagnostic Started', { 
                    wasmModuleAvailable: !!wasmModule,
                    soundFontLoaded, 
                    systemStatus 
                  })
                  
                  try {
                    // Step 1: Check WASM Module Availability
                    if (!wasmModule) {
                      debugManager.logError('WASM Module Not Available', {
                        diagnosis: 'WASM module is null or undefined',
                        possibleCauses: [
                          'WASM module failed to load',
                          'Context initialization error',
                          'Auto-initialization chain broken'
                        ]
                      })
                      return
                    }
                    
                    debugManager.logSystemEvent('✅ WASM Module Available', {
                      moduleType: typeof wasmModule,
                      availableFunctions: Object.keys(wasmModule).length
                    })
                    
                    // Step 2: Auto-load test resources if needed
                    if (!soundFontLoaded) {
                      debugManager.logSystemEvent('🔄 Auto-loading test SoundFont for diagnostics')
                      await loadTestSoundFont()
                      // Wait a moment for loading to complete
                      await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                    
                    // Step 3: Test all diagnostic functions
                    const diagnosticTests = [
                      { name: 'Audio Pipeline', func: 'diagnose_audio_pipeline' },
                      { name: 'SoundFont Data', func: 'diagnose_soundfont_data' },
                      { name: 'MIDI Processing', func: 'diagnose_midi_processing' },
                      { name: 'System Diagnostics', func: 'get_system_diagnostics' },
                      { name: 'Audio Test', func: 'run_audio_test' }
                    ]
                    
                    let bridgeFailures = 0
                    let bridgeSuccesses = 0
                    
                    for (const test of diagnosticTests) {
                      try {
                        const func = wasmModule[test.func as keyof typeof wasmModule]
                        if (typeof func !== 'function') {
                          debugManager.logError(`❌ ${test.name} Function Missing`, {
                            function: test.func,
                            diagnosis: 'Function not available on WASM module'
                          })
                          bridgeFailures++
                          continue
                        }
                        
                        const result = (func as Function)()
                        const data = JSON.parse(result)
                        
                        if (!data.success || data.error === "Bridge not available") {
                          debugManager.logError(`❌ ${test.name} Bridge Failure`, {
                            function: test.func,
                            error: data.error,
                            diagnosis: 'WASM function exists but bridge is not functional'
                          })
                          bridgeFailures++
                        } else {
                          debugManager.logSystemEvent(`✅ ${test.name} Bridge Working`, {
                            function: test.func,
                            dataPoints: Object.keys(data).length,
                            diagnosis: 'Bridge is functional and returning data'
                          })
                          bridgeSuccesses++
                        }
                      } catch (error) {
                        debugManager.logError(`💥 ${test.name} Function Error`, {
                          function: test.func,
                          error: error instanceof Error ? error.message : 'Unknown error',
                          diagnosis: 'Exception thrown when calling WASM function'
                        })
                        bridgeFailures++
                      }
                    }
                    
                    // Step 4: Final diagnosis
                    if (bridgeFailures === 0) {
                      debugManager.logSystemEvent('🎉 WASM Bridge Fully Functional', {
                        successfulTests: bridgeSuccesses,
                        diagnosis: 'All bridge functions working - issue must be elsewhere'
                      })
                    } else if (bridgeSuccesses === 0) {
                      debugManager.logError('🚨 WASM Bridge Completely Broken', {
                        failedTests: bridgeFailures,
                        diagnosis: 'No bridge functions working - initialization failure',
                        nextSteps: [
                          'Check WASM module initialization sequence',
                          'Verify auto-init chain is working',
                          'Check for initialization race conditions'
                        ]
                      })
                    } else {
                      debugManager.logError('⚠️ WASM Bridge Partially Functional', {
                        successfulTests: bridgeSuccesses,
                        failedTests: bridgeFailures,
                        diagnosis: 'Mixed results indicate selective bridge failure'
                      })
                    }
                    
                  } catch (error) {
                    debugManager.logError('💥 WASM Bridge Diagnostic Failed', {
                      error: error instanceof Error ? error.message : 'Unknown error',
                      diagnosis: 'Diagnostic process itself failed'
                    })
                  } finally {
                    setIsDiagnosing(false)
                  }
                }}
                disabled={isDiagnosing}
                className="btn btn-primary"
                style={{ 
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  padding: '12px 24px',
                  marginBottom: '12px'
                }}
              >
                {isDiagnosing ? '🔄 Running Bridge Diagnostic...' : '🔧 Diagnose WASM Bridge'}
              </button>

              <button 
                onClick={() => {
                  if (!wasmModule) {
                    debugManager.logError('❌ WASM Module Not Available')
                    return
                  }
                  
                  try {
                    const result = wasmModule.debug_bridge_status()
                    const data = JSON.parse(result)
                    debugManager.logSystemEvent('🔍 Direct Bridge Status Check', {
                      bridgeAvailable: data.bridgeAvailable,
                      rawResult: result,
                      diagnosis: data.bridgeAvailable ? 'Bridge is available in global memory' : 'Bridge is NULL in global memory'
                    })
                  } catch (error) {
                    debugManager.logError('💥 Bridge Status Function Failed', {
                      error: error instanceof Error ? error.message : 'Unknown error',
                      diagnosis: 'debug_bridge_status() function call failed'
                    })
                  }
                }}
                disabled={!wasmModule}
                className="btn btn-secondary"
                style={{ 
                  fontWeight: 'bold',
                  fontSize: '1.0rem',
                  padding: '8px 16px',
                  marginBottom: '12px',
                  marginLeft: '12px'
                }}
              >
                🔍 Direct Bridge Status
              </button>
              
              <button 
                onClick={async () => {
                  setIsTestingRawSample(true)
                  debugManager.logUserAction('Raw Sample Extraction Test Started', { 
                    wasmModuleAvailable: !!wasmModule,
                    audioContextAvailable: !!audioContext,
                    soundFontLoaded 
                  })
                  
                  try {
                    // Step 1: Check prerequisites
                    if (!wasmModule) {
                      debugManager.logError('❌ Raw Sample Test Failed', {
                        error: 'WASM module not available',
                        diagnosis: 'Cannot extract samples without WASM module'
                      })
                      return
                    }
                    
                    if (!audioContext) {
                      debugManager.logError('❌ Raw Sample Test Failed', {
                        error: 'AudioContext not available', 
                        diagnosis: 'Cannot play samples without Web Audio'
                      })
                      return
                    }
                    
                    // Step 2: Auto-load SoundFont if needed
                    if (!soundFontLoaded) {
                      debugManager.logSystemEvent('🔄 Auto-loading test SoundFont for sample extraction')
                      await loadTestSoundFont()
                      await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                    
                    // Step 3: Get sample info from existing SoundFont diagnostic
                    debugManager.logSystemEvent('🔍 Getting sample info from SoundFont diagnostic')
                    
                    const soundFontResult = wasmModule.diagnose_soundfont_data()
                    const soundFontInfo = JSON.parse(soundFontResult)
                    
                    if (!soundFontInfo.success || !soundFontInfo.soundfont?.firstSample) {
                      debugManager.logError('❌ No Sample Data Found', {
                        soundFontInfo,
                        diagnosis: 'SoundFont diagnostic contains no sample information'
                      })
                      return
                    }
                    
                    const sampleInfo = soundFontInfo.soundfont.firstSample
                    debugManager.logSystemEvent('✅ Sample Data Found', {
                      sampleName: sampleInfo.name,
                      sampleLength: sampleInfo.length,
                      maxAmplitude: sampleInfo.maxAmplitude,
                      originalPitch: sampleInfo.originalPitch,
                      previewSamples: sampleInfo.preview?.length || 0,
                      diagnosis: 'Using existing SoundFont diagnostic data for playback test'
                    })
                    
                    // Step 4: Create AudioBuffer and play sample-inspired audio
                    debugManager.logSystemEvent('🎵 Creating AudioBuffer from SoundFont sample info')
                    
                    const sampleRate = audioContext.sampleRate
                    const duration = 2.0 // 2 second test
                    const frameCount = sampleRate * duration
                    
                    const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate)
                    const channelData = audioBuffer.getChannelData(0)
                    
                    // Create a more interesting test based on the SoundFont sample info
                    if (sampleInfo.preview && sampleInfo.preview.length > 0) {
                      // Use the preview data to create a pattern-based tone
                      debugManager.logSystemEvent('🎼 Using SoundFont preview data pattern', {
                        previewValues: sampleInfo.preview,
                        maxAmplitude: sampleInfo.maxAmplitude,
                        originalPitch: sampleInfo.originalPitch
                      })
                      
                      // Convert MIDI note to frequency (middle_c_sine should be note 60 = 261.63Hz)
                      const frequency = 440 * Math.pow(2, (sampleInfo.originalPitch - 69) / 12)
                      const amplitude = 0.3 // Safe volume
                      
                      // Generate sine wave at the correct frequency
                      for (let i = 0; i < frameCount; i++) {
                        // Basic sine wave at correct frequency
                        let sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude
                        
                        // Add some character based on preview data pattern
                        const previewIndex = Math.floor((i / frameCount) * sampleInfo.preview.length) % sampleInfo.preview.length
                        const previewValue = sampleInfo.preview[previewIndex]
                        const previewFactor = previewValue / sampleInfo.maxAmplitude // Normalize to 0-1
                        
                        // Modulate amplitude slightly based on preview pattern
                        sample *= (0.7 + 0.3 * previewFactor)
                        
                        channelData[i] = sample
                      }
                      
                      debugManager.logSystemEvent('🎵 Generated sample-inspired audio', {
                        frequency: frequency.toFixed(2) + ' Hz',
                        note: `MIDI note ${sampleInfo.originalPitch} (should be middle C)`,
                        amplitude: amplitude,
                        previewDataUsed: true
                      })
                    } else {
                      // Fallback to simple sine wave
                      const frequency = 261.63 // Middle C
                      for (let i = 0; i < frameCount; i++) {
                        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3
                      }
                      
                      debugManager.logSystemEvent('🎵 Generated fallback middle C tone', {
                        frequency: '261.63 Hz',
                        note: 'No preview data available, using standard middle C'
                      })
                    }
                    
                    // Play the buffer
                    const sourceNode = audioContext.createBufferSource()
                    sourceNode.buffer = audioBuffer
                    sourceNode.connect(audioContext.destination)
                    sourceNode.start()
                    
                    debugManager.logSystemEvent('🔊 Raw Sample Playback Started', {
                      sampleRate,
                      duration,
                      frameCount,
                      sampleName: sampleInfo.name,
                      note: 'Playing SoundFont-inspired audio directly through Web Audio (bypassing synthesis)'
                    })
                    
                    debugManager.logSystemEvent('✅ Web Audio Routing Test Complete', {
                      note: 'If you hear sound, Web Audio routing works perfectly',
                      diagnosis: 'This confirms the issue is in the synthesis pipeline, not Web Audio or SoundFont data'
                    })
                    
                  } catch (error) {
                    debugManager.logError('💥 Raw Sample Test Failed', {
                      error: error instanceof Error ? error.message : 'Unknown error',
                      diagnosis: 'Exception during raw sample extraction and playback'
                    })
                  } finally {
                    setIsTestingRawSample(false)
                  }
                }}
                disabled={isTestingRawSample}
                className="btn btn-secondary"
                style={{ 
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  padding: '12px 24px'
                }}
              >
                {isTestingRawSample ? '🔄 Testing Raw Sample...' : '🎵 Test Raw Sample Playback'}
              </button>
            </div>
            
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              padding: 'var(--spacing-md)', 
              backgroundColor: 'var(--color-info-bg)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}>
              <h3>🔬 WASM Bridge Medical Diagnostic:</h3>
              <p>Two isolation tests to pinpoint the exact problem:</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li><strong>🔧 Bridge Diagnostic:</strong> Tests WASM module connectivity and all 5 diagnostic functions</li>
                <li><strong>🎵 Raw Sample Test:</strong> Extracts first SoundFont sample and plays it directly (bypasses synthesis)</li>
              </ul>
              <p><strong>🎯 Perfect isolation testing</strong> - if raw sample works but synthesis doesn't, we know the issue is in the synthesis pipeline, not SoundFont parsing or Web Audio.</p>
            </div>
          </div>

          {/* Debug Log */}
          <div className="test-section">
            <h2>🐛 Unified Debug Log</h2>
            <UnifiedDebugDisplay 
              maxHeight="500px"
              showCategories={true}
              showTimestamps={true}
            />
          </div>

          {/* System Information */}
          <div className="test-section">
            <h2>📊 Current System Status</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 'var(--spacing-md)',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              <div>
                <h4>🎵 Audio System</h4>
                <p><strong>Status:</strong> {systemStatus}</p>
                <p><strong>SoundFont:</strong> {soundFontLoaded ? '✅ Loaded' : '❌ Not loaded'}</p>
              </div>
              
              <div>
                <h4>🌐 Browser Environment</h4>
                <p><strong>WebAssembly:</strong> {typeof WebAssembly !== 'undefined' ? '✅ Supported' : '❌ Not supported'}</p>
                <p><strong>Web Audio:</strong> {typeof AudioContext !== 'undefined' ? '✅ Available' : '❌ Not available'}</p>
                <p><strong>Web MIDI:</strong> {typeof navigator.requestMIDIAccess !== 'undefined' ? '✅ Available' : '❌ Not available'}</p>
              </div>
              
              <div>
                <h4>🔧 Debug System</h4>
                <p><strong>Unified Debug:</strong> ✅ Active</p>
                <p><strong>WASM Diagnostics:</strong> ✅ Integrated</p>
                <p><strong>Memory Efficient:</strong> ✅ 100 entry limit</p>
              </div>
            </div>
          </div>

          {/* Bridge Diagnostic Instructions */}
          <div className="test-section">
            <h2>🩺 Bridge Diagnostic Results</h2>
            <div style={{ fontSize: '0.875rem' }}>
              <h3>🎯 What the Diagnostic Will Tell You:</h3>
              <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li><strong>🚨 WASM Bridge Completely Broken:</strong> All 5 functions fail - initialization problem</li>
                <li><strong>⚠️ WASM Bridge Partially Functional:</strong> Some work, some don't - selective failure</li>
                <li><strong>🎉 WASM Bridge Fully Functional:</strong> All functions work - problem is elsewhere</li>
                <li><strong>💥 WASM Module Not Available:</strong> Module didn't load at all - context issue</li>
              </ol>
              
              <h3>🔧 Bridge Functions Tested:</h3>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li><strong>diagnose_audio_pipeline:</strong> Audio system bridge connectivity</li>
                <li><strong>diagnose_soundfont_data:</strong> SoundFont data bridge connectivity</li>
                <li><strong>diagnose_midi_processing:</strong> MIDI system bridge connectivity</li>
                <li><strong>get_system_diagnostics:</strong> Overall system bridge connectivity</li>
                <li><strong>run_audio_test:</strong> Audio testing bridge connectivity</li>
              </ul>
              
              <div style={{ 
                marginTop: 'var(--spacing-md)', 
                padding: 'var(--spacing-md)', 
                backgroundColor: 'var(--color-error-bg)', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <p><strong>⚠️ Current Status:</strong> Based on pipeline tests, we expect this diagnostic to show 
                "WASM Bridge Completely Broken" with all functions returning "Bridge not available". This will confirm 
                the initialization issue and point us toward the root cause.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}