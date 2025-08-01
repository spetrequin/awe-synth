/**
 * AWE Player - UI Controls Module (Simplified DOM Interface)
 * Part of AWE Player EMU8000 Emulator
 *
 * Pure DOM interaction layer - audio logic moved to Rust
 * Handles UI events and delegates audio operations to WASM/Rust
 */
import { DebugLogger } from './utils/debug-logger.js';
import { AudioWorkletManager, isAudioWorkletSupported } from './audio-worklet-manager.js';
/**
 * UI Control Manager - Pure DOM interface for audio controls
 * Audio logic delegated to Rust WASM modules
 */
export class UIControlManager {
    logger;
    wasmModule = null;
    audioContext = null;
    audioWorkletManager = null;
    // DOM Elements
    wasmStatus;
    audioStatus;
    workletStatus;
    startAudioBtn;
    playTestToneBtn;
    stopAudioBtn;
    clearLogBtn;
    debugLogTextarea;
    pianoKeys;
    constructor(wasmModule) {
        this.logger = new DebugLogger({ componentName: 'UIControls', enabled: true });
        this.wasmModule = wasmModule;
        // Get DOM elements
        this.wasmStatus = document.getElementById('wasm-status');
        this.audioStatus = document.getElementById('audio-status');
        this.workletStatus = document.getElementById('worklet-status');
        this.startAudioBtn = document.getElementById('start-audio');
        this.playTestToneBtn = document.getElementById('play-test-tone');
        this.stopAudioBtn = document.getElementById('stop-audio');
        this.clearLogBtn = document.getElementById('clear-log');
        this.debugLogTextarea = document.getElementById('debug-log');
        this.pianoKeys = document.querySelectorAll('.piano-key');
        this.setupEventHandlers();
    }
    /**
     * Set up all UI event handlers
     */
    setupEventHandlers() {
        // Audio control handlers
        this.startAudioBtn.addEventListener('click', () => this.handleStartAudio());
        this.playTestToneBtn.addEventListener('click', () => this.handlePlayTestTone());
        this.stopAudioBtn.addEventListener('click', () => this.handleStopAudio());
        this.clearLogBtn.addEventListener('click', () => this.handleClearLog());
        // Piano key handlers for MIDI testing
        this.pianoKeys.forEach(key => {
            const note = parseInt(key.dataset.note || '60');
            key.addEventListener('mousedown', () => this.handleNoteOn(note, key));
            key.addEventListener('mouseup', () => this.handleNoteOff(note, key));
            key.addEventListener('mouseleave', () => this.handleNoteOff(note, key));
            // Touch support
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleNoteOn(note, key);
            });
            key.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleNoteOff(note, key);
            });
        });
        // Enable audio start button
        this.startAudioBtn.disabled = false;
    }
    /**
     * Handle starting the audio context
     */
    async handleStartAudio() {
        try {
            this.logger.log('🔊 Starting Web Audio Context...');
            // Check AudioWorklet support
            if (!isAudioWorkletSupported()) {
                throw new Error('AudioWorklet is not supported in this browser');
            }
            // Create AudioContext
            this.audioContext = new AudioContext();
            // Resume if needed (browser audio policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.logger.log(`✅ AudioContext started: ${this.audioContext.sampleRate}Hz`);
            this.updateStatus(this.audioStatus, `Audio: ${this.audioContext.sampleRate}Hz`, 'success');
            // Initialize AudioWorklet
            this.logger.log('🎵 Initializing AudioWorklet...');
            this.audioWorkletManager = new AudioWorkletManager();
            // Set up status callbacks
            this.audioWorkletManager.setStatusChangeCallback((status) => {
                this.logger.log(`📡 AudioWorklet status: ${status}`);
                if (status === 'ready') {
                    this.updateStatus(this.workletStatus, 'AudioWorklet: Ready', 'success');
                    // Enable other controls
                    this.playTestToneBtn.disabled = false;
                    this.stopAudioBtn.disabled = false;
                    this.startAudioBtn.disabled = true;
                    // Enable piano keys
                    this.pianoKeys.forEach(key => key.disabled = false);
                    // Test with a simple tone
                    this.logger.log('🧪 Testing audio pipeline...');
                    setTimeout(() => this.testAudioPipeline(), 500);
                }
            });
            this.audioWorkletManager.setErrorCallback((error) => {
                this.logger.log(`❌ AudioWorklet error: ${error}`);
                this.updateStatus(this.workletStatus, 'AudioWorklet: Error', 'error');
            });
            // Initialize the AudioWorklet
            const initialized = await this.audioWorkletManager.initialize(this.audioContext);
            if (!initialized) {
                throw new Error('Failed to initialize AudioWorklet');
            }
            this.updateStatus(this.workletStatus, 'AudioWorklet: Initializing...', 'info');
        }
        catch (error) {
            this.logger.log('❌ Failed to start audio', error);
            this.updateStatus(this.audioStatus, 'Audio: Error', 'error');
            this.updateStatus(this.workletStatus, 'AudioWorklet: Error', 'error');
        }
    }
    /**
     * Handle playing a test tone (delegated to Rust WASM)
     */
    handlePlayTestTone() {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady()) {
            this.logger.log('❌ AudioWorklet not ready');
            return;
        }
        try {
            this.logger.log('🎵 Playing test tone via Rust WASM...');
            // Use Rust WASM export to queue MIDI event (Middle C, velocity 100)
            if (this.wasmModule.queue_midi_event_global) {
                this.wasmModule.queue_midi_event_global(0, 0, 0x90, 60, 100); // Note On
                // Schedule note off after 500ms
                setTimeout(() => {
                    this.wasmModule.queue_midi_event_global(0, 0, 0x80, 60, 0); // Note Off
                    this.logger.log('🎵 Test tone stopped');
                }, 500);
            }
            else {
                this.logger.log('❌ WASM MIDI functions not available');
            }
        }
        catch (error) {
            this.logger.log('❌ Failed to play test tone', error);
        }
    }
    /**
     * Handle stopping audio
     */
    handleStopAudio() {
        if (this.audioWorkletManager) {
            this.audioWorkletManager.cleanup();
            this.audioWorkletManager = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.logger.log('🔇 Audio context stopped');
            this.updateStatus(this.audioStatus, 'Audio: Stopped', 'error');
            this.updateStatus(this.workletStatus, 'AudioWorklet: Stopped', 'error');
            // Reset button states
            this.startAudioBtn.disabled = false;
            this.playTestToneBtn.disabled = true;
            this.stopAudioBtn.disabled = true;
            // Disable piano keys
            this.pianoKeys.forEach(key => key.disabled = true);
        }
    }
    /**
     * Handle note on events (delegated to Rust WASM)
     */
    handleNoteOn(note, keyElement) {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady())
            return;
        try {
            // Send note on via Rust WASM
            if (this.wasmModule.queue_midi_event_global) {
                this.wasmModule.queue_midi_event_global(0, 0, 0x90, note, 100); // Channel 0, velocity 100
            }
            // Visual feedback
            keyElement.classList.add('pressed');
            this.logger.log(`🎹 Note ON: ${note} (${this.getNoteNameFromRust(note)})`);
        }
        catch (error) {
            this.logger.log(`❌ Failed to trigger note ${note}`, error);
        }
    }
    /**
     * Handle note off events (delegated to Rust WASM)
     */
    handleNoteOff(note, keyElement) {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady())
            return;
        try {
            // Send note off via Rust WASM
            if (this.wasmModule.queue_midi_event_global) {
                this.wasmModule.queue_midi_event_global(0, 0, 0x80, note, 0); // Channel 0, note off
            }
            // Visual feedback
            keyElement.classList.remove('pressed');
            this.logger.log(`🎹 Note OFF: ${note} (${this.getNoteNameFromRust(note)})`);
        }
        catch (error) {
            this.logger.log(`❌ Failed to release note ${note}`, error);
        }
    }
    /**
     * Handle clearing the debug log
     */
    handleClearLog() {
        this.debugLogTextarea.value = '';
        this.logger.log('🧹 Debug log cleared');
    }
    /**
     * Update status display
     */
    updateStatus(element, text, type) {
        element.textContent = text;
        element.className = `status-item ${type}`;
    }
    /**
     * Convert MIDI note number to note name (delegated to Rust WASM)
     */
    getNoteNameFromRust(note) {
        if (this.wasmModule.midi_note_to_name) {
            try {
                return this.wasmModule.midi_note_to_name(note);
            }
            catch (error) {
                this.logger.log(`❌ Failed to get note name from Rust: ${error}`);
            }
        }
        // Fallback if Rust function not available
        return `Note${note}`;
    }
    /**
     * Test the complete audio pipeline (delegated to Rust WASM)
     */
    testAudioPipeline() {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady()) {
            this.logger.log('❌ Cannot test - AudioWorklet not ready');
            return;
        }
        try {
            this.logger.log('🧪 Testing audio pipeline with Rust C major scale...');
            // Use Rust WASM export for C major scale test
            if (this.wasmModule.quick_c_major_test) {
                const result = this.wasmModule.quick_c_major_test();
                const parsed = JSON.parse(result);
                if (parsed.success) {
                    this.logger.log(`✅ C major scale test started: ${parsed.events_queued} events queued`);
                }
                else {
                    this.logger.log('❌ Failed to start C major scale test');
                }
            }
            else if (this.wasmModule.generate_c_major_scale_test && this.wasmModule.execute_test_sequence) {
                // Alternative approach using separate generation and execution
                const sequenceJson = this.wasmModule.generate_c_major_scale_test();
                const eventsQueued = this.wasmModule.execute_test_sequence(sequenceJson);
                this.logger.log(`✅ C major scale test: ${eventsQueued} events queued`);
            }
            else {
                this.logger.log('❌ Rust MIDI test functions not available');
            }
        }
        catch (error) {
            this.logger.log('❌ Failed to execute Rust audio pipeline test', error);
        }
    }
    /**
     * Set up periodic debug log updates from WASM
     */
    setupDebugLogUpdates() {
        setInterval(() => {
            if (this.wasmModule) {
                try {
                    // Try global debug log first, fallback to bridge debug log
                    let wasmLog = '';
                    if (this.wasmModule.get_debug_log_global) {
                        wasmLog = this.wasmModule.get_debug_log_global();
                    }
                    else if (this.wasmModule.get_debug_log) {
                        wasmLog = this.wasmModule.get_debug_log();
                    }
                    if (wasmLog && wasmLog.trim() !== this.debugLogTextarea.value.trim()) {
                        this.debugLogTextarea.value = wasmLog;
                        this.debugLogTextarea.scrollTop = this.debugLogTextarea.scrollHeight;
                    }
                }
                catch (error) {
                    // Silently ignore errors in log updates
                }
            }
        }, 100); // Update every 100ms
    }
    /**
     * Initialize the UI control manager after WASM module is loaded
     */
    initialize() {
        this.logger.log('✅ UI Controls initialized');
        this.updateStatus(this.wasmStatus, 'WASM: Ready', 'success');
        // Set up debug log updates
        this.setupDebugLogUpdates();
    }
    /**
     * Get the audio context (for external access if needed)
     */
    getAudioContext() {
        return this.audioContext;
    }
    /**
     * Get the AudioWorklet manager (for external access if needed)
     */
    getAudioWorkletManager() {
        return this.audioWorkletManager;
    }
}
//# sourceMappingURL=ui-controls.js.map