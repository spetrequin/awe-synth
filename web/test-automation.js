/**
 * AWE Player - Automated Integration Test Runner (Task 18.1)
 * 
 * Companion script for comprehensive integration testing
 * Can be used for CI/CD pipelines and automated validation
 */

class AWEPlayerTestRunner {
    constructor(options = {}) {
        this.options = {
            timeout: options.timeout || 30000,
            verbose: options.verbose || false,
            outputFormat: options.outputFormat || 'console', // 'console', 'json', 'junit'
            failFast: options.failFast || false,
            includePerformance: options.includePerformance || true,
            ...options
        };
        
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            tests: [],
            errors: [],
            performance: {}
        };
        
        this.wasmModule = null;
        this.startTime = 0;
    }
    
    /**
     * Initialize the test environment
     */
    async initialize() {
        this.log('🔧 Initializing AWE Player test environment...');
        this.startTime = performance.now();
        
        try {
            // Load WASM module
            const wasmPkg = await import('./wasm-pkg/awe_synth.js');
            await wasmPkg.default();
            this.wasmModule = wasmPkg;
            
            // Initialize audio worklet
            const initResult = wasmPkg.init_audio_worklet(44100);
            if (!initResult) {
                throw new Error('Failed to initialize WASM audio worklet');
            }
            
            this.log('✅ Test environment initialized successfully');
            return true;
        } catch (error) {
            this.log(`❌ Test environment initialization failed: ${error.message}`);
            this.results.errors.push({
                phase: 'initialization',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }
    
    /**
     * Run all integration tests
     */
    async runAllTests() {
        this.log('🚀 Starting comprehensive integration test suite...');
        
        const testSuites = [
            { name: 'Core WASM Functions', tests: this.getCoreWasmTests() },
            { name: 'MIDI System', tests: this.getMidiSystemTests() },
            { name: 'Audio Synthesis', tests: this.getAudioSynthesisTests() },
            { name: 'Effects System', tests: this.getEffectsSystemTests() },
            { name: 'UI Integration', tests: this.getUIIntegrationTests() },
            { name: 'End-to-End Pipeline', tests: this.getEndToEndTests() }
        ];
        
        if (this.options.includePerformance) {
            testSuites.push({ name: 'Performance & Stress', tests: this.getPerformanceTests() });
        }
        
        for (const suite of testSuites) {
            this.log(`\n📋 Running test suite: ${suite.name}`);
            await this.runTestSuite(suite.name, suite.tests);
            
            if (this.options.failFast && this.results.failed > 0) {
                this.log('⏹️ Stopping execution due to failFast option');
                break;
            }
        }
        
        this.results.duration = performance.now() - this.startTime;
        return this.generateReport();
    }
    
    /**
     * Run a specific test suite
     */
    async runTestSuite(suiteName, tests) {
        for (const test of tests) {
            const testResult = await this.runSingleTest(test, suiteName);
            this.results.tests.push(testResult);
            this.results.total++;
            
            if (testResult.passed) {
                this.results.passed++;
            } else if (testResult.skipped) {
                this.results.skipped++;
            } else {
                this.results.failed++;
            }
        }
    }
    
    /**
     * Run a single test
     */
    async runSingleTest(test, suiteName) {
        const startTime = performance.now();
        
        this.log(`  🧪 ${test.name}...`);
        
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Test timeout')), this.options.timeout)
            );
            
            const testPromise = test.execute(this.wasmModule);
            const result = await Promise.race([testPromise, timeoutPromise]);
            
            const duration = performance.now() - startTime;
            
            if (result === true) {
                this.log(`    ✅ PASSED (${duration.toFixed(1)}ms)`);
                return {
                    name: test.name,
                    suite: suiteName,
                    passed: true,
                    skipped: false,
                    duration: duration,
                    error: null
                };
            } else if (result === 'SKIP') {
                this.log(`    ⏭️ SKIPPED`);
                return {
                    name: test.name,
                    suite: suiteName,
                    passed: false,
                    skipped: true,
                    duration: duration,
                    error: null
                };
            } else {
                this.log(`    ❌ FAILED: ${result}`);
                return {
                    name: test.name,
                    suite: suiteName,
                    passed: false,
                    skipped: false,
                    duration: duration,
                    error: result
                };
            }
        } catch (error) {
            const duration = performance.now() - startTime;
            this.log(`    💥 ERROR: ${error.message}`);
            return {
                name: test.name,
                suite: suiteName,
                passed: false,
                skipped: false,
                duration: duration,
                error: error.message
            };
        }
    }
    
    /**
     * Core WASM function tests
     */
    getCoreWasmTests() {
        return [
            {
                name: 'WASM Module Loading',
                execute: async (wasm) => {
                    if (!wasm) return 'WASM module not loaded';
                    return true;
                }
            },
            {
                name: 'Required WASM Exports',
                execute: async (wasm) => {
                    const required = [
                        'init_audio_worklet',
                        'queue_midi_event_global',
                        'process_stereo_buffer_global',
                        'get_debug_log_global'
                    ];
                    
                    for (const func of required) {
                        if (!wasm[func]) {
                            return `Missing export: ${func}`;
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Debug Logging System',
                execute: async (wasm) => {
                    const log = wasm.get_debug_log_global();
                    if (typeof log !== 'string') {
                        return 'Debug log should return string';
                    }
                    return true;
                }
            }
        ];
    }
    
    /**
     * MIDI system tests
     */
    getMidiSystemTests() {
        return [
            {
                name: 'MIDI Event Queue',
                execute: async (wasm) => {
                    try {
                        wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                        wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                        return true;
                    } catch (error) {
                        return `MIDI queue error: ${error.message}`;
                    }
                }
            },
            {
                name: 'MIDI CC Effects Control',
                execute: async (wasm) => {
                    try {
                        wasm.queue_midi_event_global(0n, 0, 0xB0, 91, 127); // Reverb
                        wasm.queue_midi_event_global(0n, 0, 0xB0, 93, 64);  // Chorus
                        return true;
                    } catch (error) {
                        return `MIDI CC error: ${error.message}`;
                    }
                }
            },
            {
                name: 'WebMIDI Device Support',
                execute: async (wasm) => {
                    if (!navigator.requestMIDIAccess) {
                        return 'SKIP'; // Not supported
                    }
                    
                    try {
                        const access = await navigator.requestMIDIAccess();
                        return true;
                    } catch (error) {
                        return 'SKIP'; // Permission denied
                    }
                }
            }
        ];
    }
    
    /**
     * Audio synthesis tests
     */
    getAudioSynthesisTests() {
        return [
            {
                name: 'Audio Buffer Generation',
                execute: async (wasm) => {
                    const buffer = wasm.process_stereo_buffer_global(128);
                    if (!buffer || buffer.length !== 256) {
                        return `Invalid buffer: expected 256 samples, got ${buffer?.length || 0}`;
                    }
                    return true;
                }
            },
            {
                name: 'Voice Allocation',
                execute: async (wasm) => {
                    // Play multiple notes
                    for (let i = 0; i < 8; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x90, 60 + i, 100);
                    }
                    
                    const buffer = wasm.process_stereo_buffer_global(128);
                    if (!buffer) {
                        return 'Voice allocation failed to generate audio';
                    }
                    
                    // Clean up
                    for (let i = 0; i < 8; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x80, 60 + i, 0);
                    }
                    
                    return true;
                }
            },
            {
                name: 'Envelope Processing',
                execute: async (wasm) => {
                    wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                    
                    // Process several buffers for envelope progression
                    for (let i = 0; i < 5; i++) {
                        const buffer = wasm.process_stereo_buffer_global(64);
                        if (!buffer) {
                            return 'Envelope processing failed';
                        }
                    }
                    
                    wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                    return true;
                }
            }
        ];
    }
    
    /**
     * Effects system tests
     */
    getEffectsSystemTests() {
        return [
            {
                name: 'Reverb Processor',
                execute: async (wasm) => {
                    wasm.queue_midi_event_global(0n, 0, 0xB0, 91, 127); // Max reverb
                    wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                    
                    const buffer = wasm.process_stereo_buffer_global(256);
                    if (!buffer) {
                        return 'Reverb processing failed';
                    }
                    
                    wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                    return true;
                }
            },
            {
                name: 'Chorus Processor',
                execute: async (wasm) => {
                    wasm.queue_midi_event_global(0n, 0, 0xB0, 93, 127); // Max chorus
                    wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                    
                    const buffer = wasm.process_stereo_buffer_global(256);
                    if (!buffer) {
                        return 'Chorus processing failed';
                    }
                    
                    wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                    return true;
                }
            },
            {
                name: 'Real-time Effects Control',
                execute: async (wasm) => {
                    wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                    
                    // Test real-time parameter changes
                    for (let level = 0; level <= 127; level += 32) {
                        wasm.queue_midi_event_global(0n, 0, 0xB0, 91, level);
                        const buffer = wasm.process_stereo_buffer_global(32);
                        if (!buffer) {
                            return `Real-time control failed at level ${level}`;
                        }
                    }
                    
                    wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                    return true;
                }
            }
        ];
    }
    
    /**
     * UI integration tests
     */
    getUIIntegrationTests() {
        return [
            {
                name: 'DOM Elements Present',
                execute: async (wasm) => {
                    const required = [
                        'start-audio', 'play-test-tone', 'stop-audio',
                        'reverb-send', 'chorus-send',
                        'voice-activity', 'soundfont-drop-zone'
                    ];
                    
                    for (const id of required) {
                        if (!document.getElementById(id)) {
                            return `Missing element: ${id}`;
                        }
                    }
                    return true;
                }
            },
            {
                name: 'Virtual Keyboard',
                execute: async (wasm) => {
                    const keys = document.querySelectorAll('.piano-key');
                    if (keys.length === 0) {
                        return 'Virtual keyboard not found';
                    }
                    return true;
                }
            },
            {
                name: 'Effects Control Panel',
                execute: async (wasm) => {
                    const reverbSlider = document.getElementById('reverb-send');
                    const chorusSlider = document.getElementById('chorus-send');
                    
                    if (!reverbSlider || !chorusSlider) {
                        return 'Effects control sliders not found';
                    }
                    return true;
                }
            }
        ];
    }
    
    /**
     * End-to-end pipeline tests
     */
    getEndToEndTests() {
        return [
            {
                name: 'Complete MIDI Pipeline',
                execute: async (wasm) => {
                    // Full pipeline test
                    wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                    const buffer1 = wasm.process_stereo_buffer_global(128);
                    
                    wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                    const buffer2 = wasm.process_stereo_buffer_global(128);
                    
                    if (!buffer1 || !buffer2) {
                        return 'Pipeline audio generation failed';
                    }
                    
                    return true;
                }
            },
            {
                name: 'Polyphonic Synthesis',
                execute: async (wasm) => {
                    const notes = [60, 64, 67, 72]; // C major chord
                    
                    for (const note of notes) {
                        wasm.queue_midi_event_global(0n, 0, 0x90, note, 100);
                    }
                    
                    const buffer = wasm.process_stereo_buffer_global(256);
                    if (!buffer) {
                        return 'Polyphonic synthesis failed';
                    }
                    
                    for (const note of notes) {
                        wasm.queue_midi_event_global(0n, 0, 0x80, note, 0);
                    }
                    
                    return true;
                }
            },
            {
                name: 'Effects Integration',
                execute: async (wasm) => {
                    wasm.queue_midi_event_global(0n, 0, 0xB0, 91, 100); // Reverb
                    wasm.queue_midi_event_global(0n, 0, 0xB0, 93, 80);  // Chorus
                    wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100); // Note
                    
                    const buffer = wasm.process_stereo_buffer_global(256);
                    if (!buffer) {
                        return 'Effects integration failed';
                    }
                    
                    wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                    return true;
                }
            }
        ];
    }
    
    /**
     * Performance and stress tests
     */
    getPerformanceTests() {
        return [
            {
                name: 'CPU Performance',
                execute: async (wasm) => {
                    const startTime = performance.now();
                    
                    // Heavy load test
                    for (let i = 0; i < 8; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x90, 60 + i, 100);
                    }
                    
                    for (let i = 0; i < 10; i++) {
                        wasm.process_stereo_buffer_global(512);
                    }
                    
                    const duration = performance.now() - startTime;
                    this.results.performance.cpuTest = duration;
                    
                    // Clean up
                    for (let i = 0; i < 8; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x80, 60 + i, 0);
                    }
                    
                    return true;
                }
            },
            {
                name: '32-Voice Stress Test',
                execute: async (wasm) => {
                    const startTime = performance.now();
                    
                    // Play 32 notes
                    for (let i = 0; i < 32; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x90, 36 + i, 100);
                    }
                    
                    // Process under load
                    for (let i = 0; i < 5; i++) {
                        const buffer = wasm.process_stereo_buffer_global(256);
                        if (!buffer) {
                            return '32-voice stress test failed';
                        }
                    }
                    
                    const duration = performance.now() - startTime;
                    this.results.performance.stressTest = duration;
                    
                    // Clean up
                    for (let i = 0; i < 32; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x80, 36 + i, 0);
                    }
                    
                    return true;
                }
            },
            {
                name: 'Memory Usage',
                execute: async (wasm) => {
                    if (!performance.memory) {
                        return 'SKIP'; // Memory API not available
                    }
                    
                    const initialMemory = performance.memory.usedJSHeapSize;
                    
                    // Create memory load
                    for (let i = 0; i < 100; i++) {
                        wasm.queue_midi_event_global(0n, 0, 0x90, 60, 100);
                        wasm.queue_midi_event_global(0n, 0, 0x80, 60, 0);
                        wasm.process_stereo_buffer_global(128);
                    }
                    
                    const finalMemory = performance.memory.usedJSHeapSize;
                    const memoryDelta = finalMemory - initialMemory;
                    
                    this.results.performance.memoryDelta = memoryDelta;
                    
                    return true;
                }
            }
        ];
    }
    
    /**
     * Generate test report
     */
    generateReport() {
        const report = {
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                skipped: this.results.skipped,
                duration: this.results.duration,
                success: this.results.failed === 0,
                timestamp: new Date().toISOString()
            },
            tests: this.results.tests,
            errors: this.results.errors,
            performance: this.results.performance
        };
        
        if (this.options.outputFormat === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (this.options.outputFormat === 'junit') {
            return this.generateJUnitXML(report);
        } else {
            return this.generateConsoleReport(report);
        }
    }
    
    /**
     * Generate console report
     */
    generateConsoleReport(report) {
        let output = '\n';
        output += '🧪 AWE Player Integration Test Results\n';
        output += '═'.repeat(50) + '\n\n';
        
        if (report.summary.success) {
            output += `🎉 All tests passed! (${report.summary.passed}/${report.summary.total})\n`;
        } else {
            output += `⚠️ ${report.summary.failed} test(s) failed (${report.summary.passed}/${report.summary.total} passed)\n`;
        }
        
        output += `Duration: ${(report.summary.duration / 1000).toFixed(1)}s\n`;
        
        if (report.summary.skipped > 0) {
            output += `Skipped: ${report.summary.skipped}\n`;
        }
        
        output += '\n';
        
        // Group tests by suite
        const suites = {};
        for (const test of report.tests) {
            if (!suites[test.suite]) {
                suites[test.suite] = [];
            }
            suites[test.suite].push(test);
        }
        
        for (const [suiteName, tests] of Object.entries(suites)) {
            output += `📋 ${suiteName}\n`;
            for (const test of tests) {
                const status = test.passed ? '✅' : test.skipped ? '⏭️' : '❌';
                const duration = test.duration ? ` (${test.duration.toFixed(1)}ms)` : '';
                output += `  ${status} ${test.name}${duration}\n`;
                if (test.error) {
                    output += `     Error: ${test.error}\n`;
                }
            }
            output += '\n';
        }
        
        // Performance metrics
        if (Object.keys(report.performance).length > 0) {
            output += '⚡ Performance Metrics\n';
            if (report.performance.cpuTest) {
                output += `  CPU Test: ${report.performance.cpuTest.toFixed(1)}ms\n`;
            }
            if (report.performance.stressTest) {
                output += `  32-Voice Stress: ${report.performance.stressTest.toFixed(1)}ms\n`;
            }
            if (report.performance.memoryDelta) {
                output += `  Memory Delta: ${(report.performance.memoryDelta / 1024 / 1024).toFixed(2)}MB\n`;
            }
            output += '\n';
        }
        
        return output;
    }
    
    /**
     * Generate JUnit XML report
     */
    generateJUnitXML(report) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<testsuites tests="${report.summary.total}" failures="${report.summary.failed}" time="${report.summary.duration / 1000}">\n`;
        
        const suites = {};
        for (const test of report.tests) {
            if (!suites[test.suite]) {
                suites[test.suite] = [];
            }
            suites[test.suite].push(test);
        }
        
        for (const [suiteName, tests] of Object.entries(suites)) {
            const suiteFailed = tests.filter(t => !t.passed && !t.skipped).length;
            const suiteTime = tests.reduce((sum, t) => sum + t.duration, 0) / 1000;
            
            xml += `  <testsuite name="${suiteName}" tests="${tests.length}" failures="${suiteFailed}" time="${suiteTime}">\n`;
            
            for (const test of tests) {
                xml += `    <testcase name="${test.name}" time="${test.duration / 1000}">\n`;
                if (!test.passed && !test.skipped) {
                    xml += `      <failure message="${test.error}">${test.error}</failure>\n`;
                } else if (test.skipped) {
                    xml += `      <skipped/>\n`;
                }
                xml += `    </testcase>\n`;
            }
            
            xml += `  </testsuite>\n`;
        }
        
        xml += `</testsuites>\n`;
        return xml;
    }
    
    /**
     * Log message with timestamp
     */
    log(message) {
        if (this.options.verbose) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] ${message}`);
        }
    }
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AWEPlayerTestRunner;
}

// Browser usage example
if (typeof window !== 'undefined') {
    window.AWEPlayerTestRunner = AWEPlayerTestRunner;
    
    // Auto-run tests when included as script
    document.addEventListener('DOMContentLoaded', async () => {
        const runner = new AWEPlayerTestRunner({
            verbose: true,
            outputFormat: 'console',
            includePerformance: true
        });
        
        const initialized = await runner.initialize();
        if (initialized) {
            const report = await runner.runAllTests();
            console.log(report);
        }
    });
}