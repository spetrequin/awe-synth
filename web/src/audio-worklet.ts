/**
 * AWE Player - AudioWorkletProcessor Implementation
 * Part of AWE Player EMU8000 Emulator
 * 
 * AudioWorkletProcessor that bridges Web Audio API to WASM synthesis engine
 * Provides real-time audio processing with minimal latency
 */

/// <reference path="./types/audio-worklet.d.ts" />

// Import WASM module types for TypeScript
import type * as WasmModule from '../wasm-pkg/awe_synth.js';
import { AudioBufferManager, type BufferMetrics } from './audio-buffer-manager.js';

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

/**
 * AWE Player AudioWorkletProcessor
 * 
 * This processor runs in the AudioWorklet context (separate thread)
 * and provides real-time audio synthesis using the WASM engine
 */
class AwePlayerProcessor extends AudioWorkletProcessor {
    private wasmModule: typeof WasmModule | null = null;
    private isInitialized = false;
    private currentSampleTime = 0;
    private bufferManager: AudioBufferManager;
    private debugMessageCount = 0;
    private processingStartTime = 0;

    constructor() {
        super();
        
        // Initialize buffer manager
        this.bufferManager = new AudioBufferManager();
        
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
    private async initializeWasm(): Promise<void> {
        try {
            // Import WASM module dynamically
            this.wasmModule = await import('../wasm-pkg/awe_synth.js');
            
            // Initialize WASM
            await this.wasmModule.default();
            
            // Initialize the global AudioWorklet bridge
            const sampleRate = (globalThis as any).sampleRate || 44100;
            const initResult = this.wasmModule.init_audio_worklet(sampleRate);
            
            if (initResult) {
                // Configure buffer manager with sample rate
                this.bufferManager.setSampleRate(sampleRate);
                
                this.isInitialized = true;
                this.sendMessage({ 
                    type: 'status', 
                    status: 'ready', 
                    sampleRate,
                    bufferSize: this.bufferManager.getCurrentBufferSize(),
                    latencyMs: this.bufferManager.getCurrentLatencyMs()
                });
                this.debugLog(`AWE Player AudioWorklet initialized at ${sampleRate}Hz with ${this.bufferManager.getCurrentBufferSize()} sample buffer`);
            } else {
                throw new Error('Failed to initialize WASM AudioWorklet bridge');
            }
            
        } catch (error) {
            this.sendMessage({ 
                type: 'error', 
                error: `WASM initialization failed: ${error}` 
            });
            this.debugLog(`WASM initialization error: ${error}`);
        }
    }

    /**
     * Main audio processing callback - called by Web Audio API
     * This runs on the audio thread and must be extremely efficient
     */
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
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
            // Start timing for buffer management
            this.processingStartTime = performance.now();
            
            // Get the first output (we assume mono or stereo)
            const output = outputs[0];
            if (!output || output.length === 0) {
                return true;
            }

            const firstChannel = output[0];
            if (!firstChannel) {
                return true;
            }

            const outputLength = firstChannel.length;
            
            // Update WASM buffer size if needed
            const currentBufferSize = this.bufferManager.getCurrentBufferSize();
            if (outputLength !== currentBufferSize) {
                this.wasmModule.set_buffer_size_global(outputLength);
            }

            // Process audio based on channel configuration
            if (output.length === 1) {
                // Mono output
                const audioBuffer = this.wasmModule.process_audio_buffer(outputLength);
                output[0]!.set(audioBuffer);
                
            } else if (output.length === 2) {
                // Stereo output - use interleaved processing
                const stereoLength = outputLength * 2;
                const interleavedBuffer = this.wasmModule.process_stereo_buffer_global(stereoLength);
                
                // De-interleave: [L0, R0, L1, R1, ...] → [L0, L1, ...], [R0, R1, ...]
                for (let i = 0; i < outputLength; i++) {
                    output[0]![i] = interleavedBuffer[i * 2]!;     // Left channel
                    output[1]![i] = interleavedBuffer[i * 2 + 1]!; // Right channel
                }
                
            } else {
                // Multi-channel output (>2 channels) - duplicate mono to all channels
                const audioBuffer = this.wasmModule.process_audio_buffer(outputLength);
                for (const channel of output) {
                    channel.set(audioBuffer);
                }
            }

            // Update sample time counter
            this.currentSampleTime += outputLength;
            
            // Record processing time for buffer management
            const processingTime = performance.now() - this.processingStartTime;
            this.bufferManager.recordProcessingTime(processingTime, outputLength);
            
            // Periodically send stats to main thread (every ~1 second)
            if (this.currentSampleTime % 44100 < outputLength) {
                const bufferMetrics = this.bufferManager.getMetrics();
                this.sendMessage({
                    type: 'stats',
                    sampleTime: this.currentSampleTime,
                    bufferSize: outputLength,
                    sampleRate: this.wasmModule.get_sample_rate(),
                    bufferMetrics,
                    bufferConfig: this.bufferManager.getCurrentConfig()
                });
            }

        } catch (error) {
            // Record processing error and fill with silence
            this.bufferManager.recordUnderrun();
            this.sendMessage({ type: 'error', error: `Audio processing error: ${error}` });
            
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
    private handleMessage(event: MessageEvent<WorkletMessage>): void {
        if (!this.isInitialized || !this.wasmModule) {
            this.sendMessage({ type: 'error', error: 'AudioWorklet not initialized' });
            return;
        }

        const message = event.data;

        try {
            switch (message.type) {
                case 'midi':
                    // Queue MIDI event with current sample time
                    this.wasmModule.queue_midi_event_global(
                        BigInt(message.timestamp || this.currentSampleTime),
                        message.channel,
                        message.messageType,
                        message.data1,
                        message.data2
                    );
                    break;

                case 'control':
                    this.handleControlMessage(message);
                    break;

                default:
                    this.sendMessage({ 
                        type: 'error', 
                        error: `Unknown message type: ${(message as any).type}` 
                    });
            }
        } catch (error) {
            this.sendMessage({ 
                type: 'error', 
                error: `Message handling error: ${error}` 
            });
        }
    }

    /**
     * Handle control messages from main thread
     */
    private handleControlMessage(message: ControlMessage): void {
        if (!this.wasmModule) return;

        switch (message.command) {
            case 'reset':
                this.wasmModule.reset_audio_state_global();
                this.currentSampleTime = 0;
                this.sendMessage({ type: 'status', status: 'reset' });
                this.debugLog('Audio state reset');
                break;

            case 'setBufferSize':
                if (message.value && [128, 256, 512].includes(message.value)) {
                    this.bufferManager.setBufferSize(message.value as 128 | 256 | 512);
                    this.wasmModule.set_buffer_size_global(message.value);
                    this.sendMessage({ 
                        type: 'status', 
                        status: 'bufferSizeChanged', 
                        bufferSize: message.value,
                        latencyMs: this.bufferManager.getCurrentLatencyMs()
                    });
                    this.debugLog(`Buffer size changed to ${message.value} (${this.bufferManager.getCurrentLatencyMs().toFixed(1)}ms)`);
                }
                break;

            case 'setAdaptive':
                if (typeof message.enabled === 'boolean') {
                    this.bufferManager.setAdaptiveMode(message.enabled);
                    this.sendMessage({
                        type: 'status',
                        status: 'adaptiveModeChanged',
                        adaptiveMode: message.enabled
                    });
                    this.debugLog(`Adaptive buffer mode: ${message.enabled ? 'ENABLED' : 'DISABLED'}`);
                }
                break;

            case 'getBufferMetrics':
                const metrics = this.bufferManager.getMetrics();
                const config = this.bufferManager.getCurrentConfig();
                this.sendMessage({
                    type: 'bufferMetrics',
                    metrics,
                    config,
                    statusSummary: this.bufferManager.getStatusSummary()
                });
                break;

            case 'getStats':
                const bufferMetrics = this.bufferManager.getMetrics();
                const stats = {
                    type: 'stats',
                    sampleTime: this.currentSampleTime,
                    bufferSize: this.bufferManager.getCurrentBufferSize(),
                    sampleRate: this.wasmModule.get_sample_rate(),
                    debugLog: this.wasmModule.get_debug_log_global(),
                    bufferMetrics,
                    bufferConfig: this.bufferManager.getCurrentConfig()
                };
                this.sendMessage(stats);
                break;
        }
    }

    /**
     * Send message to main thread
     */
    private sendMessage(message: any): void {
        try {
            this.port.postMessage(message);
        } catch (error) {
            // If main thread communication fails, we can't do much
            console.error('Failed to send message to main thread:', error);
        }
    }

    /**
     * Debug logging with rate limiting
     */
    private debugLog(message: string): void {
        // Limit debug messages to prevent overwhelming the main thread
        this.debugMessageCount++;
        if (this.debugMessageCount % 100 === 0 || this.debugMessageCount < 10) {
            this.sendMessage({ 
                type: 'debug', 
                message: `[AudioWorklet] ${message}`,
                count: this.debugMessageCount
            });
        }
    }

    /**
     * Cleanup when processor is destroyed
     */
    static get parameterDescriptors() {
        return []; // No AudioParams needed for this processor
    }
}

// Register the AudioWorkletProcessor
registerProcessor('awe-player-processor', AwePlayerProcessor);

// Export types for main thread usage
export type { WorkletMessage, MidiEventMessage, ControlMessage };