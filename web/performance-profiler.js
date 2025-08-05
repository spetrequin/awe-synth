/**
 * AWE Player - Performance Profiler (Task 18.2)
 * 
 * Comprehensive performance profiling and optimization toolkit
 * for the AWE Player EMU8000 emulator.
 */

class AWEPlayerPerformanceProfiler {
    constructor() {
        this.metrics = {
            frameTime: [],
            audioLatency: [],
            wasmCallTime: [],
            jsCallTime: [],
            memoryUsage: [],
            voiceProcessingTime: [],
            effectsProcessingTime: [],
            renderingTime: []
        };
        
        this.config = {
            sampleSize: 1000,
            warmupFrames: 100,
            profileDuration: 30000, // 30 seconds
            detailedLogging: false
        };
        
        this.isProfileing = false;
        this.startTime = 0;
        this.frameCount = 0;
        this.audioContext = null;
        this.wasmModule = null;
        
        // Performance marks
        this.marks = new Map();
        this.measures = [];
    }
    
    /**
     * Initialize profiler with AWE Player instance
     */
    async initialize(awePlayer, audioContext) {
        this.wasmModule = awePlayer;
        this.audioContext = audioContext;
        
        // Clear any existing data
        this.reset();
        
        // Set up performance observer
        if (typeof PerformanceObserver !== 'undefined') {
            this.observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.processPerfEntry(entry);
                }
            });
            
            this.observer.observe({ entryTypes: ['measure', 'mark'] });
        }
        
        console.log('🎯 Performance profiler initialized');
        return true;
    }
    
    /**
     * Start profiling session
     */
    startProfiling(options = {}) {
        if (this.isProfileing) {
            console.warn('Profiling already in progress');
            return;
        }
        
        Object.assign(this.config, options);
        
        this.isProfileing = true;
        this.startTime = performance.now();
        this.frameCount = 0;
        
        console.log('📊 Starting performance profiling...');
        console.log(`   Duration: ${this.config.profileDuration}ms`);
        console.log(`   Sample size: ${this.config.sampleSize}`);
        
        // Start monitoring
        this.startMemoryMonitoring();
        this.startFrameTimeMonitoring();
        this.startAudioLatencyMonitoring();
        this.startWASMMonitoring();
        
        // Auto-stop after duration
        setTimeout(() => {
            this.stopProfiling();
        }, this.config.profileDuration);
    }
    
    /**
     * Stop profiling and generate report
     */
    stopProfiling() {
        if (!this.isProfileing) {
            return null;
        }
        
        this.isProfileing = false;
        const duration = performance.now() - this.startTime;
        
        console.log('🏁 Profiling complete');
        
        // Generate comprehensive report
        const report = this.generateReport(duration);
        
        // Save detailed data if requested
        if (this.config.saveRawData) {
            this.saveRawData(report);
        }
        
        return report;
    }
    
    /**
     * Monitor memory usage patterns
     */
    startMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('Memory profiling not available in this browser');
            return;
        }
        
        const measureMemory = () => {
            if (!this.isProfileing) return;
            
            const memory = {
                timestamp: performance.now() - this.startTime,
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
            
            this.metrics.memoryUsage.push(memory);
            
            // Continue monitoring
            requestAnimationFrame(measureMemory);
        };
        
        measureMemory();
    }
    
    /**
     * Monitor frame rendering times
     */
    startFrameTimeMonitoring() {
        let lastFrameTime = performance.now();
        
        const measureFrame = () => {
            if (!this.isProfileing) return;
            
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;
            
            this.frameCount++;
            
            // Skip warmup frames
            if (this.frameCount > this.config.warmupFrames) {
                this.metrics.frameTime.push(frameTime);
            }
            
            requestAnimationFrame(measureFrame);
        };
        
        requestAnimationFrame(measureFrame);
    }
    
    /**
     * Monitor audio processing latency
     */
    startAudioLatencyMonitoring() {
        if (!this.audioContext) return;
        
        // Create a simple latency measurement using AudioWorklet timestamp
        const measureLatency = () => {
            if (!this.isProfileing) return;
            
            const outputLatency = this.audioContext.outputLatency || 0;
            const baseLatency = this.audioContext.baseLatency || 0;
            const currentTime = this.audioContext.currentTime;
            
            this.metrics.audioLatency.push({
                timestamp: performance.now() - this.startTime,
                outputLatency: outputLatency * 1000, // Convert to ms
                baseLatency: baseLatency * 1000,
                contextTime: currentTime
            });
            
            setTimeout(measureLatency, 100); // Sample every 100ms
        };
        
        measureLatency();
    }
    
    /**
     * Monitor WASM function call performance
     */
    startWASMMonitoring() {
        if (!this.wasmModule) return;
        
        // Wrap critical WASM functions with performance monitoring
        const criticalFunctions = [
            'process_audio',
            'handle_midi_event',
            'update_voice',
            'apply_effects'
        ];
        
        criticalFunctions.forEach(funcName => {
            const originalFunc = this.wasmModule[funcName];
            if (originalFunc) {
                this.wasmModule[funcName] = (...args) => {
                    const startTime = performance.now();
                    const result = originalFunc.apply(this.wasmModule, args);
                    const endTime = performance.now();
                    
                    if (this.isProfileing) {
                        this.metrics.wasmCallTime.push({
                            function: funcName,
                            duration: endTime - startTime,
                            timestamp: endTime - this.startTime
                        });
                    }
                    
                    return result;
                };
            }
        });
    }
    
    /**
     * Performance marking utilities
     */
    mark(name) {
        performance.mark(name);
        this.marks.set(name, performance.now());
    }
    
    measure(name, startMark, endMark) {
        try {
            performance.measure(name, startMark, endMark);
        } catch (e) {
            // Fallback for browsers without performance.measure
            const start = this.marks.get(startMark) || 0;
            const end = this.marks.get(endMark) || performance.now();
            this.measures.push({
                name,
                duration: end - start,
                startTime: start
            });
        }
    }
    
    /**
     * Process performance entries
     */
    processPerfEntry(entry) {
        if (!this.isProfileing) return;
        
        if (entry.entryType === 'measure') {
            // Categorize measurements
            if (entry.name.includes('voice')) {
                this.metrics.voiceProcessingTime.push({
                    duration: entry.duration,
                    timestamp: entry.startTime - this.startTime
                });
            } else if (entry.name.includes('effect')) {
                this.metrics.effectsProcessingTime.push({
                    duration: entry.duration,
                    timestamp: entry.startTime - this.startTime
                });
            } else if (entry.name.includes('render')) {
                this.metrics.renderingTime.push({
                    duration: entry.duration,
                    timestamp: entry.startTime - this.startTime
                });
            }
        }
    }
    
    /**
     * Calculate statistics for a metric array
     */
    calculateStats(data, valueExtractor = (d) => d) {
        if (!data || data.length === 0) {
            return {
                count: 0,
                mean: 0,
                median: 0,
                min: 0,
                max: 0,
                stdDev: 0,
                p95: 0,
                p99: 0
            };
        }
        
        const values = data.map(valueExtractor).sort((a, b) => a - b);
        const count = values.length;
        
        // Calculate mean
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        
        // Calculate median
        const median = count % 2 === 0
            ? (values[Math.floor(count / 2) - 1] + values[Math.floor(count / 2)]) / 2
            : values[Math.floor(count / 2)];
        
        // Calculate standard deviation
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
        const stdDev = Math.sqrt(avgSquaredDiff);
        
        // Calculate percentiles
        const p95Index = Math.floor(count * 0.95);
        const p99Index = Math.floor(count * 0.99);
        
        return {
            count,
            mean: mean.toFixed(3),
            median: median.toFixed(3),
            min: values[0].toFixed(3),
            max: values[count - 1].toFixed(3),
            stdDev: stdDev.toFixed(3),
            p95: values[p95Index].toFixed(3),
            p99: values[p99Index].toFixed(3)
        };
    }
    
    /**
     * Generate comprehensive performance report
     */
    generateReport(duration) {
        const report = {
            summary: {
                duration: duration,
                frameCount: this.frameCount,
                avgFPS: (this.frameCount / (duration / 1000)).toFixed(2)
            },
            frameTime: this.calculateStats(this.metrics.frameTime),
            audioLatency: this.calculateStats(
                this.metrics.audioLatency, 
                d => d.outputLatency + d.baseLatency
            ),
            memoryUsage: this.analyzeMemoryUsage(),
            wasmPerformance: this.analyzeWASMPerformance(),
            voiceProcessing: this.calculateStats(
                this.metrics.voiceProcessingTime,
                d => d.duration
            ),
            effectsProcessing: this.calculateStats(
                this.metrics.effectsProcessingTime,
                d => d.duration
            ),
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    /**
     * Analyze memory usage patterns
     */
    analyzeMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) {
            return { available: false };
        }
        
        const first = this.metrics.memoryUsage[0];
        const last = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        
        const growth = last.usedJSHeapSize - first.usedJSHeapSize;
        const growthRate = growth / (last.timestamp / 1000); // bytes per second
        
        return {
            initial: (first.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            final: (last.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            growth: (growth / 1024 / 1024).toFixed(2) + ' MB',
            growthRate: (growthRate / 1024).toFixed(2) + ' KB/s',
            peakUsage: (Math.max(...this.metrics.memoryUsage.map(m => m.usedJSHeapSize)) / 1024 / 1024).toFixed(2) + ' MB'
        };
    }
    
    /**
     * Analyze WASM function performance
     */
    analyzeWASMPerformance() {
        const functionStats = {};
        
        // Group by function name
        const grouped = this.metrics.wasmCallTime.reduce((acc, call) => {
            if (!acc[call.function]) {
                acc[call.function] = [];
            }
            acc[call.function].push(call.duration);
            return acc;
        }, {});
        
        // Calculate stats for each function
        for (const [func, durations] of Object.entries(grouped)) {
            functionStats[func] = this.calculateStats(durations);
        }
        
        return functionStats;
    }
    
    /**
     * Generate optimization recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Check frame time
        if (parseFloat(this.metrics.frameTime.p95) > 16.67) {
            recommendations.push({
                severity: 'high',
                category: 'rendering',
                issue: 'Frame time exceeds 60 FPS target',
                suggestion: 'Optimize rendering pipeline or reduce visual complexity'
            });
        }
        
        // Check audio latency
        const audioStats = this.calculateStats(
            this.metrics.audioLatency,
            d => d.outputLatency + d.baseLatency
        );
        if (parseFloat(audioStats.p95) > 50) {
            recommendations.push({
                severity: 'medium',
                category: 'audio',
                issue: 'High audio latency detected',
                suggestion: 'Consider reducing buffer size or optimizing audio processing'
            });
        }
        
        // Check memory growth
        const memAnalysis = this.analyzeMemoryUsage();
        if (memAnalysis.growthRate && parseFloat(memAnalysis.growthRate) > 100) {
            recommendations.push({
                severity: 'high',
                category: 'memory',
                issue: 'Potential memory leak detected',
                suggestion: 'Review object lifecycle and ensure proper cleanup'
            });
        }
        
        // Check WASM performance
        const wasmStats = this.analyzeWASMPerformance();
        for (const [func, stats] of Object.entries(wasmStats)) {
            if (parseFloat(stats.p95) > 1.0) {
                recommendations.push({
                    severity: 'medium',
                    category: 'wasm',
                    issue: `Slow WASM function: ${func}`,
                    suggestion: `Optimize ${func} implementation or reduce call frequency`
                });
            }
        }
        
        return recommendations;
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        for (const key in this.metrics) {
            this.metrics[key] = [];
        }
        this.marks.clear();
        this.measures = [];
        this.frameCount = 0;
    }
    
    /**
     * Save raw profiling data
     */
    saveRawData(report) {
        const data = {
            report,
            rawMetrics: this.metrics,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `awe-player-profile-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Run automated performance benchmark
     */
    async runBenchmark() {
        console.log('🏃 Running performance benchmark...');
        
        const benchmarks = [
            { name: 'Idle Performance', test: () => this.benchmarkIdle() },
            { name: 'Single Voice', test: () => this.benchmarkSingleVoice() },
            { name: '8 Voice Polyphony', test: () => this.benchmarkPolyphony(8) },
            { name: '16 Voice Polyphony', test: () => this.benchmarkPolyphony(16) },
            { name: '32 Voice Stress Test', test: () => this.benchmarkPolyphony(32) },
            { name: 'Effects Processing', test: () => this.benchmarkEffects() },
            { name: 'MIDI Processing', test: () => this.benchmarkMIDI() }
        ];
        
        const results = [];
        
        for (const benchmark of benchmarks) {
            console.log(`Running: ${benchmark.name}`);
            
            // Reset and warm up
            this.reset();
            await this.warmup();
            
            // Run benchmark
            const result = await benchmark.test();
            results.push({
                name: benchmark.name,
                ...result
            });
            
            // Cool down
            await this.cooldown();
        }
        
        return this.generateBenchmarkReport(results);
    }
    
    /**
     * Warmup before benchmark
     */
    async warmup() {
        // Process some dummy audio to warm up JIT
        for (let i = 0; i < 100; i++) {
            if (this.wasmModule && this.wasmModule.process_audio) {
                this.wasmModule.process_audio();
            }
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
    
    /**
     * Cool down after benchmark
     */
    async cooldown() {
        // Allow GC and stabilization
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Benchmark idle performance
     */
    async benchmarkIdle() {
        this.startProfiling({ profileDuration: 5000 });
        
        // Just let it run idle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        return this.stopProfiling();
    }
    
    /**
     * Benchmark single voice performance
     */
    async benchmarkSingleVoice() {
        this.startProfiling({ profileDuration: 5000 });
        
        // Play a single note
        if (this.wasmModule && this.wasmModule.note_on) {
            this.wasmModule.note_on(60, 100); // Middle C
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (this.wasmModule && this.wasmModule.note_off) {
            this.wasmModule.note_off(60);
        }
        
        return this.stopProfiling();
    }
    
    /**
     * Benchmark polyphonic performance
     */
    async benchmarkPolyphony(voiceCount) {
        this.startProfiling({ profileDuration: 5000 });
        
        // Play multiple notes
        const baseNote = 48; // C3
        for (let i = 0; i < voiceCount; i++) {
            if (this.wasmModule && this.wasmModule.note_on) {
                const note = baseNote + (i % 24); // Spread over 2 octaves
                this.wasmModule.note_on(note, 80 + (i % 40));
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Stop all notes
        for (let i = 0; i < voiceCount; i++) {
            if (this.wasmModule && this.wasmModule.note_off) {
                const note = baseNote + (i % 24);
                this.wasmModule.note_off(note);
            }
        }
        
        return this.stopProfiling();
    }
    
    /**
     * Benchmark effects processing
     */
    async benchmarkEffects() {
        this.startProfiling({ profileDuration: 5000 });
        
        // Enable effects at various levels
        if (this.wasmModule) {
            // Set reverb to 50%
            if (this.wasmModule.set_reverb_level) {
                this.wasmModule.set_reverb_level(64);
            }
            
            // Set chorus to 50%
            if (this.wasmModule.set_chorus_level) {
                this.wasmModule.set_chorus_level(64);
            }
        }
        
        // Play some notes with effects
        await this.benchmarkPolyphony(8);
        
        return this.stopProfiling();
    }
    
    /**
     * Benchmark MIDI processing
     */
    async benchmarkMIDI() {
        this.startProfiling({ profileDuration: 5000 });
        
        // Simulate rapid MIDI events
        const midiEvents = [
            { type: 'note_on', note: 60, velocity: 100 },
            { type: 'note_off', note: 60 },
            { type: 'cc', controller: 1, value: 64 }, // Modulation
            { type: 'cc', controller: 91, value: 64 }, // Reverb
            { type: 'program_change', program: 0 }
        ];
        
        // Send many MIDI events rapidly
        for (let i = 0; i < 1000; i++) {
            const event = midiEvents[i % midiEvents.length];
            
            if (this.wasmModule) {
                switch (event.type) {
                    case 'note_on':
                        if (this.wasmModule.note_on) {
                            this.wasmModule.note_on(event.note + (i % 12), event.velocity);
                        }
                        break;
                    case 'note_off':
                        if (this.wasmModule.note_off) {
                            this.wasmModule.note_off(event.note + (i % 12));
                        }
                        break;
                    case 'cc':
                        if (this.wasmModule.control_change) {
                            this.wasmModule.control_change(event.controller, event.value);
                        }
                        break;
                    case 'program_change':
                        if (this.wasmModule.program_change) {
                            this.wasmModule.program_change(event.program);
                        }
                        break;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        return this.stopProfiling();
    }
    
    /**
     * Generate benchmark report
     */
    generateBenchmarkReport(results) {
        let report = '\n🎯 AWE Player Performance Benchmark Report\n';
        report += '=' .repeat(60) + '\n\n';
        
        for (const result of results) {
            report += `📊 ${result.name}\n`;
            report += '-'.repeat(40) + '\n';
            
            // Summary metrics
            report += `Average FPS: ${result.summary.avgFPS}\n`;
            report += `Frame Time (p95): ${result.frameTime.p95}ms\n`;
            
            if (result.audioLatency.count > 0) {
                report += `Audio Latency (p95): ${result.audioLatency.p95}ms\n`;
            }
            
            if (result.memoryUsage.growth) {
                report += `Memory Growth: ${result.memoryUsage.growth}\n`;
            }
            
            // Recommendations
            if (result.recommendations.length > 0) {
                report += '\n⚠️ Issues:\n';
                for (const rec of result.recommendations) {
                    report += `  - [${rec.severity.toUpperCase()}] ${rec.issue}\n`;
                }
            }
            
            report += '\n';
        }
        
        // Overall summary
        report += '📈 Overall Performance Summary\n';
        report += '=' .repeat(60) + '\n';
        
        const avgFPS = results.reduce((sum, r) => sum + parseFloat(r.summary.avgFPS), 0) / results.length;
        report += `Average FPS across all tests: ${avgFPS.toFixed(2)}\n`;
        
        const criticalIssues = results.flatMap(r => r.recommendations.filter(rec => rec.severity === 'high'));
        if (criticalIssues.length > 0) {
            report += `\n🚨 Critical issues found: ${criticalIssues.length}\n`;
        } else {
            report += '\n✅ No critical performance issues detected\n';
        }
        
        return report;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AWEPlayerPerformanceProfiler;
}