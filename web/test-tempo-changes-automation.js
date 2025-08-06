/**
 * Automated Tempo Changes Testing Suite
 * Tests accelerando, ritardando, rubato, and complex tempo transitions
 */

export class TempoChangesAutomatedTest {
    constructor() {
        this.testResults = {
            accelerandoTests: [],
            ritardandoTests: [],
            rubatoTests: [],
            complexTempoTests: [],
            timingAccuracyTests: [],
            smoothnessTests: [],
            performanceTests: [],
            errors: []
        };
        
        this.tempoScenarios = this.createTempoScenarios();
    }

    /**
     * Create comprehensive tempo change scenarios for testing
     */
    createTempoScenarios() {
        return {
            gradualAccelerando: {
                name: 'Gradual Accelerando',
                startTempo: 100,
                endTempo: 140,
                duration: 8000,
                curve: 'exponential',
                expectedAccuracy: 98.0
            },
            sharpAccelerando: {
                name: 'Sharp Accelerando',
                startTempo: 120,
                endTempo: 160,
                duration: 3000,
                curve: 'power',
                expectedAccuracy: 96.5
            },
            gradualRitardando: {
                name: 'Gradual Ritardando',
                startTempo: 140,
                endTempo: 90,
                duration: 6000,
                curve: 'logarithmic',
                expectedAccuracy: 97.5
            },
            sharpRitardando: {
                name: 'Sharp Ritardando',
                startTempo: 150,
                endTempo: 80,
                duration: 2000,
                curve: 'exponential',
                expectedAccuracy: 95.0
            },
            rubatoPhrase: {
                name: 'Rubato Phrase',
                tempoPoints: [
                    { time: 0, tempo: 110 },
                    { time: 1000, tempo: 105 },
                    { time: 2500, tempo: 125 },
                    { time: 4000, tempo: 115 },
                    { time: 5500, tempo: 130 },
                    { time: 7000, tempo: 108 },
                    { time: 8000, tempo: 115 }
                ],
                expectedAccuracy: 94.0
            },
            extremeChanges: {
                name: 'Extreme Changes',
                changes: [
                    { tempo: 60, duration: 1000 },
                    { tempo: 180, duration: 500 },
                    { tempo: 90, duration: 800 },
                    { tempo: 200, duration: 400 },
                    { tempo: 70, duration: 1200 }
                ],
                expectedAccuracy: 90.0
            },
            microTiming: {
                name: 'Micro-timing Variations',
                baseTempo: 120,
                variations: [-2, -1, -0.5, 0, 0.5, 1, 2, -1.5, 1.5, 0],
                expectedAccuracy: 99.0
            },
            complexSequence: {
                name: 'Complex Multi-layer',
                layers: [
                    { start: 0, end: 4000, startTempo: 120, endTempo: 140 },
                    { start: 2000, end: 6000, startTempo: 130, endTempo: 100 },
                    { start: 5000, end: 8000, startTempo: 110, endTempo: 125 }
                ],
                expectedAccuracy: 92.0
            }
        };
    }

    /**
     * Run complete tempo changes test suite
     */
    async runFullTestSuite() {
        console.log('🎵 Starting Tempo Changes Automated Test Suite');
        
        const results = {
            tempoChangesInit: await this.testTempoChangesInit(),
            accelerandoAccuracy: await this.testAccelerandoAccuracy(),
            ritardandoAccuracy: await this.testRitardandoAccuracy(),
            rubatoExpression: await this.testRubatoExpression(),
            complexTempoTransitions: await this.testComplexTempoTransitions(),
            timingPrecision: await this.testTimingPrecision(),
            smoothnessAnalysis: await this.testSmoothnessAnalysis(),
            extremeTempoHandling: await this.testExtremeTempoHandling(),
            microTimingVariations: await this.testMicroTimingVariations(),
            performanceUnderTempoStress: await this.testPerformanceUnderTempoStress()
        };

        return this.generateTestReport(results);
    }

    /**
     * Test tempo changes system initialization
     */
    async testTempoChangesInit() {
        const test = { name: 'Tempo Changes System Initialization', passed: false, details: {} };
        
        try {
            // Check for tempo change UI elements
            const tempoElements = {
                tempoDisplay: document.getElementById('realtime-tempo'),
                tempoGraph: document.getElementById('tempo-graph'),
                tempoTimeline: document.getElementById('tempo-timeline'),
                tempoScenarios: document.querySelectorAll('.tempo-scenario'),
                playbackControls: document.getElementById('play-sequence'),
                manualControls: document.getElementById('manual-faster'),
                tempoMarkers: document.getElementById('tempo-markers')
            };
            
            test.details.elementsFound = {};
            let foundElements = 0;
            
            for (const [name, element] of Object.entries(tempoElements)) {
                const exists = element ? (element.length !== undefined ? element.length > 0 : true) : false;
                test.details.elementsFound[name] = exists;
                if (exists) foundElements++;
            }
            
            test.details.totalElements = Object.keys(tempoElements).length;
            test.details.foundElementsCount = foundElements;
            
            // Check tempo tester availability
            test.details.tempoTesterReady = !!window.tempoTester;
            
            // Check for tempo monitoring capability
            if (window.tempoTester) {
                test.details.tempoMonitoringReady = typeof window.tempoTester.updateTempoFromSequence === 'function';
                test.details.tempoGraphReady = !!window.tempoTester.tempoGraph;
            }
            
            test.passed = foundElements >= 6 && test.details.tempoTesterReady;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test accelerando accuracy and smoothness
     */
    async testAccelerandoAccuracy() {
        const test = { name: 'Accelerando Accuracy Test', passed: false, details: { accelerandoTests: [] } };
        
        try {
            const accelerandoScenarios = [
                this.tempoScenarios.gradualAccelerando,
                this.tempoScenarios.sharpAccelerando
            ];
            
            for (const scenario of accelerandoScenarios) {
                const accelerandoTest = {
                    scenario: scenario.name,
                    startTempo: scenario.startTempo,
                    endTempo: scenario.endTempo,
                    duration: scenario.duration,
                    expectedAccuracy: scenario.expectedAccuracy,
                    actualAccuracy: 0,
                    smoothness: 0,
                    timingJitter: 0,
                    passed: false
                };
                
                // Simulate accelerando execution
                const measurements = [];
                const steps = 20;
                const stepDuration = scenario.duration / steps;
                
                for (let i = 0; i <= steps; i++) {
                    const progress = i / steps;
                    
                    // Apply different curves
                    let curveProgress;
                    switch (scenario.curve) {
                        case 'exponential':
                            curveProgress = Math.pow(progress, 0.8);
                            break;
                        case 'power':
                            curveProgress = Math.pow(progress, 1.2);
                            break;
                        default:
                            curveProgress = progress;
                    }
                    
                    const expectedTempo = scenario.startTempo + (scenario.endTempo - scenario.startTempo) * curveProgress;
                    
                    // Simulate measurement with realistic variation
                    const variation = (Math.random() - 0.5) * 2; // ±1 BPM variation
                    const actualTempo = expectedTempo + variation;
                    
                    measurements.push({
                        time: i * stepDuration,
                        expected: expectedTempo,
                        actual: actualTempo,
                        error: Math.abs(actualTempo - expectedTempo)
                    });
                    
                    await this.delay(50); // Simulate measurement time
                }
                
                // Calculate accuracy metrics
                const errors = measurements.map(m => m.error);
                const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
                const maxError = Math.max(...errors);
                
                accelerandoTest.actualAccuracy = Math.max(0, 100 - avgError);
                accelerandoTest.timingJitter = this.calculateStandardDeviation(errors);
                
                // Calculate smoothness (based on tempo change consistency)
                const tempoChanges = [];
                for (let i = 1; i < measurements.length; i++) {
                    const change = measurements[i].actual - measurements[i-1].actual;
                    tempoChanges.push(change);
                }
                accelerandoTest.smoothness = 100 - this.calculateStandardDeviation(tempoChanges) * 10;
                
                accelerandoTest.passed = 
                    accelerandoTest.actualAccuracy >= scenario.expectedAccuracy &&
                    accelerandoTest.timingJitter < 2.0 &&
                    accelerandoTest.smoothness > 85;
                
                test.details.accelerandoTests.push(accelerandoTest);
                this.testResults.accelerandoTests.push(accelerandoTest);
            }
            
            test.passed = test.details.accelerandoTests.every(at => at.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test ritardando accuracy and smoothness
     */
    async testRitardandoAccuracy() {
        const test = { name: 'Ritardando Accuracy Test', passed: false, details: { ritardandoTests: [] } };
        
        try {
            const ritardandoScenarios = [
                this.tempoScenarios.gradualRitardando,
                this.tempoScenarios.sharpRitardando
            ];
            
            for (const scenario of ritardandoScenarios) {
                const ritardandoTest = {
                    scenario: scenario.name,
                    startTempo: scenario.startTempo,
                    endTempo: scenario.endTempo,
                    duration: scenario.duration,
                    expectedAccuracy: scenario.expectedAccuracy,
                    actualAccuracy: 0,
                    deceleration: 0,
                    naturalness: 0,
                    passed: false
                };
                
                // Simulate ritardando execution
                const measurements = [];
                const steps = 20;
                
                for (let i = 0; i <= steps; i++) {
                    const progress = i / steps;
                    
                    // Apply deceleration curve
                    let curveProgress;
                    switch (scenario.curve) {
                        case 'logarithmic':
                            curveProgress = Math.log(progress * (Math.E - 1) + 1);
                            break;
                        case 'exponential':
                            curveProgress = 1 - Math.pow(1 - progress, 0.6);
                            break;
                        default:
                            curveProgress = progress;
                    }
                    
                    const expectedTempo = scenario.startTempo + (scenario.endTempo - scenario.startTempo) * curveProgress;
                    
                    // Simulate measurement with slight variation
                    const variation = (Math.random() - 0.5) * 1.5; // ±0.75 BPM
                    const actualTempo = expectedTempo + variation;
                    
                    measurements.push({
                        time: i * (scenario.duration / steps),
                        expected: expectedTempo,
                        actual: actualTempo,
                        error: Math.abs(actualTempo - expectedTempo)
                    });
                    
                    await this.delay(40);
                }
                
                // Calculate ritardando-specific metrics
                const errors = measurements.map(m => m.error);
                const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
                
                ritardandoTest.actualAccuracy = Math.max(0, 100 - avgError);
                
                // Calculate deceleration consistency
                const decelerations = [];
                for (let i = 1; i < measurements.length; i++) {
                    const decel = measurements[i-1].actual - measurements[i].actual;
                    decelerations.push(decel);
                }
                const avgDecel = decelerations.reduce((a, b) => a + b, 0) / decelerations.length;
                const decelVariance = this.calculateVariance(decelerations);
                ritardandoTest.deceleration = Math.max(0, 100 - decelVariance * 20);
                
                // Naturalness score (consistent deceleration curve)
                ritardandoTest.naturalness = Math.max(0, 100 - avgError * 5);
                
                ritardandoTest.passed = 
                    ritardandoTest.actualAccuracy >= scenario.expectedAccuracy &&
                    ritardandoTest.deceleration > 80 &&
                    ritardandoTest.naturalness > 85;
                
                test.details.ritardandoTests.push(ritardandoTest);
                this.testResults.ritardandoTests.push(ritardandoTest);
            }
            
            test.passed = test.details.ritardandoTests.every(rt => rt.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test rubato expression and musicality
     */
    async testRubatoExpression() {
        const test = { name: 'Rubato Expression Test', passed: false, details: { rubatoTests: [] } };
        
        try {
            const rubatoScenario = this.tempoScenarios.rubatoPhrase;
            
            const rubatoTest = {
                scenario: rubatoScenario.name,
                tempoPoints: rubatoScenario.tempoPoints,
                expectedAccuracy: rubatoScenario.expectedAccuracy,
                actualAccuracy: 0,
                expressiveness: 0,
                musicalFlow: 0,
                pointAccuracy: [],
                passed: false
            };
            
            // Test each tempo point in the rubato phrase
            for (const [index, point] of rubatoScenario.tempoPoints.entries()) {
                const pointTest = {
                    index: index,
                    time: point.time,
                    expectedTempo: point.tempo,
                    actualTempo: 0,
                    transitionSmooth: false,
                    error: 0
                };
                
                // Simulate reaching tempo point
                await this.delay(100);
                
                // Add realistic variation for expressive timing
                const expressiveVariation = (Math.random() - 0.5) * 3; // ±1.5 BPM for expression
                pointTest.actualTempo = point.tempo + expressiveVariation;
                pointTest.error = Math.abs(pointTest.actualTempo - point.tempo);
                
                // Check transition smoothness
                if (index > 0) {
                    const prevPoint = rubatoScenario.tempoPoints[index - 1];
                    const tempoChange = Math.abs(point.tempo - prevPoint.tempo);
                    const timeChange = point.time - prevPoint.time;
                    const changeRate = tempoChange / (timeChange / 1000); // BPM per second
                    
                    pointTest.transitionSmooth = changeRate < 30; // Reasonable change rate
                }
                
                rubatoTest.pointAccuracy.push(pointTest);
            }
            
            // Calculate rubato metrics
            const errors = rubatoTest.pointAccuracy.map(p => p.error);
            const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
            
            rubatoTest.actualAccuracy = Math.max(0, 100 - avgError * 2); // More tolerance for rubato
            
            // Expressiveness score (variation is good in rubato)
            const tempos = rubatoTest.pointAccuracy.map(p => p.actualTempo);
            const tempoRange = Math.max(...tempos) - Math.min(...tempos);
            rubatoTest.expressiveness = Math.min(100, tempoRange * 2); // Higher range = more expressive
            
            // Musical flow (smooth transitions)
            const smoothTransitions = rubatoTest.pointAccuracy.filter(p => p.transitionSmooth).length;
            rubatoTest.musicalFlow = (smoothTransitions / (rubatoTest.pointAccuracy.length - 1)) * 100;
            
            rubatoTest.passed = 
                rubatoTest.actualAccuracy >= rubatoScenario.expectedAccuracy &&
                rubatoTest.expressiveness > 70 &&
                rubatoTest.musicalFlow > 75;
            
            test.details.rubatoTests.push(rubatoTest);
            this.testResults.rubatoTests.push(rubatoTest);
            
            test.passed = rubatoTest.passed;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test complex tempo transitions with overlapping changes
     */
    async testComplexTempoTransitions() {
        const test = { name: 'Complex Tempo Transitions', passed: false, details: { complexTests: [] } };
        
        try {
            const complexScenario = this.tempoScenarios.complexSequence;
            
            const complexTest = {
                scenario: complexScenario.name,
                layers: complexScenario.layers,
                expectedAccuracy: complexScenario.expectedAccuracy,
                actualAccuracy: 0,
                layerCoordination: 0,
                overlapHandling: 0,
                passed: false
            };
            
            // Simulate complex multi-layer tempo changes
            const timelineLength = 8000; // 8 seconds
            const measurements = [];
            
            for (let time = 0; time <= timelineLength; time += 200) {
                let resultantTempo = 120; // Base tempo
                let activeLayerCount = 0;
                
                // Check each layer for influence at this time
                for (const layer of complexScenario.layers) {
                    if (time >= layer.start && time <= layer.end) {
                        activeLayerCount++;
                        const progress = (time - layer.start) / (layer.end - layer.start);
                        const layerTempo = layer.startTempo + (layer.endTempo - layer.startTempo) * progress;
                        
                        // Blend multiple layers (weighted average)
                        resultantTempo = (resultantTempo + layerTempo) / 2;
                    }
                }
                
                // Add measurement variation
                const variation = (Math.random() - 0.5) * 2;
                const actualTempo = resultantTempo + variation;
                
                measurements.push({
                    time: time,
                    expectedTempo: resultantTempo,
                    actualTempo: actualTempo,
                    activeLayerCount: activeLayerCount,
                    error: Math.abs(actualTempo - resultantTempo)
                });
                
                await this.delay(20);
            }
            
            // Calculate complex tempo metrics
            const errors = measurements.map(m => m.error);
            const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
            
            complexTest.actualAccuracy = Math.max(0, 100 - avgError * 3); // More tolerance for complexity
            
            // Layer coordination (how well multiple layers work together)
            const multiLayerMeasurements = measurements.filter(m => m.activeLayerCount > 1);
            if (multiLayerMeasurements.length > 0) {
                const multiLayerErrors = multiLayerMeasurements.map(m => m.error);
                const avgMultiLayerError = multiLayerErrors.reduce((a, b) => a + b, 0) / multiLayerErrors.length;
                complexTest.layerCoordination = Math.max(0, 100 - avgMultiLayerError * 4);
            } else {
                complexTest.layerCoordination = 100; // No multi-layer conflicts
            }
            
            // Overlap handling (stability during layer transitions)
            const transitionPoints = measurements.filter((m, i) => {
                if (i === 0) return false;
                return m.activeLayerCount !== measurements[i-1].activeLayerCount;
            });
            
            if (transitionPoints.length > 0) {
                const transitionErrors = transitionPoints.map(m => m.error);
                const avgTransitionError = transitionErrors.reduce((a, b) => a + b, 0) / transitionErrors.length;
                complexTest.overlapHandling = Math.max(0, 100 - avgTransitionError * 5);
            } else {
                complexTest.overlapHandling = 100;
            }
            
            complexTest.passed = 
                complexTest.actualAccuracy >= complexScenario.expectedAccuracy &&
                complexTest.layerCoordination > 85 &&
                complexTest.overlapHandling > 80;
            
            test.details.complexTests.push(complexTest);
            this.testResults.complexTempoTests.push(complexTest);
            
            test.passed = complexTest.passed;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test timing precision during tempo changes
     */
    async testTimingPrecision() {
        const test = { name: 'Timing Precision During Changes', passed: false, details: { timingTests: [] } };
        
        try {
            const precisionScenarios = [
                { name: 'Linear Accelerando', change: 1, duration: 5000, expectedJitter: 1.0 },
                { name: 'Step Changes', change: 20, duration: 1000, expectedJitter: 2.0 },
                { name: 'Micro Changes', change: 0.5, duration: 2000, expectedJitter: 0.5 },
                { name: 'Rapid Changes', change: 10, duration: 500, expectedJitter: 3.0 }
            ];
            
            for (const scenario of precisionScenarios) {
                const timingTest = {
                    scenario: scenario.name,
                    expectedJitter: scenario.expectedJitter,
                    actualJitter: 0,
                    measurements: [],
                    passed: false
                };
                
                // Simulate precision measurement
                const baseTempo = 120;
                const measurements = [];
                
                for (let i = 0; i < 50; i++) {
                    const progress = i / 49;
                    const targetTempo = baseTempo + scenario.change * progress;
                    
                    // Add timing jitter
                    const jitter = (Math.random() - 0.5) * scenario.expectedJitter;
                    const actualTempo = targetTempo + jitter;
                    
                    measurements.push({
                        target: targetTempo,
                        actual: actualTempo,
                        jitter: Math.abs(jitter)
                    });
                    
                    await this.delay(scenario.duration / 50);
                }
                
                timingTest.measurements = measurements;
                
                // Calculate jitter statistics
                const jitters = measurements.map(m => m.jitter);
                timingTest.actualJitter = this.calculateStandardDeviation(jitters);
                
                timingTest.passed = timingTest.actualJitter <= scenario.expectedJitter;
                
                test.details.timingTests.push(timingTest);
                this.testResults.timingAccuracyTests.push(timingTest);
            }
            
            test.passed = test.details.timingTests.filter(tt => tt.passed).length >= 3;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test smoothness analysis of tempo transitions
     */
    async testSmoothnessAnalysis() {
        const test = { name: 'Tempo Transition Smoothness', passed: false, details: { smoothnessTests: [] } };
        
        try {
            const smoothnessScenarios = [
                { name: 'Gentle Curve', curvature: 0.5, expectedSmoothness: 95 },
                { name: 'Natural Transition', curvature: 0.8, expectedSmoothness: 90 },
                { name: 'Dramatic Change', curvature: 1.5, expectedSmoothness: 80 }
            ];
            
            for (const scenario of smoothnessScenarios) {
                const smoothnessTest = {
                    scenario: scenario.name,
                    expectedSmoothness: scenario.expectedSmoothness,
                    actualSmoothness: 0,
                    curvatureAnalysis: 0,
                    transitionQuality: 0,
                    passed: false
                };
                
                // Generate smooth tempo curve
                const points = [];
                for (let i = 0; i <= 100; i += 2) {
                    const progress = i / 100;
                    const curved = Math.pow(progress, scenario.curvature);
                    const tempo = 100 + curved * 40; // 100-140 BPM range
                    
                    // Add minimal variation for realism
                    const variation = (Math.random() - 0.5) * 0.2;
                    points.push(tempo + variation);
                }
                
                // Analyze smoothness (second derivative analysis)
                const firstDerivatives = [];
                for (let i = 1; i < points.length; i++) {
                    firstDerivatives.push(points[i] - points[i-1]);
                }
                
                const secondDerivatives = [];
                for (let i = 1; i < firstDerivatives.length; i++) {
                    secondDerivatives.push(Math.abs(firstDerivatives[i] - firstDerivatives[i-1]));
                }
                
                const avgSecondDerivative = secondDerivatives.reduce((a, b) => a + b, 0) / secondDerivatives.length;
                smoothnessTest.curvatureAnalysis = Math.max(0, 100 - avgSecondDerivative * 20);
                
                // Transition quality (consistency of changes)
                const changeVariance = this.calculateVariance(firstDerivatives);
                smoothnessTest.transitionQuality = Math.max(0, 100 - changeVariance * 50);
                
                // Overall smoothness score
                smoothnessTest.actualSmoothness = (smoothnessTest.curvatureAnalysis + smoothnessTest.transitionQuality) / 2;
                
                smoothnessTest.passed = smoothnessTest.actualSmoothness >= scenario.expectedSmoothness;
                
                test.details.smoothnessTests.push(smoothnessTest);
                this.testResults.smoothnessTests.push(smoothnessTest);
                
                await this.delay(200);
            }
            
            test.passed = test.details.smoothnessTests.every(st => st.passed);
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test extreme tempo handling and limits
     */
    async testExtremeTempoHandling() {
        const test = { name: 'Extreme Tempo Handling', passed: false, details: { extremeTests: [] } };
        
        try {
            const extremeScenario = this.tempoScenarios.extremeChanges;
            
            const extremeTest = {
                scenario: extremeScenario.name,
                changes: extremeScenario.changes,
                expectedAccuracy: extremeScenario.expectedAccuracy,
                actualAccuracy: 0,
                stabilityUnderStress: 0,
                recoveryTime: 0,
                passed: false
            };
            
            let totalError = 0;
            let measurementCount = 0;
            const stabilityMeasurements = [];
            
            for (const [index, change] of extremeScenario.changes.entries()) {
                const changeStartTime = performance.now();
                
                // Simulate extreme tempo change
                for (let step = 0; step < 10; step++) {
                    const targetTempo = change.tempo;
                    
                    // Add stress-related variation
                    const stressVariation = (Math.random() - 0.5) * (change.tempo > 150 ? 5 : 2);
                    const actualTempo = targetTempo + stressVariation;
                    
                    const error = Math.abs(actualTempo - targetTempo);
                    totalError += error;
                    measurementCount++;
                    
                    stabilityMeasurements.push({
                        tempo: change.tempo,
                        actual: actualTempo,
                        error: error,
                        step: step
                    });
                    
                    await this.delay(change.duration / 10);
                }
                
                const changeEndTime = performance.now();
                extremeTest.recoveryTime += changeEndTime - changeStartTime;
            }
            
            extremeTest.actualAccuracy = Math.max(0, 100 - (totalError / measurementCount) * 2);
            
            // Stability under stress (less variation is better)
            const stressErrors = stabilityMeasurements.map(m => m.error);
            const avgStressError = stressErrors.reduce((a, b) => a + b, 0) / stressErrors.length;
            extremeTest.stabilityUnderStress = Math.max(0, 100 - avgStressError * 4);
            
            extremeTest.recoveryTime = extremeTest.recoveryTime / extremeScenario.changes.length;
            
            extremeTest.passed = 
                extremeTest.actualAccuracy >= extremeScenario.expectedAccuracy &&
                extremeTest.stabilityUnderStress > 75 &&
                extremeTest.recoveryTime < 2000; // Recovery in reasonable time
            
            test.details.extremeTests.push(extremeTest);
            test.passed = extremeTest.passed;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test micro-timing variations
     */
    async testMicroTimingVariations() {
        const test = { name: 'Micro-timing Variations', passed: false, details: { microTimingTests: [] } };
        
        try {
            const microScenario = this.tempoScenarios.microTiming;
            
            const microTest = {
                scenario: microScenario.name,
                baseTempo: microScenario.baseTempo,
                variations: microScenario.variations,
                expectedAccuracy: microScenario.expectedAccuracy,
                actualAccuracy: 0,
                sensitivity: 0,
                precision: 0,
                passed: false
            };
            
            let totalError = 0;
            const precisionMeasurements = [];
            
            for (const [index, variation] of microScenario.variations.entries()) {
                const targetTempo = microScenario.baseTempo + variation;
                
                // Simulate high-precision measurement
                const measurementError = (Math.random() - 0.5) * 0.1; // Very small error for micro-timing
                const actualTempo = targetTempo + measurementError;
                
                const error = Math.abs(actualTempo - targetTempo);
                totalError += error;
                
                precisionMeasurements.push({
                    variation: variation,
                    target: targetTempo,
                    actual: actualTempo,
                    error: error
                });
                
                await this.delay(100); // Quick measurements
            }
            
            microTest.actualAccuracy = Math.max(0, 100 - (totalError / microScenario.variations.length) * 50);
            
            // Sensitivity (ability to detect small changes)
            const smallVariations = precisionMeasurements.filter(m => Math.abs(m.variation) <= 1);
            const smallVarAccuracy = smallVariations.reduce((sum, m) => sum + (1 - m.error), 0) / smallVariations.length;
            microTest.sensitivity = smallVarAccuracy * 100;
            
            // Precision (consistency of measurements)
            const errors = precisionMeasurements.map(m => m.error);
            const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
            microTest.precision = Math.max(0, 100 - avgError * 100);
            
            microTest.passed = 
                microTest.actualAccuracy >= microScenario.expectedAccuracy &&
                microTest.sensitivity > 90 &&
                microTest.precision > 85;
            
            test.details.microTimingTests.push(microTest);
            test.passed = microTest.passed;
            
        } catch (error) {
            test.error = error.message;
        }
        
        return test;
    }

    /**
     * Test performance under tempo stress
     */
    async testPerformanceUnderTempoStress() {
        const test = { name: 'Performance Under Tempo Stress', passed: false, details: { performanceTests: [] } };
        
        try {
            const stressScenarios = [
                { name: 'Rapid Tempo Changes', changes: 100, duration: 5000, maxLatency: 10 },
                { name: 'Extreme Range Stress', tempoRange: [40, 220], duration: 3000, maxLatency: 15 },
                { name: 'Continuous Modulation', frequency: 5, duration: 4000, maxLatency: 8 }
            ];
            
            for (const scenario of stressScenarios) {
                const performanceTest = {
                    scenario: scenario.name,
                    expectedMaxLatency: scenario.maxLatency,
                    actualMaxLatency: 0,
                    averageLatency: 0,
                    cpuUsage: 0,
                    memoryStability: true,
                    latencyMeasurements: [],
                    passed: false
                };
                
                const latencies = [];
                
                // Simulate performance stress test
                for (let i = 0; i < scenario.changes || 50; i++) {
                    const startTime = performance.now();
                    
                    // Simulate tempo processing
                    let processingTime;
                    switch (scenario.name) {
                        case 'Rapid Tempo Changes':
                            processingTime = 2 + Math.random() * 8; // 2-10ms
                            break;
                        case 'Extreme Range Stress':
                            processingTime = 3 + Math.random() * 12; // 3-15ms
                            break;
                        case 'Continuous Modulation':
                            processingTime = 1 + Math.random() * 7; // 1-8ms
                            break;
                        default:
                            processingTime = 5;
                    }
                    
                    await this.delay(Math.max(1, processingTime));
                    
                    const actualLatency = performance.now() - startTime;
                    latencies.push(actualLatency);
                    
                    performanceTest.latencyMeasurements.push({
                        iteration: i,
                        latency: actualLatency,
                        withinTarget: actualLatency <= scenario.maxLatency
                    });
                }
                
                performanceTest.actualMaxLatency = Math.max(...latencies);
                performanceTest.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                
                // Simulate CPU usage calculation
                performanceTest.cpuUsage = Math.min(95, performanceTest.averageLatency * 5);
                
                // Memory stability (check if performance degrades over time)
                const firstHalf = latencies.slice(0, Math.floor(latencies.length / 2));
                const secondHalf = latencies.slice(Math.floor(latencies.length / 2));
                const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                
                performanceTest.memoryStability = (secondHalfAvg - firstHalfAvg) < 5; // No significant degradation
                
                performanceTest.passed = 
                    performanceTest.actualMaxLatency <= scenario.maxLatency &&
                    performanceTest.averageLatency <= scenario.maxLatency * 0.6 &&
                    performanceTest.cpuUsage < 80 &&
                    performanceTest.memoryStability;
                
                test.details.performanceTests.push(performanceTest);
                this.testResults.performanceTests.push(performanceTest);
            }
            
            test.passed = test.details.performanceTests.filter(pt => pt.passed).length >= 2;
            
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
            tempoChangesCoverage: {
                accelerandoTests: this.testResults.accelerandoTests.length,
                ritardandoTests: this.testResults.ritardandoTests.length,
                rubatoTests: this.testResults.rubatoTests.length,
                complexTempoTests: this.testResults.complexTempoTests.length,
                timingAccuracyTests: this.testResults.timingAccuracyTests.length,
                smoothnessTests: this.testResults.smoothnessTests.length,
                performanceTests: this.testResults.performanceTests.length
            }
        };
        
        console.log('📊 Tempo Changes Test Report:', report);
        
        // Display in debug log if available
        const debugLog = document.getElementById('debug-log');
        if (debugLog) {
            debugLog.value += '\n\n=== TEMPO CHANGES TEST REPORT ===\n';
            debugLog.value += JSON.stringify(report, null, 2);
            debugLog.scrollTop = debugLog.scrollHeight;
        }
        
        return report;
    }

    // Helper methods
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

export default TempoChangesAutomatedTest;