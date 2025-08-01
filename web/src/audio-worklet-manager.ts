/**
 * AWE Player - AudioWorklet Manager
 * Part of AWE Player EMU8000 Emulator
 * 
 * Manages AudioWorklet lifecycle from the main thread
 * Handles setup, communication, and cleanup of the AudioWorklet processor
 */

import { DebugLogger } from './utils/debug-logger.js';
import type { WorkletMessage, MidiEventMessage, ControlMessage } from './audio-worklet.js';
import { calculateOptimalBufferSize, bufferSizeToLatency, type BufferMetrics, type BufferConfig } from './audio-buffer-manager.js';

/**
 * AudioWorklet status types
 */
type WorkletStatus = 'initializing' | 'ready' | 'error' | 'reset' | 'bufferSizeChanged' | 'adaptiveModeChanged';

/**
 * AudioWorklet Manager - handles all AudioWorklet communication from main thread
 */
export class AudioWorkletManager {
    private audioContext: AudioContext | null = null;
    private audioWorkletNode: AudioWorkletNode | null = null;
    private logger: DebugLogger;
    private isInitialized = false;
    private currentSampleTime = 0;
    private onStatusChange?: (status: WorkletStatus) => void;
    private onError?: (error: string) => void;

    constructor() {
        this.logger = new DebugLogger({ componentName: 'AudioWorkletManager' });
    }

    /**
     * Initialize AudioWorklet with the given AudioContext
     */
    async initialize(audioContext: AudioContext): Promise<boolean> {
        try {
            this.audioContext = audioContext;
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

        } catch (error) {
            this.logger.log('❌ AudioWorklet initialization failed', error);
            this.onError?.(error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * Set status change callback
     */
    setStatusChangeCallback(callback: (status: WorkletStatus) => void): void {
        this.onStatusChange = callback;
    }

    /**
     * Set error callback
     */
    setErrorCallback(callback: (error: string) => void): void {
        this.onError = callback;
    }

    /**
     * Send MIDI event to AudioWorklet
     */
    sendMidiEvent(channel: number, messageType: number, data1: number, data2: number, timestamp?: number): void {
        if (!this.audioWorkletNode || !this.isInitialized) {
            this.logger.log('❌ Cannot send MIDI event - AudioWorklet not ready');
            return;
        }

        const message: MidiEventMessage = {
            type: 'midi',
            timestamp: timestamp || this.currentSampleTime,
            channel,
            messageType,
            data1,
            data2
        };

        try {
            this.audioWorkletNode.port.postMessage(message);
            this.logger.log(`🎹 MIDI event sent: Ch${channel} Type:0x${messageType.toString(16)} Data:${data1},${data2}`);
        } catch (error) {
            this.logger.log('❌ Failed to send MIDI event', error);
        }
    }

    /**
     * Send Note On event
     */
    noteOn(channel: number, note: number, velocity: number): void {
        this.sendMidiEvent(channel, 0x90, note, velocity);
    }

    /**
     * Send Note Off event
     */
    noteOff(channel: number, note: number): void {
        this.sendMidiEvent(channel, 0x80, note, 0);
    }

    /**
     * Send Control Change event
     */
    controlChange(channel: number, controller: number, value: number): void {
        this.sendMidiEvent(channel, 0xB0, controller, value);
    }

    /**
     * Send Program Change event
     */
    programChange(channel: number, program: number): void {
        this.sendMidiEvent(channel, 0xC0, program, 0);
    }

    /**
     * Reset audio state (stop all voices, clear events)
     */
    resetAudio(): void {
        if (!this.audioWorkletNode) {
            this.logger.log('❌ Cannot reset - AudioWorklet not initialized');
            return;
        }

        const message: ControlMessage = {
            type: 'control',
            command: 'reset'
        };

        this.audioWorkletNode.port.postMessage(message);
        this.logger.log('🔄 Audio reset requested');
    }

    /**
     * Set buffer size (128, 256, or 512)
     */
    setBufferSize(size: 128 | 256 | 512): void {
        if (!this.audioWorkletNode) {
            this.logger.log('❌ Cannot set buffer size - AudioWorklet not initialized');
            return;
        }

        const message: ControlMessage = {
            type: 'control',
            command: 'setBufferSize',
            value: size
        };

        this.audioWorkletNode.port.postMessage(message);
        const latencyMs = bufferSizeToLatency(size, this.audioContext?.sampleRate || 44100);
        this.logger.log(`🔧 Buffer size change requested: ${size} samples (${latencyMs.toFixed(1)}ms latency)`);
    }

    /**
     * Set adaptive buffer sizing mode
     */
    setAdaptiveMode(enabled: boolean): void {
        if (!this.audioWorkletNode) {
            this.logger.log('❌ Cannot set adaptive mode - AudioWorklet not initialized');
            return;
        }

        const message: ControlMessage = {
            type: 'control',
            command: 'setAdaptive',
            enabled
        };

        this.audioWorkletNode.port.postMessage(message);
        this.logger.log(`🤖 Adaptive buffer mode change requested: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Get optimal buffer size for target latency
     */
    getOptimalBufferSize(targetLatencyMs: number): 128 | 256 | 512 {
        const sampleRate = this.audioContext?.sampleRate || 44100;
        return calculateOptimalBufferSize(sampleRate, targetLatencyMs);
    }

    /**
     * Get buffer metrics from AudioWorklet
     */
    getBufferMetrics(): void {
        if (!this.audioWorkletNode) {
            this.logger.log('❌ Cannot get buffer metrics - AudioWorklet not initialized');
            return;
        }

        const message: ControlMessage = {
            type: 'control',
            command: 'getBufferMetrics'
        };

        this.audioWorkletNode.port.postMessage(message);
    }

    /**
     * Get current statistics from AudioWorklet
     */
    getStats(): void {
        if (!this.audioWorkletNode) {
            this.logger.log('❌ Cannot get stats - AudioWorklet not initialized');
            return;
        }

        const message: ControlMessage = {
            type: 'control',
            command: 'getStats'
        };

        this.audioWorkletNode.port.postMessage(message);
    }

    /**
     * Check if AudioWorklet is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.audioWorkletNode !== null;
    }

    /**
     * Get the underlying AudioWorkletNode (for advanced usage)
     */
    getAudioNode(): AudioWorkletNode | null {
        return this.audioWorkletNode;
    }

    /**
     * Disconnect and cleanup AudioWorklet
     */
    cleanup(): void {
        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect();
            this.audioWorkletNode = null;
        }
        this.audioContext = null;
        this.isInitialized = false;
        this.logger.log('🧹 AudioWorklet cleaned up');
    }

    /**
     * Handle messages from AudioWorklet
     */
    private handleWorkletMessage(event: MessageEvent): void {
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

                case 'stats':
                    this.handleStatsMessage(message);
                    break;

                case 'debug':
                    this.logger.log(`🔍 ${message.message} (${message.count})`);
                    break;

                case 'bufferMetrics':
                    this.handleBufferMetricsMessage(message);
                    break;

                default:
                    this.logger.log(`❓ Unknown worklet message type: ${message.type}`);
            }
        } catch (error) {
            this.logger.log('❌ Error handling worklet message', error);
        }
    }

    /**
     * Handle status messages from AudioWorklet
     */
    private handleStatusMessage(message: any): void {
        const status: WorkletStatus = message.status;

        switch (status) {
            case 'initializing':
                this.logger.log('🔄 AudioWorklet initializing...');
                break;

            case 'ready':
                this.isInitialized = true;
                this.logger.log(`✅ AudioWorklet ready: ${message.sampleRate}Hz, buffer ${message.bufferSize}`);
                break;

            case 'reset':
                this.currentSampleTime = 0;
                this.logger.log('🔄 AudioWorklet reset complete');
                break;

            case 'bufferSizeChanged':
                const latencyInfo = message.latencyMs ? ` (${message.latencyMs.toFixed(1)}ms latency)` : '';
                this.logger.log(`🔧 Buffer size changed to ${message.bufferSize} samples${latencyInfo}`);
                break;

            case 'adaptiveModeChanged':
                this.logger.log(`🤖 Adaptive buffer mode: ${message.adaptiveMode ? 'ENABLED' : 'DISABLED'}`);
                break;

            case 'error':
                this.logger.log(`❌ AudioWorklet error status: ${message.error || 'Unknown error'}`);
                break;
        }

        this.onStatusChange?.(status);
    }

    /**
     * Handle statistics messages from AudioWorklet
     */
    private handleStatsMessage(message: any): void {
        this.currentSampleTime = message.sampleTime;
        
        // Log detailed stats occasionally with buffer metrics
        if (message.sampleTime % (44100 * 5) < 1000) { // Every ~5 seconds
            let statsMessage = `📊 AudioWorklet stats: ${message.sampleTime} samples, ${message.bufferSize} buffer, ${message.sampleRate}Hz`;
            
            if (message.bufferMetrics) {
                const metrics = message.bufferMetrics;
                statsMessage += ` | Avg processing: ${metrics.averageProcessingTime.toFixed(2)}ms`;
                if (metrics.underruns > 0) {
                    statsMessage += ` | ⚠️ ${metrics.underruns} underruns`;
                }
            }
            
            if (message.bufferConfig) {
                statsMessage += ` | Latency: ${message.bufferConfig.latencyMs}ms`;
            }
            
            this.logger.log(statsMessage);
        }

        // Update debug log if provided
        if (message.debugLog && message.debugLog.trim()) {
            const debugTextarea = document.getElementById('debug-log') as HTMLTextAreaElement;
            if (debugTextarea) {
                debugTextarea.value = message.debugLog;
                debugTextarea.scrollTop = debugTextarea.scrollHeight;
            }
        }
    }

    /**
     * Handle buffer metrics messages from AudioWorklet
     */
    private handleBufferMetricsMessage(message: any): void {
        if (message.metrics && message.config) {
            const metrics: BufferMetrics = message.metrics;
            const config: BufferConfig = message.config;
            
            this.logger.log(`📊 Buffer Metrics Report:`);
            this.logger.log(`   Buffer: ${config.size} samples (${config.latencyMs}ms, ${config.cpuUsage} CPU usage)`);
            this.logger.log(`   Performance: ${metrics.averageProcessingTime.toFixed(2)}ms avg, ${metrics.maxProcessingTime.toFixed(2)}ms max`);
            this.logger.log(`   Reliability: ${metrics.underruns} underruns, ${metrics.overruns} overruns`);
            this.logger.log(`   Uptime: ${(metrics.uptime / 1000).toFixed(1)}s, ${metrics.samplesProcessed} samples processed`);
            
            if (message.statusSummary) {
                this.logger.log(`   Summary: ${message.statusSummary}`);
            }
        }
    }
}

/**
 * Utility function to check AudioWorklet compatibility
 */
export function isAudioWorkletSupported(): boolean {
    return (
        'AudioContext' in window &&
        'audioWorklet' in AudioContext.prototype &&
        'addModule' in AudioWorklet.prototype
    );
}

/**
 * Utility function to get optimal buffer size based on sample rate and target latency
 */
export function getOptimalBufferSize(sampleRate: number, targetLatencyMs: number): 128 | 256 | 512 {
    const targetSamples = (sampleRate * targetLatencyMs) / 1000;
    
    if (targetSamples <= 128) return 128;
    if (targetSamples <= 256) return 256;
    return 512;
}