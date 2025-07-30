/**
 * TypeScript↔WASM Bridge for MIDI Events with Sample-Accurate Timing
 * 
 * Provides clean interface between web MIDI sources and WASM audio processing.
 * Handles timestamp conversion and event queuing with zero audio thread blocking.
 */

import { VELOCITY_CONSTANTS } from './velocity-curves.js';

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

export class MidiBridge {
    private wasmInterface: WasmMidiInterface | null = null;
    private sampleRate: number = 44100;
    private audioContext: AudioContext | null = null;
    private startTime: number = 0;

    constructor() {
        // Initialize will be called when WASM and AudioContext are ready
    }

    /**
     * Initialize the bridge with WASM interface and audio context
     */
    initialize(wasmInterface: WasmMidiInterface, audioContext: AudioContext): void {
        this.wasmInterface = wasmInterface;
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;
        this.startTime = audioContext.currentTime;
        
        this.logDebug(`MIDI Bridge initialized - Sample rate: ${this.sampleRate}Hz`);
    }

    /**
     * Send MIDI event to WASM with sample-accurate timing
     * Called from virtual keyboard, hardware MIDI, or file playback
     */
    sendMidiEvent(
        channel: number,
        messageType: number,
        data1: number,
        data2: number,
        timestampMs?: number
    ): void {
        if (!this.wasmInterface || !this.audioContext) {
            this.logDebug('ERROR: MIDI Bridge not initialized');
            return;
        }

        // Calculate sample-accurate timestamp
        const currentTime = timestampMs ?? this.audioContext.currentTime;
        const sampleTime = Math.round((currentTime - this.startTime) * this.sampleRate);

        // Create WASM-compatible event
        const event: WasmMidiEvent = {
            timestamp: BigInt(sampleTime),
            channel: Math.max(0, Math.min(15, channel)),
            message_type: Math.max(0, Math.min(255, messageType)),
            data1: Math.max(0, Math.min(127, data1)),
            data2: Math.max(0, Math.min(127, data2))
        };

        // Queue to WASM (non-blocking)
        this.wasmInterface.queue_midi_event(event);
        
        this.logDebug(
            `MIDI event queued: ch=${event.channel} type=${event.message_type} ` +
            `data=${event.data1},${event.data2} @sample=${event.timestamp}`
        );
    }

    /**
     * Convenience methods for common MIDI messages
     */
    sendNoteOn(channel: number, note: number, velocity: number): void {
        this.sendMidiEvent(channel, 0x90, note, velocity);
    }

    sendNoteOff(channel: number, note: number, velocity: number = VELOCITY_CONSTANTS.DEFAULT): void {
        this.sendMidiEvent(channel, 0x80, note, velocity);
    }

    sendControlChange(channel: number, controller: number, value: number): void {
        this.sendMidiEvent(channel, 0xB0, controller, value);
    }

    sendProgramChange(channel: number, program: number): void {
        this.sendMidiEvent(channel, 0xC0, program, 0);
    }

    sendPitchBend(channel: number, value: number): void {
        // Convert 14-bit pitch bend to two 7-bit values
        const clampedValue = Math.max(-8192, Math.min(8191, value));
        const unsignedValue = clampedValue + 8192; // 0-16383
        const lsb = unsignedValue & 0x7F;
        const msb = (unsignedValue >> 7) & 0x7F;
        this.sendMidiEvent(channel, 0xE0, lsb, msb);
    }

    /**
     * Get current sample time for external timing coordination
     */
    getCurrentSampleTime(): bigint {
        if (!this.audioContext) return BigInt(0);
        
        const currentTime = this.audioContext.currentTime;
        const sampleTime = Math.round((currentTime - this.startTime) * this.sampleRate);
        return BigInt(sampleTime);
    }

    /**
     * Reset timing base (called when audio starts/stops)
     */
    resetTiming(): void {
        if (this.audioContext) {
            this.startTime = this.audioContext.currentTime;
            this.logDebug('MIDI Bridge timing reset');
        }
    }

    /**
     * Debug logging that goes to our debug textarea
     * (NOT browser console - per CLAUDE.md requirements)
     */
    private logDebug(message: string): void {
        const debugLog = document.getElementById('debug-log') as HTMLTextAreaElement;
        if (debugLog) {
            debugLog.value += `[MIDI Bridge] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}

// Global instance for easy access
export const midiBridge = new MidiBridge();