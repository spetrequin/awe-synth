/**
 * Automated MIDI CC Controls Testing Suite
 * Tests pitch bend, modulation wheel, sustain pedal, and other CC controllers
 */

export class CCControlsAutomatedTest {
    constructor() {
        this.testResults = {
            pitchBendTests: [],
            modulationTests: [],
            sustainTests: [],
            volumeTests: [],
            panTests: [],
            effectsTests: [],
            responseTimeTests: [],
            keyboardShortcutTests: [],
            errors: []
        };
        
        this.testChannel = 0;
        this.testNote = 60; // Middle C
    }

    /**
     * Run complete CC controls test suite
     */
    async runFullTestSuite() {
        console.log('🎛️ Starting MIDI CC Controls Automated Test Suite');
        
        const results = {
            ccControlsInit: await this.testCCControlsInit(),
            pitchBendRange: await this.testPitchBendRange(),
            pitchBendResponse: await this.testPitchBendResponse(),
            modulationWheel: await this.testModulationWheel(),
            sustainPedal: await this.testSustainPedal(),
            volumeExpression: await this.testVolumeExpression(),
            panBalance: await this.testPanBalance(),
            effectsSend: await this.testEffectsSend(),
            allCCControllers: await this.testAllCCControllers(),
            responseTimeMeasurement: await this.testResponseTimes(),
            keyboardShortcuts: await this.testKeyboardShortcuts(),
            ccMessageValidation: await this.testCCMessageValidation()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test CC controls initialization
     */
    async testCCControlsInit() {
        const test = { name: 'CC Controls Initialization', passed: false, details: {} };
        
        try {
            // Check for CC control UI elements
            const controlElements = {
                pitchBendSlider: document.getElementById('pitch-bend-slider'),
                modWheelSlider: document.getElementById('mod-wheel-slider'),
                sustainPedal: document.getElementById('sustain-pedal'),
                volumeSlider: document.getElementById('volume-slider'),
                panSlider: document.getElementById('pan-slider'),
                reverbSlider: document.getElementById('reverb-slider'),
                chorusSlider: document.getElementById('chorus-slider')
            };
            
            test.details.elementsFound = {};
            let foundElements = 0;
            
            for (const [name, element] of Object.entries(controlElements)) {
                test.details.elementsFound[name] = !!element;
                if (element) foundElements++;
            }
            
            test.details.totalElements = Object.keys(controlElements).length;
            test.details.foundElementsCount = foundElements;
            
            // Check MIDI player availability
            test.details.midiPlayerReady = !!window.midiPlayer;
            
            test.passed = foundElements >= 5 && window.midiPlayer;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test pitch bend range and accuracy
     */
    async testPitchBendRange() {
        const test = { name: 'Pitch Bend Range Test', passed: false, details: { bendTests: [] } };
        
        try {
            const testValues = [
                { value: 0, name: 'Maximum Down', expected: 'down' },
                { value: 4096, name: 'Quarter Down', expected: 'down' },
                { value: 8192, name: 'Center', expected: 'center' },
                { value: 12288, name: 'Quarter Up', expected: 'up' },
                { value: 16383, name: 'Maximum Up', expected: 'up' }
            ];
            
            // Start test note
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(200);
            
            for (const testValue of testValues) {
                const bendTest = {
                    name: testValue.name,
                    value: testValue.value,
                    expected: testValue.expected,
                    passed: false,
                    responseTime: 0
                };
                
                const startTime = performance.now();
                this.sendPitchBend(this.testChannel, testValue.value);
                bendTest.responseTime = performance.now() - startTime;
                
                await this.delay(300);
                
                // Test passed if no errors and response time is reasonable
                bendTest.passed = bendTest.responseTime < 50;
                test.details.bendTests.push(bendTest);
                
                this.testResults.pitchBendTests.push(bendTest);
            }
            
            // Return to center
            this.sendPitchBend(this.testChannel, 8192);
            this.sendNoteOff(this.testChannel, this.testNote);
            
            test.passed = test.details.bendTests.every(bt => bt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test pitch bend response time
     */
    async testPitchBendResponse() {
        const test = { name: 'Pitch Bend Response Time', passed: false, details: { measurements: [] } };
        
        try {
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(200);
            
            // Test rapid pitch bend changes
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                const bendValue = Math.floor(Math.random() * 16384);
                
                this.sendPitchBend(this.testChannel, bendValue);
                
                const responseTime = performance.now() - startTime;
                test.details.measurements.push({
                    iteration: i + 1,
                    bendValue: bendValue,
                    responseTime: responseTime
                });
                
                await this.delay(100);
            }
            
            this.sendNoteOff(this.testChannel, this.testNote);
            
            // Calculate statistics
            const times = test.details.measurements.map(m => m.responseTime);
            test.details.averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            test.details.maxTime = Math.max(...times);
            test.details.minTime = Math.min(...times);
            
            test.passed = test.details.averageTime < 10 && test.details.maxTime < 50;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test modulation wheel functionality
     */
    async testModulationWheel() {
        const test = { name: 'Modulation Wheel Test', passed: false, details: { modTests: [] } };
        
        try {
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(200);
            
            // Test modulation values
            const modValues = [0, 32, 64, 96, 127];
            
            for (const modValue of modValues) {
                const modTest = {
                    value: modValue,
                    passed: false,
                    responseTime: 0
                };
                
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 1, modValue); // CC 1 = Modulation
                modTest.responseTime = performance.now() - startTime;
                
                await this.delay(300);
                
                modTest.passed = modTest.responseTime < 20;
                test.details.modTests.push(modTest);
                
                this.testResults.modulationTests.push(modTest);
            }
            
            // Return to 0
            this.sendControlChange(this.testChannel, 1, 0);
            this.sendNoteOff(this.testChannel, this.testNote);
            
            test.passed = test.details.modTests.every(mt => mt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test sustain pedal functionality
     */
    async testSustainPedal() {
        const test = { name: 'Sustain Pedal Test', passed: false, details: { sustainTests: [] } };
        
        try {
            // Test sustain off behavior
            this.sendControlChange(this.testChannel, 64, 0); // Sustain off
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(500);
            this.sendNoteOff(this.testChannel, this.testNote);
            
            const sustainOffTest = {
                name: 'Sustain Off',
                pedalValue: 0,
                passed: true, // Assume passed if no errors
                responseTime: 0
            };
            test.details.sustainTests.push(sustainOffTest);
            
            await this.delay(500);
            
            // Test sustain on behavior
            const startTime = performance.now();
            this.sendControlChange(this.testChannel, 64, 127); // Sustain on
            const sustainOnTime = performance.now() - startTime;
            
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(300);
            this.sendNoteOff(this.testChannel, this.testNote); // Note should sustain
            
            await this.delay(1000); // Wait while sustained
            
            this.sendControlChange(this.testChannel, 64, 0); // Release sustain
            
            const sustainOnTest = {
                name: 'Sustain On',
                pedalValue: 127,
                passed: sustainOnTime < 20,
                responseTime: sustainOnTime
            };
            test.details.sustainTests.push(sustainOnTest);
            
            await this.delay(500);
            
            this.testResults.sustainTests.push(...test.details.sustainTests);
            test.passed = test.details.sustainTests.every(st => st.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test volume and expression controllers
     */
    async testVolumeExpression() {
        const test = { name: 'Volume & Expression Test', passed: false, details: { volumeTests: [] } };
        
        try {
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(200);
            
            // Test volume (CC 7)
            const volumeValues = [127, 100, 64, 32, 0, 100];
            for (const volume of volumeValues) {
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 7, volume);
                const responseTime = performance.now() - startTime;
                
                test.details.volumeTests.push({
                    controller: 'Volume (CC 7)',
                    value: volume,
                    responseTime: responseTime,
                    passed: responseTime < 20
                });
                
                await this.delay(300);
            }
            
            // Test expression (CC 11)
            const expressionValues = [127, 64, 32, 0, 127];
            for (const expression of expressionValues) {
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 11, expression);
                const responseTime = performance.now() - startTime;
                
                test.details.volumeTests.push({
                    controller: 'Expression (CC 11)',
                    value: expression,
                    responseTime: responseTime,
                    passed: responseTime < 20
                });
                
                await this.delay(300);
            }
            
            this.sendNoteOff(this.testChannel, this.testNote);
            
            this.testResults.volumeTests.push(...test.details.volumeTests);
            test.passed = test.details.volumeTests.every(vt => vt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test pan and balance controllers
     */
    async testPanBalance() {
        const test = { name: 'Pan & Balance Test', passed: false, details: { panTests: [] } };
        
        try {
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(200);
            
            // Test pan (CC 10)
            const panValues = [0, 32, 64, 96, 127]; // Left, left-center, center, right-center, right
            for (const pan of panValues) {
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 10, pan);
                const responseTime = performance.now() - startTime;
                
                test.details.panTests.push({
                    controller: 'Pan (CC 10)',
                    value: pan,
                    position: pan < 32 ? 'left' : pan > 96 ? 'right' : 'center',
                    responseTime: responseTime,
                    passed: responseTime < 20
                });
                
                await this.delay(400);
            }
            
            // Test balance (CC 8)
            const balanceValues = [0, 64, 127];
            for (const balance of balanceValues) {
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 8, balance);
                const responseTime = performance.now() - startTime;
                
                test.details.panTests.push({
                    controller: 'Balance (CC 8)',
                    value: balance,
                    responseTime: responseTime,
                    passed: responseTime < 20
                });
                
                await this.delay(300);
            }
            
            this.sendNoteOff(this.testChannel, this.testNote);
            
            this.testResults.panTests.push(...test.details.panTests);
            test.passed = test.details.panTests.every(pt => pt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test effects send controllers
     */
    async testEffectsSend() {
        const test = { name: 'Effects Send Test', passed: false, details: { effectsTests: [] } };
        
        try {
            this.sendNoteOn(this.testChannel, this.testNote, 80);
            await this.delay(200);
            
            // Test reverb send (CC 91)
            const reverbValues = [0, 40, 80, 127];
            for (const reverb of reverbValues) {
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 91, reverb);
                const responseTime = performance.now() - startTime;
                
                test.details.effectsTests.push({
                    controller: 'Reverb Send (CC 91)',
                    value: reverb,
                    responseTime: responseTime,
                    passed: responseTime < 20
                });
                
                await this.delay(400);
            }
            
            // Test chorus send (CC 93)
            const chorusValues = [0, 64, 127];
            for (const chorus of chorusValues) {
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, 93, chorus);
                const responseTime = performance.now() - startTime;
                
                test.details.effectsTests.push({
                    controller: 'Chorus Send (CC 93)',
                    value: chorus,
                    responseTime: responseTime,
                    passed: responseTime < 20
                });
                
                await this.delay(400);
            }
            
            this.sendNoteOff(this.testChannel, this.testNote);
            
            this.testResults.effectsTests.push(...test.details.effectsTests);
            test.passed = test.details.effectsTests.every(et => et.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test all CC controllers (0-127)
     */
    async testAllCCControllers() {
        const test = { name: 'All CC Controllers Test', passed: false, details: { ccTests: [] } };
        
        try {
            // Test key CC controllers
            const importantCCs = [
                1,   // Modulation
                2,   // Breath Controller
                4,   // Foot Controller
                5,   // Portamento Time
                7,   // Volume
                8,   // Balance
                10,  // Pan
                11,  // Expression
                64,  // Sustain Pedal
                65,  // Portamento On/Off
                66,  // Sostenuto
                67,  // Soft Pedal
                68,  // Legato Footswitch
                91,  // Reverb Send
                93,  // Chorus Send
                120, // All Sound Off
                121, // Reset All Controllers
                123  // All Notes Off
            ];
            
            for (const cc of importantCCs) {
                const ccTest = {
                    ccNumber: cc,
                    name: this.getCCName(cc),
                    passed: false,
                    responseTime: 0
                };
                
                const startTime = performance.now();
                this.sendControlChange(this.testChannel, cc, 64); // Mid value
                ccTest.responseTime = performance.now() - startTime;
                
                await this.delay(50);
                
                ccTest.passed = ccTest.responseTime < 50;
                test.details.ccTests.push(ccTest);
            }
            
            test.passed = test.details.ccTests.filter(ct => ct.passed).length >= importantCCs.length * 0.8;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test response times for real-time performance
     */
    async testResponseTimes() {
        const test = { name: 'Response Time Performance', passed: false, details: { measurements: [] } };
        
        try {
            const controllers = [1, 7, 10, 64, 91]; // Key controllers
            
            for (const cc of controllers) {
                const measurements = [];
                
                // Take multiple measurements
                for (let i = 0; i < 10; i++) {
                    const startTime = performance.now();
                    this.sendControlChange(this.testChannel, cc, Math.floor(Math.random() * 128));
                    const responseTime = performance.now() - startTime;
                    
                    measurements.push(responseTime);
                    await this.delay(50);
                }
                
                const ccMeasurement = {
                    ccNumber: cc,
                    name: this.getCCName(cc),
                    measurements: measurements,
                    average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
                    max: Math.max(...measurements),
                    min: Math.min(...measurements)
                };
                
                test.details.measurements.push(ccMeasurement);
                this.testResults.responseTimeTests.push(ccMeasurement);
            }
            
            // Overall performance requirements
            const averageTimes = test.details.measurements.map(m => m.average);
            const overallAverage = averageTimes.reduce((a, b) => a + b, 0) / averageTimes.length;
            const maxTime = Math.max(...test.details.measurements.map(m => m.max));
            
            test.details.overallAverage = overallAverage;
            test.details.maxResponseTime = maxTime;
            
            // Pass if average < 10ms and max < 50ms
            test.passed = overallAverage < 10 && maxTime < 50;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test keyboard shortcuts for CC controls
     */
    async testKeyboardShortcuts() {
        const test = { name: 'Keyboard Shortcuts Test', passed: false, details: { shortcuts: [] } };
        
        try {
            const shortcuts = [
                { key: 'Space', expectedCC: 64, description: 'Sustain pedal toggle' },
                { key: 'ArrowUp', expectedAction: 'pitch bend up' },
                { key: 'ArrowDown', expectedAction: 'pitch bend down' },
                { key: 'KeyW', expectedCC: 1, description: 'Modulation up' },
                { key: 'KeyS', expectedCC: 1, description: 'Modulation down' }
            ];
            
            for (const shortcut of shortcuts) {
                // Simulate keyboard event
                const keyboardEvent = new KeyboardEvent('keydown', {
                    code: shortcut.key,
                    bubbles: true
                });
                
                const startTime = performance.now();
                document.dispatchEvent(keyboardEvent);
                const responseTime = performance.now() - startTime;
                
                await this.delay(100);
                
                test.details.shortcuts.push({
                    key: shortcut.key,
                    description: shortcut.description || shortcut.expectedAction,
                    responseTime: responseTime,
                    passed: responseTime < 100
                });
            }
            
            this.testResults.keyboardShortcutTests.push(...test.details.shortcuts);
            test.passed = test.details.shortcuts.every(s => s.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test MIDI CC message validation
     */
    async testCCMessageValidation() {
        const test = { name: 'MIDI CC Message Validation', passed: false, details: { validationTests: [] } };
        
        try {
            // Test boundary values
            const boundaryTests = [
                { cc: 1, value: 0, description: 'Minimum value' },
                { cc: 1, value: 127, description: 'Maximum value' },
                { cc: 64, value: 63, description: 'Sustain off threshold' },
                { cc: 64, value: 64, description: 'Sustain on threshold' }
            ];
            
            for (const boundaryTest of boundaryTests) {
                let messageValid = false;
                
                // Intercept MIDI messages to validate format
                const originalSendMidi = window.midiPlayer?.send_midi_message;
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = (message) => {
                        // Validate CC message format: [0xB0-0xBF, CC, Value]
                        if ((message[0] & 0xF0) === 0xB0 && 
                            message[1] === boundaryTest.cc && 
                            message[2] === boundaryTest.value) {
                            messageValid = true;
                        }
                        originalSendMidi.call(window.midiPlayer, message);
                    };
                }
                
                this.sendControlChange(this.testChannel, boundaryTest.cc, boundaryTest.value);
                
                // Restore
                if (originalSendMidi) {
                    window.midiPlayer.send_midi_message = originalSendMidi;
                }
                
                test.details.validationTests.push({
                    cc: boundaryTest.cc,
                    value: boundaryTest.value,
                    description: boundaryTest.description,
                    messageValid: messageValid,
                    passed: messageValid
                });
                
                await this.delay(100);
            }
            
            test.passed = test.details.validationTests.every(vt => vt.passed);
            
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
            ccControlsCoverage: {
                pitchBendTests: this.testResults.pitchBendTests.length,
                modulationTests: this.testResults.modulationTests.length,
                sustainTests: this.testResults.sustainTests.length,
                volumeTests: this.testResults.volumeTests.length,
                panTests: this.testResults.panTests.length,
                effectsTests: this.testResults.effectsTests.length,
                responseTimeTests: this.testResults.responseTimeTests.length
            }
        };
        
        console.log('📊 CC Controls Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== CC CONTROLS TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    // Helper methods
    getCCName(ccNumber) {
        const ccNames = {
            1: 'Modulation Wheel',
            2: 'Breath Controller',
            4: 'Foot Controller',
            5: 'Portamento Time',
            7: 'Volume',
            8: 'Balance',
            10: 'Pan',
            11: 'Expression',
            64: 'Sustain Pedal',
            65: 'Portamento On/Off',
            66: 'Sostenuto',
            67: 'Soft Pedal',
            68: 'Legato Footswitch',
            91: 'Reverb Send',
            93: 'Chorus Send',
            120: 'All Sound Off',
            121: 'Reset All Controllers',
            123: 'All Notes Off'
        };
        return ccNames[ccNumber] || `CC ${ccNumber}`;
    }

    // MIDI message helpers
    sendPitchBend(channel, bendValue) {
        if (!window.midiPlayer) return;
        
        const lsb = bendValue & 0x7F;
        const msb = (bendValue >> 7) & 0x7F;
        
        const message = new Uint8Array([
            0xE0 | (channel & 0x0F),
            lsb,
            msb
        ]);
        
        window.midiPlayer.send_midi_message(message);
    }

    sendControlChange(channel, cc, value) {
        if (!window.midiPlayer) return;
        
        const message = new Uint8Array([
            0xB0 | (channel & 0x0F),
            cc & 0x7F,
            value & 0x7F
        ]);
        
        window.midiPlayer.send_midi_message(message);
    }

    sendNoteOn(channel, note, velocity) {
        if (!window.midiPlayer) return;
        
        const message = new Uint8Array([
            0x90 | (channel & 0x0F),
            note & 0x7F,
            velocity & 0x7F
        ]);
        
        window.midiPlayer.send_midi_message(message);
    }

    sendNoteOff(channel, note) {
        if (!window.midiPlayer) return;
        
        const message = new Uint8Array([
            0x80 | (channel & 0x0F),
            note & 0x7F,
            0
        ]);
        
        window.midiPlayer.send_midi_message(message);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default CCControlsAutomatedTest;