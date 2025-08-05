#!/usr/bin/env node

/**
 * AWE Player - SoundFont Test Automation (Task 18.5)
 * 
 * Automated SoundFont compatibility testing and validation
 */

const { program } = require('commander');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SoundFontTestAutomation {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 120000,
            outputDir: options.outputDir || './soundfont-test-results',
            verbose: options.verbose || false,
            soundfontDir: options.soundfontDir || './test-soundfonts',
            testSuite: options.testSuite || 'comprehensive',
            ...options
        };
        
        this.results = {
            soundfonts: [],
            tests: {},
            summary: {},
            compatibility: {},
            performance: {}
        };
        
        this.testSuites = {
            basic: [
                'header-validation',
                'riff-structure',
                'preset-loading',
                'sample-integrity'
            ],
            comprehensive: [
                'header-validation',
                'riff-structure', 
                'chunk-validation',
                'preset-loading',
                'instrument-zones',
                'sample-headers',
                'generators',
                'sample-integrity',
                'loop-points',
                'generator-ranges',
                'load-time',
                'memory-usage'
            ],
            full: [
                'header-validation',
                'riff-structure',
                'chunk-validation',
                'endianness',
                'preset-loading',
                'instrument-zones',
                'sample-headers',
                'generators',
                'modulators',
                'sample-integrity',
                'loop-points',
                'sample-rates',
                'bit-depth',
                'generator-ranges',
                'filter-compat',
                'envelope-compat',
                'lfo-compat',
                'load-time',
                'memory-usage',
                'streaming',
                'polyphony-stress',
                'corrupted-files',
                'large-files',
                'missing-chunks',
                'invalid-generators'
            ]
        };
        
        this.knownSoundFonts = {
            'FluidR3_GM.sf2': {
                expectedInstruments: 128,
                expectedSamples: 300,
                knownIssues: [],
                compatibility: 'excellent'
            },
            'GeneralUser GS.sf2': {
                expectedInstruments: 200,
                expectedSamples: 500,
                knownIssues: [],
                compatibility: 'excellent'
            },
            'TimGM6mb.sf2': {
                expectedInstruments: 128,
                expectedSamples: 250,
                knownIssues: ['large_reverb_samples'],
                compatibility: 'good'
            },
            'Musyng Kite.sf2': {
                expectedInstruments: 128,
                expectedSamples: 400,
                knownIssues: [],
                compatibility: 'excellent'
            }
        };
    }
    
    /**
     * Run automated SoundFont tests
     */
    async runTests() {
        console.log('🎼 Starting SoundFont Compatibility Test Automation...');
        console.log(`Test Suite: ${this.options.testSuite}`);
        console.log(`SoundFont Directory: ${this.options.soundfontDir}`);
        console.log(`Output Directory: ${this.options.outputDir}`);
        console.log(`Timeout: ${this.options.timeout}ms\n`);
        
        // Ensure output directory exists
        await this.ensureOutputDir();
        
        // Find SoundFont files
        const soundfontFiles = await this.findSoundFontFiles();
        
        if (soundfontFiles.length === 0) {
            console.log('⚠️ No SoundFont files found in directory');
            console.log('Please place .sf2 files in:', this.options.soundfontDir);
            return this.results;
        }
        
        console.log(`Found ${soundfontFiles.length} SoundFont file(s):`);
        soundfontFiles.forEach(file => {
            console.log(`  - ${path.basename(file)}`);
        });
        
        const browser = await puppeteer.launch({
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });
        
        try {
            const page = await browser.newPage();
            
            // Set up page monitoring
            const logs = [];
            const errors = [];
            
            page.on('console', msg => {
                const logEntry = {
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: Date.now()
                };
                logs.push(logEntry);
                
                if (this.options.verbose) {
                    console.log(`[BROWSER] ${msg.text()}`);
                }
            });
            
            page.on('pageerror', error => {
                errors.push({
                    message: error.message,
                    stack: error.stack,
                    timestamp: Date.now()
                });
                console.error(`[PAGE ERROR] ${error.message}`);
            });
            
            // Navigate to SoundFont tester
            const testerPath = path.resolve(__dirname, 'soundfont-compatibility-tester.html');
            await page.goto(`file://${testerPath}`, {
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });
            
            // Wait for page initialization
            await page.waitForSelector('#drop-zone', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n🧪 Testing SoundFont files...');
            
            // Test each SoundFont file
            for (let i = 0; i < soundfontFiles.length; i++) {
                const filePath = soundfontFiles[i];
                const fileName = path.basename(filePath);
                
                console.log(`\n📂 Testing ${fileName} (${i + 1}/${soundfontFiles.length})`);
                
                try {
                    const result = await this.testSoundFontFile(page, filePath);
                    this.results.soundfonts.push(result);
                    this.printSoundFontSummary(result);
                } catch (error) {
                    console.error(`❌ Failed to test ${fileName}: ${error.message}`);
                    this.results.soundfonts.push({
                        name: fileName,
                        path: filePath,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            // Get overall test results
            const testResults = await page.evaluate(() => {
                const results = {};
                const testElements = document.querySelectorAll('.test-status[data-test]');
                
                for (const element of testElements) {
                    const testName = element.getAttribute('data-test');
                    const status = element.textContent.toLowerCase();
                    results[testName] = status;
                }
                
                return results;
            });
            
            this.results.tests = testResults;
            
            // Generate comprehensive results
            this.results.summary = this.generateSummary();
            this.results.compatibility = this.analyzeCompatibility();
            this.results.performance = this.analyzePerformance();
            this.results.logs = logs.slice(-100);
            this.results.errors = errors;
            
            // Save results
            await this.saveResults();
            
            console.log('\n📊 Test Automation Summary:');
            this.printOverallSummary();
            
        } finally {
            await browser.close();
        }
        
        return this.results;
    }
    
    /**
     * Find SoundFont files in directory
     */
    async findSoundFontFiles() {
        const files = [];
        
        try {
            const dirContents = await fs.readdir(this.options.soundfontDir);
            
            for (const file of dirContents) {
                if (file.toLowerCase().endsWith('.sf2')) {
                    const fullPath = path.join(this.options.soundfontDir, file);
                    const stats = await fs.stat(fullPath);
                    
                    if (stats.isFile()) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Creating SoundFont directory: ${this.options.soundfontDir}`);
                await fs.mkdir(this.options.soundfontDir, { recursive: true });
            } else {
                throw error;
            }
        }
        
        return files;
    }
    
    /**
     * Test a single SoundFont file
     */
    async testSoundFontFile(page, filePath) {
        const fileName = path.basename(filePath);
        const startTime = Date.now();
        
        // Get file stats
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;
        
        // Upload file to browser
        const fileInput = await page.$('#file-input');
        await fileInput.uploadFile(filePath);
        
        // Wait for file to load
        await this.waitForSoundFontLoad(page, fileName);
        
        const loadTime = Date.now() - startTime;
        
        // Get SoundFont information
        const soundfontInfo = await page.evaluate((fileName) => {
            const cards = document.querySelectorAll('.soundfont-card');
            
            for (const card of cards) {
                const nameEl = card.querySelector('.soundfont-name');
                if (nameEl && nameEl.textContent === fileName) {
                    const infoRows = card.querySelectorAll('.info-row');
                    const info = {};
                    
                    for (const row of infoRows) {
                        const label = row.querySelector('.info-label')?.textContent?.replace(':', '');
                        const value = row.children[1]?.textContent;
                        if (label && value) {
                            info[label.toLowerCase()] = value;
                        }
                    }
                    
                    return info;
                }
            }
            
            return null;
        }, fileName);
        
        if (!soundfontInfo) {
            throw new Error('Failed to load SoundFont information');
        }
        
        // Run tests for this SoundFont
        const testsToRun = this.getTestsToRun();
        await this.runSoundFontTests(page, testsToRun);
        
        // Get test results
        const testResults = await page.evaluate(() => {
            const results = {};
            const testElements = document.querySelectorAll('.test-status[data-test]');
            
            for (const element of testElements) {
                const testName = element.getAttribute('data-test');
                const status = element.textContent.toLowerCase();
                results[testName] = status;
            }
            
            return results;
        });
        
        // Calculate compatibility score
        const compatibilityScore = this.calculateCompatibilityScore(testResults);
        
        // Get known issues
        const knownInfo = this.knownSoundFonts[fileName] || {};
        
        return {
            name: fileName,
            path: filePath,
            size: fileSize,
            loadTime: loadTime,
            instruments: parseInt(soundfontInfo.instruments) || 0,
            samples: parseInt(soundfontInfo.samples) || 0,
            compatibility: {
                score: compatibilityScore,
                level: this.getCompatibilityLevel(compatibilityScore),
                expected: knownInfo.compatibility || 'unknown'
            },
            testResults: testResults,
            knownIssues: knownInfo.knownIssues || [],
            timestamp: new Date().toISOString(),
            performance: {
                loadTimePerMB: loadTime / (fileSize / (1024 * 1024)),
                memoryEfficiency: fileSize / Math.max(soundfontInfo.samples || 1, 1)
            }
        };
    }
    
    /**
     * Wait for SoundFont to load
     */
    async waitForSoundFontLoad(page, fileName) {
        const maxWaitTime = this.options.timeout;
        const checkInterval = 1000;
        let elapsed = 0;
        
        while (elapsed < maxWaitTime) {
            const isLoaded = await page.evaluate((fileName) => {
                const cards = document.querySelectorAll('.soundfont-card');
                
                for (const card of cards) {
                    const nameEl = card.querySelector('.soundfont-name');
                    const statusEl = card.querySelector('.soundfont-status');
                    
                    if (nameEl && nameEl.textContent === fileName) {
                        return statusEl && statusEl.textContent.toLowerCase() === 'loaded';
                    }
                }
                
                return false;
            }, fileName);
            
            if (isLoaded) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
            
            if (elapsed % 5000 === 0) {
                console.log(`⏳ Waiting for ${fileName} to load... (${elapsed/1000}s)`);
            }
        }
        
        throw new Error(`SoundFont loading timeout: ${fileName}`);
    }
    
    /**
     * Run tests for current SoundFont
     */
    async runSoundFontTests(page, tests) {
        // Click appropriate test button based on suite
        let testButton;
        switch (this.options.testSuite) {
            case 'basic':
                testButton = '#run-quick-test';
                break;
            case 'comprehensive':
            case 'full':
            default:
                testButton = '#run-all-tests';
                break;
        }
        
        await page.click(testButton);
        
        // Wait for tests to complete
        await this.waitForTestCompletion(page);
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
                // Wait a bit more to ensure all tests are done
                await new Promise(resolve => setTimeout(resolve, 2000));
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
            
            if (elapsed % 10000 === 0) {
                console.log(`⏳ Waiting for tests to complete... (${elapsed/1000}s)`);
            }
        }
        
        throw new Error('Test execution timeout');
    }
    
    /**
     * Get tests to run based on suite
     */
    getTestsToRun() {
        return this.testSuites[this.options.testSuite] || this.testSuites.comprehensive;
    }
    
    /**
     * Calculate compatibility score
     */
    calculateCompatibilityScore(testResults) {
        const totalTests = Object.keys(testResults).length;
        if (totalTests === 0) return 0;
        
        let score = 0;
        for (const status of Object.values(testResults)) {
            if (status === 'passed') score += 100;
            else if (status === 'warning') score += 70;
            else if (status === 'failed') score += 0;
        }
        
        return Math.round(score / totalTests);
    }
    
    /**
     * Get compatibility level from score
     */
    getCompatibilityLevel(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        return 'poor';
    }
    
    /**
     * Generate test summary
     */
    generateSummary() {
        const totalSoundFonts = this.results.soundfonts.length;
        const successfulLoads = this.results.soundfonts.filter(sf => !sf.error).length;
        
        let totalInstruments = 0;
        let totalSamples = 0;
        let totalSize = 0;
        let totalLoadTime = 0;
        
        const compatibilityLevels = {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0
        };
        
        for (const soundfont of this.results.soundfonts) {
            if (!soundfont.error) {
                totalInstruments += soundfont.instruments;
                totalSamples += soundfont.samples;
                totalSize += soundfont.size;
                totalLoadTime += soundfont.loadTime;
                
                if (soundfont.compatibility) {
                    compatibilityLevels[soundfont.compatibility.level]++;
                }
            }
        }
        
        const avgLoadTime = successfulLoads > 0 ? totalLoadTime / successfulLoads : 0;
        const avgSize = successfulLoads > 0 ? totalSize / successfulLoads : 0;
        
        return {
            totalSoundFonts,
            successfulLoads,
            failedLoads: totalSoundFonts - successfulLoads,
            totalInstruments,
            totalSamples,
            totalSize: totalSize,
            avgLoadTime,
            avgSize,
            compatibilityDistribution: compatibilityLevels,
            overallCompatibility: this.calculateOverallCompatibility(compatibilityLevels)
        };
    }
    
    /**
     * Calculate overall compatibility rating
     */
    calculateOverallCompatibility(levels) {
        const total = Object.values(levels).reduce((sum, count) => sum + count, 0);
        if (total === 0) return 'unknown';
        
        const score = (levels.excellent * 100 + levels.good * 75 + levels.fair * 50 + levels.poor * 25) / total;
        
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        return 'poor';
    }
    
    /**
     * Analyze compatibility patterns
     */
    analyzeCompatibility() {
        const analysis = {
            commonIssues: {},
            sizeImpact: {},
            knownSoundFontComparison: {}
        };
        
        // Analyze common test failures
        const testFailures = {};
        for (const soundfont of this.results.soundfonts) {
            if (soundfont.testResults) {
                for (const [test, status] of Object.entries(soundfont.testResults)) {
                    if (status === 'failed') {
                        testFailures[test] = (testFailures[test] || 0) + 1;
                    }
                }
            }
        }
        
        analysis.commonIssues = Object.entries(testFailures)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([test, count]) => ({ test, count }));
        
        // Analyze size impact on compatibility
        const sizeBuckets = {
            small: { threshold: 10 * 1024 * 1024, soundfonts: [], avgScore: 0 }, // < 10MB
            medium: { threshold: 50 * 1024 * 1024, soundfonts: [], avgScore: 0 }, // 10-50MB
            large: { threshold: Infinity, soundfonts: [], avgScore: 0 } // > 50MB
        };
        
        for (const soundfont of this.results.soundfonts) {
            if (!soundfont.error && soundfont.compatibility) {
                if (soundfont.size < sizeBuckets.small.threshold) {
                    sizeBuckets.small.soundfonts.push(soundfont);
                } else if (soundfont.size < sizeBuckets.medium.threshold) {
                    sizeBuckets.medium.soundfonts.push(soundfont);
                } else {
                    sizeBuckets.large.soundfonts.push(soundfont);
                }
            }
        }
        
        // Calculate average scores
        for (const [size, bucket] of Object.entries(sizeBuckets)) {
            if (bucket.soundfonts.length > 0) {
                bucket.avgScore = bucket.soundfonts.reduce((sum, sf) => sum + sf.compatibility.score, 0) / bucket.soundfonts.length;
            }
        }
        
        analysis.sizeImpact = sizeBuckets;
        
        // Compare with known SoundFonts
        for (const soundfont of this.results.soundfonts) {
            const knownInfo = this.knownSoundFonts[soundfont.name];
            if (knownInfo && !soundfont.error) {
                analysis.knownSoundFontComparison[soundfont.name] = {
                    expected: knownInfo.compatibility,
                    actual: soundfont.compatibility.level,
                    matches: knownInfo.compatibility === soundfont.compatibility.level,
                    instrumentsMatch: Math.abs(knownInfo.expectedInstruments - soundfont.instruments) <= 10,
                    samplesMatch: Math.abs(knownInfo.expectedSamples - soundfont.samples) <= 50
                };
            }
        }
        
        return analysis;
    }
    
    /**
     * Analyze performance patterns
     */
    analyzePerformance() {
        const loadTimes = [];
        const memoryEfficiencies = [];
        
        for (const soundfont of this.results.soundfonts) {
            if (!soundfont.error && soundfont.performance) {
                loadTimes.push(soundfont.performance.loadTimePerMB);
                memoryEfficiencies.push(soundfont.performance.memoryEfficiency);
            }
        }
        
        const avgLoadTimePerMB = loadTimes.length > 0 
            ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
            : 0;
        
        const avgMemoryEfficiency = memoryEfficiencies.length > 0
            ? memoryEfficiencies.reduce((sum, eff) => sum + eff, 0) / memoryEfficiencies.length
            : 0;
        
        return {
            avgLoadTimePerMB,
            avgMemoryEfficiency,
            loadTimeRange: {
                min: Math.min(...loadTimes),
                max: Math.max(...loadTimes)
            },
            performanceRating: this.calculatePerformanceRating(avgLoadTimePerMB)
        };
    }
    
    /**
     * Calculate performance rating
     */
    calculatePerformanceRating(loadTimePerMB) {
        if (loadTimePerMB < 100) return 'excellent';
        if (loadTimePerMB < 300) return 'good';
        if (loadTimePerMB < 1000) return 'fair';
        return 'poor';
    }
    
    /**
     * Print SoundFont summary
     */
    printSoundFontSummary(soundfont) {
        if (soundfont.error) {
            console.log(`  ❌ Error: ${soundfont.error}`);
            return;
        }
        
        const statusIcon = soundfont.compatibility.level === 'excellent' ? '✅' :
                          soundfont.compatibility.level === 'good' ? '👍' :
                          soundfont.compatibility.level === 'fair' ? '⚠️' : '❌';
        
        console.log(`  ${statusIcon} Compatibility: ${soundfont.compatibility.score}/100 (${soundfont.compatibility.level})`);
        console.log(`  📊 Instruments: ${soundfont.instruments}, Samples: ${soundfont.samples}`);
        console.log(`  💾 Size: ${this.formatBytes(soundfont.size)}, Load Time: ${soundfont.loadTime}ms`);
        
        if (soundfont.knownIssues.length > 0) {
            console.log(`  ⚠️ Known Issues: ${soundfont.knownIssues.join(', ')}`);
        }
    }
    
    /**
     * Print overall summary
     */
    printOverallSummary() {
        const summary = this.results.summary;
        
        console.log(`SoundFonts Tested: ${summary.totalSoundFonts}`);
        console.log(`Successful Loads: ${summary.successfulLoads}/${summary.totalSoundFonts}`);
        console.log(`Total Instruments: ${summary.totalInstruments}`);
        console.log(`Total Samples: ${summary.totalSamples}`);
        console.log(`Total Size: ${this.formatBytes(summary.totalSize)}`);
        console.log(`Average Load Time: ${summary.avgLoadTime.toFixed(0)}ms`);
        console.log(`Overall Compatibility: ${summary.overallCompatibility}`);
        
        console.log('\nCompatibility Distribution:');
        for (const [level, count] of Object.entries(summary.compatibilityDistribution)) {
            if (count > 0) {
                const icon = level === 'excellent' ? '✅' :
                            level === 'good' ? '👍' :
                            level === 'fair' ? '⚠️' : '❌';
                console.log(`  ${icon} ${level}: ${count}`);
            }
        }
        
        // Print common issues
        if (this.results.compatibility.commonIssues.length > 0) {
            console.log('\nMost Common Issues:');
            for (const issue of this.results.compatibility.commonIssues) {
                console.log(`  - ${issue.test}: ${issue.count} SoundFont(s)`);
            }
        }
        
        // Print performance rating
        console.log(`\nPerformance Rating: ${this.results.performance.performanceRating}`);
        console.log(`Average Load Time per MB: ${this.results.performance.avgLoadTimePerMB.toFixed(1)}ms/MB`);
    }
    
    /**
     * Save results to files
     */
    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save JSON results
        const jsonPath = path.join(this.options.outputDir, `soundfont-test-results-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
        
        // Generate and save report
        const report = this.generateDetailedReport();
        const reportPath = path.join(this.options.outputDir, `soundfont-test-report-${timestamp}.txt`);
        await fs.writeFile(reportPath, report);
        
        // Generate compatibility database
        const database = this.generateCompatibilityDatabase();
        const dbPath = path.join(this.options.outputDir, `soundfont-compatibility-db-${timestamp}.json`);
        await fs.writeFile(dbPath, JSON.stringify(database, null, 2));
        
        // Generate CSV summary
        const csv = this.generateCSVSummary();
        const csvPath = path.join(this.options.outputDir, `soundfont-summary-${timestamp}.csv`);
        await fs.writeFile(csvPath, csv);
        
        console.log(`\n📁 Results saved:`);
        console.log(`  JSON: ${jsonPath}`);
        console.log(`  Report: ${reportPath}`);
        console.log(`  Database: ${dbPath}`);
        console.log(`  CSV: ${csvPath}`);
    }
    
    /**
     * Generate detailed report
     */
    generateDetailedReport() {
        const summary = this.results.summary;
        let report = 'AWE PLAYER SOUNDFONT COMPATIBILITY TEST AUTOMATION REPORT\n';
        report += '='.repeat(70) + '\n\n';
        
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Test Suite: ${this.options.testSuite}\n`;
        report += `SoundFont Directory: ${this.options.soundfontDir}\n\n`;
        
        report += 'SUMMARY:\n';
        report += '-'.repeat(40) + '\n';
        report += `SoundFonts Tested: ${summary.totalSoundFonts}\n`;
        report += `Successful Loads: ${summary.successfulLoads}\n`;
        report += `Failed Loads: ${summary.failedLoads}\n`;
        report += `Total Instruments: ${summary.totalInstruments}\n`;
        report += `Total Samples: ${summary.totalSamples}\n`;
        report += `Total Size: ${this.formatBytes(summary.totalSize)}\n`;
        report += `Average Load Time: ${summary.avgLoadTime.toFixed(0)}ms\n`;
        report += `Overall Compatibility: ${summary.overallCompatibility}\n\n`;
        
        report += 'COMPATIBILITY DISTRIBUTION:\n';
        report += '-'.repeat(40) + '\n';
        for (const [level, count] of Object.entries(summary.compatibilityDistribution)) {
            report += `${level}: ${count}\n`;
        }
        report += '\n';
        
        report += 'SOUNDFONT DETAILS:\n';
        report += '-'.repeat(40) + '\n';
        
        for (const soundfont of this.results.soundfonts) {
            report += `SoundFont: ${soundfont.name}\n`;
            
            if (soundfont.error) {
                report += `  Status: FAILED\n`;
                report += `  Error: ${soundfont.error}\n`;
            } else {
                report += `  Size: ${this.formatBytes(soundfont.size)}\n`;
                report += `  Instruments: ${soundfont.instruments}\n`;
                report += `  Samples: ${soundfont.samples}\n`;
                report += `  Load Time: ${soundfont.loadTime}ms\n`;
                report += `  Compatibility: ${soundfont.compatibility.score}/100 (${soundfont.compatibility.level})\n`;
                
                if (soundfont.knownIssues.length > 0) {
                    report += `  Known Issues: ${soundfont.knownIssues.join(', ')}\n`;
                }
                
                // Failed tests
                const failedTests = Object.entries(soundfont.testResults)
                    .filter(([test, status]) => status === 'failed')
                    .map(([test]) => test);
                
                if (failedTests.length > 0) {
                    report += `  Failed Tests: ${failedTests.join(', ')}\n`;
                }
            }
            
            report += '\n';
        }
        
        // Common issues analysis
        if (this.results.compatibility.commonIssues.length > 0) {
            report += 'COMMON ISSUES:\n';
            report += '-'.repeat(40) + '\n';
            
            for (const issue of this.results.compatibility.commonIssues) {
                report += `${issue.test}: ${issue.count} SoundFont(s)\n`;
            }
            report += '\n';
        }
        
        // Performance analysis
        report += 'PERFORMANCE ANALYSIS:\n';
        report += '-'.repeat(40) + '\n';
        report += `Performance Rating: ${this.results.performance.performanceRating}\n`;
        report += `Average Load Time per MB: ${this.results.performance.avgLoadTimePerMB.toFixed(1)}ms/MB\n`;
        report += `Load Time Range: ${this.results.performance.loadTimeRange.min.toFixed(1)} - ${this.results.performance.loadTimeRange.max.toFixed(1)}ms/MB\n`;
        report += `Average Memory Efficiency: ${this.results.performance.avgMemoryEfficiency.toFixed(0)} bytes/sample\n\n`;
        
        // Recommendations
        report += 'RECOMMENDATIONS:\n';
        report += '-'.repeat(40) + '\n';
        report += this.generateRecommendations();
        
        return report;
    }
    
    /**
     * Generate compatibility database
     */
    generateCompatibilityDatabase() {
        const database = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            testSuite: this.options.testSuite,
            soundfonts: {}
        };
        
        for (const soundfont of this.results.soundfonts) {
            if (!soundfont.error) {
                database.soundfonts[soundfont.name] = {
                    size: soundfont.size,
                    instruments: soundfont.instruments,
                    samples: soundfont.samples,
                    loadTime: soundfont.loadTime,
                    compatibility: soundfont.compatibility,
                    knownIssues: soundfont.knownIssues,
                    performance: soundfont.performance,
                    testResults: soundfont.testResults,
                    tested: true,
                    testDate: soundfont.timestamp
                };
            }
        }
        
        return database;
    }
    
    /**
     * Generate CSV summary
     */
    generateCSVSummary() {
        const headers = [
            'SoundFont Name',
            'Size (MB)',
            'Instruments',
            'Samples',
            'Load Time (ms)',
            'Compatibility Score',
            'Compatibility Level',
            'Known Issues',
            'Performance Rating'
        ];
        
        const rows = this.results.soundfonts.map(sf => {
            if (sf.error) {
                return [sf.name, '', '', '', '', '', 'ERROR', sf.error, ''];
            }
            
            return [
                sf.name,
                (sf.size / (1024 * 1024)).toFixed(2),
                sf.instruments,
                sf.samples,
                sf.loadTime,
                sf.compatibility.score,
                sf.compatibility.level,
                sf.knownIssues.join('; '),
                this.calculatePerformanceRating(sf.performance.loadTimePerMB)
            ];
        });
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        return csvContent;
    }
    
    /**
     * Generate recommendations
     */
    generateRecommendations() {
        let recommendations = '';
        
        const summary = this.results.summary;
        
        if (summary.overallCompatibility === 'excellent') {
            recommendations += '✅ Excellent compatibility! Your SoundFont library is fully compatible with AWE Player.\n';
        } else if (summary.overallCompatibility === 'good') {
            recommendations += '👍 Good compatibility with minor issues.\n';
        } else {
            recommendations += '⚠️ Compatibility issues detected that may affect playback quality.\n';
        }
        
        // Common issues recommendations
        if (this.results.compatibility.commonIssues.length > 0) {
            recommendations += '\nCommon Issues Found:\n';
            
            for (const issue of this.results.compatibility.commonIssues) {
                switch (issue.test) {
                    case 'generator-ranges':
                        recommendations += '- Some generators exceed EMU8000 ranges - sounds may differ from original hardware\n';
                        break;
                    case 'sample-integrity':
                        recommendations += '- Sample integrity issues detected - some instruments may sound corrupted\n';
                        break;
                    case 'load-time':
                        recommendations += '- Slow loading detected - consider optimizing large SoundFonts\n';
                        break;
                    case 'memory-usage':
                        recommendations += '- High memory usage - monitor system resources during playback\n';
                        break;
                    default:
                        recommendations += `- ${issue.test} issues detected - check individual SoundFont details\n`;
                }
            }
        }
        
        // Performance recommendations
        if (this.results.performance.performanceRating === 'poor') {
            recommendations += '\nPerformance Recommendations:\n';
            recommendations += '- Consider using smaller SoundFonts for better loading performance\n';
            recommendations += '- Implement lazy loading for large SoundFont libraries\n';
            recommendations += '- Use SSD storage for faster file access\n';
        }
        
        // Size-based recommendations
        const largeFiles = this.results.soundfonts.filter(sf => 
            !sf.error && sf.size > 100 * 1024 * 1024 // > 100MB
        );
        
        if (largeFiles.length > 0) {
            recommendations += '\nLarge SoundFont Recommendations:\n';
            for (const sf of largeFiles) {
                recommendations += `- ${sf.name} (${this.formatBytes(sf.size)}): Consider streaming or compression\n`;
            }
        }
        
        return recommendations;
    }
    
    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
}

// CLI Command Setup
program
    .name('soundfont-test-automation')
    .description('AWE Player SoundFont Compatibility Test Automation')
    .version('1.0.0');

program
    .option('-s, --suite <suite>', 'Test suite to run (basic, comprehensive, full)', 'comprehensive')
    .option('-d, --soundfont-dir <dir>', 'Directory containing SoundFont files', './test-soundfonts')
    .option('-o, --output <dir>', 'Output directory for results', './soundfont-test-results')
    .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '120000')
    .option('--no-headless', 'Run browser in visible mode')
    .option('-v, --verbose', 'Verbose logging')
    .action(async (options) => {
        const automation = new SoundFontTestAutomation({
            testSuite: options.suite,
            soundfontDir: options.soundfontDir,
            outputDir: options.output,
            timeout: parseInt(options.timeout),
            headless: options.headless,
            verbose: options.verbose
        });
        
        try {
            const results = await automation.runTests();
            
            // Exit with error code if significant issues
            const compatibility = results.summary.overallCompatibility;
            const exitCode = (compatibility === 'excellent' || compatibility === 'good') ? 0 : 1;
            
            process.exit(exitCode);
            
        } catch (error) {
            console.error(`💥 SoundFont test automation failed: ${error.message}`);
            process.exit(1);
        }
    });

// Parse command line arguments
if (require.main === module) {
    program.parse();
}

module.exports = SoundFontTestAutomation;