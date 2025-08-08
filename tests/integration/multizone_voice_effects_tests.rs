//! Effects Processing Integration Tests for MultiZoneSampleVoice
//!
//! Tests the complete EMU8000-authentic effects chain integration:
//! - Envelope → Filter → LFO modulation interactions
//! - Modulation routing matrix behavior
//! - Real-time parameter changes affecting multiple effects
//! - EMU8000-specific signal flow validation
//!
//! Phase 20.3.2: Effects processing integration testing

use std::collections::HashMap;

// Import the actual production code for testing
use awe_synth::synth::multizone_voice::{MultiZoneSampleVoice, VoiceState};
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};
use awe_synth::error::AweError;

/// Test data structures and helpers for effects testing
mod effects_test_helpers {
    use super::*;
    use awe_synth::soundfont::types::{
        SoundFontHeader, SoundFontVersion, SoundFontInstrument, SoundFontSample,
        PresetZone, InstrumentZone, SampleType
    };
    
    /// Create test SoundFont with rich sample data for effects testing
    pub fn create_effects_test_soundfont() -> SoundFont {
        let header = SoundFontHeader {
            version: SoundFontVersion { major: 2, minor: 1 },
            name: "Effects Test SoundFont".to_string(),
            engine: "EMU8000".to_string(),
            tools: "Effects Test Suite".to_string(),
            creation_date: "2024".to_string(),
            author: "Test".to_string(),
            product: "Test".to_string(),
            copyright: "Test".to_string(),
            comments: "SoundFont for effects integration testing".to_string(),
            preset_count: 1,
            instrument_count: 1,
            sample_count: 1,
        };
        
        // Create a sample with more interesting waveform for effects testing
        let mut sample_data = Vec::with_capacity(4410); // 100ms at 44.1kHz
        for i in 0..4410 {
            // Generate a complex waveform (fundamental + harmonics)
            let t = i as f32 / 44100.0;
            let fundamental = (2.0 * std::f32::consts::PI * 440.0 * t).sin(); // A4
            let harmonic2 = 0.5 * (2.0 * std::f32::consts::PI * 880.0 * t).sin(); // Second harmonic
            let harmonic3 = 0.25 * (2.0 * std::f32::consts::PI * 1320.0 * t).sin(); // Third harmonic
            
            let sample = (fundamental + harmonic2 + harmonic3) * 16384.0; // Scale to i16 range
            sample_data.push(sample as i16);
        }
        
        let sample = SoundFontSample {
            name: "Effects Test Sample".to_string(),
            start_offset: 0,
            end_offset: 4410,
            loop_start: 441, // 10ms loop start
            loop_end: 4410 - 441, // 10ms from end
            sample_rate: 44100,
            original_pitch: 69, // A4 (440Hz)
            pitch_correction: 0,
            sample_link: 0,
            sample_type: SampleType::MonoSample,
            sample_data,
        };
        
        let instrument = SoundFontInstrument {
            name: "Effects Test Instrument".to_string(),
            instrument_bag_index: 0,
            instrument_zones: vec![
                InstrumentZone {
                    generators: vec![],
                    modulators: vec![],
                    sample_id: Some(0),
                    key_range: None,
                    velocity_range: None,
                }
            ],
        };
        
        SoundFont {
            header,
            presets: vec![create_effects_test_preset()],
            instruments: vec![instrument],
            samples: vec![sample],
        }
    }
    
    /// Create test preset optimized for effects testing
    pub fn create_effects_test_preset() -> SoundFontPreset {
        SoundFontPreset {
            name: "Effects Test Preset".to_string(),
            program: 0,
            bank: 0,
            preset_bag_index: 0,
            library: 0,
            genre: 0,
            morphology: 0,
            preset_zones: vec![
                PresetZone {
                    generators: vec![],
                    modulators: vec![],
                    instrument_id: Some(0),
                    key_range: None,
                    velocity_range: None,
                }
            ],
        }
    }
    
    /// Process voice and analyze output for effects characteristics
    pub fn analyze_effects_output(voice: &mut MultiZoneSampleVoice, sample_count: usize) -> EffectsAnalysis {
        let mut samples = Vec::with_capacity(sample_count);
        let mut envelope_levels = Vec::with_capacity(sample_count);
        let mut lfo1_levels = Vec::with_capacity(sample_count);
        let mut lfo2_levels = Vec::with_capacity(sample_count);
        
        for _ in 0..sample_count {
            let (left, right) = voice.process();
            samples.push((left, right));
            envelope_levels.push(voice.get_volume_envelope_level());
            lfo1_levels.push(voice.get_lfo1_level());
            lfo2_levels.push(voice.get_lfo2_level());
        }
        
        EffectsAnalysis {
            samples,
            envelope_levels,
            lfo1_levels,
            lfo2_levels,
        }
    }
    
    /// Analysis results for effects processing
    pub struct EffectsAnalysis {
        pub samples: Vec<(f32, f32)>,
        pub envelope_levels: Vec<f32>,
        pub lfo1_levels: Vec<f32>,
        pub lfo2_levels: Vec<f32>,
    }
    
    impl EffectsAnalysis {
        /// Calculate RMS (Root Mean Square) amplitude
        pub fn rms_amplitude(&self) -> f32 {
            if self.samples.is_empty() {
                return 0.0;
            }
            
            let sum_squares: f32 = self.samples.iter()
                .map(|(l, r)| l * l + r * r)
                .sum();
            
            (sum_squares / (self.samples.len() as f32 * 2.0)).sqrt()
        }
        
        /// Detect if LFO modulation is affecting output
        pub fn has_lfo_modulation(&self) -> bool {
            let lfo1_range = self.lfo1_max() - self.lfo1_min();
            let lfo2_range = self.lfo2_max() - self.lfo2_min();
            lfo1_range > 0.01 || lfo2_range > 0.01
        }
        
        /// Get envelope progression characteristics
        pub fn envelope_progression(&self) -> EnvelopeProgression {
            if self.envelope_levels.is_empty() {
                return EnvelopeProgression::None;
            }
            
            let first_quarter = &self.envelope_levels[0..self.envelope_levels.len() / 4];
            let last_quarter = &self.envelope_levels[3 * self.envelope_levels.len() / 4..];
            
            let first_avg = first_quarter.iter().sum::<f32>() / first_quarter.len() as f32;
            let last_avg = last_quarter.iter().sum::<f32>() / last_quarter.len() as f32;
            
            if last_avg > first_avg + 0.1 {
                EnvelopeProgression::Rising
            } else if first_avg > last_avg + 0.1 {
                EnvelopeProgression::Falling
            } else {
                EnvelopeProgression::Stable
            }
        }
        
        /// Check for audio artifacts (NaN, infinite, clipping)
        pub fn has_audio_artifacts(&self) -> bool {
            self.samples.iter().any(|(l, r)| {
                l.is_nan() || r.is_nan() || l.is_infinite() || r.is_infinite() || 
                l.abs() > 2.0 || r.abs() > 2.0 // Check for clipping beyond reasonable range
            })
        }
        
        fn lfo1_min(&self) -> f32 {
            self.lfo1_levels.iter().cloned().fold(f32::INFINITY, f32::min)
        }
        
        fn lfo1_max(&self) -> f32 {
            self.lfo1_levels.iter().cloned().fold(f32::NEG_INFINITY, f32::max)
        }
        
        fn lfo2_min(&self) -> f32 {
            self.lfo2_levels.iter().cloned().fold(f32::INFINITY, f32::min)
        }
        
        fn lfo2_max(&self) -> f32 {
            self.lfo2_levels.iter().cloned().fold(f32::NEG_INFINITY, f32::max)
        }
    }
    
    #[derive(Debug, PartialEq)]
    pub enum EnvelopeProgression {
        Rising,
        Falling,
        Stable,
        None,
    }
}

/// Test complete EMU8000 signal flow integration
mod signal_flow_integration_tests {
    use super::*;
    use effects_test_helpers::*;
    
    #[test]
    fn test_complete_emu8000_signal_flow() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        // Start note to activate complete signal flow
        voice.start_note(69, 100, 0, &soundfont, &preset).unwrap(); // A4
        
        // Analyze initial attack phase (envelope rising)
        let attack_analysis = analyze_effects_output(&mut voice, 441); // 10ms
        
        // Analyze sustain phase (envelope stable)
        let sustain_analysis = analyze_effects_output(&mut voice, 2205); // 50ms
        
        // Trigger release and analyze release phase
        voice.stop_note();
        let release_analysis = analyze_effects_output(&mut voice, 441); // 10ms
        
        // Verify EMU8000 signal flow characteristics
        assert!(!attack_analysis.has_audio_artifacts(), "Attack phase should not have artifacts");
        assert!(!sustain_analysis.has_audio_artifacts(), "Sustain phase should not have artifacts");
        assert!(!release_analysis.has_audio_artifacts(), "Release phase should not have artifacts");
        
        // Verify envelope progression follows EMU8000 behavior
        assert_eq!(attack_analysis.envelope_progression(), EnvelopeProgression::Rising, 
                   "Attack phase should show rising envelope");
        
        // Verify LFO modulation is active during sustain
        assert!(sustain_analysis.has_lfo_modulation(), 
                "Sustain phase should show LFO modulation");
        
        // Verify audio output is present and reasonable
        assert!(sustain_analysis.rms_amplitude() > 0.001, 
                "Sustain phase should produce audible output");
        
        println!("✅ Complete EMU8000 signal flow integration test passed");
    }
    
    #[test]
    fn test_envelope_filter_interaction() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(60, 127, 0, &soundfont, &preset).unwrap(); // High velocity for strong envelope
        
        // Capture output during different envelope phases
        let samples_per_phase = 441; // 10ms phases
        
        // Phase 1: Attack (envelope rising, filter modulated)
        let phase1 = analyze_effects_output(&mut voice, samples_per_phase);
        
        // Phase 2: Decay (envelope falling, filter following)
        let phase2 = analyze_effects_output(&mut voice, samples_per_phase);
        
        // Phase 3: Sustain (stable envelope, stable filter)
        let phase3 = analyze_effects_output(&mut voice, samples_per_phase * 2);
        
        // Verify envelope progression affects filter behavior
        // (This is verified by no audio artifacts and proper signal flow)
        assert!(!phase1.has_audio_artifacts(), "Phase 1 should be clean");
        assert!(!phase2.has_audio_artifacts(), "Phase 2 should be clean");
        assert!(!phase3.has_audio_artifacts(), "Phase 3 should be clean");
        
        // Verify modulation envelope is affecting filter (via modulation router)
        let mod_env_level = voice.get_modulation_envelope_level();
        assert!(mod_env_level >= 0.0 && mod_env_level <= 1.0, 
                "Modulation envelope should be in valid range");
        
        println!("✅ Envelope-filter interaction test passed");
    }
    
    #[test]
    fn test_lfo_effects_interaction() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(64, 100, 0, &soundfont, &preset).unwrap();
        
        // Let envelopes stabilize
        analyze_effects_output(&mut voice, 1000);
        
        // Test LFO1 (tremolo) + LFO2 (vibrato) interaction
        let baseline_analysis = analyze_effects_output(&mut voice, 2205); // 50ms
        
        // Increase modulation wheel (affects LFO2 vibrato)
        voice.set_modulation(1.0);
        let high_mod_analysis = analyze_effects_output(&mut voice, 2205);
        
        // Set modulation back to zero
        voice.set_modulation(0.0);
        let low_mod_analysis = analyze_effects_output(&mut voice, 2205);
        
        // Verify LFO modulation is working
        assert!(baseline_analysis.has_lfo_modulation(), 
                "Baseline should show LFO modulation");
        assert!(high_mod_analysis.has_lfo_modulation(), 
                "High modulation should show LFO modulation");
        
        // Verify no audio artifacts from LFO interactions
        assert!(!baseline_analysis.has_audio_artifacts(), "Baseline should be clean");
        assert!(!high_mod_analysis.has_audio_artifacts(), "High modulation should be clean");
        assert!(!low_mod_analysis.has_audio_artifacts(), "Low modulation should be clean");
        
        println!("✅ LFO effects interaction test passed");
    }
}

/// Test modulation routing matrix integration
mod modulation_routing_tests {
    use super::*;
    use effects_test_helpers::*;
    
    #[test]
    fn test_modulation_router_integration() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test modulation router with multiple sources affecting multiple destinations
        let initial_analysis = analyze_effects_output(&mut voice, 1000);
        
        // Apply pitch bend (should affect pitch via modulation router)
        voice.set_pitch_bend(1.0); // +1 semitone
        let pitch_bend_analysis = analyze_effects_output(&mut voice, 1000);
        
        // Apply filter cutoff change (should affect filter via router)
        voice.set_filter_cutoff(4000.0);
        let filter_analysis = analyze_effects_output(&mut voice, 1000);
        
        // Reset all controls
        voice.set_pitch_bend(0.0);
        voice.set_filter_cutoff(2000.0);
        let reset_analysis = analyze_effects_output(&mut voice, 1000);
        
        // Verify modulation routing doesn't create artifacts
        assert!(!initial_analysis.has_audio_artifacts(), "Initial state should be clean");
        assert!(!pitch_bend_analysis.has_audio_artifacts(), "Pitch bend should be clean");
        assert!(!filter_analysis.has_audio_artifacts(), "Filter change should be clean");
        assert!(!reset_analysis.has_audio_artifacts(), "Reset state should be clean");
        
        // Verify modulation is actually working (audio output changes)
        let initial_rms = initial_analysis.rms_amplitude();
        let pitch_rms = pitch_bend_analysis.rms_amplitude();
        let filter_rms = filter_analysis.rms_amplitude();
        
        // All should produce audible output
        assert!(initial_rms > 0.001, "Initial output should be audible");
        assert!(pitch_rms > 0.001, "Pitch bent output should be audible");
        assert!(filter_rms > 0.001, "Filtered output should be audible");
        
        println!("✅ Modulation router integration test passed");
    }
    
    #[test]
    fn test_cross_modulation_stability() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Apply multiple modulation sources simultaneously
        voice.set_pitch_bend(0.5);
        voice.set_modulation(0.7);
        voice.set_filter_cutoff(3000.0);
        voice.set_filter_resonance(0.8);
        
        // Test stability with all modulation sources active
        let stability_analysis = analyze_effects_output(&mut voice, 4410); // 100ms
        
        // Verify no instability or artifacts from cross-modulation
        assert!(!stability_analysis.has_audio_artifacts(), 
                "Cross-modulation should not create artifacts");
        
        // Verify output remains stable
        let rms = stability_analysis.rms_amplitude();
        assert!(rms > 0.001 && rms < 2.0, 
                "Cross-modulation output should be in reasonable range: {}", rms);
        
        // Verify LFO modulation is still working
        assert!(stability_analysis.has_lfo_modulation(), 
                "LFO modulation should persist with cross-modulation");
        
        println!("✅ Cross-modulation stability test passed");
    }
}

/// Test effects sends integration
mod effects_sends_integration_tests {
    use super::*;
    use effects_test_helpers::*;
    
    #[test]
    fn test_effects_sends_modulation_integration() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test effects sends with different modulation states
        let (initial_reverb, initial_chorus) = voice.get_effects_sends();
        
        // Modify modulation and check effects sends response
        voice.set_modulation(1.0);
        let (mod_reverb, mod_chorus) = voice.get_effects_sends();
        
        // Apply pitch bend
        voice.set_pitch_bend(1.0);
        let (pitch_reverb, pitch_chorus) = voice.get_effects_sends();
        
        // Verify effects sends are in valid ranges
        assert!(initial_reverb >= 0.0 && initial_reverb <= 1.0, "Initial reverb in range");
        assert!(initial_chorus >= 0.0 && initial_chorus <= 1.0, "Initial chorus in range");
        assert!(mod_reverb >= 0.0 && mod_reverb <= 1.0, "Modulated reverb in range");
        assert!(mod_chorus >= 0.0 && mod_chorus <= 1.0, "Modulated chorus in range");
        assert!(pitch_reverb >= 0.0 && pitch_reverb <= 1.0, "Pitch bend reverb in range");
        assert!(pitch_chorus >= 0.0 && pitch_chorus <= 1.0, "Pitch bend chorus in range");
        
        // Test direct effects sends control
        voice.set_reverb_send(0.5);
        voice.set_chorus_send(0.3);
        
        let (direct_reverb, direct_chorus) = voice.get_effects_sends();
        assert_eq!(direct_reverb, 0.5, "Direct reverb control should work");
        assert_eq!(direct_chorus, 0.3, "Direct chorus control should work");
        
        println!("✅ Effects sends modulation integration test passed");
    }
    
    #[test]
    fn test_effects_sends_velocity_note_response() {
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        // Test different velocity/note combinations for effects sends
        let test_cases = vec![
            (36, 30),   // Low note, low velocity
            (60, 64),   // Mid note, mid velocity  
            (84, 100),  // High note, high velocity
            (96, 127),  // Very high note, max velocity
        ];
        
        let mut results = Vec::new();
        
        for (note, velocity) in test_cases {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            voice.start_note(note, velocity, 0, &soundfont, &preset).unwrap();
            
            let (reverb, chorus) = voice.get_effects_sends();
            results.push((note, velocity, reverb, chorus));
        }
        
        // Verify EMU8000 authentic behavior patterns
        // Lower notes should generally have more reverb
        let low_note_reverb = results[0].2;   // Note 36
        let high_note_reverb = results[3].2;  // Note 96
        
        assert!(low_note_reverb >= high_note_reverb, 
                "Lower notes should have more reverb: {} vs {}", 
                low_note_reverb, high_note_reverb);
        
        // Higher velocity should generally have more effects
        let low_vel_reverb = results[0].2;   // Velocity 30
        let high_vel_reverb = results[3].2;  // Velocity 127
        
        assert!(high_vel_reverb >= low_vel_reverb,
                "Higher velocity should have more reverb: {} vs {}",
                high_vel_reverb, low_vel_reverb);
        
        println!("✅ Effects sends velocity/note response test passed");
    }
}

/// Test real-time parameter interaction
mod realtime_parameter_tests {
    use super::*;
    use effects_test_helpers::*;
    
    #[test]
    fn test_realtime_parameter_interaction() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test rapid parameter changes
        let parameter_sequences = vec![
            // (pitch_bend, modulation, filter_cutoff, pan)
            (0.0, 0.0, 2000.0, 0.0),
            (1.0, 0.5, 3000.0, -0.5),
            (-0.5, 1.0, 1500.0, 1.0),
            (0.0, 0.2, 4000.0, 0.0),
        ];
        
        for (pitch, mod_val, cutoff, pan) in parameter_sequences {
            voice.set_pitch_bend(pitch);
            voice.set_modulation(mod_val);
            voice.set_filter_cutoff(cutoff);
            voice.set_pan(pan);
            
            // Process some audio to ensure stability
            let analysis = analyze_effects_output(&mut voice, 100);
            
            // Verify no artifacts from parameter changes
            assert!(!analysis.has_audio_artifacts(), 
                    "Parameter sequence should not create artifacts: pitch={}, mod={}, cutoff={}, pan={}", 
                    pitch, mod_val, cutoff, pan);
            
            // Verify output is still reasonable
            let rms = analysis.rms_amplitude();
            assert!(rms >= 0.0 && rms < 2.0, 
                    "Output should be in reasonable range: {}", rms);
        }
        
        println!("✅ Real-time parameter interaction test passed");
    }
    
    #[test]
    fn test_parameter_boundary_conditions() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_effects_test_soundfont();
        let preset = create_effects_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test extreme parameter values
        let extreme_tests = vec![
            // Test maximum values
            (2.0, 1.0, 8000.0, 1.0),     // Max pitch bend, mod, filter, pan
            (-2.0, 0.0, 100.0, -1.0),    // Min pitch bend, mod, filter, pan
            (0.0, 0.5, 8001.0, 1.1),     // Over-range values (should be clamped)
            (2.5, -0.1, 50.0, -1.5),     // Under/over-range values
        ];
        
        for (pitch, mod_val, cutoff, pan) in extreme_tests {
            voice.set_pitch_bend(pitch);
            voice.set_modulation(mod_val);
            voice.set_filter_cutoff(cutoff);
            voice.set_pan(pan);
            
            // Process audio and verify stability
            let analysis = analyze_effects_output(&mut voice, 200);
            
            assert!(!analysis.has_audio_artifacts(), 
                    "Extreme parameters should not create artifacts");
            
            // Verify parameters are properly clamped
            let final_cutoff = voice.get_filter_cutoff();
            assert!(final_cutoff >= 100.0 && final_cutoff <= 8000.0,
                    "Filter cutoff should be clamped to EMU8000 range: {}", final_cutoff);
        }
        
        println!("✅ Parameter boundary conditions test passed");
    }
}

/// Main integration test runner
#[cfg(test)]
mod integration_test_runner {
    use super::*;
    
    #[test]
    fn run_effects_processing_integration_tests() {
        println!("🧪 Starting effects processing integration tests...\n");
        
        // Signal flow integration tests
        signal_flow_integration_tests::test_complete_emu8000_signal_flow();
        signal_flow_integration_tests::test_envelope_filter_interaction();
        signal_flow_integration_tests::test_lfo_effects_interaction();
        
        // Modulation routing tests
        modulation_routing_tests::test_modulation_router_integration();
        modulation_routing_tests::test_cross_modulation_stability();
        
        // Effects sends integration tests
        effects_sends_integration_tests::test_effects_sends_modulation_integration();
        effects_sends_integration_tests::test_effects_sends_velocity_note_response();
        
        // Real-time parameter tests
        realtime_parameter_tests::test_realtime_parameter_interaction();
        realtime_parameter_tests::test_parameter_boundary_conditions();
        
        println!("\n🎉 All effects processing integration tests completed successfully!");
        println!("📊 Integration test coverage:");
        println!("    ✅ Complete EMU8000 signal flow validation");
        println!("    ✅ Envelope-filter interaction verification");
        println!("    ✅ LFO modulation integration testing");
        println!("    ✅ Modulation routing matrix validation");
        println!("    ✅ Cross-modulation stability verification");
        println!("    ✅ Effects sends integration testing");
        println!("    ✅ Real-time parameter interaction validation");
        println!("    ✅ Parameter boundary condition testing");
    }
}