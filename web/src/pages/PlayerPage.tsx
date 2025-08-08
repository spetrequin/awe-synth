import { useState } from 'react'
import { useAwePlayer } from '../contexts/AwePlayerContext'
import UnifiedDebugDisplay from '../components/UnifiedDebugDisplay'
import { debugManager } from '../utils/DebugManager'

export default function PlayerPage() {
  const { 
    wasmModule,
    wasmLoading,
    audioContext,
    audioInitialized,
    systemStatus,
    debugLog,
    currentPresetInfo,
    soundFontLoaded,
    availablePresets,
    soundFontName,
    isRecording,
    referenceAudio,
    lastRecordedAudio,
    initializeAudio,
    resetSystem,
    sendMidiEvent,
    copyDebugLog,
    updateDebugLog,
    loadSoundFont,
    loadTestSoundFont,
    selectPreset,
    downloadRecording,
    compareWithReference,
    getLastRecordingInfo,
    runAutoTest
  } = useAwePlayer()

  const [isPlaying, setIsPlaying] = useState(false)

  const getStatusClassName = (status: typeof systemStatus) => {
    if (status === 'ready') return 'success'
    if (status === 'error') return 'error'
    return 'pending'
  }

  const getStatusText = (status: typeof systemStatus) => {
    if (status === 'ready') return '✅ System Ready'
    if (status === 'initializing') return '⏳ Initializing...'
    if (status === 'error') return '❌ System Error'
    return ''
  }

  const handlePlayTestTone = async () => {
    debugManager.logUserAction('Play test tone requested')

    if (!audioInitialized) {
      debugManager.logSystemEvent('Initializing audio system')
      await initializeAudio()
    }

    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume()
      debugManager.logAudioEvent('Audio context resumed')
    }

    // Send MIDI Note On event (Middle C, velocity 100)
    debugManager.logMidiEvent('Note On - Middle C', { note: 60, velocity: 100 })
    sendMidiEvent(0, 0x90, 60, 100)
    setIsPlaying(true)

    // Send MIDI Note Off after 2 seconds
    setTimeout(() => {
      debugManager.logMidiEvent('Note Off - Middle C', { note: 60 })
      sendMidiEvent(0, 0x80, 60, 0)
      setIsPlaying(false)
    }, 2000)
  }

  const handleResetSystem = () => {
    resetSystem()
    setIsPlaying(false)
  }

  if (systemStatus === 'error') {
    return (
      <div className="page">
        <div className="container">
          <div className="error-container">
            <h1 className="error-title">⚠️ System Initialization Error</h1>
            <p>The AWE Player system failed to initialize properly. Please check the debug log for details.</p>
            <div className="test-controls">
              <button onClick={() => window.location.reload()} className="btn btn-primary">
                🔄 Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🖥️ AWE Player</h1>
          <p className="page-description">
            Real-time EMU8000 synthesis with SoundFont 2.0 support
          </p>
          <div className={`status-indicator ${getStatusClassName(systemStatus)}`}>
            {getStatusText(systemStatus)}
          </div>
        </div>

        {/* Main Player Controls */}
        <div className="test-section">
          <h2>🎵 Player Controls</h2>
          <div className="test-controls">
            <button 
              onClick={handlePlayTestTone}
              disabled={wasmLoading || isPlaying || systemStatus !== 'ready'}
              className="btn btn-primary"
            >
              {isPlaying ? '🔊 Playing...' : '🎵 Play Test Tone'}
            </button>
            
            <button 
              onClick={handleResetSystem}
              disabled={wasmLoading}
              className="btn btn-secondary"
            >
              🔄 Reset System
            </button>

            <button 
              onClick={() => initializeAudio()}
              disabled={wasmLoading || audioInitialized}
              className="btn btn-outline"
            >
              🔧 Initialize Audio
            </button>
          </div>
          
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <p><strong>Audio Context State:</strong> {audioContext?.state || 'Not initialized'}</p>
            <p><strong>Audio Initialized:</strong> {audioInitialized ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Audio Recording:</strong> {isRecording ? '🔴 Active' : '⏹️ Stopped'}</p>
            <p><strong>WASM Module:</strong> {wasmModule ? '✅ Loaded' : wasmLoading ? '⏳ Loading...' : '❌ Not loaded'}</p>
          </div>
        </div>

        {/* MIDI Controls */}
        <div className="test-section">
          <h2>🎹 MIDI Controls</h2>
          <div className="test-controls">
            <button 
              onClick={(e) => {
                debugManager.logUserAction('Note On C4 button clicked')
                if (sendMidiEvent) {
                  debugManager.logMidiEvent('Manual Note On C4', { note: 60, velocity: 100 })
                  sendMidiEvent(0, 0x90, 60, 100);
                } else {
                  debugManager.logError('sendMidiEvent function is undefined')
                }
              }}
              disabled={systemStatus !== 'ready'}
              className="btn btn-primary"
            >
              🎵 Note On (C4)
            </button>
            
            <button 
              onClick={() => sendMidiEvent(0, 0x80, 60, 0)}
              disabled={systemStatus !== 'ready'}
              className="btn btn-secondary"
            >
              🔇 Note Off (C4)
            </button>
            
            <button 
              onClick={() => sendMidiEvent(0, 0x90, 64, 100)}
              disabled={systemStatus !== 'ready'}
              className="btn btn-primary"
            >
              🎵 Note On (E4)
            </button>
            
            <button 
              onClick={() => sendMidiEvent(0, 0x80, 64, 0)}
              disabled={systemStatus !== 'ready'}
              className="btn btn-secondary"
            >
              🔇 Note Off (E4)
            </button>
          </div>
          
          <p>
            Test individual MIDI note events. Notes will play until explicitly stopped with Note Off commands.
          </p>
        </div>

        {/* Dynamic Program Change */}
        <div className="test-section">
          <h2>🔄 Instrument Selection</h2>
          <div className="test-controls">
            {availablePresets && availablePresets.length > 0 ? (
              <>
                {availablePresets.map((preset) => (
                  <button 
                    key={`${preset.bank}-${preset.program}`}
                    onClick={() => selectPreset(preset.bank, preset.program)}
                    disabled={systemStatus !== 'ready'}
                    className="btn btn-outline"
                  >
                    {preset.name} ({preset.program})
                  </button>
                ))}
              </>
            ) : soundFontLoaded ? (
              <>
                <button 
                  onClick={() => selectPreset(0, 0)}
                  disabled={systemStatus !== 'ready'}
                  className="btn btn-outline"
                >
                  📍 Preset 0
                </button>
                <button 
                  onClick={() => selectPreset(0, 1)}
                  disabled={systemStatus !== 'ready'}
                  className="btn btn-outline"
                >
                  📍 Preset 1
                </button>
                <button 
                  onClick={() => selectPreset(0, 2)}
                  disabled={systemStatus !== 'ready'}
                  className="btn btn-outline"
                >
                  📍 Preset 2
                </button>
              </>
            ) : (
              <p style={{color: 'var(--color-text-secondary)', fontStyle: 'italic'}}>
                Load a SoundFont to see available instruments
              </p>
            )}
          </div>
          
          <p>
            {soundFontLoaded 
              ? `Try different presets from "${soundFontName}". Use the buttons above to switch between available instruments.`
              : 'Load a SoundFont to see available instrument presets. The interface will adapt to whatever presets are actually in the loaded SoundFont.'
            }
          </p>
        </div>

        {/* One-Click Audio Testing */}
        <div className="test-section">
          <h2>🚀 One-Click Audio Testing</h2>
          
          <div className="test-controls" style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <button 
              onClick={async () => {
                try {
                  setIsPlaying(true)
                  await runAutoTest(10000)
                  setIsPlaying(false)
                } catch (error) {
                  setIsPlaying(false)
                  debugManager.logError('Auto-test exception', { error })
                }
              }}
              disabled={systemStatus !== 'ready' || isPlaying}
              className="btn btn-primary"
              style={{ 
                background: isPlaying ? 'var(--color-secondary)' : 'var(--color-accent)',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                padding: 'var(--spacing-md) var(--spacing-lg)'
              }}
            >
              {isPlaying ? '🔊 Auto-Testing...' : '🚀 Run 10s Auto-Test'}
            </button>
          </div>
          
          {/* Quick Test Options */}
          <div className="test-controls" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <button 
              onClick={async () => {
                setIsPlaying(true)
                await runAutoTest(2000)
                setIsPlaying(false)
              }}
              disabled={systemStatus !== 'ready' || isPlaying}
              className="btn btn-outline"
            >
              🟢 Quick 2s Test
            </button>
            
            <button 
              onClick={async () => {
                setIsPlaying(true)
                await runAutoTest(5000)
                setIsPlaying(false)
              }}
              disabled={systemStatus !== 'ready' || isPlaying}
              className="btn btn-outline"
            >
              🟡 Medium 5s Test
            </button>
            
            <button 
              onClick={async () => {
                setIsPlaying(true)
                await runAutoTest(20000)
                setIsPlaying(false)
              }}
              disabled={systemStatus !== 'ready' || isPlaying}
              className="btn btn-outline"
            >
              🔴 Long 20s Test
            </button>
          </div>

          {/* Status Display */}
          <div style={{ 
            background: 'var(--color-bg-secondary)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)'
          }}>
            <h3>📊 Test Status</h3>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              <div>🎵 <strong>Reference:</strong> {referenceAudio ? '✅ Loaded' : '⏳ Auto-loads on first test'}</div>
              <div>🔊 <strong>Last Test:</strong> {lastRecordedAudio ? `${getLastRecordingInfo()?.duration.toFixed(2)}s recorded` : 'None yet'}</div>
              {referenceAudio && lastRecordedAudio && (() => {
                const comparison = compareWithReference()
                return comparison ? (
                  <div style={{ 
                    color: comparison.similarity > 90 ? 'var(--color-success)' : 
                           comparison.similarity > 50 ? 'var(--color-warning)' : 'var(--color-error)',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    marginTop: 'var(--spacing-sm)'
                  }}>
                    🔍 <strong>Last Result:</strong> {comparison.similarity.toFixed(1)}% similarity
                    {comparison.similarity > 95 ? ' 🎯' : comparison.similarity > 80 ? ' 🟡' : ' ⚠️'}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Optional Download */}
          {lastRecordedAudio && (
            <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
              <button 
                onClick={() => {
                  const success = downloadRecording()
                  if (success) {
                    debugManager.logUserAction('Test recording downloaded')
                  }
                }}
                className="btn btn-sm btn-outline"
              >
                💾 Download Last Test (Optional)
              </button>
            </div>
          )}
          
          <div style={{ 
            marginTop: 'var(--spacing-md)', 
            padding: 'var(--spacing-md)', 
            background: 'var(--color-info-bg)', 
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem'
          }}>
            <p><strong>🚀 How it works:</strong></p>
            <ol style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
              <li>Loads reference sine wave (once, automatically)</li>
              <li>Records test tone from synthesis engine</li>
              <li>Compares in memory instantly</li>
              <li>Shows results in debug log below</li>
            </ol>
            <p style={{ margin: 'var(--spacing-sm) 0 0 0' }}>
              <strong>Perfect for rapid testing</strong> - no file management, instant feedback!
            </p>
          </div>
        </div>

        {/* SoundFont Management */}
        <div className="test-section">
          <h2>🎼 SoundFont Management</h2>
          <div className="test-controls">
            <button 
              onClick={loadTestSoundFont}
              disabled={systemStatus !== 'ready' || soundFontLoaded}
              className="btn btn-primary"
            >
              {soundFontLoaded ? '✅ Test SoundFont Loaded' : '🧪 Load Test SoundFont (Sine Wave)'}
            </button>
            
            <input 
              type="file" 
              accept=".sf2"
              className="file-input"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  await loadSoundFont(file)
                }
              }}
            />
            
            <button 
              onClick={() => selectPreset(0, 0)}
              disabled={systemStatus !== 'ready' || !soundFontLoaded}
              className="btn btn-outline"
            >
              🎹 Select Preset (0,0)
            </button>
          </div>
          
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <h3>📋 Current SoundFont Status:</h3>
            <p><strong>SoundFont Loaded:</strong> {soundFontLoaded ? '✅ Yes' : '❌ No'}</p>
            {soundFontLoaded && (
              <>
                <p><strong>Name:</strong> 🎼 {soundFontName}</p>
                <p><strong>Available Presets:</strong> {availablePresets ? availablePresets.length : 'Unknown'}</p>
              </>
            )}
            {currentPresetInfo && (() => {
              try {
                const preset = JSON.parse(currentPresetInfo)
                if (preset.success && preset.preset) {
                  return (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', padding: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', marginTop: 'var(--spacing-sm)' }}>
                      <strong>Active Preset Details:</strong><br/>
                      Name: {preset.preset.name}<br/>
                      Bank: {preset.preset.bank}<br/>
                      Program: {preset.preset.program}<br/>
                      Status: {preset.preset.status || 'Unknown'}
                    </div>
                  )
                }
              } catch (error) {
                // Fall back to raw text if JSON parsing fails
              }
              return (
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', padding: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', marginTop: 'var(--spacing-sm)' }}>
                  <strong>Active Preset Details:</strong><br/>
                  {currentPresetInfo}
                </div>
              )
            })()}
          </div>
          
          <div style={{ 
            marginTop: 'var(--spacing-md)', 
            padding: 'var(--spacing-md)', 
            background: soundFontLoaded ? 'var(--color-success-bg)' : 'var(--color-info-bg)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            {soundFontLoaded ? (
              <p><strong>🎯 Ready for Testing:</strong> The test SoundFont is loaded and active. You can now run audio tests with a known reference signal.</p>
            ) : (
              <p><strong>🚀 Auto-Loading:</strong> The test SoundFont will load automatically when the system is ready. This provides a pure sine wave for consistent testing.</p>
            )}
          </div>
        </div>

        {/* Debug Log */}
        <div className="test-section">
          <h2>🐛 Debug Log</h2>
          <UnifiedDebugDisplay 
            maxHeight="400px"
            showCategories={true}
            showTimestamps={true}
          />
        </div>

        {/* System Information */}
        <div className="test-section">
          <h2>ℹ️ System Information</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            <p><strong>Browser:</strong> {navigator.userAgent}</p>
            <p><strong>Audio Context Sample Rate:</strong> {audioContext?.sampleRate || 'N/A'} Hz</p>
            <p><strong>Audio Context State:</strong> {audioContext?.state || 'Not initialized'}</p>
            <p><strong>WebAssembly Support:</strong> {typeof WebAssembly !== 'undefined' ? '✅ Available' : '❌ Not supported'}</p>
            <p><strong>Web Audio API:</strong> {typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined' ? '✅ Available' : '❌ Not supported'}</p>
            <p><strong>Web MIDI API:</strong> {typeof navigator.requestMIDIAccess !== 'undefined' ? '✅ Available' : '❌ Not supported'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}