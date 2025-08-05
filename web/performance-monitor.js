/**
 * AWE Player - Lightweight Performance Monitor (Task 18.2)
 * 
 * Minimal performance monitoring for production use
 * Integrates with the main AWE Player without overhead
 */

export class AWEPlayerPerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.sampleInterval = options.sampleInterval || 1000; // 1 second
        this.historySize = options.historySize || 60; // 1 minute of data
        
        this.metrics = {
            fps: [],
            audioLatency: [],
            bufferUnderruns: 0,
            voiceCount: [],
            cpuTime: [],
            memoryUsage: []
        };
        
        this.callbacks = {
            onUnderrun: null,
            onHighLatency: null,
            onLowFPS: null
        };
        
        this.thresholds = {
            latency: 50, // ms
            fps: 30,
            cpu: 80 // percentage
        };
        
        this._lastFrameTime = performance.now();
        this._frameCount = 0;
        this._sampleTimer = null;
    }
    
    /**
     * Start monitoring
     */
    start() {
        if (!this.enabled) return;
        
        this._lastFrameTime = performance.now();
        this._frameCount = 0;
        
        // Start sampling timer
        this._sampleTimer = setInterval(() => {
            this.sample();
        }, this.sampleInterval);
        
        // Start frame monitoring
        this.monitorFrames();
    }
    
    /**
     * Stop monitoring
     */
    stop() {
        if (this._sampleTimer) {
            clearInterval(this._sampleTimer);
            this._sampleTimer = null;
        }
    }
    
    /**
     * Monitor frame rate
     */
    monitorFrames() {
        if (!this.enabled) return;
        
        this._frameCount++;
        
        requestAnimationFrame(() => {
            this.monitorFrames();
        });
    }
    
    /**
     * Sample current metrics
     */
    sample() {
        const now = performance.now();
        const elapsed = now - this._lastFrameTime;
        
        // Calculate FPS
        const fps = (this._frameCount * 1000) / elapsed;
        this.addMetric('fps', fps);
        
        // Check FPS threshold
        if (fps < this.thresholds.fps && this.callbacks.onLowFPS) {
            this.callbacks.onLowFPS(fps);
        }
        
        // Reset frame counter
        this._frameCount = 0;
        this._lastFrameTime = now;
        
        // Sample memory if available
        if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            this.addMetric('memoryUsage', memoryMB);
        }
    }
    
    /**
     * Add metric value
     */
    addMetric(name, value) {
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }
        
        this.metrics[name].push({
            value,
            timestamp: Date.now()
        });
        
        // Trim history
        if (this.metrics[name].length > this.historySize) {
            this.metrics[name].shift();
        }
    }
    
    /**
     * Record audio latency
     */
    recordAudioLatency(latency) {
        if (!this.enabled) return;
        
        this.addMetric('audioLatency', latency);
        
        // Check threshold
        if (latency > this.thresholds.latency && this.callbacks.onHighLatency) {
            this.callbacks.onHighLatency(latency);
        }
    }
    
    /**
     * Record buffer underrun
     */
    recordUnderrun() {
        if (!this.enabled) return;
        
        this.metrics.bufferUnderruns++;
        
        if (this.callbacks.onUnderrun) {
            this.callbacks.onUnderrun();
        }
    }
    
    /**
     * Record active voice count
     */
    recordVoiceCount(count) {
        if (!this.enabled) return;
        
        this.addMetric('voiceCount', count);
    }
    
    /**
     * Record CPU processing time
     */
    recordProcessingTime(time) {
        if (!this.enabled) return;
        
        this.addMetric('cpuTime', time);
    }
    
    /**
     * Get current metrics summary
     */
    getSummary() {
        const summary = {};
        
        for (const [key, values] of Object.entries(this.metrics)) {
            if (Array.isArray(values) && values.length > 0) {
                const recent = values.slice(-10); // Last 10 samples
                const nums = recent.map(v => v.value);
                
                summary[key] = {
                    current: nums[nums.length - 1],
                    average: nums.reduce((a, b) => a + b, 0) / nums.length,
                    min: Math.min(...nums),
                    max: Math.max(...nums)
                };
            } else if (typeof values === 'number') {
                summary[key] = values;
            }
        }
        
        return summary;
    }
    
    /**
     * Get performance score (0-100)
     */
    getPerformanceScore() {
        const summary = this.getSummary();
        let score = 100;
        
        // Deduct for low FPS
        if (summary.fps && summary.fps.average < 60) {
            score -= Math.min(30, (60 - summary.fps.average) * 2);
        }
        
        // Deduct for high latency
        if (summary.audioLatency && summary.audioLatency.average > 30) {
            score -= Math.min(30, (summary.audioLatency.average - 30));
        }
        
        // Deduct for underruns
        if (this.metrics.bufferUnderruns > 0) {
            score -= Math.min(20, this.metrics.bufferUnderruns * 5);
        }
        
        // Deduct for high CPU
        if (summary.cpuTime && summary.cpuTime.average > 10) {
            score -= Math.min(20, (summary.cpuTime.average - 10) * 2);
        }
        
        return Math.max(0, Math.round(score));
    }
    
    /**
     * Export metrics for analysis
     */
    exportMetrics() {
        return {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            summary: this.getSummary(),
            score: this.getPerformanceScore()
        };
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        for (const key in this.metrics) {
            if (Array.isArray(this.metrics[key])) {
                this.metrics[key] = [];
            } else {
                this.metrics[key] = 0;
            }
        }
    }
    
    /**
     * Create performance HUD element
     */
    createHUD() {
        const hud = document.createElement('div');
        hud.id = 'performance-hud';
        hud.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 4px;
            z-index: 10000;
            min-width: 200px;
            display: none;
        `;
        
        document.body.appendChild(hud);
        
        // Update HUD periodically
        setInterval(() => {
            if (hud.style.display !== 'none') {
                this.updateHUD(hud);
            }
        }, 250);
        
        return hud;
    }
    
    /**
     * Update HUD display
     */
    updateHUD(hud) {
        const summary = this.getSummary();
        const score = this.getPerformanceScore();
        
        let html = '<strong>PERFORMANCE</strong><br>';
        html += '─'.repeat(20) + '<br>';
        
        if (summary.fps) {
            html += `FPS: ${summary.fps.current.toFixed(1)}<br>`;
        }
        
        if (summary.audioLatency) {
            html += `Latency: ${summary.audioLatency.current.toFixed(1)}ms<br>`;
        }
        
        if (summary.voiceCount) {
            html += `Voices: ${summary.voiceCount.current}<br>`;
        }
        
        if (summary.memoryUsage) {
            html += `Memory: ${summary.memoryUsage.current.toFixed(1)}MB<br>`;
        }
        
        if (this.metrics.bufferUnderruns > 0) {
            html += `<span style="color:#f00">Underruns: ${this.metrics.bufferUnderruns}</span><br>`;
        }
        
        html += '─'.repeat(20) + '<br>';
        
        const scoreColor = score > 80 ? '#0f0' : score > 60 ? '#ff0' : '#f00';
        html += `Score: <span style="color:${scoreColor}">${score}/100</span>`;
        
        hud.innerHTML = html;
    }
    
    /**
     * Toggle HUD visibility
     */
    toggleHUD() {
        let hud = document.getElementById('performance-hud');
        if (!hud) {
            hud = this.createHUD();
        }
        
        hud.style.display = hud.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * AudioWorklet performance integration
 */
export const performanceWorkletCode = `
class PerformanceProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastProcessTime = 0;
        this.processCount = 0;
        this.underrunDetected = false;
    }
    
    process(inputs, outputs, parameters) {
        const startTime = performance.now();
        
        // Check for potential underrun
        const timeSinceLastProcess = startTime - this.lastProcessTime;
        if (this.lastProcessTime > 0 && timeSinceLastProcess > 15) {
            // More than 15ms since last process - potential underrun
            this.port.postMessage({
                type: 'underrun',
                gap: timeSinceLastProcess
            });
        }
        
        // Measure processing time periodically
        if (++this.processCount % 100 === 0) {
            const processingTime = performance.now() - startTime;
            this.port.postMessage({
                type: 'timing',
                processingTime,
                currentTime: currentTime,
                sampleRate: sampleRate
            });
        }
        
        this.lastProcessTime = startTime;
        return true;
    }
}

registerProcessor('performance-processor', PerformanceProcessor);
`;

/**
 * Integration helper
 */
export function integratePerformanceMonitoring(awePlayer, audioContext) {
    const monitor = new AWEPlayerPerformanceMonitor({
        enabled: true,
        sampleInterval: 1000
    });
    
    // Set up callbacks
    monitor.callbacks.onUnderrun = () => {
        console.warn('🔴 Audio buffer underrun detected!');
    };
    
    monitor.callbacks.onHighLatency = (latency) => {
        console.warn(`⚠️ High audio latency: ${latency.toFixed(1)}ms`);
    };
    
    monitor.callbacks.onLowFPS = (fps) => {
        console.warn(`⚠️ Low FPS: ${fps.toFixed(1)}`);
    };
    
    // Create keyboard shortcut for HUD
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            monitor.toggleHUD();
        }
    });
    
    // Start monitoring
    monitor.start();
    
    console.log('✅ Performance monitoring enabled (Ctrl+Shift+P for HUD)');
    
    return monitor;
}