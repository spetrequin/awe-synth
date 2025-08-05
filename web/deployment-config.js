/**
 * AWE Player - Production Deployment Configuration (Task 18.6)
 * 
 * Comprehensive deployment configuration for production environments
 */

class AWEPlayerDeployment {
    constructor() {
        this.deploymentTargets = {
            'development': {
                name: 'Development',
                url: 'http://localhost:3000',
                wasmOptimization: 'debug',
                compression: false,
                minification: false,
                sourceMaps: true,
                analytics: false,
                errorReporting: 'console',
                features: {
                    debugTools: true,
                    testSuites: true,
                    profiling: true,
                    verboseLogging: true
                }
            },
            'staging': {
                name: 'Staging',
                url: 'https://staging.aweplayer.com',
                wasmOptimization: 'size',
                compression: true,
                minification: true,
                sourceMaps: true,
                analytics: false,
                errorReporting: 'sentry',
                features: {
                    debugTools: true,
                    testSuites: true,
                    profiling: false,
                    verboseLogging: false
                }
            },
            'production': {
                name: 'Production',
                url: 'https://aweplayer.com',
                wasmOptimization: 'speed',
                compression: true,
                minification: true,
                sourceMaps: false,
                analytics: true,
                errorReporting: 'sentry',
                features: {
                    debugTools: false,
                    testSuites: false,
                    profiling: false,
                    verboseLogging: false
                }
            },
            'cdn': {
                name: 'CDN Distribution',
                url: 'https://cdn.aweplayer.com',
                wasmOptimization: 'size',
                compression: true,
                minification: true,
                sourceMaps: false,
                analytics: false,
                errorReporting: 'none',
                features: {
                    debugTools: false,
                    testSuites: false,
                    profiling: false,
                    verboseLogging: false
                }
            }
        };
        
        this.buildConfiguration = {
            wasm: {
                optimization: {
                    debug: {
                        flags: ['--debug', '--source-map'],
                        optimizationLevel: 0,
                        debugInfo: true
                    },
                    size: {
                        flags: ['--opt-level', '3', '--shrink-level', '2'],
                        optimizationLevel: 3,
                        debugInfo: false
                    },
                    speed: {
                        flags: ['--opt-level', '3', '--enable-simd'],
                        optimizationLevel: 3,
                        debugInfo: false
                    }
                },
                features: [
                    'bulk-memory',
                    'mutable-globals', 
                    'reference-types',
                    'simd',
                    'threads'
                ]
            },
            javascript: {
                bundling: {
                    tool: 'webpack',
                    entryPoints: ['./src/index.js'],
                    outputFormat: 'esm',
                    splitting: true,
                    treeshaking: true
                },
                minification: {
                    tool: 'terser',
                    options: {
                        compress: {
                            drop_console: true,
                            drop_debugger: true,
                            pure_funcs: ['console.log']
                        },
                        mangle: {
                            safari10: true
                        }
                    }
                }
            },
            assets: {
                compression: {
                    gzip: true,
                    brotli: true,
                    levels: {
                        gzip: 9,
                        brotli: 11
                    }
                },
                optimization: {
                    images: {
                        formats: ['webp', 'avif', 'png'],
                        quality: 85
                    },
                    fonts: {
                        subsetting: true,
                        formats: ['woff2', 'woff']
                    }
                }
            }
        };
        
        this.serverConfiguration = {
            headers: {
                security: {
                    'Cross-Origin-Embedder-Policy': 'require-corp',
                    'Cross-Origin-Opener-Policy': 'same-origin',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block',
                    'Referrer-Policy': 'strict-origin-when-cross-origin',
                    'Content-Security-Policy': this.generateCSP()
                },
                caching: {
                    '.wasm': 'public, max-age=31536000, immutable',
                    '.js': 'public, max-age=31536000, immutable',
                    '.css': 'public, max-age=31536000, immutable',
                    '.html': 'public, max-age=3600',
                    '.sf2': 'public, max-age=86400'
                },
                compression: {
                    'Content-Encoding': 'br, gzip'
                }
            },
            mimeTypes: {
                '.wasm': 'application/wasm',
                '.sf2': 'audio/soundfont',
                '.mid': 'audio/midi',
                '.midi': 'audio/midi'
            }
        };
        
        this.monitoring = {
            performance: {
                vitals: ['LCP', 'INP', 'CLS', 'TTFB', 'FCP'],
                thresholds: {
                    LCP: 2500,      // Largest Contentful Paint
                    INP: 200,       // Interaction to Next Paint
                    CLS: 0.1,       // Cumulative Layout Shift
                    TTFB: 800,      // Time to First Byte
                    FCP: 1800       // First Contentful Paint
                }
            },
            audio: {
                metrics: ['latency', 'dropouts', 'glitches', 'memory'],
                targets: {
                    latency: 23,        // Target audio latency in ms
                    dropouts: 0,        // Zero audio dropouts
                    glitches: 0,        // Zero audio glitches
                    memory: 512         // Max memory usage in MB
                }
            },
            errors: {
                tracking: true,
                sampling: 1.0,
                filters: ['network', 'permission', 'audio']
            }
        };
    }
    
    /**
     * Generate Content Security Policy
     */
    generateCSP() {
        const directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // WASM requires unsafe-eval
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "font-src 'self'",
            "connect-src 'self' https:",
            "worker-src 'self' blob:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ];
        
        return directives.join('; ');
    }
    
    /**
     * Get deployment configuration for target environment
     */
    getConfig(target = 'production') {
        const config = this.deploymentTargets[target];
        if (!config) {
            throw new Error(`Unknown deployment target: ${target}`);
        }
        
        return {
            ...config,
            build: this.getBuildConfig(config),
            server: this.getServerConfig(config),
            monitoring: this.getMonitoringConfig(config)
        };
    }
    
    /**
     * Get build configuration for target
     */
    getBuildConfig(targetConfig) {
        const { wasmOptimization, minification, compression, sourceMaps } = targetConfig;
        
        return {
            wasm: {
                ...this.buildConfiguration.wasm.optimization[wasmOptimization],
                features: this.buildConfiguration.wasm.features
            },
            javascript: {
                ...this.buildConfiguration.javascript,
                minification: minification ? this.buildConfiguration.javascript.minification : null
            },
            assets: {
                ...this.buildConfiguration.assets,
                compression: compression ? this.buildConfiguration.assets.compression : null
            },
            sourceMaps
        };
    }
    
    /**
     * Get server configuration for target
     */
    getServerConfig(targetConfig) {
        return {
            ...this.serverConfiguration,
            baseUrl: targetConfig.url
        };
    }
    
    /**
     * Get monitoring configuration for target
     */
    getMonitoringConfig(targetConfig) {
        const config = { ...this.monitoring };
        
        if (!targetConfig.analytics) {
            config.performance.vitals = [];
        }
        
        if (targetConfig.errorReporting === 'none') {
            config.errors.tracking = false;
        } else if (targetConfig.errorReporting === 'console') {
            config.errors.sampling = 0; // No external reporting
        }
        
        return config;
    }
    
    /**
     * Generate build script for target
     */
    generateBuildScript(target = 'production') {
        const config = this.getConfig(target);
        const wasmFlags = config.build.wasm.flags.join(' ');
        
        return `#!/bin/bash
# AWE Player Build Script for ${config.name}
# Generated automatically - do not edit manually

set -e

echo "🚀 Building AWE Player for ${config.name}..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf pkg/ dist/

# Build WASM module
echo "⚙️ Building WASM module..."
wasm-pack build \\
    --target web \\
    --out-dir pkg \\
    ${wasmFlags} \\
    --scope aweplayer

# Copy web assets
echo "📁 Copying web assets..."
mkdir -p dist/
cp -r web/* dist/

# Copy WASM build output
echo "📦 Copying WASM build..."
cp pkg/awe_synth.js dist/
cp pkg/awe_synth_bg.wasm dist/
cp pkg/awe_synth.d.ts dist/

${config.build.javascript.minification ? `
# Minify JavaScript
echo "🗜️ Minifying JavaScript..."
npx terser dist/*.js --compress --mangle -o dist/awe-player.min.js
` : ''}

${config.build.assets.compression ? `
# Compress assets
echo "📦 Compressing assets..."
find dist/ -type f \\( -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" \\) -exec gzip -9 -k {} \\;
find dist/ -type f \\( -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" \\) -exec brotli -q 11 -k {} \\;
` : ''}

# Generate version info
echo "📝 Generating version info..."
cat > dist/version.json << EOF
{
  "version": "$(git describe --tags --always)",
  "commit": "$(git rev-parse HEAD)",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "${target}",
  "features": $(echo '${JSON.stringify(config.features)}')
}
EOF

# Generate deployment manifest
echo "📋 Generating deployment manifest..."
cat > dist/deployment.json << EOF
{
  "target": "${target}",
  "url": "${config.url}",
  "optimization": "${config.wasmOptimization}",
  "features": $(echo '${JSON.stringify(config.features)}'),
  "files": [
    $(find dist/ -type f -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" | sed 's/dist\\///' | sed 's/.*/"&"/' | paste -sd, -)
  ]
}
EOF

echo "✅ Build complete for ${config.name}!"
echo "📁 Output directory: dist/"
echo "🌐 Target URL: ${config.url}"

# Run post-build validation
echo "🔍 Running post-build validation..."
node validate-build.js dist/

echo "🎉 Deployment ready!"
`;
    }
    
    /**
     * Generate Docker configuration
     */
    generateDockerfile(target = 'production') {
        const config = this.getConfig(target);
        
        return `# AWE Player Docker Configuration for ${config.name}
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \\
    curl \\
    git \\
    build-base \\
    python3

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:\${PATH}"

# Install wasm-pack
RUN cargo install wasm-pack

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Build the application
RUN chmod +x build-${target}.sh && ./build-${target}.sh

# Production stage
FROM nginx:alpine

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;
    }
    
    /**
     * Generate nginx configuration
     */
    generateNginxConfig(target = 'production') {
        const config = this.getConfig(target);
        
        return `# AWE Player Nginx Configuration for ${config.name}
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Custom MIME types
    location ~* \\.wasm$ {
        add_header Content-Type application/wasm;
    }
    
    location ~* \\.sf2$ {
        add_header Content-Type audio/soundfont;
    }
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/wasm;
    
    # Brotli compression (if module available)
    brotli on;
    brotli_comp_level 6;
    brotli_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/wasm;
    
    server {
        listen 80;
        server_name ${config.url.replace('https://', '').replace('http://', '')};
        root /usr/share/nginx/html;
        index index.html;
        
        # Security headers
        ${Object.entries(config.server.headers.security).map(([key, value]) => 
            `add_header ${key} "${value}";`
        ).join('\n        ')}
        
        # Cache headers
        location ~* \\.(wasm|js|css)$ {
            ${config.server.headers.caching['.wasm'] ? 
                `add_header Cache-Control "${config.server.headers.caching['.wasm']}";` : ''
            }
        }
        
        location ~* \\.html$ {
            ${config.server.headers.caching['.html'] ? 
                `add_header Cache-Control "${config.server.headers.caching['.html']}";` : ''
            }
        }
        
        location ~* \\.sf2$ {
            ${config.server.headers.caching['.sf2'] ? 
                `add_header Cache-Control "${config.server.headers.caching['.sf2']}";` : ''
            }
        }
        
        # Enable SharedArrayBuffer (required for WASM threads)
        location / {
            add_header Cross-Origin-Embedder-Policy "require-corp";
            add_header Cross-Origin-Opener-Policy "same-origin";
            try_files $uri $uri/ /index.html;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
        
        # API endpoints (if needed)
        location /api/ {
            # Proxy to backend API if needed
            # proxy_pass http://backend:8080;
            return 404;
        }
        
        # Error pages
        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
        
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
`;
    }
    
    /**
     * Generate GitHub Actions workflow
     */
    generateGitHubActions() {
        return `name: AWE Player CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  release:
    types: [ published ]

env:
  CARGO_TERM_COLOR: always

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        target: wasm32-unknown-unknown
        override: true
        components: rustfmt, clippy
    
    - name: Install wasm-pack
      run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    
    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: web/package-lock.json
    
    - name: Install dependencies
      run: cd web && npm ci
    
    - name: Rust format check
      run: cargo fmt -- --check
    
    - name: Rust clippy
      run: cargo clippy -- -D warnings
    
    - name: Rust tests
      run: cargo test
    
    - name: Build WASM (debug)
      run: wasm-pack build --target web --dev
    
    - name: JavaScript tests
      run: cd web && npm test
    
    - name: Integration tests
      run: cd web && npm run test:integration
    
    - name: Browser compatibility tests
      run: cd web && npm run test:browser
    
    - name: MIDI device tests
      run: cd web && npm run test:midi
    
    - name: SoundFont compatibility tests
      run: cd web && npm run test:soundfont

  build-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        target: wasm32-unknown-unknown
        override: true
    
    - name: Install wasm-pack
      run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    
    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Build for staging
      run: chmod +x build-staging.sh && ./build-staging.sh
    
    - name: Upload staging artifacts
      uses: actions/upload-artifact@v3
      with:
        name: staging-build
        path: dist/
    
    - name: Deploy to staging
      if: success()
      run: |
        # Deploy to staging environment
        echo "Deploying to staging..."
        # Add actual deployment commands here

  build-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        target: wasm32-unknown-unknown
        override: true
    
    - name: Install wasm-pack
      run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    
    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Build for production
      run: chmod +x build-production.sh && ./build-production.sh
    
    - name: Upload production artifacts
      uses: actions/upload-artifact@v3
      with:
        name: production-build
        path: dist/
    
    - name: Build Docker image
      run: |
        docker build -t aweplayer/awe-player:${{ github.event.release.tag_name }} -f Dockerfile.production .
        docker tag aweplayer/awe-player:${{ github.event.release.tag_name }} aweplayer/awe-player:latest
    
    - name: Deploy to production
      if: success()
      run: |
        # Deploy to production environment
        echo "Deploying to production..."
        # Add actual deployment commands here
    
    - name: Create GitHub release assets
      uses: softprops/action-gh-release@v1
      with:
        files: |
          dist/awe-player.min.js
          dist/awe_synth_bg.wasm
          dist/deployment.json
        draft: false
        prerelease: false

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  performance-audit:
    needs: build-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/download-artifact@v3
      with:
        name: staging-build
        path: dist/
    
    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Lighthouse CI
      run: npm install -g @lhci/cli
    
    - name: Run Lighthouse audit
      run: |
        npx serve dist/ &
        sleep 5
        lhci autorun --collect.url=http://localhost:3000
    
    - name: Upload Lighthouse results
      uses: actions/upload-artifact@v3
      with:
        name: lighthouse-results
        path: .lighthouseci/
`;
    }
    
    /**
     * Generate build validation script
     */
    generateBuildValidator() {
        return `#!/usr/bin/env node

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
        console.log(\`📁 Build directory: \${this.buildDir}\`);
        
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
                console.log(\`  ✅ \${file} (\${this.formatBytes(stats.size)})\`);
            } else {
                this.errors.push(\`Missing required file: \${file}\`);
                console.log(\`  ❌ \${file} - MISSING\`);
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
                    this.errors.push(\`Missing field in version.json: \${field}\`);
                }
            }
            
            this.results.validation.version = versionData;
            console.log(\`  ✅ version.json - Version: \${versionData.version}\`);
            
        } catch (error) {
            this.errors.push(\`Invalid version.json: \${error.message}\`);
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
                    this.errors.push(\`Missing field in deployment.json: \${field}\`);
                }
            }
            
            this.results.validation.deployment = deploymentData;
            console.log(\`  ✅ deployment.json - Target: \${deploymentData.target}\`);
            
        } catch (error) {
            this.errors.push(\`Invalid deployment.json: \${error.message}\`);
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
                console.log(\`  🔐 \${file} - SHA256: \${checksum.substring(0, 16)}...\`);
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
                    this.errors.push(\`File too large: \${file} (\${this.formatBytes(size)} > \${this.formatBytes(thresholds.max)})\`);
                } else if (size > thresholds.warn) {
                    this.warnings.push(\`Large file: \${file} (\${this.formatBytes(size)} > \${this.formatBytes(thresholds.warn)})\`);
                    console.log(\`  ⚠️ \${file} - \${this.formatBytes(size)} (large)\`);
                } else {
                    console.log(\`  ✅ \${file} - \${this.formatBytes(size)}\`);
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
            
            console.log(\`  ✅ WASM module valid (\${this.formatBytes(wasmBuffer.length)})\`);
            
        } catch (error) {
            this.errors.push(\`WASM validation failed: \${error.message}\`);
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
                    this.warnings.push(\`HTML missing recommended element: \${element}\`);
                }
            }
            
            // Check for security headers in meta tags
            const securityMeta = [
                'Content-Security-Policy',
                'X-Content-Type-Options'
            ];
            
            for (const meta of securityMeta) {
                if (!htmlContent.includes(meta)) {
                    this.warnings.push(\`HTML missing security meta: \${meta}\`);
                }
            }
            
            console.log('  ✅ HTML structure valid');
            
        } catch (error) {
            this.errors.push(\`HTML validation failed: \${error.message}\`);
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
                    this.warnings.push(\`JavaScript missing export: \${exportName}\`);
                }
            }
            
            console.log('  ✅ JavaScript structure valid');
            
        } catch (error) {
            this.errors.push(\`JavaScript validation failed: \${error.message}\`);
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
                    this.warnings.push(\`Development artifact found in \${jsFile}: \${artifact}\`);
                }
            }
        }
        
        console.log('  ✅ Security check complete');
    }
    
    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\\n📊 Build Validation Report');
        console.log('='.repeat(50));
        
        const totalFiles = Object.keys(this.results.files).length;
        const validFiles = Object.values(this.results.files).filter(f => f.exists).length;
        
        console.log(\`Files: \${validFiles}/\${totalFiles} valid\`);
        console.log(\`Errors: \${this.errors.length}\`);
        console.log(\`Warnings: \${this.warnings.length}\`);
        
        if (this.errors.length > 0) {
            console.log('\\n❌ Errors:');
            this.errors.forEach(error => console.log(\`  - \${error}\`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\\n⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(\`  - \${warning}\`));
        }
        
        if (this.errors.length === 0) {
            console.log('\\n✅ Build validation passed!');
            console.log('🚀 Ready for deployment');
        } else {
            console.log('\\n❌ Build validation failed!');
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
        console.log(\`\\n📄 Report saved: \${reportPath}\`);
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
`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AWEPlayerDeployment;
}