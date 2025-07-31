/**
 * MIDI Sequencer Bridge
 * Connects TypeScript PlaybackControls to Rust WASM MidiPlayer
 */
export declare class MidiSequencerBridge {
    private wasmPlayer?;
    private playbackControls;
    private fileLoader;
    private updateTimer?;
    private isInitialized;
    constructor();
    /**
     * Initialize the bridge with WASM module
     */
    initialize(wasmModule: any): Promise<boolean>;
    /**
     * Create UI elements and attach to container
     */
    createUI(container: HTMLElement): void;
    /**
     * Set up event handlers
     */
    private setupEventHandlers;
    /**
     * Handle file loaded from file loader
     */
    private handleFileLoaded;
    /**
     * Handle play button press
     */
    private handlePlay;
    /**
     * Handle pause button press
     */
    private handlePause;
    /**
     * Handle stop button press
     */
    private handleStop;
    /**
     * Handle seek slider change
     */
    private handleSeek;
    /**
     * Handle tempo change
     */
    private handleTempoChange;
    /**
     * Handle playback state changes (for logging)
     */
    private handleStateChange;
    /**
     * Start the update loop to sync UI with WASM state
     */
    private startUpdateLoop;
    /**
     * Update UI from WASM state
     */
    private updateFromWasm;
    /**
     * Get debug information from WASM
     */
    getDebugLog(): string;
    /**
     * Clean up resources
     */
    destroy(): void;
}
//# sourceMappingURL=midi-sequencer-bridge.d.ts.map