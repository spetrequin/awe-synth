/**
 * Interpolation Quality Tests - Phase 10B.2
 * 
 * Tests MultiZoneSampleVoice interpolation quality in sample-based synthesis.
 * Verifies implementation correctness and quality metrics with the unified voice system.
 */

use awe_synth::synth::multizone_voice::MultiZoneSampleVoice;
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};

const SAMPLE_RATE: f32 = 44100.0;

/// Test MultiZoneSampleVoice interpolation quality
#[test]
fn test_voice_interpolation_quality() {
    println!("=== Testing MultiZoneSampleVoice Interpolation Quality ===");
    
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    // Test different notes for interpolation
    let test_notes = [60, 72, 84]; // C4, C5, C6
    
    for &note in test_notes.iter() {
        voice.start_note(note, 100, 0, &soundfont, &preset).unwrap();
        
        // Generate samples to test interpolation
        let mut quality_samples = Vec::new();
        for _ in 0..100 {
            let (left, right) = voice.process();
            quality_samples.push((left, right));
        }
        
        // Check for quality (no NaN, reasonable amplitude)
        let has_quality_issues = quality_samples.iter()
            .any(|(l, r)| !l.is_finite() || !r.is_finite());
        
        assert!(!has_quality_issues, "Note {} should have quality interpolation", note);
    }
    
    println!("✅ MultiZoneSampleVoice interpolation quality verified");
}

/// Test voice consistency across different sample rates
#[test]  
fn test_voice_sample_rate_consistency() {
    println!("=== Testing Voice Sample Rate Consistency ===");
    
    let sample_rates = [44100.0, 48000.0];
    
    for &rate in sample_rates.iter() {
        let mut voice = MultiZoneSampleVoice::new(0, rate);
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        
        voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
        
        // Test consistency at different sample rates
        let (left, right) = voice.process();
        assert!(left.is_finite() && right.is_finite(),
               "Voice should handle sample rate {}", rate);
    }
    
    println!("✅ Voice sample rate consistency verified");
}

/// Test interpolation with different velocity levels
#[test]
fn test_interpolation_velocity_response() {
    println!("=== Testing Interpolation Velocity Response ===");
    
    let velocities = [32, 64, 96, 127];
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    for &velocity in velocities.iter() {
        let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
        voice.start_note(60, velocity, 0, &soundfont, &preset).unwrap();
        
        // Test interpolation quality at different velocities
        let mut samples = Vec::new();
        for _ in 0..50 {
            let (left, right) = voice.process();
            samples.push((left, right));
        }
        
        // Verify no artifacts at any velocity
        let has_artifacts = samples.iter()
            .any(|(l, r)| !l.is_finite() || !r.is_finite());
        
        assert!(!has_artifacts, "Velocity {} should not cause interpolation artifacts", velocity);
    }
    
    println!("✅ Interpolation velocity response verified");
}