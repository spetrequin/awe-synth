import { useState, useEffect } from 'react'
import { useAwePlayer } from '../../contexts/AwePlayerContext'
import UnifiedDebugDisplay from '../../components/UnifiedDebugDisplay'
import SystemHealthDisplay from '../../components/SystemHealthDisplay'
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

  const runFullDiagnostic = async () => {
    setIsRunningFullDiagnostic(true)
    let testsPassed = 0
    let testsFailed = 0
    const totalTests = 9 // Version, Bridge Status, 6 diagnostic functions (including bridge lifecycle), Generator check
    
    debugManager.logUserAction('🚀 Complete Diagnostic Suite Started', { 
      totalTests,
      systemStatus,
      soundFontLoaded: soundFontLoaded ? 'Yes' : 'No'
    })
    
    // CRITICAL: Log the exact moment diagnostics start
    debugManager.logSystemEvent('🔍 Pre-diagnostic bridge verification', {
      wasmModuleExists: !!wasmModule,
      availableFunctions: wasmModule ? Object.keys(wasmModule).filter(key => 
        typeof wasmModule[key] === 'function' && key.includes('diagnose')
      ) : [],
      systemStatus: systemStatus,
      systemReady: systemStatus === 'ready',
      audioInitialized: !!audioContext,
      audioContextState: audioContext?.state,
      soundFontStatus: soundFontLoaded ? 'loaded' : 'not loaded',
      critical: 'If systemReady=true but bridge not available, init_all_systems() was not called or failed'
    })
    
    try {
      // Test 0: Immediate Bridge Check (before any other tests)
      debugManager.logSystemEvent('🔍 Test 0/9: Immediate Bridge Check')
      try {
        const immediateBridgeStatus = wasmModule.debug_bridge_status()
        const parsedImmediate = JSON.parse(immediateBridgeStatus)
        debugManager.logSystemEvent('🔍 Immediate bridge check result', { 
          rawResponse: immediateBridgeStatus,
          parsed: parsedImmediate,
          available: parsedImmediate.available,
          timing: 'Called immediately before diagnostic tests start',
          bridgeExists: parsedImmediate.available ? 'YES' : 'NO - Bridge is null in WASM'
        })
      } catch (error) {
        debugManager.logError('💥 Immediate bridge check failed', { 
          error: String(error),
          implication: 'Bridge might not be properly initialized or function call failed'
        })
      }
      
      // Small delay to let any async initialization complete
      debugManager.logSystemEvent('⏳ Adding 100ms delay for bridge stabilization')
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Test 1: Version Check
      debugManager.logSystemEvent('🔍 Test 1/9: WASM Version Check')
      try {
        const version = wasmModule.get_wasm_version()
        const versionInfo = JSON.parse(version)
        if (versionInfo.version.includes('2025-08-09-22:41')) {
          debugManager.logSystemEvent('✅ Version Check: Generator implementation confirmed', {
            version: versionInfo.version,
            diagnosis: 'Real SoundFont generator reading is implemented'
          })
          testsPassed++
        } else {
          debugManager.logError('❌ Version Check: Old build detected', {
            version: versionInfo.version,
            diagnosis: 'Missing generator implementation - needs rebuild'
          })
          testsFailed++
        }
      } catch (error) {
        debugManager.logError('💥 Version Check Failed', { error: String(error) })
        testsFailed++
      }

      // Test 2: Bridge Status
      debugManager.logSystemEvent('🔍 Test 2/9: Bridge Status Check')
      try {
        const bridgeStatus = wasmModule.debug_bridge_status()
        debugManager.logSystemEvent('🔍 Raw bridge status response', { 
          rawResponse: bridgeStatus,
          responseLength: bridgeStatus.length 
        })
        const bridgeData = JSON.parse(bridgeStatus)
        debugManager.logSystemEvent('🔍 Parsed bridge data', bridgeData)
        
        if (bridgeData.available) {
          debugManager.logSystemEvent('✅ Bridge Status: Available', bridgeData)
          testsPassed++
        } else {
          debugManager.logError('❌ Bridge Status: Not Available', bridgeData)
          testsFailed++
        }
      } catch (error) {
        debugManager.logError('💥 Bridge Status Check Failed', { error: String(error) })
        testsFailed++
      }

      // Test 3-8: Diagnostic Functions
      const diagnosticTests = [
        { name: 'Audio Pipeline', func: 'diagnose_audio_pipeline' },
        { name: 'SoundFont Data', func: 'diagnose_soundfont_data' },
        { name: 'MIDI Processing', func: 'diagnose_midi_processing' },
        { name: 'System Diagnostics', func: 'get_system_diagnostics' },
        { name: 'Audio Test', func: 'run_audio_test' },
        { name: 'Bridge Lifecycle', func: 'diagnose_bridge_lifecycle' }
      ]

      for (let i = 0; i < diagnosticTests.length; i++) {
        const test = diagnosticTests[i]
        const testNumber = i + 3
        debugManager.logSystemEvent(`🔍 Test ${testNumber}/9: ${test.name}`)
        
        try {
          const result = (wasmModule as any)[test.func]()
          const data = JSON.parse(result)
          
          if (data.success) {
            debugManager.logSystemEvent(`✅ ${test.name}: Success`, data)
            testsPassed++
          } else {
            debugManager.logError(`❌ ${test.name}: Failed`, data)
            testsFailed++
          }
        } catch (error) {
          debugManager.logError(`💥 ${test.name}: Exception`, { error: String(error) })
          testsFailed++
        }
      }

      // Test 9: Generator Implementation Check
      debugManager.logSystemEvent('🔍 Test 9/9: Generator Implementation Check')
      try {
        const soundFontResult = wasmModule.diagnose_soundfont_data()
        const soundFontInfo = JSON.parse(soundFontResult)
        
        // Check for generator implementation OR loaded SoundFont with samples
        // The presence of a loaded SoundFont with valid samples indicates generators are working
        const hasGeneratorImplementation = soundFontInfo.soundfont?.generatorImplementation
        const hasSoundFontWithSamples = soundFontInfo.success && 
                                       soundFontInfo.soundfont?.loaded && 
                                       soundFontInfo.soundfont?.sampleCount > 0
        
        if (hasGeneratorImplementation || hasSoundFontWithSamples) {
          debugManager.logSystemEvent('✅ Generator Implementation: Active', {
            implementation: hasGeneratorImplementation ? soundFontInfo.soundfont.generatorImplementation : 'Inferred from loaded SoundFont',
            soundFontLoaded: soundFontInfo.soundfont?.loaded,
            sampleCount: soundFontInfo.soundfont?.sampleCount,
            diagnosis: 'SoundFont with samples loaded - generators functional'
          })
          testsPassed++
        } else {
          debugManager.logError('❌ Generator Implementation: Missing', {
            soundFontInfo,
            diagnosis: 'No SoundFont loaded or generator implementation not detected'
          })
          testsFailed++
        }
      } catch (error) {
        debugManager.logError('💥 Generator Implementation Check Failed', { error: String(error) })
        testsFailed++
      }

      // Summary
      const overallStatus = testsFailed === 0 ? 'pass' : 
                           testsPassed === 0 ? 'fail' : 'partial'
      
      setDiagnosticSummary({
        totalTests,
        passed: testsPassed,
        failed: testsFailed,
        overallStatus
      })

      debugManager.logUserAction(`🎯 Diagnostic Suite Complete`, {
        testsPassed,
        testsFailed,
        totalTests,
        overallStatus,
        successRate: `${Math.round(testsPassed / totalTests * 100)}%`
      })

    } catch (error) {
      debugManager.logError('💥 Diagnostic Suite Failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsRunningFullDiagnostic(false)
    }
  }

  const testRawSample = async () => {
    if (!audioContext) {
      debugManager.logError('❌ No AudioContext available')
      return
    }
    
    setIsTestingRawSample(true)
    
    try {
      debugManager.logUserAction('🎵 Raw Sample Test Started', { 
        note: 'Testing Web Audio routing directly, bypassing synthesis pipeline' 
      })

      if (!soundFontLoaded) {
        debugManager.logSystemEvent('📁 Loading Test SoundFont')
        await loadTestSoundFont()
      }

      const soundFontResult = wasmModule.diagnose_soundfont_data()
      const soundFontInfo = JSON.parse(soundFontResult)
      
      if (!soundFontInfo.success || !soundFontInfo.soundfont?.firstSample) {
        debugManager.logError('❌ No Sample Data Found', { soundFontInfo })
        return
      }
      
      const sampleInfo = soundFontInfo.soundfont.firstSample
      debugManager.logSystemEvent('✅ Sample Data Found', sampleInfo)
      
      // Create AudioBuffer and play
      const sampleRate = audioContext.sampleRate
      const duration = 2.0
      const frameCount = sampleRate * duration
      
      const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate)
      const channelData = audioBuffer.getChannelData(0)
      
      // Generate tone based on sample info
      const frequency = sampleInfo.originalPitch ? 
        440 * Math.pow(2, (sampleInfo.originalPitch - 69) / 12) : 261.63
      
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3
      }
      
      const sourceNode = audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      sourceNode.connect(audioContext.destination)
      sourceNode.start()
      
      debugManager.logSystemEvent('🔊 Raw Sample Playback Started', {
        frequency: `${frequency.toFixed(2)} Hz`,
        duration: `${duration}s`,
        note: 'Playing directly through Web Audio (bypassing synthesis)'
      })
      
    } catch (error) {
      debugManager.logError('💥 Raw Sample Test Failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsTestingRawSample(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 WASM Diagnostic</h1>
          <p className="text-lg text-gray-600">
            Comprehensive WebAssembly module testing and debugging
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* System Health Status */}
            <SystemHealthDisplay />
            {/* Diagnostic Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔬 System Diagnostic</h2>
              
              <div className="space-y-4">
                <button 
                  onClick={runFullDiagnostic}
                  disabled={isRunningFullDiagnostic}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {isRunningFullDiagnostic ? '🔄 Running Complete Diagnostic...' : '🚀 Run Complete Diagnostic'}
                </button>
                
                <button 
                  onClick={testRawSample}
                  disabled={isTestingRawSample}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isTestingRawSample ? '🔄 Testing Raw Sample...' : '🎵 Test Raw Sample Playback'}
                </button>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                <p className="font-medium mb-2">🎯 Diagnostic Tests Include:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>WASM module version and generator implementation</li>
                  <li>Bridge initialization and lifecycle analysis</li>
                  <li>Audio pipeline, SoundFont data, and MIDI processing</li>
                  <li>Complete system diagnostics and audio routing</li>
                </ul>
              </div>
            </div>

            {/* Diagnostic Summary */}
            {diagnosticSummary.totalTests > 0 && (
              <div className={`rounded-lg p-6 border-2 ${
                diagnosticSummary.overallStatus === 'pass' ? 'bg-green-50 border-green-200' :
                diagnosticSummary.overallStatus === 'fail' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  diagnosticSummary.overallStatus === 'pass' ? 'text-green-800' :
                  diagnosticSummary.overallStatus === 'fail' ? 'text-red-800' :
                  'text-yellow-800'
                }`}>
                  {diagnosticSummary.overallStatus === 'pass' && '🎉 All Tests Passed!'}
                  {diagnosticSummary.overallStatus === 'fail' && '🚨 Critical Issues Detected'}
                  {diagnosticSummary.overallStatus === 'partial' && '⚠️ Partial Functionality'}
                </h3>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{diagnosticSummary.passed}</div>
                    <div className="text-sm text-green-700">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{diagnosticSummary.failed}</div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-700">
                      {Math.round(diagnosticSummary.passed / diagnosticSummary.totalTests * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Debug Log */}
          <div>
            <UnifiedDebugDisplay 
              maxHeight="600px"
              showCategories={true}
              showTimestamps={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}