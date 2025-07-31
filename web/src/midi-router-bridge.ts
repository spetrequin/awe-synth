/**
 * MIDI Router Bridge - Connect MIDI router to WASM MidiPlayer
 * 
 * Bridges TypeScript MIDI router to WASM synthesis engine.
 * Handles event format conversion and timing synchronization.
 */

import { MidiRouter, ProcessedMidiEvent, MidiSource } from './midi-router.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';

const log = (message: string) => DEBUG_LOGGERS.midiFile.log(message);

// WASM types (will be loaded dynamically)
interface WasmMidiEvent {
    new(timestamp: number, channel: number, messageType: number, data1: number, data2: number): WasmMidiEvent;
}

interface WasmMidiPlayer {
    queue_midi_event(event: WasmMidiEvent): void;
    process_midi_events(currentSampleTime: number): number;
    advance_time(samples: number): void;
}

/**
 * Bridge configuration
 */
export interface RouterBridgeConfig {
    /** How often to process MIDI events (milliseconds) */
    processingInterval: number;
    /** Sample rate for timing calculations */
    sampleRate: number;
    /** Enable debug logging */
    debugLogging: boolean;
}

/**
 * MIDI Router Bridge - connects MIDI router to WASM synthesis
 */
export class MidiRouterBridge {
    private router: MidiRouter;
    private wasmPlayer?: WasmMidiPlayer;
    private wasmMidiEvent?: WasmMidiEvent;
    private config: RouterBridgeConfig;
    private processingTimer?: number;
    private lastProcessTime = 0;
    private currentSampleTime = 0;

    constructor(config: Partial<RouterBridgeConfig> = {}) {
        this.config = {
            processingInterval: 10, // 10ms = ~100Hz processing rate
            sampleRate: 44100,
            debugLogging: false,
            ...config
        };

        // Create MIDI router with sample rate config
        this.router = new MidiRouter({
            sampleRate: this.config.sampleRate,
            debugLogging: this.config.debugLogging
        });

        // Set router output callback
        this.router.setOutputCallback((events: ProcessedMidiEvent[]) => {
            this.handleRouterOutput(events);
        });

        log('MidiRouterBridge: Initialized');
        if (this.config.debugLogging) {
            log(`Bridge Config: processing=${this.config.processingInterval}ms, sampleRate=${this.config.sampleRate}`);
        }
    }

    /**
     * Connect to WASM MidiPlayer instance
     */
    public connectWasm(wasmPlayer: WasmMidiPlayer, wasmMidiEvent: WasmMidiEvent): void {
        this.wasmPlayer = wasmPlayer;
        this.wasmMidiEvent = wasmMidiEvent;
        
        log('MidiRouterBridge: Connected to WASM MidiPlayer');
        
        // Start processing loop
        this.startProcessing();
    }

    /**
     * Disconnect from WASM
     */
    public disconnectWasm(): void {
        this.stopProcessing();
        delete (this as any).wasmPlayer;
        delete (this as any).wasmMidiEvent;
        
        log('MidiRouterBridge: Disconnected from WASM');
    }

    /**
     * Register a MIDI input source
     */
    public registerSource(source: any): void {
        this.router.registerSource(source);
    }

    /**
     * Unregister a MIDI input source
     */
    public unregisterSource(source: MidiSource): void {
        this.router.unregisterSource(source);
    }

    /**
     * Enable/disable a source
     */
    public setSourceEnabled(source: MidiSource, enabled: boolean): void {
        this.router.setSourceEnabled(source, enabled);
    }

    /**
     * Queue a MIDI event for processing
     */
    public queueEvent(event: any): void {
        this.router.queueEvent(event);
    }

    /**
     * Get router statistics
     */
    public getStats(): any {
        return this.router.getStats();
    }

    /**
     * Clear all queued events
     */
    public clearQueue(): void {
        this.router.clearQueue();
    }

    /**
     * Start the processing loop
     */
    private startProcessing(): void {
        if (this.processingTimer) {
            this.stopProcessing();
        }

        this.lastProcessTime = performance.now();
        
        this.processingTimer = window.setInterval(() => {
            this.processEvents();
        }, this.config.processingInterval);

        log('MidiRouterBridge: Processing started');
    }

    /**
     * Stop the processing loop
     */
    private stopProcessing(): void {
        if (this.processingTimer) {
            window.clearInterval(this.processingTimer);
            delete (this as any).processingTimer;
        }

        log('MidiRouterBridge: Processing stopped');
    }

    /**
     * Process queued events and advance time
     */
    private processEvents(): void {
        if (!this.wasmPlayer) {
            return;
        }

        const currentTime = performance.now();
        const deltaSamples = Math.floor(((currentTime - this.lastProcessTime) / 1000) * this.config.sampleRate);
        
        if (deltaSamples > 0) {
            // Advance WASM time first
            this.currentSampleTime += deltaSamples;
            this.wasmPlayer.advance_time(deltaSamples);
            
            // Process any queued MIDI events from router
            this.router.processEvents();
            
            // Process WASM MIDI queue
            const processedCount = this.wasmPlayer.process_midi_events(this.currentSampleTime);
            
            if (this.config.debugLogging && processedCount > 0) {
                log(`Bridge: Processed ${processedCount} WASM events @${this.currentSampleTime}`);
            }
            
            this.lastProcessTime = currentTime;
        }
    }

    /**
     * Handle output from MIDI router
     */
    private handleRouterOutput(events: ProcessedMidiEvent[]): void {
        if (!this.wasmPlayer || !this.wasmMidiEvent || events.length === 0) {
            return;
        }

        for (const event of events) {
            try {
                // Convert ProcessedMidiEvent to WASM MidiEvent
                const wasmEvent = new this.wasmMidiEvent(
                    event.sampleTimestamp,
                    event.channel,
                    event.messageType,
                    event.data1,
                    event.data2
                );

                // Queue in WASM
                this.wasmPlayer.queue_midi_event(wasmEvent);

                if (this.config.debugLogging) {
                    log(`Bridge: Queued ${this.getMidiEventDescription(event)} from ${event.source}`);
                }
            } catch (error) {
                log(`Bridge: Error converting event: ${error}`);
            }
        }
    }

    /**
     * Get human-readable MIDI event description
     */
    private getMidiEventDescription(event: ProcessedMidiEvent): string {
        const msgType = event.messageType & 0xF0;
        const channel = event.channel + 1;

        switch (msgType) {
            case 0x80:
                return `Note Off Ch${channel} Note${event.data1} Vel${event.data2}`;
            case 0x90:
                return event.data2 > 0 ? 
                    `Note On Ch${channel} Note${event.data1} Vel${event.data2}` :
                    `Note Off Ch${channel} Note${event.data1} Vel${event.data2}`;
            case 0xB0:
                return `CC Ch${channel} CC${event.data1} Val${event.data2}`;
            case 0xC0:
                return `Program Change Ch${channel} Program${event.data1}`;
            case 0xE0:
                const pitchBend = (event.data2 << 7) | event.data1;
                return `Pitch Bend Ch${channel} Value${pitchBend}`;
            default:
                return `MIDI Ch${channel} Type0x${msgType.toString(16)} Data${event.data1},${event.data2}`;
        }
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.stopProcessing();
        this.router.destroy();
        delete (this as any).wasmPlayer;
        delete (this as any).wasmMidiEvent;
        
        log('MidiRouterBridge: Destroyed');
    }
}