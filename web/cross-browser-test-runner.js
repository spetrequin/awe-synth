#!/usr/bin/env node

/**
 * AWE Player - Cross-Browser Test Runner (Task 18.3)
 * 
 * Automated cross-browser compatibility testing using Puppeteer
 * Supports multiple browsers and generates comprehensive reports
 */

const { program } = require('commander');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class CrossBrowserTestRunner {
    constructor(options = {}) {
        this.options = {
            browsers: options.browsers || ['chrome', 'firefox'],
            headless: options.headless !== false,
            timeout: options.timeout || 120000,
            outputDir: options.outputDir || './test-results',
            verbose: options.verbose || false,
            saveScreenshots: options.saveScreenshots || false,
            ...options
        };
        
        this.results = {};
        this.startTime = Date.now();
    }
    
    /**
     * Run tests across all specified browsers
     */
    async runAllBrowsers() {
        console.log('🌐 Starting cross-browser compatibility testing...');
        console.log(`Browsers: ${this.options.browsers.join(', ')}`);
        console.log(`Timeout: ${this.options.timeout}ms`);
        console.log(`Output: ${this.options.outputDir}\n`);
        
        // Ensure output directory exists
        await this.ensureOutputDir();
        
        for (const browserName of this.options.browsers) {
            console.log(`\n🔍 Testing ${browserName.toUpperCase()}`);
            console.log('─'.repeat(50));
            
            try {
                const result = await this.testBrowser(browserName);
                this.results[browserName] = result;
                this.printBrowserSummary(browserName, result);
            } catch (error) {
                console.error(`❌ ${browserName} testing failed: ${error.message}`);
                this.results[browserName] = {
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        }
        
        // Generate comprehensive report
        await this.generateReport();
        
        console.log('\n🏁 Cross-browser testing completed');
        return this.results;
    }
    
    /**
     * Test a specific browser
     */
    async testBrowser(browserName) {
        const browser = await this.launchBrowser(browserName);
        const page = await browser.newPage();
        
        try {
            // Set up page monitoring
            const logs = [];
            const errors = [];
            
            page.on('console', msg => {
                logs.push({
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: Date.now()
                });
                
                if (this.options.verbose) {
                    console.log(`[${browserName}] ${msg.text()}`);
                }
            });
            
            page.on('pageerror', error => {
                errors.push({
                    message: error.message,
                    stack: error.stack,
                    timestamp: Date.now()
                });
                console.error(`[${browserName}] Page Error: ${error.message}`);
            });
            
            // Set viewport and navigate
            await page.setViewport({ width: 1280, height: 720 });
            
            const testPagePath = path.resolve(__dirname, 'browser-compatibility-test.html');
            await page.goto(`file://${testPagePath}`, {
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });
            
            // Wait for page to be ready
            await page.waitForSelector('#run-all-tests', { timeout: 10000 });
            
            // Get browser information
            const browserInfo = await page.evaluate(() => {
                return {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine,
                    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                    maxTouchPoints: navigator.maxTouchPoints || 0,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    screen: {
                        width: screen.width,
                        height: screen.height,
                        colorDepth: screen.colorDepth
                    }
                };
            });
            
            // Run feature detection
            const features = await page.evaluate(() => {
                const features = {};
                const tests = {
                    'WebAssembly': () => typeof WebAssembly !== 'undefined',
                    'AudioContext': () => typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
                    'AudioWorklet': () => typeof AudioWorklet !== 'undefined',
                    'WebMIDI': () => typeof navigator.requestMIDIAccess !== 'undefined',
                    'ES6 Modules': () => 'noModule' in HTMLScriptElement.prototype,
                    'SharedArrayBuffer': () => typeof SharedArrayBuffer !== 'undefined',
                    'OffscreenCanvas': () => typeof OffscreenCanvas !== 'undefined',
                    'File API': () => typeof File !== 'undefined' && typeof FileReader !== 'undefined',
                    'Performance Observer': () => typeof PerformanceObserver !== 'undefined',
                    'High Resolution Time': () => typeof performance.now !== 'undefined',
                    'Canvas 2D': () => {
                        const canvas = document.createElement('canvas');
                        return !!(canvas.getContext && canvas.getContext('2d'));
                    },
                    'CSS Grid': () => CSS.supports('display', 'grid'),
                    'CSS Animations': () => 'animation' in document.documentElement.style,
                    'Drag & Drop': () => 'draggable' in document.createElement('div'),
                    'Request Animation Frame': () => typeof requestAnimationFrame !== 'undefined'
                };
                
                for (const [name, test] of Object.entries(tests)) {
                    try {
                        features[name] = test();
                    } catch (error) {
                        features[name] = false;
                    }
                }
                
                return features;
            });
            
            // Run compatibility tests
            await page.click('#run-all-tests');
            
            // Wait for tests to complete
            await this.waitForTestCompletion(page);
            
            // Extract test results
            const testResults = await page.evaluate(() => {
                const results = {};
                const testElements = document.querySelectorAll('.test-status[data-test]');
                
                for (const element of testElements) {
                    const testName = element.getAttribute('data-test');
                    const status = element.textContent.toLowerCase();
                    results[testName] = status;
                }
                
                // Get summary
                const summary = {
                    total: testElements.length,
                    passed: document.querySelectorAll('.status-passed').length,
                    failed: document.querySelectorAll('.status-failed').length,
                    warning: document.querySelectorAll('.status-warning').length,
                    unsupported: document.querySelectorAll('.status-unsupported').length
                };
                
                const score = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
                
                return { results, summary: { ...summary, score } };
            });
            
            // Save screenshot if requested
            if (this.options.saveScreenshots) {
                const screenshotPath = path.join(this.options.outputDir, `${browserName}-screenshot.png`);
                await page.screenshot({ 
                    path: screenshotPath, 
                    fullPage: true 
                });
            }
            
            // Run performance benchmarks
            const benchmarks = await this.runBenchmarks(page);
            
            return {
                browser: browserName,
                timestamp: new Date().toISOString(),
                browserInfo,
                features,
                testResults: testResults.results,
                summary: testResults.summary,
                benchmarks,
                logs: logs.slice(-100), // Keep last 100 log entries
                errors,
                success: testResults.summary.score >= 75 // 75% compatibility threshold
            };
            
        } finally {
            await browser.close();
        }
    }
    
    /**
     * Launch browser instance
     */
    async launchBrowser(browserName) {
        const launchOptions = {
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--autoplay-policy=no-user-gesture-required',
                '--disable-features=VizDisplayCompositor'
            ]
        };
        
        switch (browserName.toLowerCase()) {
            case 'chrome':
                return await puppeteer.launch(launchOptions);
                
            case 'firefox':
                return await puppeteer.launch({
                    ...launchOptions,
                    product: 'firefox'
                });
                
            case 'edge':
                return await puppeteer.launch({
                    ...launchOptions,
                    executablePath: this.getEdgePath()
                });
                
            default:
                throw new Error(`Unsupported browser: ${browserName}`);
        }
    }
    
    /**
     * Get Edge executable path
     */
    getEdgePath() {
        const platform = process.platform;
        
        if (platform === 'win32') {
            return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        } else if (platform === 'darwin') {
            return '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
        } else {
            return 'microsoft-edge';
        }
    }
    
    /**
     * Wait for test completion
     */
    async waitForTestCompletion(page) {
        const maxWaitTime = this.options.timeout;
        const checkInterval = 2000;
        let elapsed = 0;
        
        while (elapsed < maxWaitTime) {
            const isComplete = await page.evaluate(() => {
                const summary = document.getElementById('results-summary');
                return summary && summary.style.display !== 'none';
            });
            
            if (isComplete) {
                // Wait a bit more to ensure all tests are really done
                await new Promise(resolve => setTimeout(resolve, 2000));
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
            
            if (elapsed % 10000 === 0) {
                console.log(`⏳ Waiting for test completion... (${elapsed/1000}s)`);
            }
        }
        
        throw new Error('Test execution timeout');
    }
    
    /**
     * Run performance benchmarks
     */
    async runBenchmarks(page) {
        try {
            // Click performance tests
            await page.click('#run-performance-tests');
            
            // Wait for benchmarks to complete
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Extract benchmark results
            const benchmarks = await page.evaluate(() => {
                const benchmarkElements = document.querySelectorAll('.benchmark-chart');
                const results = {};
                
                for (const element of benchmarkElements) {
                    const title = element.querySelector('h4')?.textContent;
                    const paragraphs = element.querySelectorAll('p');
                    
                    if (title && paragraphs.length >= 2) {
                        const timeText = paragraphs[0]?.textContent || '';
                        const opsText = paragraphs[1]?.textContent || '';
                        
                        const timeMatch = timeText.match(/([0-9.]+)ms/);
                        const opsMatch = opsText.match(/([0-9,]+)/);
                        
                        results[title] = {
                            totalTime: timeMatch ? parseFloat(timeMatch[1]) : 0,
                            operationsPerSecond: opsMatch ? parseInt(opsMatch[1].replace(/,/g, '')) : 0
                        };
                    }
                }
                
                return results;
            });
            
            return benchmarks;
            
        } catch (error) {
            console.warn(`Benchmark failed: ${error.message}`);
            return {};
        }
    }
    
    /**
     * Ensure output directory exists
     */
    async ensureOutputDir() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    
    /**
     * Print browser test summary
     */
    printBrowserSummary(browserName, result) {
        if (result.error) {
            console.log(`❌ ${browserName}: FAILED - ${result.error}`);
            return;
        }
        
        const { summary, browserInfo } = result;
        
        console.log(`Browser: ${browserInfo.userAgent.split(' ')[0]} on ${browserInfo.platform}`);
        console.log(`Tests: ${summary.passed}/${summary.total} passed (${summary.score}%)`);
        
        if (summary.failed > 0) {
            console.log(`❌ Failed: ${summary.failed}`);
        }
        if (summary.warning > 0) {
            console.log(`⚠️ Warnings: ${summary.warning}`);
        }
        if (summary.unsupported > 0) {
            console.log(`ℹ️ Unsupported: ${summary.unsupported}`);
        }
        
        const status = result.success ? '✅ COMPATIBLE' : '⚠️ LIMITED COMPATIBILITY';
        console.log(`Status: ${status}`);
    }
    
    /**
     * Generate comprehensive report
     */
    async generateReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            browsers: this.options.browsers,
            results: this.results,
            summary: this.generateOverallSummary()
        };
        
        // Save JSON report
        const jsonPath = path.join(this.options.outputDir, 'cross-browser-report.json');
        await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2));
        
        // Generate HTML report
        const htmlReport = this.generateHTMLReport(reportData);
        const htmlPath = path.join(this.options.outputDir, 'cross-browser-report.html');
        await fs.writeFile(htmlPath, htmlReport);
        
        // Generate CI/CD friendly report
        const ciReport = this.generateCIReport(reportData);
        const ciPath = path.join(this.options.outputDir, 'ci-report.txt');
        await fs.writeFile(ciPath, ciReport);
        
        console.log(`\n📊 Reports generated:`);
        console.log(`  JSON: ${jsonPath}`);
        console.log(`  HTML: ${htmlPath}`);
        console.log(`  CI: ${ciPath}`);
    }
    
    /**
     * Generate overall summary
     */
    generateOverallSummary() {
        const browsers = Object.keys(this.results);
        const successful = browsers.filter(b => this.results[b].success).length;
        const failed = browsers.filter(b => this.results[b].error).length;
        const limited = browsers.length - successful - failed;
        
        // Calculate average compatibility score
        const validResults = browsers.filter(b => !this.results[b].error);
        const avgScore = validResults.length > 0 
            ? Math.round(validResults.reduce((sum, b) => sum + this.results[b].summary.score, 0) / validResults.length)
            : 0;
        
        // Find most common issues
        const allIssues = {};
        for (const browser of browsers) {
            const result = this.results[browser];
            if (result.testResults) {
                for (const [test, status] of Object.entries(result.testResults)) {
                    if (status === 'failed' || status === 'unsupported') {
                        allIssues[test] = (allIssues[test] || 0) + 1;
                    }
                }
            }
        }
        
        const topIssues = Object.entries(allIssues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([test, count]) => ({ test, affectedBrowsers: count }));
        
        return {
            totalBrowsers: browsers.length,
            successful,
            limited,
            failed,
            averageCompatibilityScore: avgScore,
            topCompatibilityIssues: topIssues,
            overallStatus: successful >= browsers.length * 0.8 ? 'PASS' : 'WARN'
        };
    }
    
    /**
     * Generate HTML report
     */
    generateHTMLReport(data) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>AWE Player - Cross-Browser Compatibility Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .browser-result { margin-bottom: 30px; padding: 20px; border-radius: 8px; }
        .browser-success { background: #d4edda; border: 1px solid #c3e6cb; }
        .browser-warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        .browser-error { background: #f8d7da; border: 1px solid #f5c6cb; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .test-category { background: #f8f9fa; padding: 15px; border-radius: 4px; }
        .test-item { display: flex; justify-content: space-between; padding: 5px 0; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .status-unsupported { color: #6c757d; font-weight: bold; }
        .benchmark-results { margin-top: 20px; }
        .benchmark-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .benchmark-item { background: #e9ecef; padding: 15px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 AWE Player Cross-Browser Compatibility Report</h1>
            <p>Generated: ${data.timestamp}</p>
            <p>Duration: ${Math.round(data.duration / 1000)}s</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Overall Status</h3>
                <div style="font-size: 2em; color: ${data.summary.overallStatus === 'PASS' ? '#28a745' : '#ffc107'}">
                    ${data.summary.overallStatus}
                </div>
            </div>
            <div class="summary-card">
                <h3>Average Score</h3>
                <div style="font-size: 2em;">${data.summary.averageCompatibilityScore}%</div>
            </div>
            <div class="summary-card">
                <h3>Browsers Tested</h3>
                <div style="font-size: 2em;">${data.summary.totalBrowsers}</div>
            </div>
            <div class="summary-card">
                <h3>Successful</h3>
                <div style="font-size: 2em; color: #28a745;">${data.summary.successful}</div>
            </div>
        </div>
        
        ${Object.entries(data.results).map(([browser, result]) => this.generateBrowserSection(browser, result)).join('')}
        
        <div class="top-issues">
            <h2>🔍 Top Compatibility Issues</h2>
            <ul>
                ${data.summary.topCompatibilityIssues.map(issue => 
                    `<li><strong>${issue.test}</strong> - affects ${issue.affectedBrowsers} browser(s)</li>`
                ).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;
    }
    
    generateBrowserSection(browserName, result) {
        if (result.error) {
            return `
                <div class="browser-result browser-error">
                    <h2>❌ ${browserName.toUpperCase()} - FAILED</h2>
                    <p><strong>Error:</strong> ${result.error}</p>
                </div>
            `;
        }
        
        const statusClass = result.success ? 'browser-success' : 'browser-warning';
        const statusIcon = result.success ? '✅' : '⚠️';
        
        return `
            <div class="browser-result ${statusClass}">
                <h2>${statusIcon} ${browserName.toUpperCase()} - Score: ${result.summary.score}%</h2>
                
                <p><strong>User Agent:</strong> ${result.browserInfo.userAgent}</p>
                <p><strong>Platform:</strong> ${result.browserInfo.platform}</p>
                <p><strong>Tests:</strong> ${result.summary.passed}/${result.summary.total} passed</p>
                
                <h3>Feature Support</h3>
                <div class="test-grid">
                    ${Object.entries(result.features).map(([feature, supported]) => `
                        <div class="test-item">
                            <span>${feature}</span>
                            <span class="${supported ? 'status-passed' : 'status-failed'}">
                                ${supported ? 'SUPPORTED' : 'NOT SUPPORTED'}
                            </span>
                        </div>
                    `).join('')}
                </div>
                
                <h3>Test Results</h3>
                <div class="test-grid">
                    ${Object.entries(result.testResults).map(([test, status]) => `
                        <div class="test-item">
                            <span>${test.replace(/-/g, ' ').toUpperCase()}</span>
                            <span class="status-${status}">${status.toUpperCase()}</span>
                        </div>
                    `).join('')}
                </div>
                
                ${Object.keys(result.benchmarks).length > 0 ? `
                    <h3>Performance Benchmarks</h3>
                    <div class="benchmark-grid">
                        ${Object.entries(result.benchmarks).map(([name, bench]) => `
                            <div class="benchmark-item">
                                <h4>${name}</h4>
                                <p>Time: ${bench.totalTime.toFixed(2)}ms</p>
                                <p>Ops/sec: ${bench.operationsPerSecond.toLocaleString()}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Generate CI/CD friendly report
     */
    generateCIReport(data) {
        let report = 'AWE PLAYER CROSS-BROWSER COMPATIBILITY REPORT\n';
        report += '='.repeat(50) + '\n\n';
        
        report += `Timestamp: ${data.timestamp}\n`;
        report += `Duration: ${Math.round(data.duration / 1000)}s\n`;
        report += `Overall Status: ${data.summary.overallStatus}\n`;
        report += `Average Compatibility: ${data.summary.averageCompatibilityScore}%\n\n`;
        
        report += 'BROWSER RESULTS:\n';
        report += '-'.repeat(30) + '\n';
        
        for (const [browser, result] of Object.entries(data.results)) {
            if (result.error) {
                report += `❌ ${browser.toUpperCase()}: FAILED (${result.error})\n`;
            } else {
                const status = result.success ? 'PASS' : 'WARN';
                report += `${result.success ? '✅' : '⚠️'} ${browser.toUpperCase()}: ${status} (${result.summary.score}%)\n`;
            }
        }
        
        if (data.summary.topCompatibilityIssues.length > 0) {
            report += '\nTOP COMPATIBILITY ISSUES:\n';
            report += '-'.repeat(30) + '\n';
            
            for (const issue of data.summary.topCompatibilityIssues) {
                report += `- ${issue.test}: affects ${issue.affectedBrowsers} browser(s)\n`;
            }
        }
        
        report += '\nRECOMMendations:\n';
        report += '-'.repeat(30) + '\n';
        
        if (data.summary.averageCompatibilityScore >= 90) {
            report += '✅ Excellent cross-browser compatibility\n';
        } else if (data.summary.averageCompatibilityScore >= 75) {
            report += '👍 Good compatibility with minor issues\n';
        } else {
            report += '⚠️ Significant compatibility issues require attention\n';
        }
        
        return report;
    }
}

// CLI Command Setup
program
    .name('cross-browser-test')
    .description('AWE Player Cross-Browser Compatibility Test Runner')
    .version('1.0.0');

program
    .option('-b, --browsers <browsers>', 'Comma-separated list of browsers (chrome,firefox,edge)', 'chrome,firefox')
    .option('-o, --output <dir>', 'Output directory for reports', './browser-test-results')
    .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '120000')
    .option('--no-headless', 'Run browsers in visible mode')
    .option('-v, --verbose', 'Verbose logging')
    .option('--screenshots', 'Save screenshots for each browser')
    .action(async (options) => {
        const browsers = options.browsers.split(',').map(b => b.trim());
        
        const runner = new CrossBrowserTestRunner({
            browsers,
            outputDir: options.output,
            timeout: parseInt(options.timeout),
            headless: options.headless,
            verbose: options.verbose,
            saveScreenshots: options.screenshots
        });
        
        try {
            const results = await runner.runAllBrowsers();
            
            // Exit with error code if any critical failures
            const hasFailures = Object.values(results).some(r => r.error || !r.success);
            process.exit(hasFailures ? 1 : 0);
            
        } catch (error) {
            console.error(`💥 Cross-browser testing failed: ${error.message}`);
            process.exit(1);
        }
    });

// Parse command line arguments
if (require.main === module) {
    program.parse();
}

module.exports = CrossBrowserTestRunner;