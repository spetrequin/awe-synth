/**
 * AWE Player - AudioWorkletProcessor Implementation
 * Part of AWE Player EMU8000 Emulator
 *
 * AudioWorkletProcessor that bridges Web Audio API to WASM synthesis engine
 * Provides real-time audio processing with minimal latency
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
    command: 'reset' | 'setBufferSize' | 'getStats' | 'setAdaptive' | 'getBufferMetrics';
    value?: number;
    enabled?: boolean;
}
/**
 * AudioWorklet message types
 */
type WorkletMessage = MidiEventMessage | ControlMessage;
export type { WorkletMessage, MidiEventMessage, ControlMessage };
//# sourceMappingURL=audio-worklet.d.ts.map