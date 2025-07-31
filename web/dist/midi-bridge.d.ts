/**
 * TypeScript↔WASM Bridge for MIDI Events with Sample-Accurate Timing
 *
 * Provides clean interface between web MIDI sources and WASM audio processing.
 * Handles timestamp conversion and event queuing with zero audio thread blocking.
 */
export interface WasmMidiInterface {
    queue_midi_event(event: WasmMidiEvent): void;
    process_midi_events(current_sample_time: bigint): number;
}
export interface WasmMidiEvent {
    timestamp: bigint;
    channel: number;
    message_type: number;
    data1: number;
    data2: number;
}
export declare class MidiBridge {
    private wasmInterface;
    private sampleRate;
    private audioContext;
    private startTime;
    constructor();
    /**
     * Initialize the bridge with WASM interface and audio context
     */
    initialize(wasmInterface: WasmMidiInterface, audioContext: AudioContext): void;
    /**
     * Send MIDI event to WASM with sample-accurate timing
     * Called from virtual keyboard, hardware MIDI, or file playback
     */
    sendMidiEvent(channel: number, messageType: number, data1: number, data2: number, timestampMs?: number): void;
    /**
     * Convenience methods for common MIDI messages
     */
    sendNoteOn(channel: number, note: number, velocity: number): void;
    sendNoteOff(channel: number, note: number, velocity?: number): void;
    sendControlChange(channel: number, controller: number, value: number): void;
    sendProgramChange(channel: number, program: number): void;
    sendPitchBend(channel: number, value: number): void;
    /**
     * Get current sample time for external timing coordination
     */
    getCurrentSampleTime(): bigint;
    /**
     * Reset timing base (called when audio starts/stops)
     */
    resetTiming(): void;
    /**
     * Debug logging that goes to our debug textarea
     * (NOT browser console - per CLAUDE.md requirements)
     */
    private logDebug;
}
export declare const midiBridge: MidiBridge;
//# sourceMappingURL=midi-bridge.d.ts.map