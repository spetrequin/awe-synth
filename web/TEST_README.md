# AWE Player - Comprehensive Integration Testing Suite

## Overview

This directory contains a complete integration testing system for the AWE Player EMU8000 emulator. The testing suite validates all system components from WASM initialization through UI interactions.

## Test Architecture

### 🧪 **Test Components**

1. **`test-comprehensive-integration.html`** - Interactive browser-based test runner
2. **`test-automation.js`** - Automated test runner for programmatic execution
3. **`test-runner-cli.js`** - Command-line interface for CI/CD pipelines
4. **`test-config.json`** - Test configuration and expectations
5. **`test-package.json`** - Node.js dependencies for CLI runner

### 📊 **Test Coverage**

- **Core WASM Functions** (4 tests)
  - WASM module loading and initialization
  - Required export function availability
  - Audio worklet initialization
  - Debug logging system functionality

- **MIDI System Integration** (5 tests)
  - MIDI event queue processing
  - Note On/Off event handling
  - MIDI CC 91/93 effects control
  - WebMIDI device integration
  - Virtual keyboard MIDI generation

- **Audio Synthesis Pipeline** (4 tests)
  - 32-voice polyphonic allocation
  - DAHDSR envelope processing
  - Audio buffer generation and processing
  - MIDI note to frequency accuracy

- **Send/Return Effects System** (4 tests)
  - Reverb processor functionality
  - Chorus processor functionality
  - Send/return signal routing
  - Real-time effects parameter control

- **UI Component Integration** (4 tests)
  - Effects control panel functionality
  - Voice activity visualization
  - SoundFont file loading interface
  - Audio controls and status management

- **End-to-End Pipeline** (4 tests)
  - Complete MIDI → WASM → Audio pipeline
  - Multi-voice polyphonic synthesis
  - Effects integration with synthesis
  - UI controls synchronization with audio

- **Performance & Stress Testing** (4 tests)
  - CPU usage under maximum load
  - Memory usage and leak detection
  - Audio latency measurement
  - 32-voice stress test with effects

**Total: 29 comprehensive integration tests**

## Usage

### 🌐 **Browser Testing (Interactive)**

1. **Serve the web directory:**
   ```bash
   npx serve . -p 3000
   ```

2. **Open test runner:**
   ```
   http://localhost:3000/test-comprehensive-integration.html
   ```

3. **Run tests:**
   - **Run All Tests** - Complete integration test suite
   - **Run Critical Path** - Essential functionality only
   - **Run Performance Tests** - Performance and stress testing
   - **Clear Results** - Reset test status

### 🖥️ **CLI Testing (Automated)**

1. **Install dependencies:**
   ```bash
   npm install --package-lock-only
   ```

2. **Run test suites:**
   ```bash
   # All tests
   node test-runner-cli.js

   # Critical path only
   node test-runner-cli.js --suite critical

   # Performance tests
   node test-runner-cli.js --suite performance

   # CI/CD mode with JUnit output
   node test-runner-cli.js --output junit --fail-fast --save-artifacts
   ```

3. **Available options:**
   ```bash
   Options:
     -s, --suite <suite>     Test suite (all, critical, performance)
     -o, --output <format>   Output format (console, json, junit)
     -t, --timeout <ms>      Test timeout in milliseconds
     --fail-fast             Stop on first failure
     --headless              Run in headless mode (default)
     --no-headless           Run with visible browser
     -v, --verbose           Verbose logging
     --save-artifacts        Save reports, screenshots, logs
   ```

### 📊 **CI/CD Integration**

Example GitHub Actions workflow:

```yaml
name: AWE Player Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Build WASM
      run: |
        cd web
        wasm-pack build --target web
    
    - name: Install test dependencies
      run: |
        cd web
        npm install puppeteer commander chalk
    
    - name: Run integration tests
      run: |
        cd web
        node test-runner-cli.js --output junit --save-artifacts --verbose
    
    - name: Upload test artifacts
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-artifacts
        path: web/test-artifacts/
```

## Test Suites

### 🎯 **Critical Path Tests**
Essential functionality that must pass for basic operation:
- WASM loading and initialization
- Core audio pipeline
- Basic MIDI processing

### 🔧 **Core Functionality Tests**
Complete feature validation:
- All MIDI message types
- Voice management
- Envelope processing
- Effects routing

### 🎨 **UI Integration Tests**
User interface component validation:
- Control panel functionality
- Real-time visualization
- File loading interfaces

### ⚡ **Performance Tests**
System performance and stress testing:
- CPU usage optimization
- Memory leak detection
- Audio latency measurement
- Maximum polyphony stress test

## Test Results

### 📈 **Success Criteria**

- **Critical Tests**: 100% pass rate required
- **Overall Tests**: 95% minimum pass rate
- **Audio Latency**: <50ms maximum
- **CPU Usage**: <1000ms for stress tests
- **Memory Delta**: <10MB for standard tests

### 📋 **Report Formats**

1. **Console** - Human-readable terminal output
2. **JSON** - Machine-readable structured data
3. **JUnit** - XML format for CI/CD integration

### 🎛️ **Performance Metrics**

- CPU processing time for various voice counts
- Memory usage patterns and leak detection
- Audio buffer processing latency
- UI update responsiveness

## Troubleshooting

### 🚨 **Common Issues**

1. **WASM Loading Fails**
   - Ensure `wasm-pack build --target web` completed successfully
   - Check browser console for CORS issues
   - Verify all required files are present in `wasm-pkg/` directory

2. **Audio Tests Fail**
   - Ensure browser supports AudioWorklet API
   - Check audio context initialization
   - Verify sample rate compatibility (44.1kHz)

3. **MIDI Tests Skipped**
   - WebMIDI tests skip when not supported
   - Permission-based tests may skip on denial
   - This is expected behavior, not a failure

4. **Performance Tests Timeout**
   - Increase timeout value with `--timeout` option
   - Run on more powerful hardware
   - Use `--suite critical` for essential tests only

### 🔧 **Debug Mode**

Enable verbose logging for detailed execution information:
```bash
node test-runner-cli.js --verbose --no-headless
```

This runs tests with visible browser and detailed console output.

## Development

### 🧪 **Adding New Tests**

1. **Browser Tests**: Add test functions to `test-comprehensive-integration.html`
2. **Automated Tests**: Add test cases to `test-automation.js`
3. **Configuration**: Update test suites in `test-config.json`

### 📝 **Test Structure**

Each test should:
- Have clear pass/fail criteria
- Include timeout handling
- Provide descriptive error messages
- Clean up resources after execution
- Support both browser and CLI execution

### 🎯 **Best Practices**

- Keep individual tests focused and atomic
- Use meaningful test names and descriptions
- Include performance expectations in test data
- Handle browser compatibility gracefully
- Provide clear error messages for debugging

## Integration with AWE Player

This testing suite is designed to validate the complete AWE Player system:

- **Phase 16**: EMU8000 send/return effects system
- **Phase 17**: UI integration and user experience
- **Phase 18**: System integration and performance validation

The tests ensure that all previous development phases work together correctly and meet performance requirements for production use.