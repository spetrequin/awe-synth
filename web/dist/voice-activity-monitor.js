/**
 * AWE Player - Real-Time Voice Activity Monitor (Phase 17.6)
 *
 * Visualizes EMU8000 32-voice polyphonic synthesis activity
 * Shows voice allocation, note information, and effects send levels
 */
import { DebugLogger } from './utils/debug-logger.js';
/**
 * Voice Activity Monitor
 * Real-time visualization of 32 EMU8000 voices
 */
export class VoiceActivityMonitor {
    logger;
    wasmModule;
    // UI Elements
    container = null;
    voiceElements = [];
    updateInterval = null;
    // Voice states (simulated until WASM provides real data)
    voiceStates = [];
    // Configuration
    VOICE_COUNT = 32;
    UPDATE_RATE_MS = 50; // 20 FPS
    constructor(wasmModule) {
        this.logger = new DebugLogger({ componentName: 'VoiceMonitor', enabled: true });
        this.wasmModule = wasmModule;
        // Initialize voice states
        for (let i = 0; i < this.VOICE_COUNT; i++) {
            this.voiceStates[i] = {
                active: false,
                note: 0,
                velocity: 0,
                channel: 0,
                phase: 'off',
                amplitude: 0,
                reverbSend: 0,
                chorusSend: 0
            };
        }
    }
    /**
     * Initialize the voice activity monitor
     */
    initialize() {
        this.logger.log('📊 Initializing voice activity monitor...');
        this.container = document.getElementById('voice-activity');
        if (!this.container) {
            this.logger.log('❌ Voice activity container not found');
            return;
        }
        // Create voice visualization elements
        this.createVoiceElements();
        // Start real-time updates
        this.startMonitoring();
        this.logger.log('✅ Voice activity monitor initialized');
    }
    /**
     * Create visualization elements for each voice
     */
    createVoiceElements() {
        if (!this.container)
            return;
        // Clear existing content
        this.container.innerHTML = '';
        this.voiceElements = [];
        // Create grid of voice visualizers
        for (let i = 0; i < this.VOICE_COUNT; i++) {
            const voiceEl = document.createElement('div');
            voiceEl.className = 'voice-meter';
            voiceEl.dataset.voice = i.toString();
            voiceEl.innerHTML = `
                <div class="voice-header">
                    <span class="voice-number">${i + 1}</span>
                    <span class="voice-note"></span>
                </div>
                <div class="voice-bar-container">
                    <div class="voice-bar" style="height: 0%"></div>
                    <div class="voice-phase"></div>
                </div>
                <div class="voice-effects">
                    <span class="effect-indicator reverb" title="Reverb">R</span>
                    <span class="effect-indicator chorus" title="Chorus">C</span>
                </div>
            `;
            this.container.appendChild(voiceEl);
            this.voiceElements.push(voiceEl);
        }
    }
    /**
     * Start monitoring voice activity
     */
    startMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => {
            this.updateVoiceActivity();
        }, this.UPDATE_RATE_MS);
        // Also update on MIDI events if available
        this.setupMIDIEventListener();
    }
    /**
     * Update voice activity display
     */
    updateVoiceActivity() {
        // Check if WASM has voice state function
        if (this.wasmModule.get_voice_states) {
            // Future: Get real voice states from WASM
            const statesJson = this.wasmModule.get_voice_states();
            try {
                const states = JSON.parse(statesJson);
                this.updateFromWASMStates(states);
            }
            catch (error) {
                this.logger.log('❌ Failed to parse voice states', error);
            }
        }
        else {
            // For now, parse debug log for voice activity
            this.updateFromDebugLog();
        }
        // Update visual elements
        this.renderVoiceStates();
    }
    /**
     * Update voice states from WASM debug log
     */
    updateFromDebugLog() {
        if (!this.wasmModule.get_debug_log_global)
            return;
        const debugLog = this.wasmModule.get_debug_log_global();
        const lines = debugLog.split('\n').slice(-100); // Last 100 lines
        // Parse for voice activity
        for (const line of lines) {
            // Look for "Note ON allocated to Voice X"
            const noteOnMatch = line.match(/Note ON allocated to Voice (\d+)/);
            if (noteOnMatch) {
                const voiceIndex = parseInt(noteOnMatch[1]);
                if (voiceIndex >= 0 && voiceIndex < this.VOICE_COUNT && this.voiceStates[voiceIndex]) {
                    // Parse note and velocity from previous lines
                    const noteMatch = line.match(/note=(\d+)/);
                    const velMatch = line.match(/vel=(\d+)/);
                    const chMatch = line.match(/ch=(\d+)/);
                    this.voiceStates[voiceIndex] = {
                        active: true,
                        note: noteMatch ? parseInt(noteMatch[1]) : 60,
                        velocity: velMatch ? parseInt(velMatch[1]) : 100,
                        channel: chMatch ? parseInt(chMatch[1]) : 0,
                        phase: 'attack',
                        amplitude: 0.8,
                        reverbSend: 0,
                        chorusSend: 0
                    };
                }
            }
            // Look for "Note OFF" messages
            const noteOffMatch = line.match(/Note OFF.*Note (\d+)/);
            if (noteOffMatch) {
                const note = parseInt(noteOffMatch[1]);
                // Find voice playing this note
                for (let i = 0; i < this.VOICE_COUNT; i++) {
                    const voice = this.voiceStates[i];
                    if (voice && voice.active && voice.note === note) {
                        voice.phase = 'release';
                        // Will be set to inactive after release animation
                        setTimeout(() => {
                            const voice = this.voiceStates[i];
                            if (voice) {
                                voice.active = false;
                                voice.phase = 'off';
                            }
                        }, 500);
                    }
                }
            }
            // Look for effects send updates
            const reverbMatch = line.match(/Reverb Send:.*\(CC=(\d+)\)/);
            if (reverbMatch) {
                const ccValue = parseInt(reverbMatch[1]);
                // Update all active voices
                for (let i = 0; i < this.VOICE_COUNT; i++) {
                    const voice = this.voiceStates[i];
                    if (voice && voice.active) {
                        voice.reverbSend = ccValue / 127;
                    }
                }
            }
            const chorusMatch = line.match(/Chorus Send:.*\(CC=(\d+)\)/);
            if (chorusMatch) {
                const ccValue = parseInt(chorusMatch[1]);
                // Update all active voices
                for (let i = 0; i < this.VOICE_COUNT; i++) {
                    const voice = this.voiceStates[i];
                    if (voice && voice.active) {
                        voice.chorusSend = ccValue / 127;
                    }
                }
            }
        }
    }
    /**
     * Update from real WASM voice states (future)
     */
    updateFromWASMStates(states) {
        // Future implementation when WASM provides voice states
        for (let i = 0; i < Math.min(states.length, this.VOICE_COUNT); i++) {
            const state = states[i];
            this.voiceStates[i] = {
                active: state.active || false,
                note: state.note || 0,
                velocity: state.velocity || 0,
                channel: state.channel || 0,
                phase: state.phase || 'off',
                amplitude: state.amplitude || 0,
                reverbSend: state.reverb_send || 0,
                chorusSend: state.chorus_send || 0
            };
        }
    }
    /**
     * Render voice states to UI
     */
    renderVoiceStates() {
        for (let i = 0; i < this.VOICE_COUNT; i++) {
            const element = this.voiceElements[i];
            const state = this.voiceStates[i];
            if (!element || !state)
                continue;
            // Update active state
            element.classList.toggle('active', state.active);
            element.classList.toggle('releasing', state.phase === 'release');
            // Update note display
            const noteEl = element.querySelector('.voice-note');
            if (noteEl && state) {
                noteEl.textContent = state.active ? this.getNoteDisplay(state.note) : '';
            }
            // Update amplitude bar
            const barEl = element.querySelector('.voice-bar');
            if (barEl && state) {
                const height = state.active ? Math.round(state.amplitude * state.velocity / 127 * 100) : 0;
                barEl.style.height = `${height}%`;
                // Color based on velocity
                if (state.velocity > 100) {
                    barEl.style.backgroundColor = '#ffff00'; // Yellow for high velocity
                }
                else if (state.velocity > 64) {
                    barEl.style.backgroundColor = '#00ff00'; // Green for medium
                }
                else {
                    barEl.style.backgroundColor = '#008800'; // Dark green for low
                }
            }
            // Update phase indicator
            const phaseEl = element.querySelector('.voice-phase');
            if (phaseEl && state) {
                phaseEl.textContent = state.active ? state.phase[0]?.toUpperCase() || '' : '';
                phaseEl.className = `voice-phase phase-${state.phase}`;
            }
            // Update effects indicators
            const reverbEl = element.querySelector('.effect-indicator.reverb');
            const chorusEl = element.querySelector('.effect-indicator.chorus');
            if (reverbEl && state) {
                reverbEl.style.opacity = state.reverbSend > 0 ? state.reverbSend.toString() : '0.2';
            }
            if (chorusEl && state) {
                chorusEl.style.opacity = state.chorusSend > 0 ? state.chorusSend.toString() : '0.2';
            }
        }
    }
    /**
     * Get note display string
     */
    getNoteDisplay(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }
    /**
     * Setup MIDI event listener for immediate updates
     */
    setupMIDIEventListener() {
        // Listen for custom MIDI events if UI dispatches them
        window.addEventListener('midi-event', (event) => {
            const { type, note, velocity, channel } = event.detail;
            if (type === 'note-on') {
                // Find free voice (simplified - real voice allocation is in WASM)
                for (let i = 0; i < this.VOICE_COUNT; i++) {
                    const voice = this.voiceStates[i];
                    if (voice && !voice.active) {
                        this.voiceStates[i] = {
                            active: true,
                            note: note,
                            velocity: velocity,
                            channel: channel,
                            phase: 'attack',
                            amplitude: 0.8,
                            reverbSend: 0,
                            chorusSend: 0
                        };
                        break;
                    }
                }
            }
            else if (type === 'note-off') {
                // Find voice playing this note
                for (let i = 0; i < this.VOICE_COUNT; i++) {
                    const voice = this.voiceStates[i];
                    if (voice && voice.active && voice.note === note) {
                        voice.phase = 'release';
                        break;
                    }
                }
            }
        });
    }
    /**
     * Stop monitoring
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.logger.log('🛑 Voice activity monitoring stopped');
    }
    /**
     * Get current active voice count
     */
    getActiveVoiceCount() {
        return this.voiceStates.filter(v => v.active).length;
    }
}
//# sourceMappingURL=voice-activity-monitor.js.map