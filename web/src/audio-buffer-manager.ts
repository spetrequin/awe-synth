/**
 * AWE Player - Audio Buffer Manager
 * Part of AWE Player EMU8000 Emulator
 * 
 * Intelligent buffer management for Web Audio API
 * Optimizes latency, handles different buffer sizes, and manages performance
 */

import { DebugLogger } from './utils/debug-logger.js';

/**
 * Buffer size configuration options
 */
export interface BufferConfig {
    readonly size: 128 | 256 | 512;
    readonly latencyMs: number;
    readonly cpuUsage: 'low' | 'medium' | 'high';
    readonly stability: 'stable' | 'moderate' | 'unstable';
}

/**
 * Buffer performance metrics
 */
export interface BufferMetrics {
    readonly averageProcessingTime: number;
    readonly maxProcessingTime: number;
    readonly underruns: number;
    readonly overruns: number;
    readonly samplesProcessed: number;
    readonly uptime: number;
}

/**
 * Buffer size configurations with performance characteristics
 */
export const BUFFER_CONFIGS: Record<128 | 256 | 512, BufferConfig> = {
    128: {
        size: 128,
        latencyMs: 2.9, // ~2.9ms at 44.1kHz
        cpuUsage: 'high',
        stability: 'unstable'
    },
    256: {
        size: 256,
        latencyMs: 5.8, // ~5.8ms at 44.1kHz
        cpuUsage: 'medium',
        stability: 'moderate'
    },
    512: {
        size: 512,
        latencyMs: 11.6, // ~11.6ms at 44.1kHz
        cpuUsage: 'low',
        stability: 'stable'
    }
};

/**
 * Audio Buffer Manager - handles optimal buffer sizing and performance monitoring
 */
export class AudioBufferManager {
    private logger: DebugLogger;
    private currentBufferSize: 128 | 256 | 512 = 128;
    private sampleRate: number = 44100;
    private metrics: BufferMetrics;
    private performanceHistory: number[] = [];
    private underrunCount = 0;
    private overrunCount = 0;
    private startTime: number;
    private samplesProcessed = 0;
    private adaptiveMode = true;
    private lastAdaptation = 0;
    private minTimeBetweenAdaptations = 5000; // 5 seconds

    constructor(initialBufferSize?: 128 | 256 | 512) {
        this.logger = new DebugLogger({ componentName: 'AudioBufferManager' });
        this.currentBufferSize = initialBufferSize || this.detectOptimalBufferSize();
        this.startTime = performance.now();
        this.metrics = this.createEmptyMetrics();
        
        this.logger.log(`📊 Buffer manager initialized: ${this.currentBufferSize} samples`);
    }

    /**
     * Set sample rate for buffer calculations
     */
    setSampleRate(sampleRate: number): void {
        this.sampleRate = sampleRate;
        this.logger.log(`🔧 Sample rate set to ${sampleRate}Hz`);
        
        // Recalculate optimal buffer size for new sample rate
        if (this.adaptiveMode) {
            const optimal = this.calculateOptimalBufferSize();
            if (optimal !== this.currentBufferSize) {
                this.logger.log(`🔄 Sample rate change suggests buffer size: ${optimal}`);
            }
        }
    }

    /**
     * Get current buffer configuration
     */
    getCurrentConfig(): BufferConfig {
        return BUFFER_CONFIGS[this.currentBufferSize];
    }

    /**
     * Get current buffer size
     */
    getCurrentBufferSize(): 128 | 256 | 512 {
        return this.currentBufferSize;
    }

    /**
     * Set buffer size manually (disables adaptive mode temporarily)
     */
    setBufferSize(size: 128 | 256 | 512): void {
        if (size !== this.currentBufferSize) {
            const oldSize = this.currentBufferSize;
            this.currentBufferSize = size;
            this.adaptiveMode = false; // User override
            
            this.logger.log(`🔧 Buffer size changed: ${oldSize} → ${size} (adaptive disabled)`);
            this.logger.log(`📊 New config: ${this.getCurrentConfig().latencyMs}ms latency, ${this.getCurrentConfig().cpuUsage} CPU`);
        }
    }

    /**
     * Enable or disable adaptive buffer sizing
     */
    setAdaptiveMode(enabled: boolean): void {
        this.adaptiveMode = enabled;
        this.logger.log(`🤖 Adaptive mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        
        if (enabled) {
            this.lastAdaptation = 0; // Allow immediate adaptation
        }
    }

    /**
     * Record processing time for a buffer
     */
    recordProcessingTime(processingTimeMs: number, bufferSize: number): void {
        this.samplesProcessed += bufferSize;
        
        // Add to performance history (keep last 100 measurements)
        this.performanceHistory.push(processingTimeMs);
        if (this.performanceHistory.length > 100) {
            this.performanceHistory.shift();
        }

        // Check for underruns (processing took longer than available time)
        const availableTimeMs = (bufferSize / this.sampleRate) * 1000;
        if (processingTimeMs > availableTimeMs * 0.8) { // 80% threshold
            this.underrunCount++;
            this.logger.log(`⚠️ Near-underrun: ${processingTimeMs.toFixed(2)}ms > ${(availableTimeMs * 0.8).toFixed(2)}ms threshold`);
            
            // Trigger adaptive sizing if enabled
            if (this.adaptiveMode) {
                this.considerBufferSizeIncrease();
            }
        }

        // Update metrics
        this.updateMetrics();

        // Perform adaptive sizing check periodically
        if (this.adaptiveMode && this.shouldPerformAdaptation()) {
            this.performAdaptiveBufferSizing();
        }
    }

    /**
     * Record buffer underrun (audio glitch)
     */
    recordUnderrun(): void {
        this.underrunCount++;
        this.logger.log(`❌ Buffer underrun detected (total: ${this.underrunCount})`);
        
        if (this.adaptiveMode) {
            this.considerBufferSizeIncrease();
        }
    }

    /**
     * Record buffer overrun (processing too fast)
     */
    recordOverrun(): void {
        this.overrunCount++;
        // Overruns are less critical but still worth tracking
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): BufferMetrics {
        this.updateMetrics();
        return { ...this.metrics };
    }

    /**
     * Get buffer size recommendation based on target latency
     */
    getRecommendedBufferSize(targetLatencyMs: number): 128 | 256 | 512 {
        const targetSamples = (targetLatencyMs * this.sampleRate) / 1000;
        
        if (targetSamples <= 128) return 128;
        if (targetSamples <= 256) return 256;
        return 512;
    }

    /**
     * Get latency for current buffer size
     */
    getCurrentLatencyMs(): number {
        return (this.currentBufferSize / this.sampleRate) * 1000;
    }

    /**
     * Reset all metrics and counters
     */
    resetMetrics(): void {
        this.performanceHistory = [];
        this.underrunCount = 0;
        this.overrunCount = 0;
        this.samplesProcessed = 0;
        this.startTime = performance.now();
        this.metrics = this.createEmptyMetrics();
        
        this.logger.log('📊 Metrics reset');
    }

    /**
     * Get buffer management status summary
     */
    getStatusSummary(): string {
        const config = this.getCurrentConfig();
        const metrics = this.getMetrics();
        
        return JSON.stringify({
            bufferSize: this.currentBufferSize,
            latencyMs: config.latencyMs,
            cpuUsage: config.cpuUsage,
            adaptiveMode: this.adaptiveMode,
            avgProcessingMs: metrics.averageProcessingTime.toFixed(3),
            underruns: metrics.underruns,
            uptime: (metrics.uptime / 1000).toFixed(1) + 's',
            samplesProcessed: metrics.samplesProcessed
        }, null, 2);
    }

    /**
     * Detect optimal buffer size based on device capabilities
     */
    private detectOptimalBufferSize(): 128 | 256 | 512 {
        // Use performance hints and hardware characteristics
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const deviceMemory = (navigator as any).deviceMemory || 4; // GB
        
        // High-end devices can handle lower latency
        if (hardwareConcurrency >= 8 && deviceMemory >= 8) {
            this.logger.log('🚀 High-end device detected, using 128 sample buffer');
            return 128;
        }
        
        // Mid-range devices use balanced approach
        if (hardwareConcurrency >= 4 && deviceMemory >= 4) {
            this.logger.log('⚡ Mid-range device detected, using 256 sample buffer');
            return 256;
        }
        
        // Low-end devices prioritize stability
        this.logger.log('🐌 Low-end device detected, using 512 sample buffer');
        return 512;
    }

    /**
     * Calculate optimal buffer size based on current performance
     */
    private calculateOptimalBufferSize(): 128 | 256 | 512 {
        if (this.performanceHistory.length < 10) {
            return this.currentBufferSize; // Not enough data
        }

        const avgProcessingTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
        const currentLatency = this.getCurrentLatencyMs();
        const utilizationRatio = avgProcessingTime / currentLatency;

        // If we're using less than 50% of available time, we can go smaller
        if (utilizationRatio < 0.5 && this.underrunCount === 0 && this.currentBufferSize > 128) {
            if (this.currentBufferSize === 512) return 256;
            if (this.currentBufferSize === 256) return 128;
        }

        // If we're using more than 70% or having underruns, go larger
        if (utilizationRatio > 0.7 || this.underrunCount > 0) {
            if (this.currentBufferSize === 128) return 256;
            if (this.currentBufferSize === 256) return 512;
        }

        return this.currentBufferSize;
    }

    /**
     * Check if we should perform adaptive buffer sizing
     */
    private shouldPerformAdaptation(): boolean {
        const now = performance.now();
        const timeSinceLastAdaptation = now - this.lastAdaptation;
        
        return timeSinceLastAdaptation >= this.minTimeBetweenAdaptations &&
               this.performanceHistory.length >= 20; // Need sufficient data
    }

    /**
     * Perform adaptive buffer sizing based on performance metrics
     */
    private performAdaptiveBufferSizing(): void {
        const optimalSize = this.calculateOptimalBufferSize();
        
        if (optimalSize !== this.currentBufferSize) {
            const oldSize = this.currentBufferSize;
            this.currentBufferSize = optimalSize;
            this.lastAdaptation = performance.now();
            
            // Reset some metrics after adaptation
            this.performanceHistory = [];
            this.underrunCount = 0;
            
            this.logger.log(`🤖 Adaptive sizing: ${oldSize} → ${optimalSize} samples`);
            this.logger.log(`📊 New latency: ${this.getCurrentConfig().latencyMs}ms`);
        }
    }

    /**
     * Consider increasing buffer size due to performance issues
     */
    private considerBufferSizeIncrease(): void {
        const now = performance.now();
        if (now - this.lastAdaptation < 2000) return; // Wait at least 2 seconds
        
        let newSize: 128 | 256 | 512 = this.currentBufferSize;
        
        if (this.currentBufferSize === 128) newSize = 256;
        else if (this.currentBufferSize === 256) newSize = 512;
        
        if (newSize !== this.currentBufferSize) {
            this.currentBufferSize = newSize;
            this.lastAdaptation = now;
            this.logger.log(`⬆️ Emergency buffer increase: ${this.currentBufferSize} → ${newSize} (underruns: ${this.underrunCount})`);
        }
    }

    /**
     * Update internal metrics
     */
    private updateMetrics(): void {
        const now = performance.now();
        const uptime = now - this.startTime;
        
        let avgProcessingTime = 0;
        let maxProcessingTime = 0;
        
        if (this.performanceHistory.length > 0) {
            avgProcessingTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
            maxProcessingTime = Math.max(...this.performanceHistory);
        }

        this.metrics = {
            averageProcessingTime: avgProcessingTime,
            maxProcessingTime: maxProcessingTime,
            underruns: this.underrunCount,
            overruns: this.overrunCount,
            samplesProcessed: this.samplesProcessed,
            uptime: uptime
        };
    }

    /**
     * Create empty metrics object
     */
    private createEmptyMetrics(): BufferMetrics {
        return {
            averageProcessingTime: 0,
            maxProcessingTime: 0,
            underruns: 0,
            overruns: 0,
            samplesProcessed: 0,
            uptime: 0
        };
    }
}

/**
 * Utility function to estimate optimal buffer size for target latency
 */
export function calculateOptimalBufferSize(sampleRate: number, targetLatencyMs: number): 128 | 256 | 512 {
    const targetSamples = (sampleRate * targetLatencyMs) / 1000;
    
    if (targetSamples <= 128) return 128;
    if (targetSamples <= 256) return 256;
    return 512;
}

/**
 * Utility function to convert buffer size to latency
 */
export function bufferSizeToLatency(bufferSize: number, sampleRate: number): number {
    return (bufferSize / sampleRate) * 1000;
}

/**
 * Utility function to check if a buffer size is valid
 */
export function isValidBufferSize(size: number): size is 128 | 256 | 512 {
    return size === 128 || size === 256 || size === 512;
}