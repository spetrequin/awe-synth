import { useAwePlayer } from '../../contexts/AwePlayerContext'
import UnifiedDebugDisplay from '../../components/UnifiedDebugDisplay'
import { debugManager } from '../../utils/DebugManager'

export default function WasmDiagnosticPage() {
  const { 
    systemStatus,
    soundFontLoaded,
    sendMidiEvent
  } = useAwePlayer()

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
          {/* Diagnostic Controls */}
          <div className="test-section">
            <h2>🎮 Diagnostic Controls</h2>
            <div className="test-controls">
              <button 
                onClick={() => {
                  debugManager.logUserAction('WASM comprehensive diagnostic requested', { 
                    soundFontLoaded, 
                    systemStatus 
                  })
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-primary"
                style={{ fontWeight: 'bold' }}
              >
                🔍 Run Comprehensive Diagnostic
              </button>
              
              <button 
                onClick={() => {
                  debugManager.logUserAction('WASM audio synthesis test requested')
                  // Trigger a brief audio test
                  sendMidiEvent(0, 0x90, 60, 100) // Note On
                  setTimeout(() => sendMidiEvent(0, 0x80, 60, 0), 250) // Note Off
                }}
                disabled={systemStatus !== 'ready' || !soundFontLoaded}
                className="btn btn-secondary"
              >
                🎵 Test Audio Synthesis
              </button>
              
              <button 
                onClick={() => {
                  debugManager.logUserAction('WASM MIDI processing test requested')
                  // Test MIDI event processing
                  sendMidiEvent(0, 0x90, 64, 80) // Note On E4
                  setTimeout(() => sendMidiEvent(0, 0x80, 64, 0), 100) // Quick Note Off
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-secondary"
              >
                🎹 Test MIDI Processing
              </button>
              
              <button 
                onClick={() => {
                  debugManager.logUserAction('WASM system status check requested')
                }}
                disabled={systemStatus !== 'ready'}
                className="btn btn-outline"
              >
                ⚙️ Check System Status
              </button>
            </div>
            
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              padding: 'var(--spacing-md)', 
              backgroundColor: 'var(--color-info-bg)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}>
              <h3>💡 How the Unified Diagnostics Work:</h3>
              <p>Each test button triggers a user action that automatically captures comprehensive WASM diagnostics:</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li><strong>🔊 Audio Pipeline:</strong> Sample rate, buffer configuration, pipeline readiness status</li>
                <li><strong>🎼 SoundFont Data:</strong> Loaded samples, preset information, data integrity verification</li>
                <li><strong>🎹 MIDI Processing:</strong> Event queue status, processing capabilities, system readiness</li>
                <li><strong>⚙️ System Diagnostics:</strong> Overall health, bridge availability, component status</li>
                <li><strong>🧪 Audio Test:</strong> Synthesis readiness, configuration validation, capability check</li>
              </ul>
              <p><strong>Results appear in the unified debug log below</strong> with structured, filterable data.</p>
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

          {/* Instructions */}
          <div className="test-section">
            <h2>📖 Testing Instructions</h2>
            <div style={{ fontSize: '0.875rem' }}>
              <h3>🎯 Diagnostic Test Process:</h3>
              <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li><strong>Run Comprehensive Diagnostic:</strong> Captures full system state including all WASM module diagnostics</li>
                <li><strong>Test Audio Synthesis:</strong> Plays a brief note and captures audio pipeline diagnostics</li>
                <li><strong>Test MIDI Processing:</strong> Sends MIDI events and captures processing diagnostics</li>
                <li><strong>Check System Status:</strong> Captures current system health without audio interference</li>
              </ol>
              
              <h3>🔍 What to Look For in Results:</h3>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li><strong>Audio Pipeline Ready:</strong> Should show true with 44.1kHz sample rate</li>
                <li><strong>SoundFont Loaded:</strong> Should show sine test data with 441,000 samples</li>
                <li><strong>Non-Zero Sample Data:</strong> Should show 100% non-zero samples indicating valid audio data</li>
                <li><strong>System Bridge Available:</strong> Should show all components properly initialized</li>
              </ul>
              
              <div style={{ 
                marginTop: 'var(--spacing-md)', 
                padding: 'var(--spacing-md)', 
                backgroundColor: 'var(--color-success-bg)', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <p><strong>✅ Advantage of New System:</strong> Unlike the old debug system that flooded with continuous text, 
                this unified approach captures comprehensive diagnostics only when you take actions, providing rich structured 
                data without memory issues or audio processing interference.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}