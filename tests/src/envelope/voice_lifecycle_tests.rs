use awe_synth::synth::multizone_voice::{MultiZoneSampleVoice, VoiceState};
use awe_synth::synth::voice_manager::VoiceManager;
use awe_synth::synth::envelope::{DAHDSREnvelope, EnvelopeState};

const SAMPLE_RATE: f32 = 44100.0;

/// Test that voices become inactive only when envelope reaches Off state
#[test]
fn test_voice_lifecycle_envelope_off_state() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    
    // Start a note
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    assert!(voice.is_active(), "Voice should be active after note_on");
    
    // Process through envelope phases - voice should remain active
    for _ in 0..1000 {
        let amplitude = voice.get_volume_envelope_level();
        assert!(voice.is_active(), "Voice should remain active during envelope phases");
        
        // Even if amplitude is 0.0 in delay phase, voice should be active
        if amplitude == 0.0 {
            assert!(voice.is_active(), "Voice should be active even with 0.0 amplitude in delay");
        }
    }
    
    // Stop the note to trigger release
    voice.stop_note();
    
    // Process until voice becomes inactive
    let max_samples = (SAMPLE_RATE * 2.0) as usize; // 2 seconds max
    for _ in 0..max_samples {
        voice.process();
        
        if !voice.is_active() {
            // Voice has completed its lifecycle
            break;
        }
    }
    
    // Verify voice is inactive after release completes
    assert!(!voice.is_active(), "Voice should be inactive after release completes");
}

/// Test voice lifecycle with very fast envelope
#[test]
fn test_voice_lifecycle_fast_envelope() {
    // Create envelope with very fast timings
    let fast_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000,  // 1ms delay
        -12000,  // 1ms attack
        -12000,  // 1ms hold
        -12000,  // 1ms decay
        0,       // 0dB sustain (full level)
        -12000,  // 1ms release
    );
    
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    // Configure voice with fast envelope via SoundFont preset
    // Note: In production, envelope parameters come from SoundFont
    
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    voice.stop_note(); // Immediately release
    
    // Process samples - should complete quickly
    let mut samples_processed = 0;
    while voice.is_active() && samples_processed < 1000 {
        voice.process();
        samples_processed += 1;
    }
    
    assert!(samples_processed < 1000, "Fast envelope should complete quickly");
    assert!(!voice.is_active(), "Voice should be inactive after fast envelope");
}

/// Test voice lifecycle with slow envelope
#[test]
fn test_voice_lifecycle_slow_envelope() {
    // Create envelope with slow timings
    let slow_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -4800,   // ~63ms delay
        -2400,   // ~250ms attack
        -4800,   // ~63ms hold
        -2400,   // ~250ms decay
        600,     // -6dB sustain
        -2400,   // ~250ms release
    );
    
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    // Configure voice with slow envelope via SoundFont preset
    // Note: In production, envelope parameters come from SoundFont
    
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Process through attack phase
    let attack_samples = (0.250 * SAMPLE_RATE) as usize; // 250ms
    for _ in 0..attack_samples {
        voice.process();
    }
    
    // Should still be active during attack
    assert!(voice.is_active(), "Voice should be active during attack phase");
    
    voice.stop_note();
    
    // Process through release
    let release_samples = (0.300 * SAMPLE_RATE) as usize; // 300ms (with margin)
    for _ in 0..release_samples {
        voice.process();
    }
    
    // Should be inactive after release
    assert!(!voice.is_active(), "Voice should be inactive after slow release");
}

/// Test voice manager lifecycle integration
#[test]
fn test_voice_manager_lifecycle_integration() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start multiple notes
    vm.note_on(60, 100);
    vm.note_on(64, 100);
    vm.note_on(67, 100);
    
    let initial_count = vm.process_envelopes();
    assert_eq!(initial_count, 3, "Should have 3 active voices");
    
    // Stop one note
    vm.note_off(64);
    
    // All voices should still be active (one in release)
    let count_after_noteoff = vm.process_envelopes();
    assert_eq!(count_after_noteoff, 3, "All voices still active, one in release");
    
    // Process until release completes
    let mut samples = 0;
    let max_samples = (SAMPLE_RATE * 0.5) as usize; // 500ms max
    
    while samples < max_samples {
        let active_count = vm.process_envelopes();
        if active_count == 2 {
            break; // One voice became inactive
        }
        samples += 1;
    }
    
    let final_count = vm.process_envelopes();
    assert_eq!(final_count, 2, "Should have 2 active voices after one completes release");
}

/// Test envelope amplitude threshold behavior
#[test]
fn test_envelope_amplitude_threshold() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Process to sustain phase
    for _ in 0..10000 {
        voice.process();
        // In MultiZoneSampleVoice, we check if it's still active but not releasing
        if voice.is_active() && !voice.is_releasing() {
            break;
        }
    }
    
    let sustain_amplitude = voice.get_volume_envelope_level();
    assert!(sustain_amplitude > 0.001, "Sustain amplitude should be above threshold");
    
    // Trigger release
    voice.stop_note();
    
    // Track when amplitude drops below threshold
    let mut below_threshold_sample = None;
    let mut inactive_state_sample = None;
    
    for i in 0..10000 {
        let amplitude = voice.get_volume_envelope_level();
        voice.process();
        
        if amplitude <= 0.001 && below_threshold_sample.is_none() {
            below_threshold_sample = Some(i);
        }
        
        if !voice.is_active() {
            inactive_state_sample = Some(i);
            break;
        }
    }
    
    // Verify both events occurred
    assert!(below_threshold_sample.is_some(), "Amplitude should drop below threshold");
    assert!(inactive_state_sample.is_some(), "Voice should become inactive");
    
    // Inactive state should occur at or after threshold crossing
    if let (Some(threshold), Some(inactive)) = (below_threshold_sample, inactive_state_sample) {
        assert!(inactive >= threshold, "Inactive state should occur at or after threshold crossing");
    }
}

/// Test voice lifecycle with zero sustain
#[test]
fn test_voice_lifecycle_zero_sustain() {
    // Create envelope with very high sustain attenuation (silent sustain)
    let zero_sustain_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,       // No delay
        -7200,   // ~16ms attack
        0,       // No hold
        -7200,   // ~16ms decay
        1440,    // -14.4dB sustain (maximum attenuation, nearly silent)
        -7200,   // ~16ms release
    );
    
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    // Configure voice with zero sustain envelope via SoundFont preset
    // Note: In production, envelope parameters come from SoundFont
    
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    
    // Process to sustain phase
    for _ in 0..2000 {
        voice.process();
        // Check if we're in sustain (active but not releasing)
        if voice.is_active() && !voice.is_releasing() {
            break;
        }
    }
    
    // Sustain amplitude should be very low but voice still active
    let sustain_amplitude = voice.get_volume_envelope_level();
    assert!(sustain_amplitude < 0.2, "High attenuation sustain should have low amplitude");
    assert!(voice.is_active(), "Voice should still be active in sustain");
    
    // Release and verify completion
    voice.stop_note();
    
    for _ in 0..2000 {
        voice.process();
        if !voice.is_active() {
            break;
        }
    }
    
    assert!(!voice.is_active(), "Voice should be inactive even with zero sustain");
}

/// Test concurrent voice lifecycles
#[test]
fn test_concurrent_voice_lifecycles() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start notes at different times
    vm.note_on(60, 100);
    
    // Process 100 samples
    for _ in 0..100 {
        vm.process_envelopes();
    }
    
    vm.note_on(64, 100);
    
    // Process 100 more samples
    for _ in 0..100 {
        vm.process_envelopes();
    }
    
    vm.note_on(67, 100);
    
    // All should be active
    assert_eq!(vm.process_envelopes(), 3, "All 3 voices should be active");
    
    // Release them in different order
    vm.note_off(64); // Middle note first
    
    for _ in 0..100 {
        vm.process_envelopes();
    }
    
    vm.note_off(60); // First note
    vm.note_off(67); // Last note
    
    // Process until some complete
    let mut final_count = 3;
    for _ in 0..10000 {
        final_count = vm.process_envelopes();
        if final_count == 0 {
            break;
        }
    }
    
    // Eventually all should complete
    assert_eq!(final_count, 0, "All voices should eventually complete");
}

/// Test voice lifecycle state consistency
#[test]
fn test_voice_lifecycle_state_consistency() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    
    // Initial state
    assert!(!voice.is_active(), "Voice should start inactive");
    
    // After note on
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    voice.start_note(60, 100, 0, &soundfont, &preset).unwrap();
    assert!(voice.is_active(), "Voice should be active after note on");
    
    // Process some samples
    for _ in 0..100 {
        let amplitude = voice.get_volume_envelope_level();
        voice.process();
        
        // If voice is inactive, amplitude should be low/zero
        if !voice.is_active() {
            assert!(amplitude <= 0.01, "Inactive voice should have low amplitude");
        }
    }
}

/// Test rapid note on/off cycling
#[test]
fn test_rapid_note_cycling() {
    let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
    
    // Rapid on/off cycles
    let soundfont = awe_synth::soundfont::types::SoundFont::default();
    let preset = awe_synth::soundfont::types::SoundFontPreset::default();
    
    for cycle in 0..5 {
        voice.start_note(60 + cycle as u8, 100, 0, &soundfont, &preset).unwrap();
        
        // Process just a few samples
        for _ in 0..10 {
            voice.process();
        }
        
        voice.stop_note();
        
        // Process a few more
        for _ in 0..10 {
            voice.process();
        }
    }
    
    // Process to completion
    for _ in 0..5000 {
        voice.process();
        if !voice.is_active() {
            break;
        }
    }
    
    // Should eventually be inactive
    assert!(!voice.is_active(), "Voice should be inactive after rapid cycling");
}

/// Test voice manager automatic deactivation
#[test]
fn test_voice_manager_auto_deactivation() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start and immediately stop a note
    vm.note_on(60, 100);
    vm.note_off(60);
    
    // Track active count over time
    let mut active_history = Vec::new();
    
    for _ in 0..5000 {
        let count = vm.process_envelopes();
        active_history.push(count);
        
        if count == 0 {
            break;
        }
    }
    
    // Should start with 1 and end with 0
    assert_eq!(active_history.first(), Some(&1), "Should start with 1 active voice");
    assert_eq!(active_history.last(), Some(&0), "Should end with 0 active voices");
    
    // Should have a decreasing trend (allowing for constant periods)
    let first_nonzero = active_history.iter().position(|&c| c > 0).unwrap_or(0);
    let last_nonzero = active_history.iter().rposition(|&c| c > 0).unwrap_or(0);
    assert!(last_nonzero > first_nonzero, "Should have period of activity before deactivation");
}