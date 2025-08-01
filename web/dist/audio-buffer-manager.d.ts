/**
 * AWE Player - Audio Buffer Manager
 * Part of AWE Player EMU8000 Emulator
 *
 * Intelligent buffer management for Web Audio API
 * Optimizes latency, handles different buffer sizes, and manages performance
 */
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
export declare const BUFFER_CONFIGS: Record<128 | 256 | 512, BufferConfig>;
/**
 * Audio Buffer Manager - handles optimal buffer sizing and performance monitoring
 */
export declare class AudioBufferManager {
    private logger;
    private currentBufferSize;
    private sampleRate;
    private metrics;
    private performanceHistory;
    private underrunCount;
    private overrunCount;
    private startTime;
    private samplesProcessed;
    private adaptiveMode;
    private lastAdaptation;
    private minTimeBetweenAdaptations;
    constructor(initialBufferSize?: 128 | 256 | 512);
    /**
     * Set sample rate for buffer calculations
     */
    setSampleRate(sampleRate: number): void;
    /**
     * Get current buffer configuration
     */
    getCurrentConfig(): BufferConfig;
    /**
     * Get current buffer size
     */
    getCurrentBufferSize(): 128 | 256 | 512;
    /**
     * Set buffer size manually (disables adaptive mode temporarily)
     */
    setBufferSize(size: 128 | 256 | 512): void;
    /**
     * Enable or disable adaptive buffer sizing
     */
    setAdaptiveMode(enabled: boolean): void;
    /**
     * Record processing time for a buffer
     */
    recordProcessingTime(processingTimeMs: number, bufferSize: number): void;
    /**
     * Record buffer underrun (audio glitch)
     */
    recordUnderrun(): void;
    /**
     * Record buffer overrun (processing too fast)
     */
    recordOverrun(): void;
    /**
     * Get current performance metrics
     */
    getMetrics(): BufferMetrics;
    /**
     * Get buffer size recommendation based on target latency
     */
    getRecommendedBufferSize(targetLatencyMs: number): 128 | 256 | 512;
    /**
     * Get latency for current buffer size
     */
    getCurrentLatencyMs(): number;
    /**
     * Reset all metrics and counters
     */
    resetMetrics(): void;
    /**
     * Get buffer management status summary
     */
    getStatusSummary(): string;
    /**
     * Detect optimal buffer size based on device capabilities
     */
    private detectOptimalBufferSize;
    /**
     * Calculate optimal buffer size based on current performance
     */
    private calculateOptimalBufferSize;
    /**
     * Check if we should perform adaptive buffer sizing
     */
    private shouldPerformAdaptation;
    /**
     * Perform adaptive buffer sizing based on performance metrics
     */
    private performAdaptiveBufferSizing;
    /**
     * Consider increasing buffer size due to performance issues
     */
    private considerBufferSizeIncrease;
    /**
     * Update internal metrics
     */
    private updateMetrics;
    /**
     * Create empty metrics object
     */
    private createEmptyMetrics;
}
/**
 * Utility function to estimate optimal buffer size for target latency
 */
export declare function calculateOptimalBufferSize(sampleRate: number, targetLatencyMs: number): 128 | 256 | 512;
/**
 * Utility function to convert buffer size to latency
 */
export declare function bufferSizeToLatency(bufferSize: number, sampleRate: number): number;
/**
 * Utility function to check if a buffer size is valid
 */
export declare function isValidBufferSize(size: number): size is 128 | 256 | 512;
//# sourceMappingURL=audio-buffer-manager.d.ts.map