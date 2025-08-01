/**
 * AWE Player - UI Controls Module
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides organized UI control functionality for audio playback interface
 * Manages audio context, AudioWorklet, and MIDI input controls
 */
import { AudioWorkletManager } from './audio-worklet-manager.js';
/**
 * UI Control Manager - coordinates all UI interactions
 */
export declare class UIControlManager {
    private logger;
    private wasmModule;
    private audioContext;
    private audioWorkletManager;
    private midiPlayer;
    private wasmStatus;
    private audioStatus;
    private workletStatus;
    private startAudioBtn;
    private playTestToneBtn;
    private stopAudioBtn;
    private clearLogBtn;
    private debugLogTextarea;
    private pianoKeys;
    constructor(wasmModule: any, midiPlayer: any);
    /**
     * Set up all UI event handlers
     */
    private setupEventHandlers;
    /**
     * Handle starting the audio context
     */
    private handleStartAudio;
    /**
     * Handle playing a test tone (Phase 8A testing)
     */
    private handlePlayTestTone;
    /**
     * Handle stopping audio
     */
    private handleStopAudio;
    /**
     * Handle note on events (MIDI testing)
     */
    private handleNoteOn;
    /**
     * Handle note off events (MIDI testing)
     */
    private handleNoteOff;
    /**
     * Handle clearing the debug log
     */
    private handleClearLog;
    /**
     * Update status display
     */
    private updateStatus;
    /**
     * Convert MIDI note number to note name
     */
    private getNoteNameFromMIDI;
    /**
     * Test the complete audio pipeline
     */
    private testAudioPipeline;
    /**
     * Set up periodic debug log updates from WASM
     */
    setupDebugLogUpdates(): void;
    /**
     * Initialize the UI control manager after WASM module is loaded
     */
    initialize(): void;
    /**
     * Get the audio context (for external access if needed)
     */
    getAudioContext(): AudioContext | null;
    /**
     * Get the AudioWorklet manager (for external access if needed)
     */
    getAudioWorkletManager(): AudioWorkletManager | null;
}
//# sourceMappingURL=ui-controls.d.ts.map