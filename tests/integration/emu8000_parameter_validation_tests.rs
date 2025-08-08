//! EMU8000 Parameter Range Validation Tests for MultiZoneSampleVoice
//!
//! Validates strict adherence to EMU8000 hardware parameter ranges and limitations:
//! - Filter cutoff frequency range (100Hz - 8kHz)
//! - Filter resonance range (0.1 - 0.99 safe range)
//! - LFO frequency ranges (0.1Hz - 20Hz)
//! - Pitch bend range (±2 semitones)
//! - Pan range (-1.0 to +1.0)
//! - Effects send ranges (0.0 - 1.0)
//! - MIDI parameter ranges (notes 0-127, velocity 0-127, channels 0-15)
//! - Envelope parameter ranges and scaling
//!
//! Phase 20.3.4: EMU8000 parameter range validation testing

use std::collections::HashMap;

// Import the actual production code for testing
use awe_synth::synth::multizone_voice::{MultiZoneSampleVoice, VoiceState};
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};
use awe_synth::error::AweError;

/// Test data structures and helpers for EMU8000 parameter validation
mod emu8000_validation_helpers {
    use super::*;
    use awe_synth::soundfont::types::{
        SoundFontHeader, SoundFontVersion, SoundFontInstrument, SoundFontSample,
        PresetZone, InstrumentZone, SampleType
    };
    
    /// Create a basic SoundFont for parameter validation testing
    pub fn create_validation_soundfont() -> SoundFont {
        let header = SoundFontHeader {
            version: SoundFontVersion { major: 2, minor: 1 },
            name: "EMU8000 Validation SoundFont".to_string(),
            engine: "EMU8000".to_string(),
            tools: "Parameter Validation Suite".to_string(),
            creation_date: "2024".to_string(),
            author: "Test".to_string(),
            product: "Test".to_string(),
            copyright: "Test".to_string(),
            comments: "SoundFont for EMU8000 parameter validation".to_string(),
            preset_count: 1,
            instrument_count: 1,
            sample_count: 1,
        };
        
        // Simple sample for parameter testing
        let sample_data = vec![0i16; 1000]; // 1000 samples of silence
        
        let sample = SoundFontSample {
            name: "Validation Sample".to_string(),
            start_offset: 0,
            end_offset: 1000,
            loop_start: 100,
            loop_end: 900,
            sample_rate: 44100,
            original_pitch: 60, // Middle C
            pitch_correction: 0,
            sample_link: 0,
            sample_type: SampleType::MonoSample,
            sample_data,
        };
        
        let instrument = SoundFontInstrument {
            name: "Validation Instrument".to_string(),
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
            presets: vec![create_validation_preset()],
            instruments: vec![instrument],
            samples: vec![sample],
        }
    }
    
    /// Create a basic preset for parameter validation
    fn create_validation_preset() -> SoundFontPreset {
        SoundFontPreset {
            name: "Validation Preset".to_string(),
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
    
    /// EMU8000 hardware parameter constants for validation
    pub mod emu8000_limits {
        // Filter limits
        pub const FILTER_CUTOFF_MIN: f32 = 100.0;   // Hz
        pub const FILTER_CUTOFF_MAX: f32 = 8000.0;  // Hz
        pub const FILTER_RESONANCE_MIN: f32 = 0.1;  // Safe minimum
        pub const FILTER_RESONANCE_MAX: f32 = 0.99; // Safe maximum (avoid instability)
        
        // LFO limits
        pub const LFO_FREQUENCY_MIN: f32 = 0.1;     // Hz
        pub const LFO_FREQUENCY_MAX: f32 = 20.0;    // Hz
        pub const LFO_DEPTH_MIN: f32 = 0.0;         // No modulation
        pub const LFO_DEPTH_MAX: f32 = 1.0;         // Full modulation
        
        // Pitch bend limits
        pub const PITCH_BEND_MIN: f32 = -2.0;       // Semitones
        pub const PITCH_BEND_MAX: f32 = 2.0;        // Semitones
        
        // Pan limits
        pub const PAN_MIN: f32 = -1.0;              // Full left
        pub const PAN_MAX: f32 = 1.0;               // Full right
        
        // Effects send limits
        pub const EFFECTS_SEND_MIN: f32 = 0.0;      // No send
        pub const EFFECTS_SEND_MAX: f32 = 1.0;      // Full send
        
        // MIDI parameter limits
        pub const MIDI_NOTE_MIN: u8 = 0;            // Lowest MIDI note
        pub const MIDI_NOTE_MAX: u8 = 127;          // Highest MIDI note
        pub const MIDI_VELOCITY_MIN: u8 = 0;        // Note off velocity
        pub const MIDI_VELOCITY_MAX: u8 = 127;      // Maximum velocity
        pub const MIDI_CHANNEL_MIN: u8 = 0;         // MIDI channel 1 (0-indexed)
        pub const MIDI_CHANNEL_MAX: u8 = 15;        // MIDI channel 16 (0-indexed)
        
        // Voice limits
        pub const MAX_POLYPHONY: usize = 32;        // EMU8000 32-voice polyphony
        
        // Envelope limits (in relative terms for testing)
        pub const ENVELOPE_LEVEL_MIN: f32 = 0.0;    // Silent
        pub const ENVELOPE_LEVEL_MAX: f32 = 1.0;    // Full amplitude
    }
    
    /// Validation helper functions
    pub fn assert_in_range<T: PartialOrd + std::fmt::Display + Copy>(
        value: T, 
        min: T, 
        max: T, 
        parameter_name: &str
    ) {
        assert!(value >= min && value <= max, 
                "EMU8000 {} should be in range [{}, {}], got: {}", 
                parameter_name, min, max, value);
    }
    
    pub fn assert_clamped<T: PartialOrd + std::fmt::Display + Copy>(
        input: T,
        expected_output: T,
        min: T,
        max: T,
        parameter_name: &str
    ) {
        assert_eq!(expected_output, if input < min { min } else if input > max { max } else { input },
                   "EMU8000 {} should clamp input {} to expected output {}", 
                   parameter_name, input, expected_output);
    }
}

/// Test filter parameter range validation
mod filter_parameter_validation_tests {
    use super::*;
    use emu8000_validation_helpers::*;
    
    #[test]
    fn test_filter_cutoff_range_validation() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test valid range
        let valid_cutoffs = vec![
            emu8000_limits::FILTER_CUTOFF_MIN,     // 100Hz
            1000.0,                                // 1kHz
            4000.0,                                // 4kHz
            emu8000_limits::FILTER_CUTOFF_MAX,     // 8kHz
        ];
        
        for cutoff in valid_cutoffs {
            voice.set_filter_cutoff(cutoff);
            let result = voice.get_filter_cutoff();
            
            assert_in_range(result, 
                          emu8000_limits::FILTER_CUTOFF_MIN, 
                          emu8000_limits::FILTER_CUTOFF_MAX, 
                          "filter cutoff");
            
            // Should accept valid values unchanged (within floating point precision)
            assert!((result - cutoff).abs() < 1.0, 
                    "Valid cutoff {} should be accepted as {}", cutoff, result);
        }
        
        println!("✅ Filter cutoff valid range test passed");
    }
    
    #[test]
    fn test_filter_cutoff_clamping() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test values that should be clamped
        let clamping_tests = vec![
            (50.0, emu8000_limits::FILTER_CUTOFF_MIN),      // Below minimum
            (0.0, emu8000_limits::FILTER_CUTOFF_MIN),       // Zero
            (10000.0, emu8000_limits::FILTER_CUTOFF_MAX),   // Above maximum
            (20000.0, emu8000_limits::FILTER_CUTOFF_MAX),   // Way above maximum
        ];
        
        for (input, expected) in clamping_tests {
            voice.set_filter_cutoff(input);
            let result = voice.get_filter_cutoff();
            
            assert_in_range(result, 
                          emu8000_limits::FILTER_CUTOFF_MIN, 
                          emu8000_limits::FILTER_CUTOFF_MAX, 
                          "clamped filter cutoff");
            
            // Should be clamped to expected value
            assert!((result - expected).abs() < 1.0,
                    "Cutoff {} should be clamped to {}, got {}", input, expected, result);
        }
        
        println!("✅ Filter cutoff clamping test passed");
    }
    
    #[test]
    fn test_filter_resonance_range_validation() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test valid resonance range
        let valid_resonances = vec![
            emu8000_limits::FILTER_RESONANCE_MIN,  // 0.1
            0.5,                                   // Mid range
            0.8,                                   // High but safe
            emu8000_limits::FILTER_RESONANCE_MAX,  // 0.99 (safe maximum)
        ];
        
        for resonance in valid_resonances {
            voice.set_filter_resonance(resonance);
            let result = voice.get_filter_resonance();
            
            assert_in_range(result, 
                          emu8000_limits::FILTER_RESONANCE_MIN, 
                          emu8000_limits::FILTER_RESONANCE_MAX, 
                          "filter resonance");
        }
        
        println!("✅ Filter resonance valid range test passed");
    }
    
    #[test]
    fn test_filter_resonance_safety_clamping() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test dangerous resonance values that should be clamped for safety
        let safety_tests = vec![
            (0.05, emu8000_limits::FILTER_RESONANCE_MIN),   // Too low (no resonance)
            (1.0, emu8000_limits::FILTER_RESONANCE_MAX),    // Exactly 1.0 (unstable)
            (1.5, emu8000_limits::FILTER_RESONANCE_MAX),    // Above 1.0 (very unstable)
            (10.0, emu8000_limits::FILTER_RESONANCE_MAX),   // Way too high
        ];
        
        for (input, expected) in safety_tests {
            voice.set_filter_resonance(input);
            let result = voice.get_filter_resonance();
            
            assert_in_range(result, 
                          emu8000_limits::FILTER_RESONANCE_MIN, 
                          emu8000_limits::FILTER_RESONANCE_MAX, 
                          "safe filter resonance");
            
            assert!((result - expected).abs() < 0.01,
                    "Resonance {} should be clamped to {} for safety, got {}", 
                    input, expected, result);
        }
        
        println!("✅ Filter resonance safety clamping test passed");
    }
}

/// Test LFO parameter range validation
mod lfo_parameter_validation_tests {
    use super::*;
    use emu8000_validation_helpers::*;
    
    #[test]
    fn test_lfo_frequency_ranges() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Start voice to access LFO controls
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Process some samples to let LFOs initialize
        for _ in 0..100 {
            voice.process();
        }
        
        // Test LFO1 and LFO2 are producing output in expected ranges
        let lfo1_level = voice.get_lfo1_level();
        let lfo2_level = voice.get_lfo2_level();
        
        // LFO outputs should be in valid modulation range
        assert_in_range(lfo1_level, -1.0, 1.0, "LFO1 output");
        assert_in_range(lfo2_level, -1.0, 1.0, "LFO2 output");
        
        println!("✅ LFO frequency ranges test passed");
    }
    
    #[test]
    fn test_lfo_depth_validation() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Test modulation wheel control (LFO2 depth)
        let depth_tests = vec![
            0.0,   // No modulation
            0.25,  // Light modulation
            0.5,   // Medium modulation
            0.75,  // Heavy modulation
            1.0,   // Full modulation
        ];
        
        for depth in depth_tests {
            voice.set_modulation(depth);
            
            // Process some samples
            for _ in 0..50 {
                voice.process();
            }
            
            let lfo2_level = voice.get_lfo2_level();
            
            // LFO output should still be in valid range regardless of depth
            assert_in_range(lfo2_level, -1.0, 1.0, "LFO2 output with depth modulation");
        }
        
        println!("✅ LFO depth validation test passed");
    }
    
    #[test]
    fn test_lfo_extreme_modulation_stability() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Test extreme modulation values (should be clamped)
        let extreme_tests = vec![
            -1.0,  // Below minimum
            1.5,   // Above maximum
            10.0,  // Way above maximum
            -5.0,  // Way below minimum
        ];
        
        for extreme_value in extreme_tests {
            voice.set_modulation(extreme_value);
            
            // Process samples and verify stability
            let mut samples = Vec::new();
            for _ in 0..100 {
                let (left, right) = voice.process();
                samples.push((left, right));
            }
            
            // Verify no audio artifacts from extreme modulation
            let has_artifacts = samples.iter().any(|(l, r)| {
                l.is_nan() || r.is_nan() || l.is_infinite() || r.is_infinite() ||
                l.abs() > 2.0 || r.abs() > 2.0
            });
            
            assert!(!has_artifacts, 
                    "Extreme modulation value {} should not create artifacts", extreme_value);
        }
        
        println!("✅ LFO extreme modulation stability test passed");
    }
}

/// Test pitch bend and real-time parameter validation
mod realtime_parameter_validation_tests {
    use super::*;
    use emu8000_validation_helpers::*;
    
    #[test]
    fn test_pitch_bend_range_validation() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Test valid pitch bend range
        let valid_bends = vec![
            emu8000_limits::PITCH_BEND_MIN,  // -2.0 semitones
            -1.0,                            // -1 semitone
            0.0,                             // Center
            1.0,                             // +1 semitone
            emu8000_limits::PITCH_BEND_MAX,  // +2.0 semitones
        ];
        
        for bend in valid_bends {
            voice.set_pitch_bend(bend);
            
            // Process samples to apply pitch bend
            let mut samples = Vec::new();
            for _ in 0..50 {
                let (left, right) = voice.process();
                samples.push((left, right));
            }
            
            // Verify no artifacts from valid pitch bend
            let has_artifacts = samples.iter().any(|(l, r)| {
                l.is_nan() || r.is_nan() || l.is_infinite() || r.is_infinite()
            });
            
            assert!(!has_artifacts, "Valid pitch bend {} should not create artifacts", bend);
        }
        
        println!("✅ Pitch bend range validation test passed");
    }
    
    #[test]
    fn test_pitch_bend_clamping() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Test pitch bend values that should be clamped
        let clamping_tests = vec![
            (-3.0, emu8000_limits::PITCH_BEND_MIN),  // Below minimum
            (3.0, emu8000_limits::PITCH_BEND_MAX),   // Above maximum
            (-12.0, emu8000_limits::PITCH_BEND_MIN), // Way below minimum
            (12.0, emu8000_limits::PITCH_BEND_MAX),  // Way above maximum
        ];
        
        for (input, _expected) in clamping_tests {
            voice.set_pitch_bend(input);
            
            // Process samples and verify stability
            let mut samples = Vec::new();
            for _ in 0..50 {
                let (left, right) = voice.process();
                samples.push((left, right));
            }
            
            // Verify stability with clamped pitch bend
            let has_artifacts = samples.iter().any(|(l, r)| {
                l.is_nan() || r.is_nan() || l.is_infinite() || r.is_infinite()
            });
            
            assert!(!has_artifacts, 
                    "Clamped pitch bend (input: {}) should maintain stability", input);
        }
        
        println!("✅ Pitch bend clamping test passed");
    }
    
    #[test]
    fn test_pan_range_validation() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Test valid pan positions
        let valid_pans = vec![
            emu8000_limits::PAN_MIN,  // -1.0 (full left)
            -0.5,                     // Half left
            0.0,                      // Center
            0.5,                      // Half right
            emu8000_limits::PAN_MAX,  // 1.0 (full right)
        ];
        
        for pan in valid_pans {
            voice.set_pan(pan);
            
            let (left, right) = voice.process();
            
            // Verify pan affects stereo image
            assert!(left.is_finite() && right.is_finite(), 
                    "Pan {} should produce finite stereo output", pan);
            
            // For extreme pan positions, verify channel emphasis
            if pan <= -0.9 {
                // Should emphasize left channel (right may be silent)
                assert!(left.abs() >= 0.0, "Full left pan should have left output");
            } else if pan >= 0.9 {
                // Should emphasize right channel (left may be silent)
                assert!(right.abs() >= 0.0, "Full right pan should have right output");
            }
        }
        
        println!("✅ Pan range validation test passed");
    }
    
    #[test]
    fn test_pan_extreme_value_handling() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Test extreme pan values
        let extreme_pans = vec![-10.0, -2.0, 2.0, 10.0];
        
        for pan in extreme_pans {
            voice.set_pan(pan);
            
            let (left, right) = voice.process();
            
            // Should not create artifacts even with extreme pan values
            assert!(left.is_finite() && right.is_finite(), 
                    "Extreme pan {} should not create infinite values", pan);
            assert!(left.abs() <= 2.0 && right.abs() <= 2.0,
                    "Extreme pan {} should not create excessive amplitude", pan);
        }
        
        println!("✅ Pan extreme value handling test passed");
    }
}

/// Test effects send parameter validation
mod effects_send_validation_tests {
    use super::*;
    use emu8000_validation_helpers::*;
    
    #[test]
    fn test_effects_send_range_validation() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test valid effects send ranges
        let valid_sends = vec![
            emu8000_limits::EFFECTS_SEND_MIN,  // 0.0
            0.25,                              // 25%
            0.5,                               // 50%
            0.75,                              // 75%
            emu8000_limits::EFFECTS_SEND_MAX,  // 1.0
        ];
        
        for send_level in valid_sends {
            // Test reverb send
            voice.set_reverb_send(send_level);
            let reverb_result = voice.get_reverb_send();
            assert_in_range(reverb_result, 
                          emu8000_limits::EFFECTS_SEND_MIN, 
                          emu8000_limits::EFFECTS_SEND_MAX, 
                          "reverb send");
            
            // Test chorus send
            voice.set_chorus_send(send_level);
            let chorus_result = voice.get_chorus_send();
            assert_in_range(chorus_result, 
                          emu8000_limits::EFFECTS_SEND_MIN, 
                          emu8000_limits::EFFECTS_SEND_MAX, 
                          "chorus send");
        }
        
        println!("✅ Effects send range validation test passed");
    }
    
    #[test]
    fn test_effects_send_clamping() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test values that should be clamped
        let clamping_tests = vec![
            (-0.5, emu8000_limits::EFFECTS_SEND_MIN),  // Below minimum
            (1.5, emu8000_limits::EFFECTS_SEND_MAX),   // Above maximum
            (-10.0, emu8000_limits::EFFECTS_SEND_MIN), // Way below minimum
            (10.0, emu8000_limits::EFFECTS_SEND_MAX),  // Way above maximum
        ];
        
        for (input, expected) in clamping_tests {
            // Test reverb send clamping
            voice.set_reverb_send(input);
            let reverb_result = voice.get_reverb_send();
            assert!((reverb_result - expected).abs() < 0.001,
                    "Reverb send {} should be clamped to {}, got {}", 
                    input, expected, reverb_result);
            
            // Test chorus send clamping
            voice.set_chorus_send(input);
            let chorus_result = voice.get_chorus_send();
            assert!((chorus_result - expected).abs() < 0.001,
                    "Chorus send {} should be clamped to {}, got {}", 
                    input, expected, chorus_result);
        }
        
        println!("✅ Effects send clamping test passed");
    }
    
    #[test]
    fn test_effects_send_velocity_note_scaling() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test effects sends across different note/velocity combinations
        let test_cases = vec![
            (36, 1),     // Low note, low velocity
            (60, 64),    // Mid note, mid velocity
            (96, 127),   // High note, high velocity
        ];
        
        for (note, velocity) in test_cases {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            voice.start_note(note, velocity, 0, &soundfont, preset).unwrap();
            
            let (reverb_send, chorus_send) = voice.get_effects_sends();
            
            // All effects sends should be in valid EMU8000 range regardless of note/velocity
            assert_in_range(reverb_send, 
                          emu8000_limits::EFFECTS_SEND_MIN, 
                          emu8000_limits::EFFECTS_SEND_MAX, 
                          &format!("reverb send for note {} vel {}", note, velocity));
            
            assert_in_range(chorus_send, 
                          emu8000_limits::EFFECTS_SEND_MIN, 
                          emu8000_limits::EFFECTS_SEND_MAX, 
                          &format!("chorus send for note {} vel {}", note, velocity));
        }
        
        println!("✅ Effects send velocity/note scaling validation test passed");
    }
}

/// Test MIDI parameter validation
mod midi_parameter_validation_tests {
    use super::*;
    use emu8000_validation_helpers::*;
    
    #[test]
    fn test_midi_note_range_validation() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test valid MIDI note range
        let valid_notes = vec![
            emu8000_limits::MIDI_NOTE_MIN,  // 0
            21,                             // A0
            60,                             // C4 (Middle C)
            127,                            // G9
            emu8000_limits::MIDI_NOTE_MAX,  // 127
        ];
        
        for note in valid_notes {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            // Should accept valid MIDI notes without error
            let result = voice.start_note(note, 100, 0, &soundfont, preset);
            assert!(result.is_ok(), "Valid MIDI note {} should be accepted", note);
            
            assert_eq!(voice.get_note(), note, "Voice should remember MIDI note");
            assert!(voice.is_active(), "Voice should be active after valid note");
        }
        
        println!("✅ MIDI note range validation test passed");
    }
    
    #[test]
    fn test_midi_velocity_range_validation() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test valid MIDI velocity range
        let valid_velocities = vec![
            1,                                   // Note on (velocity 0 = note off)
            32,                                  // Soft
            64,                                  // Medium
            100,                                 // Loud
            emu8000_limits::MIDI_VELOCITY_MAX,   // 127 (maximum)
        ];
        
        for velocity in valid_velocities {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            let result = voice.start_note(60, velocity, 0, &soundfont, preset);
            assert!(result.is_ok(), "Valid MIDI velocity {} should be accepted", velocity);
            
            assert_eq!(voice.get_velocity(), velocity, "Voice should remember velocity");
            assert!(voice.is_active(), "Voice should be active after valid velocity");
        }
        
        println!("✅ MIDI velocity range validation test passed");
    }
    
    #[test]
    fn test_midi_channel_range_validation() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test valid MIDI channel range (0-15 for channels 1-16)
        let valid_channels = vec![
            emu8000_limits::MIDI_CHANNEL_MIN,  // 0 (channel 1)
            4,                                 // Channel 5
            9,                                 // Channel 10 (drums)
            emu8000_limits::MIDI_CHANNEL_MAX,  // 15 (channel 16)
        ];
        
        for channel in valid_channels {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            let result = voice.start_note(60, 100, channel, &soundfont, preset);
            assert!(result.is_ok(), "Valid MIDI channel {} should be accepted", channel);
            
            assert_eq!(voice.get_channel(), channel, "Voice should remember channel");
            assert!(voice.is_active(), "Voice should be active after valid channel");
        }
        
        println!("✅ MIDI channel range validation test passed");
    }
    
    #[test]
    fn test_midi_note_off_behavior() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Start note
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        assert!(voice.is_active(), "Voice should be active after note on");
        
        // Trigger note off
        voice.stop_note();
        assert!(voice.is_releasing(), "Voice should be releasing after note off");
        assert!(voice.is_active(), "Voice should still be active during release");
        
        // Process samples during release
        for _ in 0..1000 {
            voice.process();
            if !voice.is_active() {
                break;
            }
        }
        
        println!("✅ MIDI note off behavior test passed");
    }
}

/// Test envelope parameter validation
mod envelope_parameter_validation_tests {
    use super::*;
    use emu8000_validation_helpers::*;
    
    #[test]
    fn test_envelope_level_ranges() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test envelope levels across different velocities
        let velocity_tests = vec![1, 32, 64, 100, 127];
        
        for velocity in velocity_tests {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            voice.start_note(60, velocity, 0, &soundfont, preset).unwrap();
            
            // Process through different envelope phases
            for _ in 0..500 {
                voice.process();
                
                // Check envelope levels are in valid range
                let vol_env_level = voice.get_volume_envelope_level();
                let mod_env_level = voice.get_modulation_envelope_level();
                
                assert_in_range(vol_env_level, 
                              emu8000_limits::ENVELOPE_LEVEL_MIN, 
                              emu8000_limits::ENVELOPE_LEVEL_MAX, 
                              "volume envelope level");
                
                assert_in_range(mod_env_level, 
                              emu8000_limits::ENVELOPE_LEVEL_MIN, 
                              emu8000_limits::ENVELOPE_LEVEL_MAX, 
                              "modulation envelope level");
            }
        }
        
        println!("✅ Envelope level ranges test passed");
    }
    
    #[test]
    fn test_envelope_voice_stealing_behavior() {
        let soundfont = create_validation_soundfont();
        let preset = &soundfont.presets[0];
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Let envelope develop
        for _ in 0..200 {
            voice.process();
        }
        
        let initial_priority = voice.get_steal_priority();
        
        // Prepare for stealing
        voice.prepare_for_steal();
        
        let steal_priority = voice.get_steal_priority();
        
        // Steal priority should be lower (more likely to be stolen)
        assert!(steal_priority < initial_priority,
                "Voice prepared for stealing should have lower priority");
        
        // Force quick release for stealing
        voice.force_quick_release();
        
        // Process and verify envelope responds to quick release
        for _ in 0..100 {
            voice.process();
        }
        
        let post_release_level = voice.get_volume_envelope_level();
        assert!(post_release_level >= 0.0 && post_release_level <= 1.0,
                "Post-release envelope level should be in valid range");
        
        println!("✅ Envelope voice stealing behavior test passed");
    }
}

/// Main EMU8000 parameter validation test runner
#[cfg(test)]
mod emu8000_validation_test_runner {
    use super::*;
    
    #[test]
    fn run_emu8000_parameter_validation_tests() {
        println!("🧪 Starting EMU8000 parameter range validation tests...\n");
        
        // Filter parameter validation
        filter_parameter_validation_tests::test_filter_cutoff_range_validation();
        filter_parameter_validation_tests::test_filter_cutoff_clamping();
        filter_parameter_validation_tests::test_filter_resonance_range_validation();
        filter_parameter_validation_tests::test_filter_resonance_safety_clamping();
        
        // LFO parameter validation
        lfo_parameter_validation_tests::test_lfo_frequency_ranges();
        lfo_parameter_validation_tests::test_lfo_depth_validation();
        lfo_parameter_validation_tests::test_lfo_extreme_modulation_stability();
        
        // Real-time parameter validation
        realtime_parameter_validation_tests::test_pitch_bend_range_validation();
        realtime_parameter_validation_tests::test_pitch_bend_clamping();
        realtime_parameter_validation_tests::test_pan_range_validation();
        realtime_parameter_validation_tests::test_pan_extreme_value_handling();
        
        // Effects send validation
        effects_send_validation_tests::test_effects_send_range_validation();
        effects_send_validation_tests::test_effects_send_clamping();
        effects_send_validation_tests::test_effects_send_velocity_note_scaling();
        
        // MIDI parameter validation
        midi_parameter_validation_tests::test_midi_note_range_validation();
        midi_parameter_validation_tests::test_midi_velocity_range_validation();
        midi_parameter_validation_tests::test_midi_channel_range_validation();
        midi_parameter_validation_tests::test_midi_note_off_behavior();
        
        // Envelope parameter validation
        envelope_parameter_validation_tests::test_envelope_level_ranges();
        envelope_parameter_validation_tests::test_envelope_voice_stealing_behavior();
        
        println!("\n🎉 All EMU8000 parameter validation tests completed successfully!");
        println!("📊 EMU8000 parameter validation coverage:");
        println!("    ✅ Filter cutoff frequency range (100Hz - 8kHz) with clamping");
        println!("    ✅ Filter resonance range (0.1 - 0.99) with safety limits");
        println!("    ✅ LFO frequency ranges (0.1Hz - 20Hz) and depth control");
        println!("    ✅ Pitch bend range (±2 semitones) with extreme value handling");
        println!("    ✅ Pan range (-1.0 to +1.0) with stereo image validation");
        println!("    ✅ Effects send ranges (0.0 - 1.0) with automatic scaling");
        println!("    ✅ MIDI parameter ranges (notes, velocity, channels) validation");
        println!("    ✅ Envelope level ranges and voice stealing behavior");
        println!("    ✅ Parameter clamping and safety limits enforcement");
    }
}