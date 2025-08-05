#!/bin/bash
# AWE Player Build Script for Production
# Generated automatically - do not edit manually

set -e

echo "🚀 Building AWE Player for Production..."

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


# Skip minification for now (can be added later)
echo "📝 Skipping JavaScript minification (test build)"


# Skip compression for test build
echo "📝 Skipping asset compression (test build)"


# Generate version info
echo "📝 Generating version info..."
cat > dist/version.json << EOF
{
  "version": "$(git describe --tags --always)",
  "commit": "$(git rev-parse HEAD)",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "production",
  "features": {"debugTools":false,"testSuites":false,"profiling":false,"verboseLogging":false}
}
EOF

# Generate deployment manifest
echo "📋 Generating deployment manifest..."
cat > dist/deployment.json << EOF
{
  "target": "production",
  "url": "https://aweplayer.com",
  "optimization": "speed",
  "features": {"debugTools":false,"testSuites":false,"profiling":false,"verboseLogging":false},
  "files": [
    $(find dist/ -type f -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" | sed 's/dist\///' | sed 's/.*/"&"/' | paste -sd, -)
  ]
}
EOF

echo "✅ Build complete for Production!"
echo "📁 Output directory: dist/"
echo "🌐 Target URL: https://aweplayer.com"

# Run post-build validation
echo "🔍 Running post-build validation..."
node web/validate-build.cjs dist/

echo "🎉 Deployment ready!"