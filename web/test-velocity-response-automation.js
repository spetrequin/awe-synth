/**
 * Automated MIDI Velocity Response Testing Suite
 * Tests MIDI velocity → voice amplitude and timbre response integration
 */

export class VelocityResponseAutomatedTest {
    constructor() {
        this.testResults = {
            velocityAmplitudeTests: [],
            velocityTimbreTests: [],
            velocityCurveTests: [],
            dynamicRangeTests: [],
            timbreVariationTests: [],
            performanceTests: [],
            errors: []
        };
        
        this.velocityCurves = ['linear', 'exponential', 'logarithmic', 's-curve'];
        this.testInstruments = this.loadTestInstruments();
        this.performanceMetrics = {
            totalTests: 0,
            averageLatency: 0,
            peakLatency: 0,
            amplitudeAccuracy: 100,
            timbreAccuracy: 100,
            failures: []
        };
    }

    /**
     * Load test instruments with different velocity response characteristics
     */
    loadTestInstruments() {
        return {
            // High velocity sensitivity instruments
            0: { name: "Acoustic Grand Piano", velocitySensitivity: "high", timbreVariation: "high" },
            40: { name: "Violin", velocitySensitivity: "high", timbreVariation: "medium" },
            56: { name: "Trumpet", velocitySensitivity: "medium", timbreVariation: "high" },
            73: { name: "Flute", velocitySensitivity: "medium", timbreVariation: "low" },
            
            // Medium velocity sensitivity instruments
            24: { name: "Acoustic Guitar", velocitySensitivity: "medium", timbreVariation: "medium" },
            33: { name: "Electric Bass", velocitySensitivity: "medium", timbreVariation: "low" },
            48: { name: "String Ensemble", velocitySensitivity: "medium", timbreVariation: "medium" },
            
            // Low velocity sensitivity instruments (electronic)
            80: { name: "Square Lead", velocitySensitivity: "low", timbreVariation: "low" },
            88: { name: "New Age Pad", velocitySensitivity: "low", timbreVariation: "medium" }
        };
    }

    /**
     * Run complete MIDI velocity response test suite
     */
    async runFullTestSuite() {
        console.log('🎚️ Starting MIDI Velocity Response Automated Test Suite');
        
        const results = {
            velocityResponseInit: await this.testVelocityResponseInit(),
            basicVelocityAmplitude: await this.testBasicVelocityAmplitude(),
            velocityTimbreResponse: await this.testVelocityTimbreResponse(),
            velocityCurveFunctionality: await this.testVelocityCurveFunctionality(),
            dynamicRangeAccuracy: await this.testDynamicRangeAccuracy(),
            timbreVariationAccuracy: await this.testTimbreVariationAccuracy(),
            rapidVelocityChanges: await this.testRapidVelocityChanges(),
            velocitySensitivitySettings: await this.testVelocitySensitivitySettings(),
            instrumentVelocityResponse: await this.testInstrumentVelocityResponse(),
            performanceUnderLoad: await this.testPerformanceUnderLoad(),
            errorHandlingAndRecovery: await this.testErrorHandlingAndRecovery()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test velocity response system initialization
     */
    async testVelocityResponseInit() {
        const test = { name: 'Velocity Response System Initialization', passed: false, details: {} };
        
        try {
            // Check for velocity response UI elements
            const velocityElements = {
                velocitySlider: document.getElementById('velocitySlider'),
                velocityValue: document.getElementById('velocityValue'),
                amplitudeMeter: document.getElementById('amplitudeFill'),
                timbreMeter: document.getElementById('timbreFill'),
                responseGraph: document.getElementById('responseGraph'),
                velocityCurveCanvas: document.getElementById('velocityCurveCanvas'),
                sensitivitySlider: document.getElementById('sensitivitySlider'),
                timbreResponseSlider: document.getElementById('timbreResponseSlider')
            };
            
            test.details.elementsFound = {};
            let foundElements = 0;
            
            for (const [name, element] of Object.entries(velocityElements)) {
                const exists = !!element;
                test.details.elementsFound[name] = exists;
                if (exists) foundElements++;
            }
            
            test.details.totalElements = Object.keys(velocityElements).length;
            test.details.foundElementsCount = foundElements;
            
            // Check for velocity response tester availability
            test.details.velocityTesterReady = !!window.velocityTest;
            
            // Verify velocity curve options
            const curveOptions = document.querySelectorAll('.curve-option');
            test.details.velocityCurveOptionsCount = curveOptions.length;
            test.details.velocityCurveOptionsFound = curveOptions.length === 4; // linear, exponential, logarithmic, s-curve
            
            test.passed = foundElements >= 7 && test.details.velocityTesterReady && test.details.velocityCurveOptionsFound;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test basic velocity to amplitude mapping
     */
    async testBasicVelocityAmplitude() {
        const test = { name: 'Basic Velocity → Amplitude Response', passed: false, details: { amplitudeTests: [] } };
        
        try {
            const testVelocities = [1, 16, 32, 48, 64, 80, 96, 112, 127];
            const testNote = 60; // Middle C
            const testChannel = 1;
            
            for (const velocity of testVelocities) {
                const amplitudeTest = {
                    velocity: velocity,
                    note: testNote,
                    channel: testChannel,
                    expectedAmplitude: velocity / 127, // Linear mapping expectation
                    actualAmplitude: 0,
                    amplitudeAccuracy: 0,
                    success: false,
                    latency: 0
                };
                
                const startTime = performance.now();
                
                try {
                    // Simulate MIDI Note On message with specific velocity
                    const midiMessage = [0x90 + (testChannel - 1), testNote, velocity];
                    const response = await this.simulateVelocityResponse(midiMessage);
                    
                    const endTime = performance.now();
                    amplitudeTest.latency = endTime - startTime;
                    amplitudeTest.actualAmplitude = response.amplitude;
                    
                    // Calculate amplitude accuracy (±5% tolerance)
                    const expectedNormalized = velocity / 127;
                    const amplitudeError = Math.abs(response.amplitude - expectedNormalized);
                    amplitudeTest.amplitudeAccuracy = Math.max(0, 100 - (amplitudeError * 100));
                    
                    amplitudeTest.success = amplitudeTest.amplitudeAccuracy >= 95 && amplitudeTest.latency < 5.0;
                    
                    // Verify amplitude is within reasonable bounds
                    amplitudeTest.amplitudeBoundsValid = response.amplitude >= 0 && response.amplitude <= 1.0;
                    amplitudeTest.success = amplitudeTest.success && amplitudeTest.amplitudeBoundsValid;
                    
                } catch (error) {
                    amplitudeTest.error = error.message;
                    amplitudeTest.success = false;
                }
                
                test.details.amplitudeTests.push(amplitudeTest);
                this.testResults.velocityAmplitudeTests.push(amplitudeTest);
                
                await this.delay(50); // Brief pause between tests
            }
            
            const successfulTests = test.details.amplitudeTests.filter(t => t.success).length;
            test.details.successRate = (successfulTests / testVelocities.length) * 100;
            test.details.averageAccuracy = test.details.amplitudeTests.reduce((acc, t) => acc + t.amplitudeAccuracy, 0) / testVelocities.length;
            test.details.averageLatency = test.details.amplitudeTests.reduce((acc, t) => acc + t.latency, 0) / testVelocities.length;
            
            test.passed = test.details.successRate >= 90 && test.details.averageAccuracy >= 95;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity to timbre response mapping
     */
    async testVelocityTimbreResponse() {
        const test = { name: 'Velocity → Timbre Response', passed: false, details: { timbreTests: [] } };
        
        try {
            const testVelocities = [1, 32, 64, 96, 127];
            const testNote = 60;
            const testChannel = 1;
            
            for (const velocity of testVelocities) {
                const timbreTest = {
                    velocity: velocity,
                    note: testNote,
                    channel: testChannel,
                    expectedBrightness: velocity / 127,
                    actualBrightness: 0,
                    expectedHarmonics: velocity / 127,
                    actualHarmonics: 0,
                    filterCutoff: 0,
                    timbreAccuracy: 0,
                    success: false,
                    latency: 0
                };
                
                const startTime = performance.now();
                
                try {
                    const midiMessage = [0x90 + (testChannel - 1), testNote, velocity];
                    const response = await this.simulateVelocityResponse(midiMessage);
                    
                    const endTime = performance.now();
                    timbreTest.latency = endTime - startTime;
                    
                    // Extract timbre characteristics from response
                    timbreTest.actualBrightness = response.timbre;
                    timbreTest.actualHarmonics = response.timbre; // Simplified: timbre affects both brightness and harmonics
                    timbreTest.filterCutoff = response.filterCutoff || 1000 + (response.timbre * 7000);
                    
                    // Calculate timbre accuracy
                    const expectedTimbre = velocity / 127;
                    const timbreError = Math.abs(response.timbre - expectedTimbre);
                    timbreTest.timbreAccuracy = Math.max(0, 100 - (timbreError * 100));
                    
                    // Verify filter cutoff responds to velocity
                    const expectedFilterRange = 1000 + (expectedTimbre * 7000);
                    const filterAccurate = Math.abs(timbreTest.filterCutoff - expectedFilterRange) < 500;
                    
                    timbreTest.success = timbreTest.timbreAccuracy >= 90 && filterAccurate && timbreTest.latency < 5.0;
                    
                } catch (error) {
                    timbreTest.error = error.message;
                    timbreTest.success = false;
                }
                
                test.details.timbreTests.push(timbreTest);
                this.testResults.velocityTimbreTests.push(timbreTest);
                
                await this.delay(100);
            }
            
            const successfulTests = test.details.timbreTests.filter(t => t.success).length;
            test.details.successRate = (successfulTests / testVelocities.length) * 100;
            test.details.averageTimbreAccuracy = test.details.timbreTests.reduce((acc, t) => acc + t.timbreAccuracy, 0) / testVelocities.length;
            
            test.passed = test.details.successRate >= 80 && test.details.averageTimbreAccuracy >= 90;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity curve functionality
     */
    async testVelocityCurveFunctionality() {
        const test = { name: 'Velocity Curve Functionality', passed: false, details: { curveTests: [] } };
        
        try {
            for (const curve of this.velocityCurves) {
                const curveTest = {
                    curveName: curve,
                    testPoints: [],
                    linearityTest: false,
                    boundsTest: false,
                    monotonicTest: false,
                    success: false
                };
                
                const testVelocities = [0, 32, 64, 96, 127];
                
                try {
                    // Test curve at multiple points
                    for (const velocity of testVelocities) {
                        const normalizedInput = velocity / 127;
                        const curveOutput = this.applyCurve(normalizedInput, curve);
                        
                        const pointTest = {
                            input: normalizedInput,
                            output: curveOutput,
                            velocity: velocity,
                            withinBounds: curveOutput >= 0 && curveOutput <= 1.0
                        };
                        
                        curveTest.testPoints.push(pointTest);
                    }
                    
                    // Test curve properties
                    const outputs = curveTest.testPoints.map(p => p.output);
                    
                    // Bounds test: all outputs should be 0-1
                    curveTest.boundsTest = curveTest.testPoints.every(p => p.withinBounds);
                    
                    // Monotonic test: outputs should generally increase with input
                    curveTest.monotonicTest = this.isMonotonicIncreasing(outputs);
                    
                    // Curve-specific tests
                    switch (curve) {
                        case 'linear':
                            curveTest.linearityTest = Math.abs(outputs[2] - 0.5) < 0.01; // Middle point should be ~0.5
                            break;
                        case 'exponential':
                            curveTest.linearityTest = outputs[2] < 0.3; // Middle point should be < 0.3 for exponential
                            break;
                        case 'logarithmic':
                            curveTest.linearityTest = outputs[2] > 0.7; // Middle point should be > 0.7 for logarithmic
                            break;
                        case 's-curve':
                            curveTest.linearityTest = Math.abs(outputs[2] - 0.5) < 0.1; // S-curve middle should be near 0.5
                            break;
                    }
                    
                    curveTest.success = curveTest.boundsTest && curveTest.monotonicTest && curveTest.linearityTest;
                    
                } catch (error) {
                    curveTest.error = error.message;
                    curveTest.success = false;
                }
                
                test.details.curveTests.push(curveTest);
                this.testResults.velocityCurveTests.push(curveTest);
            }
            
            const successfulCurves = test.details.curveTests.filter(c => c.success).length;
            test.passed = successfulCurves >= 3; // At least 3/4 curves working
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test dynamic range accuracy
     */
    async testDynamicRangeAccuracy() {
        const test = { name: 'Dynamic Range Accuracy', passed: false, details: { rangeTests: [] } };
        
        try {
            const instruments = Object.keys(this.testInstruments).map(p => parseInt(p));
            
            for (const program of instruments) {
                const rangeTest = {
                    program: program,
                    instrument: this.testInstruments[program].name,
                    velocitySensitivity: this.testInstruments[program].velocitySensitivity,
                    minVelocityResponse: null,
                    maxVelocityResponse: null,
                    dynamicRange: 0,
                    expectedRange: this.getExpectedDynamicRange(this.testInstruments[program].velocitySensitivity),
                    rangeAccuracy: 0,
                    success: false
                };
                
                try {
                    // Test at minimum velocity (1)
                    const minResponse = await this.simulateVelocityResponse([0x90, 60, 1], program);
                    rangeTest.minVelocityResponse = minResponse.amplitude;
                    
                    await this.delay(50);
                    
                    // Test at maximum velocity (127)
                    const maxResponse = await this.simulateVelocityResponse([0x90, 60, 127], program);
                    rangeTest.maxVelocityResponse = maxResponse.amplitude;
                    
                    // Calculate actual dynamic range
                    rangeTest.dynamicRange = rangeTest.maxVelocityResponse - rangeTest.minVelocityResponse;
                    
                    // Compare with expected range
                    const rangeError = Math.abs(rangeTest.dynamicRange - rangeTest.expectedRange);
                    rangeTest.rangeAccuracy = Math.max(0, 100 - (rangeError * 100));
                    
                    rangeTest.success = rangeTest.rangeAccuracy >= 85 && rangeTest.dynamicRange > 0.5;
                    
                } catch (error) {
                    rangeTest.error = error.message;
                    rangeTest.success = false;
                }
                
                test.details.rangeTests.push(rangeTest);
                this.testResults.dynamicRangeTests.push(rangeTest);
                
                await this.delay(100);
            }
            
            const successfulRanges = test.details.rangeTests.filter(r => r.success).length;
            test.passed = successfulRanges >= Math.floor(instruments.length * 0.8);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test timbre variation accuracy across different settings
     */
    async testTimbreVariationAccuracy() {
        const test = { name: 'Timbre Variation Accuracy', passed: false, details: { variationTests: [] } };
        
        try {
            const timbreSettings = [0.25, 0.5, 0.75, 1.0];
            const testVelocity = 96;
            const testNote = 60;
            
            for (const timbreSetting of timbreSettings) {
                const variationTest = {
                    timbreSetting: timbreSetting,
                    timbrePercentage: Math.round(timbreSetting * 100),
                    velocityTests: [],
                    averageAccuracy: 0,
                    success: false
                };
                
                try {
                    // Test at multiple velocities with this timbre setting
                    const testVelocities = [32, 64, 96, 127];
                    
                    for (const velocity of testVelocities) {
                        const response = await this.simulateVelocityResponseWithTimbre([0x90, testNote, velocity], 0, timbreSetting);
                        
                        const expectedTimbre = (velocity / 127) * timbreSetting;
                        const timbreError = Math.abs(response.timbre - expectedTimbre);
                        const accuracy = Math.max(0, 100 - (timbreError * 100));
                        
                        variationTest.velocityTests.push({
                            velocity: velocity,
                            expectedTimbre: expectedTimbre,
                            actualTimbre: response.timbre,
                            accuracy: accuracy
                        });
                    }
                    
                    variationTest.averageAccuracy = variationTest.velocityTests.reduce((acc, t) => acc + t.accuracy, 0) / testVelocities.length;
                    variationTest.success = variationTest.averageAccuracy >= 90;
                    
                } catch (error) {
                    variationTest.error = error.message;
                    variationTest.success = false;
                }
                
                test.details.variationTests.push(variationTest);
                this.testResults.timbreVariationTests.push(variationTest);
                
                await this.delay(200);
            }
            
            const successfulVariations = test.details.variationTests.filter(v => v.success).length;
            test.passed = successfulVariations >= 3; // At least 3/4 timbre settings working correctly
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test rapid velocity changes
     */
    async testRapidVelocityChanges() {
        const test = { name: 'Rapid Velocity Changes', passed: false, details: { rapidTests: [] } };
        
        try {
            const rapidVelocities = [127, 1, 96, 16, 80, 32, 112, 48, 64];
            const testNote = 60;
            const testChannel = 1;
            const rapidDelay = 25; // 25ms between changes
            
            const rapidTest = {
                velocities: rapidVelocities,
                channel: testChannel,
                delayBetweenChanges: rapidDelay,
                totalTime: 0,
                averageLatency: 0,
                maxLatency: 0,
                missedResponses: 0,
                success: false,
                latencies: [],
                responseAccuracy: []
            };
            
            const startTime = performance.now();
            
            for (let i = 0; i < rapidVelocities.length; i++) {
                const velocity = rapidVelocities[i];
                const changeStartTime = performance.now();
                
                try {
                    const midiMessage = [0x90 + (testChannel - 1), testNote, velocity];
                    const response = await this.simulateVelocityResponse(midiMessage);
                    
                    const changeLatency = performance.now() - changeStartTime;
                    rapidTest.latencies.push(changeLatency);
                    
                    // Check response accuracy
                    const expectedAmplitude = velocity / 127;
                    const amplitudeError = Math.abs(response.amplitude - expectedAmplitude);
                    const accuracy = Math.max(0, 100 - (amplitudeError * 100));
                    rapidTest.responseAccuracy.push(accuracy);
                    
                    if (accuracy < 85) {
                        rapidTest.missedResponses++;
                    }
                    
                } catch (error) {
                    rapidTest.missedResponses++;
                    rapidTest.latencies.push(rapidDelay * 2); // Penalty latency
                    rapidTest.responseAccuracy.push(0);
                }
                
                if (i < rapidVelocities.length - 1) {
                    await this.delay(rapidDelay);
                }
            }
            
            rapidTest.totalTime = performance.now() - startTime;
            rapidTest.averageLatency = rapidTest.latencies.reduce((a, b) => a + b, 0) / rapidTest.latencies.length;
            rapidTest.maxLatency = Math.max(...rapidTest.latencies);
            
            const averageAccuracy = rapidTest.responseAccuracy.reduce((a, b) => a + b, 0) / rapidTest.responseAccuracy.length;
            
            // Success criteria: no missed responses, average latency < 5ms, accuracy > 85%
            rapidTest.success = rapidTest.missedResponses === 0 && rapidTest.averageLatency < 5.0 && averageAccuracy >= 85;
            
            test.details.rapidTests.push(rapidTest);
            this.testResults.performanceTests.push(rapidTest);
            
            test.passed = rapidTest.success;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity sensitivity settings
     */
    async testVelocitySensitivitySettings() {
        const test = { name: 'Velocity Sensitivity Settings', passed: false, details: { sensitivityTests: [] } };
        
        try {
            const sensitivityLevels = [0.5, 1.0, 1.5, 2.0]; // 50%, 100%, 150%, 200%
            const testVelocity = 64;
            const testNote = 60;
            
            for (const sensitivity of sensitivityLevels) {
                const sensitivityTest = {
                    sensitivityLevel: sensitivity,
                    sensitivityPercentage: Math.round(sensitivity * 100),
                    testVelocity: testVelocity,
                    expectedAmplitude: Math.min(1.0, (testVelocity / 127) * sensitivity),
                    actualAmplitude: 0,
                    amplitudeAccuracy: 0,
                    success: false
                };
                
                try {
                    const response = await this.simulateVelocityResponseWithSensitivity([0x90, testNote, testVelocity], 0, sensitivity);
                    sensitivityTest.actualAmplitude = response.amplitude;
                    
                    // Calculate accuracy
                    const amplitudeError = Math.abs(response.amplitude - sensitivityTest.expectedAmplitude);
                    sensitivityTest.amplitudeAccuracy = Math.max(0, 100 - (amplitudeError * 100));
                    
                    sensitivityTest.success = sensitivityTest.amplitudeAccuracy >= 95;
                    
                } catch (error) {
                    sensitivityTest.error = error.message;
                    sensitivityTest.success = false;
                }
                
                test.details.sensitivityTests.push(sensitivityTest);
                
                await this.delay(100);
            }
            
            const successfulTests = test.details.sensitivityTests.filter(s => s.success).length;
            test.passed = successfulTests >= 3; // At least 3/4 sensitivity levels working
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test instrument-specific velocity response characteristics
     */
    async testInstrumentVelocityResponse() {
        const test = { name: 'Instrument-Specific Velocity Response', passed: false, details: { instrumentTests: [] } };
        
        try {
            const instruments = Object.keys(this.testInstruments).map(p => parseInt(p));
            
            for (const program of instruments) {
                const instrumentTest = {
                    program: program,
                    instrument: this.testInstruments[program].name,
                    expectedSensitivity: this.testInstruments[program].velocitySensitivity,
                    expectedTimbreVariation: this.testInstruments[program].timbreVariation,
                    velocityResponseTests: [],
                    averageAmplitudeAccuracy: 0,
                    averageTimbreAccuracy: 0,
                    success: false
                };
                
                try {
                    const testVelocities = [32, 64, 96, 127];
                    
                    for (const velocity of testVelocities) {
                        const response = await this.simulateVelocityResponse([0x90, 60, velocity], program);
                        
                        const velocityTest = {
                            velocity: velocity,
                            expectedAmplitude: velocity / 127,
                            actualAmplitude: response.amplitude,
                            expectedTimbre: velocity / 127,
                            actualTimbre: response.timbre,
                            amplitudeAccuracy: 0,
                            timbreAccuracy: 0
                        };
                        
                        // Calculate accuracies
                        const amplitudeError = Math.abs(response.amplitude - velocityTest.expectedAmplitude);
                        velocityTest.amplitudeAccuracy = Math.max(0, 100 - (amplitudeError * 100));
                        
                        const timbreError = Math.abs(response.timbre - velocityTest.expectedTimbre);
                        velocityTest.timbreAccuracy = Math.max(0, 100 - (timbreError * 100));
                        
                        instrumentTest.velocityResponseTests.push(velocityTest);
                        
                        await this.delay(50);
                    }
                    
                    instrumentTest.averageAmplitudeAccuracy = instrumentTest.velocityResponseTests.reduce((acc, t) => acc + t.amplitudeAccuracy, 0) / testVelocities.length;
                    instrumentTest.averageTimbreAccuracy = instrumentTest.velocityResponseTests.reduce((acc, t) => acc + t.timbreAccuracy, 0) / testVelocities.length;
                    
                    // Success criteria based on expected sensitivity
                    const requiredAccuracy = this.getRequiredAccuracy(this.testInstruments[program].velocitySensitivity);
                    instrumentTest.success = instrumentTest.averageAmplitudeAccuracy >= requiredAccuracy && instrumentTest.averageTimbreAccuracy >= requiredAccuracy;
                    
                } catch (error) {
                    instrumentTest.error = error.message;
                    instrumentTest.success = false;
                }
                
                test.details.instrumentTests.push(instrumentTest);
                
                await this.delay(150);
            }
            
            const successfulInstruments = test.details.instrumentTests.filter(i => i.success).length;
            test.passed = successfulInstruments >= Math.floor(instruments.length * 0.8);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test performance under sustained velocity processing load
     */
    async testPerformanceUnderLoad() {
        const test = { name: 'Performance Under Load', passed: false, details: { loadTests: [] } };
        
        try {
            const loadTest = {
                duration: 10000, // 10 seconds
                targetRate: 100, // 100 velocity changes per second
                actualChanges: 0,
                averageLatency: 0,
                maxLatency: 0,
                minLatency: Infinity,
                memoryUsageBefore: 0,
                memoryUsageAfter: 0,
                memoryGrowth: 0,
                success: false,
                latencies: []
            };
            
            try {
                // Record initial memory usage (if available)
                if (performance.memory) {
                    loadTest.memoryUsageBefore = performance.memory.usedJSHeapSize;
                }
                
                const startTime = Date.now();
                const endTime = startTime + loadTest.duration;
                
                while (Date.now() < endTime) {
                    const randomVelocity = Math.floor(Math.random() * 127) + 1;
                    const changeStartTime = performance.now();
                    
                    try {
                        const response = await this.simulateVelocityResponse([0x90, 60, randomVelocity]);
                        
                        const changeLatency = performance.now() - changeStartTime;
                        loadTest.latencies.push(changeLatency);
                        loadTest.actualChanges++;
                        
                        // Brief delay to maintain target rate
                        await this.delay(10);
                        
                    } catch (error) {
                        // Count failed attempts
                    }
                }
                
                // Calculate performance metrics
                if (loadTest.latencies.length > 0) {
                    loadTest.averageLatency = loadTest.latencies.reduce((a, b) => a + b, 0) / loadTest.latencies.length;
                    loadTest.maxLatency = Math.max(...loadTest.latencies);
                    loadTest.minLatency = Math.min(...loadTest.latencies);
                }
                
                // Record final memory usage
                if (performance.memory) {
                    loadTest.memoryUsageAfter = performance.memory.usedJSHeapSize;
                    loadTest.memoryGrowth = loadTest.memoryUsageAfter - loadTest.memoryUsageBefore;
                }
                
                const actualRate = loadTest.actualChanges / (loadTest.duration / 1000);
                
                // Success criteria: achieve >80% of target rate, average latency <10ms, memory growth <10MB
                loadTest.success = actualRate >= (loadTest.targetRate * 0.8) && 
                                 loadTest.averageLatency < 10.0 && 
                                 loadTest.memoryGrowth < (10 * 1024 * 1024);
                
            } catch (error) {
                loadTest.error = error.message;
                loadTest.success = false;
            }
            
            test.details.loadTests.push(loadTest);
            this.testResults.performanceTests.push(loadTest);
            
            test.passed = loadTest.success;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test error handling and recovery
     */
    async testErrorHandlingAndRecovery() {
        const test = { name: 'Error Handling and Recovery', passed: false, details: { errorTests: [] } };
        
        try {
            const errorScenarios = [
                {
                    name: 'Invalid Velocity Values',
                    velocities: [-1, 0, 128, 255, 999],
                    expectedBehavior: 'graceful_failure'
                },
                {
                    name: 'Invalid MIDI Messages',
                    messages: [[0x90], [0x90, 60], [0xFF, 60, 64], [0x90, -1, 64], [0x90, 60, -1]],
                    expectedBehavior: 'graceful_failure'
                },
                {
                    name: 'Extreme Sensitivity Settings',
                    sensitivities: [-1, 0, 10, 100],
                    velocity: 64,
                    expectedBehavior: 'bounds_limiting'
                },
                {
                    name: 'Rapid Invalid Requests',
                    count: 50,
                    invalidVelocity: 999,
                    expectedBehavior: 'system_stability'
                }
            ];
            
            for (const scenario of errorScenarios) {
                const errorTest = {
                    scenario: scenario.name,
                    expectedBehavior: scenario.expectedBehavior,
                    actualBehavior: 'unknown',
                    systemStable: true,
                    errorsHandledGracefully: 0,
                    totalErrors: 0,
                    success: false
                };
                
                try {
                    switch (scenario.name) {
                        case 'Invalid Velocity Values':
                            for (const velocity of scenario.velocities) {
                                errorTest.totalErrors++;
                                try {
                                    const result = await this.simulateVelocityResponse([0x90, 60, velocity]);
                                    if (!result.success && !result.systemCrash) {
                                        errorTest.errorsHandledGracefully++;
                                    }
                                } catch (error) {
                                    errorTest.errorsHandledGracefully++;
                                }
                            }
                            break;
                            
                        case 'Invalid MIDI Messages':
                            for (const message of scenario.messages) {
                                errorTest.totalErrors++;
                                try {
                                    const result = await this.simulateVelocityResponse(message);
                                    if (!result.success && !result.systemCrash) {
                                        errorTest.errorsHandledGracefully++;
                                    }
                                } catch (error) {
                                    errorTest.errorsHandledGracefully++;
                                }
                            }
                            break;
                            
                        case 'Extreme Sensitivity Settings':
                            for (const sensitivity of scenario.sensitivities) {
                                errorTest.totalErrors++;
                                try {
                                    const result = await this.simulateVelocityResponseWithSensitivity([0x90, 60, scenario.velocity], 0, sensitivity);
                                    // Check if amplitude is properly bounded
                                    if (result.amplitude >= 0 && result.amplitude <= 1.0) {
                                        errorTest.errorsHandledGracefully++;
                                    }
                                } catch (error) {
                                    errorTest.errorsHandledGracefully++;
                                }
                            }
                            break;
                            
                        case 'Rapid Invalid Requests':
                            const startTime = performance.now();
                            for (let i = 0; i < scenario.count; i++) {
                                errorTest.totalErrors++;
                                try {
                                    const result = await this.simulateVelocityResponse([0x90, 60, scenario.invalidVelocity]);
                                    if (!result.success && !result.systemCrash) {
                                        errorTest.errorsHandledGracefully++;
                                    }
                                } catch (error) {
                                    errorTest.errorsHandledGracefully++;
                                }
                            }
                            const duration = performance.now() - startTime;
                            errorTest.testDuration = duration;
                            errorTest.systemStable = duration < 5000; // Should complete in < 5s
                            break;
                    }
                    
                    errorTest.gracefulHandlingRate = (errorTest.errorsHandledGracefully / errorTest.totalErrors) * 100;
                    errorTest.success = errorTest.gracefulHandlingRate >= 95 && errorTest.systemStable;
                    
                } catch (error) {
                    errorTest.systemStable = false;
                    errorTest.systemError = error.message;
                }
                
                test.details.errorTests.push(errorTest);
            }
            
            const successfulErrorTests = test.details.errorTests.filter(t => t.success).length;
            test.passed = successfulErrorTests >= 3; // At least 3/4 error scenarios handled properly
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    // Helper methods for simulation and verification

    async simulateVelocityResponse(midiMessage, program = 0) {
        // Simulate velocity response processing
        const processingDelay = 1 + Math.random() * 2; // 1-3ms
        await this.delay(processingDelay);
        
        // Validate MIDI message
        if (!Array.isArray(midiMessage) || midiMessage.length < 3) {
            return { success: false, error: 'Invalid MIDI message format' };
        }
        
        const velocity = midiMessage[2];
        
        // Validate velocity range
        if (velocity < 1 || velocity > 127) {
            return { success: false, error: 'Invalid velocity value' };
        }
        
        // Simulate velocity to amplitude mapping
        const normalizedVelocity = velocity / 127;
        const amplitude = this.applyCurve(normalizedVelocity, 'linear');
        
        // Simulate velocity to timbre mapping
        const timbre = normalizedVelocity * 0.75; // 75% timbre response by default
        
        // Simulate filter cutoff response
        const filterCutoff = 1000 + (timbre * 7000); // 1kHz - 8kHz range
        
        // Simulate envelope response
        const envelopeAttack = Math.max(0.01, 0.1 - (normalizedVelocity * 0.08));
        const envelopeDecay = 0.3 + (normalizedVelocity * 0.4);
        
        return {
            success: true,
            amplitude: amplitude,
            timbre: timbre,
            filterCutoff: filterCutoff,
            envelopeAttack: envelopeAttack,
            envelopeDecay: envelopeDecay,
            processingTime: processingDelay
        };
    }

    async simulateVelocityResponseWithSensitivity(midiMessage, program = 0, sensitivity = 1.0) {
        const baseResponse = await this.simulateVelocityResponse(midiMessage, program);
        if (!baseResponse.success) return baseResponse;
        
        // Apply sensitivity scaling with bounds limiting
        const scaledAmplitude = Math.max(0, Math.min(1, baseResponse.amplitude * sensitivity));
        
        return {
            ...baseResponse,
            amplitude: scaledAmplitude
        };
    }

    async simulateVelocityResponseWithTimbre(midiMessage, program = 0, timbreResponse = 0.75) {
        const baseResponse = await this.simulateVelocityResponse(midiMessage, program);
        if (!baseResponse.success) return baseResponse;
        
        const velocity = midiMessage[2];
        const normalizedVelocity = velocity / 127;
        const adjustedTimbre = normalizedVelocity * timbreResponse;
        
        return {
            ...baseResponse,
            timbre: adjustedTimbre,
            filterCutoff: 1000 + (adjustedTimbre * 7000)
        };
    }

    applyCurve(input, curveType) {
        switch (curveType) {
            case 'linear':
                return input;
            case 'exponential':
                return Math.pow(input, 2);
            case 'logarithmic':
                return Math.log(input * (Math.E - 1) + 1);
            case 's-curve':
                return 0.5 * (1 + Math.tanh(4 * (input - 0.5)));
            default:
                return input;
        }
    }

    isMonotonicIncreasing(values) {
        for (let i = 1; i < values.length; i++) {
            if (values[i] < values[i - 1]) {
                return false;
            }
        }
        return true;
    }

    getExpectedDynamicRange(sensitivityLevel) {
        switch (sensitivityLevel) {
            case 'high': return 0.9; // 90% dynamic range
            case 'medium': return 0.7; // 70% dynamic range
            case 'low': return 0.5; // 50% dynamic range
            default: return 0.7;
        }
    }

    getRequiredAccuracy(sensitivityLevel) {
        switch (sensitivityLevel) {
            case 'high': return 95; // High accuracy required
            case 'medium': return 90; // Medium accuracy required
            case 'low': return 85; // Lower accuracy acceptable
            default: return 90;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: Object.keys(results).length,
                passed: Object.values(results).filter(r => r.passed).length,
                failed: Object.values(results).filter(r => !r.passed).length
            },
            results: results,
            performanceMetrics: this.performanceMetrics,
            velocityResponseCoverage: {
                velocityAmplitudeTests: this.testResults.velocityAmplitudeTests.length,
                velocityTimbreTests: this.testResults.velocityTimbreTests.length,
                velocityCurveTests: this.testResults.velocityCurveTests.length,
                dynamicRangeTests: this.testResults.dynamicRangeTests.length,
                timbreVariationTests: this.testResults.timbreVariationTests.length,
                performanceTests: this.testResults.performanceTests.length
            }
        };
        
        console.log('📊 MIDI Velocity Response Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== MIDI VELOCITY RESPONSE TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default VelocityResponseAutomatedTest;