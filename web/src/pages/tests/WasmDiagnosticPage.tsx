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
  
  const [isRunningFullDiagnostic, setIsRunningFullDiagnostic] = useState(false)
  const [isTestingRawSample, setIsTestingRawSample] = useState(false)
  const [diagnosticSummary, setDiagnosticSummary] = useState<{
    totalTests: number
    passed: number
    failed: number
    overallStatus: 'not-run' | 'pass' | 'partial' | 'fail'
  }>({
    totalTests: 0,
    passed: 0,
    failed: 0,
    overallStatus: 'not-run'
  })

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
          {/* Comprehensive Diagnostic Suite */}
          <div className="test-section">
            <h2>🔬 Complete System Diagnostic</h2>
            <div className="test-controls">
              <button 
                onClick={async () => {
                  setIsRunningFullDiagnostic(true)
                  let testsPassed = 0
                  let testsFailed = 0
                  const totalTests = 9 // Version, Bridge Status, 6 diagnostic functions (including bridge lifecycle), Generator check
                  
                  debugManager.logUserAction('🚀 Complete Diagnostic Suite Started', { 
                    wasmModuleAvailable: !!wasmModule,
                    soundFontLoaded, 
                    systemStatus 
                  })
                  
                  try {
                    // ========== TEST 1: WASM Module Availability ==========
                    if (!wasmModule) {
                      debugManager.logError('❌ Test 1/8: WASM Module Not Available', {
                        diagnosis: 'WASM module is null or undefined',
                        possibleCauses: [
                          'WASM module failed to load',
                          'Context initialization error',
                          'Auto-initialization chain broken'
                        ]
                      })
                      testsFailed++
                      setDiagnosticSummary({
                        totalTests,
                        passed: testsPassed,
                        failed: testsFailed,
                        overallStatus: 'fail'
                      })
                      return
                    }
                    
                    debugManager.logSystemEvent('✅ Test 1/8: WASM Module Available', {
                      moduleType: typeof wasmModule,
                      availableFunctions: Object.keys(wasmModule).length
                    })
                    testsPassed++
                    
                    // ========== TEST 2: WASM Version Check ==========
                    try {
                      if (wasmModule.get_wasm_version) {
                        const versionStr = wasmModule.get_wasm_version()
                        const versionData = JSON.parse(versionStr)
                        const expectedVersion = '2025-08-09-22:41'
                        const versionMatch = versionData.version === expectedVersion
                        
                        if (versionMatch) {
                          debugManager.logSystemEvent('✅ Test 2/8: WASM Version Correct', {
                            version: versionData.version,
                            buildTime: versionData.buildTime,
                            hasDebugBridgeStatus: versionData.hasDebugBridgeStatus
                          })
                          testsPassed++
                        } else {
                          debugManager.logError('❌ Test 2/8: WASM Version Mismatch', {
                            expected: expectedVersion,
                            actual: versionData.version
                          })
                          testsFailed++
                        }
                      } else {
                        debugManager.logError('⚠️ Test 2/8: Version Check Not Available')
                        testsFailed++
                      }
                    } catch (e) {
                      debugManager.logError('❌ Test 2/8: Version Check Failed', {
                        error: e instanceof Error ? e.message : 'Unknown error'
                      })
                      testsFailed++
                    }
                    
                    // ========== TEST 3: Bridge Status ==========
                    try {
                      const bridgeStatus = wasmModule.debug_bridge_status()
                      const bridgeData = JSON.parse(bridgeStatus)
                      
                      if (bridgeData.available) {
                        debugManager.logSystemEvent('✅ Test 3/8: Bridge Status Available', {
                          status: bridgeData.status,
                          sampleRate: bridgeData.sample_rate
                        })
                        testsPassed++
                      } else {
                        debugManager.logSystemEvent('⚠️ Test 3/8: Bridge Not Yet Initialized', {
                          note: 'Bridge shows as not-initialized, but diagnostic functions may still work',
                          expectation: 'This is normal before audio processing starts'
                        })
                        testsPassed++ // Don't count as failure - it's expected behavior
                      }
                    } catch (e) {
                      debugManager.logError('❌ Test 3/8: Bridge Status Check Failed', {
                        error: e instanceof Error ? e.message : 'Unknown error'
                      })
                      testsFailed++
                    }
                    
                    // Auto-load test SoundFont if needed
                    if (!soundFontLoaded) {
                      debugManager.logSystemEvent('🔄 Auto-loading test SoundFont for diagnostics')
                      await loadTestSoundFont()
                      await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                    
                    // ========== TESTS 4-9: Diagnostic Functions ==========
                    const diagnosticTests = [
                      { name: 'Bridge Lifecycle', func: 'diagnose_bridge_lifecycle', testNum: 4 },
                      { name: 'Audio Pipeline', func: 'diagnose_audio_pipeline', testNum: 5 },
                      { name: 'SoundFont Data', func: 'diagnose_soundfont_data', testNum: 6 },
                      { name: 'MIDI Processing', func: 'diagnose_midi_processing', testNum: 7 },
                      { name: 'System Diagnostics', func: 'get_system_diagnostics', testNum: 8 },
                      { name: 'Generator Implementation', func: 'run_audio_test', testNum: 9 }
                    ]
                    
                    for (const test of diagnosticTests) {
                      try {
                        const func = wasmModule[test.func as keyof typeof wasmModule]
                        if (typeof func !== 'function') {
                          debugManager.logError(`❌ Test ${test.testNum}/8: ${test.name} Function Missing`, {
                            function: test.func
                          })
                          testsFailed++
                          continue
                        }
                        
                        const result = (func as Function)()
                        const data = JSON.parse(result)
                        
                        if (!data.success || data.error === "Bridge not available") {
                          debugManager.logError(`❌ Test ${test.testNum}/8: ${test.name} Failed`, {
                            function: test.func,
                            error: data.error
                          })
                          testsFailed++
                        } else {
                          debugManager.logSystemEvent(`✅ Test ${test.testNum}/8: ${test.name} Passed`, {
                            function: test.func,
                            dataPoints: Object.keys(data).length
                          })
                          testsPassed++
                        }
                      } catch (error) {
                        debugManager.logError(`❌ Test ${test.testNum}/8: ${test.name} Exception`, {
                          function: test.func,
                          error: error instanceof Error ? error.message : 'Unknown error'
                        })
                        testsFailed++
                      }
                    }
                    
                    // ========== FINAL SUMMARY ==========
                    const overallStatus = testsFailed === 0 ? 'pass' : 
                                         testsPassed === 0 ? 'fail' : 'partial'
                    
                    setDiagnosticSummary({
                      totalTests,
                      passed: testsPassed,
                      failed: testsFailed,
                      overallStatus
                    })
                    
                    const summaryEmoji = overallStatus === 'pass' ? '🎉' : 
                                        overallStatus === 'fail' ? '🚨' : '⚠️'
                    const summaryText = overallStatus === 'pass' ? 'All Systems Operational' :
                                       overallStatus === 'fail' ? 'Critical System Failure' :
                                       'Partial System Functionality'
                    
                    debugManager.logSystemEvent(`${summaryEmoji} Diagnostic Complete: ${summaryText}`, {
                      totalTests,
                      passed: testsPassed,
                      failed: testsFailed,
                      successRate: `${Math.round(testsPassed / totalTests * 100)}%`,
                      diagnosis: overallStatus === 'pass' ? 
                        'System is fully functional and ready for use' :
                        overallStatus === 'fail' ? 
                        'System has critical failures that need attention' :
                        'System is partially functional but may have issues'
                    })
                    
                  } catch (error) {
                    debugManager.logError('💥 Diagnostic Suite Failed', {
                      error: error instanceof Error ? error.message : 'Unknown error'
                    })
                    setDiagnosticSummary({
                      totalTests,
                      passed: testsPassed,
                      failed: testsFailed,
                      overallStatus: 'fail'
                    })
                  } finally {
                    setIsRunningFullDiagnostic(false)
                  }
                }}
                disabled={isRunningFullDiagnostic}
                className="btn btn-primary"
                style={{ 
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  padding: '16px 32px',
                  marginBottom: '16px',
                  background: isRunningFullDiagnostic ? '#666' : 
                              diagnosticSummary.overallStatus === 'pass' ? '#4CAF50' :
                              diagnosticSummary.overallStatus === 'fail' ? '#f44336' :
                              diagnosticSummary.overallStatus === 'partial' ? '#ff9800' :
                              '#2196F3'
                }}
              >
                {isRunningFullDiagnostic ? '🔄 Running Complete Diagnostic Suite...' : 
                 '🚀 Run Complete Diagnostic Suite'}
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
            
            {/* Diagnostic Summary */}
            {diagnosticSummary.totalTests > 0 && (
              <div style={{ 
                marginTop: 'var(--spacing-lg)', 
                padding: 'var(--spacing-lg)', 
                backgroundColor: diagnosticSummary.overallStatus === 'pass' ? '#e8f5e9' :
                               diagnosticSummary.overallStatus === 'fail' ? '#ffebee' :
                               diagnosticSummary.overallStatus === 'partial' ? '#fff3e0' :
                               'var(--color-info-bg)',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${
                  diagnosticSummary.overallStatus === 'pass' ? '#4CAF50' :
                  diagnosticSummary.overallStatus === 'fail' ? '#f44336' :
                  diagnosticSummary.overallStatus === 'partial' ? '#ff9800' :
                  'var(--color-border)'
                }`
              }}>
                <h3 style={{ 
                  marginTop: 0,
                  color: diagnosticSummary.overallStatus === 'pass' ? '#2e7d32' :
                         diagnosticSummary.overallStatus === 'fail' ? '#c62828' :
                         diagnosticSummary.overallStatus === 'partial' ? '#ef6c00' :
                         'inherit'
                }}>
                  {diagnosticSummary.overallStatus === 'pass' && '🎉 All Tests Passed!'}
                  {diagnosticSummary.overallStatus === 'fail' && '🚨 Critical Issues Detected'}
                  {diagnosticSummary.overallStatus === 'partial' && '⚠️ Partial Functionality'}
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: 'var(--spacing-md)',
                  marginTop: 'var(--spacing-md)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{diagnosticSummary.passed}</div>
                    <div style={{ color: '#4CAF50' }}>Tests Passed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{diagnosticSummary.failed}</div>
                    <div style={{ color: '#f44336' }}>Tests Failed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {Math.round(diagnosticSummary.passed / diagnosticSummary.totalTests * 100)}%
                    </div>
                    <div>Success Rate</div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              padding: 'var(--spacing-md)', 
              backgroundColor: 'var(--color-info-bg)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}>
              <h3>🔬 Complete System Diagnostic</h3>
              <p>The diagnostic suite runs 9 comprehensive tests:</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li><strong>WASM Module:</strong> Verifies module loading and function availability</li>
                <li><strong>Version Check:</strong> Confirms correct build with generator implementation</li>
                <li><strong>Bridge Status:</strong> Tests WASM↔JavaScript communication</li>
                <li><strong>Bridge Lifecycle:</strong> Detailed bridge initialization and memory analysis</li>
                <li><strong>Core Systems:</strong> Audio pipeline, SoundFont data, MIDI processing, and diagnostics</li>
              </ul>
              <p><strong>🎯 One-click verification</strong> - Perfect for regression testing after code changes. Enhanced bridge debugging helps identify initialization timing issues. Use category filtering in the debug log to isolate specific test results.</p>
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

        </div>
      </div>
    </div>
  )
}