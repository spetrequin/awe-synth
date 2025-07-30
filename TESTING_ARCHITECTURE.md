# AWE Player Testing Architecture

**⚠️ CRITICAL PRINCIPLE: Zero penetration into production codebase. All testing stays external and separate.**

## 🎯 Testing Philosophy

### **Separation Requirements:**
- **No test code in production files** - All testing external
- **No #[cfg(test)] blocks** - Production code stays clean  
- **No mock interfaces in main code** - Testing handles mocking externally
- **Independent test builds** - Tests compile separately from production

### **Coverage Goals:**
- **100% Unit Testing**: Every function, struct, and component tested in isolation
- **Complete Integration Testing**: All interfaces and data flow paths verified
- **Comprehensive Stress Testing**: Real-time audio requirements under maximum load
- **Performance Validation**: Sample-accurate timing and memory constraints verified

## 📁 Testing Directory Structure

```
tests/                           # Completely separate from src/
├── unit/                        # Pure unit tests (isolated components)
│   ├── rust/                    # Rust component unit tests
│   │   ├── midi_events_test.rs  # MIDI event structures and validation
│   │   ├── voice_synthesis_test.rs # Individual voice synthesis logic
│   │   ├── soundfont_parser_test.rs # SoundFont parsing accuracy
│   │   ├── effects_chain_test.rs # Effects processing algorithms
│   │   └── voice_manager_test.rs # Voice allocation and stealing logic
│   └── typescript/              # TypeScript component unit tests
│       ├── midi_bridge.test.ts  # MIDI bridge timing and validation
│       ├── virtual_keyboard.test.ts # Virtual keyboard input handling
│       └── file_loader.test.ts  # File loading and parsing
├── integration/                 # Cross-component and interface testing
│   ├── midi_pipeline_test.rs    # TypeScript → WASM → Audio pipeline
│   ├── timing_accuracy_test.rs  # Sample-accurate MIDI timing verification
│   └── soundfont_playback_test.rs # Complete SoundFont → Audio verification
├── stress/                      # Load and endurance testing
│   ├── polyphony_stress_test.rs # 32-voice maximum load testing
│   ├── midi_flooding_test.rs    # MIDI event queue overflow scenarios
│   ├── memory_pressure_test.rs  # Long-running memory stability
│   └── timing_stress_test.rs    # Timing accuracy under CPU load
├── performance/                 # Benchmarking and profiling
│   ├── audio_latency_bench.rs   # Audio processing timing benchmarks
│   ├── voice_allocation_bench.rs # Voice management performance
│   └── midi_throughput_bench.rs # MIDI event processing throughput
├── reference/                   # Reference implementations and golden files
│   ├── soundfonts/              # Test SoundFont files (.sf2)
│   ├── midi_files/              # Test MIDI files (.mid)
│   ├── golden_audio/            # Expected audio output (.wav)
│   └── reference_implementations/ # EMU8000/FluidSynth comparison data
├── mocks/                       # Mock implementations for testing
│   ├── mock_audio_context.ts    # Mock Web Audio API
│   ├── mock_webmidi.ts          # Mock WebMIDI API
│   └── mock_wasm_interface.rs   # Mock WASM interfaces
└── utils/                       # Testing utilities and helpers
    ├── audio_analysis.rs        # Audio quality and accuracy analysis
    ├── timing_measurement.rs    # High-precision timing tools
    ├── midi_generators.rs       # MIDI test data generators
    └── test_soundfont_builder.rs # Programmatic SoundFont creation
```

## 🧪 Unit Testing Strategy

### **Rust Component Testing (tests/unit/rust/)**

**1. MIDI Event Testing (`midi_events_test.rs`):**
```rust
// Tests MidiEvent struct and queue operations in complete isolation
#[test]
fn test_midi_event_creation_and_validation() {
    // Test valid MIDI event creation
    // Test invalid data clamping (channels > 15, velocities > 127)
    // Test timestamp ordering
}

#[test]
fn test_midi_queue_operations() {
    // Test queue capacity limits (1000 events)
    // Test FIFO ordering
    // Test thread safety (if applicable)
}
```

**2. Voice Synthesis Testing (`voice_synthesis_test.rs`):**
```rust
// Tests individual voice processing algorithms
#[test]
fn test_sample_interpolation() {
    // Test different interpolation algorithms
    // Compare against reference implementations
    // Test edge cases (loop points, sample boundaries)
}

#[test]
fn test_adsr_envelope_curves() {
    // Test exponential decay curves (FluidSynth-compatible)
    // Test envelope timing accuracy
    // Test parameter conversion (timecents → seconds)
}
```

**3. SoundFont Parser Testing (`soundfont_parser_test.rs`):**
```rust
// Tests SoundFont parsing accuracy against known files
#[test]
fn test_sf2_chunk_parsing() {
    // Load reference SoundFont files
    // Verify correct preset/instrument/sample hierarchy
    // Test all 58 generator parsing
}

#[test]
fn test_fine_tuning_accuracy() {
    // Test Creative Labs SoundFont -48 cents issue
    // Verify FluidSynth-compatible tuning calculations
}
```

### **TypeScript Component Testing (tests/unit/typescript/)**

**1. MIDI Bridge Testing (`midi_bridge.test.ts`):**
```typescript
// Tests TypeScript ↔ WASM communication in isolation
describe('MidiBridge', () => {
    test('sample-accurate timestamp conversion', () => {
        // Mock AudioContext with known sample rate
        // Test timestamp conversion accuracy
        // Verify sample-time calculations
    });
    
    test('MIDI message validation and clamping', () => {
        // Test channel clamping (0-15)
        // Test velocity clamping (0-127)
        // Test pitch bend 14-bit conversion
    });
});
```

**2. Virtual Keyboard Testing (`virtual_keyboard.test.ts`):**
```typescript
// Tests 88-key interface and input handling
describe('VirtualMidiKeyboard', () => {
    test('88-key layout generation', () => {
        // Verify A0(21) to C8(108) key range
        // Test white/black key identification  
        // Test MIDI note number mapping
    });
    
    test('velocity sensitivity simulation', () => {
        // Test mouse speed → velocity conversion
        // Test touch pressure → velocity mapping
    });
});
```

## 🔗 Integration Testing Strategy

### **End-to-End Pipeline Testing (`integration/midi_pipeline_test.rs`):**
```rust
// Test complete MIDI event flow: TypeScript → WASM → Audio
#[test]
fn test_complete_midi_pipeline() {
    // 1. Mock TypeScript MIDI event generation
    // 2. Send through MIDI bridge to WASM queue
    // 3. Process in voice manager
    // 4. Verify correct audio output generation
    // 5. Measure end-to-end latency
}
```

### **Timing Accuracy Testing (`integration/timing_accuracy_test.rs`):**
```rust
// Verify sample-accurate MIDI timing under various conditions
#[test]
fn test_sample_accurate_timing() {
    // Generate MIDI events with precise timestamps
    // Process through complete audio pipeline
    // Measure actual audio output timing
    // Verify ±1 sample accuracy
}
```

## 💥 Stress Testing Strategy

### **Maximum Polyphony Testing (`stress/polyphony_stress_test.rs`):**
```rust
// Test 32-voice limit under maximum load
#[test]
fn test_32_voice_maximum_load() {
    // Generate 32 simultaneous note-on events
    // Verify all voices allocated correctly
    // Test voice stealing with 33rd note
    // Measure CPU usage and timing stability
}

#[test]
fn test_rapid_voice_cycling() {
    // Rapidly cycle through note on/off events
    // Test voice allocation/deallocation stability
    // Verify no memory leaks or corruption
}
```

### **MIDI Event Flooding (`stress/midi_flooding_test.rs`):**
```rust
// Test queue capacity and overflow handling
#[test]
fn test_midi_queue_overflow() {
    // Generate >1000 MIDI events rapidly
    // Verify oldest events dropped correctly
    // Test system stability under overflow
    // Measure audio continuity during flood
}
```

### **Memory Pressure Testing (`stress/memory_pressure_test.rs`):**
```rust
// Test long-running stability and memory management
#[test]
fn test_extended_playback_stability() {
    // Run continuous audio synthesis for hours
    // Monitor memory usage patterns
    // Verify no memory leaks or fragmentation
    // Test garbage collection impact (should be zero in Rust)
}
```

### **Timing Under Load (`stress/timing_stress_test.rs`):**
```rust
// Test timing accuracy under CPU stress
#[test]
fn test_timing_under_cpu_load() {
    // Generate artificial CPU load
    // Measure MIDI timing accuracy degradation
    // Verify audio buffer underrun handling
    // Test priority and real-time scheduling
}
```

## ⚡ Performance Testing Strategy

### **Audio Latency Benchmarking (`performance/audio_latency_bench.rs`):**
```rust
// Measure end-to-end audio processing latency
#[benchmark]
fn bench_audio_buffer_processing() {
    // Measure time for complete 1024-sample buffer processing
    // Must complete in <23ms (44.1kHz requirement)
    // Test with various voice counts (1, 16, 32 voices)
}

#[benchmark]  
fn bench_midi_event_processing() {
    // Measure MIDI event processing latency
    // Target: <1ms from MIDI input to audio output
}
```

### **Voice Management Performance (`performance/voice_allocation_bench.rs`):**
```rust
// Benchmark voice allocation and stealing algorithms
#[benchmark]
fn bench_voice_allocation() {
    // Measure voice allocation time
    // Test various voice stealing scenarios
    // Verify consistent performance regardless of allocation state
}
```

## 🎵 Audio Quality Testing

### **Reference Comparison Testing:**
```rust
// Compare audio output against reference implementations
#[test]
fn test_audio_quality_vs_fluidsynth() {
    // Load identical SoundFont in both implementations
    // Play identical MIDI sequence
    // Compare audio output using spectral analysis
    // Verify frequency response and harmonic content
}
```

### **Golden File Testing:**
```rust
// Regression testing against known-good audio outputs
#[test] 
fn test_golden_audio_regression() {
    // Play test MIDI files with reference SoundFonts
    // Compare against stored "golden" audio files
    // Detect any unintended changes in audio output
}
```

## 🔧 Testing Infrastructure

### **Mock System (`tests/mocks/`):**
- **Mock AudioContext**: Simulated Web Audio API for deterministic testing
- **Mock WebMIDI**: Controlled MIDI input simulation
- **Mock WASM Interface**: Test TypeScript components without WASM dependency

### **Test Data Generation (`tests/utils/`):**
- **MIDI File Generators**: Programmatically create test MIDI sequences
- **SoundFont Builders**: Create minimal test SoundFonts with known characteristics  
- **Audio Analysis Tools**: Spectral analysis, timing measurement, quality metrics

### **Automated Test Execution:**
```bash
# Separate test commands (independent of main build)
cargo test --manifest-path tests/Cargo.toml         # Rust unit and integration tests
npm test --prefix tests/typescript                  # TypeScript unit tests  
cargo bench --manifest-path tests/Cargo.toml       # Performance benchmarks
./tests/scripts/stress_test_suite.sh               # Extended stress testing
./tests/scripts/audio_quality_validation.sh        # Audio output validation
```

## 📊 Testing Metrics and Success Criteria

### **Unit Testing Targets:**
- **Code Coverage**: 100% of production functions tested
- **Test Execution Time**: <30 seconds for complete unit test suite
- **Test Reliability**: 0% flaky tests, 100% reproducible results

### **Performance Requirements:**
- **Audio Latency**: <1ms MIDI input to audio output
- **Buffer Processing**: <23ms for 1024-sample buffer (44.1kHz requirement)
- **Memory Usage**: Zero allocation in audio thread during steady state
- **CPU Usage**: <25% CPU for 32-voice polyphony on modern hardware

### **Stress Testing Thresholds:**
- **32-Voice Polyphony**: Stable operation with all voices active
- **MIDI Flood Resistance**: Graceful handling of >1000 events/second
- **Extended Operation**: 24+ hour continuous operation without degradation
- **Timing Accuracy**: ±1 sample accuracy maintained under all load conditions

### **Audio Quality Standards:**
- **EMU8000 Compatibility**: Identical behavior to reference EMU8000 hardware
- **SoundFont Compliance**: 100% compatibility with SoundFont 2.0 specification
- **Frequency Response**: Flat response within EMU8000 specifications
- **Dynamic Range**: Full 16-bit dynamic range preservation

## 🚀 Testing Automation and CI/CD

### **Continuous Testing Pipeline:**
```yaml
# GitHub Actions workflow (future implementation)
name: AWE Player Testing Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Rust unit tests
      - name: Run TypeScript unit tests
      - name: Generate coverage reports
      
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Build WASM module
      - name: Run integration test suite
      - name: Validate MIDI pipeline
      
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run performance benchmarks
      - name: Validate latency requirements
      - name: Check memory usage patterns
      
  stress-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - name: Extended polyphony stress test
      - name: MIDI flooding endurance test
      - name: Memory pressure validation
```

---

## 🎯 Implementation Priority

**Phase 1: Core Unit Testing** (Immediate - supports ongoing development)
- MIDI event testing
- Voice synthesis testing  
- TypeScript bridge testing

**Phase 2: Integration Testing** (After Phase 2 completion)
- End-to-end pipeline testing
- Timing accuracy validation

**Phase 3: Stress and Performance Testing** (After basic functionality complete)
- Maximum load testing
- Extended endurance testing
- Performance benchmarking

**This testing architecture ensures zero penetration into production code while providing comprehensive validation of all system requirements.**