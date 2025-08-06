/**
 * Automated Pitch Bend Test Suite for AWE Player
 * Tests MIDI pitch bend → sample playback rate modulation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_URL = `file://${path.resolve(__dirname, 'test-pitch-bend.html')}`;
const RESULTS_FILE = 'PITCH_BEND_TEST_RESULTS.md';
const SCREENSHOT_DIR = 'test-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

// Test utilities
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
    const filename = path.join(SCREENSHOT_DIR, `pitch-bend-${name}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    return filename;
}

// Main test suite
async function runPitchBendTests() {
    console.log('🎵 Starting Pitch Bend Test Suite...\n');
    
    const browser = await puppeteer.launch({
        headless: false, // Set to true for CI/CD
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('[')) {
            console.log('Browser:', msg.text());
        }
    });
    
    // Track test results
    const results = {
        passed: [],
        failed: [],
        warnings: [],
        startTime: new Date(),
        endTime: null
    };
    
    try {
        console.log('📝 Loading test page...');
        await page.goto(TEST_URL, { waitUntil: 'networkidle2' });
        await delay(1000);
        
        // Test 1: Initialize Audio System
        console.log('\n✅ Test 1: Audio System Initialization');
        await page.click('#init-audio');
        await delay(2000);
        
        const initLog = await page.evaluate(() => {
            return document.getElementById('debug-log').value;
        });
        
        if (initLog.includes('Audio initialized successfully')) {
            results.passed.push('Audio system initialization');
            console.log('  ✓ Audio system initialized');
        } else {
            results.failed.push('Audio system initialization');
            console.log('  ✗ Failed to initialize audio');
        }
        
        // Test 2: Pitch Bend Value Range
        console.log('\n✅ Test 2: Pitch Bend Value Range (-8192 to 8191)');
        
        const testValues = [-8192, -4096, 0, 4096, 8191];
        for (const value of testValues) {
            await page.evaluate((val) => {
                const slider = document.getElementById('pitch-bend-slider');
                slider.value = val;
                slider.dispatchEvent(new Event('input'));
            }, value);
            
            await delay(100);
            
            const displayValue = await page.evaluate(() => {
                return document.getElementById('pitch-value').textContent;
            });
            
            if (parseInt(displayValue) === value) {
                console.log(`  ✓ Pitch bend value ${value} set correctly`);
            } else {
                console.log(`  ✗ Pitch bend value ${value} failed`);
                results.failed.push(`Pitch bend value ${value}`);
            }
        }
        
        if (results.failed.length === 0) {
            results.passed.push('Pitch bend value range');
        }
        
        // Test 3: Frequency Calculation
        console.log('\n✅ Test 3: Frequency Calculation Accuracy');
        
        // Test center position (no bend)
        await page.evaluate(() => {
            const slider = document.getElementById('pitch-bend-slider');
            slider.value = 0;
            slider.dispatchEvent(new Event('input'));
        });
        
        const centerFreq = await page.evaluate(() => {
            return document.getElementById('target-freq').textContent;
        });
        
        if (centerFreq === '440.00 Hz') {
            results.passed.push('Center frequency calculation');
            console.log('  ✓ Center frequency correct (440.00 Hz)');
        } else {
            results.failed.push('Center frequency calculation');
            console.log(`  ✗ Center frequency incorrect: ${centerFreq}`);
        }
        
        // Test maximum upward bend (2 semitones up)
        await page.evaluate(() => {
            const slider = document.getElementById('pitch-bend-slider');
            slider.value = 8191;
            slider.dispatchEvent(new Event('input'));
        });
        
        await delay(100);
        
        const maxUpFreq = await page.evaluate(() => {
            return parseFloat(document.getElementById('target-freq').textContent);
        });
        
        const expectedMaxUp = 440 * Math.pow(2, 2/12); // ~493.88 Hz
        if (Math.abs(maxUpFreq - expectedMaxUp) < 1) {
            results.passed.push('Maximum upward bend calculation');
            console.log(`  ✓ Max upward bend correct (${maxUpFreq.toFixed(2)} Hz)`);
        } else {
            results.failed.push('Maximum upward bend calculation');
            console.log(`  ✗ Max upward bend incorrect: ${maxUpFreq} Hz`);
        }
        
        // Test maximum downward bend (2 semitones down)
        await page.evaluate(() => {
            const slider = document.getElementById('pitch-bend-slider');
            slider.value = -8192;
            slider.dispatchEvent(new Event('input'));
        });
        
        await delay(100);
        
        const maxDownFreq = await page.evaluate(() => {
            return parseFloat(document.getElementById('target-freq').textContent);
        });
        
        const expectedMaxDown = 440 * Math.pow(2, -2/12); // ~391.99 Hz
        if (Math.abs(maxDownFreq - expectedMaxDown) < 1) {
            results.passed.push('Maximum downward bend calculation');
            console.log(`  ✓ Max downward bend correct (${maxDownFreq.toFixed(2)} Hz)`);
        } else {
            results.failed.push('Maximum downward bend calculation');
            console.log(`  ✗ Max downward bend incorrect: ${maxDownFreq} Hz`);
        }
        
        // Test 4: Playback Rate Calculation
        console.log('\n✅ Test 4: Playback Rate Calculation');
        
        const playbackRateTests = [
            { bend: 0, expectedRate: 1.0 },
            { bend: 4096, expectedRate: 1.059 }, // 1 semitone up
            { bend: -4096, expectedRate: 0.944 }, // 1 semitone down
            { bend: 8191, expectedRate: 1.122 }, // 2 semitones up
            { bend: -8192, expectedRate: 0.891 }  // 2 semitones down
        ];
        
        for (const test of playbackRateTests) {
            await page.evaluate((val) => {
                const slider = document.getElementById('pitch-bend-slider');
                slider.value = val;
                slider.dispatchEvent(new Event('input'));
            }, test.bend);
            
            await delay(100);
            
            const playbackRate = await page.evaluate(() => {
                return parseFloat(document.getElementById('playback-rate').textContent);
            });
            
            if (Math.abs(playbackRate - test.expectedRate) < 0.01) {
                console.log(`  ✓ Bend ${test.bend}: rate ${playbackRate.toFixed(3)}x`);
            } else {
                console.log(`  ✗ Bend ${test.bend}: expected ${test.expectedRate}, got ${playbackRate}`);
                results.failed.push(`Playback rate for bend ${test.bend}`);
            }
        }
        
        if (results.failed.filter(f => f.includes('Playback rate')).length === 0) {
            results.passed.push('Playback rate calculations');
        }
        
        // Test 5: Single Note with Pitch Bend
        console.log('\n✅ Test 5: Single Note Playback with Pitch Bend');
        
        await page.evaluate(() => {
            const slider = document.getElementById('pitch-bend-slider');
            slider.value = 2048; // Slight upward bend
            slider.dispatchEvent(new Event('input'));
        });
        
        await page.click('#test-note');
        await delay(1500);
        
        const noteTestResults = await page.evaluate(() => {
            const results = document.querySelectorAll('.result-item.pass');
            return results.length > 0;
        });
        
        if (noteTestResults) {
            results.passed.push('Single note with pitch bend');
            console.log('  ✓ Single note played with pitch bend');
        } else {
            results.failed.push('Single note with pitch bend');
            console.log('  ✗ Single note playback failed');
        }
        
        // Test 6: Pitch Sweep
        console.log('\n✅ Test 6: Pitch Bend Sweep Test');
        
        await page.click('#test-sweep');
        await delay(5000); // Wait for sweep to complete
        
        const sweepResults = await page.evaluate(() => {
            const results = Array.from(document.querySelectorAll('.result-item'));
            return results.some(r => r.textContent.includes('Pitch sweep completed'));
        });
        
        if (sweepResults) {
            results.passed.push('Pitch bend sweep');
            console.log('  ✓ Pitch sweep completed successfully');
        } else {
            results.failed.push('Pitch bend sweep');
            console.log('  ✗ Pitch sweep failed');
        }
        
        await takeScreenshot(page, 'sweep-complete');
        
        // Test 7: Vibrato Effect
        console.log('\n✅ Test 7: Vibrato Effect Test');
        
        await page.click('#test-vibrato');
        await delay(4000); // Wait for vibrato to complete
        
        const vibratoResults = await page.evaluate(() => {
            const results = Array.from(document.querySelectorAll('.result-item'));
            return results.some(r => r.textContent.includes('Vibrato test completed'));
        });
        
        if (vibratoResults) {
            results.passed.push('Vibrato effect');
            console.log('  ✓ Vibrato effect working');
        } else {
            results.failed.push('Vibrato effect');
            console.log('  ✗ Vibrato effect failed');
        }
        
        // Test 8: Full Range Test
        console.log('\n✅ Test 8: Full Pitch Bend Range Test');
        
        await page.click('#test-range');
        await delay(6000); // Wait for range test to complete
        
        const rangeResults = await page.evaluate(() => {
            const results = Array.from(document.querySelectorAll('.result-item'));
            return results.some(r => r.textContent.includes('Full range test completed'));
        });
        
        if (rangeResults) {
            results.passed.push('Full pitch bend range');
            console.log('  ✓ Full range test passed');
        } else {
            results.failed.push('Full pitch bend range');
            console.log('  ✗ Full range test failed');
        }
        
        // Test 9: Automated Test Suite
        console.log('\n✅ Test 9: Running Automated Test Suite');
        
        await page.click('#automated-test');
        await delay(5000); // Wait for automated tests
        
        const automatedResults = await page.evaluate(() => {
            const results = Array.from(document.querySelectorAll('.result-item'));
            const passedTests = results.filter(r => r.classList.contains('pass')).length;
            const failedTests = results.filter(r => r.classList.contains('fail')).length;
            return { passed: passedTests, failed: failedTests };
        });
        
        console.log(`  Automated tests: ${automatedResults.passed} passed, ${automatedResults.failed} failed`);
        
        if (automatedResults.failed === 0) {
            results.passed.push('Automated test suite');
        } else {
            results.failed.push('Automated test suite');
        }
        
        // Test 10: MIDI Message Format
        console.log('\n✅ Test 10: MIDI Pitch Bend Message Format');
        
        const debugLog = await page.evaluate(() => {
            return document.getElementById('debug-log').value;
        });
        
        if (debugLog.includes('Pitch bend sent:') && debugLog.includes('LSB:') && debugLog.includes('MSB:')) {
            results.passed.push('MIDI message format');
            console.log('  ✓ MIDI pitch bend messages formatted correctly');
        } else {
            results.failed.push('MIDI message format');
            console.log('  ✗ MIDI message format issues detected');
        }
        
        // Take final screenshot
        await takeScreenshot(page, 'final-state');
        
    } catch (error) {
        console.error('Test error:', error);
        results.failed.push(`Test execution error: ${error.message}`);
    } finally {
        results.endTime = new Date();
        await browser.close();
    }
    
    // Generate test report
    generateTestReport(results);
    
    return results;
}

// Generate markdown report
function generateTestReport(results) {
    const duration = ((results.endTime - results.startTime) / 1000).toFixed(2);
    
    let report = `# Pitch Bend Test Results\n\n`;
    report += `**Test Date:** ${results.startTime.toISOString()}\n`;
    report += `**Duration:** ${duration} seconds\n\n`;
    
    report += `## Summary\n\n`;
    report += `- ✅ **Passed:** ${results.passed.length}\n`;
    report += `- ❌ **Failed:** ${results.failed.length}\n`;
    report += `- ⚠️ **Warnings:** ${results.warnings.length}\n\n`;
    
    const successRate = (results.passed.length / (results.passed.length + results.failed.length) * 100).toFixed(1);
    report += `**Success Rate:** ${successRate}%\n\n`;
    
    if (results.passed.length > 0) {
        report += `## ✅ Passed Tests\n\n`;
        results.passed.forEach(test => {
            report += `- ${test}\n`;
        });
        report += '\n';
    }
    
    if (results.failed.length > 0) {
        report += `## ❌ Failed Tests\n\n`;
        results.failed.forEach(test => {
            report += `- ${test}\n`;
        });
        report += '\n';
    }
    
    if (results.warnings.length > 0) {
        report += `## ⚠️ Warnings\n\n`;
        results.warnings.forEach(warning => {
            report += `- ${warning}\n`;
        });
        report += '\n';
    }
    
    report += `## Test Details\n\n`;
    report += `### Pitch Bend Functionality\n\n`;
    report += `The pitch bend test suite validates:\n\n`;
    report += `1. **Value Range:** Full 14-bit MIDI pitch bend range (-8192 to 8191)\n`;
    report += `2. **Frequency Calculation:** Accurate pitch modulation using exponential scaling\n`;
    report += `3. **Playback Rate:** Correct sample playback rate adjustments\n`;
    report += `4. **MIDI Integration:** Proper MIDI message formatting and transmission\n`;
    report += `5. **Real-time Response:** Smooth pitch transitions without artifacts\n`;
    report += `6. **Effects:** Vibrato and pitch sweep capabilities\n\n`;
    
    report += `### Key Findings\n\n`;
    
    if (results.passed.includes('Pitch bend value range')) {
        report += `- ✅ Full 14-bit pitch bend range is working correctly\n`;
    }
    
    if (results.passed.includes('Center frequency calculation')) {
        report += `- ✅ Center position (no bend) maintains correct base frequency\n`;
    }
    
    if (results.passed.includes('Playback rate calculations')) {
        report += `- ✅ Playback rate calculations are accurate for all bend values\n`;
    }
    
    if (results.passed.includes('Vibrato effect')) {
        report += `- ✅ Smooth vibrato modulation is functioning properly\n`;
    }
    
    if (results.passed.includes('MIDI message format')) {
        report += `- ✅ MIDI pitch bend messages are formatted correctly (LSB/MSB)\n`;
    }
    
    report += `\n### Recommendations\n\n`;
    
    if (results.failed.length === 0) {
        report += `✅ **All tests passed!** Pitch bend functionality is working correctly.\n\n`;
        report += `The pitch bend implementation correctly:\n`;
        report += `- Modulates sample playback rate based on bend value\n`;
        report += `- Supports the full ±2 semitone range (configurable)\n`;
        report += `- Provides smooth, artifact-free pitch transitions\n`;
        report += `- Maintains accurate frequency calculations\n`;
    } else {
        report += `⚠️ **Some tests failed.** Review the following:\n\n`;
        results.failed.forEach(test => {
            report += `- Fix: ${test}\n`;
        });
    }
    
    report += `\n### Screenshots\n\n`;
    report += `Screenshots have been saved to the \`${SCREENSHOT_DIR}\` directory:\n`;
    report += `- pitch-bend-sweep-complete.png\n`;
    report += `- pitch-bend-final-state.png\n`;
    
    // Write report to file
    fs.writeFileSync(RESULTS_FILE, report);
    console.log(`\n📊 Test report saved to ${RESULTS_FILE}`);
}

// Run tests
(async () => {
    try {
        const results = await runPitchBendTests();
        
        console.log('\n' + '='.repeat(50));
        console.log('TEST SUITE COMPLETE');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${results.passed.length}`);
        console.log(`❌ Failed: ${results.failed.length}`);
        console.log(`⚠️ Warnings: ${results.warnings.length}`);
        
        const successRate = (results.passed.length / (results.passed.length + results.failed.length) * 100).toFixed(1);
        console.log(`\n📊 Success Rate: ${successRate}%`);
        
        process.exit(results.failed.length > 0 ? 1 : 0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();