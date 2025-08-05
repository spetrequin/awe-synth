# AWE Player Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the AWE Player EMU8000 emulator to various production environments, including configuration, optimization, and monitoring.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust toolchain with wasm32-unknown-unknown target
- wasm-pack
- Docker (optional)
- Git

### Basic Deployment
```bash
# Clone repository
git clone https://github.com/spetrequin/awe-synth.git
cd awe-synth

# Build for production
chmod +x build-production.sh
./build-production.sh

# Serve locally for testing
npx serve dist/ -p 3000
```

## 🏗️ Build Configurations

### Production Build
```bash
# Optimized for performance and size
./build-production.sh

# Features:
# - Maximum WASM optimization (--opt-level 3 --enable-simd)
# - JavaScript minification
# - Asset compression (gzip + brotli)
# - No debug tools
# - Source maps disabled
```

### Staging Build
```bash
# Balanced optimization with debug capabilities
./build-staging.sh

# Features:
# - Size optimization (--opt-level 3 --shrink-level 2)
# - JavaScript minification
# - Asset compression
# - Debug tools enabled
# - Source maps included
```

### Development Build
```bash
# Debug-friendly build
wasm-pack build --target web --dev

# Features:
# - Debug symbols included
# - No optimization
# - Source maps enabled
# - All debug tools available
```

## 🌐 Deployment Targets

### Static Hosting (Recommended)

#### Netlify
```bash
# Build command
./build-production.sh

# Publish directory
dist/

# Headers file (_headers)
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
```

#### Vercel
```json
// vercel.json
{
  "builds": [
    {
      "src": "build-production.sh",
      "use": "@vercel/static-build"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Opener-Policy", 
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

#### GitHub Pages
```bash
# Deploy to gh-pages branch
npm run deploy:github

# GitHub Actions will handle the build and deployment
```

### Docker Deployment

#### Build Docker Image
```bash
# Build production image
docker build -t aweplayer/awe-player:latest -f Dockerfile.production .

# Run container
docker run -p 80:80 aweplayer/awe-player:latest
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  awe-player:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "80:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: awe-player
spec:
  replicas: 3
  selector:
    matchLabels:
      app: awe-player
  template:
    metadata:
      labels:
        app: awe-player
    spec:
      containers:
      - name: awe-player
        image: aweplayer/awe-player:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: awe-player-service
spec:
  selector:
    app: awe-player
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## ⚙️ Server Configuration

### Nginx Configuration
```nginx
# nginx.conf - Complete configuration in nginx.conf file

# Key requirements:
# - Enable COOP/COEP headers for SharedArrayBuffer
# - Set correct MIME types for .wasm and .sf2 files
# - Enable compression (gzip/brotli)
# - Configure caching headers
# - Security headers
```

### Apache Configuration  
```apache
# .htaccess
Header always set Cross-Origin-Embedder-Policy "require-corp"
Header always set Cross-Origin-Opener-Policy "same-origin"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"

# MIME types
AddType application/wasm .wasm
AddType audio/soundfont .sf2

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain text/css text/xml text/javascript application/javascript application/json application/wasm
</IfModule>

# Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/wasm "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>
```

## 🔧 Environment Configuration

### Environment Variables
```bash
# Production
NODE_ENV=production
AWE_PLAYER_TARGET=production
AWE_PLAYER_DEBUG=false
AWE_PLAYER_ANALYTICS=true

# Staging
NODE_ENV=staging
AWE_PLAYER_TARGET=staging
AWE_PLAYER_DEBUG=true
AWE_PLAYER_ANALYTICS=false

# Development
NODE_ENV=development
AWE_PLAYER_TARGET=development
AWE_PLAYER_DEBUG=true
AWE_PLAYER_ANALYTICS=false
```

### Configuration Files
```javascript
// deployment-config.js provides configuration for:
const deployment = new AWEPlayerDeployment();

// Get configuration for target environment
const config = deployment.getConfig('production');

// Generate build scripts
const buildScript = deployment.generateBuildScript('production');

// Generate Docker configuration
const dockerfile = deployment.generateDockerfile('production');

// Generate Nginx configuration
const nginxConfig = deployment.generateNginxConfig('production');
```

## 🔍 Build Validation

### Automated Validation
```bash
# Run build validation
node validate-build.js dist/

# Checks:
# - Required files present
# - File sizes within limits
# - WASM module validity
# - HTML structure
# - JavaScript integrity
# - Security readiness
```

### Manual Validation Checklist
- [ ] All required files present (index.html, .wasm, .js)
- [ ] WASM module loads without errors
- [ ] Audio context initializes correctly
- [ ] WebMIDI API access works (if available)
- [ ] File sizes optimized for production
- [ ] No development artifacts in build
- [ ] Security headers configured
- [ ] Compression enabled
- [ ] Caching headers set

## 📊 Performance Optimization

### WASM Optimization
```bash
# Size optimization
wasm-pack build --opt-level 3 --shrink-level 2

# Speed optimization  
wasm-pack build --opt-level 3 --enable-simd

# Debug optimization
wasm-pack build --debug --source-map
```

### Asset Optimization
```bash
# JavaScript minification
npx terser dist/*.js --compress --mangle -o dist/awe-player.min.js

# Asset compression
find dist/ -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.html" \) -exec gzip -9 -k {} \;
find dist/ -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.html" \) -exec brotli -q 11 -k {} \;
```

### CDN Configuration
```javascript
// CDN-optimized build
const config = deployment.getConfig('cdn');

// Features:
// - Maximum compression
// - No analytics
// - Immutable caching
// - Global distribution ready
```

## 🔐 Security Configuration

### Content Security Policy
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

### Required Headers
```http
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Security Checklist
- [ ] HTTPS enforced
- [ ] COOP/COEP headers enabled
- [ ] CSP configured appropriately
- [ ] No sensitive data in client code
- [ ] Input validation on all user data
- [ ] Error messages don't reveal system info

## 📈 Monitoring & Analytics

### Performance Monitoring
```javascript
// Core Web Vitals tracking
const vitals = ['LCP', 'INP', 'CLS', 'TTFB', 'FCP'];

// Targets:
// LCP (Largest Contentful Paint): < 2.5s
// INP (Interaction to Next Paint): < 200ms
// CLS (Cumulative Layout Shift): < 0.1
// TTFB (Time to First Byte): < 800ms
// FCP (First Contentful Paint): < 1.8s
```

### Audio Performance
```javascript
// Audio-specific metrics
const audioMetrics = {
    latency: target < 23ms,
    dropouts: target === 0,
    glitches: target === 0,
    memoryUsage: target < 512MB
};
```

### Error Tracking
```javascript
// Error monitoring setup
window.addEventListener('error', (error) => {
    // Send to monitoring service
    reportError(error);
});

// WebAssembly error handling
window.addEventListener('unhandledrejection', (event) => {
    // WASM promise rejections
    reportError(event.reason);
});
```

## 🚨 Troubleshooting

### Common Issues

#### SharedArrayBuffer Not Available
```http
// Required headers missing
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin

// Solution: Configure server headers properly
```

#### WASM Loading Errors
```javascript
// Check MIME type configuration
// .wasm files must serve as application/wasm

// Verify WASM file integrity
// Use validate-build.js to check
```

#### Audio Context Issues
```javascript
// Browser blocks autoplay
// Require user interaction to start audio

// Solution: Show "Click to Start" button
document.getElementById('start-button').addEventListener('click', async () => {
    await audioContext.resume();
});
```

#### Memory Issues
```javascript
// Large SoundFont files cause OOM
// Monitor memory usage

// Solutions:
// - Use smaller SoundFonts
// - Implement streaming
// - Add memory cleanup
```

### Debug Commands
```bash
# Check build output
node validate-build.js dist/

# Test local deployment
npx serve dist/ -p 3000

# Check compressed sizes
ls -la dist/*.gz dist/*.br

# Verify WASM module
xxd -l 16 dist/awe_synth_bg.wasm
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
# Complete workflow configuration included

# Triggers:
# - Push to main (production deployment)
# - Push to develop (staging deployment)  
# - Pull requests (testing only)
# - Release tags (production + Docker)
```

### Deployment Stages
1. **Test**: Code quality, unit tests, integration tests
2. **Build**: WASM compilation, asset optimization
3. **Validate**: Build integrity, security checks
4. **Deploy**: Environment-specific deployment
5. **Monitor**: Performance metrics, error tracking

### Rollback Strategy
```bash
# Keep previous builds
mv dist/ dist-backup-$(date +%Y%m%d-%H%M%S)/

# Quick rollback
mv dist-backup-20240803-120000/ dist/

# Health check after rollback
curl -f http://localhost/health
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Build validation successful  
- [ ] Security scan clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Rollback plan prepared

### Deployment
- [ ] Build created successfully
- [ ] Assets compressed and optimized
- [ ] Server configuration updated
- [ ] SSL/TLS certificates valid
- [ ] DNS records updated
- [ ] CDN configuration applied

### Post-Deployment
- [ ] Health checks passing
- [ ] Core functionality verified
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] User feedback monitored
- [ ] Documentation published

## 🌟 Best Practices

### Performance
- Use CDN for static assets
- Enable compression (gzip + brotli)
- Set appropriate cache headers
- Minimize bundle sizes
- Optimize for Core Web Vitals

### Security
- Always use HTTPS in production
- Configure CSP headers properly
- Keep dependencies updated
- Regular security scans  
- Monitor error logs

### Reliability
- Implement health checks
- Set up monitoring/alerting
- Plan for graceful degradation
- Test rollback procedures
- Document incident response

### User Experience
- Provide loading indicators
- Handle offline scenarios
- Optimize for mobile devices
- Test across browsers
- Gather user feedback

---

**Last Updated**: August 2025  
**Deployment Version**: 1.0  
**Supported Platforms**: All modern browsers with WebAssembly support

For additional support, see the [troubleshooting section](#-troubleshooting) or file an issue on GitHub.