import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { debugManager } from '../utils/DebugManager'

// Types
interface WasmModule {
  init_all_systems: (sampleRate: number) => boolean
  queue_midi_event_global: (timestamp: number, channel: number, messageType: number, data1: number, data2: number) => void
  reset_audio_state_global: () => void
  get_system_status: () => string
  process_audio_buffer: (length: number) => Float32Array
  process_stereo_buffer_global: (length: number) => Float32Array
  // SoundFont functions
  init_soundfont_module: () => string
  validate_soundfont_header: (data: Uint8Array) => string
  parse_soundfont_file: (data: Uint8Array) => string
  load_soundfont_into_player: (data: Uint8Array) => string
  select_preset_global: (bank: number, program: number) => string
  get_current_preset_info_global: () => string
  test_soundfont_synthesis: () => string
  // Pipeline and diagnostic functions
  get_pipeline_status_global: () => string
  get_soundfont_info: () => string
  quick_c_major_test: () => string
  get_buffer_metrics_global: () => string
  get_version_info: () => string
  test_soundfont_memory: () => string
  test_audio_synthesis_pipeline: () => string
  // New structured diagnostic functions
  diagnose_audio_pipeline: () => string
  diagnose_soundfont_data: () => string
  diagnose_midi_processing: () => string
  get_system_diagnostics: () => string
  run_audio_test: () => string
}

interface AudioWorkletManager {
  initialize: () => Promise<void>
  isInitialized: boolean
  sendMessage: (message: any) => void
  processor?: ScriptProcessorNode
  recordingDestination?: MediaStreamAudioDestinationNode
}

interface AwePlayerState {
  // WASM State
  wasmModule: WasmModule | null
  wasmLoading: boolean
  wasmError: string | null
  
  // Audio State  
  audioContext: AudioContext | null
  audioWorklet: AudioWorkletManager | null
  audioInitialized: boolean
  audioError: string | null
  
  // System Status
  systemStatus: 'initializing' | 'ready' | 'error'
  debugLog: string
  
  // MIDI State
  midiAccess: WebMidi.MIDIAccess | null
  connectedDevices: WebMidi.MIDIInput[]
  
  // SoundFont State
  currentPresetInfo: string | null
  soundFontLoaded: boolean
  availablePresets: Array<{bank: number, program: number, name: string}> | null
  soundFontName: string | null
  
  // Audio Recording State
  isRecording: boolean
  mediaRecorder: MediaRecorder | null
  
  // In-memory Audio Buffers
  referenceAudio: Float32Array | null
  lastRecordedAudio: Float32Array | null
}

type AwePlayerAction =
  | { type: 'WASM_LOADING' }
  | { type: 'WASM_LOADED'; payload: WasmModule }
  | { type: 'WASM_ERROR'; payload: string }
  | { type: 'AUDIO_INITIALIZING' }
  | { type: 'AUDIO_INITIALIZED'; payload: { context: AudioContext; worklet: AudioWorkletManager } }
  | { type: 'AUDIO_ERROR'; payload: string }
  | { type: 'UPDATE_DEBUG_LOG'; payload: string }
  | { type: 'UPDATE_SYSTEM_STATUS'; payload: AwePlayerState['systemStatus'] }
  | { type: 'MIDI_INITIALIZED'; payload: { access: WebMidi.MIDIAccess; devices: WebMidi.MIDIInput[] } }
  | { type: 'SOUNDFONT_LOADED'; payload: { presetInfo: string; soundFontName: string; presets?: Array<{bank: number, program: number, name: string}> } }
  | { type: 'PRESET_CHANGED'; payload: string }
  | { type: 'RECORDING_STARTED'; payload: MediaRecorder }
  | { type: 'RECORDING_STOPPED' }
  | { type: 'REFERENCE_LOADED'; payload: Float32Array }
  | { type: 'RECORDING_CAPTURED'; payload: Float32Array }
  | { type: 'RESET_STATE' }

const initialState: AwePlayerState = {
  wasmModule: null,
  wasmLoading: false,
  wasmError: null,
  audioContext: null,
  audioWorklet: null,
  audioInitialized: false,
  audioError: null,
  systemStatus: 'initializing',
  debugLog: '',
  midiAccess: null,
  connectedDevices: [],
  currentPresetInfo: null,
  soundFontLoaded: false,
  availablePresets: null,
  soundFontName: null,
  isRecording: false,
  mediaRecorder: null,
  referenceAudio: null,
  lastRecordedAudio: null
}

function awePlayerReducer(state: AwePlayerState, action: AwePlayerAction): AwePlayerState {
  switch (action.type) {
    case 'WASM_LOADING':
      return {
        ...state,
        wasmLoading: true,
        wasmError: null
      }
      
    case 'WASM_LOADED':
      return {
        ...state,
        wasmModule: action.payload,
        wasmLoading: false,
        wasmError: null
      }
      
    case 'WASM_ERROR':
      return {
        ...state,
        wasmLoading: false,
        wasmError: action.payload,
        systemStatus: 'error'
      }
      
    case 'AUDIO_INITIALIZING':
      return {
        ...state,
        audioError: null
      }
      
    case 'AUDIO_INITIALIZED':
      return {
        ...state,
        audioContext: action.payload.context,
        audioWorklet: action.payload.worklet,
        audioInitialized: true,
        audioError: null,
        systemStatus: 'ready'
      }
      
    case 'AUDIO_ERROR':
      return {
        ...state,
        audioError: action.payload,
        systemStatus: 'error'
      }
      
    case 'UPDATE_DEBUG_LOG':
      return {
        ...state,
        debugLog: action.payload
      }
      
    case 'UPDATE_SYSTEM_STATUS':
      return {
        ...state,
        systemStatus: action.payload
      }
      
    case 'MIDI_INITIALIZED':
      return {
        ...state,
        midiAccess: action.payload.access,
        connectedDevices: action.payload.devices
      }
      
    case 'SOUNDFONT_LOADED':
      return {
        ...state,
        soundFontLoaded: true,
        currentPresetInfo: action.payload.presetInfo,
        soundFontName: action.payload.soundFontName,
        availablePresets: action.payload.presets || null
      }
      
    case 'PRESET_CHANGED':
      return {
        ...state,
        currentPresetInfo: action.payload
      }
      
    case 'RECORDING_STARTED':
      return {
        ...state,
        isRecording: true,
        mediaRecorder: action.payload
      }
      
    case 'RECORDING_STOPPED':
      return {
        ...state,
        isRecording: false,
        mediaRecorder: null
      }
      
    case 'REFERENCE_LOADED':
      return {
        ...state,
        referenceAudio: action.payload
      }
      
    case 'RECORDING_CAPTURED':
      return {
        ...state,
        lastRecordedAudio: action.payload
      }
      
      
    case 'RESET_STATE':
      return initialState
      
    default:
      return state
  }
}

// Context
interface AwePlayerContextValue extends AwePlayerState {
  // Actions
  initializeWasm: () => Promise<void>
  initializeAudio: () => Promise<void>
  initializeMidi: () => Promise<void>
  resetSystem: () => void
  updateDebugLog: (log: string) => void
  sendMidiEvent: (channel: number, messageType: number, data1: number, data2: number) => void
  testMidiPlayback: () => void
  copyDebugLog: () => Promise<void>
  // SoundFont functions
  loadSoundFont: (file: File) => Promise<void>
  loadTestSoundFont: () => Promise<void>
  selectPreset: (bank: number, program: number) => void
  // Audio capture functions
  startAudioRecording: () => void
  stopAudioRecording: () => Promise<string | null>
  recordTestTone: (durationMs: number) => Promise<boolean>
  downloadRecording: () => boolean
  loadReferenceAudio: () => Promise<boolean>
  compareWithReference: () => { similarity: number, differences: string[] } | null
  getLastRecordingInfo: () => { duration: number, samples: number } | null
  runAutoTest: (durationMs?: number) => Promise<{ similarity: number, differences: string[] } | null>
}

const AwePlayerContext = createContext<AwePlayerContextValue | null>(null)

// Provider
interface AwePlayerProviderProps {
  children: ReactNode
}

// Audio recording state (stored outside React for performance)
let recordingBuffer: Float32Array[] = []
let isRecordingActive = false

export function AwePlayerProvider({ children }: AwePlayerProviderProps) {
  const [state, dispatch] = useReducer(awePlayerReducer, initialState)
  
  // Initialize WASM
  const initializeWasm = async () => {
    dispatch({ type: 'WASM_LOADING' })
    
    try {
      debugManager.logSystemEvent('WASM initialization starting')
      
      // Dynamic import of WASM module
      const wasmModule = await import('../../wasm/awe_synth.js')
      await wasmModule.default()
      
      // Set up debug manager with WASM module
      debugManager.setWasmModule(wasmModule)
      
      // Initialize systems
      const sampleRate = 44100
      debugManager.logSystemEvent('Calling init_all_systems', { sampleRate })
      const initResult = wasmModule.init_all_systems(sampleRate)
      debugManager.logSystemEvent('init_all_systems completed', { result: initResult })
      
      if (initResult) {
        dispatch({ type: 'WASM_LOADED', payload: wasmModule })
        
        // Get system status from WASM
        const systemStatus = JSON.parse(wasmModule.get_system_status())
        debugManager.logSystemEvent('WASM module initialized successfully', { systemStatus })
        
        // WASM is ready - audio will be initialized via useEffect
        debugManager.logSystemEvent('WASM module ready for audio initialization')
      } else {
        throw new Error('Failed to initialize WASM audio systems')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown WASM initialization error'
      dispatch({ type: 'WASM_ERROR', payload: errorMessage })
      debugManager.logError('WASM initialization failed', { errorMessage })
    }
  }
  
  // Initialize Audio
  const initializeAudio = async (wasmModuleOverride?: any) => {
    dispatch({ type: 'AUDIO_INITIALIZING' })
    
    try {
      const wasmModule = wasmModuleOverride || state.wasmModule
      if (!wasmModule) {
        throw new Error('WASM module not initialized')
      }
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      if (audioContext.state === 'suspended') {
        updateDebugLog('📱 AudioContext suspended - will resume on first user interaction')
        // Don't resume here - let first user action handle it
      }
      
      // Create audio processing using ScriptProcessorNode
      const bufferSize = 1024
      const processor = audioContext.createScriptProcessor(bufferSize, 0, 2)
      
      // Create recording destination (will be connected when recording starts)
      const recordingDestination = audioContext.createMediaStreamDestination()
      
      // Add audio processing diagnostics
      let processorCallCount = 0;
      let lastDiagnosticTime = 0;
      const diagnosticInterval = 2000; // Log every 2 seconds
      
      processor.onaudioprocess = (event) => {
        processorCallCount++;
        const now = Date.now();
        
        if (wasmModule?.process_stereo_buffer_global) {
          try {
            const audioData = wasmModule.process_stereo_buffer_global(bufferSize)
            const outputL = event.outputBuffer.getChannelData(0)
            const outputR = event.outputBuffer.getChannelData(1)
            
            for (let i = 0; i < bufferSize; i++) {
              outputL[i] = audioData[i * 2] || 0
              outputR[i] = audioData[i * 2 + 1] || 0
            }
            
            // Periodic audio diagnostics
            if (now - lastDiagnosticTime > diagnosticInterval) {
              const nonZeroSamples = audioData.filter((s: number) => Math.abs(s) > 0.001).length;
              const maxAmplitude = Math.max(...audioData.map((s: number) => Math.abs(s)));
              const avgAmplitude = audioData.reduce((sum: number, s: number) => sum + Math.abs(s), 0) / audioData.length;
              
              updateDebugLog(`🎵 Audio Processor: ${processorCallCount} calls, ${nonZeroSamples}/${audioData.length} non-zero samples, max: ${maxAmplitude.toFixed(6)}, avg: ${avgAmplitude.toFixed(6)}`);
              lastDiagnosticTime = now;
            }
            
            // Capture audio if recording
            if (isRecordingActive && outputL.length > 0) {
              // Store a copy of the left channel (mono) for WAV export
              const monoData = new Float32Array(outputL.length)
              outputL.forEach((sample, i) => {
                monoData[i] = sample
              })
              recordingBuffer.push(monoData)
            }
          } catch (error) {
            updateDebugLog(`❌ Audio processing error: ${error}`);
            // Silent output on error
            const outputL = event.outputBuffer.getChannelData(0)
            const outputR = event.outputBuffer.getChannelData(1)
            outputL.fill(0)
            outputR.fill(0)
          }
        } else {
          // Log when WASM function is not available
          if (processorCallCount === 1) {
            updateDebugLog(`❌ Audio processor called but wasmModule.process_stereo_buffer_global not available`);
          }
        }
      }
      
      processor.connect(audioContext.destination)
      
      const workletManager: AudioWorkletManager = {
        initialize: async () => {},
        isInitialized: true,
        sendMessage: () => {},
        processor: processor,
        recordingDestination: recordingDestination
      }
      
      updateDebugLog(`🔍 AudioContext state before dispatch: ${audioContext.state}`)
      updateDebugLog(`🔍 AudioContext sample rate: ${audioContext.sampleRate}Hz`)
      updateDebugLog(`🔍 ScriptProcessorNode connected to destination: ${!!audioContext.destination}`)
      
      // Monitor AudioContext state changes
      audioContext.addEventListener('statechange', () => {
        updateDebugLog(`🔊 AudioContext state changed: ${audioContext.state}`);
        if (audioContext.state === 'running') {
          updateDebugLog('🎉 AudioContext is now RUNNING - audio should be audible!');
        } else if (audioContext.state === 'suspended') {
          updateDebugLog('⏸️ AudioContext is SUSPENDED - no audio output until resumed');
        }
      });
      
      dispatch({ 
        type: 'AUDIO_INITIALIZED', 
        payload: { context: audioContext, worklet: workletManager } 
      })
      updateDebugLog('✅ Audio system initialized with ScriptProcessorNode')
      
      if (audioContext.state === 'suspended') {
        updateDebugLog('⚠️ AudioContext is suspended - requires user gesture to start')
        updateDebugLog('💡 Click anywhere on the page to resume audio context')
      } else {
        updateDebugLog(`✅ AudioContext is active (${audioContext.state})`)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown audio initialization error'
      dispatch({ type: 'AUDIO_ERROR', payload: errorMessage })
      updateDebugLog(`❌ Audio initialization failed: ${errorMessage}`)
    }
  }
  
  // Initialize MIDI
  const initializeMidi = async () => {
    try {
      if (!navigator.requestMIDIAccess) {
        updateDebugLog('⚠️ Web MIDI API not supported in this browser')
        return
      }
      
      const midiAccess = await navigator.requestMIDIAccess()
      const devices = Array.from(midiAccess.inputs.values())
      
      dispatch({ 
        type: 'MIDI_INITIALIZED', 
        payload: { access: midiAccess, devices } 
      })
      updateDebugLog(`✅ MIDI initialized - ${devices.length} input devices found`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown MIDI initialization error'
      updateDebugLog(`❌ MIDI initialization failed: ${errorMessage}`)
    }
  }
  
  // Reset System
  const resetSystem = () => {
    if (state.wasmModule?.reset_audio_state_global) {
      state.wasmModule.reset_audio_state_global()
    }
    updateDebugLog('🔄 System reset')
  }
  
  // Update Debug Log - merge JavaScript and WASM logs
  const updateDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    
    // Get current WASM debug log
    let wasmLog = ''
    if (state.wasmModule?.get_debug_log_global) {
      try {
        wasmLog = state.wasmModule.get_debug_log_global()
      } catch (error) {
        // Silently handle WASM debug log errors
      }
    }
    
    // Combine JavaScript messages with WASM log
    const jsLog = state.debugLog ? `${state.debugLog}\n${logEntry}` : logEntry
    const combinedLog = wasmLog ? `${jsLog}\n\n=== WASM Debug Log ===\n${wasmLog}` : jsLog
    
    dispatch({ type: 'UPDATE_DEBUG_LOG', payload: combinedLog })
  }
  
  // Send MIDI Event
  const sendMidiEvent = (channel: number, messageType: number, data1: number, data2: number) => {
    if (state.wasmModule?.queue_midi_event_global) {
      state.wasmModule.queue_midi_event_global(0, channel, messageType, data1, data2)
      updateDebugLog(`🎵 MIDI event sent: Ch${channel} ${messageType.toString(16)} ${data1} ${data2}`)
    } else {
      updateDebugLog(`❌ MIDI event failed: WASM function not available`)
    }
  }
  
  // Test MIDI Playback
  const testMidiPlayback = () => {
    debugManager.logUserAction('Test MIDI playback requested');
    debugManager.logMidiEvent('Note On C4', { note: 60, velocity: 100 });
    sendMidiEvent(0, 0x90, 60, 100); // Note On C4
    setTimeout(() => {
      debugManager.logMidiEvent('Note Off C4', { note: 60 });
      sendMidiEvent(0, 0x80, 60, 0); // Note Off C4
    }, 1000);
  }
  
  // Copy Debug Log
  const copyDebugLog = async () => {
    try {
      if (!state.debugLog.trim()) {
        updateDebugLog('⚠️ No log content to copy')
        return
      }
      
      await navigator.clipboard.writeText(state.debugLog)
      updateDebugLog(`📋 Debug log copied to clipboard (${state.debugLog.length} characters)`)
    } catch (error) {
      updateDebugLog('❌ Failed to copy debug log to clipboard')
    }
  }

  // Extract SoundFont information from WASM results
  const extractSoundFontInfo = (filename: string, parseResult: string) => {
    let presets: Array<{bank: number, program: number, name: string}> = []
    let soundFontName = filename.replace('.sf2', '').replace(/[_-]/g, ' ')
    
    try {
      // Try to parse the WASM result as JSON first
      const parsed = JSON.parse(parseResult)
      if (parsed.name) soundFontName = parsed.name
      if (parsed.presets && Array.isArray(parsed.presets)) {
        presets = parsed.presets.map((preset: any) => ({
          bank: preset.bank || 0,
          program: preset.program || 0,
          name: preset.name || `Preset ${preset.program || 0}`
        }))
        updateDebugLog(`🎼 Parsed SoundFont from JSON: "${soundFontName}" with ${presets.length} presets`)
        return { name: soundFontName, presets }
      }
    } catch (error) {
      // If JSON parsing fails, extract from debug output text
    }
    
    // Parse actual data from WASM debug output
    if (parseResult.includes('SoundFont parsing completed:')) {
      // Extract SoundFont name from debug output
      const nameMatch = parseResult.match(/SoundFont parsing completed: '([^']+)'/);
      if (nameMatch && nameMatch[1]) {
        soundFontName = nameMatch[1]
      }
      
      // Extract presets from debug output lines like "Preset 0: 'Sine' (Bank 0, Program 0)"
      const presetMatches = parseResult.match(/Preset \d+: '([^']+)' \(Bank (\d+), Program (\d+)\)/g)
      if (presetMatches) {
        presets = presetMatches.map(match => {
          const parts = match.match(/Preset \d+: '([^']+)' \(Bank (\d+), Program (\d+)\)/)
          if (parts && parts[1] && parts[2] && parts[3]) {
            return {
              name: parts[1],
              bank: parseInt(parts[2]),
              program: parseInt(parts[3])
            }
          }
          return null
        }).filter((preset): preset is { name: string; bank: number; program: number } => 
          preset !== null && preset.name !== 'EOP') // Filter out End of Presets marker
      }
      
      updateDebugLog(`🎼 Extracted from debug: "${soundFontName}" with ${presets.length} presets`)
    }
    
    return {
      name: soundFontName,
      presets: presets.length > 0 ? presets : null
    }
  }

  // Load SoundFont from file
  const loadSoundFont = async (file: File) => {
    if (!state.wasmModule) {
      updateDebugLog('❌ Cannot load SoundFont: WASM module not initialized')
      return
    }

    try {
      updateDebugLog(`🎼 Loading SoundFont: ${file.name} (${file.size} bytes)`)
      
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Validate SoundFont header first
      const headerResult = state.wasmModule.validate_soundfont_header(uint8Array)
      updateDebugLog(`🔍 SoundFont header validation: ${headerResult}`)
      
      // Load SoundFont into player
      const loadResult = state.wasmModule.load_soundfont_into_player(uint8Array)
      updateDebugLog(`✅ SoundFont loaded: ${loadResult}`)
      
      // Try to get SoundFont parsing info first
      const parseResult = state.wasmModule.parse_soundfont_file(uint8Array)
      updateDebugLog(`🔍 SoundFont parse result: ${parseResult}`)
      
      // Get current preset info (might be placeholder)
      const presetInfo = state.wasmModule.get_current_preset_info_global()
      updateDebugLog(`🎹 Current preset: ${presetInfo}`)
      
      // Extract SoundFont information
      const sfInfo = extractSoundFontInfo(file.name, parseResult)
      
      // Update state
      dispatch({ 
        type: 'SOUNDFONT_LOADED', 
        payload: { 
          presetInfo, 
          soundFontName: sfInfo.name || 'Unknown SoundFont', 
          presets: sfInfo.presets || [] 
        } 
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ SoundFont loading failed: ${errorMessage}`)
    }
  }

  // Load test SoundFont (sine wave)
  const loadTestSoundFont = async () => {
    try {
      updateDebugLog('🧪 Loading test SoundFont (sine wave)...')
      
      const response = await fetch('/sf2/instruments/middle_c_sine.sf2')
      if (!response.ok) {
        throw new Error(`Failed to fetch test SoundFont: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      if (!state.wasmModule) {
        throw new Error('WASM module not initialized')
      }
      
      // Parse the test SoundFont to get detailed info
      const parseResult = state.wasmModule.parse_soundfont_file(uint8Array)
      updateDebugLog(`🔍 Test SoundFont parse result: ${parseResult}`)
      
      // Load the test SoundFont
      const loadResult = state.wasmModule.load_soundfont_into_player(uint8Array)
      updateDebugLog(`✅ Test SoundFont loaded: ${loadResult}`)
      
      // Auto-select the first preset (Bank 0, Program 0)
      const selectResult = state.wasmModule.select_preset_global(0, 0)
      updateDebugLog(`🎹 Auto-selecting preset (0, 0): ${selectResult}`)
      
      // Extract SoundFont information from parse result
      const sfInfo = extractSoundFontInfo('middle_c_sine.sf2', parseResult)
      
      // Get actual preset info from WASM debug output instead of placeholder
      const debugLog = state.wasmModule.get_debug_log_global()
      let actualPresetInfo = state.wasmModule.get_current_preset_info_global()
      
      // Extract real preset selection from debug log
      const presetSelectedMatch = debugLog.match(/Preset selected: Bank (\d+), Program (\d+)/);
      if (presetSelectedMatch && presetSelectedMatch[1] && presetSelectedMatch[2] && sfInfo.presets) {
        const bank = parseInt(presetSelectedMatch[1])
        const program = parseInt(presetSelectedMatch[2])
        const activePreset = sfInfo.presets.find(p => p.bank === bank && p.program === program)
        
        if (activePreset) {
          actualPresetInfo = JSON.stringify({
            success: true,
            preset: {
              bank: activePreset.bank,
              program: activePreset.program,
              name: activePreset.name,
              status: "active"
            }
          })
          updateDebugLog(`🎯 Extracted real preset info: ${activePreset.name} (${bank}, ${program})`)
        }
      }
      
      updateDebugLog(`🎹 Preset info: ${actualPresetInfo}`)
      
      // Update state with real data
      dispatch({ 
        type: 'SOUNDFONT_LOADED', 
        payload: { 
          presetInfo: actualPresetInfo, 
          soundFontName: sfInfo.name || 'Test SoundFont', 
          presets: sfInfo.presets || [] 
        } 
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Test SoundFont loading failed: ${errorMessage}`)
    }
  }

  // Select preset by bank and program
  const selectPreset = (bank: number, program: number) => {
    if (!state.wasmModule) {
      updateDebugLog('❌ Cannot select preset: WASM module not initialized')
      return
    }

    try {
      const result = state.wasmModule.select_preset_global(bank, program)
      updateDebugLog(`🎹 Preset selected (Bank ${bank}, Program ${program}): ${result}`)
      
      // Get updated preset info
      const presetInfo = state.wasmModule.get_current_preset_info_global()
      updateDebugLog(`📋 Active preset: ${presetInfo}`)
      
      // Update state
      dispatch({ type: 'PRESET_CHANGED', payload: presetInfo })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Preset selection failed: ${errorMessage}`)
    }
  }

  // Create WAV file from audio buffer
  const createWavFile = (audioBuffer: Float32Array, sampleRate: number = 44100): Blob => {
    const length = audioBuffer.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true) // 16-bit
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)
    
    // Convert float32 to int16
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer[i] || 0))
      view.setInt16(offset, sample * 32767, true)
      offset += 2
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  // Start audio recording (raw PCM capture)
  const startAudioRecording = () => {
    if (!state.audioContext || !state.audioInitialized || !state.audioWorklet) {
      updateDebugLog('❌ Cannot start recording: Audio system not initialized')
      return
    }

    try {
      // Clear any previous recording
      recordingBuffer = []
      isRecordingActive = true
      
      // We'll capture audio in the main processing loop
      // The processor's onaudioprocess already runs, we just need to tap into it
      updateDebugLog('🔴 Recording enabled - capturing audio samples')
      
      // Set recording state in React
      dispatch({ type: 'RECORDING_STARTED', payload: null as any })
      updateDebugLog('🎙️ Audio recording started (lossless PCM capture)')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Recording start failed: ${errorMessage}`)
    }
  }

  // Stop audio recording and save as WAV file
  const stopAudioRecording = async (): Promise<string | null> => {
    if (!state.isRecording) {
      updateDebugLog('❌ No recording in progress')
      return null
    }

    try {
      isRecordingActive = false
      
      if (recordingBuffer.length === 0) {
        updateDebugLog('⚠️ No audio data captured')
        dispatch({ type: 'RECORDING_STOPPED' })
        return null
      }
      
      // Combine all audio chunks
      const totalLength = recordingBuffer.reduce((acc, buf) => acc + buf.length, 0)
      const combinedBuffer = new Float32Array(totalLength)
      let offset = 0
      
      for (const buffer of recordingBuffer) {
        combinedBuffer.set(buffer, offset)
        offset += buffer.length
      }
      
      // Create WAV file
      const sampleRate = state.audioContext?.sampleRate || 44100
      const wavBlob = createWavFile(combinedBuffer, sampleRate)
      const url = URL.createObjectURL(wavBlob)
      
      updateDebugLog(`✅ Recording saved as WAV: ${url} (${wavBlob.size} bytes, ${(totalLength / sampleRate).toFixed(2)}s)`)
      
      // Auto-download the file
      const a = document.createElement('a')
      a.href = url
      a.download = `test-audio-${Date.now()}.wav`
      a.click()
      
      // Clear recording buffer
      recordingBuffer = []
      dispatch({ type: 'RECORDING_STOPPED' })
      
      return url
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Recording stop failed: ${errorMessage}`)
      dispatch({ type: 'RECORDING_STOPPED' })
      return null
    }
  }

  // Record test tone with specific duration and store in memory
  const recordTestTone = async (durationMs: number): Promise<boolean> => {
    if (!state.wasmModule || !state.audioInitialized) {
      updateDebugLog('❌ Cannot record test tone: System not ready')
      return false
    }

    try {
      // Load test SoundFont if not loaded
      if (!state.soundFontLoaded) {
        updateDebugLog('📦 Loading test SoundFont first...')
        await loadTestSoundFont()
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      updateDebugLog(`🎙️ Recording test tone for ${durationMs}ms...`)
      
      // Start recording
      startAudioRecording()
      
      // Wait a moment for recording to initialize
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Play test tone
      sendMidiEvent(0, 0x90, 60, 100) // Note On
      
      // Stop after duration
      await new Promise(resolve => setTimeout(resolve, durationMs))
      sendMidiEvent(0, 0x80, 60, 0) // Note Off
      
      // Wait for note off to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Stop recording and capture to memory
      isRecordingActive = false
      
      // Combine all audio chunks into memory buffer
      const totalLength = recordingBuffer.reduce((acc, buf) => acc + buf.length, 0)
      const combinedBuffer = new Float32Array(totalLength)
      let offset = 0
      
      for (const buffer of recordingBuffer) {
        combinedBuffer.set(buffer, offset)
        offset += buffer.length
      }
      
      // Store in memory instead of downloading
      dispatch({ type: 'RECORDING_CAPTURED', payload: combinedBuffer })
      dispatch({ type: 'RECORDING_STOPPED' })
      
      // Clear recording buffer
      recordingBuffer = []
      
      const sampleRate = state.audioContext?.sampleRate || 44100
      const duration = totalLength / sampleRate
      updateDebugLog(`✅ Recording captured in memory: ${totalLength} samples, ${duration.toFixed(2)}s`)
      
      // Auto-compare with reference if available
      if (state.referenceAudio) {
        const comparison = compareWithReference()
        if (comparison) {
          updateDebugLog(`🔍 Auto-comparison: ${comparison.similarity.toFixed(1)}% similarity`)
        }
      }
      
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Test tone recording failed: ${errorMessage}`)
      isRecordingActive = false
      dispatch({ type: 'RECORDING_STOPPED' })
      return false
    }
  }
  
  // Download the last recorded audio from memory
  const downloadRecording = (): boolean => {
    if (!state.lastRecordedAudio) {
      updateDebugLog('❌ No recording available to download')
      return false
    }
    
    try {
      const sampleRate = state.audioContext?.sampleRate || 44100
      const wavBlob = createWavFile(state.lastRecordedAudio, sampleRate)
      const url = URL.createObjectURL(wavBlob)
      
      updateDebugLog(`💾 Downloading WAV: ${wavBlob.size} bytes, ${(state.lastRecordedAudio.length / sampleRate).toFixed(2)}s`)
      
      // Auto-download the file
      const a = document.createElement('a')
      a.href = url
      a.download = `test-audio-${Date.now()}.wav`
      a.click()
      
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Download failed: ${errorMessage}`)
      return false
    }
  }
  
  // Load reference audio file into memory
  const loadReferenceAudio = async (): Promise<boolean> => {
    try {
      updateDebugLog('📦 Loading reference sine wave into memory...')
      
      const response = await fetch('/wave/middle_c_sine.wav')
      if (!response.ok) {
        throw new Error(`Failed to fetch reference audio: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      
      // Parse WAV file and extract samples
      const samples = extractWavSamples(arrayBuffer)
      
      dispatch({ type: 'REFERENCE_LOADED', payload: samples })
      updateDebugLog(`✅ Reference audio loaded: ${samples.length} samples`)
      
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Reference audio loading failed: ${errorMessage}`)
      return false
    }
  }
  
  // Extract samples from WAV file
  const extractWavSamples = (arrayBuffer: ArrayBuffer): Float32Array => {
    const view = new DataView(arrayBuffer)
    
    // Find data chunk (simplified - assumes standard WAV format)
    let offset = 44 // Skip standard WAV header
    const dataSize = view.getUint32(40, true) // Data chunk size
    
    // Extract 16-bit samples and convert to Float32
    const samples = new Float32Array(dataSize / 2)
    for (let i = 0; i < samples.length; i++) {
      const sample = view.getInt16(offset + i * 2, true)
      samples[i] = sample / 32768.0 // Normalize to -1.0 to 1.0
    }
    
    return samples
  }
  
  // Compare last recording with reference audio
  const compareWithReference = (): { similarity: number, differences: string[] } | null => {
    if (!state.referenceAudio || !state.lastRecordedAudio) {
      return null
    }
    
    const ref = state.referenceAudio
    const rec = state.lastRecordedAudio
    
    // Calculate basic metrics
    const refRMS = calculateRMS(ref)
    const recRMS = calculateRMS(rec)
    
    const refZCR = calculateZeroCrossingRate(ref)
    const recZCR = calculateZeroCrossingRate(rec)
    
    // Compare characteristics
    const differences: string[] = []
    
    const durationRef = ref.length / 44100
    const durationRec = rec.length / (state.audioContext?.sampleRate || 48000)
    
    if (Math.abs(durationRef - durationRec) > 0.5) {
      differences.push(`Duration: ${durationRef.toFixed(2)}s vs ${durationRec.toFixed(2)}s`)
    }
    
    const rmsRatio = recRMS / refRMS
    if (Math.abs(rmsRatio - 1.0) > 0.1) {
      differences.push(`Amplitude: ${((rmsRatio - 1.0) * 100).toFixed(1)}% difference`)
    }
    
    const zcrRatio = recZCR / refZCR
    if (Math.abs(zcrRatio - 1.0) > 0.1) {
      differences.push(`Frequency: ${((zcrRatio - 1.0) * 100).toFixed(1)}% difference`)
    }
    
    // Calculate similarity score
    const similarity = Math.max(0, 100 - (Math.abs(rmsRatio - 1.0) * 200 + Math.abs(zcrRatio - 1.0) * 200))
    
    return { similarity, differences }
  }
  
  // Helper functions for audio analysis
  const calculateRMS = (samples: Float32Array): number => {
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] || 0
      sum += sample * sample
    }
    return Math.sqrt(sum / samples.length)
  }
  
  const calculateZeroCrossingRate = (samples: Float32Array): number => {
    let crossings = 0
    for (let i = 1; i < samples.length; i++) {
      const current = samples[i] || 0
      const previous = samples[i - 1] || 0
      if ((current >= 0) !== (previous >= 0)) {
        crossings++
      }
    }
    return crossings / samples.length
  }
  
  // Get info about last recording
  const getLastRecordingInfo = (): { duration: number, samples: number } | null => {
    if (!state.lastRecordedAudio) return null
    
    const sampleRate = state.audioContext?.sampleRate || 48000
    return {
      duration: state.lastRecordedAudio.length / sampleRate,
      samples: state.lastRecordedAudio.length
    }
  }
  
  // Auto-test: load reference, record, and compare automatically
  const runAutoTest = async (durationMs: number = 10000): Promise<{ similarity: number, differences: string[] } | null> => {
    try {
      updateDebugLog(`🚀 Starting auto-test (${durationMs/1000}s)...`)
      
      // Step 1: Load reference if not already loaded
      if (!state.referenceAudio) {
        updateDebugLog('📦 Loading reference audio...')
        const refLoaded = await loadReferenceAudio()
        if (!refLoaded) {
          updateDebugLog('❌ Auto-test failed: Could not load reference audio')
          return null
        }
      }
      
      // Step 2: Record test tone
      updateDebugLog('🎵 Recording test tone...')
      const recordSuccess = await recordTestTone(durationMs)
      if (!recordSuccess) {
        updateDebugLog('❌ Auto-test failed: Recording failed')
        return null
      }
      
      // Step 3: Compare automatically
      updateDebugLog('🔍 Comparing with reference...')
      const comparison = compareWithReference()
      if (!comparison) {
        updateDebugLog('❌ Auto-test failed: Comparison failed')
        return null
      }
      
      // Step 4: Report results
      updateDebugLog(`✅ AUTO-TEST COMPLETE!`)
      updateDebugLog(`📊 SIMILARITY: ${comparison.similarity.toFixed(1)}%`)
      
      if (comparison.differences.length > 0) {
        updateDebugLog('⚠️ DIFFERENCES FOUND:')
        comparison.differences.forEach(diff => updateDebugLog(`   • ${diff}`))
      } else {
        updateDebugLog('🎯 PERFECT MATCH - No significant differences!')
      }
      
      // Add interpretation
      if (comparison.similarity > 95) {
        updateDebugLog('🟢 RESULT: Excellent - synthesis working correctly')
      } else if (comparison.similarity > 80) {
        updateDebugLog('🟡 RESULT: Good - minor differences detected')
      } else if (comparison.similarity > 50) {
        updateDebugLog('🟠 RESULT: Fair - significant differences found')
      } else {
        updateDebugLog('🔴 RESULT: Poor - major synthesis issues detected')
      }
      
      return comparison
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateDebugLog(`❌ Auto-test failed: ${errorMessage}`)
      return null
    }
  }
  
  // Initialize WASM on mount
  useEffect(() => {
    initializeWasm()
  }, [])

  // Initialize audio when WASM is ready
  useEffect(() => {
    if (state.wasmModule && !state.audioInitialized) {
      updateDebugLog('🎵 Auto-initializing audio system...')
      initializeAudio()
    }
  }, [state.wasmModule, state.audioInitialized])

  // Auto-load test SoundFont when WASM is ready (don't wait for AudioContext resume)
  useEffect(() => {
    if (state.wasmModule && !state.soundFontLoaded) {
      updateDebugLog('📦 Auto-loading test SoundFont at startup...')
      loadTestSoundFont()
    }
  }, [state.wasmModule, state.soundFontLoaded])

  // Resume AudioContext on first user interaction
  useEffect(() => {
    const resumeAudioOnInteraction = async () => {
      if (state.audioContext && state.audioContext.state === 'suspended') {
        await state.audioContext.resume()
        updateDebugLog('🔊 AudioContext resumed automatically')
      }
    }

    // Add global event listeners for first user interaction
    const events = ['click', 'keydown', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, resumeAudioOnInteraction, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resumeAudioOnInteraction)
      })
    }
  }, [state.audioContext])
  
  const contextValue: AwePlayerContextValue = {
    ...state,
    initializeWasm,
    initializeAudio,
    initializeMidi,
    resetSystem,
    updateDebugLog,
    sendMidiEvent,
    testMidiPlayback,
    copyDebugLog,
    loadSoundFont,
    loadTestSoundFont,
    selectPreset,
    startAudioRecording,
    stopAudioRecording,
    recordTestTone,
    downloadRecording,
    loadReferenceAudio,
    compareWithReference,
    getLastRecordingInfo,
    runAutoTest
  }
  
  return (
    <AwePlayerContext.Provider value={contextValue}>
      {children}
    </AwePlayerContext.Provider>
  )
}

// Hook
export function useAwePlayer() {
  const context = useContext(AwePlayerContext)
  if (!context) {
    throw new Error('useAwePlayer must be used within an AwePlayerProvider')
  }
  return context
}