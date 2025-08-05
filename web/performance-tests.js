/**
 * AWE Player - Performance Test Suite (Task 18.2)
 * 
 * Automated performance tests to validate optimizations
 */

export class PerformanceTestSuite {
    constructor(awePlayer, audioContext) {
        this.awePlayer = awePlayer;
        this.audioContext = audioContext;
        this.results = [];
    }
    
    /**
     * Run all performance tests
     */
    async runAllTests() {
        console.log('🏃 Running AWE Player Performance Test Suite...\n');
        
        const tests = [
            { name: 'WASM Function Call Overhead', fn: () => this.testWASMCallOverhead() },
            { name: 'Voice Allocation Performance', fn: () => this.testVoiceAllocation() },
            { name: 'Effects Processing Overhead', fn: () => this.testEffectsOverhead() },
            { name: 'Memory Allocation Patterns', fn: () => this.testMemoryPatterns() },
            { name: 'Polyphonic Scaling', fn: () => this.testPolyphonicScaling() },
            { name: 'MIDI Event Processing', fn: () => this.testMIDIProcessing() },
            { name: 'Audio Buffer Processing', fn: () => this.testAudioBufferProcessing() },
            { name: 'UI Update Performance', fn: () => this.testUIUpdates() }
        ];
        
        for (const test of tests) {
            console.log(`\n📊 ${test.name}`);
            console.log('─'.repeat(50));
            
            try {
                const result = await test.fn();
                this.results.push({ name: test.name, ...result });
                this.printResult(result);
            } catch (error) {
                console.error(`❌ Test failed: ${error.message}`);
                this.results.push({ name: test.name, error: error.message });
            }
        }
        
        this.printSummary();
        return this.results;
    }
    
    /**
     * Test WASM function call overhead
     */
    async testWASMCallOverhead() {
        const iterations = 10000;
        const functions = [
            { name: 'get_active_voice_count', fn: () => this.awePlayer.get_active_voice_count() },
            { name: 'get_reverb_level', fn: () => this.awePlayer.get_reverb_level() },
            { name: 'get_chorus_level', fn: () => this.awePlayer.get_chorus_level() }
        ];
        
        const results = {};
        
        for (const { name, fn } of functions) {
            // Warmup
            for (let i = 0; i < 100; i++) fn();
            
            // Measure
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                fn();
            }
            const elapsed = performance.now() - start;
            
            results[name] = {
                totalTime: elapsed,
                avgTime: elapsed / iterations,
                opsPerSecond: (iterations / elapsed) * 1000
            };
        }
        
        return {
            iterations,
            functions: results,
            recommendation: this.analyzeWASMOverhead(results)
        };
    }
    
    /**
     * Test voice allocation performance
     */
    async testVoiceAllocation() {
        const testCases = [1, 8, 16, 32];
        const results = [];
        
        for (const voiceCount of testCases) {
            // Clear all voices
            for (let i = 0; i < 128; i++) {
                this.awePlayer.note_off(i);
            }
            await this.wait(100);
            
            // Measure allocation time
            const start = performance.now();
            
            for (let i = 0; i < voiceCount; i++) {
                this.awePlayer.note_on(48 + i, 100);
            }
            
            const allocationTime = performance.now() - start;
            
            // Measure processing time
            const processStart = performance.now();
            for (let i = 0; i < 100; i++) {
                this.awePlayer.process_audio();
            }
            const processTime = performance.now() - processStart;
            
            results.push({
                voiceCount,
                allocationTime,
                avgAllocationTime: allocationTime / voiceCount,
                processTime,
                avgProcessTime: processTime / 100
            });
            
            // Cleanup
            for (let i = 0; i < voiceCount; i++) {
                this.awePlayer.note_off(48 + i);
            }
        }
        
        return {
            results,
            scalingFactor: this.calculateScalingFactor(results),
            recommendation: this.analyzeVoiceScaling(results)
        };
    }
    
    /**
     * Test effects processing overhead
     */
    async testEffectsOverhead() {
        const voiceCount = 8;
        const iterations = 1000;
        
        // Setup test voices
        for (let i = 0; i < voiceCount; i++) {
            this.awePlayer.note_on(60 + i, 100);
        }
        await this.wait(100);
        
        const scenarios = [
            { name: 'No Effects', reverb: 0, chorus: 0 },
            { name: 'Reverb Only', reverb: 64, chorus: 0 },
            { name: 'Chorus Only', reverb: 0, chorus: 64 },
            { name: 'Both Effects', reverb: 64, chorus: 64 },
            { name: 'Max Effects', reverb: 127, chorus: 127 }
        ];
        
        const results = [];
        
        for (const scenario of scenarios) {
            // Set effect levels
            this.awePlayer.set_reverb_level(scenario.reverb);
            this.awePlayer.set_chorus_level(scenario.chorus);
            await this.wait(50);
            
            // Measure processing time
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                this.awePlayer.process_audio();
            }
            const elapsed = performance.now() - start;
            
            results.push({
                ...scenario,
                totalTime: elapsed,
                avgTime: elapsed / iterations,
                overhead: 0 // Will be calculated relative to baseline
            });
        }
        
        // Calculate overhead relative to no effects
        const baseline = results[0].avgTime;
        results.forEach(r => {
            r.overhead = ((r.avgTime - baseline) / baseline) * 100;
        });
        
        // Cleanup
        for (let i = 0; i < voiceCount; i++) {
            this.awePlayer.note_off(60 + i);
        }
        
        return {
            results,
            recommendation: this.analyzeEffectsOverhead(results)
        };
    }
    
    /**
     * Test memory allocation patterns
     */
    async testMemoryPatterns() {
        if (!performance.memory) {
            return { error: 'Memory API not available' };
        }
        
        const duration = 10000; // 10 seconds
        const sampleInterval = 100; // Sample every 100ms
        const samples = [];
        
        const initialMemory = performance.memory.usedJSHeapSize;
        
        // Start stress test
        const stressTest = setInterval(() => {
            // Rapid note on/off
            for (let i = 0; i < 5; i++) {
                const note = 48 + Math.floor(Math.random() * 48);
                this.awePlayer.note_on(note, 100);
                setTimeout(() => this.awePlayer.note_off(note), 200);
            }
        }, 50);
        
        // Sample memory usage
        const startTime = performance.now();
        while (performance.now() - startTime < duration) {
            samples.push({
                time: performance.now() - startTime,
                memory: performance.memory.usedJSHeapSize,
                delta: performance.memory.usedJSHeapSize - initialMemory
            });
            await this.wait(sampleInterval);
        }
        
        clearInterval(stressTest);
        
        // Analyze results
        const maxMemory = Math.max(...samples.map(s => s.memory));
        const finalMemory = samples[samples.length - 1].memory;
        const totalGrowth = finalMemory - initialMemory;
        const growthRate = totalGrowth / (duration / 1000); // bytes per second
        
        // Force GC if available and wait
        if (global.gc) global.gc();
        await this.wait(1000);
        
        const afterGCMemory = performance.memory.usedJSHeapSize;
        const leaked = afterGCMemory - initialMemory;
        
        return {
            duration,
            samples: samples.length,
            initialMemory: this.formatBytes(initialMemory),
            peakMemory: this.formatBytes(maxMemory),
            finalMemory: this.formatBytes(finalMemory),
            totalGrowth: this.formatBytes(totalGrowth),
            growthRate: this.formatBytes(growthRate) + '/s',
            potentialLeak: leaked > 1024 * 1024, // More than 1MB
            leakedAmount: this.formatBytes(leaked),
            recommendation: this.analyzeMemoryPattern(samples, leaked)
        };
    }
    
    /**
     * Test polyphonic scaling
     */
    async testPolyphonicScaling() {
        const voiceCounts = [1, 2, 4, 8, 16, 32];
        const iterations = 500;
        const results = [];
        
        for (const count of voiceCounts) {
            // Start voices
            for (let i = 0; i < count; i++) {
                this.awePlayer.note_on(36 + (i % 48), 80 + (i % 40));
            }
            await this.wait(100);
            
            // Measure processing time
            const times = [];
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                this.awePlayer.process_audio();
                times.push(performance.now() - start);
            }
            
            // Calculate statistics
            times.sort((a, b) => a - b);
            const avg = times.reduce((a, b) => a + b) / times.length;
            const p95 = times[Math.floor(times.length * 0.95)];
            const p99 = times[Math.floor(times.length * 0.99)];
            
            results.push({
                voiceCount: count,
                avgTime: avg,
                p95Time: p95,
                p99Time: p99,
                maxTime: times[times.length - 1]
            });
            
            // Stop voices
            for (let i = 0; i < count; i++) {
                this.awePlayer.note_off(36 + (i % 48));
            }
            await this.wait(100);
        }
        
        return {
            results,
            linearScaling: this.checkLinearScaling(results),
            recommendation: this.analyzePolyphonicScaling(results)
        };
    }
    
    /**
     * Test MIDI event processing
     */
    async testMIDIProcessing() {
        const eventTypes = [
            { name: 'Note On/Off', 
              fn: () => {
                  this.awePlayer.note_on(60, 100);
                  this.awePlayer.note_off(60);
              }
            },
            { name: 'Control Change',
              fn: () => {
                  this.awePlayer.control_change(1, 64); // Modulation
                  this.awePlayer.control_change(91, 64); // Reverb
              }
            },
            { name: 'Program Change',
              fn: () => {
                  this.awePlayer.program_change(0);
              }
            },
            { name: 'Pitch Bend',
              fn: () => {
                  this.awePlayer.pitch_bend(8192); // Center
              }
            }
        ];
        
        const iterations = 5000;
        const results = {};
        
        for (const { name, fn } of eventTypes) {
            // Warmup
            for (let i = 0; i < 100; i++) fn();
            
            // Measure
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                fn();
            }
            const elapsed = performance.now() - start;
            
            results[name] = {
                totalTime: elapsed,
                avgTime: elapsed / iterations,
                eventsPerSecond: (iterations / elapsed) * 1000
            };
        }
        
        // Test rapid event stream
        const rapidStart = performance.now();
        for (let i = 0; i < 1000; i++) {
            const note = 36 + (i % 48);
            this.awePlayer.note_on(note, 100);
            this.awePlayer.note_off(note);
            this.awePlayer.control_change(1, i % 128);
        }
        const rapidElapsed = performance.now() - rapidStart;
        
        return {
            eventTypes: results,
            rapidStream: {
                events: 3000, // 1000 * 3 events
                time: rapidElapsed,
                eventsPerSecond: (3000 / rapidElapsed) * 1000
            },
            recommendation: this.analyzeMIDIPerformance(results, rapidElapsed)
        };
    }
    
    /**
     * Test audio buffer processing
     */
    async testAudioBufferProcessing() {
        const bufferSizes = [128, 256, 512, 1024, 2048];
        const results = [];
        
        // Test with 16 voices active
        for (let i = 0; i < 16; i++) {
            this.awePlayer.note_on(48 + i, 100);
        }
        await this.wait(100);
        
        for (const bufferSize of bufferSizes) {
            const iterations = Math.floor(10000 / bufferSize) * bufferSize; // Normalize iterations
            
            const start = performance.now();
            for (let i = 0; i < iterations / bufferSize; i++) {
                // Simulate processing bufferSize samples
                for (let j = 0; j < bufferSize / 128; j++) {
                    this.awePlayer.process_audio();
                }
            }
            const elapsed = performance.now() - start;
            
            const samplesPerSecond = (iterations / elapsed) * 1000;
            const latency = (bufferSize / 44100) * 1000; // ms
            
            results.push({
                bufferSize,
                iterations,
                totalTime: elapsed,
                samplesPerSecond,
                latency,
                cpuUsage: (elapsed / (iterations / 44100 * 1000)) * 100 // Percentage
            });
        }
        
        // Cleanup
        for (let i = 0; i < 16; i++) {
            this.awePlayer.note_off(48 + i);
        }
        
        return {
            results,
            optimalBufferSize: this.findOptimalBufferSize(results),
            recommendation: this.analyzeBufferPerformance(results)
        };
    }
    
    /**
     * Test UI update performance
     */
    async testUIUpdates() {
        const updateRates = [60, 30, 15, 10]; // FPS
        const duration = 5000; // 5 seconds per test
        const results = [];
        
        for (const targetFPS of updateRates) {
            const interval = 1000 / targetFPS;
            const updates = [];
            let frameCount = 0;
            
            // Simulate UI updates
            const startTime = performance.now();
            const updateLoop = setInterval(() => {
                const frameStart = performance.now();
                
                // Simulate typical UI updates
                this.simulateUIUpdate();
                
                const frameTime = performance.now() - frameStart;
                updates.push(frameTime);
                frameCount++;
            }, interval);
            
            await this.wait(duration);
            clearInterval(updateLoop);
            
            const totalTime = performance.now() - startTime;
            const actualFPS = (frameCount / totalTime) * 1000;
            
            // Calculate statistics
            updates.sort((a, b) => a - b);
            const avgUpdate = updates.reduce((a, b) => a + b) / updates.length;
            const p95Update = updates[Math.floor(updates.length * 0.95)];
            
            results.push({
                targetFPS,
                actualFPS,
                frameCount,
                avgUpdateTime: avgUpdate,
                p95UpdateTime: p95Update,
                maxUpdateTime: updates[updates.length - 1],
                jank: updates.filter(t => t > interval * 1.5).length
            });
        }
        
        return {
            results,
            recommendation: this.analyzeUIPerformance(results)
        };
    }
    
    // Helper methods
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }
    
    simulateUIUpdate() {
        // Simulate reading state
        const voiceCount = this.awePlayer.get_active_voice_count();
        const reverbLevel = this.awePlayer.get_reverb_level();
        const chorusLevel = this.awePlayer.get_chorus_level();
        
        // Simulate DOM updates (without actually updating)
        const calc = Math.sqrt(voiceCount) * reverbLevel + chorusLevel;
    }
    
    calculateScalingFactor(results) {
        if (results.length < 2) return 1;
        
        const first = results[0];
        const last = results[results.length - 1];
        
        return last.avgProcessTime / first.avgProcessTime;
    }
    
    checkLinearScaling(results) {
        // Check if processing time scales linearly with voice count
        const ratios = [];
        for (let i = 1; i < results.length; i++) {
            const ratio = results[i].avgTime / results[0].avgTime;
            const expectedRatio = results[i].voiceCount / results[0].voiceCount;
            ratios.push(ratio / expectedRatio);
        }
        
        const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;
        return Math.abs(avgRatio - 1) < 0.2; // Within 20% of linear
    }
    
    findOptimalBufferSize(results) {
        // Balance between latency and CPU usage
        let bestScore = Infinity;
        let optimal = 512;
        
        for (const result of results) {
            // Score = latency + cpu penalty
            const score = result.latency + (result.cpuUsage > 50 ? result.cpuUsage : 0);
            if (score < bestScore) {
                bestScore = score;
                optimal = result.bufferSize;
            }
        }
        
        return optimal;
    }
    
    // Analysis methods
    
    analyzeWASMOverhead(results) {
        const avgOps = Object.values(results)
            .map(r => r.opsPerSecond)
            .reduce((a, b) => a + b) / Object.keys(results).length;
        
        if (avgOps > 1000000) {
            return '✅ WASM call overhead is negligible';
        } else if (avgOps > 100000) {
            return '⚠️ Consider batching WASM calls for better performance';
        } else {
            return '❌ High WASM call overhead detected - batch operations required';
        }
    }
    
    analyzeVoiceScaling(results) {
        const scaling = this.calculateScalingFactor(results);
        
        if (scaling < 20) {
            return '✅ Voice allocation scales well';
        } else if (scaling < 40) {
            return '⚠️ Voice allocation has moderate overhead';
        } else {
            return '❌ Voice allocation has significant overhead - optimization needed';
        }
    }
    
    analyzeEffectsOverhead(results) {
        const maxOverhead = Math.max(...results.map(r => r.overhead));
        
        if (maxOverhead < 20) {
            return '✅ Effects processing overhead is acceptable';
        } else if (maxOverhead < 50) {
            return '⚠️ Consider optimizing effects processing';
        } else {
            return '❌ High effects overhead - optimization required';
        }
    }
    
    analyzeMemoryPattern(samples, leaked) {
        if (leaked > 10 * 1024 * 1024) {
            return '❌ Significant memory leak detected - investigate object lifecycle';
        } else if (leaked > 1024 * 1024) {
            return '⚠️ Potential memory leak - monitor in longer sessions';
        } else {
            return '✅ Memory usage is stable';
        }
    }
    
    analyzePolyphonicScaling(results) {
        const linear = this.checkLinearScaling(results);
        
        if (linear) {
            return '✅ Processing scales linearly with voice count';
        } else {
            return '⚠️ Non-linear scaling detected - check voice processing';
        }
    }
    
    analyzeMIDIPerformance(results, rapidTime) {
        const eventsPerSecond = (3000 / rapidTime) * 1000;
        
        if (eventsPerSecond > 50000) {
            return '✅ MIDI processing is highly optimized';
        } else if (eventsPerSecond > 10000) {
            return '⚠️ MIDI processing is adequate for normal use';
        } else {
            return '❌ MIDI processing bottleneck detected';
        }
    }
    
    analyzeBufferPerformance(results) {
        const optimal = this.findOptimalBufferSize(results);
        
        return `✅ Optimal buffer size: ${optimal} samples (${(optimal/44100*1000).toFixed(1)}ms latency)`;
    }
    
    analyzeUIPerformance(results) {
        const jankTotal = results.reduce((sum, r) => sum + r.jank, 0);
        
        if (jankTotal === 0) {
            return '✅ UI updates are smooth';
        } else if (jankTotal < 10) {
            return '⚠️ Minor UI jank detected';
        } else {
            return '❌ Significant UI jank - reduce update frequency or optimize';
        }
    }
    
    // Output methods
    
    printResult(result) {
        if (result.error) {
            console.error(`❌ Error: ${result.error}`);
            return;
        }
        
        // Print results in a structured way
        for (const [key, value] of Object.entries(result)) {
            if (key === 'recommendation') {
                console.log(`\n${value}`);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                console.log(`\n${key}:`);
                for (const [k, v] of Object.entries(value)) {
                    console.log(`  ${k}: ${typeof v === 'number' ? v.toFixed(3) : v}`);
                }
            } else if (!Array.isArray(value)) {
                console.log(`${key}: ${value}`);
            }
        }
    }
    
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PERFORMANCE TEST SUMMARY');
        console.log('='.repeat(60));
        
        let passed = 0;
        let warnings = 0;
        let failures = 0;
        
        for (const result of this.results) {
            if (result.error) {
                failures++;
            } else if (result.recommendation) {
                if (result.recommendation.includes('✅')) passed++;
                else if (result.recommendation.includes('⚠️')) warnings++;
                else if (result.recommendation.includes('❌')) failures++;
            }
        }
        
        console.log(`\n✅ Passed: ${passed}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`❌ Failed: ${failures}`);
        
        const score = Math.round((passed / this.results.length) * 100);
        console.log(`\n🎯 Performance Score: ${score}/100`);
        
        if (score >= 80) {
            console.log('🎉 Excellent performance!');
        } else if (score >= 60) {
            console.log('👍 Good performance with room for improvement');
        } else {
            console.log('⚠️ Performance optimization recommended');
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceTestSuite;
}