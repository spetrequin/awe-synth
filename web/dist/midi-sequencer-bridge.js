/**
 * MIDI Sequencer Bridge
 * Connects TypeScript PlaybackControls to Rust WASM MidiPlayer
 */
import { PlaybackControls } from './playback-controls.js';
import { MidiFileLoader } from './midi-file-loader.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
const log = (message) => DEBUG_LOGGERS.midiFile.log(message);
// Playback state mapping (WASM uses numbers)
var WasmPlaybackState;
(function (WasmPlaybackState) {
    WasmPlaybackState[WasmPlaybackState["Stopped"] = 0] = "Stopped";
    WasmPlaybackState[WasmPlaybackState["Playing"] = 1] = "Playing";
    WasmPlaybackState[WasmPlaybackState["Paused"] = 2] = "Paused";
})(WasmPlaybackState || (WasmPlaybackState = {}));
export class MidiSequencerBridge {
    wasmPlayer;
    playbackControls;
    fileLoader;
    updateTimer;
    isInitialized = false;
    constructor() {
        log('MidiSequencerBridge: Initializing bridge');
        this.playbackControls = new PlaybackControls();
        this.fileLoader = new MidiFileLoader();
        this.setupEventHandlers();
    }
    /**
     * Initialize the bridge with WASM module
     */
    async initialize(wasmModule) {
        try {
            log('MidiSequencerBridge: Initializing with WASM module');
            // Create WASM player instance
            this.wasmPlayer = new wasmModule.MidiPlayer();
            log('MidiSequencerBridge: WASM player created successfully');
            this.isInitialized = true;
            // Start update loop
            this.startUpdateLoop();
            return true;
        }
        catch (error) {
            log(`MidiSequencerBridge: Failed to initialize WASM - ${error}`);
            return false;
        }
    }
    /**
     * Create UI elements and attach to container
     */
    createUI(container) {
        // Create file loader UI
        const fileSection = document.createElement('div');
        fileSection.innerHTML = '<h3>MIDI File</h3>';
        this.fileLoader.createDropZone(fileSection);
        this.fileLoader.createProgressIndicator(fileSection);
        container.appendChild(fileSection);
        // Create playback controls UI
        const controlsSection = document.createElement('div');
        controlsSection.innerHTML = '<h3>Playback Controls</h3>';
        this.playbackControls.createControls(controlsSection);
        container.appendChild(controlsSection);
        log('MidiSequencerBridge: UI created');
    }
    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // File loader events
        this.fileLoader.onFileLoaded((data, info) => {
            this.handleFileLoaded(data, info);
        });
        this.fileLoader.onError((error) => {
            log(`File loading error: ${error}`);
            // Show error in playback controls
            // We could extend PlaybackControls to show errors if needed
        });
        // Playback control events
        this.playbackControls.setEvents({
            onPlay: () => this.handlePlay(),
            onPause: () => this.handlePause(),
            onStop: () => this.handleStop(),
            onSeek: (position) => this.handleSeek(position),
            onTempoChange: (tempo) => this.handleTempoChange(tempo),
            onStateChange: (state) => this.handleStateChange(state)
        });
        log('MidiSequencerBridge: Event handlers set up');
    }
    /**
     * Handle file loaded from file loader
     */
    handleFileLoaded(data, info) {
        if (!this.wasmPlayer || !this.isInitialized) {
            log('Cannot load file: WASM player not initialized');
            return;
        }
        log(`Loading MIDI file: ${info.name} (${info.size} bytes)`);
        // Load file into WASM player
        const success = this.wasmPlayer.load_midi_file(data);
        if (success) {
            log('MIDI file loaded into sequencer successfully');
            // Update playback controls with file info
            const durationSeconds = this.wasmPlayer.get_duration_seconds();
            const originalTempo = this.wasmPlayer.get_original_tempo_bpm();
            this.playbackControls.setEnabled(true);
            this.playbackControls.setDuration(durationSeconds);
            this.playbackControls.setOriginalTempo(originalTempo);
            log(`MIDI file ready: ${durationSeconds.toFixed(1)}s, ${originalTempo.toFixed(1)} BPM`);
        }
        else {
            log('Failed to load MIDI file into sequencer');
            this.playbackControls.setEnabled(false);
        }
    }
    /**
     * Handle play button press
     */
    handlePlay() {
        if (!this.wasmPlayer || !this.isInitialized)
            return;
        log('Play requested');
        this.wasmPlayer.play();
    }
    /**
     * Handle pause button press
     */
    handlePause() {
        if (!this.wasmPlayer || !this.isInitialized)
            return;
        log('Pause requested');
        this.wasmPlayer.pause();
    }
    /**
     * Handle stop button press
     */
    handleStop() {
        if (!this.wasmPlayer || !this.isInitialized)
            return;
        log('Stop requested');
        this.wasmPlayer.stop();
    }
    /**
     * Handle seek slider change
     */
    handleSeek(positionSeconds) {
        if (!this.wasmPlayer || !this.isInitialized)
            return;
        const durationSeconds = this.wasmPlayer.get_duration_seconds();
        if (durationSeconds <= 0)
            return;
        // Convert seconds to 0-1 position
        const position = positionSeconds / durationSeconds;
        log(`Seek requested: ${positionSeconds.toFixed(1)}s (${(position * 100).toFixed(1)}%)`);
        this.wasmPlayer.seek(position);
    }
    /**
     * Handle tempo change
     */
    handleTempoChange(tempoBPM) {
        if (!this.wasmPlayer || !this.isInitialized)
            return;
        const originalTempo = this.wasmPlayer.get_original_tempo_bpm();
        if (originalTempo <= 0)
            return;
        // Calculate multiplier
        const multiplier = tempoBPM / originalTempo;
        log(`Tempo change: ${tempoBPM} BPM (${multiplier.toFixed(2)}x)`);
        this.wasmPlayer.set_tempo_multiplier(multiplier);
    }
    /**
     * Handle playback state changes (for logging)
     */
    handleStateChange(state) {
        log(`Playback state changed to: ${state}`);
    }
    /**
     * Start the update loop to sync UI with WASM state
     */
    startUpdateLoop() {
        const updateInterval = 50; // 20 FPS updates
        this.updateTimer = window.setInterval(() => {
            this.updateFromWasm();
        }, updateInterval);
        log('Update loop started (50ms interval)');
    }
    /**
     * Update UI from WASM state
     */
    updateFromWasm() {
        if (!this.wasmPlayer || !this.isInitialized)
            return;
        try {
            // Get current state from WASM
            const wasmState = this.wasmPlayer.get_playback_state();
            const positionSeconds = this.wasmPlayer.get_position_seconds();
            const currentTempo = this.wasmPlayer.get_current_tempo_bpm();
            // Convert WASM state to TypeScript state
            let tsState;
            switch (wasmState) {
                case WasmPlaybackState.Stopped:
                    tsState = 'stopped';
                    break;
                case WasmPlaybackState.Playing:
                    tsState = 'playing';
                    break;
                case WasmPlaybackState.Paused:
                    tsState = 'paused';
                    break;
                default:
                    tsState = 'stopped';
                    break;
            }
            // Update playback controls (only if state has changed to avoid flickering)
            if (this.playbackControls.getState() !== tsState) {
                this.playbackControls.setState(tsState);
            }
            // Update position (this happens frequently)
            this.playbackControls.setPosition(positionSeconds);
            // Update tempo display
            this.playbackControls.setCurrentTempo(currentTempo);
            // Simulate time advance for WASM (in a real implementation, this would be driven by audio callback)
            // For now, advance by the update interval
            const samplesPerUpdate = Math.floor(44100 * (50 / 1000)); // 50ms worth of samples at 44.1kHz
            this.wasmPlayer.advance_time(samplesPerUpdate);
        }
        catch (error) {
            log(`Update error: ${error}`);
        }
    }
    /**
     * Get debug information from WASM
     */
    getDebugLog() {
        if (!this.wasmPlayer || !this.isInitialized) {
            return 'WASM player not initialized';
        }
        return this.wasmPlayer.get_debug_log();
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }
        this.playbackControls.destroy();
        this.fileLoader.destroy();
        log('MidiSequencerBridge: Destroyed');
    }
}
//# sourceMappingURL=midi-sequencer-bridge.js.map