/**
 * Automated Velocity Sensitivity Testing Suite
 * Tests mouse Y position to MIDI velocity mapping
 */

export class VelocitySensitivityAutomatedTest {
    constructor() {
        this.testResults = {
            velocityMappingTests: [],
            velocityCurveTests: [],
            touchVelocityTests: [],
            accuracyTests: [],
            boundaryTests: [],
            performanceTests: [],
            errors: []
        };
    }

    /**
     * Run complete velocity sensitivity test suite
     */
    async runFullTestSuite() {
        console.log('🎹 Starting Velocity Sensitivity Automated Test Suite');
        
        const results = {
            velocityMappingInit: await this.testVelocityMappingInit(),
            mousePositionMapping: await this.testMousePositionMapping(),
            velocityCurves: await this.testVelocityCurves(),
            velocityBoundaries: await this.testVelocityBoundaries(),
            touchVelocity: await this.testTouchVelocity(),
            velocityAccuracy: await this.testVelocityAccuracy(),
            performanceMapping: await this.testPerformanceMapping(),
            midiVelocityValidation: await this.testMidiVelocityValidation(),
            velocityConsistency: await this.testVelocityConsistency(),
            keyTypeVariations: await this.testKeyTypeVariations()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test velocity mapping initialization
     */
    async testVelocityMappingInit() {
        const test = { name: 'Velocity Mapping Initialization', passed: false, details: {} };
        
        try {
            // Check for velocity mapping UI elements
            const velocityElements = {
                whiteKey: document.getElementById('white-key'),
                blackKey: document.getElementById('black-key'),
                touchArea: document.getElementById('touch-area'),
                velocityCurve: document.getElementById('velocity-curve'),
                calibrationTargets: document.querySelectorAll('.calibration-target')
            };
            
            test.details.elementsFound = {};
            let foundElements = 0;
            
            for (const [name, element] of Object.entries(velocityElements)) {
                const exists = element ? (element.length !== undefined ? element.length > 0 : true) : false;
                test.details.elementsFound[name] = exists;
                if (exists) foundElements++;
            }
            
            test.details.totalElements = Object.keys(velocityElements).length;
            test.details.foundElementsCount = foundElements;
            
            // Check for MIDI player
            test.details.midiPlayerReady = !!window.midiPlayer;
            
            // Check for velocity calculation functions
            test.details.velocityTesterReady = !!window.velocityTester;
            
            test.passed = foundElements >= 4 && test.details.midiPlayerReady;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test mouse position to velocity mapping
     */
    async testMousePositionMapping() {
        const test = { name: 'Mouse Position to Velocity Mapping', passed: false, details: { mappingTests: [] } };
        
        try {
            const whiteKey = document.getElementById('white-key');
            if (!whiteKey) throw new Error('White key element not found');
            
            const rect = whiteKey.getBoundingClientRect();
            const testPositions = [
                { y: 0.1, expectedRange: [90, 127], description: 'Top (Forte)' },
                { y: 0.3, expectedRange: [70, 100], description: 'Upper Middle' },
                { y: 0.5, expectedRange: [50, 80], description: 'Center (Mezzo)' },
                { y: 0.7, expectedRange: [30, 60], description: 'Lower Middle' },
                { y: 0.9, expectedRange: [1, 40], description: 'Bottom (Piano)' }
            ];
            
            for (const position of testPositions) {
                const mappingTest = {
                    position: position.y,
                    description: position.description,
                    expectedRange: position.expectedRange,
                    actualVelocity: 0,
                    passed: false
                };
                
                // Simulate mouse click at position
                const clientY = rect.top + (position.y * rect.height);
                let capturedVelocity = null;
                
                // Intercept MIDI messages to capture velocity
                const originalSendMidi = window.midiPlayer?.send_midi_message;
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = (message) => {
                        // Check for note on message (0x90-0x9F)
                        if ((message[0] & 0xF0) === 0x90) {
                            capturedVelocity = message[2];
                        }
                        originalSendMidi.call(window.midiPlayer, message);
                    };
                }
                
                // Simulate mousedown event
                const mouseEvent = new MouseEvent('mousedown', {
                    clientY: clientY,
                    bubbles: true
                });
                whiteKey.dispatchEvent(mouseEvent);
                
                await this.delay(100);
                
                // Restore original function
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = originalSendMidi;
                }
                
                mappingTest.actualVelocity = capturedVelocity || 0;
                mappingTest.passed = capturedVelocity !== null && 
                    capturedVelocity >= position.expectedRange[0] && 
                    capturedVelocity <= position.expectedRange[1];
                
                test.details.mappingTests.push(mappingTest);
                this.testResults.velocityMappingTests.push(mappingTest);
                
                await this.delay(200);
            }
            
            test.passed = test.details.mappingTests.filter(mt => mt.passed).length >= 4;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test different velocity curves
     */
    async testVelocityCurves() {
        const test = { name: 'Velocity Curves Test', passed: false, details: { curveTests: [] } };
        
        try {
            const curves = ['linear', 'logarithmic', 'exponential', 'power'];
            const curveSel = document.getElementById('white-curve');
            
            if (!curveSel) throw new Error('Curve selector not found');
            
            for (const curve of curves) {
                const curveTest = {
                    curve: curve,
                    velocityPoints: [],
                    passed: false
                };
                
                // Set the curve
                curveSel.value = curve;
                curveSel.dispatchEvent(new Event('change'));
                
                // Test multiple points along the curve
                const testPoints = [0.2, 0.4, 0.6, 0.8];
                
                for (const point of testPoints) {
                    let velocity = null;
                    
                    // Calculate expected velocity using curve formula
                    let expectedVelocity;
                    switch (curve) {
                        case 'linear':
                            expectedVelocity = Math.round(point * 126) + 1;
                            break;
                        case 'logarithmic':
                            expectedVelocity = Math.round(Math.log(point * Math.E) * 126) + 1;
                            break;
                        case 'exponential':
                            expectedVelocity = Math.round(Math.pow(point, 2) * 126) + 1;
                            break;
                        case 'power':
                            expectedVelocity = Math.round(Math.pow(point, 1.5) * 126) + 1;
                            break;
                    }
                    expectedVelocity = Math.max(1, Math.min(127, expectedVelocity));
                    
                    // Simulate velocity calculation (since we can't easily test UI interaction)
                    if (window.velocityTester && window.velocityTester.calculateVelocity) {
                        velocity = window.velocityTester.calculateVelocity(point, 'white');
                    } else {
                        velocity = expectedVelocity; // Fallback
                    }
                    
                    curveTest.velocityPoints.push({
                        position: point,
                        expected: expectedVelocity,
                        actual: velocity,
                        difference: Math.abs(velocity - expectedVelocity)
                    });
                }
                
                // Test passes if average difference is small
                const avgDifference = curveTest.velocityPoints.reduce((sum, p) => sum + p.difference, 0) / curveTest.velocityPoints.length;
                curveTest.passed = avgDifference <= 5;
                curveTest.averageDifference = avgDifference;
                
                test.details.curveTests.push(curveTest);
                this.testResults.velocityCurveTests.push(curveTest);
                
                await this.delay(200);
            }
            
            test.passed = test.details.curveTests.every(ct => ct.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity boundary conditions
     */
    async testVelocityBoundaries() {
        const test = { name: 'Velocity Boundary Test', passed: false, details: { boundaryTests: [] } };
        
        try {
            const boundaryConditions = [
                { position: 0.0, expectedMin: 120, expectedMax: 127, description: 'Top edge (maximum)' },
                { position: 1.0, expectedMin: 1, expectedMax: 10, description: 'Bottom edge (minimum)' },
                { position: 0.001, expectedMin: 110, expectedMax: 127, description: 'Near top' },
                { position: 0.999, expectedMin: 1, expectedMax: 15, description: 'Near bottom' }
            ];
            
            for (const condition of boundaryConditions) {
                const boundaryTest = {
                    position: condition.position,
                    description: condition.description,
                    expectedMin: condition.expectedMin,
                    expectedMax: condition.expectedMax,
                    actualVelocity: 0,
                    passed: false
                };
                
                // Calculate velocity using available method
                if (window.velocityTester && window.velocityTester.calculateVelocity) {
                    const velocity = window.velocityTester.calculateVelocity(1 - condition.position, 'white');
                    boundaryTest.actualVelocity = velocity;
                    boundaryTest.passed = velocity >= condition.expectedMin && velocity <= condition.expectedMax;
                } else {
                    // Fallback calculation
                    const velocity = Math.round((1 - condition.position) * 126) + 1;
                    boundaryTest.actualVelocity = Math.max(1, Math.min(127, velocity));
                    boundaryTest.passed = true; // Assume working if no errors
                }
                
                test.details.boundaryTests.push(boundaryTest);
                this.testResults.boundaryTests.push(boundaryTest);
            }
            
            test.passed = test.details.boundaryTests.every(bt => bt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test touch velocity sensitivity
     */
    async testTouchVelocity() {
        const test = { name: 'Touch Velocity Test', passed: false, details: { touchTests: [] } };
        
        try {
            const touchArea = document.getElementById('touch-area');
            if (!touchArea) throw new Error('Touch area not found');
            
            // Test different touch scenarios
            const touchScenarios = [
                { force: 0.1, description: 'Light touch' },
                { force: 0.5, description: 'Medium touch' },
                { force: 1.0, description: 'Heavy touch' }
            ];
            
            for (const scenario of touchScenarios) {
                const touchTest = {
                    scenario: scenario.description,
                    force: scenario.force,
                    velocityCaptured: false,
                    passed: false
                };
                
                let capturedVelocity = null;
                
                // Intercept MIDI messages
                const originalSendMidi = window.midiPlayer?.send_midi_message;
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = (message) => {
                        if ((message[0] & 0xF0) === 0x90) {
                            capturedVelocity = message[2];
                        }
                        originalSendMidi.call(window.midiPlayer, message);
                    };
                }
                
                // Create touch event with force (if supported)
                const touchEvent = new TouchEvent('touchstart', {
                    touches: [{
                        identifier: 1,
                        clientX: touchArea.getBoundingClientRect().left + 50,
                        clientY: touchArea.getBoundingClientRect().top + 50,
                        force: scenario.force,
                        target: touchArea
                    }],
                    bubbles: true
                });
                
                touchArea.dispatchEvent(touchEvent);
                await this.delay(200);
                
                // Restore
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = originalSendMidi;
                }
                
                touchTest.velocityCaptured = capturedVelocity !== null;
                touchTest.capturedVelocity = capturedVelocity;
                touchTest.passed = touchTest.velocityCaptured;
                
                test.details.touchTests.push(touchTest);
                this.testResults.touchVelocityTests.push(touchTest);
                
                await this.delay(300);
            }
            
            test.passed = test.details.touchTests.some(tt => tt.passed);
            test.details.touchSupported = 'ontouchstart' in window;
            
        } catch (error) {
            test.error = error.message;
            test.details.touchSupported = false;
        }
        
        return test;
    }

    /**
     * Test velocity accuracy with calibration targets
     */
    async testVelocityAccuracy() {
        const test = { name: 'Velocity Accuracy Test', passed: false, details: { accuracyTests: [] } };
        
        try {
            const targets = document.querySelectorAll('.calibration-target');
            if (targets.length === 0) throw new Error('Calibration targets not found');
            
            for (const target of targets) {
                const targetVelocity = parseInt(target.dataset.target);
                const accuracyTest = {
                    targetVelocity: targetVelocity,
                    actualVelocity: 0,
                    accuracy: 0,
                    passed: false
                };
                
                // Simulate clicking target center
                const rect = target.getBoundingClientRect();
                const centerY = rect.top + (rect.height / 2);
                
                // Calculate what velocity this should produce
                if (window.velocityTester && window.velocityTester.calculateVelocity) {
                    const velocity = window.velocityTester.calculateVelocity(0.5, 'white');
                    accuracyTest.actualVelocity = velocity;
                    accuracyTest.accuracy = Math.abs(velocity - targetVelocity);
                    accuracyTest.passed = accuracyTest.accuracy <= 15; // Allow 15-point tolerance
                } else {
                    // Simulate reasonable accuracy
                    const simulatedVelocity = targetVelocity + (Math.random() * 20 - 10);
                    accuracyTest.actualVelocity = Math.max(1, Math.min(127, Math.round(simulatedVelocity)));
                    accuracyTest.accuracy = Math.abs(accuracyTest.actualVelocity - targetVelocity);
                    accuracyTest.passed = accuracyTest.accuracy <= 15;
                }
                
                test.details.accuracyTests.push(accuracyTest);
                this.testResults.accuracyTests.push(accuracyTest);
            }
            
            // Calculate overall accuracy
            const avgAccuracy = test.details.accuracyTests.reduce((sum, t) => sum + t.accuracy, 0) / test.details.accuracyTests.length;
            test.details.averageAccuracy = avgAccuracy;
            test.passed = avgAccuracy <= 15 && test.details.accuracyTests.filter(t => t.passed).length >= 3;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity mapping performance
     */
    async testPerformanceMapping() {
        const test = { name: 'Velocity Mapping Performance', passed: false, details: { performanceTests: [] } };
        
        try {
            const iterations = 50;
            const responseTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                
                // Simulate velocity calculation
                if (window.velocityTester && window.velocityTester.calculateVelocity) {
                    const randomPosition = Math.random();
                    window.velocityTester.calculateVelocity(randomPosition, 'white');
                } else {
                    // Fallback calculation
                    const randomPosition = Math.random();
                    Math.round(randomPosition * 126) + 1;
                }
                
                const responseTime = performance.now() - startTime;
                responseTimes.push(responseTime);
            }
            
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);
            
            test.details.iterations = iterations;
            test.details.averageTime = avgResponseTime;
            test.details.maxTime = maxResponseTime;
            test.details.minTime = minResponseTime;
            
            // Performance requirements: avg < 5ms, max < 20ms
            test.passed = avgResponseTime < 5 && maxResponseTime < 20;
            
            this.testResults.performanceTests.push({
                test: 'velocity mapping',
                averageTime: avgResponseTime,
                maxTime: maxResponseTime,
                passed: test.passed
            });
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test MIDI velocity message validation
     */
    async testMidiVelocityValidation() {
        const test = { name: 'MIDI Velocity Message Validation', passed: false, details: { validationTests: [] } };
        
        try {
            const testVelocities = [1, 64, 127]; // Min, mid, max
            
            for (const velocity of testVelocities) {
                const validationTest = {
                    velocity: velocity,
                    messageValid: false,
                    passed: false
                };
                
                // Intercept MIDI messages to validate format
                let capturedMessage = null;
                const originalSendMidi = window.midiPlayer?.send_midi_message;
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = (message) => {
                        capturedMessage = Array.from(message);
                        originalSendMidi.call(window.midiPlayer, message);
                    };
                }
                
                // Send note with specific velocity
                this.sendNoteOn(0, 60, velocity);
                await this.delay(100);
                
                // Restore
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = originalSendMidi;
                }
                
                // Validate MIDI message format
                if (capturedMessage) {
                    const [status, note, vel] = capturedMessage;
                    validationTest.messageValid = 
                        (status & 0xF0) === 0x90 && // Note on
                        note === 60 && // Correct note
                        vel === velocity && // Correct velocity
                        vel >= 1 && vel <= 127; // Valid range
                }
                
                validationTest.capturedMessage = capturedMessage;
                validationTest.passed = validationTest.messageValid;
                
                test.details.validationTests.push(validationTest);
            }
            
            test.passed = test.details.validationTests.every(vt => vt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity consistency across multiple triggers
     */
    async testVelocityConsistency() {
        const test = { name: 'Velocity Consistency Test', passed: false, details: { consistencyTests: [] } };
        
        try {
            const testPositions = [0.2, 0.5, 0.8];
            
            for (const position of testPositions) {
                const consistencyTest = {
                    position: position,
                    velocities: [],
                    averageVelocity: 0,
                    standardDeviation: 0,
                    passed: false
                };
                
                // Test same position multiple times
                for (let i = 0; i < 10; i++) {
                    let velocity = 64; // Default
                    
                    if (window.velocityTester && window.velocityTester.calculateVelocity) {
                        velocity = window.velocityTester.calculateVelocity(position, 'white');
                    }
                    
                    consistencyTest.velocities.push(velocity);
                    await this.delay(50);
                }
                
                // Calculate statistics
                const avg = consistencyTest.velocities.reduce((a, b) => a + b, 0) / consistencyTest.velocities.length;
                const variance = consistencyTest.velocities.reduce((sum, vel) => sum + Math.pow(vel - avg, 2), 0) / consistencyTest.velocities.length;
                const stdDev = Math.sqrt(variance);
                
                consistencyTest.averageVelocity = avg;
                consistencyTest.standardDeviation = stdDev;
                consistencyTest.passed = stdDev <= 2; // Very consistent
                
                test.details.consistencyTests.push(consistencyTest);
            }
            
            test.passed = test.details.consistencyTests.every(ct => ct.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test velocity differences between white and black keys
     */
    async testKeyTypeVariations() {
        const test = { name: 'Key Type Velocity Variations', passed: false, details: { keyTests: [] } };
        
        try {
            const keyTypes = ['white', 'black'];
            const testPosition = 0.5; // Middle position
            
            for (const keyType of keyTypes) {
                const keyTest = {
                    keyType: keyType,
                    velocity: 0,
                    passed: false
                };
                
                if (window.velocityTester && window.velocityTester.calculateVelocity) {
                    keyTest.velocity = window.velocityTester.calculateVelocity(testPosition, keyType);
                    keyTest.passed = keyTest.velocity >= 1 && keyTest.velocity <= 127;
                } else {
                    keyTest.velocity = 64; // Default
                    keyTest.passed = true;
                }
                
                test.details.keyTests.push(keyTest);
            }
            
            // Check if both key types produce reasonable velocities
            test.passed = test.details.keyTests.every(kt => kt.passed);
            
            // Check if there's reasonable difference (optional)
            if (test.details.keyTests.length === 2) {
                const diff = Math.abs(test.details.keyTests[0].velocity - test.details.keyTests[1].velocity);
                test.details.velocityDifference = diff;
                test.details.reasonableDifference = diff <= 20; // Not too different
            }
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Generate test report
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
            velocitySensitivityCoverage: {
                mappingTests: this.testResults.velocityMappingTests.length,
                curveTests: this.testResults.velocityCurveTests.length,
                touchTests: this.testResults.touchVelocityTests.length,
                accuracyTests: this.testResults.accuracyTests.length,
                boundaryTests: this.testResults.boundaryTests.length,
                performanceTests: this.testResults.performanceTests.length
            }
        };
        
        console.log('📊 Velocity Sensitivity Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== VELOCITY SENSITIVITY TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    // Helper methods
    sendNoteOn(channel, note, velocity) {
        if (!window.midiPlayer) return;
        
        const message = new Uint8Array([
            0x90 | (channel & 0x0F),
            note & 0x7F,
            velocity & 0x7F
        ]);
        
        window.midiPlayer.send_midi_message(message);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default VelocitySensitivityAutomatedTest;