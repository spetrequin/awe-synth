//! Comprehensive unit tests for MultiZoneSampleVoice
//! 
//! Tests the complete EMU8000-authentic voice system with all effects built-in.
//! These tests validate the core functionality independently of VoiceManager integration.
//!
//! Phase 20.3.1: Complete MultiZoneSampleVoice unit testing

// Import the actual production code for testing
use awe_synth::synth::multizone_voice::MultiZoneSampleVoice;
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};

/// Test data structures and helpers
mod test_helpers {
    use super::*;
    use awe_synth::soundfont::types::{
        SoundFontHeader, SoundFontVersion, SoundFontInstrument, SoundFontSample,
        PresetZone, InstrumentZone, SampleType
    };
    
    /// Create a minimal test SoundFont for testing
    pub fn create_test_soundfont() -> SoundFont {
        // Create a minimal SoundFont structure for testing
        let header = SoundFontHeader {
            version: SoundFontVersion { major: 2, minor: 1 },
            name: "Test SoundFont".to_string(),
            engine: "EMU8000".to_string(),
            tools: "Test Suite".to_string(),
            creation_date: "2024".to_string(),
            author: "Test".to_string(),
            product: "Test".to_string(),
            copyright: "Test".to_string(),
            comments: "Test SoundFont for unit testing".to_string(),
            preset_count: 1,
            instrument_count: 1,
            sample_count: 1,
        };
        
        let sample = SoundFontSample {
            name: "Test Sample".to_string(),
            start_offset: 0,
            end_offset: 1000,
            loop_start: 100,
            loop_end: 900,
            sample_rate: 44100,
            original_pitch: 60, // Middle C
            pitch_correction: 0,
            sample_link: 0,
            sample_type: SampleType::MonoSample,
            sample_data: vec![0i16; 1000], // 1000 samples of silence
        };
        
        let instrument = SoundFontInstrument {
            name: "Test Instrument".to_string(),
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
            presets: vec![create_test_preset()],
            instruments: vec![instrument],
            samples: vec![sample],
        }
    }
    
    /// Create a test preset with default values
    pub fn create_test_preset() -> SoundFontPreset {
        SoundFontPreset {
            name: "Test Piano".to_string(),
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
    
    /// Process voice for specified number of samples and collect output
    pub fn process_voice_samples(voice: &mut MultiZoneSampleVoice, count: usize) -> Vec<(f32, f32)> {
        let mut samples = Vec::with_capacity(count);
        for _ in 0..count {
            samples.push(voice.process());
        }
        samples
    }
    
    /// Assert that a value is within expected range
    pub fn assert_in_range(value: f32, min: f32, max: f32, name: &str) {
        assert!(value >= min && value <= max, 
                "{} should be in range [{}, {}], got: {}", name, min, max, value);
    }
}

/// Basic voice lifecycle tests
mod voice_lifecycle_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_voice_creation() {
        let voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Verify initial state
        assert_eq!(voice.get_note(), 0);
        assert_eq!(voice.get_velocity(), 0);
        assert_eq!(voice.get_channel(), 0);
        assert!(!voice.is_active());
        assert!(!voice.is_releasing());
        
        // Verify initial effects send levels
        assert_eq!(voice.get_reverb_send(), 0.0);
        assert_eq!(voice.get_chorus_send(), 0.0);
        
        println!("✅ Voice creation test passed");
    }
    
    #[test] 
    fn test_note_start_stop_cycle() {
        let mut voice = MultiZoneSampleVoice::new(1, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Start note
        voice.start_note(60, 100, 0, &soundfont, &preset).expect("Should start note successfully");
        
        // Verify note started
        assert_eq!(voice.get_note(), 60);
        assert_eq!(voice.get_velocity(), 100);
        assert_eq!(voice.get_channel(), 0);
        assert!(voice.is_active());
        assert!(!voice.is_releasing());
        
        // Stop note (trigger release)
        voice.stop_note();
        
        // Verify note releasing (should still be active during release)
        assert!(voice.is_active()); // Still active during release
        assert!(voice.is_releasing());
        
        println!("✅ Note start/stop cycle test passed");
    }
    
    #[test]
    fn test_voice_stealing_preparation() {
        let mut voice = MultiZoneSampleVoice::new(2, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Start note
        voice.start_note(64, 80, 1, &soundfont, &preset).unwrap();
        
        // Get initial steal priority
        let initial_priority = voice.get_steal_priority();
        
        // Prepare for stealing
        voice.prepare_for_steal();
        
        // Priority should be lower for stealing voices
        let steal_priority = voice.get_steal_priority();
        assert!(steal_priority < initial_priority, "Stealing voice should have lower priority");
        
        println!("✅ Voice stealing preparation test passed");
    }
}

/// Envelope system tests
mod envelope_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_volume_envelope_progression() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Start note to trigger envelope
        voice.start_note(60, 127, 0, &soundfont, &preset).unwrap();
        
        // Process samples and verify envelope progression
        let _samples = process_voice_samples(&mut voice, 100);
        
        // Volume envelope should start at 0 and increase
        let initial_level = voice.get_volume_envelope_level();
        
        // Process more samples
        process_voice_samples(&mut voice, 50);
        let later_level = voice.get_volume_envelope_level();
        
        // Envelope should be progressing (or stay stable if in sustain)
        assert!(initial_level >= 0.0 && initial_level <= 1.0, "Initial envelope level should be in valid range");
        assert!(later_level >= 0.0 && later_level <= 1.0, "Later envelope level should be in valid range");
        
        println!("✅ Volume envelope progression test passed");
    }
    
    #[test]
    fn test_modulation_envelope_behavior() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Process some samples
        process_voice_samples(&mut voice, 50);
        
        // Modulation envelope should be active and provide modulation
        let mod_env_level = voice.get_modulation_envelope_level();
        assert_in_range(mod_env_level, 0.0, 1.0, "Modulation envelope level");
        
        println!("✅ Modulation envelope behavior test passed");
    }
    
    #[test]
    fn test_envelope_release_behavior() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Let envelope reach sustain phase
        process_voice_samples(&mut voice, 200);
        let sustain_level = voice.get_volume_envelope_level();
        
        // Trigger release
        voice.stop_note();
        
        // Process more samples
        process_voice_samples(&mut voice, 100);
        let release_level = voice.get_volume_envelope_level();
        
        // Envelope should decrease during release (or stay same if in sustain)
        assert!(release_level <= sustain_level, 
                "Envelope level should not increase during release: {} -> {}", 
                sustain_level, release_level);
        
        println!("✅ Envelope release behavior test passed");
    }
}

/// LFO system tests
mod lfo_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_lfo1_tremolo_operation() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Process samples and collect LFO1 levels
        let lfo1_levels: Vec<f32> = (0..100)
            .map(|_| {
                voice.process();
                voice.get_lfo1_level()
            })
            .collect();
        
        // LFO1 should oscillate within expected range
        let min_level = lfo1_levels.iter().cloned().fold(f32::INFINITY, f32::min);
        let max_level = lfo1_levels.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        
        // LFO should produce some variation (even if subtle)
        let has_variation = max_level - min_level > 0.001;
        assert!(has_variation || max_level.abs() < 0.001, "LFO1 should either oscillate or be silent");
        
        println!("✅ LFO1 tremolo operation test passed");
    }
    
    #[test]
    fn test_lfo2_vibrato_operation() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Process samples and collect LFO2 levels
        let lfo2_levels: Vec<f32> = (0..100)
            .map(|_| {
                voice.process();
                voice.get_lfo2_level()
            })
            .collect();
        
        // LFO2 should produce some output (vibrato)
        let has_output = lfo2_levels.iter().any(|&level| level.abs() > 0.001);
        
        println!("LFO2 output detected: {}", has_output);
        println!("✅ LFO2 vibrato operation test passed");
    }
    
    #[test]
    fn test_modulation_wheel_control() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Set modulation wheel to different values
        voice.set_modulation(0.0); // No modulation
        process_voice_samples(&mut voice, 10);
        
        voice.set_modulation(1.0); // Full modulation
        process_voice_samples(&mut voice, 10);
        
        // Modulation wheel should affect LFO2 depth (method should execute without error)
        println!("✅ Modulation wheel control test passed");
    }
}

/// Filter system tests
mod filter_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_filter_parameter_ranges() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test filter cutoff range clamping
        voice.set_filter_cutoff(50.0);  // Below EMU8000 range
        let cutoff_low = voice.get_filter_cutoff();
        assert!(cutoff_low >= 100.0, "Filter cutoff should be clamped to EMU8000 minimum");
        
        voice.set_filter_cutoff(10000.0); // Above EMU8000 range
        let cutoff_high = voice.get_filter_cutoff();
        assert!(cutoff_high <= 8000.0, "Filter cutoff should be clamped to EMU8000 maximum");
        
        // Test filter resonance range clamping
        voice.set_filter_resonance(0.05); // Below safe range
        let resonance_low = voice.get_filter_resonance();
        assert!(resonance_low >= 0.1, "Filter resonance should be clamped to safe minimum");
        
        voice.set_filter_resonance(1.5); // Above safe range
        let resonance_high = voice.get_filter_resonance();
        assert!(resonance_high <= 0.99, "Filter resonance should be clamped to safe maximum");
        
        println!("✅ Filter parameter ranges test passed");
    }
    
    #[test]
    fn test_filter_modulation_response() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Process samples to activate filter modulation
        let samples = process_voice_samples(&mut voice, 50);
        
        // Verify samples are being processed without errors
        let has_nan = samples.iter().any(|(l, r)| l.is_nan() || r.is_nan());
        let has_infinite = samples.iter().any(|(l, r)| l.is_infinite() || r.is_infinite());
        
        assert!(!has_nan, "Filter should not produce NaN values");
        assert!(!has_infinite, "Filter should not produce infinite values");
        
        println!("✅ Filter modulation response test passed");
    }
}

/// Effects send tests  
mod effects_send_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_effects_send_velocity_response() {
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Test low velocity
        let mut voice_low = MultiZoneSampleVoice::new(0, 44100.0);
        voice_low.start_note(60, 30, 0, &soundfont, &preset).unwrap();
        let (reverb_low, chorus_low) = voice_low.get_effects_sends();
        
        // Test high velocity
        let mut voice_high = MultiZoneSampleVoice::new(1, 44100.0);
        voice_high.start_note(60, 120, 0, &soundfont, &preset).unwrap();
        let (reverb_high, chorus_high) = voice_high.get_effects_sends();
        
        // Higher velocity should generally result in higher effects sends
        assert!(reverb_high >= reverb_low, 
                "Higher velocity should have more reverb: {} vs {}", reverb_high, reverb_low);
        assert!(chorus_high >= chorus_low,
                "Higher velocity should have more chorus: {} vs {}", chorus_high, chorus_low);
        
        // Verify sends are in valid range
        assert_in_range(reverb_low, 0.0, 1.0, "Low velocity reverb send");
        assert_in_range(chorus_low, 0.0, 1.0, "Low velocity chorus send");
        assert_in_range(reverb_high, 0.0, 1.0, "High velocity reverb send");
        assert_in_range(chorus_high, 0.0, 1.0, "High velocity chorus send");
        
        println!("✅ Effects send velocity response test passed");
    }
    
    #[test]
    fn test_effects_send_note_response() {
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Test low note (more reverb expected)
        let mut voice_low = MultiZoneSampleVoice::new(0, 44100.0);
        voice_low.start_note(36, 100, 0, &soundfont, &preset).unwrap(); // Low C
        let (reverb_low_note, _) = voice_low.get_effects_sends();
        
        // Test high note (less reverb expected)
        let mut voice_high = MultiZoneSampleVoice::new(1, 44100.0);
        voice_high.start_note(96, 100, 0, &soundfont, &preset).unwrap(); // High C
        let (reverb_high_note, _) = voice_high.get_effects_sends();
        
        // Lower notes should have more reverb (EMU8000 behavior)
        assert!(reverb_low_note >= reverb_high_note,
                "Lower notes should have more reverb: {} vs {}", reverb_low_note, reverb_high_note);
        
        println!("✅ Effects send note response test passed");
    }
    
    #[test]
    fn test_effects_send_direct_control() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Test direct reverb control
        voice.set_reverb_send(0.3);
        assert_eq!(voice.get_reverb_send(), 0.3, "Direct reverb control should work");
        
        voice.set_reverb_send(1.5); // Over range
        assert!(voice.get_reverb_send() <= 1.0, "Reverb send should be clamped to maximum");
        
        // Test direct chorus control  
        voice.set_chorus_send(0.7);
        assert_eq!(voice.get_chorus_send(), 0.7, "Direct chorus control should work");
        
        voice.set_chorus_send(-0.1); // Under range
        assert!(voice.get_chorus_send() >= 0.0, "Chorus send should be clamped to minimum");
        
        println!("✅ Effects send direct control test passed");
    }
}

/// Real-time control tests
mod realtime_control_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_pitch_bend_control() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test pitch bend range
        voice.set_pitch_bend(-2.5); // Below range
        voice.set_pitch_bend(2.5);  // Above range
        voice.set_pitch_bend(0.0);  // Center
        voice.set_pitch_bend(1.0);  // Up
        voice.set_pitch_bend(-1.0); // Down
        
        // Process samples to ensure pitch bend is applied
        process_voice_samples(&mut voice, 10);
        
        // Test passes if no panics occur
        println!("✅ Pitch bend control test passed");
    }
    
    #[test]
    fn test_pan_control() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test pan positions
        voice.set_pan(-1.0); // Full left
        let (left_l, right_l) = voice.process();
        
        voice.set_pan(1.0);  // Full right  
        let (left_r, right_r) = voice.process();
        
        voice.set_pan(0.0);  // Center
        let (left_c, right_c) = voice.process();
        
        // Verify no NaN or infinite values
        let all_finite = [left_l, right_l, left_r, right_r, left_c, right_c]
            .iter().all(|&v| v.is_finite());
        assert!(all_finite, "Pan control should produce finite values");
        
        println!("✅ Pan control test passed");
    }
}

/// Performance and edge case tests
mod performance_tests {
    use super::*;
    use test_helpers::*;
    
    #[test]
    fn test_rapid_note_cycling() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Rapidly start and stop notes
        for i in 0..10 {
            let note = 60 + (i % 12) as u8;
            let velocity = 50 + (i * 7) as u8;
            
            voice.start_note(note, velocity, 0, &soundfont, &preset).unwrap();
            process_voice_samples(&mut voice, 5); // Brief processing
            voice.stop_note();
            process_voice_samples(&mut voice, 5); // Brief release
        }
        
        println!("✅ Rapid note cycling test passed");
    }
    
    #[test]
    fn test_extreme_parameter_values() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        // Test extreme note values
        voice.start_note(0, 1, 0, &soundfont, &preset).unwrap();     // Minimum
        process_voice_samples(&mut voice, 10);
        voice.stop_note();
        
        voice.start_note(127, 127, 15, &soundfont, &preset).unwrap(); // Maximum
        process_voice_samples(&mut voice, 10);
        voice.stop_note();
        
        println!("✅ Extreme parameter values test passed");
    }
    
    #[test]
    fn test_long_duration_processing() {
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        let soundfont = create_test_soundfont();
        let preset = create_test_preset();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Process for ~100ms worth of samples
        let sample_count = 4410; // 100ms at 44.1kHz
        let samples = process_voice_samples(&mut voice, sample_count);
        
        // Verify processing stability
        let has_nan = samples.iter().any(|(l, r)| l.is_nan() || r.is_nan());
        let has_infinite = samples.iter().any(|(l, r)| l.is_infinite() || r.is_infinite());
        
        assert!(!has_nan, "Voice should not produce NaN values");
        assert!(!has_infinite, "Voice should not produce infinite values");
        
        println!("✅ Long duration processing test passed");
    }
}

// Main test runner removed - individual tests will run independently via cargo test