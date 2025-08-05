#!/bin/bash
# AWE Player Build Script for Staging
# Generated automatically - do not edit manually

set -e

echo "🚀 Building AWE Player for Staging..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf pkg/ dist/

# Build WASM module
echo "⚙️ Building WASM module..."
wasm-pack build \
    --target web \
    --out-dir pkg \
    --release \
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


# Minify JavaScript
echo "🗜️ Minifying JavaScript..."
npx terser dist/*.js --compress --mangle -o dist/awe-player.min.js


# Compress assets
echo "📦 Compressing assets..."
find dist/ -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" \) -exec gzip -9 -k {} \;
find dist/ -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" \) -exec brotli -q 11 -k {} \;


# Generate version info
echo "📝 Generating version info..."
cat > dist/version.json << EOF
{
  "version": "$(git describe --tags --always)",
  "commit": "$(git rev-parse HEAD)",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "staging",
  "features": {"debugTools":true,"testSuites":true,"profiling":false,"verboseLogging":false}
}
EOF

# Generate deployment manifest
echo "📋 Generating deployment manifest..."
cat > dist/deployment.json << EOF
{
  "target": "staging",
  "url": "https://staging.aweplayer.com",
  "optimization": "size",
  "features": {"debugTools":true,"testSuites":true,"profiling":false,"verboseLogging":false},
  "files": [
    $(find dist/ -type f -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" | sed 's/dist\///' | sed 's/.*/"&"/' | paste -sd, -)
  ]
}
EOF

echo "✅ Build complete for Staging!"
echo "📁 Output directory: dist/"
echo "🌐 Target URL: https://staging.aweplayer.com"

# Run post-build validation
echo "🔍 Running post-build validation..."
node validate-build.js dist/

echo "🎉 Deployment ready!"