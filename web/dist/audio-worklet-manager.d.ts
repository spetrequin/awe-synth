/**
 * AWE Player - AudioWorklet Manager
 * Part of AWE Player EMU8000 Emulator
 *
 * Manages AudioWorklet lifecycle from the main thread
 * Handles setup, communication, and cleanup of the AudioWorklet processor
 */
/**
 * AudioWorklet status types
 */
type WorkletStatus = 'initializing' | 'ready' | 'error' | 'reset' | 'bufferSizeChanged' | 'adaptiveModeChanged';
/**
 * AudioWorklet Manager - handles all AudioWorklet communication from main thread
 */
export declare class AudioWorkletManager {
    private audioContext;
    private audioWorkletNode;
    private logger;
    private isInitialized;
    private currentSampleTime;
    private onStatusChange?;
    private onError?;
    constructor();
    /**
     * Initialize AudioWorklet with the given AudioContext
     */
    initialize(audioContext: AudioContext): Promise<boolean>;
    /**
     * Set status change callback
     */
    setStatusChangeCallback(callback: (status: WorkletStatus) => void): void;
    /**
     * Set error callback
     */
    setErrorCallback(callback: (error: string) => void): void;
    /**
     * Send MIDI event to AudioWorklet
     */
    sendMidiEvent(channel: number, messageType: number, data1: number, data2: number, timestamp?: number): void;
    /**
     * Send Note On event
     */
    noteOn(channel: number, note: number, velocity: number): void;
    /**
     * Send Note Off event
     */
    noteOff(channel: number, note: number): void;
    /**
     * Send Control Change event
     */
    controlChange(channel: number, controller: number, value: number): void;
    /**
     * Send Program Change event
     */
    programChange(channel: number, program: number): void;
    /**
     * Reset audio state (stop all voices, clear events)
     */
    resetAudio(): void;
    /**
     * Set buffer size (128, 256, or 512)
     */
    setBufferSize(size: 128 | 256 | 512): void;
    /**
     * Set adaptive buffer sizing mode
     */
    setAdaptiveMode(enabled: boolean): void;
    /**
     * Get optimal buffer size for target latency
     */
    getOptimalBufferSize(targetLatencyMs: number): 128 | 256 | 512;
    /**
     * Get buffer metrics from AudioWorklet
     */
    getBufferMetrics(): void;
    /**
     * Get current statistics from AudioWorklet
     */
    getStats(): void;
    /**
     * Check if AudioWorklet is ready
     */
    isReady(): boolean;
    /**
     * Get the underlying AudioWorkletNode (for advanced usage)
     */
    getAudioNode(): AudioWorkletNode | null;
    /**
     * Disconnect and cleanup AudioWorklet
     */
    cleanup(): void;
    /**
     * Handle messages from AudioWorklet
     */
    private handleWorkletMessage;
    /**
     * Handle status messages from AudioWorklet
     */
    private handleStatusMessage;
    /**
     * Handle statistics messages from AudioWorklet
     */
    private handleStatsMessage;
    /**
     * Handle buffer metrics messages from AudioWorklet
     */
    private handleBufferMetricsMessage;
}
/**
 * Utility function to check AudioWorklet compatibility
 */
export declare function isAudioWorkletSupported(): boolean;
/**
 * Utility function to get optimal buffer size based on sample rate and target latency
 */
export declare function getOptimalBufferSize(sampleRate: number, targetLatencyMs: number): 128 | 256 | 512;
export {};
//# sourceMappingURL=audio-worklet-manager.d.ts.map