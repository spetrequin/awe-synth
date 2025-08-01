/**
 * AWE Player - Simplified AudioWorkletProcessor for Phase 8C
 *
 * Simplified processor that bridges Web Audio API to Rust WASM synthesis engine
 * All audio logic, buffer management, and MIDI handling now in Rust
 */
/// <reference path="./types/audio-worklet.d.ts" />
/**
 * Simplified AWE Player AudioWorkletProcessor
 *
 * Pure bridge to Rust WASM - no TypeScript audio logic
 */
class AwePlayerProcessor extends AudioWorkletProcessor {
    wasmModule = null;
    isInitialized = false;
    currentSampleTime = 0;
    constructor() {
        super();
        // Listen for messages from main thread
        this.port.onmessage = this.handleMessage.bind(this);
        // Initialize WASM asynchronously
        this.initializeWasm();
        // Send initialization status
        this.sendMessage({ type: 'status', status: 'initializing' });
    }
    /**
     * Initialize WASM module in AudioWorklet context
     */
    async initializeWasm() {
        try {
            // Import WASM module dynamically
            this.wasmModule = await import('../wasm-pkg/awe_synth.js');
            // Initialize WASM
            await this.wasmModule.default();
            // Initialize all Rust systems with sample rate
            const sampleRate = globalThis.sampleRate || 44100;
            const initResult = this.wasmModule.init_all_systems(sampleRate);
            if (initResult) {
                this.isInitialized = true;
                this.sendMessage({
                    type: 'status',
                    status: 'ready',
                    sampleRate
                });
                this.debugLog(`AWE Player AudioWorklet initialized - all systems ready at ${sampleRate}Hz`);
            }
            else {
                throw new Error('Failed to initialize Rust audio systems');
            }
        }
        catch (error) {
            this.sendMessage({
                type: 'error',
                error: `WASM initialization failed: ${error}`
            });
            this.debugLog(`WASM initialization error: ${error}`);
        }
    }
    /**
     * Main audio processing callback - pure bridge to Rust
     */
    process(_inputs, outputs, _parameters) {
        // Return early if not initialized
        if (!this.isInitialized || !this.wasmModule) {
            // Fill with silence
            for (const output of outputs) {
                for (const channel of output) {
                    channel.fill(0);
                }
            }
            return true;
        }
        try {
            // Get the first output
            const output = outputs[0];
            if (!output || output.length === 0) {
                return true;
            }
            const firstChannel = output[0];
            if (!firstChannel) {
                return true;
            }
            const outputLength = firstChannel.length;
            // All processing logic is now in Rust - just call WASM functions
            if (output.length === 1) {
                // Mono output
                const audioBuffer = this.wasmModule.process_audio_buffer(outputLength);
                output[0].set(audioBuffer);
            }
            else if (output.length === 2) {
                // Stereo output - Rust handles interleaving/de-interleaving
                const stereoLength = outputLength * 2;
                const interleavedBuffer = this.wasmModule.process_stereo_buffer_global(stereoLength);
                // De-interleave: [L0, R0, L1, R1, ...] → [L0, L1, ...], [R0, R1, ...]
                for (let i = 0; i < outputLength; i++) {
                    output[0][i] = interleavedBuffer[i * 2]; // Left channel
                    output[1][i] = interleavedBuffer[i * 2 + 1]; // Right channel
                }
            }
            else {
                // Multi-channel output - duplicate mono to all channels
                const audioBuffer = this.wasmModule.process_audio_buffer(outputLength);
                for (const channel of output) {
                    channel.set(audioBuffer);
                }
            }
            // Update sample time counter
            this.currentSampleTime += outputLength;
            // Rust handles all performance monitoring and buffer management
            // Periodically send basic stats to main thread (every ~1 second)
            if (this.currentSampleTime % 44100 < outputLength) {
                this.sendMessage({
                    type: 'stats',
                    sampleTime: this.currentSampleTime,
                    bufferSize: outputLength,
                    systemStatus: this.wasmModule.get_system_status()
                });
            }
        }
        catch (error) {
            // Let Rust handle error recording
            this.sendMessage({ type: 'error', error: `Audio processing error: ${error}` });
            // Fill with silence on error
            for (const output of outputs) {
                for (const channel of output) {
                    channel.fill(0);
                }
            }
        }
        return true; // Keep processor alive
    }
    /**
     * Handle messages from main thread
     */
    handleMessage(event) {
        if (!this.isInitialized || !this.wasmModule) {
            this.sendMessage({ type: 'error', error: 'AudioWorklet not initialized' });
            return;
        }
        const message = event.data;
        try {
            switch (message.type) {
                case 'midi':
                    // Queue MIDI event - Rust handles all MIDI logic
                    this.wasmModule.queue_midi_event_global(BigInt(message.timestamp || this.currentSampleTime), message.channel, message.messageType, message.data1, message.data2);
                    break;
                case 'control':
                    this.handleControlMessage(message);
                    break;
                default:
                    this.sendMessage({
                        type: 'error',
                        error: `Unknown message type: ${message.type}`
                    });
            }
        }
        catch (error) {
            this.sendMessage({
                type: 'error',
                error: `Message handling error: ${error}`
            });
        }
    }
    /**
     * Handle control messages from main thread
     */
    handleControlMessage(message) {
        if (!this.wasmModule)
            return;
        switch (message.command) {
            case 'reset':
                // Rust handles all state reset
                this.wasmModule.reset_audio_state_global();
                this.currentSampleTime = 0;
                this.sendMessage({ type: 'status', status: 'reset' });
                this.debugLog('Audio state reset');
                break;
            case 'getStats':
                // All stats come from Rust now
                const stats = {
                    type: 'stats',
                    sampleTime: this.currentSampleTime,
                    systemStatus: this.wasmModule.get_system_status(),
                    debugLog: this.wasmModule.get_debug_log_global()
                };
                this.sendMessage(stats);
                break;
            case 'initSystems':
                // Re-initialize systems if needed
                if (message.sampleRate) {
                    const initResult = this.wasmModule.init_all_systems(message.sampleRate);
                    this.sendMessage({
                        type: 'status',
                        status: initResult ? 'reinitialized' : 'init_failed',
                        sampleRate: message.sampleRate
                    });
                }
                break;
        }
    }
    /**
     * Send message to main thread
     */
    sendMessage(message) {
        try {
            this.port.postMessage(message);
        }
        catch (error) {
            // If main thread communication fails, we can't do much
            console.error('Failed to send message to main thread:', error);
        }
    }
    /**
     * Debug logging with rate limiting
     */
    debugLog(message) {
        this.sendMessage({
            type: 'debug',
            message: `[AudioWorklet] ${message}`
        });
    }
    /**
     * No AudioParams needed
     */
    static get parameterDescriptors() {
        return [];
    }
}
// Register the AudioWorkletProcessor
registerProcessor('awe-player-processor', AwePlayerProcessor);
export {};
//# sourceMappingURL=audio-worklet.js.map