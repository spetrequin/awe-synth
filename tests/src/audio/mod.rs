// Audio synthesis testing module for Phase 7B and 10B
// Tests oscillator frequency accuracy, waveform generation, voice synthesis, and sample playback

pub mod basic_synthesis_tests;
pub mod voice_synthesis_tests;
pub mod voice_manager_integration_tests;
pub mod midi_integration_tests;
pub mod sample_playback_tests; // Phase 10B.1 - Comprehensive pitch accuracy testing
pub mod interpolation_quality_tests; // Phase 10B.2 - Interpolation quality analysis
pub mod multi_zone_layering_tests; // Phase 10B.9 - EMU8000 multi-zone sample selection
pub mod velocity_crossfading_tests; // Phase 10B.10 - Velocity crossfading between overlapping layers
pub mod round_robin_tests; // Phase 10B.11 - Round-robin and multi-sample zone selection