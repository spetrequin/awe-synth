/**
 * Effects Testing Module - Phase 11B/12B/13B
 * 
 * Comprehensive testing for EMU8000 per-voice effects processing:
 * - Low-pass filter frequency response and resonance validation
 * - Real-time parameter changes and coefficient calculation
 * - Performance benchmarks for 32-voice processing
 * - Integration testing with voice synthesis pipeline
 * - Modulation envelope state transitions and timing accuracy
 * - Key scaling effects and SoundFont generator compliance
 * - Dual LFO system waveform accuracy and frequency response
 * - LFO phase synchronization and SoundFont generator support
 */

pub mod filter_tests;
pub mod mod_envelope_tests; // Phase 12B - Modulation envelope testing
pub mod lfo_tests; // Phase 13B - Dual LFO system testing
pub mod modulation_tests; // Phase 14B - Modulation routing system testing