/**
 * AWE Player - Real-Time Voice Activity Monitor (Phase 17.6)
 *
 * Visualizes EMU8000 32-voice polyphonic synthesis activity
 * Shows voice allocation, note information, and effects send levels
 */
export interface VoiceState {
    active: boolean;
    note: number;
    velocity: number;
    channel: number;
    phase: 'attack' | 'decay' | 'sustain' | 'release' | 'off';
    amplitude: number;
    reverbSend: number;
    chorusSend: number;
}
/**
 * Voice Activity Monitor
 * Real-time visualization of 32 EMU8000 voices
 */
export declare class VoiceActivityMonitor {
    private logger;
    private wasmModule;
    private container;
    private voiceElements;
    private updateInterval;
    private voiceStates;
    private readonly VOICE_COUNT;
    private readonly UPDATE_RATE_MS;
    constructor(wasmModule: any);
    /**
     * Initialize the voice activity monitor
     */
    initialize(): void;
    /**
     * Create visualization elements for each voice
     */
    private createVoiceElements;
    /**
     * Start monitoring voice activity
     */
    private startMonitoring;
    /**
     * Update voice activity display
     */
    private updateVoiceActivity;
    /**
     * Update voice states from WASM debug log
     */
    private updateFromDebugLog;
    /**
     * Update from real WASM voice states (future)
     */
    private updateFromWASMStates;
    /**
     * Render voice states to UI
     */
    private renderVoiceStates;
    /**
     * Get note display string
     */
    private getNoteDisplay;
    /**
     * Setup MIDI event listener for immediate updates
     */
    private setupMIDIEventListener;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Get current active voice count
     */
    getActiveVoiceCount(): number;
}
//# sourceMappingURL=voice-activity-monitor.d.ts.map