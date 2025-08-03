/**
 * AWE Player - Enhanced UI Controls Module (Phase 17)
 * Part of AWE Player EMU8000 Emulator
 *
 * Enhanced DOM interface with MIDI input, effects control, and real-time feedback
 * Integrates with complete EMU8000 send/return effects system
 */
import { DebugLogger } from './utils/debug-logger.js';
import { AudioWorkletManager, isAudioWorkletSupported } from './audio-worklet-manager.js';
/**
 * Enhanced UI Control Manager - Complete EMU8000 interface
 * Includes MIDI device management, effects control, and real-time feedback
 */
export class UIControlManager {
    logger;
    wasmModule = null;
    audioContext = null;
    audioWorkletManager = null;
    effectsControlPanel = null;
    // MIDI Integration
    midiAccess = null;
    connectedMidiDevices = new Map();
    midiStatus = null;
    // Effects Control
    reverbSendSlider = null;
    chorusSendSlider = null;
    reverbReturnSlider = null;
    chorusReturnSlider = null;
    masterReverbSlider = null;
    masterChorusSlider = null;
    // Voice Activity Display
    voiceActivityContainer = null;
    voiceMeters = [];
    voiceUpdateInterval = null;
    // DOM Elements (existing)
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
        this.logger = new DebugLogger({ componentName: 'Enhanced-UIControls', enabled: true });
        this.wasmModule = wasmModule;
        // Get core DOM elements
        this.wasmStatus = document.getElementById('wasm-status');
        this.audioStatus = document.getElementById('audio-status');
        this.workletStatus = document.getElementById('worklet-status');
        this.startAudioBtn = document.getElementById('start-audio');
        this.playTestToneBtn = document.getElementById('play-test-tone');
        this.stopAudioBtn = document.getElementById('stop-audio');
        this.clearLogBtn = document.getElementById('clear-log');
        this.debugLogTextarea = document.getElementById('debug-log');
        this.pianoKeys = document.querySelectorAll('.piano-key');
        // Get enhanced UI elements (optional - may not exist in all HTML versions)
        this.initializeEnhancedElements();
        this.setupEventHandlers();
    }
    /**
     * Initialize enhanced UI elements (MIDI, effects, voice activity)
     */
    initializeEnhancedElements() {
        // MIDI status
        this.midiStatus = document.getElementById('midi-status');
        // Effects controls
        this.reverbSendSlider = document.getElementById('reverb-send');
        this.chorusSendSlider = document.getElementById('chorus-send');
        this.reverbReturnSlider = document.getElementById('reverb-return');
        this.chorusReturnSlider = document.getElementById('chorus-return');
        this.masterReverbSlider = document.getElementById('master-reverb');
        this.masterChorusSlider = document.getElementById('master-chorus');
        // Voice activity display
        this.voiceActivityContainer = document.getElementById('voice-activity');
        // Initialize effects controls if available
        this.initializeEffectsControls();
        // Initialize voice activity display if available
        this.initializeVoiceActivityDisplay();
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
                    // Initialize enhanced features after audio is ready
                    setTimeout(() => this.initializeMIDI(), 1000);
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
            // Dispatch custom event for voice monitor
            window.dispatchEvent(new CustomEvent('midi-event', {
                detail: { type: 'note-on', note: note, velocity: 100, channel: 0 }
            }));
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
            // Dispatch custom event for voice monitor
            window.dispatchEvent(new CustomEvent('midi-event', {
                detail: { type: 'note-off', note: note, velocity: 0, channel: 0 }
            }));
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
     * Set the effects control panel reference
     */
    setEffectsControlPanel(panel) {
        this.effectsControlPanel = panel;
        this.logger.log('✅ Effects control panel connected');
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
    // ==================== ENHANCED FEATURES (Phase 17) ====================
    /**
     * Initialize MIDI device detection and management
     */
    async initializeMIDI() {
        try {
            this.logger.log('🎹 Initializing MIDI device access...');
            if (navigator.requestMIDIAccess) {
                this.midiAccess = await navigator.requestMIDIAccess();
                // Set up MIDI device event handlers
                this.midiAccess.onstatechange = (e) => this.handleMIDIStateChange(e);
                // Scan for existing devices
                this.scanMIDIDevices();
                this.logger.log('✅ MIDI access initialized');
                this.updateMIDIStatus(`MIDI: ${this.connectedMidiDevices.size} devices`);
            }
            else {
                this.logger.log('❌ WebMIDI not supported in this browser');
                this.updateMIDIStatus('MIDI: Not supported');
            }
        }
        catch (error) {
            this.logger.log('❌ Failed to initialize MIDI access', error);
            this.updateMIDIStatus('MIDI: Error');
        }
    }
    /**
     * Scan for connected MIDI devices
     */
    scanMIDIDevices() {
        if (!this.midiAccess)
            return;
        // Clear existing devices
        this.connectedMidiDevices.clear();
        // Scan inputs
        for (const input of this.midiAccess.inputs.values()) {
            if (input.state === 'connected') {
                this.connectMIDIDevice(input);
            }
        }
        this.updateMIDIStatus(`MIDI: ${this.connectedMidiDevices.size} devices`);
    }
    /**
     * Connect a MIDI input device
     */
    connectMIDIDevice(input) {
        this.connectedMidiDevices.set(input.id, input);
        // Set up MIDI message handler
        input.onmidimessage = (event) => this.handleMIDIMessage(event);
        this.logger.log(`🎹 Connected MIDI device: ${input.name}`);
    }
    /**
     * Handle MIDI device state changes
     */
    handleMIDIStateChange(event) {
        const port = event.port;
        if (port.type === 'input') {
            if (port.state === 'connected') {
                this.connectMIDIDevice(port);
            }
            else if (port.state === 'disconnected') {
                this.connectedMidiDevices.delete(port.id);
                this.logger.log(`🎹 Disconnected MIDI device: ${port.name}`);
            }
            this.updateMIDIStatus(`MIDI: ${this.connectedMidiDevices.size} devices`);
        }
    }
    /**
     * Handle incoming MIDI messages
     */
    handleMIDIMessage(event) {
        const [status, data1, data2] = event.data;
        if (status === undefined)
            return;
        const channel = status & 0x0F;
        const messageType = status & 0xF0;
        // Send MIDI message to WASM
        if (this.wasmModule.queue_midi_event_global) {
            try {
                this.wasmModule.queue_midi_event_global(0, channel, messageType, data1 || 0, data2 || 0);
                // Log note on/off for debugging
                if (messageType === 0x90 && (data2 || 0) > 0) { // Note On
                    this.logger.log(`🎹 MIDI Note ON: ${data1} vel=${data2} ch=${channel}`);
                    window.dispatchEvent(new CustomEvent('midi-event', {
                        detail: { type: 'note-on', note: data1 || 0, velocity: data2 || 0, channel: channel }
                    }));
                }
                else if (messageType === 0x80 || (messageType === 0x90 && (data2 || 0) === 0)) { // Note Off
                    this.logger.log(`🎹 MIDI Note OFF: ${data1} ch=${channel}`);
                    window.dispatchEvent(new CustomEvent('midi-event', {
                        detail: { type: 'note-off', note: data1 || 0, velocity: 0, channel: channel }
                    }));
                }
            }
            catch (error) {
                this.logger.log('❌ Failed to process MIDI message', error);
            }
        }
    }
    /**
     * Initialize effects control sliders
     */
    initializeEffectsControls() {
        if (!this.wasmModule)
            return;
        // Set up reverb send control
        if (this.reverbSendSlider) {
            this.reverbSendSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.handleReverbSendChange(value);
            });
        }
        // Set up chorus send control
        if (this.chorusSendSlider) {
            this.chorusSendSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.handleChorusSendChange(value);
            });
        }
        // Set up reverb return control
        if (this.reverbReturnSlider) {
            this.reverbReturnSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.handleReverbReturnChange(value);
            });
        }
        // Set up chorus return control
        if (this.chorusReturnSlider) {
            this.chorusReturnSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.handleChorusReturnChange(value);
            });
        }
        // Set up master reverb control
        if (this.masterReverbSlider) {
            this.masterReverbSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.handleMasterReverbChange(value);
            });
        }
        // Set up master chorus control
        if (this.masterChorusSlider) {
            this.masterChorusSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.handleMasterChorusChange(value);
            });
        }
        this.logger.log('🎛️ Effects controls initialized');
    }
    /**
     * Handle reverb send level changes (MIDI CC 91)
     */
    handleReverbSendChange(value) {
        // Convert 0.0-1.0 to MIDI CC value 0-127
        const midiValue = Math.round(value * 127);
        // Use effects control panel if available
        if (this.effectsControlPanel) {
            this.effectsControlPanel.updateReverbSend(midiValue);
        }
        else if (this.wasmModule.queue_midi_event_global) {
            // Fallback to direct WASM call
            this.wasmModule.queue_midi_event_global(0n, 0, 0xB0, 91, midiValue);
            this.logger.log(`🎛️ Reverb Send: ${(value * 100).toFixed(1)}% (CC=${midiValue})`);
        }
    }
    /**
     * Handle chorus send level changes (MIDI CC 93)
     */
    handleChorusSendChange(value) {
        // Convert 0.0-1.0 to MIDI CC value 0-127
        const midiValue = Math.round(value * 127);
        // Use effects control panel if available
        if (this.effectsControlPanel) {
            this.effectsControlPanel.updateChorusSend(midiValue);
        }
        else if (this.wasmModule.queue_midi_event_global) {
            // Fallback to direct WASM call
            this.wasmModule.queue_midi_event_global(0n, 0, 0xB0, 93, midiValue);
            this.logger.log(`🎛️ Chorus Send: ${(value * 100).toFixed(1)}% (CC=${midiValue})`);
        }
    }
    /**
     * Handle reverb return level changes
     */
    handleReverbReturnChange(value) {
        if (this.effectsControlPanel) {
            // Get current master level from slider
            const masterSlider = document.getElementById('master-reverb');
            const masterLevel = masterSlider ? parseFloat(masterSlider.value) : 1.0;
            this.effectsControlPanel.updateReturnLevels('reverb', value, masterLevel);
        }
        this.logger.log(`🎛️ Reverb Return: ${(value * 100).toFixed(1)}%`);
    }
    /**
     * Handle chorus return level changes
     */
    handleChorusReturnChange(value) {
        if (this.effectsControlPanel) {
            // Get current master level from slider
            const masterSlider = document.getElementById('master-chorus');
            const masterLevel = masterSlider ? parseFloat(masterSlider.value) : 1.0;
            this.effectsControlPanel.updateReturnLevels('chorus', value, masterLevel);
        }
        this.logger.log(`🎛️ Chorus Return: ${(value * 100).toFixed(1)}%`);
    }
    /**
     * Handle master reverb level changes
     */
    handleMasterReverbChange(value) {
        if (this.effectsControlPanel) {
            // Get current return level from slider
            const returnSlider = document.getElementById('reverb-return');
            const returnLevel = returnSlider ? parseFloat(returnSlider.value) : 0.3;
            this.effectsControlPanel.updateReturnLevels('reverb', returnLevel, value);
        }
        this.logger.log(`🎛️ Master Reverb: ${(value * 100).toFixed(1)}%`);
    }
    /**
     * Handle master chorus level changes
     */
    handleMasterChorusChange(value) {
        if (this.effectsControlPanel) {
            // Get current return level from slider
            const returnSlider = document.getElementById('chorus-return');
            const returnLevel = returnSlider ? parseFloat(returnSlider.value) : 0.2;
            this.effectsControlPanel.updateReturnLevels('chorus', returnLevel, value);
        }
        this.logger.log(`🎛️ Master Chorus: ${(value * 100).toFixed(1)}%`);
    }
    /**
     * Initialize voice activity display
     */
    initializeVoiceActivityDisplay() {
        if (!this.voiceActivityContainer)
            return;
        // Create 32 voice meters for EMU8000 polyphony
        this.voiceMeters = [];
        for (let i = 0; i < 32; i++) {
            const voiceMeter = document.createElement('div');
            voiceMeter.className = 'voice-meter';
            voiceMeter.innerHTML = `<span class="voice-number">${i + 1}</span><div class="voice-bar"></div>`;
            this.voiceActivityContainer.appendChild(voiceMeter);
            this.voiceMeters.push(voiceMeter);
        }
        // Start voice activity updates
        this.startVoiceActivityUpdates();
        this.logger.log('📊 Voice activity display initialized (32 voices)');
    }
    /**
     * Start periodic voice activity updates
     */
    startVoiceActivityUpdates() {
        if (this.voiceUpdateInterval) {
            clearInterval(this.voiceUpdateInterval);
        }
        this.voiceUpdateInterval = setInterval(() => {
            this.updateVoiceActivity();
        }, 50); // Update at 20 FPS
    }
    /**
     * Update voice activity display
     */
    updateVoiceActivity() {
        // Note: This would need a WASM export to get voice activity data
        // For now, we'll just show that the system is active
        if (this.voiceMeters.length > 0 && this.audioWorkletManager?.isReady()) {
            // Placeholder: Show some activity simulation
            // In a real implementation, we'd get actual voice states from WASM
        }
    }
    /**
     * Update MIDI status display
     */
    updateMIDIStatus(status) {
        if (this.midiStatus) {
            this.midiStatus.textContent = status;
        }
    }
    /**
     * Enhanced initialization including MIDI and effects
     */
    async initializeEnhanced() {
        this.logger.log('✅ Enhanced UI Controls initializing...');
        // Initialize base functionality
        this.initialize();
        // Initialize MIDI
        await this.initializeMIDI();
        this.logger.log('🚀 Enhanced UI Controls fully initialized');
    }
    /**
     * Cleanup enhanced features
     */
    cleanup() {
        // Stop voice activity updates
        if (this.voiceUpdateInterval) {
            clearInterval(this.voiceUpdateInterval);
            this.voiceUpdateInterval = null;
        }
        // Disconnect MIDI devices
        for (const device of this.connectedMidiDevices.values()) {
            device.onmidimessage = null;
        }
        this.connectedMidiDevices.clear();
        // Call existing cleanup
        this.handleStopAudio();
    }
}
//# sourceMappingURL=ui-controls.js.map