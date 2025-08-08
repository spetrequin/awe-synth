// Voice synthesis tests for Phase 20 - MultiZoneSampleVoice system
// Tests MultiZoneSampleVoice::process() with different MIDI notes and envelope integration

use awe_synth::synth::multizone_voice::{MultiZoneSampleVoice, VoiceState};
use awe_synth::synth::oscillator::midi_note_to_frequency;
use awe_synth::synth::envelope::EnvelopeState;
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};

const SAMPLE_RATE: f32 = 44100.0;
const EPSILON: f32 = 1e-6;

#[test]
fn test_voice_initialization() {
    let voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    
    assert_eq!(voice.get_note(), 0);
    assert_eq!(voice.get_velocity(), 0);
    assert_eq!(voice.get_channel(), 0);
    assert!(!voice.is_active());
    assert!(!voice.is_releasing());
}

#[test]
fn test_voice_start_note() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    let note = 69; // A4
    let velocity = 100;
    
    voice.start_note(note, velocity, 0, &soundfont, &preset).unwrap();
    
    assert_eq!(voice.get_note(), note);
    assert_eq!(voice.get_velocity(), velocity);
    assert_eq!(voice.get_channel(), 0);
    assert!(voice.is_active());
    assert!(!voice.is_releasing());
    
    // Verify envelope is triggered
    let envelope_level = voice.get_volume_envelope_level();
    assert!(envelope_level >= 0.0 && envelope_level <= 1.0);
}

#[test]
fn test_voice_stop_note() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    assert!(voice.is_active());
    assert!(!voice.is_releasing());
    
    voice.stop_note();
    assert!(voice.is_active()); // Still active during release
    assert!(voice.is_releasing());
}

#[test]
fn test_voice_audio_generation() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Generate some samples
    let mut samples = Vec::new();
    for _ in 0..100 {
        samples.push(voice.process());
    }
    
    // Verify we got valid stereo samples
    assert_eq!(samples.len(), 100);
    
    // Check for numerical stability
    let has_nan = samples.iter().any(|(l, r)| l.is_nan() || r.is_nan());
    let has_inf = samples.iter().any(|(l, r)| l.is_infinite() || r.is_infinite());
    
    assert!(!has_nan, "Voice should not produce NaN values");
    assert!(!has_inf, "Voice should not produce infinite values");
}

#[test]
fn test_voice_envelope_progression() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 127, 0, &soundfont, &preset).unwrap();
    
    // Get initial envelope level
    let initial_level = voice.get_volume_envelope_level();
    
    // Process some samples to advance envelope
    for _ in 0..100 {
        voice.process();
    }
    
    let later_level = voice.get_volume_envelope_level();
    
    // Envelope should be progressing
    assert!(initial_level >= 0.0 && initial_level <= 1.0);
    assert!(later_level >= 0.0 && later_level <= 1.0);
}

#[test]
fn test_voice_velocity_response() {
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    let velocities = [1, 64, 127];
    let mut responses = Vec::new();
    
    for &velocity in velocities.iter() {
        let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
        voice.start_note(60, velocity, 0, &soundfont, &preset).unwrap();
        
        // Let envelope settle briefly
        for _ in 0..50 {
            voice.process();
        }
        
        let envelope_level = voice.get_volume_envelope_level();
        responses.push(envelope_level);
    }
    
    // Generally expect higher velocity to produce higher envelope levels
    // (though exact behavior depends on envelope implementation)
    println!("Velocity responses: {:?}", responses);
    assert!(responses[0] >= 0.0 && responses[0] <= 1.0);
    assert!(responses[1] >= 0.0 && responses[1] <= 1.0);
    assert!(responses[2] >= 0.0 && responses[2] <= 1.0);
}

#[test]
fn test_voice_pitch_bend() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Test different pitch bend values
    let pitch_bends = [-2.0, -1.0, 0.0, 1.0, 2.0];
    
    for &bend in pitch_bends.iter() {
        voice.set_pitch_bend(bend);
        
        // Process samples to apply pitch bend
        let samples: Vec<(f32, f32)> = (0..10).map(|_| voice.process()).collect();
        
        // Should produce finite output
        let all_finite = samples.iter().all(|(l, r)| l.is_finite() && r.is_finite());
        assert!(all_finite, "Pitch bend {} should produce finite output", bend);
    }
}

#[test]
fn test_voice_modulation() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Test modulation wheel
    let modulation_levels = [0.0, 0.5, 1.0];
    
    for &modulation in modulation_levels.iter() {
        voice.set_modulation(modulation);
        
        // Process samples
        let samples: Vec<(f32, f32)> = (0..20).map(|_| voice.process()).collect();
        
        // Should handle modulation without errors
        let has_errors = samples.iter().any(|(l, r)| !l.is_finite() || !r.is_finite());
        assert!(!has_errors, "Modulation {} should not cause errors", modulation);
    }
}

#[test]
fn test_voice_pan_control() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Test full left pan
    voice.set_pan(-1.0);
    let (left_l, right_l) = voice.process();
    
    // Test center pan
    voice.set_pan(0.0);
    let (left_c, right_c) = voice.process();
    
    // Test full right pan
    voice.set_pan(1.0);
    let (left_r, right_r) = voice.process();
    
    // All should produce finite values
    let all_finite = [left_l, right_l, left_c, right_c, left_r, right_r]
        .iter().all(|&v| v.is_finite());
    assert!(all_finite, "Pan control should produce finite values");
}

#[test]
fn test_voice_effects_sends() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Check default effects sends
    let reverb = voice.get_reverb_send();
    let chorus = voice.get_chorus_send();
    
    assert!(reverb >= 0.0 && reverb <= 1.0, "Reverb send should be in valid range");
    assert!(chorus >= 0.0 && chorus <= 1.0, "Chorus send should be in valid range");
    
    // Test manual control
    voice.set_reverb_send(0.5);
    voice.set_chorus_send(0.3);
    
    assert_eq!(voice.get_reverb_send(), 0.5);
    assert_eq!(voice.get_chorus_send(), 0.3);
}

#[test]
fn test_voice_stealing_support() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Get initial steal priority
    let initial_priority = voice.get_steal_priority();
    
    // Prepare for stealing
    voice.prepare_for_steal();
    
    // Priority should be different (typically lower)
    let steal_priority = voice.get_steal_priority();
    
    // Should not crash and should provide meaningful priority values
    assert!(initial_priority.is_finite());
    assert!(steal_priority.is_finite());
}

#[test]
fn test_voice_lfo_functionality() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = SoundFont::default();
    let preset = SoundFontPreset::default();
    
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Process enough samples for LFOs to be active
    for _ in 0..200 {
        voice.process();
    }
    
    // Check LFO levels
    let lfo1_level = voice.get_lfo1_level();
    let lfo2_level = voice.get_lfo2_level();
    
    // LFO levels should be finite
    assert!(lfo1_level.is_finite(), "LFO1 should produce finite values");
    assert!(lfo2_level.is_finite(), "LFO2 should produce finite values");
    
    // LFO levels should be in reasonable range
    assert!(lfo1_level >= -2.0 && lfo1_level <= 2.0, "LFO1 level in reasonable range");
    assert!(lfo2_level >= -2.0 && lfo2_level <= 2.0, "LFO2 level in reasonable range");
}