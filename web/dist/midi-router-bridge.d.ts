/**
 * MIDI Router Bridge - Connect MIDI router to WASM MidiPlayer
 *
 * Bridges TypeScript MIDI router to WASM synthesis engine.
 * Handles event format conversion and timing synchronization.
 */
import { MidiSource } from './midi-router.js';
interface WasmMidiEvent {
    new (timestamp: number, channel: number, messageType: number, data1: number, data2: number): WasmMidiEvent;
}
interface WasmMidiPlayer {
    queue_midi_event(event: WasmMidiEvent): void;
    process_midi_events(currentSampleTime: number): number;
    advance_time(samples: number): void;
}
/**
 * Bridge configuration
 */
export interface RouterBridgeConfig {
    /** How often to process MIDI events (milliseconds) */
    processingInterval: number;
    /** Sample rate for timing calculations */
    sampleRate: number;
    /** Enable debug logging */
    debugLogging: boolean;
}
/**
 * MIDI Router Bridge - connects MIDI router to WASM synthesis
 */
export declare class MidiRouterBridge {
    private router;
    private wasmPlayer?;
    private wasmMidiEvent?;
    private config;
    private processingTimer?;
    private lastProcessTime;
    private currentSampleTime;
    constructor(config?: Partial<RouterBridgeConfig>);
    /**
     * Connect to WASM MidiPlayer instance
     */
    connectWasm(wasmPlayer: WasmMidiPlayer, wasmMidiEvent: WasmMidiEvent): void;
    /**
     * Disconnect from WASM
     */
    disconnectWasm(): void;
    /**
     * Register a MIDI input source
     */
    registerSource(source: any): void;
    /**
     * Unregister a MIDI input source
     */
    unregisterSource(source: MidiSource): void;
    /**
     * Enable/disable a source
     */
    setSourceEnabled(source: MidiSource, enabled: boolean): void;
    /**
     * Queue a MIDI event for processing
     */
    queueEvent(event: any): void;
    /**
     * Get router statistics
     */
    getStats(): any;
    /**
     * Clear all queued events
     */
    clearQueue(): void;
    /**
     * Start the processing loop
     */
    private startProcessing;
    /**
     * Stop the processing loop
     */
    private stopProcessing;
    /**
     * Process queued events and advance time
     */
    private processEvents;
    /**
     * Handle output from MIDI router
     */
    private handleRouterOutput;
    /**
     * Get human-readable MIDI event description
     */
    private getMidiEventDescription;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=midi-router-bridge.d.ts.map