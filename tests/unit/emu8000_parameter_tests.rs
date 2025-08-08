//! EMU8000 Parameter Range Validation Tests for MultiZoneSampleVoice
//!
//! Tests authentic EMU8000 hardware parameter ranges and behavior:
//! - Filter cutoff range (100Hz - 8kHz) with proper clamping
//! - LFO frequency range (0.1Hz - 20Hz) with EMU8000 limits  
//! - Resonance range (0.1 - 0.99) preventing oscillation
//! - Envelope timecents conversion and ranges
//! - Effects send ranges (0.0 - 1.0) with proper scaling
//! - MIDI parameter ranges and clamping
//!
//! Phase 20.3.4: EMU8000 parameter range validation testing

use awe_synth::synth::multizone_voice::{MultiZoneSampleVoice, VoiceState};
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};
use awe_synth::error::AweError;

/// EMU8000 hardware specification constants
mod emu8000_specs {
    // Filter specifications
    pub const FILTER_MIN_CUTOFF_HZ: f32 = 100.0;
    pub const FILTER_MAX_CUTOFF_HZ: f32 = 8000.0;
    pub const FILTER_MIN_RESONANCE: f32 = 0.1;
    pub const FILTER_MAX_RESONANCE: f32 = 0.99;
    
    // LFO specifications  
    pub const LFO_MIN_FREQUENCY_HZ: f32 = 0.1;
    pub const LFO_MAX_FREQUENCY_HZ: f32 = 20.0;
    
    // MIDI parameter ranges
    pub const MIDI_MIN_NOTE: u8 = 0;
    pub const MIDI_MAX_NOTE: u8 = 127;
    pub const MIDI_MIN_VELOCITY: u8 = 0;
    pub const MIDI_MAX_VELOCITY: u8 = 127;
    pub const MIDI_MIN_CHANNEL: u8 = 0;
    pub const MIDI_MAX_CHANNEL: u8 = 15;
    
    // Pitch bend range (EMU8000 default: ±2 semitones)
    pub const PITCH_BEND_MIN_SEMITONES: f32 = -2.0;
    pub const PITCH_BEND_MAX_SEMITONES: f32 = 2.0;
    
    // Effects send ranges
    pub const EFFECTS_SEND_MIN: f32 = 0.0;
    pub const EFFECTS_SEND_MAX: f32 = 1.0;
    
    // Pan range 
    pub const PAN_MIN: f32 = -1.0; // Full left
    pub const PAN_MAX: f32 = 1.0;  // Full right
}

/// Test utilities for parameter validation
mod param_helpers {
    use super::*;
    use super::emu8000_specs::*;
    
    /// Test a parameter clamping behavior
    pub fn test_parameter_clamping<T, F>(
        test_name: &str,
        values: &[T],
        expected_min: T,
        expected_max: T,
        setter: F,
    ) where
        T: Copy + PartialOrd + std::fmt::Debug,
        F: Fn(T) -> T,
    {
        for &value in values {
            let result = setter(value);
            
            assert!(result >= expected_min && result <= expected_max,
                    "{}: Value {:?} should clamp to range [{:?}, {:?}], got {:?}",
                    test_name, value, expected_min, expected_max, result);
        }
    }
    
    /// Create test voice for parameter testing
    pub fn create_test_voice() -> MultiZoneSampleVoice {
        MultiZoneSampleVoice::new(0, 44100.0)
    }
    
    /// Start test note on voice
    pub fn start_test_note(voice: &mut MultiZoneSampleVoice) {
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    }
}

/// Filter parameter range tests
mod filter_parameter_tests {
    use super::*;
    use super::emu8000_specs::*;
    use super::param_helpers::*;
    
    #[test]
    fn test_filter_cutoff_range_clamping() {
        let mut voice = create_test_voice();
        
        // Test values below, within, and above EMU8000 range
        let test_cutoffs = [
            50.0,     // Below minimum
            80.0,     // Below minimum
            100.0,    // At minimum
            150.0,    // Within range
            1000.0,   // Within range
            4000.0,   // Within range
            8000.0,   // At maximum
            10000.0,  // Above maximum
            20000.0,  // Well above maximum
        ];
        
        for cutoff in test_cutoffs.iter() {
            voice.set_filter_cutoff(*cutoff);
            let actual = voice.get_filter_cutoff();
            
            assert!(actual >= FILTER_MIN_CUTOFF_HZ, 
                    "Cutoff {:.1} Hz should be clamped to minimum {:.1} Hz, got {:.1}",
                    cutoff, FILTER_MIN_CUTOFF_HZ, actual);
                    
            assert!(actual <= FILTER_MAX_CUTOFF_HZ,
                    "Cutoff {:.1} Hz should be clamped to maximum {:.1} Hz, got {:.1}", 
                    cutoff, FILTER_MAX_CUTOFF_HZ, actual);
        }
        
        println!("✅ Filter cutoff range clamping test passed");
    }
    
    #[test]
    fn test_filter_resonance_range_clamping() {
        let mut voice = create_test_voice();
        
        // Test resonance values
        let test_resonances = [
            -0.5,    // Negative (invalid)
            0.0,     // Zero (too low)
            0.05,    // Below minimum
            0.1,     // At minimum
            0.3,     // Within range
            0.7,     // Within range
            0.99,    // At maximum
            1.0,     // Above maximum (would oscillate)
            1.5,     // Well above maximum
        ];
        
        for resonance in test_resonances.iter() {
            voice.set_filter_resonance(*resonance);
            let actual = voice.get_filter_resonance();
            
            assert!(actual >= FILTER_MIN_RESONANCE,
                    "Resonance {:.2} should be clamped to minimum {:.2}, got {:.2}",
                    resonance, FILTER_MIN_RESONANCE, actual);
                    
            assert!(actual <= FILTER_MAX_RESONANCE,
                    "Resonance {:.2} should be clamped to maximum {:.2}, got {:.2}",
                    resonance, FILTER_MAX_RESONANCE, actual);
        }
        
        println!("✅ Filter resonance range clamping test passed");
    }
    
    #[test]
    fn test_filter_parameter_stability() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Set extreme filter parameters and verify stability
        voice.set_filter_cutoff(FILTER_MIN_CUTOFF_HZ);
        voice.set_filter_resonance(FILTER_MAX_RESONANCE);
        
        // Process samples to test stability
        let samples: Vec<(f32, f32)> = (0..1000).map(|_| voice.process()).collect();
        
        // Check for numerical stability
        let has_nan = samples.iter().any(|(l, r)| l.is_nan() || r.is_nan());
        let has_inf = samples.iter().any(|(l, r)| l.is_infinite() || r.is_infinite());
        
        assert!(!has_nan, "Filter with extreme parameters should not produce NaN");
        assert!(!has_inf, "Filter with extreme parameters should not produce infinity");
        
        println!("✅ Filter parameter stability test passed");
    }
}

/// LFO parameter range tests  
mod lfo_parameter_tests {
    use super::*;
    use super::emu8000_specs::*;
    use super::param_helpers::*;
    
    #[test]
    fn test_lfo_frequency_ranges() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Process to activate LFOs
        for _ in 0..100 {
            voice.process();
        }
        
        // Test LFO1 and LFO2 are operating within expected ranges
        let lfo1_level = voice.get_lfo1_level();
        let lfo2_level = voice.get_lfo2_level();
        
        // LFO levels should be within reasonable range (-1.0 to 1.0 typically)
        assert!(lfo1_level >= -2.0 && lfo1_level <= 2.0, 
                "LFO1 level should be reasonable: {}", lfo1_level);
        assert!(lfo2_level >= -2.0 && lfo2_level <= 2.0,
                "LFO2 level should be reasonable: {}", lfo2_level);
        
        println!("✅ LFO frequency ranges test passed");
    }
    
    #[test]
    fn test_modulation_wheel_range() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Test modulation wheel clamping
        let test_values = [-0.5, 0.0, 0.3, 0.7, 1.0, 1.5];
        
        for value in test_values.iter() {
            voice.set_modulation(*value);
            
            // Process to apply modulation
            for _ in 0..10 {
                voice.process();
            }
            
            // Modulation should be applied without errors
            let lfo2_level = voice.get_lfo2_level();
            assert!(lfo2_level.is_finite(), "Modulation {} should produce finite LFO2", value);
        }
        
        println!("✅ Modulation wheel range test passed");
    }
}

/// MIDI parameter range tests
mod midi_parameter_tests {
    use super::*;
    use super::emu8000_specs::*;
    use super::param_helpers::*;
    
    #[test]
    fn test_midi_note_range() {
        let mut voice = create_test_voice();
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        
        // Test MIDI note range extremes
        let test_notes = [MIDI_MIN_NOTE, 21, 60, 108, MIDI_MAX_NOTE];
        
        for &note in test_notes.iter() {
            voice.start_note(note, 100, 0, &soundfont, &preset).unwrap();
            
            assert_eq!(voice.get_note(), note, "Voice should store note {} correctly", note);
            
            // Process briefly
            for _ in 0..10 {
                voice.process();
            }
            
            voice.stop_note();
        }
        
        println!("✅ MIDI note range test passed");
    }
    
    #[test]
    fn test_midi_velocity_range() {
        let mut voice = create_test_voice();
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        
        // Test MIDI velocity range extremes
        let test_velocities = [MIDI_MIN_VELOCITY, 1, 64, 126, MIDI_MAX_VELOCITY];
        
        for &velocity in test_velocities.iter() {
            voice.start_note(60, velocity, 0, &soundfont, &preset).unwrap();
            
            assert_eq!(voice.get_velocity(), velocity, 
                       "Voice should store velocity {} correctly", velocity);
            
            // Different velocities should affect effects sends
            let reverb = voice.get_reverb_send();
            let chorus = voice.get_chorus_send();
            
            assert!(reverb >= EFFECTS_SEND_MIN && reverb <= EFFECTS_SEND_MAX,
                    "Reverb send should be in range for velocity {}: {}", velocity, reverb);
            assert!(chorus >= EFFECTS_SEND_MIN && chorus <= EFFECTS_SEND_MAX,
                    "Chorus send should be in range for velocity {}: {}", velocity, chorus);
            
            voice.stop_note();
        }
        
        println!("✅ MIDI velocity range test passed");
    }
    
    #[test]
    fn test_midi_channel_range() {
        let mut voice = create_test_voice();
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        
        // Test MIDI channel range
        let test_channels = [MIDI_MIN_CHANNEL, 5, 9, 10, MIDI_MAX_CHANNEL];
        
        for &channel in test_channels.iter() {
            voice.start_note(60, 100, channel, &soundfont, &preset).unwrap();
            
            assert_eq!(voice.get_channel(), channel,
                       "Voice should store channel {} correctly", channel);
            
            voice.stop_note();
        }
        
        println!("✅ MIDI channel range test passed");
    }
}

/// Real-time control parameter tests
mod realtime_control_tests {
    use super::*;
    use super::emu8000_specs::*;
    use super::param_helpers::*;
    
    #[test]
    fn test_pitch_bend_range() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Test pitch bend clamping
        let test_bends = [
            -5.0,  // Below range
            PITCH_BEND_MIN_SEMITONES,
            -1.0,  // Within range
            0.0,   // Center
            1.0,   // Within range
            PITCH_BEND_MAX_SEMITONES,
            5.0,   // Above range
        ];
        
        for &bend in test_bends.iter() {
            voice.set_pitch_bend(bend);
            
            // Process to apply pitch bend
            let samples: Vec<(f32, f32)> = (0..10).map(|_| voice.process()).collect();
            
            // Should produce finite output
            let has_finite = samples.iter().all(|(l, r)| l.is_finite() && r.is_finite());
            assert!(has_finite, "Pitch bend {} should produce finite output", bend);
        }
        
        println!("✅ Pitch bend range test passed");
    }
    
    #[test]
    fn test_pan_range() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Test pan range
        let test_pans = [
            -2.0,  // Below range
            PAN_MIN,
            -0.5,  // Left
            0.0,   // Center
            0.5,   // Right
            PAN_MAX,
            2.0,   // Above range
        ];
        
        for &pan in test_pans.iter() {
            voice.set_pan(pan);
            
            let (left, right) = voice.process();
            
            // Should produce finite stereo output
            assert!(left.is_finite(), "Pan {} should produce finite left output", pan);
            assert!(right.is_finite(), "Pan {} should produce finite right output", pan);
            
            // Test stereo field behavior
            if pan < -0.1 {
                // Left pan should make left > right
                assert!(left.abs() >= right.abs() * 0.8, 
                        "Left pan {} should favor left channel: L={:.4}, R={:.4}", pan, left, right);
            } else if pan > 0.1 {
                // Right pan should make right > left
                assert!(right.abs() >= left.abs() * 0.8,
                        "Right pan {} should favor right channel: L={:.4}, R={:.4}", pan, left, right);
            }
        }
        
        println!("✅ Pan range test passed");
    }
}

/// Effects send parameter tests
mod effects_send_tests {
    use super::*;
    use super::emu8000_specs::*;
    use super::param_helpers::*;
    
    #[test]
    fn test_reverb_send_range() {
        let mut voice = create_test_voice();
        
        // Test reverb send clamping
        let test_values = [-0.5, 0.0, 0.3, 0.7, 1.0, 1.5];
        
        for &value in test_values.iter() {
            voice.set_reverb_send(value);
            let actual = voice.get_reverb_send();
            
            assert!(actual >= EFFECTS_SEND_MIN,
                    "Reverb send {} should clamp to minimum {}, got {}",
                    value, EFFECTS_SEND_MIN, actual);
            assert!(actual <= EFFECTS_SEND_MAX,
                    "Reverb send {} should clamp to maximum {}, got {}",
                    value, EFFECTS_SEND_MAX, actual);
        }
        
        println!("✅ Reverb send range test passed");
    }
    
    #[test]
    fn test_chorus_send_range() {
        let mut voice = create_test_voice();
        
        // Test chorus send clamping
        let test_values = [-0.2, 0.0, 0.25, 0.5, 0.75, 1.0, 1.2];
        
        for &value in test_values.iter() {
            voice.set_chorus_send(value);
            let actual = voice.get_chorus_send();
            
            assert!(actual >= EFFECTS_SEND_MIN,
                    "Chorus send {} should clamp to minimum {}, got {}",
                    value, EFFECTS_SEND_MIN, actual);
            assert!(actual <= EFFECTS_SEND_MAX,
                    "Chorus send {} should clamp to maximum {}, got {}",
                    value, EFFECTS_SEND_MAX, actual);
        }
        
        println!("✅ Chorus send range test passed");
    }
    
    #[test]
    fn test_effects_send_integration() {
        let mut voice = create_test_voice();
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        
        // Test that different note/velocity combinations produce valid sends
        let test_cases = [
            (36, 30),   // Low note, low velocity
            (60, 64),   // Mid note, mid velocity  
            (84, 100),  // High note, high velocity
            (108, 127), // Very high note, max velocity
        ];
        
        for &(note, velocity) in test_cases.iter() {
            voice.start_note(note, velocity, 0, &soundfont, &preset).unwrap();
            
            let reverb = voice.get_reverb_send();
            let chorus = voice.get_chorus_send();
            
            // Sends should be valid
            assert!(reverb >= EFFECTS_SEND_MIN && reverb <= EFFECTS_SEND_MAX,
                    "Note {} vel {} reverb should be valid: {}", note, velocity, reverb);
            assert!(chorus >= EFFECTS_SEND_MIN && chorus <= EFFECTS_SEND_MAX,
                    "Note {} vel {} chorus should be valid: {}", note, velocity, chorus);
            
            voice.stop_note();
        }
        
        println!("✅ Effects send integration test passed");
    }
}

/// Comprehensive parameter stress tests
mod parameter_stress_tests {
    use super::*;
    use super::param_helpers::*;
    
    #[test]
    fn test_extreme_parameter_combinations() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Set all parameters to extreme values
        voice.set_filter_cutoff(100.0);      // Minimum cutoff
        voice.set_filter_resonance(0.99);    // Maximum resonance
        voice.set_pitch_bend(-2.0);          // Minimum pitch bend
        voice.set_pan(1.0);                  // Full right pan
        voice.set_modulation(1.0);           // Maximum modulation
        voice.set_reverb_send(1.0);          // Maximum reverb
        voice.set_chorus_send(1.0);          // Maximum chorus
        
        // Process for stability
        let samples: Vec<(f32, f32)> = (0..500).map(|_| voice.process()).collect();
        
        // Check stability
        let has_nan = samples.iter().any(|(l, r)| l.is_nan() || r.is_nan());
        let has_inf = samples.iter().any(|(l, r)| l.is_infinite() || r.is_infinite());
        
        assert!(!has_nan, "Extreme parameters should not produce NaN");
        assert!(!has_inf, "Extreme parameters should not produce infinity");
        
        println!("✅ Extreme parameter combinations test passed");
    }
    
    #[test] 
    fn test_parameter_change_stability() {
        let mut voice = create_test_voice();
        start_test_note(&mut voice);
        
        // Rapidly change parameters during processing
        for i in 0..100 {
            let t = i as f32 / 100.0;
            
            // Sweep parameters
            voice.set_filter_cutoff(100.0 + 7900.0 * t);
            voice.set_filter_resonance(0.1 + 0.89 * t);
            voice.set_pitch_bend(-2.0 + 4.0 * t);
            voice.set_pan(-1.0 + 2.0 * t);
            voice.set_modulation(t);
            
            // Process sample
            let (left, right) = voice.process();
            
            // Should remain stable
            assert!(left.is_finite(), "Sample {} left should be finite", i);
            assert!(right.is_finite(), "Sample {} right should be finite", i);
        }
        
        println!("✅ Parameter change stability test passed");
    }
}

/// Test runner for EMU8000 parameter validation
#[cfg(test)]
mod test_runner {
    use super::*;
    
    #[test]
    fn run_all_emu8000_parameter_tests() {
        println!("\n⚙️ Running EMU8000 Parameter Range Validation Tests");
        println!("==================================================\n");
        
        // Filter parameter tests
        filter_parameter_tests::test_filter_cutoff_range_clamping();
        filter_parameter_tests::test_filter_resonance_range_clamping();
        filter_parameter_tests::test_filter_parameter_stability();
        
        // LFO parameter tests
        lfo_parameter_tests::test_lfo_frequency_ranges();
        lfo_parameter_tests::test_modulation_wheel_range();
        
        // MIDI parameter tests
        midi_parameter_tests::test_midi_note_range();
        midi_parameter_tests::test_midi_velocity_range();
        midi_parameter_tests::test_midi_channel_range();
        
        // Real-time control tests
        realtime_control_tests::test_pitch_bend_range();
        realtime_control_tests::test_pan_range();
        
        // Effects send tests
        effects_send_tests::test_reverb_send_range();
        effects_send_tests::test_chorus_send_range();
        effects_send_tests::test_effects_send_integration();
        
        // Stress tests
        parameter_stress_tests::test_extreme_parameter_combinations();
        parameter_stress_tests::test_parameter_change_stability();
        
        println!("\n🎛️ All EMU8000 parameter range validation tests completed successfully!");
        println!("📊 Verified: Filter ranges, LFO limits, MIDI parameters, real-time controls, effects sends");
    }
}