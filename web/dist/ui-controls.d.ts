/**
 * AWE Player - UI Controls Module (Simplified DOM Interface)
 * Part of AWE Player EMU8000 Emulator
 *
 * Pure DOM interaction layer - audio logic moved to Rust
 * Handles UI events and delegates audio operations to WASM/Rust
 */
import { AudioWorkletManager } from './audio-worklet-manager.js';
/**
 * UI Control Manager - Pure DOM interface for audio controls
 * Audio logic delegated to Rust WASM modules
 */
export declare class UIControlManager {
    private logger;
    private wasmModule;
    private audioContext;
    private audioWorkletManager;
    private wasmStatus;
    private audioStatus;
    private workletStatus;
    private startAudioBtn;
    private playTestToneBtn;
    private stopAudioBtn;
    private clearLogBtn;
    private debugLogTextarea;
    private pianoKeys;
    constructor(wasmModule: any);
    /**
     * Set up all UI event handlers
     */
    private setupEventHandlers;
    /**
     * Handle starting the audio context
     */
    private handleStartAudio;
    /**
     * Handle playing a test tone (delegated to Rust WASM)
     */
    private handlePlayTestTone;
    /**
     * Handle stopping audio
     */
    private handleStopAudio;
    /**
     * Handle note on events (delegated to Rust WASM)
     */
    private handleNoteOn;
    /**
     * Handle note off events (delegated to Rust WASM)
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
     * Convert MIDI note number to note name (delegated to Rust WASM)
     */
    private getNoteNameFromRust;
    /**
     * Test the complete audio pipeline (delegated to Rust WASM)
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