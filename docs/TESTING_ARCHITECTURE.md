# AWE Player Testing Architecture

**⚠️ CRITICAL PRINCIPLE: Clean Separation - Test code stays external, but can access and test production functionality.**

## 🎯 Testing Philosophy

### **Core Testing Strategy:**
- **No test code in production files** - All test code lives in tests/ directory
- **No #[cfg(test)] blocks in src/** - Production code stays completely clean
- **No mock interfaces in production** - Testing handles all mocking externally
- **Tests can access production code** - Tests import and use actual production modules
- **Public module exports** - Production modules are public for test access
- **Dual crate types** - Main crate builds as both "cdylib" (WASM) and "rlib" (for testing)

### **Testing Approach Benefits:**
- **Real Behavior Testing**: Tests validate actual production code, not theoretical mocks
- **Authentic Integration Testing**: Tests verify real component interactions and workflows
- **Improved Test Reliability**: Tests catch actual bugs in production code paths
- **Simplified Maintenance**: No mock drift - tests automatically use latest production code
- **Better Debugging**: Test failures point directly to production code issues

### **Clear Boundaries:**
- **Production Code (src/)**: Clean implementation without any test-specific code
- **Test Code (tests/)**: All test functions, utilities, and mocks live here
- **Test Access**: Tests can import from src/ to test real functionality
- **No Contamination**: Production builds contain zero test code or overhead

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
// Tests actual MidiEvent and sequencer components from production code
use awe_synth::midi::sequencer::{MidiSequencer, PlaybackState};
use awe_synth::midi::parser::{MidiEvent, MidiEventType};

#[test]
fn test_midi_sequencer_state_transitions() {
    let mut sequencer = MidiSequencer::new(44100.0);
    
    // Test actual production code behavior
    assert_eq!(sequencer.get_state(), PlaybackState::Stopped);
    
    // Load test MIDI file and verify state changes
    let test_midi = create_test_midi_file();
    sequencer.load_midi_file(&test_midi).unwrap();
    
    sequencer.play(0);
    assert_eq!(sequencer.get_state(), PlaybackState::Playing);
}

#[test]
fn test_tempo_multiplier_behavior() {
    let mut sequencer = MidiSequencer::new(44100.0);
    
    // Test actual tempo calculations with production code
    let original_tempo = sequencer.get_original_tempo_bpm();
    sequencer.set_tempo_multiplier(2.0);
    let doubled_tempo = sequencer.get_current_tempo_bpm();
    
    assert!((doubled_tempo - original_tempo * 2.0).abs() < 0.1);
}
```

**2. Voice Management Testing (`voice_management_test.rs`):**
```rust
// Tests actual VoiceManager from production code
use awe_synth::synth::voice_manager::VoiceManager;
use awe_synth::midi::constants::*;

#[test]
fn test_voice_allocation_with_real_voice_manager() {
    let mut voice_manager = VoiceManager::new(44100.0);
    
    // Test actual voice allocation behavior
    voice_manager.note_on(0, MIDI_MIDDLE_C, 100);
    
    // Verify voice was allocated using production code
    let active_voices = voice_manager.get_active_voice_count();
    assert_eq!(active_voices, 1);
}

#[test]
fn test_32_voice_polyphony_limit() {
    let mut voice_manager = VoiceManager::new(44100.0);
    
    // Allocate 32 voices using production code
    for note in 60..92 {
        voice_manager.note_on(0, note, 100);
    }
    
    // Test voice stealing on 33rd note
    voice_manager.note_on(0, 92, 127);
    assert_eq!(voice_manager.get_active_voice_count(), 32);
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

### **Real Production Code Integration Testing**

The updated testing approach enables **authentic integration testing** using actual production components instead of mocks for core logic.

### **Timing Integration Testing (`tests/src/timing/`):**
```rust
// Example from actual implementation - tests real MidiSequencer timing
use awe_synth::midi::sequencer::{MidiSequencer, PlaybackState};

#[test]
fn test_sequencer_timing_integration() {
    let mut sequencer = MidiSequencer::new(44100.0);
    let test_midi = create_test_midi_file();
    
    // Test actual sequencer behavior with real MIDI file
    sequencer.load_midi_file(&test_midi).unwrap();
    sequencer.play(0);
    
    // Verify real timing calculations
    let current_tempo = sequencer.get_current_tempo_bpm();
    assert!((current_tempo - 120.0).abs() < 0.1);
    
    // Test tempo multiplier with actual implementation
    sequencer.set_tempo_multiplier(2.0);
    let doubled_tempo = sequencer.get_current_tempo_bpm();
    assert!((doubled_tempo - 240.0).abs() < 0.1);
}
```

### **MIDI Queue Integration Testing (`integration/queue_timing_tests.rs`):**
```rust
// Tests actual MIDI event queue processing with production code
use awe_synth::midi::sequencer::MidiSequencer;

#[test]
fn test_midi_queue_processing_accuracy() {
    let mut sequencer = MidiSequencer::new(44100.0);
    
    // Test real event processing timing
    let events = sequencer.process(44100, 1024); // Process 1 second of audio
    
    // Verify actual event timing with production implementation
    for event in events {
        assert!(event.sample_offset < 1024); // Within buffer bounds
    }
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

### **Updated Configuration Requirements:**
```toml
# Main Cargo.toml - Enable both WASM and library builds
[lib]
crate-type = ["cdylib", "rlib"]  # WASM + library for tests

# Make modules public for test access
pub mod error;
pub mod midi;
pub mod synth;
pub mod soundfont;
pub mod effects;
```

```toml
# tests/Cargo.toml - Reference main crate as dependency
[dependencies]
awe-synth = { path = ".." }  # Access to production code

# Testing dependencies
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### **Automated Test Execution:**
```bash
# Updated test commands with production code access
cargo test --manifest-path tests/Cargo.toml         # Rust tests using production code
cargo run --bin run-timing-tests                    # Specific timing test runner
npm test --prefix tests/typescript                  # TypeScript unit tests  
cargo bench --manifest-path tests/Cargo.toml       # Performance benchmarks
./tests/scripts/stress_test_suite.sh               # Extended stress testing
./tests/scripts/audio_quality_validation.sh        # Audio output validation
```

### **Testing Quality Improvements:**

**✅ Enhanced Test Reliability:**
- Tests verify actual production code behavior, not mock approximations
- Catches real bugs in component interactions and edge cases
- Eliminates mock drift where mocks become outdated vs production code

**✅ Simplified Maintenance:**
- No need to maintain separate mock implementations
- Tests automatically use latest production code changes
- Reduced test code complexity and maintenance overhead

**✅ Better Debug Experience:**
- Test failures point directly to production code issues
- Can step through actual production code paths during debugging
- Real component behavior visible in test execution

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