# AWE Synth Integration Test Framework

This directory contains comprehensive integration tests for the AWE Synth EMU8000 emulator.

## Testing Architecture

TESTING_ARCHITECTURE.md:
- **NO test code in src/** - All testing stays in tests/
- **NO #[cfg(test)] blocks** - Production code stays clean
- **Real implementation testing** - Tests focus on actual codebase functionality

## Directory Structure

```
tests/
├── README.md                    # This file
├── unit/                       # Isolated component testing
├── integration/                # Cross-component testing
├── timing/                     # Sequencer and sample-accurate timing
├── stress/                     # Voice allocation and polyphony limits
├── reference/                  # Golden files and reference data
└── utils/                      # Test utilities and helpers
```

## Test Categories

### Unit Tests (tests/unit/)
- Individual component isolation testing
- MIDI parser validation
- VoiceManager functionality
- Error handling verification

### Integration Tests (tests/integration/)
- Real component integration testing
- EMU8000 parameter validation
- Multi-zone sample layering
- Voice system pipeline testing

### Timing Tests (tests/timing/)
- Sample-accurate event processing (44.1kHz)
- Sequencer timing validation
- Tempo change synchronization
- Voice envelope timing

### Stress Tests (tests/stress/)
- 32-voice polyphony limits
- Voice stealing algorithms
- MIDI event flooding
- Memory pressure testing

## Running Tests

```bash
# Run all Rust unit tests
cargo test

# Run WASM tests in browser
wasm-pack test --headless --firefox

# Run TypeScript integration tests
cd web && npm test

# Run performance benchmarks
cargo bench
```

## Golden File Testing

Reference files in `tests/reference/` contain known-good outputs for:
- MIDI file parsing results
- Audio synthesis snapshots
- VoiceManager state transitions
- EMU8000 compatibility validation

## Integration Requirements

Every test must verify the **MIDI↔Synth Integration** principle:
- MIDI events → VoiceManager state changes
- Real-time parameter updates
- Sample-accurate timing preservation
- Voice allocation coordination

## Debug System Integration

All tests use the same debug logging system as production:
- No console.log() usage
- All output via crate::log() → debug textarea
- Structured test result reporting