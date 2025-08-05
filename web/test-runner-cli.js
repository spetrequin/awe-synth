#!/usr/bin/env node

/**
 * AWE Player - CLI Integration Test Runner (Task 18.1)
 * 
 * Command-line interface for running integration tests
 * Suitable for CI/CD pipelines and automated testing
 */

const { program } = require('commander');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class AWEPlayerCLITestRunner {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 60000,
            outputFormat: options.outputFormat || 'console',
            suite: options.suite || 'all',
            failFast: options.failFast || false,
            verbose: options.verbose || false,
            saveArtifacts: options.saveArtifacts || false,
            ...options
        };
        
        this.browser = null;
        this.page = null;
        this.results = null;
    }
    
    /**
     * Initialize browser and page
     */
    async initialize() {
        this.log('🚀 Initializing browser environment...');
        
        try {
            this.browser = await puppeteer.launch({
                headless: this.options.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--allow-running-insecure-content',
                    '--autoplay-policy=no-user-gesture-required'
                ]
            });
            
            this.page = await this.browser.newPage();
            
            // Set up console logging
            this.page.on('console', msg => {
                if (this.options.verbose) {
                    console.log(`[BROWSER] ${msg.text()}`);
                }
            });
            
            // Set up error handling
            this.page.on('pageerror', error => {
                console.error(`[PAGE ERROR] ${error.message}`);
            });
            
            // Navigate to test page
            const testPagePath = path.resolve(__dirname, 'test-comprehensive-integration.html');
            await this.page.goto(`file://${testPagePath}`, {
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });
            
            this.log('✅ Browser environment initialized');
            return true;
        } catch (error) {
            console.error(`❌ Failed to initialize browser: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Run tests based on selected suite
     */
    async runTests() {
        this.log(`🧪 Running test suite: ${this.options.suite}`);
        
        try {
            // Wait for page to be ready
            await this.page.waitForSelector('#run-all-tests', { timeout: 10000 });
            
            // Inject test configuration
            await this.page.evaluate((options) => {
                window.testOptions = options;
            }, this.options);
            
            // Run appropriate test suite
            let testPromise;
            switch (this.options.suite) {
                case 'critical':
                    testPromise = this.page.click('#run-critical-path');
                    break;
                case 'performance':
                    testPromise = this.page.click('#run-performance-tests');
                    break;
                case 'all':
                default:
                    testPromise = this.page.click('#run-all-tests');
                    break;
            }
            
            await testPromise;
            
            // Wait for tests to complete
            await this.waitForTestCompletion();
            
            // Extract results
            this.results = await this.extractResults();
            
            this.log('✅ Test execution completed');
            return this.results;
        } catch (error) {
            console.error(`❌ Test execution failed: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Wait for test completion
     */
    async waitForTestCompletion() {
        const maxWaitTime = this.options.timeout;
        const checkInterval = 1000;
        let elapsed = 0;
        
        while (elapsed < maxWaitTime) {
            const isComplete = await this.page.evaluate(() => {
                // Check if summary is visible and tests are done
                const summary = document.getElementById('test-summary');
                const progressFill = document.getElementById('progress-fill');
                
                if (!summary || summary.style.display === 'none') {
                    return false;
                }
                
                if (progressFill && progressFill.style.width === '100%') {
                    return true;
                }
                
                return false;
            });
            
            if (isComplete) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
            
            if (this.options.verbose && elapsed % 5000 === 0) {
                this.log(`⏳ Waiting for test completion... (${elapsed/1000}s)`);
            }
        }
        
        throw new Error('Test execution timeout');
    }
    
    /**
     * Extract test results from the page
     */
    async extractResults() {
        return await this.page.evaluate(() => {
            const summary = {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0,
                success: false
            };
            
            // Extract summary metrics
            const totalEl = document.getElementById('total-tests');
            const passedEl = document.getElementById('passed-tests');
            const failedEl = document.getElementById('failed-tests');
            const durationEl = document.getElementById('test-duration');
            
            if (totalEl) summary.total = parseInt(totalEl.textContent.split(':')[1]) || 0;
            if (passedEl) summary.passed = parseInt(passedEl.textContent.split(':')[1]) || 0;
            if (failedEl) summary.failed = parseInt(failedEl.textContent.split(':')[1]) || 0;
            if (durationEl) summary.duration = parseFloat(durationEl.textContent.split(':')[1]) || 0;
            
            summary.success = summary.failed === 0 && summary.total > 0;
            
            // Extract individual test results
            const tests = [];
            const testElements = document.querySelectorAll('.test-item');
            
            for (const element of testElements) {
                const testName = element.querySelector('span:first-child')?.textContent?.trim();
                const statusText = element.querySelector('.test-status')?.textContent?.trim();
                const suite = element.closest('.test-suite')?.querySelector('h3')?.textContent?.trim() || 'Unknown';
                
                if (testName && statusText) {
                    tests.push({
                        name: testName,
                        suite: suite,
                        status: statusText,
                        passed: statusText.includes('PASSED'),
                        failed: statusText.includes('FAILED'),
                        skipped: statusText.includes('SKIP'),
                        element: element.className
                    });
                }
            }
            
            // Extract logs
            const logEl = document.getElementById('test-log');
            const logs = logEl ? logEl.value : '';
            
            return {
                summary,
                tests,
                logs,
                timestamp: new Date().toISOString()
            };
        });
    }
    
    /**
     * Generate formatted report
     */
    generateReport() {
        if (!this.results) {
            return 'No test results available';
        }
        
        if (this.options.outputFormat === 'json') {
            return JSON.stringify(this.results, null, 2);
        } else if (this.options.outputFormat === 'junit') {
            return this.generateJUnitXML();
        } else {
            return this.generateConsoleReport();
        }
    }
    
    /**
     * Generate console report
     */
    generateConsoleReport() {
        const { summary, tests } = this.results;
        let output = '\n';
        
        output += '🧪 AWE Player Integration Test Results\n';
        output += '═'.repeat(50) + '\n\n';
        
        if (summary.success) {
            output += `🎉 All tests passed! (${summary.passed}/${summary.total})\n`;
        } else {
            output += `⚠️ ${summary.failed} test(s) failed (${summary.passed}/${summary.total} passed)\n`;
        }
        
        output += `Duration: ${summary.duration}s\n`;
        if (summary.skipped > 0) {
            output += `Skipped: ${summary.skipped}\n`;
        }
        output += '\n';
        
        // Group by suite
        const suites = {};
        for (const test of tests) {
            const suiteName = test.suite.replace(/^[🔧🎹🎵🌊💻🔄⚡📋]\s*/, '');
            if (!suites[suiteName]) {
                suites[suiteName] = [];
            }
            suites[suiteName].push(test);
        }
        
        for (const [suiteName, suiteTests] of Object.entries(suites)) {
            output += `📋 ${suiteName}\n`;
            for (const test of suiteTests) {
                const status = test.passed ? '✅' : test.skipped ? '⏭️' : '❌';
                output += `  ${status} ${test.name}\n`;
            }
            output += '\n';
        }
        
        return output;
    }
    
    /**
     * Generate JUnit XML report
     */
    generateJUnitXML() {
        const { summary, tests } = this.results;
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<testsuites tests="${summary.total}" failures="${summary.failed}" time="${summary.duration}" timestamp="${this.results.timestamp}">\n`;
        
        // Group by suite
        const suites = {};
        for (const test of tests) {
            const suiteName = test.suite.replace(/^[🔧🎹🎵🌊💻🔄⚡📋]\s*/, '');
            if (!suites[suiteName]) {
                suites[suiteName] = [];
            }
            suites[suiteName].push(test);
        }
        
        for (const [suiteName, suiteTests] of Object.entries(suites)) {
            const suiteFailed = suiteTests.filter(t => t.failed).length;
            
            xml += `  <testsuite name="${suiteName}" tests="${suiteTests.length}" failures="${suiteFailed}">\n`;
            
            for (const test of suiteTests) {
                xml += `    <testcase name="${test.name}" classname="${suiteName}">\n`;
                if (test.failed) {
                    xml += `      <failure message="Test failed">${test.status}</failure>\n`;
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
     * Save artifacts if requested
     */
    async saveArtifacts() {
        if (!this.options.saveArtifacts || !this.results) {
            return;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const artifactsDir = path.join(__dirname, 'test-artifacts', timestamp);
        
        try {
            await fs.mkdir(artifactsDir, { recursive: true });
            
            // Save test report
            const report = this.generateReport();
            const reportExt = this.options.outputFormat === 'json' ? 'json' : 
                             this.options.outputFormat === 'junit' ? 'xml' : 'txt';
            await fs.writeFile(path.join(artifactsDir, `test-report.${reportExt}`), report);
            
            // Save raw results
            await fs.writeFile(
                path.join(artifactsDir, 'test-results.json'),
                JSON.stringify(this.results, null, 2)
            );
            
            // Save screenshot
            if (this.page) {
                await this.page.screenshot({
                    path: path.join(artifactsDir, 'test-screenshot.png'),
                    fullPage: true
                });
            }
            
            // Save logs
            if (this.results.logs) {
                await fs.writeFile(path.join(artifactsDir, 'test-logs.txt'), this.results.logs);
            }
            
            this.log(`📁 Artifacts saved to: ${artifactsDir}`);
        } catch (error) {
            console.error(`❌ Failed to save artifacts: ${error.message}`);
        }
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
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

// CLI Command Setup
program
    .name('awe-player-tests')
    .description('AWE Player Integration Test Runner')
    .version('1.0.0');

program
    .option('-s, --suite <suite>', 'Test suite to run (all, critical, performance)', 'all')
    .option('-o, --output <format>', 'Output format (console, json, junit)', 'console')
    .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '60000')
    .option('--fail-fast', 'Stop on first failure')
    .option('--headless', 'Run in headless mode', true)
    .option('--no-headless', 'Run with visible browser')
    .option('-v, --verbose', 'Verbose logging')
    .option('--save-artifacts', 'Save test artifacts (reports, screenshots, logs)')
    .action(async (options) => {
        const runner = new AWEPlayerCLITestRunner({
            suite: options.suite,
            outputFormat: options.output,
            timeout: parseInt(options.timeout),
            failFast: options.failFast,
            headless: options.headless,
            verbose: options.verbose,
            saveArtifacts: options.saveArtifacts
        });
        
        try {
            const initialized = await runner.initialize();
            if (!initialized) {
                process.exit(1);
            }
            
            const results = await runner.runTests();
            if (!results) {
                process.exit(1);
            }
            
            await runner.saveArtifacts();
            
            const report = runner.generateReport();
            console.log(report);
            
            // Exit with error code if tests failed
            const exitCode = results.summary.success ? 0 : 1;
            await runner.cleanup();
            process.exit(exitCode);
            
        } catch (error) {
            console.error(`💥 Test runner failed: ${error.message}`);
            await runner.cleanup();
            process.exit(1);
        }
    });

// Parse command line arguments
if (require.main === module) {
    program.parse();
}

module.exports = AWEPlayerCLITestRunner;