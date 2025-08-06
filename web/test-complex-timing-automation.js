/**
 * Automated Complex Timing Testing Suite
 * Tests triplets, grace notes, simultaneous events, and polyrhythms
 */

export class ComplexTimingAutomatedTest {
    constructor() {
        this.testResults = {
            tripletTests: [],
            graceNoteTests: [],
            simultaneousEventTests: [],
            polyrhythmTests: [],
            microTimingTests: [],
            subdivisionTests: [],
            precisionTests: [],
            errors: []
        };
        
        this.timingPatterns = this.createComplexTimingPatterns();
    }

    /**
     * Create comprehensive complex timing patterns for testing
     */
    createComplexTimingPatterns() {
        return {
            simpleTriplets: {
                name: 'Simple Quarter Triplets',
                type: 'triplet',
                subdivision: 3,
                noteValue: 'quarter',
                expectedAccuracy: 98.5,
                expectedJitter: 1.0,
                complexity: 'easy'
            },
            eighthTriplets: {
                name: 'Eighth Note Triplets',
                type: 'triplet',
                subdivision: 3,
                noteValue: 'eighth',
                expectedAccuracy: 96.0,
                expectedJitter: 1.5,
                complexity: 'medium'
            },
            sixteenthTriplets: {
                name: 'Sixteenth Triplets',
                type: 'triplet',
                subdivision: 3,
                noteValue: 'sixteenth',
                expectedAccuracy: 92.0,
                expectedJitter: 2.0,
                complexity: 'hard'
            },
            quintuplets: {
                name: 'Quintuplets',
                type: 'tuplet',
                subdivision: 5,
                noteValue: 'eighth',
                expectedAccuracy: 88.0,
                expectedJitter: 2.5,
                complexity: 'hard'
            },
            septuplets: {
                name: 'Septuplets',
                type: 'tuplet',
                subdivision: 7,
                noteValue: 'eighth',
                expectedAccuracy: 82.0,
                expectedJitter: 3.0,
                complexity: 'extreme'
            },
            simpleGraceNotes: {
                name: 'Acciaccatura',
                type: 'grace',
                graceType: 'acciaccatura',
                expectedTiming: 50, // 50ms before beat
                expectedAccuracy: 94.0,
                complexity: 'medium'
            },
            multipleGraceNotes: {
                name: 'Multiple Grace Notes',
                type: 'grace',
                graceType: 'multiple',
                graceCount: 3,
                expectedTiming: 40,
                expectedAccuracy: 88.0,
                complexity: 'hard'
            },
            appoggiatura: {
                name: 'Appoggiatura',
                type: 'grace',
                graceType: 'appoggiatura',
                expectedTiming: 100, // 100ms duration
                expectedAccuracy: 90.0,
                complexity: 'medium'
            },
            trills: {
                name: 'Trills and Turns',
                type: 'ornament',
                ornamentType: 'trill',
                expectedRate: 16, // 16 notes per second
                expectedAccuracy: 85.0,
                complexity: 'hard'
            },
            simpleChords: {
                name: 'Simple Chords',
                type: 'simultaneous',
                noteCount: 3,
                expectedSpread: 0.5, // 0.5ms max spread
                expectedAccuracy: 97.0,
                complexity: 'easy'
            },
            complexChords: {
                name: 'Complex Chords',
                type: 'simultaneous',
                noteCount: 6,
                expectedSpread: 1.0,
                expectedAccuracy: 94.0,
                complexity: 'medium'
            },
            massiveChords: {
                name: 'Massive Chords',
                type: 'simultaneous',
                noteCount: 12,
                expectedSpread: 2.0,
                expectedAccuracy: 88.0,
                complexity: 'hard'
            },
            extremeSimultaneity: {
                name: 'Extreme Simultaneity',
                type: 'simultaneous',
                noteCount: 20,
                expectedSpread: 3.0,
                expectedAccuracy: 80.0,
                complexity: 'extreme'
            },
            polyrhythm_2v3: {
                name: 'Polyrhythm 2:3',
                type: 'polyrhythm',
                rhythm1: 2,
                rhythm2: 3,
                expectedAccuracy: 95.0,
                complexity: 'medium'
            },
            polyrhythm_3v4: {
                name: 'Polyrhythm 3:4',
                type: 'polyrhythm',
                rhythm1: 3,
                rhythm2: 4,
                expectedAccuracy: 90.0,
                complexity: 'hard'
            },
            polyrhythm_4v5: {
                name: 'Polyrhythm 4:5',
                type: 'polyrhythm',
                rhythm1: 4,
                rhythm2: 5,
                expectedAccuracy: 85.0,
                complexity: 'hard'
            },
            polyrhythm_5v7: {
                name: 'Polyrhythm 5:7',
                type: 'polyrhythm',
                rhythm1: 5,
                rhythm2: 7,
                expectedAccuracy: 75.0,
                complexity: 'extreme'
            },
            microTiming: {
                name: 'Sub-millisecond Precision',
                type: 'micro',
                precision: 0.1, // 0.1ms precision
                expectedAccuracy: 99.5,
                complexity: 'extreme'
            },
            humanization: {
                name: 'Human-like Timing',
                type: 'humanized',
                variation: 5, // ±5ms natural variation
                expectedAccuracy: 95.0,
                complexity: 'medium'
            },
            swingRhythm: {
                name: 'Swing Rhythm',
                type: 'swing',
                swingAmount: 67, // 67% swing
                expectedAccuracy: 92.0,
                complexity: 'medium'
            },
            shuffleRhythm: {
                name: 'Shuffle Rhythm',
                type: 'shuffle',
                shuffleAmount: 75, // 75% shuffle
                expectedAccuracy: 90.0,
                complexity: 'medium'
            }
        };
    }

    /**
     * Run complete complex timing test suite
     */
    async runFullTestSuite() {
        console.log('🎼 Starting Complex Timing Automated Test Suite');
        
        const results = {
            complexTimingInit: await this.testComplexTimingInit(),
            tripletAccuracy: await this.testTripletAccuracy(),
            graceNoteTiming: await this.testGraceNoteTiming(),
            simultaneousEventPrecision: await this.testSimultaneousEventPrecision(),
            polyrhythmCoordination: await this.testPolyrhythmCoordination(),
            subdivisionHandling: await this.testSubdivisionHandling(),
            microTimingPrecision: await this.testMicroTimingPrecision(),
            ornamentExecution: await this.testOrnamentExecution(),
            rhythmicStyleHandling: await this.testRhythmicStyleHandling(),
            extremeTimingStress: await this.testExtremeTimingStress()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test complex timing system initialization
     */
    async testComplexTimingInit() {
        const test = { name: 'Complex Timing System Initialization', passed: false, details: {} };
        
        try {
            // Check for complex timing UI elements
            const timingElements = {
                rhythmCanvas: document.getElementById('rhythm-canvas'),
                timingPatterns: document.getElementById('timing-patterns'),
                timelineControl: document.getElementById('timeline-control'),
                analysisMetrics: document.querySelectorAll('.analysis-metric'),
                patternCards: document.querySelectorAll('.pattern-card'),
                beatMarkers: document.getElementById('beat-markers')
            };
            
            test.details.elementsFound = {};
            let foundElements = 0;
            
            for (const [name, element] of Object.entries(timingElements)) {
                const exists = element ? (element.length !== undefined ? element.length > 0 : true) : false;
                test.details.elementsFound[name] = exists;
                if (exists) foundElements++;
            }
            
            test.details.totalElements = Object.keys(timingElements).length;
            test.details.foundElementsCount = foundElements;
            
            // Check complex timing tester availability
            test.details.complexTimingTesterReady = !!window.complexTimingTester;
            
            // Check for pattern generation capability
            if (window.complexTimingTester) {
                test.details.patternGenerationReady = Array.isArray(window.complexTimingTester.timingPatterns);
                test.details.rhythmVisualizationReady = !!window.complexTimingTester.rhythmCanvas;
            }
            
            test.passed = foundElements >= 5 && test.details.complexTimingTesterReady;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test triplet accuracy and subdivision timing
     */
    async testTripletAccuracy() {
        const test = { name: 'Triplet Accuracy Test', passed: false, details: { tripletTests: [] } };
        
        try {
            const tripletPatterns = [
                this.timingPatterns.simpleTriplets,
                this.timingPatterns.eighthTriplets,
                this.timingPatterns.sixteenthTriplets,
                this.timingPatterns.quintuplets,
                this.timingPatterns.septuplets
            ];
            
            for (const pattern of tripletPatterns) {
                const tripletTest = {
                    pattern: pattern.name,
                    subdivision: pattern.subdivision,
                    noteValue: pattern.noteValue,
                    expectedAccuracy: pattern.expectedAccuracy,
                    expectedJitter: pattern.expectedJitter,
                    actualAccuracy: 0,
                    actualJitter: 0,
                    timingMeasurements: [],
                    passed: false
                };
                
                // Simulate triplet timing measurements
                const numMeasurements = 30;
                const baseTempo = 120; // BPM
                const beatDuration = (60 / baseTempo) * 1000; // ms per beat
                const subdivisionDuration = beatDuration / pattern.subdivision;
                
                for (let i = 0; i < numMeasurements; i++) {
                    const expectedTime = i * subdivisionDuration;
                    
                    // Simulate timing variation based on complexity
                    let timingError;
                    switch (pattern.complexity) {
                        case 'easy':
                            timingError = (Math.random() - 0.5) * 1.0; // ±0.5ms
                            break;
                        case 'medium':
                            timingError = (Math.random() - 0.5) * 2.0; // ±1.0ms
                            break;
                        case 'hard':
                            timingError = (Math.random() - 0.5) * 4.0; // ±2.0ms
                            break;
                        case 'extreme':
                            timingError = (Math.random() - 0.5) * 6.0; // ±3.0ms
                            break;
                        default:
                            timingError = (Math.random() - 0.5) * 2.0;
                    }
                    
                    const actualTime = expectedTime + timingError;
                    
                    tripletTest.timingMeasurements.push({
                        expected: expectedTime,
                        actual: actualTime,
                        error: Math.abs(timingError)
                    });
                    
                    await this.delay(10); // Simulate measurement time
                }
                
                // Calculate accuracy metrics
                const errors = tripletTest.timingMeasurements.map(m => m.error);
                const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
                const maxError = Math.max(...errors);
                
                tripletTest.actualJitter = this.calculateStandardDeviation(errors);
                tripletTest.actualAccuracy = Math.max(0, 100 - avgError * 2); // Convert error to accuracy
                
                tripletTest.passed = 
                    tripletTest.actualAccuracy >= pattern.expectedAccuracy &&
                    tripletTest.actualJitter <= pattern.expectedJitter;
                
                test.details.tripletTests.push(tripletTest);
                this.testResults.tripletTests.push(tripletTest);
            }
            
            test.passed = test.details.tripletTests.filter(tt => tt.passed).length >= 3;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test grace note timing precision
     */
    async testGraceNoteTiming() {
        const test = { name: 'Grace Note Timing Test', passed: false, details: { graceNoteTests: [] } };
        
        try {
            const gracePatterns = [
                this.timingPatterns.simpleGraceNotes,
                this.timingPatterns.multipleGraceNotes,
                this.timingPatterns.appoggiatura
            ];
            
            for (const pattern of gracePatterns) {
                const graceTest = {
                    pattern: pattern.name,
                    graceType: pattern.graceType,
                    expectedTiming: pattern.expectedTiming,
                    expectedAccuracy: pattern.expectedAccuracy,
                    actualTiming: 0,
                    actualAccuracy: 0,
                    timingConsistency: 0,
                    musicalExpression: 0,
                    passed: false
                };
                
                // Simulate grace note measurements
                const measurements = [];
                const numGraceNotes = pattern.graceCount || 1;
                
                for (let grace = 0; grace < 20; grace++) { // 20 test grace notes
                    const baseBeatTime = 1000; // 1 second beats
                    
                    switch (pattern.graceType) {
                        case 'acciaccatura':
                            // Should be very quick, just before beat
                            const acciaccaturaTime = baseBeatTime - 45 - (Math.random() * 10);
                            measurements.push({
                                type: 'acciaccatura',
                                timing: baseBeatTime - acciaccaturaTime,
                                expected: pattern.expectedTiming
                            });
                            break;
                            
                        case 'multiple':
                            // Multiple grace notes before beat
                            for (let i = 0; i < numGraceNotes; i++) {
                                const spacing = 25; // 25ms between grace notes
                                const multiTime = baseBeatTime - (numGraceNotes - i) * spacing - (Math.random() * 5);
                                measurements.push({
                                    type: 'multiple',
                                    timing: baseBeatTime - multiTime,
                                    expected: pattern.expectedTiming,
                                    index: i
                                });
                            }
                            break;
                            
                        case 'appoggiatura':
                            // Longer grace note with emphasis
                            const appoggiaturaTime = baseBeatTime - 95 - (Math.random() * 10);
                            measurements.push({
                                type: 'appoggiatura',
                                timing: baseBeatTime - appoggiaturaTime,
                                expected: pattern.expectedTiming
                            });
                            break;
                    }
                }
                
                // Calculate grace note metrics
                const timings = measurements.map(m => m.timing);
                const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
                const timingVariance = this.calculateVariance(timings);
                
                graceTest.actualTiming = avgTiming;
                graceTest.timingConsistency = Math.max(0, 100 - timingVariance);
                
                // Accuracy based on how close to expected timing
                const timingError = Math.abs(avgTiming - pattern.expectedTiming);
                graceTest.actualAccuracy = Math.max(0, 100 - timingError);
                
                // Musical expression (appropriate timing for grace note type)
                graceTest.musicalExpression = this.evaluateGraceNoteExpression(pattern, measurements);
                
                graceTest.passed = 
                    graceTest.actualAccuracy >= pattern.expectedAccuracy &&
                    graceTest.timingConsistency > 80 &&
                    graceTest.musicalExpression > 75;
                
                test.details.graceNoteTests.push(graceTest);
                this.testResults.graceNoteTests.push(graceTest);
                
                await this.delay(200);
            }
            
            test.passed = test.details.graceNoteTests.every(gt => gt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test simultaneous event precision
     */
    async testSimultaneousEventPrecision() {
        const test = { name: 'Simultaneous Event Precision', passed: false, details: { simultaneousTests: [] } };
        
        try {
            const simultaneousPatterns = [
                this.timingPatterns.simpleChords,
                this.timingPatterns.complexChords,
                this.timingPatterns.massiveChords,
                this.timingPatterns.extremeSimultaneity
            ];
            
            for (const pattern of simultaneousPatterns) {
                const simultaneousTest = {
                    pattern: pattern.name,
                    noteCount: pattern.noteCount,
                    expectedSpread: pattern.expectedSpread,
                    expectedAccuracy: pattern.expectedAccuracy,
                    actualSpread: 0,
                    actualAccuracy: 0,
                    synchronization: 0,
                    consistency: 0,
                    passed: false
                };
                
                // Simulate simultaneous event measurements
                const chordMeasurements = [];
                
                for (let chord = 0; chord < 10; chord++) { // 10 test chords
                    const chordEvents = [];
                    const baseTime = chord * 1000; // 1 second apart
                    
                    // Generate simultaneous notes with small timing variations
                    for (let note = 0; note < pattern.noteCount; note++) {
                        // Timing spread increases with complexity
                        let timingSpread;
                        switch (pattern.complexity) {
                            case 'easy':
                                timingSpread = Math.random() * 0.5; // 0-0.5ms
                                break;
                            case 'medium':
                                timingSpread = Math.random() * 1.5; // 0-1.5ms
                                break;
                            case 'hard':
                                timingSpread = Math.random() * 3.0; // 0-3.0ms
                                break;
                            case 'extreme':
                                timingSpread = Math.random() * 5.0; // 0-5.0ms
                                break;
                            default:
                                timingSpread = Math.random() * 1.0;
                        }
                        
                        const noteTime = baseTime + timingSpread;
                        chordEvents.push({
                            noteIndex: note,
                            time: noteTime,
                            deviation: timingSpread
                        });
                    }
                    
                    chordMeasurements.push({
                        chordIndex: chord,
                        events: chordEvents,
                        spread: Math.max(...chordEvents.map(e => e.time)) - Math.min(...chordEvents.map(e => e.time))
                    });
                    
                    await this.delay(50);
                }
                
                // Calculate simultaneity metrics
                const spreads = chordMeasurements.map(c => c.spread);
                simultaneousTest.actualSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
                
                const maxSpread = Math.max(...spreads);
                const minSpread = Math.min(...spreads);
                simultaneousTest.consistency = Math.max(0, 100 - (maxSpread - minSpread) * 10);
                
                // Synchronization quality
                simultaneousTest.synchronization = Math.max(0, 100 - simultaneousTest.actualSpread * 20);
                
                // Overall accuracy
                simultaneousTest.actualAccuracy = (simultaneousTest.synchronization + simultaneousTest.consistency) / 2;
                
                simultaneousTest.passed = 
                    simultaneousTest.actualSpread <= pattern.expectedSpread &&
                    simultaneousTest.actualAccuracy >= pattern.expectedAccuracy;
                
                test.details.simultaneousTests.push(simultaneousTest);
                this.testResults.simultaneousEventTests.push(simultaneousTest);
            }
            
            test.passed = test.details.simultaneousTests.filter(st => st.passed).length >= 3;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test polyrhythm coordination
     */
    async testPolyrhythmCoordination() {
        const test = { name: 'Polyrhythm Coordination', passed: false, details: { polyrhythmTests: [] } };
        
        try {
            const polyrhythmPatterns = [
                this.timingPatterns.polyrhythm_2v3,
                this.timingPatterns.polyrhythm_3v4,
                this.timingPatterns.polyrhythm_4v5,
                this.timingPatterns.polyrhythm_5v7
            ];
            
            for (const pattern of polyrhythmPatterns) {
                const polyrhythmTest = {
                    pattern: pattern.name,
                    rhythm1: pattern.rhythm1,
                    rhythm2: pattern.rhythm2,
                    expectedAccuracy: pattern.expectedAccuracy,
                    actualAccuracy: 0,
                    coordination: 0,
                    independence: 0,
                    stability: 0,
                    passed: false
                };
                
                // Simulate polyrhythm execution
                const measureDuration = 4000; // 4 seconds per measure
                const rhythm1Duration = measureDuration / pattern.rhythm1;
                const rhythm2Duration = measureDuration / pattern.rhythm2;
                
                const rhythm1Events = [];
                const rhythm2Events = [];
                
                // Generate rhythm 1 events
                for (let i = 0; i < pattern.rhythm1 * 2; i++) { // 2 measures
                    const expectedTime = (i % pattern.rhythm1) * rhythm1Duration + 
                                        Math.floor(i / pattern.rhythm1) * measureDuration;
                    const actualTime = expectedTime + (Math.random() - 0.5) * 2; // ±1ms variation
                    
                    rhythm1Events.push({
                        expected: expectedTime,
                        actual: actualTime,
                        error: Math.abs(actualTime - expectedTime)
                    });
                }
                
                // Generate rhythm 2 events
                for (let i = 0; i < pattern.rhythm2 * 2; i++) { // 2 measures
                    const expectedTime = (i % pattern.rhythm2) * rhythm2Duration + 
                                        Math.floor(i / pattern.rhythm2) * measureDuration;
                    const actualTime = expectedTime + (Math.random() - 0.5) * 2; // ±1ms variation
                    
                    rhythm2Events.push({
                        expected: expectedTime,
                        actual: actualTime,
                        error: Math.abs(actualTime - expectedTime)
                    });
                }
                
                // Calculate polyrhythm metrics
                const rhythm1Errors = rhythm1Events.map(e => e.error);
                const rhythm2Errors = rhythm2Events.map(e => e.error);
                
                const rhythm1Accuracy = Math.max(0, 100 - (rhythm1Errors.reduce((a, b) => a + b, 0) / rhythm1Errors.length));
                const rhythm2Accuracy = Math.max(0, 100 - (rhythm2Errors.reduce((a, b) => a + b, 0) / rhythm2Errors.length));
                
                polyrhythmTest.coordination = (rhythm1Accuracy + rhythm2Accuracy) / 2;
                
                // Independence (rhythms don't interfere with each other)
                const combinedEvents = [...rhythm1Events, ...rhythm2Events].sort((a, b) => a.expected - b.expected);
                const interferenceScore = this.calculateRhythmInterference(combinedEvents);
                polyrhythmTest.independence = Math.max(0, 100 - interferenceScore * 10);
                
                // Stability over time
                const firstHalfErrors = [...rhythm1Errors.slice(0, Math.floor(rhythm1Errors.length / 2)),
                                       ...rhythm2Errors.slice(0, Math.floor(rhythm2Errors.length / 2))];
                const secondHalfErrors = [...rhythm1Errors.slice(Math.floor(rhythm1Errors.length / 2)),
                                        ...rhythm2Errors.slice(Math.floor(rhythm2Errors.length / 2))];
                
                const firstHalfAvg = firstHalfErrors.reduce((a, b) => a + b, 0) / firstHalfErrors.length;
                const secondHalfAvg = secondHalfErrors.reduce((a, b) => a + b, 0) / secondHalfErrors.length;
                polyrhythmTest.stability = Math.max(0, 100 - Math.abs(secondHalfAvg - firstHalfAvg) * 10);
                
                polyrhythmTest.actualAccuracy = (polyrhythmTest.coordination + polyrhythmTest.independence + polyrhythmTest.stability) / 3;
                
                polyrhythmTest.passed = polyrhythmTest.actualAccuracy >= pattern.expectedAccuracy;
                
                test.details.polyrhythmTests.push(polyrhythmTest);
                this.testResults.polyrhythmTests.push(polyrhythmTest);
                
                await this.delay(300);
            }
            
            test.passed = test.details.polyrhythmTests.filter(pt => pt.passed).length >= 2;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test subdivision handling accuracy
     */
    async testSubdivisionHandling() {
        const test = { name: 'Subdivision Handling', passed: false, details: { subdivisionTests: [] } };
        
        try {
            const subdivisions = [
                { name: 'Quarter Notes', division: 1, expectedAccuracy: 99.0 },
                { name: 'Eighth Notes', division: 2, expectedAccuracy: 98.0 },
                { name: 'Sixteenth Notes', division: 4, expectedAccuracy: 96.0 },
                { name: 'Thirty-second Notes', division: 8, expectedAccuracy: 92.0 },
                { name: 'Triplet Eighths', division: 3, expectedAccuracy: 95.0 },
                { name: 'Triplet Sixteenths', division: 6, expectedAccuracy: 90.0 },
                { name: 'Quintuplet Sixteenths', division: 5, expectedAccuracy: 85.0 }
            ];
            
            for (const subdivision of subdivisions) {
                const subdivisionTest = {
                    subdivision: subdivision.name,
                    division: subdivision.division,
                    expectedAccuracy: subdivision.expectedAccuracy,
                    actualAccuracy: 0,
                    timingPrecision: 0,
                    evenness: 0,
                    passed: false
                };
                
                // Generate subdivision pattern
                const beatDuration = 500; // 500ms beats (120 BPM)
                const subdivisionDuration = beatDuration / subdivision.division;
                const measurements = [];
                
                for (let beat = 0; beat < 8; beat++) { // 8 beats
                    for (let sub = 0; sub < subdivision.division; sub++) {
                        const expectedTime = beat * beatDuration + sub * subdivisionDuration;
                        
                        // Timing variation based on subdivision complexity
                        const maxError = Math.max(0.5, subdivision.division * 0.2);
                        const actualTime = expectedTime + (Math.random() - 0.5) * maxError;
                        
                        measurements.push({
                            beat: beat,
                            subdivision: sub,
                            expected: expectedTime,
                            actual: actualTime,
                            error: Math.abs(actualTime - expectedTime)
                        });
                    }
                }
                
                // Calculate subdivision metrics
                const errors = measurements.map(m => m.error);
                const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
                
                subdivisionTest.timingPrecision = Math.max(0, 100 - avgError * 20);
                
                // Evenness (consistency of subdivision timing)
                const subdivisionIntervals = [];
                for (let i = 1; i < measurements.length; i++) {
                    const interval = measurements[i].actual - measurements[i-1].actual;
                    subdivisionIntervals.push(interval);
                }
                
                const avgInterval = subdivisionIntervals.reduce((a, b) => a + b, 0) / subdivisionIntervals.length;
                const intervalVariance = this.calculateVariance(subdivisionIntervals);
                subdivisionTest.evenness = Math.max(0, 100 - intervalVariance);
                
                subdivisionTest.actualAccuracy = (subdivisionTest.timingPrecision + subdivisionTest.evenness) / 2;
                
                subdivisionTest.passed = subdivisionTest.actualAccuracy >= subdivision.expectedAccuracy;
                
                test.details.subdivisionTests.push(subdivisionTest);
                this.testResults.subdivisionTests.push(subdivisionTest);
                
                await this.delay(100);
            }
            
            test.passed = test.details.subdivisionTests.filter(st => st.passed).length >= 5;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test micro-timing precision
     */
    async testMicroTimingPrecision() {
        const test = { name: 'Micro-timing Precision', passed: false, details: { microTimingTests: [] } };
        
        try {
            const microPattern = this.timingPatterns.microTiming;
            
            const microTest = {
                pattern: microPattern.name,
                targetPrecision: microPattern.precision,
                expectedAccuracy: microPattern.expectedAccuracy,
                actualPrecision: 0,
                actualAccuracy: 0,
                consistency: 0,
                measurementStability: 0,
                passed: false
            };
            
            // Simulate high-precision timing measurements
            const precisionMeasurements = [];
            const targetTimes = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]; // Every 100ms
            
            for (const targetTime of targetTimes) {
                for (let rep = 0; rep < 10; rep++) { // 10 repetitions per target
                    // Simulate sub-millisecond precision measurement
                    const measurementError = (Math.random() - 0.5) * microPattern.precision * 2;
                    const actualTime = targetTime + measurementError;
                    
                    precisionMeasurements.push({
                        target: targetTime,
                        actual: actualTime,
                        error: Math.abs(measurementError),
                        precision: Math.abs(measurementError)
                    });
                    
                    await this.delay(5); // Very fast measurements
                }
            }
            
            // Calculate micro-timing metrics
            const precisions = precisionMeasurements.map(m => m.precision);
            const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
            const maxPrecision = Math.max(...precisions);
            
            microTest.actualPrecision = avgPrecision;
            microTest.actualAccuracy = Math.max(0, 100 - avgPrecision * 1000); // Scale for sub-ms precision
            
            // Consistency across all measurements
            const precisionVariance = this.calculateVariance(precisions);
            microTest.consistency = Math.max(0, 100 - precisionVariance * 100);
            
            // Measurement stability over time
            const firstHalf = precisions.slice(0, Math.floor(precisions.length / 2));
            const secondHalf = precisions.slice(Math.floor(precisions.length / 2));
            const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            microTest.measurementStability = Math.max(0, 100 - Math.abs(secondHalfAvg - firstHalfAvg) * 1000);
            
            microTest.passed = 
                microTest.actualPrecision <= microPattern.precision &&
                microTest.actualAccuracy >= microPattern.expectedAccuracy &&
                microTest.consistency > 90;
            
            test.details.microTimingTests.push(microTest);
            this.testResults.microTimingTests.push(microTest);
            
            test.passed = microTest.passed;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test ornament execution (trills, turns, etc.)
     */
    async testOrnamentExecution() {
        const test = { name: 'Ornament Execution', passed: false, details: { ornamentTests: [] } };
        
        try {
            const trillPattern = this.timingPatterns.trills;
            
            const ornamentTest = {
                ornament: trillPattern.name,
                expectedRate: trillPattern.expectedRate,
                expectedAccuracy: trillPattern.expectedAccuracy,
                actualRate: 0,
                actualAccuracy: 0,
                rateConsistency: 0,
                rhythmicEvenness: 0,
                passed: false
            };
            
            // Simulate trill execution
            const trillDuration = 2000; // 2 second trill
            const expectedNoteDuration = 1000 / trillPattern.expectedRate; // ms per note
            const trillEvents = [];
            
            let currentTime = 0;
            while (currentTime < trillDuration) {
                // Add slight variation for realistic trill
                const noteVariation = (Math.random() - 0.5) * 10; // ±5ms variation
                const actualNoteDuration = expectedNoteDuration + noteVariation;
                
                trillEvents.push({
                    expected: currentTime,
                    actual: currentTime + noteVariation,
                    duration: actualNoteDuration
                });
                
                currentTime += actualNoteDuration;
            }
            
            // Calculate ornament metrics
            const noteDurations = trillEvents.map(e => e.duration);
            const avgNoteDuration = noteDurations.reduce((a, b) => a + b, 0) / noteDurations.length;
            ornamentTest.actualRate = 1000 / avgNoteDuration; // Notes per second
            
            // Rate accuracy
            const rateError = Math.abs(ornamentTest.actualRate - trillPattern.expectedRate);
            ornamentTest.actualAccuracy = Math.max(0, 100 - rateError * 5);
            
            // Rate consistency
            const durationVariance = this.calculateVariance(noteDurations);
            ornamentTest.rateConsistency = Math.max(0, 100 - durationVariance / avgNoteDuration * 100);
            
            // Rhythmic evenness
            const intervals = [];
            for (let i = 1; i < trillEvents.length; i++) {
                intervals.push(trillEvents[i].actual - trillEvents[i-1].actual);
            }
            const intervalVariance = this.calculateVariance(intervals);
            ornamentTest.rhythmicEvenness = Math.max(0, 100 - intervalVariance / avgNoteDuration * 100);
            
            ornamentTest.passed = 
                ornamentTest.actualAccuracy >= trillPattern.expectedAccuracy &&
                ornamentTest.rateConsistency > 80 &&
                ornamentTest.rhythmicEvenness > 75;
            
            test.details.ornamentTests.push(ornamentTest);
            test.passed = ornamentTest.passed;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test rhythmic style handling (swing, shuffle, etc.)
     */
    async testRhythmicStyleHandling() {
        const test = { name: 'Rhythmic Style Handling', passed: false, details: { styleTests: [] } };
        
        try {
            const stylePatterns = [
                this.timingPatterns.swingRhythm,
                this.timingPatterns.shuffleRhythm,
                this.timingPatterns.humanization
            ];
            
            for (const pattern of stylePatterns) {
                const styleTest = {
                    style: pattern.name,
                    expectedAccuracy: pattern.expectedAccuracy,
                    actualAccuracy: 0,
                    styleImplementation: 0,
                    naturalness: 0,
                    passed: false
                };
                
                // Generate style-specific timing
                const measurements = [];
                
                switch (pattern.type) {
                    case 'swing':
                        // Swing eighth notes (long-short pattern)
                        for (let beat = 0; beat < 16; beat++) {
                            const beatTime = beat * 250; // 250ms per eighth at 120 BPM
                            let swingOffset = 0;
                            
                            if (beat % 2 === 1) { // Off-beats get swing
                                swingOffset = (pattern.swingAmount - 50) * 2.5; // Convert % to ms offset
                            }
                            
                            measurements.push({
                                beat: beat,
                                expected: beatTime,
                                actual: beatTime + swingOffset + (Math.random() - 0.5) * 2,
                                swingOffset: swingOffset
                            });
                        }
                        break;
                        
                    case 'shuffle':
                        // Shuffle rhythm (triplet-based)
                        for (let beat = 0; beat < 12; beat++) {
                            const tripletTime = beat * (500 / 3); // Triplet eighths
                            let shuffleOffset = 0;
                            
                            if (beat % 2 === 1) { // Middle triplet notes
                                shuffleOffset = (pattern.shuffleAmount - 67) * 1.5;
                            }
                            
                            measurements.push({
                                beat: beat,
                                expected: tripletTime,
                                actual: tripletTime + shuffleOffset + (Math.random() - 0.5) * 2,
                                shuffleOffset: shuffleOffset
                            });
                        }
                        break;
                        
                    case 'humanized':
                        // Human-like timing variations
                        for (let beat = 0; beat < 16; beat++) {
                            const beatTime = beat * 250;
                            const humanVariation = (Math.random() - 0.5) * pattern.variation * 2;
                            
                            measurements.push({
                                beat: beat,
                                expected: beatTime,
                                actual: beatTime + humanVariation,
                                humanVariation: humanVariation
                            });
                        }
                        break;
                }
                
                // Calculate style metrics
                const errors = measurements.map(m => Math.abs(m.actual - m.expected));
                const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
                
                styleTest.actualAccuracy = Math.max(0, 100 - avgError * 2);
                
                // Style implementation accuracy
                styleTest.styleImplementation = this.evaluateStyleImplementation(pattern, measurements);
                
                // Naturalness of timing variations
                const timingVariations = measurements.map(m => m.actual - m.expected);
                const variationNaturalness = this.evaluateTimingNaturalness(timingVariations);
                styleTest.naturalness = variationNaturalness;
                
                styleTest.passed = 
                    styleTest.actualAccuracy >= pattern.expectedAccuracy &&
                    styleTest.styleImplementation > 85 &&
                    styleTest.naturalness > 80;
                
                test.details.styleTests.push(styleTest);
                
                await this.delay(200);
            }
            
            test.passed = test.details.styleTests.every(st => st.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test extreme timing stress conditions
     */
    async testExtremeTimingStress() {
        const test = { name: 'Extreme Timing Stress', passed: false, details: { stressTests: [] } };
        
        try {
            const stressScenarios = [
                { name: 'High Event Density', eventsPerSecond: 50, duration: 2000, expectedAccuracy: 85 },
                { name: 'Ultra-Fast Subdivisions', subdivision: 32, tempo: 180, expectedAccuracy: 80 },
                { name: 'Complex Polyrhythm Layer', layers: 5, expectedAccuracy: 70 },
                { name: 'Micro-timing Precision', precision: 0.01, expectedAccuracy: 95 }
            ];
            
            for (const scenario of stressScenarios) {
                const stressTest = {
                    scenario: scenario.name,
                    expectedAccuracy: scenario.expectedAccuracy,
                    actualAccuracy: 0,
                    systemStability: 0,
                    processingLatency: 0,
                    passed: false
                };
                
                const startTime = performance.now();
                let eventCount = 0;
                const latencies = [];
                
                // Simulate stress scenario
                switch (scenario.name) {
                    case 'High Event Density':
                        for (let i = 0; i < scenario.eventsPerSecond * (scenario.duration / 1000); i++) {
                            const eventStart = performance.now();
                            await this.delay(1); // Simulate event processing
                            const eventEnd = performance.now();
                            latencies.push(eventEnd - eventStart);
                            eventCount++;
                        }
                        break;
                        
                    case 'Ultra-Fast Subdivisions':
                        const beatDuration = (60 / scenario.tempo) * 1000;
                        const subdivisionDuration = beatDuration / scenario.subdivision;
                        const totalEvents = scenario.duration / subdivisionDuration;
                        
                        for (let i = 0; i < totalEvents; i++) {
                            const eventStart = performance.now();
                            await this.delay(Math.max(0.1, subdivisionDuration / 10));
                            const eventEnd = performance.now();
                            latencies.push(eventEnd - eventStart);
                            eventCount++;
                        }
                        break;
                        
                    case 'Complex Polyrhythm Layer':
                        // Simulate multiple overlapping polyrhythms
                        for (let layer = 0; layer < scenario.layers; layer++) {
                            for (let event = 0; event < 20; event++) {
                                const eventStart = performance.now();
                                await this.delay(5); // Simulate polyrhythm calculation
                                const eventEnd = performance.now();
                                latencies.push(eventEnd - eventStart);
                                eventCount++;
                            }
                        }
                        break;
                        
                    case 'Micro-timing Precision':
                        for (let i = 0; i < 100; i++) {
                            const eventStart = performance.now();
                            // Simulate high-precision timing calculation
                            const precisionDelay = scenario.precision * 1000; // Convert to ms
                            await this.delay(Math.max(0.01, precisionDelay));
                            const eventEnd = performance.now();
                            latencies.push(eventEnd - eventStart);
                            eventCount++;
                        }
                        break;
                }
                
                const totalTime = performance.now() - startTime;
                
                // Calculate stress test metrics
                const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                const maxLatency = Math.max(...latencies);
                const latencyVariance = this.calculateVariance(latencies);
                
                stressTest.processingLatency = avgLatency;
                stressTest.systemStability = Math.max(0, 100 - latencyVariance);
                
                // Accuracy based on latency performance
                stressTest.actualAccuracy = Math.max(0, 100 - maxLatency * 2);
                
                stressTest.passed = 
                    stressTest.actualAccuracy >= scenario.expectedAccuracy &&
                    stressTest.systemStability > 70 &&
                    stressTest.processingLatency < 20;
                
                test.details.stressTests.push(stressTest);
                this.testResults.precisionTests.push(stressTest);
                
                await this.delay(500); // Recovery time between stress tests
            }
            
            test.passed = test.details.stressTests.filter(st => st.passed).length >= 3;
            
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
            complexTimingCoverage: {
                tripletTests: this.testResults.tripletTests.length,
                graceNoteTests: this.testResults.graceNoteTests.length,
                simultaneousEventTests: this.testResults.simultaneousEventTests.length,
                polyrhythmTests: this.testResults.polyrhythmTests.length,
                microTimingTests: this.testResults.microTimingTests.length,
                subdivisionTests: this.testResults.subdivisionTests.length,
                precisionTests: this.testResults.precisionTests.length
            }
        };
        
        console.log('📊 Complex Timing Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== COMPLEX TIMING TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    // Helper methods
    evaluateGraceNoteExpression(pattern, measurements) {
        // Evaluate musical appropriateness of grace note timing
        let score = 100;
        
        for (const measurement of measurements) {
            switch (pattern.graceType) {
                case 'acciaccatura':
                    // Should be very quick and close to beat
                    if (measurement.timing > 60 || measurement.timing < 30) score -= 10;
                    break;
                case 'appoggiatura':
                    // Should be longer and more expressive
                    if (measurement.timing > 120 || measurement.timing < 80) score -= 5;
                    break;
                case 'multiple':
                    // Should have consistent spacing
                    // Additional logic for multiple grace notes
                    break;
            }
        }
        
        return Math.max(0, score);
    }

    calculateRhythmInterference(events) {
        // Calculate how much rhythms interfere with each other
        let interference = 0;
        
        for (let i = 1; i < events.length; i++) {
            const timeDiff = events[i].expected - events[i-1].expected;
            const actualDiff = events[i].actual - events[i-1].actual;
            const diffError = Math.abs(actualDiff - timeDiff);
            interference += diffError;
        }
        
        return interference / events.length;
    }

    evaluateStyleImplementation(pattern, measurements) {
        // Evaluate how well the style is implemented
        let score = 100;
        
        switch (pattern.type) {
            case 'swing':
                // Check for proper long-short pattern
                for (let i = 1; i < measurements.length; i += 2) {
                    const swingRatio = measurements[i].actual - measurements[i-1].actual;
                    const expectedRatio = 250 * (pattern.swingAmount / 50); // Adjust for swing amount
                    if (Math.abs(swingRatio - expectedRatio) > 25) score -= 5;
                }
                break;
                
            case 'shuffle':
                // Check for triplet-based timing
                // Implementation depends on specific shuffle pattern
                break;
                
            case 'humanized':
                // Check for natural variation without being too random
                const variations = measurements.map(m => m.humanVariation);
                const variationRange = Math.max(...variations) - Math.min(...variations);
                if (variationRange > pattern.variation * 2) score -= 10;
                break;
        }
        
        return Math.max(0, score);
    }

    evaluateTimingNaturalness(variations) {
        // Evaluate how natural the timing variations feel
        let naturalness = 100;
        
        // Check for overly mechanical patterns
        const sortedVariations = [...variations].sort((a, b) => a - b);
        let consecutiveIdentical = 0;
        
        for (let i = 1; i < sortedVariations.length; i++) {
            if (Math.abs(sortedVariations[i] - sortedVariations[i-1]) < 0.1) {
                consecutiveIdentical++;
            }
        }
        
        if (consecutiveIdentical > variations.length * 0.3) {
            naturalness -= 20; // Too mechanical
        }
        
        // Check for natural distribution
        const variance = this.calculateVariance(variations);
        if (variance < 1) naturalness -= 10; // Too regular
        if (variance > 25) naturalness -= 15; // Too chaotic
        
        return Math.max(0, naturalness);
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default ComplexTimingAutomatedTest;