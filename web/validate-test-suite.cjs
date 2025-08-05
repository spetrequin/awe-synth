/**
 * AWE Player - Test Suite Validation Script
 * 
 * Validates the integration test suite structure and configuration
 */

const fs = require('fs');
const path = require('path');

class TestSuiteValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }
    
    /**
     * Validate all test components
     */
    async validate() {
        console.log('🔍 Validating AWE Player Integration Test Suite...\n');
        
        this.validateTestFiles();
        this.validateConfiguration();
        this.validatePackageJson();
        this.validateTestContent();
        
        this.generateReport();
    }
    
    /**
     * Validate required test files exist
     */
    validateTestFiles() {
        const requiredFiles = [
            'test-comprehensive-integration.html',
            'test-automation.js',
            'test-runner-cli.js',
            'test-config.json',
            'test-package.json',
            'TEST_README.md'
        ];
        
        console.log('📁 Checking required test files...');
        
        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                this.info.push(`✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
            } else {
                this.errors.push(`❌ Missing required file: ${file}`);
            }
        }
        
        console.log();
    }
    
    /**
     * Validate test configuration
     */
    validateConfiguration() {
        console.log('⚙️ Validating test configuration...');
        
        try {
            const configPath = path.join(__dirname, 'test-config.json');
            if (!fs.existsSync(configPath)) {
                this.errors.push('❌ test-config.json not found');
                return;
            }
            
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Validate structure
            if (!config.testConfiguration) {
                this.errors.push('❌ Missing testConfiguration section');
            } else {
                this.info.push(`✅ Test configuration loaded`);
                
                // Validate test suites
                if (config.testConfiguration.testSuites) {
                    const suites = Object.keys(config.testConfiguration.testSuites);
                    this.info.push(`✅ Test suites defined: ${suites.join(', ')}`);
                    
                    // Count total tests
                    let totalTests = 0;
                    for (const suite of Object.values(config.testConfiguration.testSuites)) {
                        if (suite.tests) {
                            totalTests += suite.tests.length;
                        }
                    }
                    this.info.push(`✅ Total configured tests: ${totalTests}`);
                } else {
                    this.warnings.push('⚠️ No test suites defined');
                }
                
                // Validate expectations
                if (config.testConfiguration.expectations) {
                    this.info.push('✅ Performance expectations defined');
                } else {
                    this.warnings.push('⚠️ No performance expectations defined');
                }
            }
        } catch (error) {
            this.errors.push(`❌ Invalid test-config.json: ${error.message}`);
        }
        
        console.log();
    }
    
    /**
     * Validate package.json
     */
    validatePackageJson() {
        console.log('📦 Validating package configuration...');
        
        try {
            const packagePath = path.join(__dirname, 'test-package.json');
            if (!fs.existsSync(packagePath)) {
                this.errors.push('❌ test-package.json not found');
                return;
            }
            
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Validate scripts
            if (pkg.scripts) {
                const expectedScripts = ['test', 'test:critical', 'test:performance', 'test:ci'];
                for (const script of expectedScripts) {
                    if (pkg.scripts[script]) {
                        this.info.push(`✅ Script defined: ${script}`);
                    } else {
                        this.warnings.push(`⚠️ Missing script: ${script}`);
                    }
                }
            } else {
                this.errors.push('❌ No scripts defined in package.json');
            }
            
            // Validate dependencies
            if (pkg.devDependencies) {
                const requiredDeps = ['puppeteer', 'commander', 'chalk'];
                for (const dep of requiredDeps) {
                    if (pkg.devDependencies[dep]) {
                        this.info.push(`✅ Dependency: ${dep}@${pkg.devDependencies[dep]}`);
                    } else {
                        this.warnings.push(`⚠️ Missing dependency: ${dep}`);
                    }
                }
            } else {
                this.warnings.push('⚠️ No devDependencies defined');
            }
        } catch (error) {
            this.errors.push(`❌ Invalid test-package.json: ${error.message}`);
        }
        
        console.log();
    }
    
    /**
     * Validate test content structure
     */
    validateTestContent() {
        console.log('🧪 Validating test content...');
        
        // Check HTML test runner
        const htmlPath = path.join(__dirname, 'test-comprehensive-integration.html');
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Check for required elements
            const requiredIds = [
                'run-all-tests', 'run-critical-path', 'run-performance-tests',
                'test-summary', 'progress-fill', 'test-log'
            ];
            
            for (const id of requiredIds) {
                if (htmlContent.includes(`id="${id}"`)) {
                    this.info.push(`✅ HTML element: ${id}`);
                } else {
                    this.errors.push(`❌ Missing HTML element: ${id}`);
                }
            }
            
            // Check for test suites
            const testSuites = [
                'WASM Initialization', 'MIDI System', 'Audio Synthesis',
                'Send/Return Effects', 'UI Component', 'End-to-End Pipeline',
                'Performance & Stress'
            ];
            
            for (const suite of testSuites) {
                if (htmlContent.includes(suite)) {
                    this.info.push(`✅ Test suite: ${suite}`);
                } else {
                    this.warnings.push(`⚠️ Missing test suite: ${suite}`);
                }
            }
        }
        
        // Check automation script
        const automationPath = path.join(__dirname, 'test-automation.js');
        if (fs.existsSync(automationPath)) {
            const automationContent = fs.readFileSync(automationPath, 'utf8');
            
            if (automationContent.includes('class AWEPlayerTestRunner')) {
                this.info.push('✅ Test automation class defined');
            } else {
                this.errors.push('❌ Missing AWEPlayerTestRunner class');
            }
            
            if (automationContent.includes('getCoreWasmTests')) {
                this.info.push('✅ Core WASM tests defined');
            } else {
                this.warnings.push('⚠️ Missing core WASM tests');
            }
        }
        
        // Check CLI runner
        const cliPath = path.join(__dirname, 'test-runner-cli.js');
        if (fs.existsSync(cliPath)) {
            const cliContent = fs.readFileSync(cliPath, 'utf8');
            
            if (cliContent.includes('#!/usr/bin/env node')) {
                this.info.push('✅ CLI runner has proper shebang');
            } else {
                this.warnings.push('⚠️ CLI runner missing shebang');
            }
            
            if (cliContent.includes('puppeteer')) {
                this.info.push('✅ CLI runner uses Puppeteer');
            } else {
                this.errors.push('❌ CLI runner missing Puppeteer integration');
            }
        }
        
        console.log();
    }
    
    /**
     * Generate validation report
     */
    generateReport() {
        console.log('📊 Validation Report');
        console.log('═'.repeat(50));
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('🎉 All validations passed! Test suite is ready for use.\n');
        }
        
        if (this.info.length > 0) {
            console.log('✅ Successful Validations:');
            for (const info of this.info) {
                console.log(`   ${info}`);
            }
            console.log();
        }
        
        if (this.warnings.length > 0) {
            console.log('⚠️ Warnings:');
            for (const warning of this.warnings) {
                console.log(`   ${warning}`);
            }
            console.log();
        }
        
        if (this.errors.length > 0) {
            console.log('❌ Errors:');
            for (const error of this.errors) {
                console.log(`   ${error}`);
            }
            console.log();
            console.log('🔧 Please fix these errors before using the test suite.');
        }
        
        // Summary
        console.log('📈 Summary:');
        console.log(`   ✅ Passed: ${this.info.length}`);
        console.log(`   ⚠️ Warnings: ${this.warnings.length}`);
        console.log(`   ❌ Errors: ${this.errors.length}`);
        
        const success = this.errors.length === 0;
        console.log(`   🎯 Overall: ${success ? 'READY' : 'NEEDS FIXES'}`);
        
        return success;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new TestSuiteValidator();
    validator.validate().then(() => {
        process.exit(validator.errors.length === 0 ? 0 : 1);
    });
}

module.exports = TestSuiteValidator;