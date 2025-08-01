/**
 * AWE Player - AudioWorklet Manager (Simplified Browser API Bridge)
 * Part of AWE Player EMU8000 Emulator
 *
 * Pure browser API bridge for AudioWorklet lifecycle management
 * Audio logic moved to Rust for better performance and centralization
 */
import { DebugLogger } from './utils/debug-logger.js';
/**
 * AudioWorklet Manager - Pure browser API bridge for AudioWorklet lifecycle
 * All audio logic moved to Rust - this only handles browser API communication
 */
export class AudioWorkletManager {
    audioWorkletNode = null;
    logger;
    isInitialized = false;
    onStatusChange;
    onError;
    constructor() {
        this.logger = new DebugLogger({ componentName: 'AudioWorkletManager' });
    }
    /**
     * Initialize AudioWorklet with the given AudioContext
     */
    async initialize(audioContext) {
        try {
            this.logger.log('🎵 Initializing AudioWorklet...');
            // Add the AudioWorklet module
            const workletUrl = new URL('./dist/audio-worklet.js', window.location.href);
            await audioContext.audioWorklet.addModule(workletUrl.href);
            this.logger.log('✅ AudioWorklet module loaded');
            // Create AudioWorkletNode
            this.audioWorkletNode = new AudioWorkletNode(audioContext, 'awe-player-processor', {
                numberOfInputs: 0,
                numberOfOutputs: 1,
                outputChannelCount: [2], // Stereo output
                channelCount: 2,
                channelCountMode: 'explicit',
                channelInterpretation: 'speakers'
            });
            // Set up message handling
            this.audioWorkletNode.port.onmessage = this.handleWorkletMessage.bind(this);
            // Connect to audio context destination
            this.audioWorkletNode.connect(audioContext.destination);
            this.logger.log('✅ AudioWorklet connected to audio destination');
            return true;
        }
        catch (error) {
            this.logger.log('❌ AudioWorklet initialization failed', error);
            this.onError?.(error instanceof Error ? error.message : String(error));
            return false;
        }
    }
    /**
     * Set status change callback
     */
    setStatusChangeCallback(callback) {
        this.onStatusChange = callback;
    }
    /**
     * Set error callback
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }
    /**
     * Send raw message to AudioWorklet (for direct browser API communication)
     */
    sendMessage(message) {
        if (!this.audioWorkletNode || !this.isInitialized) {
            this.logger.log('❌ Cannot send message - AudioWorklet not ready');
            return;
        }
        try {
            this.audioWorkletNode.port.postMessage(message);
            this.logger.log(`📤 Message sent to AudioWorklet: ${message.type}`);
        }
        catch (error) {
            this.logger.log('❌ Failed to send message to AudioWorklet', error);
        }
    }
    /**
     * Send control command to AudioWorklet
     */
    sendControlCommand(command, value) {
        const message = {
            type: 'control',
            command,
            ...(value !== undefined && { value })
        };
        this.sendMessage(message);
    }
    /**
     * Check if AudioWorklet is ready
     */
    isReady() {
        return this.isInitialized && this.audioWorkletNode !== null;
    }
    /**
     * Get the underlying AudioWorkletNode (for advanced usage)
     */
    getAudioNode() {
        return this.audioWorkletNode;
    }
    /**
     * Disconnect and cleanup AudioWorklet
     */
    cleanup() {
        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect();
            this.audioWorkletNode = null;
        }
        this.isInitialized = false;
        this.logger.log('🧹 AudioWorklet cleaned up');
    }
    /**
     * Handle messages from AudioWorklet (simplified - just logging and status updates)
     */
    handleWorkletMessage(event) {
        const message = event.data;
        try {
            switch (message.type) {
                case 'status':
                    this.handleStatusMessage(message);
                    break;
                case 'error':
                    this.logger.log(`❌ AudioWorklet error: ${message.error}`);
                    this.onError?.(message.error);
                    break;
                case 'debug':
                    this.logger.log(`🔍 AudioWorklet: ${message.message}`);
                    break;
                default:
                    // Pass through all other messages to logger
                    this.logger.log(`📨 AudioWorklet message: ${message.type}`);
            }
        }
        catch (error) {
            this.logger.log('❌ Error handling worklet message', error);
        }
    }
    /**
     * Handle status messages from AudioWorklet (simplified)
     */
    handleStatusMessage(message) {
        const status = message.status;
        switch (status) {
            case 'initializing':
                this.logger.log('🔄 AudioWorklet initializing...');
                break;
            case 'ready':
                this.isInitialized = true;
                this.logger.log('✅ AudioWorklet ready');
                break;
            case 'reset':
                this.logger.log('🔄 AudioWorklet reset complete');
                break;
            case 'error':
                this.logger.log(`❌ AudioWorklet error status: ${message.error || 'Unknown error'}`);
                break;
            default:
                this.logger.log(`📊 AudioWorklet status: ${status}`);
                break;
        }
        this.onStatusChange?.(status);
    }
}
/**
 * Utility function to check AudioWorklet compatibility
 */
export function isAudioWorkletSupported() {
    return ('AudioContext' in window &&
        'audioWorklet' in AudioContext.prototype &&
        'addModule' in AudioWorklet.prototype);
}
//# sourceMappingURL=audio-worklet-manager.js.map