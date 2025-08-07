#!/bin/bash
# AWE Player Build Script for Production
# Updated for React/Vite architecture

set -e

echo "🚀 Building AWE Player for Production..."

# Determine the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to web directory if not already there
if [[ "$PWD" != "$SCRIPT_DIR" ]]; then
    cd "$SCRIPT_DIR"
fi

# Check for pnpm (preferred) or npm
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    echo "❌ Error: npm or pnpm is required but not installed."
    exit 1
fi

echo "📦 Using package manager: $PKG_MANAGER"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📚 Installing dependencies..."
    $PKG_MANAGER install
fi

# Build WASM module first (from root directory)
echo "⚙️ Building WASM module..."
cd ..
wasm-pack build \
    --target web \
    --out-dir web \
    --release
cd "$SCRIPT_DIR"

# Run Vite production build
echo "🏗️ Running Vite production build..."
$PKG_MANAGER run build

# The Vite build outputs to dist/ directory by default
echo "✅ Production build complete!"


# Generate version info
echo "📝 Generating version info..."
cat > dist/version.json << EOF
{
  "version": "$(git describe --tags --always 2>/dev/null || echo 'dev')",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
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
    $(find dist/ -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.html" -o -name "*.css" \) 2>/dev/null | sed 's/dist\///' | sed 's/.*/"&"/' | paste -sd, - 2>/dev/null || echo '[]')
  ]
}
EOF

echo "✅ Build complete for Production!"
echo "📁 Output directory: web/dist/"
echo "🌐 Target URL: https://aweplayer.com"

# Check if validation script exists before running
if [ -f "tests/config/validate-build.cjs" ]; then
    echo "🔍 Running post-build validation..."
    node tests/config/validate-build.cjs dist/
elif [ -f "validate-build.cjs" ]; then
    echo "🔍 Running post-build validation..."
    node validate-build.cjs dist/
else
    echo "⚠️  Validation script not found, skipping validation"
fi

echo "🎉 Deployment ready!"