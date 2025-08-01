/**
 * AWE Player - UI Controls Module
 * Part of AWE Player EMU8000 Emulator
 * 
 * Provides organized UI control functionality for audio playback interface
 * Manages audio context, AudioWorklet, and MIDI input controls
 */

import { DebugLogger } from './utils/debug-logger.js';
import { AudioWorkletManager, isAudioWorkletSupported } from './audio-worklet-manager.js';

/**
 * UI Control Manager - coordinates all UI interactions
 */
export class UIControlManager {
    private logger: DebugLogger;
    private wasmModule: any = null;
    private audioContext: AudioContext | null = null;
    private audioWorkletManager: AudioWorkletManager | null = null;
    private midiPlayer: any = null;

    // DOM Elements
    private wasmStatus: HTMLElement;
    private audioStatus: HTMLElement;
    private workletStatus: HTMLElement;
    private startAudioBtn: HTMLButtonElement;
    private playTestToneBtn: HTMLButtonElement;
    private stopAudioBtn: HTMLButtonElement;
    private clearLogBtn: HTMLButtonElement;
    private debugLogTextarea: HTMLTextAreaElement;
    private pianoKeys: NodeListOf<HTMLButtonElement>;

    constructor(wasmModule: any, midiPlayer: any) {
        this.logger = new DebugLogger({ componentName: 'UIControls', enabled: true });
        this.wasmModule = wasmModule;
        this.midiPlayer = midiPlayer;

        // Get DOM elements
        this.wasmStatus = document.getElementById('wasm-status') as HTMLElement;
        this.audioStatus = document.getElementById('audio-status') as HTMLElement;
        this.workletStatus = document.getElementById('worklet-status') as HTMLElement;
        
        this.startAudioBtn = document.getElementById('start-audio') as HTMLButtonElement;
        this.playTestToneBtn = document.getElementById('play-test-tone') as HTMLButtonElement;
        this.stopAudioBtn = document.getElementById('stop-audio') as HTMLButtonElement;
        this.clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement;
        
        this.debugLogTextarea = document.getElementById('debug-log') as HTMLTextAreaElement;
        this.pianoKeys = document.querySelectorAll('.piano-key') as NodeListOf<HTMLButtonElement>;

        this.setupEventHandlers();
    }

    /**
     * Set up all UI event handlers
     */
    private setupEventHandlers(): void {
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
    private async handleStartAudio(): Promise<void> {
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
            
        } catch (error) {
            this.logger.log('❌ Failed to start audio', error);
            this.updateStatus(this.audioStatus, 'Audio: Error', 'error');
            this.updateStatus(this.workletStatus, 'AudioWorklet: Error', 'error');
        }
    }

    /**
     * Handle playing a test tone (Phase 8A testing)
     */
    private handlePlayTestTone(): void {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady()) {
            this.logger.log('❌ AudioWorklet not ready');
            return;
        }
        
        try {
            this.logger.log('🎵 Playing test tone (Middle C)...');
            
            // Play Middle C (MIDI note 60) with velocity 100
            this.audioWorkletManager.noteOn(0, 60, 100);
            
            // Schedule note off after 500ms
            setTimeout(() => {
                this.audioWorkletManager!.noteOff(0, 60);
                this.logger.log('🎵 Test tone stopped');
            }, 500);
            
            // Get buffer metrics after a short delay
            setTimeout(() => {
                this.audioWorkletManager!.getBufferMetrics();
            }, 1000);
            
        } catch (error) {
            this.logger.log('❌ Failed to play test tone', error);
        }
    }

    /**
     * Handle stopping audio
     */
    private handleStopAudio(): void {
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
     * Handle note on events (MIDI testing)
     */
    private handleNoteOn(note: number, keyElement: HTMLButtonElement): void {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady()) return;
        
        try {
            // Send note on to AudioWorklet
            this.audioWorkletManager.noteOn(0, note, 100); // Channel 0, velocity 100
            
            // Visual feedback
            keyElement.classList.add('pressed');
            
            this.logger.log(`🎹 Note ON: ${note} (${this.getNoteNameFromMIDI(note)})`);
            
        } catch (error) {
            this.logger.log(`❌ Failed to trigger note ${note}`, error);
        }
    }

    /**
     * Handle note off events (MIDI testing)
     */
    private handleNoteOff(note: number, keyElement: HTMLButtonElement): void {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady()) return;
        
        try {
            // Send note off to AudioWorklet
            this.audioWorkletManager.noteOff(0, note); // Channel 0
            
            // Visual feedback
            keyElement.classList.remove('pressed');
            
            this.logger.log(`🎹 Note OFF: ${note} (${this.getNoteNameFromMIDI(note)})`);
            
        } catch (error) {
            this.logger.log(`❌ Failed to release note ${note}`, error);
        }
    }

    /**
     * Handle clearing the debug log
     */
    private handleClearLog(): void {
        this.debugLogTextarea.value = '';
        this.logger.log('🧹 Debug log cleared');
    }

    /**
     * Update status display
     */
    private updateStatus(element: HTMLElement, text: string, type: 'success' | 'error' | 'info'): void {
        element.textContent = text;
        element.className = `status-item ${type}`;
    }

    /**
     * Convert MIDI note number to note name
     */
    private getNoteNameFromMIDI(note: number): string {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(note / 12) - 1;
        const noteName = noteNames[note % 12];
        return `${noteName}${octave}`;
    }

    /**
     * Test the complete audio pipeline
     */
    private testAudioPipeline(): void {
        if (!this.audioWorkletManager || !this.audioWorkletManager.isReady()) {
            this.logger.log('❌ Cannot test - AudioWorklet not ready');
            return;
        }
        
        this.logger.log('🧪 Testing audio pipeline with C major scale...');
        
        // Play C major scale
        const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C D E F G A B C
        let noteIndex = 0;
        
        const playNextNote = () => {
            if (noteIndex < scale.length) {
                const note = scale[noteIndex];
                this.logger.log(`🎵 Playing ${this.getNoteNameFromMIDI(note)}`);
                
                // Note on
                this.audioWorkletManager!.noteOn(0, note, 80);
                
                // Note off after 200ms
                setTimeout(() => {
                    this.audioWorkletManager!.noteOff(0, note);
                }, 200);
                
                noteIndex++;
                
                // Next note after 250ms
                if (noteIndex < scale.length) {
                    setTimeout(playNextNote, 250);
                } else {
                    // Test complete - show metrics
                    setTimeout(() => {
                        this.logger.log('✅ Audio pipeline test complete!');
                        this.audioWorkletManager!.getBufferMetrics();
                        this.audioWorkletManager!.getStats();
                    }, 500);
                }
            }
        };
        
        playNextNote();
    }

    /**
     * Set up periodic debug log updates from WASM
     */
    public setupDebugLogUpdates(): void {
        setInterval(() => {
            if (this.midiPlayer) {
                try {
                    const wasmLog = this.midiPlayer.get_debug_log();
                    if (wasmLog && wasmLog.trim() !== this.debugLogTextarea.value.trim()) {
                        this.debugLogTextarea.value = wasmLog;
                        this.debugLogTextarea.scrollTop = this.debugLogTextarea.scrollHeight;
                    }
                } catch (error) {
                    // Silently ignore errors in log updates
                }
            }
        }, 100); // Update every 100ms
    }

    /**
     * Initialize the UI control manager after WASM module is loaded
     */
    public initialize(): void {
        this.logger.log('✅ UI Controls initialized');
        this.updateStatus(this.wasmStatus, 'WASM: Ready', 'success');
        
        // Set up debug log updates
        this.setupDebugLogUpdates();
    }

    /**
     * Get the audio context (for external access if needed)
     */
    public getAudioContext(): AudioContext | null {
        return this.audioContext;
    }

    /**
     * Get the AudioWorklet manager (for external access if needed)
     */
    public getAudioWorkletManager(): AudioWorkletManager | null {
        return this.audioWorkletManager;
    }
}