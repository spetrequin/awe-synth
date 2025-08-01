/**
 * MIDI Router Bridge - Connect MIDI router to WASM MidiPlayer
 *
 * Bridges TypeScript MIDI router to WASM synthesis engine.
 * Handles event format conversion and timing synchronization.
 */
import { MidiRouter } from './midi-router.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
const log = (message) => DEBUG_LOGGERS.midiFile.log(message);
/**
 * MIDI Router Bridge - connects MIDI router to WASM synthesis
 */
export class MidiRouterBridge {
    router;
    wasmPlayer;
    wasmMidiEvent;
    config;
    processingTimer;
    lastProcessTime = 0;
    currentSampleTime = 0;
    constructor(config = {}) {
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
        this.router.setOutputCallback((events) => {
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
    connectWasm(wasmPlayer, wasmMidiEvent) {
        this.wasmPlayer = wasmPlayer;
        this.wasmMidiEvent = wasmMidiEvent;
        log('MidiRouterBridge: Connected to WASM MidiPlayer');
        // Start processing loop
        this.startProcessing();
    }
    /**
     * Disconnect from WASM
     */
    disconnectWasm() {
        this.stopProcessing();
        delete this.wasmPlayer;
        delete this.wasmMidiEvent;
        log('MidiRouterBridge: Disconnected from WASM');
    }
    /**
     * Register a MIDI input source
     */
    registerSource(source) {
        this.router.registerSource(source);
    }
    /**
     * Unregister a MIDI input source
     */
    unregisterSource(source) {
        this.router.unregisterSource(source);
    }
    /**
     * Enable/disable a source
     */
    setSourceEnabled(source, enabled) {
        this.router.setSourceEnabled(source, enabled);
    }
    /**
     * Queue a MIDI event for processing
     */
    queueEvent(event) {
        this.router.queueEvent(event);
    }
    /**
     * Get router statistics
     */
    getStats() {
        return this.router.getStats();
    }
    /**
     * Clear all queued events
     */
    clearQueue() {
        this.router.clearQueue();
    }
    /**
     * Start the processing loop
     */
    startProcessing() {
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
    stopProcessing() {
        if (this.processingTimer) {
            window.clearInterval(this.processingTimer);
            delete this.processingTimer;
        }
        log('MidiRouterBridge: Processing stopped');
    }
    /**
     * Process queued events and advance time
     */
    processEvents() {
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
    handleRouterOutput(events) {
        if (!this.wasmPlayer || !this.wasmMidiEvent || events.length === 0) {
            return;
        }
        for (const event of events) {
            try {
                // Convert ProcessedMidiEvent to WASM MidiEvent
                const wasmEvent = new this.wasmMidiEvent(event.sampleTimestamp, event.channel, event.messageType, event.data1, event.data2);
                // Queue in WASM
                this.wasmPlayer.queue_midi_event(wasmEvent);
                if (this.config.debugLogging) {
                    log(`Bridge: Queued ${this.getMidiEventDescription(event)} from ${event.source}`);
                }
            }
            catch (error) {
                log(`Bridge: Error converting event: ${error}`);
            }
        }
    }
    /**
     * Get human-readable MIDI event description
     */
    getMidiEventDescription(event) {
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
    destroy() {
        this.stopProcessing();
        this.router.destroy();
        delete this.wasmPlayer;
        delete this.wasmMidiEvent;
        log('MidiRouterBridge: Destroyed');
    }
}
//# sourceMappingURL=midi-router-bridge.js.map