/**
 * AWE Player - AudioWorklet Manager (Simplified Browser API Bridge)
 * Part of AWE Player EMU8000 Emulator
 *
 * Pure browser API bridge for AudioWorklet lifecycle management
 * Audio logic moved to Rust for better performance and centralization
 */
import type { WorkletMessage } from './audio-worklet.js';
/**
 * AudioWorklet status types
 */
type WorkletStatus = 'initializing' | 'ready' | 'error' | 'reset' | 'bufferSizeChanged' | 'adaptiveModeChanged';
/**
 * AudioWorklet Manager - Pure browser API bridge for AudioWorklet lifecycle
 * All audio logic moved to Rust - this only handles browser API communication
 */
export declare class AudioWorkletManager {
    private audioContext;
    private audioWorkletNode;
    private logger;
    private isInitialized;
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
     * Send raw message to AudioWorklet (for direct browser API communication)
     */
    sendMessage(message: WorkletMessage): void;
    /**
     * Send control command to AudioWorklet
     */
    sendControlCommand(command: string, value?: any): void;
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
     * Handle messages from AudioWorklet (simplified - just logging and status updates)
     */
    private handleWorkletMessage;
    /**
     * Handle status messages from AudioWorklet (simplified)
     */
    private handleStatusMessage;
}
/**
 * Utility function to check AudioWorklet compatibility
 */
export declare function isAudioWorkletSupported(): boolean;
export {};
//# sourceMappingURL=audio-worklet-manager.d.ts.map