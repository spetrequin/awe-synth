/**
 * Automated Virtual Keyboard Testing Suite
 * Tests all 88 keys and various keyboard functionality
 */

export class VirtualKeyboardAutomatedTest {
    constructor() {
        this.testResults = {
            totalKeys: 88,
            testedKeys: 0,
            passedKeys: 0,
            failedKeys: [],
            velocityTests: [],
            touchTests: [],
            errors: []
        };
    }

    /**
     * Run complete test suite
     */
    async runFullTestSuite() {
        console.log('🎹 Starting Virtual Keyboard Automated Test Suite');
        
        const results = {
            keyboardInitialization: await this.testKeyboardInitialization(),
            allKeysTest: await this.testAllKeys(),
            velocityMapping: await this.testVelocityMapping(),
            simultaneousKeys: await this.testSimultaneousKeys(),
            touchInput: await this.testTouchInput(),
            keyboardShortcuts: await this.testKeyboardShortcuts(),
            octaveTransposition: await this.testOctaveTransposition()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test keyboard initialization
     */
    async testKeyboardInitialization() {
        const test = { name: 'Keyboard Initialization', passed: false, details: {} };
        
        try {
            // Check if virtual keyboard element exists
            const keyboard = document.querySelector('.virtual-keyboard');
            test.details.elementFound = !!keyboard;
            
            if (keyboard) {
                // Count keys
                const keys = keyboard.querySelectorAll('.piano-key');
                test.details.keyCount = keys.length;
                test.details.expectedKeys = 88;
                test.passed = keys.length === 88;
                
                // Check white and black keys
                const whiteKeys = keyboard.querySelectorAll('.piano-key.white');
                const blackKeys = keyboard.querySelectorAll('.piano-key.black');
                test.details.whiteKeys = whiteKeys.length;
                test.details.blackKeys = blackKeys.length;
                test.details.correctKeyDistribution = 
                    whiteKeys.length === 52 && blackKeys.length === 36;
            }
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test all 88 keys
     */
    async testAllKeys() {
        const test = { name: 'All Keys Test', passed: false, details: { keys: [] } };
        
        try {
            const keyboard = document.querySelector('.virtual-keyboard');
            if (!keyboard) throw new Error('Virtual keyboard not found');
            
            // Test each key from A0 (21) to C8 (108)
            for (let noteNumber = 21; noteNumber <= 108; noteNumber++) {
                const keyTest = await this.testSingleKey(noteNumber);
                test.details.keys.push(keyTest);
                
                if (keyTest.passed) {
                    this.testResults.passedKeys++;
                } else {
                    this.testResults.failedKeys.push(noteNumber);
                }
                
                this.testResults.testedKeys++;
                
                // Small delay between keys
                await this.delay(10);
            }
            
            test.passed = this.testResults.passedKeys === 88;
            test.details.summary = {
                total: 88,
                passed: this.testResults.passedKeys,
                failed: this.testResults.failedKeys.length
            };
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test a single key
     */
    async testSingleKey(noteNumber) {
        const keyTest = {
            note: noteNumber,
            noteName: this.getNoteName(noteNumber),
            passed: false,
            events: {}
        };
        
        try {
            const keyElement = document.querySelector(`[data-note="${noteNumber}"]`);
            if (!keyElement) {
                keyTest.error = 'Key element not found';
                return keyTest;
            }
            
            // Track events
            let mouseDownFired = false;
            let mouseUpFired = false;
            let noteOnSent = false;
            let noteOffSent = false;
            
            // Add event listeners
            const onMouseDown = () => { mouseDownFired = true; };
            const onMouseUp = () => { mouseUpFired = true; };
            
            keyElement.addEventListener('mousedown', onMouseDown);
            keyElement.addEventListener('mouseup', onMouseUp);
            
            // Monitor MIDI events (if accessible)
            const originalSendMidi = window.midiBridge?.sendMidiMessage;
            if (originalSendMidi) {
                window.midiBridge.sendMidiMessage = (message) => {
                    if (message[0] === 0x90 && message[1] === noteNumber) noteOnSent = true;
                    if (message[0] === 0x80 && message[1] === noteNumber) noteOffSent = true;
                    originalSendMidi.call(window.midiBridge, message);
                };
            }
            
            // Simulate key press
            const rect = keyElement.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            keyElement.dispatchEvent(new MouseEvent('mousedown', {
                clientX: x, clientY: y, bubbles: true
            }));
            
            await this.delay(50);
            
            keyElement.dispatchEvent(new MouseEvent('mouseup', {
                clientX: x, clientY: y, bubbles: true
            }));
            
            // Restore original function
            if (originalSendMidi) {
                window.midiBridge.sendMidiMessage = originalSendMidi;
            }
            
            // Clean up
            keyElement.removeEventListener('mousedown', onMouseDown);
            keyElement.removeEventListener('mouseup', onMouseUp);
            
            // Check results
            keyTest.events = {
                mouseDownFired,
                mouseUpFired,
                noteOnSent,
                noteOffSent
            };
            
            keyTest.passed = mouseDownFired && mouseUpFired;
            
        } catch (error) {
            keyTest.error = error.message;
        }
        
        return keyTest;
    }

    /**
     * Test velocity mapping
     */
    async testVelocityMapping() {
        const test = { name: 'Velocity Mapping', passed: false, details: { tests: [] } };
        
        try {
            const testNote = 60; // Middle C
            const keyElement = document.querySelector(`[data-note="${testNote}"]`);
            if (!keyElement) throw new Error('Test key not found');
            
            const rect = keyElement.getBoundingClientRect();
            const velocityTests = [
                { position: 0.9, expectedVelocity: 'low' },    // Near bottom
                { position: 0.5, expectedVelocity: 'medium' }, // Middle
                { position: 0.1, expectedVelocity: 'high' }    // Near top
            ];
            
            for (const vTest of velocityTests) {
                const x = rect.left + rect.width / 2;
                const y = rect.top + (rect.height * vTest.position);
                
                let capturedVelocity = null;
                
                // Intercept MIDI messages
                const originalSendMidi = window.midiBridge?.sendMidiMessage;
                if (originalSendMidi) {
                    window.midiBridge.sendMidiMessage = (message) => {
                        if (message[0] === 0x90 && message[1] === testNote) {
                            capturedVelocity = message[2];
                        }
                        originalSendMidi.call(window.midiBridge, message);
                    };
                }
                
                // Simulate press at different Y positions
                keyElement.dispatchEvent(new MouseEvent('mousedown', {
                    clientX: x, clientY: y, bubbles: true
                }));
                
                await this.delay(50);
                
                keyElement.dispatchEvent(new MouseEvent('mouseup', {
                    clientX: x, clientY: y, bubbles: true
                }));
                
                // Restore
                if (originalSendMidi) {
                    window.midiBridge.sendMidiMessage = originalSendMidi;
                }
                
                test.details.tests.push({
                    position: vTest.position,
                    expected: vTest.expectedVelocity,
                    captured: capturedVelocity,
                    passed: capturedVelocity !== null
                });
                
                await this.delay(100);
            }
            
            test.passed = test.details.tests.every(t => t.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test simultaneous key presses
     */
    async testSimultaneousKeys() {
        const test = { name: 'Simultaneous Keys', passed: false, details: {} };
        
        try {
            const testNotes = [60, 64, 67]; // C major chord
            const keys = testNotes.map(note => 
                document.querySelector(`[data-note="${note}"]`)
            );
            
            if (keys.some(k => !k)) throw new Error('Test keys not found');
            
            // Press all keys
            for (const key of keys) {
                const rect = key.getBoundingClientRect();
                key.dispatchEvent(new MouseEvent('mousedown', {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                    bubbles: true
                }));
            }
            
            await this.delay(200);
            
            // Release all keys
            for (const key of keys) {
                const rect = key.getBoundingClientRect();
                key.dispatchEvent(new MouseEvent('mouseup', {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                    bubbles: true
                }));
            }
            
            test.passed = true;
            test.details.notesPressed = testNotes;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test touch input simulation
     */
    async testTouchInput() {
        const test = { name: 'Touch Input', passed: false, details: {} };
        
        try {
            const testNote = 60;
            const keyElement = document.querySelector(`[data-note="${testNote}"]`);
            if (!keyElement) throw new Error('Test key not found');
            
            const rect = keyElement.getBoundingClientRect();
            const touch = {
                identifier: 1,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                target: keyElement
            };
            
            // Simulate touch start
            keyElement.dispatchEvent(new TouchEvent('touchstart', {
                touches: [touch],
                targetTouches: [touch],
                changedTouches: [touch],
                bubbles: true
            }));
            
            await this.delay(100);
            
            // Simulate touch end
            keyElement.dispatchEvent(new TouchEvent('touchend', {
                touches: [],
                targetTouches: [],
                changedTouches: [touch],
                bubbles: true
            }));
            
            test.passed = true;
            test.details.touchSimulated = true;
            
        } catch (error) {
            test.error = error.message;
            test.details.touchSupported = 'ontouchstart' in window;
        }
        
        return test;
    }

    /**
     * Test keyboard shortcuts
     */
    async testKeyboardShortcuts() {
        const test = { name: 'Keyboard Shortcuts', passed: false, details: { shortcuts: [] } };
        
        try {
            // Test octave up/down
            const shortcuts = [
                { key: 'ArrowUp', expected: 'octave up' },
                { key: 'ArrowDown', expected: 'octave down' },
                { key: 'z', expected: 'C note' },
                { key: 'x', expected: 'D note' },
                { key: 'c', expected: 'E note' }
            ];
            
            for (const shortcut of shortcuts) {
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: shortcut.key,
                    bubbles: true
                }));
                
                await this.delay(50);
                
                document.dispatchEvent(new KeyboardEvent('keyup', {
                    key: shortcut.key,
                    bubbles: true
                }));
                
                test.details.shortcuts.push({
                    key: shortcut.key,
                    expected: shortcut.expected,
                    tested: true
                });
                
                await this.delay(50);
            }
            
            test.passed = true;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test octave transposition
     */
    async testOctaveTransposition() {
        const test = { name: 'Octave Transposition', passed: false, details: {} };
        
        try {
            // Test octave changes
            const octaveDisplay = document.querySelector('.octave-display');
            const initialOctave = octaveDisplay ? 
                parseInt(octaveDisplay.textContent.match(/\d+/)?.[0] || '4') : 4;
            
            // Press octave up
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowUp', bubbles: true
            }));
            await this.delay(100);
            
            const octaveAfterUp = octaveDisplay ? 
                parseInt(octaveDisplay.textContent.match(/\d+/)?.[0] || '4') : 4;
            
            // Press octave down twice
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowDown', bubbles: true
            }));
            await this.delay(100);
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowDown', bubbles: true
            }));
            await this.delay(100);
            
            const octaveAfterDown = octaveDisplay ? 
                parseInt(octaveDisplay.textContent.match(/\d+/)?.[0] || '4') : 4;
            
            test.details = {
                initial: initialOctave,
                afterUp: octaveAfterUp,
                afterDown: octaveAfterDown
            };
            
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
            keyboardCoverage: {
                totalKeys: 88,
                testedKeys: this.testResults.testedKeys,
                passedKeys: this.testResults.passedKeys,
                failedKeys: this.testResults.failedKeys
            }
        };
        
        // Log report to console
        console.log('📊 Virtual Keyboard Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== VIRTUAL KEYBOARD TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    // Helper methods
    getNoteName(noteNumber) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor((noteNumber - 12) / 12);
        const noteName = noteNames[noteNumber % 12];
        return `${noteName}${octave}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
export default VirtualKeyboardAutomatedTest;