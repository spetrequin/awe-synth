/**
 * MIDI Sequencer Bridge
 * Connects TypeScript PlaybackControls to Rust WASM MidiPlayer
 */

import { PlaybackControls, PlaybackState as TSPlaybackState } from './playback-controls.js';
import { MidiFileLoader, MidiFileInfo } from './midi-file-loader.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';

const log = (message: string) => DEBUG_LOGGERS.midiFile.log(message);

// WASM module types (these will be available after WASM loads)
interface WasmMidiPlayer {
    new(): WasmMidiPlayer;
    load_midi_file(data: Uint8Array): boolean;
    play(): void;
    pause(): void;
    stop(): void;
    seek(position: number): void;
    set_tempo_multiplier(multiplier: number): void;
    get_playback_state(): number;
    get_position(): number;
    get_position_seconds(): number;
    get_duration_seconds(): number;
    get_current_tempo_bpm(): number;
    get_original_tempo_bpm(): number;
    advance_time(samples: number): void;
    get_debug_log(): string;
}

// Playback state mapping (WASM uses numbers)
enum WasmPlaybackState {
    Stopped = 0,
    Playing = 1,
    Paused = 2
}

export class MidiSequencerBridge {
    private wasmPlayer?: WasmMidiPlayer;
    private playbackControls: PlaybackControls;
    private fileLoader: MidiFileLoader;
    private updateTimer?: number;
    private isInitialized = false;

    constructor() {
        log('MidiSequencerBridge: Initializing bridge');
        
        this.playbackControls = new PlaybackControls();
        this.fileLoader = new MidiFileLoader();
        
        this.setupEventHandlers();
    }

    /**
     * Initialize the bridge with WASM module
     */
    public async initialize(wasmModule: any): Promise<boolean> {
        try {
            log('MidiSequencerBridge: Initializing with WASM module');
            
            // Create WASM player instance
            this.wasmPlayer = new wasmModule.MidiPlayer();
            
            log('MidiSequencerBridge: WASM player created successfully');
            this.isInitialized = true;
            
            // Start update loop
            this.startUpdateLoop();
            
            return true;
        } catch (error) {
            log(`MidiSequencerBridge: Failed to initialize WASM - ${error}`);
            return false;
        }
    }

    /**
     * Create UI elements and attach to container
     */
    public createUI(container: HTMLElement): void {
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
    private setupEventHandlers(): void {
        // File loader events
        this.fileLoader.onFileLoaded((data: Uint8Array, info: MidiFileInfo) => {
            this.handleFileLoaded(data, info);
        });

        this.fileLoader.onError((error: string) => {
            log(`File loading error: ${error}`);
            // Show error in playback controls
            // We could extend PlaybackControls to show errors if needed
        });

        // Playback control events
        this.playbackControls.setEvents({
            onPlay: () => this.handlePlay(),
            onPause: () => this.handlePause(),
            onStop: () => this.handleStop(),
            onSeek: (position: number) => this.handleSeek(position),
            onTempoChange: (tempo: number) => this.handleTempoChange(tempo),
            onStateChange: (state: TSPlaybackState) => this.handleStateChange(state)
        });

        log('MidiSequencerBridge: Event handlers set up');
    }

    /**
     * Handle file loaded from file loader
     */
    private handleFileLoaded(data: Uint8Array, info: MidiFileInfo): void {
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
        } else {
            log('Failed to load MIDI file into sequencer');
            this.playbackControls.setEnabled(false);
        }
    }

    /**
     * Handle play button press
     */
    private handlePlay(): void {
        if (!this.wasmPlayer || !this.isInitialized) return;
        
        log('Play requested');
        this.wasmPlayer.play();
    }

    /**
     * Handle pause button press
     */
    private handlePause(): void {
        if (!this.wasmPlayer || !this.isInitialized) return;
        
        log('Pause requested');
        this.wasmPlayer.pause();
    }

    /**
     * Handle stop button press
     */
    private handleStop(): void {
        if (!this.wasmPlayer || !this.isInitialized) return;
        
        log('Stop requested');
        this.wasmPlayer.stop();
    }

    /**
     * Handle seek slider change
     */
    private handleSeek(positionSeconds: number): void {
        if (!this.wasmPlayer || !this.isInitialized) return;
        
        const durationSeconds = this.wasmPlayer.get_duration_seconds();
        if (durationSeconds <= 0) return;
        
        // Convert seconds to 0-1 position
        const position = positionSeconds / durationSeconds;
        
        log(`Seek requested: ${positionSeconds.toFixed(1)}s (${(position * 100).toFixed(1)}%)`);
        this.wasmPlayer.seek(position);
    }

    /**
     * Handle tempo change
     */
    private handleTempoChange(tempoBPM: number): void {
        if (!this.wasmPlayer || !this.isInitialized) return;
        
        const originalTempo = this.wasmPlayer.get_original_tempo_bpm();
        if (originalTempo <= 0) return;
        
        // Calculate multiplier
        const multiplier = tempoBPM / originalTempo;
        
        log(`Tempo change: ${tempoBPM} BPM (${multiplier.toFixed(2)}x)`);
        this.wasmPlayer.set_tempo_multiplier(multiplier);
    }

    /**
     * Handle playback state changes (for logging)
     */
    private handleStateChange(state: TSPlaybackState): void {
        log(`Playback state changed to: ${state}`);
    }

    /**
     * Start the update loop to sync UI with WASM state
     */
    private startUpdateLoop(): void {
        const updateInterval = 50; // 20 FPS updates
        
        this.updateTimer = window.setInterval(() => {
            this.updateFromWasm();
        }, updateInterval) as unknown as number;
        
        log('Update loop started (50ms interval)');
    }

    /**
     * Update UI from WASM state
     */
    private updateFromWasm(): void {
        if (!this.wasmPlayer || !this.isInitialized) return;

        try {
            // Get current state from WASM
            const wasmState = this.wasmPlayer.get_playback_state();
            const positionSeconds = this.wasmPlayer.get_position_seconds();
            const currentTempo = this.wasmPlayer.get_current_tempo_bpm();

            // Convert WASM state to TypeScript state
            let tsState: TSPlaybackState;
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

        } catch (error) {
            log(`Update error: ${error}`);
        }
    }

    /**
     * Get debug information from WASM
     */
    public getDebugLog(): string {
        if (!this.wasmPlayer || !this.isInitialized) {
            return 'WASM player not initialized';
        }
        
        return this.wasmPlayer.get_debug_log();
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
        }

        this.playbackControls.destroy();
        this.fileLoader.destroy();
        
        log('MidiSequencerBridge: Destroyed');
    }
}