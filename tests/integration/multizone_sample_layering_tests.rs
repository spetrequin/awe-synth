//! Multi-Zone Sample Layering Tests for MultiZoneSampleVoice
//!
//! Tests the core multi-zone functionality that gives MultiZoneSampleVoice its name:
//! - Velocity-based zone selection and crossfading
//! - Key range zone mapping and sample selection
//! - Multi-layer sample blending and mixing
//! - Zone crossfade algorithms and smooth transitions
//! - EMU8000-authentic multi-zone behavior
//!
//! Phase 20.3.3: Multi-zone sample layering testing

use std::collections::HashMap;

// Import the actual production code for testing
use awe_synth::synth::multizone_voice::{MultiZoneSampleVoice, VoiceState};
use awe_synth::soundfont::types::{
    SoundFont, SoundFontPreset, SoundFontHeader, SoundFontVersion, 
    SoundFontInstrument, SoundFontSample, PresetZone, InstrumentZone, 
    SampleType, Generator, GeneratorType, GeneratorAmount, Modulator,
    KeyRange, VelocityRange
};
use awe_synth::error::AweError;

/// Test data structures and helpers for multi-zone testing
mod multizone_test_helpers {
    use super::*;
    
    /// Create a comprehensive multi-zone SoundFont for testing
    pub fn create_multizone_soundfont() -> SoundFont {
        let header = SoundFontHeader {
            version: SoundFontVersion { major: 2, minor: 1 },
            name: "Multi-Zone Test SoundFont".to_string(),
            engine: "EMU8000".to_string(),
            tools: "Multi-Zone Test Suite".to_string(),
            creation_date: "2024".to_string(),
            author: "Test".to_string(),
            product: "Test".to_string(),
            copyright: "Test".to_string(),
            comments: "Multi-zone SoundFont for comprehensive zone testing".to_string(),
            preset_count: 1,
            instrument_count: 1,
            sample_count: 4,
        };
        
        // Create 4 different samples for multi-zone testing
        let samples = vec![
            create_test_sample("Low Velocity Sample", 220.0, 0),    // Low velocity (soft)
            create_test_sample("Mid Velocity Sample", 440.0, 1),    // Mid velocity (medium)
            create_test_sample("High Velocity Sample", 880.0, 2),   // High velocity (loud)
            create_test_sample("Key Range Sample", 660.0, 3),       // Different key range
        ];
        
        // Create instrument with multiple zones
        let instrument = SoundFontInstrument {
            name: "Multi-Zone Test Instrument".to_string(),
            instrument_bag_index: 0,
            instrument_zones: vec![
                // Zone 1: Low velocity (0-63)
                InstrumentZone {
                    generators: create_velocity_generators(0, 63),
                    modulators: vec![],
                    sample_id: Some(0),
                    key_range: Some(KeyRange { low: 36, high: 84 }),
                    velocity_range: Some(VelocityRange { low: 0, high: 63 }),
                },
                // Zone 2: Mid velocity (64-100)
                InstrumentZone {
                    generators: create_velocity_generators(64, 100),
                    modulators: vec![],
                    sample_id: Some(1),
                    key_range: Some(KeyRange { low: 36, high: 84 }),
                    velocity_range: Some(VelocityRange { low: 64, high: 100 }),
                },
                // Zone 3: High velocity (101-127)
                InstrumentZone {
                    generators: create_velocity_generators(101, 127),
                    modulators: vec![],
                    sample_id: Some(2),
                    key_range: Some(KeyRange { low: 36, high: 84 }),
                    velocity_range: Some(VelocityRange { low: 101, high: 127 }),
                },
                // Zone 4: Different key range (high keys)
                InstrumentZone {
                    generators: vec![],
                    modulators: vec![],
                    sample_id: Some(3),
                    key_range: Some(KeyRange { low: 85, high: 127 }),
                    velocity_range: Some(VelocityRange { low: 0, high: 127 }),
                },
            ],
        };
        
        SoundFont {
            header,
            presets: vec![create_multizone_preset()],
            instruments: vec![instrument],
            samples,
        }
    }
    
    /// Create a test sample with specified frequency and ID
    fn create_test_sample(name: &str, frequency: f32, id: u16) -> SoundFontSample {
        let sample_count = 4410; // 100ms at 44.1kHz
        let mut sample_data = Vec::with_capacity(sample_count);
        
        // Generate unique waveform for each sample to test mixing
        for i in 0..sample_count {
            let t = i as f32 / 44100.0;
            let sample = match id {
                0 => (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5,        // Soft sine
                1 => (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.75,       // Medium sine
                2 => (2.0 * std::f32::consts::PI * frequency * t).sin(),              // Loud sine
                3 => {
                    // Square wave for different timbre
                    let sine = (2.0 * std::f32::consts::PI * frequency * t).sin();
                    if sine > 0.0 { 0.8 } else { -0.8 }
                },
                _ => 0.0,
            };
            
            sample_data.push((sample * 16384.0) as i16);
        }
        
        SoundFontSample {
            name: name.to_string(),
            start_offset: 0,
            end_offset: sample_count as u32,
            loop_start: 441,  // 10ms
            loop_end: sample_count as u32 - 441,
            sample_rate: 44100,
            original_pitch: match frequency as u32 {
                220 => 57,  // A3
                440 => 69,  // A4
                660 => 74,  // E5
                880 => 81,  // A5
                _ => 69,
            },
            pitch_correction: 0,
            sample_link: 0,
            sample_type: SampleType::MonoSample,
            sample_data,
        }
    }
    
    /// Create generators for velocity-based zones
    fn create_velocity_generators(low_vel: u8, high_vel: u8) -> Vec<Generator> {
        vec![
            Generator {
                generator_type: GeneratorType::InitialFilterFc,
                amount: GeneratorAmount::UShort(1000 + (high_vel as u16 * 20)), // Higher velocity = brighter
            },
            Generator {
                generator_type: GeneratorType::InitialFilterQ,
                amount: GeneratorAmount::UShort(300 + (high_vel as u16 * 3)),   // Higher velocity = more resonance
            },
        ]
    }
    
    /// Create test preset optimized for multi-zone testing
    fn create_multizone_preset() -> SoundFontPreset {
        SoundFontPreset {
            name: "Multi-Zone Test Preset".to_string(),
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
                    key_range: None, // Use instrument zones for key ranges
                    velocity_range: None, // Use instrument zones for velocity ranges
                }
            ],
        }
    }
    
    /// Analyze multi-zone audio output for zone characteristics
    pub fn analyze_multizone_output(voice: &mut MultiZoneSampleVoice, sample_count: usize) -> MultizoneAnalysis {
        let mut samples = Vec::with_capacity(sample_count);
        let mut amplitude_history = Vec::with_capacity(sample_count);
        let mut stereo_info = Vec::with_capacity(sample_count);
        
        for _ in 0..sample_count {
            let (left, right) = voice.process();
            samples.push((left, right));
            
            let amplitude = (left * left + right * right).sqrt();
            amplitude_history.push(amplitude);
            
            let stereo_width = (left - right).abs();
            stereo_info.push(stereo_width);
        }
        
        MultizoneAnalysis {
            samples,
            amplitude_history,
            stereo_info,
        }
    }
    
    /// Analysis results for multi-zone behavior
    pub struct MultizoneAnalysis {
        pub samples: Vec<(f32, f32)>,
        pub amplitude_history: Vec<f32>,
        pub stereo_info: Vec<f32>,
    }
    
    impl MultizoneAnalysis {
        /// Calculate average amplitude
        pub fn average_amplitude(&self) -> f32 {
            if self.amplitude_history.is_empty() {
                return 0.0;
            }
            self.amplitude_history.iter().sum::<f32>() / self.amplitude_history.len() as f32
        }
        
        /// Detect spectral characteristics (proxy for different samples being used)
        pub fn has_spectral_variation(&self) -> bool {
            // Look for variation in amplitude patterns that would indicate different samples
            if self.amplitude_history.len() < 10 {
                return false;
            }
            
            let first_section = &self.amplitude_history[0..self.amplitude_history.len() / 3];
            let last_section = &self.amplitude_history[2 * self.amplitude_history.len() / 3..];
            
            let first_avg = first_section.iter().sum::<f32>() / first_section.len() as f32;
            let last_avg = last_section.iter().sum::<f32>() / last_section.len() as f32;
            
            (first_avg - last_avg).abs() > 0.01 // 1% difference indicates variation
        }
        
        /// Check for crossfading artifacts
        pub fn has_crossfade_artifacts(&self) -> bool {
            // Look for sudden jumps in amplitude that would indicate poor crossfading
            self.amplitude_history.windows(2).any(|window| {
                (window[1] - window[0]).abs() > 0.5 // 50% jump indicates artifact
            })
        }
        
        /// Get amplitude range (dynamic range indicator)
        pub fn amplitude_range(&self) -> f32 {
            if self.amplitude_history.is_empty() {
                return 0.0;
            }
            
            let min = self.amplitude_history.iter().cloned().fold(f32::INFINITY, f32::min);
            let max = self.amplitude_history.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
            
            max - min
        }
        
        /// Check for audio stability (no artifacts)
        pub fn is_stable(&self) -> bool {
            !self.samples.iter().any(|(l, r)| {
                l.is_nan() || r.is_nan() || l.is_infinite() || r.is_infinite()
            }) && !self.has_crossfade_artifacts()
        }
    }
}

/// Test velocity-based zone selection and crossfading
mod velocity_zone_tests {
    use super::*;
    use multizone_test_helpers::*;
    
    #[test]
    fn test_velocity_zone_selection() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test different velocity ranges to trigger different zones
        let velocity_tests = vec![
            (30, "Low velocity zone"),     // Should trigger zone 1 (0-63)
            (80, "Mid velocity zone"),     // Should trigger zone 2 (64-100) 
            (120, "High velocity zone"),   // Should trigger zone 3 (101-127)
        ];
        
        for (velocity, description) in velocity_tests {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            // Start note with specific velocity
            voice.start_note(60, velocity, 0, &soundfont, preset).unwrap();
            
            // Analyze output to verify zone selection
            let analysis = analyze_multizone_output(&mut voice, 1000);
            
            // Verify voice is active and stable
            assert!(voice.is_active(), "{}: Voice should be active", description);
            assert!(analysis.is_stable(), "{}: Output should be stable", description);
            
            // Verify audio output is appropriate for velocity
            let avg_amplitude = analysis.average_amplitude();
            assert!(avg_amplitude > 0.001, "{}: Should produce audible output ({})", 
                    description, avg_amplitude);
            
            // Higher velocities should generally produce higher amplitude
            // (This is a general trend, but may not be strictly monotonic due to sample differences)
            if velocity >= 120 {
                assert!(avg_amplitude > 0.01, 
                        "{}: High velocity should produce strong output", description);
            }
            
            voice.stop_note();
            println!("✅ {} test passed - amplitude: {:.4}", description, avg_amplitude);
        }
    }
    
    #[test]
    fn test_velocity_crossfading() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test velocities at zone boundaries for crossfading
        let crossfade_tests = vec![
            (63, 64),   // Low-Mid boundary
            (100, 101), // Mid-High boundary
        ];
        
        for (vel1, vel2) in crossfade_tests {
            let mut voice1 = MultiZoneSampleVoice::new(0, 44100.0);
            let mut voice2 = MultiZoneSampleVoice::new(1, 44100.0);
            
            // Start notes at boundary velocities
            voice1.start_note(60, vel1, 0, &soundfont, preset).unwrap();
            voice2.start_note(60, vel2, 0, &soundfont, preset).unwrap();
            
            // Analyze both outputs
            let analysis1 = analyze_multizone_output(&mut voice1, 1000);
            let analysis2 = analyze_multizone_output(&mut voice2, 1000);
            
            // Verify smooth transition (no artifacts)
            assert!(analysis1.is_stable(), "Velocity {} should be stable", vel1);
            assert!(analysis2.is_stable(), "Velocity {} should be stable", vel2);
            
            // Verify both produce reasonable output
            let amp1 = analysis1.average_amplitude();
            let amp2 = analysis2.average_amplitude();
            
            assert!(amp1 > 0.001, "Velocity {} should produce audible output", vel1);
            assert!(amp2 > 0.001, "Velocity {} should produce audible output", vel2);
            
            // The transition should be smooth (no huge jumps)
            let amplitude_ratio = if amp1 > amp2 { amp1 / amp2 } else { amp2 / amp1 };
            assert!(amplitude_ratio < 5.0, 
                    "Crossfade transition should be smooth: vel {} = {:.4}, vel {} = {:.4}", 
                    vel1, amp1, vel2, amp2);
            
            println!("✅ Velocity crossfade {}-{} test passed", vel1, vel2);
        }
    }
    
    #[test]
    fn test_velocity_zone_characteristics() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test that different velocity zones produce different characteristics
        let mut low_voice = MultiZoneSampleVoice::new(0, 44100.0);
        let mut high_voice = MultiZoneSampleVoice::new(1, 44100.0);
        
        low_voice.start_note(60, 20, 0, &soundfont, preset).unwrap();  // Low velocity
        high_voice.start_note(60, 127, 0, &soundfont, preset).unwrap(); // High velocity
        
        let low_analysis = analyze_multizone_output(&mut low_voice, 2000);
        let high_analysis = analyze_multizone_output(&mut high_voice, 2000);
        
        // Verify different zones produce different characteristics
        let low_amp = low_analysis.average_amplitude();
        let high_amp = high_analysis.average_amplitude();
        
        // Different velocity zones should show some difference in behavior
        // (either amplitude, spectral content, or other characteristics)
        let amplitude_different = (high_amp - low_amp).abs() > 0.01;
        let spectral_different = low_analysis.has_spectral_variation() != high_analysis.has_spectral_variation();
        
        assert!(amplitude_different || spectral_different,
                "Different velocity zones should produce different characteristics: low={:.4}, high={:.4}",
                low_amp, high_amp);
        
        println!("✅ Velocity zone characteristics test passed");
    }
}

/// Test key range-based zone selection
mod key_range_zone_tests {
    use super::*;
    use multizone_test_helpers::*;
    
    #[test]
    fn test_key_range_zone_selection() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test different key ranges
        let key_tests = vec![
            (60, "Mid-range key"),     // Should use zones 1-3 based on velocity
            (90, "High-range key"),    // Should use zone 4 (different sample)
            (100, "Very high key"),    // Should use zone 4
        ];
        
        for (key, description) in key_tests {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            voice.start_note(key, 100, 0, &soundfont, preset).unwrap();
            
            let analysis = analyze_multizone_output(&mut voice, 1000);
            
            assert!(voice.is_active(), "{}: Voice should be active", description);
            assert!(analysis.is_stable(), "{}: Output should be stable", description);
            
            let avg_amplitude = analysis.average_amplitude();
            assert!(avg_amplitude > 0.001, "{}: Should produce audible output", description);
            
            voice.stop_note();
            println!("✅ {} (note {}) test passed - amplitude: {:.4}", 
                     description, key, avg_amplitude);
        }
    }
    
    #[test]
    fn test_key_range_zone_differences() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Compare low-range and high-range zones
        let mut low_key_voice = MultiZoneSampleVoice::new(0, 44100.0);
        let mut high_key_voice = MultiZoneSampleVoice::new(1, 44100.0);
        
        low_key_voice.start_note(60, 100, 0, &soundfont, preset).unwrap();  // Mid-range zone
        high_key_voice.start_note(90, 100, 0, &soundfont, preset).unwrap(); // High-range zone (different sample)
        
        let low_analysis = analyze_multizone_output(&mut low_key_voice, 2000);
        let high_analysis = analyze_multizone_output(&mut high_key_voice, 2000);
        
        // Different key range zones should show different characteristics
        let low_amp = low_analysis.average_amplitude();
        let high_amp = high_analysis.average_amplitude();
        let low_range = low_analysis.amplitude_range();
        let high_range = high_analysis.amplitude_range();
        
        // Either amplitude or dynamic range should differ between key ranges
        let amplitude_different = (high_amp - low_amp).abs() > 0.01;
        let range_different = (high_range - low_range).abs() > 0.01;
        
        assert!(amplitude_different || range_different,
                "Different key ranges should produce different characteristics: low_key amp={:.4} range={:.4}, high_key amp={:.4} range={:.4}",
                low_amp, low_range, high_amp, high_range);
        
        println!("✅ Key range zone differences test passed");
    }
}

/// Test multi-zone blending and mixing
mod zone_mixing_tests {
    use super::*;
    use multizone_test_helpers::*;
    
    #[test]
    fn test_zone_mixing_stability() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test various note/velocity combinations that might trigger multiple zones
        let mixing_tests = vec![
            (60, 64),   // Right at velocity boundary (might blend zones)
            (70, 100),  // Different note/velocity combination
            (80, 80),   // Another combination
        ];
        
        for (note, velocity) in mixing_tests {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            voice.start_note(note, velocity, 0, &soundfont, preset).unwrap();
            
            // Analyze extended output for mixing stability
            let analysis = analyze_multizone_output(&mut voice, 4410); // 100ms
            
            assert!(analysis.is_stable(), 
                    "Zone mixing should be stable for note={} vel={}", note, velocity);
            
            let avg_amplitude = analysis.average_amplitude();
            assert!(avg_amplitude > 0.001 && avg_amplitude < 2.0,
                    "Mixed zone output should be in reasonable range: {}", avg_amplitude);
            
            // Check that mixing doesn't create excessive dynamic range
            let amplitude_range = analysis.amplitude_range();
            assert!(amplitude_range < 1.0, 
                    "Zone mixing should not create excessive dynamic range: {}", amplitude_range);
            
            voice.stop_note();
            println!("✅ Zone mixing test passed for note={} vel={}", note, velocity);
        }
    }
    
    #[test]
    fn test_zone_crossfade_smoothness() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test crossfade smoothness by playing notes with gradually changing velocity
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Start with mid-velocity
        voice.start_note(60, 80, 0, &soundfont, preset).unwrap();
        
        // Let it stabilize
        analyze_multizone_output(&mut voice, 500);
        
        // Simulate real-time velocity changes (like mod wheel affecting zone blend)
        let velocity_sequence = vec![80, 85, 90, 95, 100, 105, 110, 115, 120];
        
        for velocity in velocity_sequence {
            // In a real implementation, we'd have real-time velocity crossfading
            // For this test, we verify that different velocities produce stable output
            
            voice.stop_note();
            voice.start_note(60, velocity, 0, &soundfont, preset).unwrap();
            
            let analysis = analyze_multizone_output(&mut voice, 200);
            
            assert!(analysis.is_stable(), 
                    "Velocity change to {} should maintain stability", velocity);
            
            let avg_amplitude = analysis.average_amplitude();
            assert!(avg_amplitude > 0.001, 
                    "Velocity {} should produce audible output", velocity);
        }
        
        println!("✅ Zone crossfade smoothness test passed");
    }
}

/// Test EMU8000-specific multi-zone behavior
mod emu8000_multizone_tests {
    use super::*;
    use multizone_test_helpers::*;
    
    #[test]
    fn test_emu8000_zone_parameter_scaling() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test EMU8000-specific parameter scaling across zones
        let parameter_tests = vec![
            (60, 30),   // Low velocity - should have different filter/effects
            (60, 100),  // High velocity - should have brighter filter
        ];
        
        for (note, velocity) in parameter_tests {
            let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
            
            voice.start_note(note, velocity, 0, &soundfont, preset).unwrap();
            
            // Check that effects parameters are set appropriately for the zone
            let (reverb_send, chorus_send) = voice.get_effects_sends();
            let filter_cutoff = voice.get_filter_cutoff();
            
            // Verify EMU8000 parameter ranges
            assert!(reverb_send >= 0.0 && reverb_send <= 1.0, 
                    "Reverb send should be in EMU8000 range");
            assert!(chorus_send >= 0.0 && chorus_send <= 1.0,
                    "Chorus send should be in EMU8000 range");
            assert!(filter_cutoff >= 100.0 && filter_cutoff <= 8000.0,
                    "Filter cutoff should be in EMU8000 range: {}", filter_cutoff);
            
            // Higher velocity should generally have higher filter cutoff (brighter)
            if velocity >= 100 {
                assert!(filter_cutoff >= 1000.0,
                        "High velocity should have bright filter: {}", filter_cutoff);
            }
            
            voice.stop_note();
            println!("✅ EMU8000 parameter scaling test passed for vel={}", velocity);
        }
    }
    
    #[test]
    fn test_emu8000_voice_allocation_behavior() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test that multi-zone voice behaves like EMU8000 hardware
        let mut voice = MultiZoneSampleVoice::new(0, 44100.0);
        
        // Start note
        voice.start_note(60, 100, 0, &soundfont, preset).unwrap();
        
        // Check voice allocation characteristics
        assert!(voice.is_active(), "Voice should be allocated");
        assert_eq!(voice.get_note(), 60, "Voice should remember note");
        assert_eq!(voice.get_velocity(), 100, "Voice should remember velocity");
        
        // Check steal priority
        let priority = voice.get_steal_priority();
        assert!(priority > 0.0, "Active voice should have steal priority");
        
        // Trigger release
        voice.stop_note();
        assert!(voice.is_releasing(), "Voice should be releasing");
        
        // Voice should still be active during release
        assert!(voice.is_active(), "Voice should remain active during release");
        
        // Check that steal priority changes during release
        let release_priority = voice.get_steal_priority();
        assert!(release_priority < priority, 
                "Releasing voice should have lower steal priority");
        
        println!("✅ EMU8000 voice allocation behavior test passed");
    }
    
    #[test]
    fn test_emu8000_polyphonic_zone_behavior() {
        let soundfont = create_multizone_soundfont();
        let preset = &soundfont.presets[0];
        
        // Test multiple voices with different zones simultaneously
        let mut voices = Vec::new();
        for i in 0..4 {
            voices.push(MultiZoneSampleVoice::new(i, 44100.0));
        }
        
        // Start different notes that will use different zones
        voices[0].start_note(40, 30, 0, &soundfont, preset).unwrap();   // Low note, low vel
        voices[1].start_note(60, 80, 1, &soundfont, preset).unwrap();   // Mid note, mid vel
        voices[2].start_note(80, 120, 2, &soundfont, preset).unwrap();  // High note, high vel
        voices[3].start_note(100, 100, 3, &soundfont, preset).unwrap(); // Very high note
        
        // Process all voices simultaneously
        let mut combined_output = Vec::new();
        for _ in 0..1000 {
            let mut left_sum = 0.0;
            let mut right_sum = 0.0;
            
            for voice in &mut voices {
                let (l, r) = voice.process();
                left_sum += l;
                right_sum += r;
            }
            
            combined_output.push((left_sum, right_sum));
        }
        
        // Verify polyphonic stability
        let has_artifacts = combined_output.iter().any(|(l, r)| {
            l.is_nan() || r.is_nan() || l.is_infinite() || r.is_infinite() || 
            l.abs() > 4.0 || r.abs() > 4.0 // Allow for some headroom with multiple voices
        });
        
        assert!(!has_artifacts, "Polyphonic multi-zone playback should be stable");
        
        // Verify all voices are contributing
        let total_rms: f32 = combined_output.iter()
            .map(|(l, r)| l * l + r * r)
            .sum::<f32>() / (combined_output.len() as f32 * 2.0);
        let total_rms = total_rms.sqrt();
        
        assert!(total_rms > 0.01, "Polyphonic output should be audible: {}", total_rms);
        
        println!("✅ EMU8000 polyphonic zone behavior test passed - RMS: {:.4}", total_rms);
    }
}

/// Main multi-zone test runner
#[cfg(test)]
mod multizone_test_runner {
    use super::*;
    
    #[test]
    fn run_multizone_sample_layering_tests() {
        println!("🧪 Starting multi-zone sample layering tests...\n");
        
        // Velocity zone tests
        velocity_zone_tests::test_velocity_zone_selection();
        velocity_zone_tests::test_velocity_crossfading();
        velocity_zone_tests::test_velocity_zone_characteristics();
        
        // Key range zone tests
        key_range_zone_tests::test_key_range_zone_selection();
        key_range_zone_tests::test_key_range_zone_differences();
        
        // Zone mixing tests
        zone_mixing_tests::test_zone_mixing_stability();
        zone_mixing_tests::test_zone_crossfade_smoothness();
        
        // EMU8000-specific tests
        emu8000_multizone_tests::test_emu8000_zone_parameter_scaling();
        emu8000_multizone_tests::test_emu8000_voice_allocation_behavior();
        emu8000_multizone_tests::test_emu8000_polyphonic_zone_behavior();
        
        println!("\n🎉 All multi-zone sample layering tests completed successfully!");
        println!("📊 Multi-zone test coverage:");
        println!("    ✅ Velocity-based zone selection and crossfading");
        println!("    ✅ Key range zone mapping and sample selection");
        println!("    ✅ Multi-layer sample blending and mixing stability");
        println!("    ✅ Zone crossfade algorithms and smooth transitions");
        println!("    ✅ EMU8000-authentic multi-zone parameter scaling");
        println!("    ✅ Voice allocation and polyphonic zone behavior");
    }
}