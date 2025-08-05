#!/usr/bin/env node

/**
 * AWE Player Build Validation Script
 * 
 * Validates build output for deployment readiness
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BuildValidator {
    constructor(buildDir) {
        this.buildDir = buildDir;
        this.errors = [];
        this.warnings = [];
        this.results = {
            files: {},
            sizes: {},
            checksums: {},
            validation: {}
        };
    }
    
    /**
     * Run complete build validation
     */
    async validate() {
        console.log('🔍 Validating AWE Player build...');
        console.log(`📁 Build directory: ${this.buildDir}`);
        
        // Check required files
        await this.checkRequiredFiles();
        
        // Validate file contents
        await this.validateFileContents();
        
        // Check file sizes
        await this.checkFileSizes();
        
        // Validate WASM module
        await this.validateWasm();
        
        // Check HTML structure
        await this.validateHtml();
        
        // Validate JavaScript
        await this.validateJavaScript();
        
        // Check security headers
        await this.checkSecurityReadiness();
        
        // Generate report
        this.generateReport();
        
        // Exit with appropriate code
        const hasErrors = this.errors.length > 0;
        process.exit(hasErrors ? 1 : 0);
    }
    
    /**
     * Check for required files
     */
    async checkRequiredFiles() {
        const requiredFiles = [
            'index.html',
            'awe_synth.js',
            'awe_synth_bg.wasm',
            'version.json',
            'deployment.json'
        ];
        
        console.log('📋 Checking required files...');
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.buildDir, file);
            
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                this.results.files[file] = {
                    exists: true,
                    size: stats.size,
                    modified: stats.mtime
                };
                console.log(`  ✅ ${file} (${this.formatBytes(stats.size)})`);
            } else {
                this.errors.push(`Missing required file: ${file}`);
                console.log(`  ❌ ${file} - MISSING`);
            }
        }
    }
    
    /**
     * Validate file contents
     */
    async validateFileContents() {
        console.log('🔍 Validating file contents...');
        
        // Check version.json
        await this.validateVersionFile();
        
        // Check deployment.json
        await this.validateDeploymentFile();
        
        // Validate package integrity
        await this.validatePackageIntegrity();
    }
    
    /**
     * Validate version file
     */
    async validateVersionFile() {
        const versionPath = path.join(this.buildDir, 'version.json');
        
        if (!fs.existsSync(versionPath)) {
            return;
        }
        
        try {
            const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
            const requiredFields = ['version', 'commit', 'buildDate', 'target'];
            
            for (const field of requiredFields) {
                if (!versionData[field]) {
                    this.errors.push(`Missing field in version.json: ${field}`);
                }
            }
            
            this.results.validation.version = versionData;
            console.log(`  ✅ version.json - Version: ${versionData.version}`);
            
        } catch (error) {
            this.errors.push(`Invalid version.json: ${error.message}`);
        }
    }
    
    /**
     * Validate deployment file
     */
    async validateDeploymentFile() {
        const deploymentPath = path.join(this.buildDir, 'deployment.json');
        
        if (!fs.existsSync(deploymentPath)) {
            return;
        }
        
        try {
            const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
            const requiredFields = ['target', 'url', 'optimization', 'features'];
            
            for (const field of requiredFields) {
                if (!deploymentData[field]) {
                    this.errors.push(`Missing field in deployment.json: ${field}`);
                }
            }
            
            this.results.validation.deployment = deploymentData;
            console.log(`  ✅ deployment.json - Target: ${deploymentData.target}`);
            
        } catch (error) {
            this.errors.push(`Invalid deployment.json: ${error.message}`);
        }
    }
    
    /**
     * Validate package integrity
     */
    async validatePackageIntegrity() {
        const files = ['awe_synth.js', 'awe_synth_bg.wasm'];
        
        for (const file of files) {
            const filePath = path.join(this.buildDir, file);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath);
                const checksum = crypto.createHash('sha256').update(content).digest('hex');
                this.results.checksums[file] = checksum;
                console.log(`  🔐 ${file} - SHA256: ${checksum.substring(0, 16)}...`);
            }
        }
    }
    
    /**
     * Check file sizes
     */
    async checkFileSizes() {
        console.log('📏 Checking file sizes...');
        
        const sizeThresholds = {
            'awe_synth_bg.wasm': { max: 5 * 1024 * 1024, warn: 2 * 1024 * 1024 }, // 5MB max, 2MB warn
            'awe_synth.js': { max: 1 * 1024 * 1024, warn: 500 * 1024 }, // 1MB max, 500KB warn
            'index.html': { max: 200 * 1024, warn: 100 * 1024 } // 200KB max, 100KB warn
        };
        
        for (const [file, thresholds] of Object.entries(sizeThresholds)) {
            const filePath = path.join(this.buildDir, file);
            
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const size = stats.size;
                
                this.results.sizes[file] = size;
                
                if (size > thresholds.max) {
                    this.errors.push(`File too large: ${file} (${this.formatBytes(size)} > ${this.formatBytes(thresholds.max)})`);
                } else if (size > thresholds.warn) {
                    this.warnings.push(`Large file: ${file} (${this.formatBytes(size)} > ${this.formatBytes(thresholds.warn)})`);
                    console.log(`  ⚠️ ${file} - ${this.formatBytes(size)} (large)`);
                } else {
                    console.log(`  ✅ ${file} - ${this.formatBytes(size)}`);
                }
            }
        }
    }
    
    /**
     * Validate WASM module
     */
    async validateWasm() {
        console.log('⚙️ Validating WASM module...');
        
        const wasmPath = path.join(this.buildDir, 'awe_synth_bg.wasm');
        
        if (!fs.existsSync(wasmPath)) {
            return;
        }
        
        try {
            const wasmBuffer = fs.readFileSync(wasmPath);
            
            // Check WASM magic number
            const magic = wasmBuffer.slice(0, 4);
            const expectedMagic = Buffer.from([0x00, 0x61, 0x73, 0x6d]);
            
            if (!magic.equals(expectedMagic)) {
                this.errors.push('Invalid WASM magic number');
                return;
            }
            
            // Check WASM version
            const version = wasmBuffer.slice(4, 8);
            const expectedVersion = Buffer.from([0x01, 0x00, 0x00, 0x00]);
            
            if (!version.equals(expectedVersion)) {
                this.warnings.push('Unexpected WASM version');
            }
            
            console.log(`  ✅ WASM module valid (${this.formatBytes(wasmBuffer.length)})`);
            
        } catch (error) {
            this.errors.push(`WASM validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate HTML structure
     */
    async validateHtml() {
        console.log('📄 Validating HTML structure...');
        
        const htmlPath = path.join(this.buildDir, 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            return;
        }
        
        try {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Check for required elements
            const requiredElements = [
                '<html',
                '<head>',
                '<body>',
                'awe_synth.js',
                'canvas',
                'audio'
            ];
            
            for (const element of requiredElements) {
                if (!htmlContent.includes(element)) {
                    this.warnings.push(`HTML missing recommended element: ${element}`);
                }
            }
            
            // Check for security headers in meta tags
            const securityMeta = [
                'Content-Security-Policy',
                'X-Content-Type-Options'
            ];
            
            for (const meta of securityMeta) {
                if (!htmlContent.includes(meta)) {
                    this.warnings.push(`HTML missing security meta: ${meta}`);
                }
            }
            
            console.log('  ✅ HTML structure valid');
            
        } catch (error) {
            this.errors.push(`HTML validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate JavaScript
     */
    async validateJavaScript() {
        console.log('📜 Validating JavaScript...');
        
        const jsPath = path.join(this.buildDir, 'awe_synth.js');
        
        if (!fs.existsSync(jsPath)) {
            return;
        }
        
        try {
            const jsContent = fs.readFileSync(jsPath, 'utf8');
            
            // Check for WASM initialization
            if (!jsContent.includes('WebAssembly')) {
                this.errors.push('JavaScript missing WebAssembly initialization');
            }
            
            // Check for required exports
            const requiredExports = [
                'init',
                'AWEPlayer'
            ];
            
            for (const exportName of requiredExports) {
                if (!jsContent.includes(exportName)) {
                    this.warnings.push(`JavaScript missing export: ${exportName}`);
                }
            }
            
            console.log('  ✅ JavaScript structure valid');
            
        } catch (error) {
            this.errors.push(`JavaScript validation failed: ${error.message}`);
        }
    }
    
    /**
     * Check security readiness
     */
    async checkSecurityReadiness() {
        console.log('🔒 Checking security readiness...');
        
        // Check for development artifacts
        const devArtifacts = [
            'console.log',
            'debugger',
            'TODO',
            'FIXME',
            '.map'
        ];
        
        const jsFiles = fs.readdirSync(this.buildDir).filter(f => f.endsWith('.js'));
        
        for (const jsFile of jsFiles) {
            const content = fs.readFileSync(path.join(this.buildDir, jsFile), 'utf8');
            
            for (const artifact of devArtifacts) {
                if (content.includes(artifact)) {
                    this.warnings.push(`Development artifact found in ${jsFile}: ${artifact}`);
                }
            }
        }
        
        console.log('  ✅ Security check complete');
    }
    
    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\n📊 Build Validation Report');
        console.log('='.repeat(50));
        
        const totalFiles = Object.keys(this.results.files).length;
        const validFiles = Object.values(this.results.files).filter(f => f.exists).length;
        
        console.log(`Files: ${validFiles}/${totalFiles} valid`);
        console.log(`Errors: ${this.errors.length}`);
        console.log(`Warnings: ${this.warnings.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (this.errors.length === 0) {
            console.log('\n✅ Build validation passed!');
            console.log('🚀 Ready for deployment');
        } else {
            console.log('\n❌ Build validation failed!');
            console.log('🔧 Fix errors before deployment');
        }
        
        // Save report to file
        const reportPath = path.join(this.buildDir, 'validation-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            status: this.errors.length === 0 ? 'passed' : 'failed',
            errors: this.errors,
            warnings: this.warnings,
            results: this.results
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report saved: ${reportPath}`);
    }
    
    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Run validation if called directly
if (require.main === module) {
    const buildDir = process.argv[2] || './dist';
    const validator = new BuildValidator(buildDir);
    validator.validate().catch(console.error);
}

module.exports = BuildValidator;