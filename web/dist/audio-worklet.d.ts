/**
 * AWE Player - Simplified AudioWorkletProcessor for Phase 8C
 *
 * Simplified processor that bridges Web Audio API to Rust WASM synthesis engine
 * All audio logic, buffer management, and MIDI handling now in Rust
 */
/**
 * MIDI Event interface for AudioWorklet communication
 */
interface MidiEventMessage {
    type: 'midi';
    timestamp: number;
    channel: number;
    messageType: number;
    data1: number;
    data2: number;
}
/**
 * Control message interface for AudioWorklet communication
 */
interface ControlMessage {
    type: 'control';
    command: 'reset' | 'getStats' | 'initSystems';
    sampleRate?: number;
}
/**
 * AudioWorklet message types
 */
type WorkletMessage = MidiEventMessage | ControlMessage;
export type { WorkletMessage, MidiEventMessage, ControlMessage };
//# sourceMappingURL=audio-worklet.d.ts.map