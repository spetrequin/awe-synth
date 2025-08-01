/**
 * MIDI Router - Unified MIDI Event Routing System
 *
 * Central hub for collecting MIDI events from multiple sources and routing them
 * to the WASM synthesis engine with proper prioritization and timing.
 */
/**
 * MIDI event sources for routing prioritization
 */
export declare enum MidiSource {
    VirtualKeyboard = "virtual-keyboard",
    HardwareInput = "hardware-input",
    FilePlayback = "file-playbook",
    Test = "test"
}
/**
 * Priority levels for MIDI source routing
 * Higher numbers = higher priority
 */
export declare const MIDI_SOURCE_PRIORITY: Record<MidiSource, number>;
/**
 * Raw MIDI event from any source
 */
export interface RawMidiEvent {
    /** Timestamp in milliseconds (performance.now()) */
    timestamp: number;
    /** Source that generated this event */
    source: MidiSource;
    /** MIDI channel (0-15) */
    channel: number;
    /** MIDI message type (0x80-0xFF) */
    messageType: number;
    /** First data byte */
    data1: number;
    /** Second data byte */
    data2: number;
    /** Optional velocity override (for sources that calculate velocity) */
    velocity?: number;
}
/**
 * Processed MIDI event ready for WASM
 */
export interface ProcessedMidiEvent {
    /** Sample-accurate timestamp for WASM */
    sampleTimestamp: number;
    /** Source information (for debugging) */
    source: MidiSource;
    /** MIDI channel (0-15) */
    channel: number;
    /** MIDI message type */
    messageType: number;
    /** First data byte */
    data1: number;
    /** Second data byte */
    data2: number;
}
/**
 * MIDI input source registration
 */
export interface MidiInputSource {
    /** Unique source identifier */
    source: MidiSource;
    /** Human-readable name for debugging */
    name: string;
    /** Whether this source is currently active */
    enabled: boolean;
    /** Callback to process events from this source */
    onEvent?: (event: RawMidiEvent) => void;
}
/**
 * MIDI router statistics for monitoring
 */
export interface MidiRouterStats {
    /** Total events processed */
    totalEvents: number;
    /** Events processed per source */
    eventsBySource: Record<MidiSource, number>;
    /** Events dropped due to queue overflow */
    droppedEvents: number;
    /** Current queue length */
    currentQueueLength: number;
    /** Average processing latency in milliseconds */
    averageLatency: number;
}
/**
 * MIDI router configuration
 */
export interface MidiRouterConfig {
    /** Maximum queue size before dropping events */
    maxQueueSize: number;
    /** Sample rate for timestamp conversion */
    sampleRate: number;
    /** Base timestamp offset for synchronization */
    baseTimestamp: number;
    /** Enable debug logging */
    debugLogging: boolean;
}
/**
 * Unified MIDI Event Router
 *
 * Collects MIDI events from multiple sources, applies prioritization,
 * handles timing synchronization, and routes to WASM synthesis engine.
 */
export declare class MidiRouter {
    private config;
    private sources;
    private eventQueue;
    private outputCallback?;
    private stats;
    private latencyHistory;
    private isProcessing;
    constructor(config?: Partial<MidiRouterConfig>);
    /**
     * Register a MIDI input source
     */
    registerSource(sourceConfig: MidiInputSource): void;
    /**
     * Unregister a MIDI input source
     */
    unregisterSource(source: MidiSource): void;
    /**
     * Enable or disable a MIDI input source
     */
    setSourceEnabled(source: MidiSource, enabled: boolean): void;
    /**
     * Check if a source is registered and enabled
     */
    isSourceEnabled(source: MidiSource): boolean;
    /**
     * Set output callback for processed events
     */
    setOutputCallback(callback: (events: ProcessedMidiEvent[]) => void): void;
    /**
     * Queue a MIDI event from a source
     */
    queueEvent(event: RawMidiEvent): void;
    /**
     * Process queued events and send to output
     */
    processEvents(): ProcessedMidiEvent[];
    /**
     * Get current router statistics
     */
    getStats(): MidiRouterStats;
    /**
     * Reset router statistics
     */
    resetStats(): void;
    /**
     * Clear all queued events
     */
    clearQueue(): void;
    /**
     * Get list of registered sources
     */
    getSources(): MidiInputSource[];
    /**
     * Handle event from a registered source
     */
    private handleSourceEvent;
    /**
     * Drop the lowest priority event from the queue
     */
    private dropLowPriorityEvent;
    /**
     * Convert raw MIDI event to processed event
     */
    private processRawEvent;
    /**
     * Update latency statistics
     */
    private updateLatencyStats;
    /**
     * Get human-readable description of MIDI event
     */
    private getMidiEventDescription;
    /**
     * Clean up resources
     */
    destroy(): void;
}
//# sourceMappingURL=midi-router.d.ts.map