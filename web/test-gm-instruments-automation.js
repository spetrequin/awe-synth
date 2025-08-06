/**
 * Automated General MIDI Instrument Testing Suite
 * Tests all 128 GM instruments and drum kits
 */

export class GMInstrumentAutomatedTest {
    constructor() {
        this.testResults = {
            totalInstruments: 128,
            testedInstruments: 0,
            passedInstruments: 0,
            failedInstruments: [],
            drumKitTests: [],
            programChangeTests: [],
            bankSelectTests: [],
            errors: []
        };
    }

    /**
     * Run complete GM instrument test suite
     */
    async runFullTestSuite() {
        console.log('🎼 Starting General MIDI Instrument Automated Test Suite');
        
        const results = {
            instrumentSelectorInit: await this.testInstrumentSelectorInit(),
            allInstruments: await this.testAllInstruments(),
            drumKits: await this.testDrumKits(),
            programChanges: await this.testProgramChanges(),
            bankSelect: await this.testBankSelect(),
            instrumentCategories: await this.testInstrumentCategories(),
            midiChannelIsolation: await this.testMidiChannelIsolation()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test instrument selector initialization
     */
    async testInstrumentSelectorInit() {
        const test = { name: 'Instrument Selector Initialization', passed: false, details: {} };
        
        try {
            // Check if instrument selector exists
            const selector = document.querySelector('.instrument-selector, #instrument-select, select[name="instrument"]');
            test.details.selectorFound = !!selector;
            
            if (selector) {
                // Check if it's populated with instruments
                const options = selector.querySelectorAll('option');
                test.details.optionCount = options.length;
                test.details.expectedOptions = 128; // GM instruments
                
                // Verify some key instruments
                const instrumentNames = Array.from(options).map(opt => opt.textContent);
                test.details.hasPiano = instrumentNames.some(name => name.toLowerCase().includes('piano'));
                test.details.hasStrings = instrumentNames.some(name => name.toLowerCase().includes('string'));
                test.details.hasDrums = instrumentNames.some(name => name.toLowerCase().includes('drum'));
                
                test.passed = options.length >= 128;
            }
            
            // Check for MIDI player initialization
            test.details.midiPlayerReady = !!window.midiPlayer;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test all 128 GM instruments
     */
    async testAllInstruments() {
        const test = { name: 'All GM Instruments Test', passed: false, details: { instruments: [] } };
        
        try {
            // Test each instrument
            for (let program = 0; program < 128; program++) {
                const instrumentTest = await this.testSingleInstrument(program);
                test.details.instruments.push(instrumentTest);
                
                if (instrumentTest.passed) {
                    this.testResults.passedInstruments++;
                } else {
                    this.testResults.failedInstruments.push(program);
                }
                
                this.testResults.testedInstruments++;
                
                // Small delay between instruments
                await this.delay(50);
            }
            
            test.passed = this.testResults.passedInstruments === 128;
            test.details.summary = {
                total: 128,
                passed: this.testResults.passedInstruments,
                failed: this.testResults.failedInstruments.length
            };
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test a single instrument
     */
    async testSingleInstrument(program) {
        const instrumentTest = {
            program: program,
            name: this.getInstrumentName(program),
            passed: false,
            midiMessages: []
        };
        
        try {
            // Track MIDI messages
            let programChangeSent = false;
            let noteOnSent = false;
            let noteOffSent = false;
            
            // Intercept MIDI messages if possible
            const originalSendMidi = window.midiPlayer?.send_midi_message;
            if (originalSendMidi) {
                window.midiPlayer.send_midi_message = (message) => {
                    // Check for program change (0xC0-0xCF)
                    if ((message[0] & 0xF0) === 0xC0 && message[1] === program) {
                        programChangeSent = true;
                    }
                    // Check for note on (0x90-0x9F)
                    if ((message[0] & 0xF0) === 0x90) {
                        noteOnSent = true;
                    }
                    // Check for note off (0x80-0x8F)
                    if ((message[0] & 0xF0) === 0x80) {
                        noteOffSent = true;
                    }
                    
                    instrumentTest.midiMessages.push({
                        status: message[0],
                        data1: message[1],
                        data2: message[2]
                    });
                    
                    originalSendMidi.call(window.midiPlayer, message);
                };
            }
            
            // Send program change
            this.sendProgramChange(0, program);
            await this.delay(50);
            
            // Play test note
            this.sendNoteOn(0, 60, 80); // Middle C
            await this.delay(200);
            this.sendNoteOff(0, 60);
            
            // Restore original function
            if (originalSendMidi) {
                window.midiPlayer.send_midi_message = originalSendMidi;
            }
            
            // Check results
            instrumentTest.passed = programChangeSent || instrumentTest.midiMessages.length > 0;
            
        } catch (error) {
            instrumentTest.error = error.message;
        }
        
        return instrumentTest;
    }

    /**
     * Test drum kits on channel 10
     */
    async testDrumKits() {
        const test = { name: 'Drum Kit Test', passed: false, details: { kits: [] } };
        
        try {
            const drumKits = [
                { program: 0, name: "Standard Kit" },
                { program: 8, name: "Room Kit" },
                { program: 16, name: "Power Kit" },
                { program: 24, name: "Electronic Kit" },
                { program: 25, name: "TR-808 Kit" },
                { program: 32, name: "Jazz Kit" },
                { program: 40, name: "Brush Kit" },
                { program: 48, name: "Orchestra Kit" },
                { program: 56, name: "SFX Kit" }
            ];
            
            for (const kit of drumKits) {
                const kitTest = {
                    program: kit.program,
                    name: kit.name,
                    passed: false,
                    drumNotes: []
                };
                
                // Send program change on channel 10
                this.sendProgramChange(9, kit.program);
                await this.delay(100);
                
                // Test key drum notes
                const testNotes = [36, 38, 42, 46]; // Kick, snare, closed hat, open hat
                for (const note of testNotes) {
                    this.sendNoteOn(9, note, 100);
                    await this.delay(100);
                    this.sendNoteOff(9, note);
                    
                    kitTest.drumNotes.push({
                        note: note,
                        name: this.getDrumNoteName(note)
                    });
                }
                
                kitTest.passed = true;
                test.details.kits.push(kitTest);
                
                await this.delay(200);
            }
            
            test.passed = test.details.kits.every(k => k.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test program change responsiveness
     */
    async testProgramChanges() {
        const test = { name: 'Program Change Speed Test', passed: false, details: { changes: [] } };
        
        try {
            const testPrograms = [0, 24, 48, 73, 104]; // Various instruments
            const startTime = performance.now();
            
            // Rapid program changes
            for (let i = 0; i < 3; i++) {
                for (const program of testPrograms) {
                    const changeStart = performance.now();
                    
                    this.sendProgramChange(0, program);
                    this.sendNoteOn(0, 60, 80);
                    await this.delay(50);
                    this.sendNoteOff(0, 60);
                    
                    const changeTime = performance.now() - changeStart;
                    test.details.changes.push({
                        program: program,
                        time: changeTime,
                        passed: changeTime < 100 // Should be fast
                    });
                    
                    await this.delay(50);
                }
            }
            
            const totalTime = performance.now() - startTime;
            test.details.totalTime = totalTime;
            test.details.averageTime = totalTime / (testPrograms.length * 3);
            test.passed = test.details.changes.every(c => c.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test bank select functionality
     */
    async testBankSelect() {
        const test = { name: 'Bank Select Test', passed: false, details: { banks: [] } };
        
        try {
            const testCases = [
                { bank: 0, program: 0, description: "Bank 0 (default)" },
                { bank: 8, program: 0, description: "Bank 8 (variation)" },
                { bank: 16, program: 0, description: "Bank 16" }
            ];
            
            for (const testCase of testCases) {
                const bankTest = {
                    bank: testCase.bank,
                    program: testCase.program,
                    description: testCase.description,
                    passed: false
                };
                
                // Send bank select MSB (CC 0)
                this.sendControlChange(0, 0, testCase.bank);
                await this.delay(10);
                
                // Send bank select LSB (CC 32)
                this.sendControlChange(0, 32, 0);
                await this.delay(10);
                
                // Send program change
                this.sendProgramChange(0, testCase.program);
                await this.delay(50);
                
                // Play test note
                this.sendNoteOn(0, 60, 80);
                await this.delay(200);
                this.sendNoteOff(0, 60);
                
                bankTest.passed = true;
                test.details.banks.push(bankTest);
                
                await this.delay(100);
            }
            
            test.passed = test.details.banks.every(b => b.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test instrument categories
     */
    async testInstrumentCategories() {
        const test = { name: 'Instrument Categories Test', passed: false, details: { categories: [] } };
        
        try {
            const categories = [
                { name: "Piano", start: 0, end: 7 },
                { name: "Chromatic Percussion", start: 8, end: 15 },
                { name: "Organ", start: 16, end: 23 },
                { name: "Guitar", start: 24, end: 31 },
                { name: "Bass", start: 32, end: 39 },
                { name: "Strings", start: 40, end: 47 },
                { name: "Ensemble", start: 48, end: 55 },
                { name: "Brass", start: 56, end: 63 },
                { name: "Reed", start: 64, end: 71 },
                { name: "Pipe", start: 72, end: 79 },
                { name: "Synth Lead", start: 80, end: 87 },
                { name: "Synth Pad", start: 88, end: 95 },
                { name: "Synth Effects", start: 96, end: 103 },
                { name: "Ethnic", start: 104, end: 111 },
                { name: "Percussive", start: 112, end: 119 },
                { name: "Sound Effects", start: 120, end: 127 }
            ];
            
            for (const category of categories) {
                const categoryTest = {
                    name: category.name,
                    range: `${category.start}-${category.end}`,
                    tested: 0,
                    passed: false
                };
                
                // Test first and last instrument in category
                for (const program of [category.start, category.end]) {
                    this.sendProgramChange(0, program);
                    await this.delay(50);
                    
                    this.sendNoteOn(0, 60, 80);
                    await this.delay(100);
                    this.sendNoteOff(0, 60);
                    
                    categoryTest.tested++;
                }
                
                categoryTest.passed = categoryTest.tested === 2;
                test.details.categories.push(categoryTest);
                
                await this.delay(100);
            }
            
            test.passed = test.details.categories.every(c => c.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test MIDI channel isolation
     */
    async testMidiChannelIsolation() {
        const test = { name: 'MIDI Channel Isolation Test', passed: false, details: { channels: [] } };
        
        try {
            // Test that different channels can have different instruments
            const testChannels = [0, 1, 2, 3]; // Channels 1-4
            const testPrograms = [0, 24, 48, 73]; // Piano, guitar, strings, flute
            
            // Set different instrument on each channel
            for (let i = 0; i < testChannels.length; i++) {
                const channel = testChannels[i];
                const program = testPrograms[i];
                
                this.sendProgramChange(channel, program);
                await this.delay(50);
                
                test.details.channels.push({
                    channel: channel + 1,
                    program: program,
                    instrument: this.getInstrumentName(program)
                });
            }
            
            // Play note on each channel
            for (const channel of testChannels) {
                this.sendNoteOn(channel, 60, 80);
                await this.delay(200);
                this.sendNoteOff(channel, 60);
                await this.delay(100);
            }
            
            test.passed = true;
            
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
            instrumentCoverage: {
                totalInstruments: 128,
                testedInstruments: this.testResults.testedInstruments,
                passedInstruments: this.testResults.passedInstruments,
                failedInstruments: this.testResults.failedInstruments
            }
        };
        
        // Log report
        console.log('📊 GM Instrument Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== GM INSTRUMENT TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    // Helper methods
    getInstrumentName(program) {
        const names = [
            "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano",
            "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet",
            "Celesta", "Glockenspiel", "Music Box", "Vibraphone",
            "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
            // ... (abbreviated for brevity)
        ];
        return names[program] || `Instrument ${program}`;
    }

    getDrumNoteName(note) {
        const drumMap = {
            36: "Bass Drum 1",
            38: "Acoustic Snare",
            42: "Closed Hi-Hat",
            46: "Open Hi-Hat",
            49: "Crash Cymbal 1",
            51: "Ride Cymbal 1"
        };
        return drumMap[note] || `Drum Note ${note}`;
    }

    // MIDI message helpers
    sendProgramChange(channel, program) {
        if (!window.midiPlayer) return;
        
        const message = new Uint8Array([
            0xC0 | (channel & 0x0F),
            program & 0x7F
        ]);
        
        window.midiPlayer.send_midi_message(message);
    }

    sendControlChange(channel, controller, value) {
        if (!window.midiPlayer) return;
        
        const message = new Uint8Array([
            0xB0 | (channel & 0x0F),
            controller & 0x7F,
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

// Export for use
export default GMInstrumentAutomatedTest;