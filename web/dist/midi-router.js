/**
 * MIDI Router - Unified MIDI Event Routing System
 *
 * Central hub for collecting MIDI events from multiple sources and routing them
 * to the WASM synthesis engine with proper prioritization and timing.
 */
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
const log = (message) => DEBUG_LOGGERS.midiFile.log(message);
/**
 * MIDI event sources for routing prioritization
 */
export var MidiSource;
(function (MidiSource) {
    MidiSource["VirtualKeyboard"] = "virtual-keyboard";
    MidiSource["HardwareInput"] = "hardware-input";
    MidiSource["FilePlayback"] = "file-playbook";
    MidiSource["Test"] = "test";
})(MidiSource || (MidiSource = {}));
/**
 * Priority levels for MIDI source routing
 * Higher numbers = higher priority
 */
export const MIDI_SOURCE_PRIORITY = {
    [MidiSource.HardwareInput]: 100, // Highest priority - real-time hardware input
    [MidiSource.VirtualKeyboard]: 90, // High priority - direct user interaction
    [MidiSource.FilePlayback]: 80, // Medium priority - automated playback
    [MidiSource.Test]: 10 // Lowest priority - testing and debugging
};
/**
 * Unified MIDI Event Router
 *
 * Collects MIDI events from multiple sources, applies prioritization,
 * handles timing synchronization, and routes to WASM synthesis engine.
 */
export class MidiRouter {
    constructor(config = {}) {
        this.sources = {};
        this.eventQueue = [];
        // private lastProcessTime = 0;
        this.latencyHistory = [];
        this.isProcessing = false;
        this.config = Object.assign({ maxQueueSize: 1000, sampleRate: 44100, baseTimestamp: performance.now(), debugLogging: false }, config);
        this.stats = {
            totalEvents: 0,
            eventsBySource: {
                [MidiSource.VirtualKeyboard]: 0,
                [MidiSource.HardwareInput]: 0,
                [MidiSource.FilePlayback]: 0,
                [MidiSource.Test]: 0
            },
            droppedEvents: 0,
            currentQueueLength: 0,
            averageLatency: 0
        };
        log('MidiRouter: Initialized with config');
        if (this.config.debugLogging) {
            log(`MidiRouter Config: maxQueue=${this.config.maxQueueSize}, sampleRate=${this.config.sampleRate}`);
        }
    }
    /**
     * Register a MIDI input source
     */
    registerSource(sourceConfig) {
        log(`MidiRouter: Registering source '${sourceConfig.name}' (${sourceConfig.source})`);
        this.sources[sourceConfig.source] = Object.assign(Object.assign({}, sourceConfig), { onEvent: (event) => {
                this.handleSourceEvent(sourceConfig.source, event);
            } });
        this.stats.eventsBySource[sourceConfig.source] = 0;
    }
    /**
     * Unregister a MIDI input source
     */
    unregisterSource(source) {
        if (this.sources[source]) {
            const sourceConfig = this.sources[source];
            log(`MidiRouter: Unregistering source '${sourceConfig.name}' (${source})`);
            delete this.sources[source];
        }
    }
    /**
     * Enable or disable a MIDI input source
     */
    setSourceEnabled(source, enabled) {
        const sourceConfig = this.sources[source];
        if (sourceConfig) {
            sourceConfig.enabled = enabled;
            log(`MidiRouter: Source '${sourceConfig.name}' ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    /**
     * Check if a source is registered and enabled
     */
    isSourceEnabled(source) {
        const sourceConfig = this.sources[source];
        return sourceConfig ? sourceConfig.enabled : false;
    }
    /**
     * Set output callback for processed events
     */
    setOutputCallback(callback) {
        this.outputCallback = callback;
        log('MidiRouter: Output callback registered');
    }
    /**
     * Queue a MIDI event from a source
     */
    queueEvent(event) {
        // Check if source is registered and enabled
        const sourceConfig = this.sources[event.source];
        if (!sourceConfig || !sourceConfig.enabled) {
            if (this.config.debugLogging) {
                log(`MidiRouter: Ignoring event from disabled source: ${event.source}`);
            }
            return;
        }
        // Check queue capacity
        if (this.eventQueue.length >= this.config.maxQueueSize) {
            // Drop oldest event with lowest priority
            this.dropLowPriorityEvent();
            this.stats.droppedEvents++;
        }
        // Add timestamp if not provided
        if (!event.timestamp) {
            event.timestamp = performance.now();
        }
        this.eventQueue.push(event);
        this.stats.eventsBySource[event.source]++;
        this.stats.totalEvents++;
        this.stats.currentQueueLength = this.eventQueue.length;
        if (this.config.debugLogging) {
            log(`MidiRouter: Queued ${this.getMidiEventDescription(event)} from ${event.source}`);
        }
    }
    /**
     * Process queued events and send to output
     */
    processEvents() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return [];
        }
        this.isProcessing = true;
        const startTime = performance.now();
        try {
            // Sort events by priority and timestamp
            this.eventQueue.sort((a, b) => {
                const priorityDiff = MIDI_SOURCE_PRIORITY[b.source] - MIDI_SOURCE_PRIORITY[a.source];
                if (priorityDiff !== 0)
                    return priorityDiff;
                return a.timestamp - b.timestamp; // Earlier timestamps first
            });
            // Process all events
            const processedEvents = [];
            const currentTime = performance.now();
            for (const rawEvent of this.eventQueue) {
                const processedEvent = this.processRawEvent(rawEvent, currentTime);
                if (processedEvent) {
                    processedEvents.push(processedEvent);
                }
            }
            // Clear the queue
            this.eventQueue = [];
            this.stats.currentQueueLength = 0;
            // Update latency statistics
            const processingTime = performance.now() - startTime;
            this.updateLatencyStats(processingTime);
            // Send to output callback
            if (this.outputCallback && processedEvents.length > 0) {
                this.outputCallback(processedEvents);
            }
            if (this.config.debugLogging && processedEvents.length > 0) {
                log(`MidiRouter: Processed ${processedEvents.length} events in ${processingTime.toFixed(2)}ms`);
            }
            return processedEvents;
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Get current router statistics
     */
    getStats() {
        return Object.assign({}, this.stats);
    }
    /**
     * Reset router statistics
     */
    resetStats() {
        this.stats = {
            totalEvents: 0,
            eventsBySource: {
                [MidiSource.VirtualKeyboard]: 0,
                [MidiSource.HardwareInput]: 0,
                [MidiSource.FilePlayback]: 0,
                [MidiSource.Test]: 0
            },
            droppedEvents: 0,
            currentQueueLength: this.eventQueue.length,
            averageLatency: 0
        };
        this.latencyHistory = [];
        log('MidiRouter: Statistics reset');
    }
    /**
     * Clear all queued events
     */
    clearQueue() {
        const clearedCount = this.eventQueue.length;
        this.eventQueue = [];
        this.stats.currentQueueLength = 0;
        if (clearedCount > 0) {
            log(`MidiRouter: Cleared ${clearedCount} queued events`);
        }
    }
    /**
     * Get list of registered sources
     */
    getSources() {
        const sources = [];
        for (const source in this.sources) {
            if (this.sources[source]) {
                sources.push(this.sources[source]);
            }
        }
        return sources;
    }
    /**
     * Handle event from a registered source
     */
    handleSourceEvent(source, event) {
        // Ensure event has correct source
        event.source = source;
        this.queueEvent(event);
    }
    /**
     * Drop the lowest priority event from the queue
     */
    dropLowPriorityEvent() {
        if (this.eventQueue.length === 0)
            return;
        let lowestPriorityIndex = 0;
        let lowestPriority = MIDI_SOURCE_PRIORITY[this.eventQueue[0].source];
        for (let i = 1; i < this.eventQueue.length; i++) {
            const priority = MIDI_SOURCE_PRIORITY[this.eventQueue[i].source];
            if (priority < lowestPriority) {
                lowestPriority = priority;
                lowestPriorityIndex = i;
            }
        }
        const droppedEvent = this.eventQueue.splice(lowestPriorityIndex, 1)[0];
        if (this.config.debugLogging) {
            log(`MidiRouter: Dropped low priority event: ${this.getMidiEventDescription(droppedEvent)}`);
        }
    }
    /**
     * Convert raw MIDI event to processed event
     */
    processRawEvent(rawEvent, _currentTime) {
        try {
            // Convert timestamp to sample-accurate timing
            const relativeTime = rawEvent.timestamp - this.config.baseTimestamp;
            const sampleTimestamp = Math.floor((relativeTime / 1000) * this.config.sampleRate);
            return {
                sampleTimestamp,
                source: rawEvent.source,
                channel: rawEvent.channel,
                messageType: rawEvent.messageType,
                data1: rawEvent.data1,
                data2: rawEvent.velocity !== undefined ? rawEvent.velocity : rawEvent.data2
            };
        }
        catch (error) {
            log(`MidiRouter: Error processing event: ${error}`);
            return null;
        }
    }
    /**
     * Update latency statistics
     */
    updateLatencyStats(latency) {
        this.latencyHistory.push(latency);
        // Keep only last 100 measurements
        if (this.latencyHistory.length > 100) {
            this.latencyHistory.shift();
        }
        // Calculate average
        const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
        this.stats.averageLatency = sum / this.latencyHistory.length;
    }
    /**
     * Get human-readable description of MIDI event
     */
    getMidiEventDescription(event) {
        const msgType = event.messageType & 0xF0;
        const channel = event.channel + 1; // Display as 1-16
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
        this.clearQueue();
        this.sources = {};
        this.outputCallback = undefined;
        log('MidiRouter: Destroyed');
    }
}
