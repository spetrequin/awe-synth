// Envelope Testing Module
// Complete testing for EMU8000 6-stage DAHDSR envelope system

pub mod basic_envelope_tests;
pub mod voice_integration_tests;
pub mod voice_manager_tests;
pub mod voice_lifecycle_tests;
pub mod concurrent_envelope_tests;
pub mod emu8000_compliance_tests;
pub mod soundfont_generator_tests;
pub mod performance_benchmarks;

// Re-export envelope types for testing
pub use awe_synth::synth::envelope::{DAHDSREnvelope, EnvelopeState, timecents_to_seconds, centibels_to_linear};
pub use awe_synth::synth::voice::Voice;
pub use awe_synth::synth::voice_manager::VoiceManager;

// Common test utilities for envelope testing
pub const SAMPLE_RATE: f32 = 44100.0;
pub const TEST_TOLERANCE: f32 = 0.001;

/// Test helper: Create envelope with basic parameters for testing
pub fn create_test_envelope() -> DAHDSREnvelope {
    DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000, // delay_time_cents (-12000tc = ~1ms = 44 samples)
        -4800,  // attack_time_cents (-4800 = ~63ms)
        -12000, // hold_time_cents (-12000tc = ~1ms = 44 samples)
        -4800,  // decay_time_cents (-4800 = ~63ms)
        200,    // sustain_level_cb (200 = -2dB attenuation)
        -4800,  // release_time_cents (-4800 = ~63ms)  
    )
}

/// Test helper: Create envelope with known timing for verification
pub fn create_timed_envelope() -> DAHDSREnvelope {
    DAHDSREnvelope::new(
        SAMPLE_RATE,
        -6000, // delay_time_cents (~10ms)
        -4800, // attack_time_cents (~100ms)
        -6000, // hold_time_cents (~10ms)
        -4800, // decay_time_cents (~100ms)
        -200,  // sustain_level_cb (-200cb = ~79% level)
        -4800, // release_time_cents (~100ms)
    )
}