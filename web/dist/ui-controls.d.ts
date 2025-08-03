/**
 * AWE Player - Enhanced UI Controls Module (Phase 17)
 * Part of AWE Player EMU8000 Emulator
 *
 * Enhanced DOM interface with MIDI input, effects control, and real-time feedback
 * Integrates with complete EMU8000 send/return effects system
 */
import { AudioWorkletManager } from './audio-worklet-manager.js';
import { EffectsControlPanel } from './effects-control-panel.js';
/**
 * Enhanced UI Control Manager - Complete EMU8000 interface
 * Includes MIDI device management, effects control, and real-time feedback
 */
export declare class UIControlManager {
    private logger;
    private wasmModule;
    private audioContext;
    private audioWorkletManager;
    private effectsControlPanel;
    private midiAccess;
    private connectedMidiDevices;
    private midiStatus;
    private reverbSendSlider;
    private chorusSendSlider;
    private reverbReturnSlider;
    private chorusReturnSlider;
    private masterReverbSlider;
    private masterChorusSlider;
    private voiceActivityContainer;
    private voiceMeters;
    private voiceUpdateInterval;
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
     * Initialize enhanced UI elements (MIDI, effects, voice activity)
     */
    private initializeEnhancedElements;
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
     * Set the effects control panel reference
     */
    setEffectsControlPanel(panel: EffectsControlPanel): void;
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
    /**
     * Initialize MIDI device detection and management
     */
    private initializeMIDI;
    /**
     * Scan for connected MIDI devices
     */
    private scanMIDIDevices;
    /**
     * Connect a MIDI input device
     */
    private connectMIDIDevice;
    /**
     * Handle MIDI device state changes
     */
    private handleMIDIStateChange;
    /**
     * Handle incoming MIDI messages
     */
    private handleMIDIMessage;
    /**
     * Initialize effects control sliders
     */
    private initializeEffectsControls;
    /**
     * Handle reverb send level changes (MIDI CC 91)
     */
    private handleReverbSendChange;
    /**
     * Handle chorus send level changes (MIDI CC 93)
     */
    private handleChorusSendChange;
    /**
     * Handle reverb return level changes
     */
    private handleReverbReturnChange;
    /**
     * Handle chorus return level changes
     */
    private handleChorusReturnChange;
    /**
     * Handle master reverb level changes
     */
    private handleMasterReverbChange;
    /**
     * Handle master chorus level changes
     */
    private handleMasterChorusChange;
    /**
     * Initialize voice activity display
     */
    private initializeVoiceActivityDisplay;
    /**
     * Start periodic voice activity updates
     */
    private startVoiceActivityUpdates;
    /**
     * Update voice activity display
     */
    private updateVoiceActivity;
    /**
     * Update MIDI status display
     */
    private updateMIDIStatus;
    /**
     * Enhanced initialization including MIDI and effects
     */
    initializeEnhanced(): Promise<void>;
    /**
     * Cleanup enhanced features
     */
    cleanup(): void;
}
//# sourceMappingURL=ui-controls.d.ts.map