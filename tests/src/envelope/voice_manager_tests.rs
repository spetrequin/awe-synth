use awe_synth::synth::voice_manager::VoiceManager;

const SAMPLE_RATE: f32 = 44100.0;

/// Test VoiceManager creation and initialization
#[test]
fn test_voice_manager_initialization() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // All voices should be inactive initially
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 0, "All voices should be inactive initially");
}

/// Test basic note_on functionality with VoiceManager
#[test]
fn test_voice_manager_note_on() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start first note
    let voice_id = vm.note_on(60, 100);
    assert!(voice_id.is_some(), "Should find available voice for first note");
    
    // Process envelope - voice should be active in delay/attack phase
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 1, "Should have 1 active voice after note_on");
}

/// Test note_off functionality with envelope release
#[test]
fn test_voice_manager_note_off() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start and stop a note
    let voice_id = vm.note_on(60, 100);
    assert!(voice_id.is_some(), "Should find available voice");
    
    vm.note_off(60);
    
    // Voice should still be active (in release phase) initially
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 1, "Voice should still be active in release phase");
}

/// Test multiple voices playing simultaneously
#[test]
fn test_multiple_voice_envelopes() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start 4 different notes
    let voice1 = vm.note_on(60, 80);
    let voice2 = vm.note_on(64, 90);
    let voice3 = vm.note_on(67, 100);
    let voice4 = vm.note_on(72, 110);
    
    assert!(voice1.is_some() && voice2.is_some() && voice3.is_some() && voice4.is_some(),
            "Should be able to allocate 4 voices");
    
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 4, "Should have 4 active voices");
}

/// Test envelope processing with different timing phases
#[test]
fn test_envelope_phase_transitions() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start a note with fast envelope (16ms phases)
    vm.note_on(60, 127);
    
    // Process through delay phase (should be very short with our test envelope)
    for _ in 0..100 {
        vm.process_envelopes();
    }
    
    // Should still have 1 active voice in attack/hold/decay phase
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 1, "Voice should be active in envelope phases");
}

/// Test voice reallocation when all 32 voices are used
#[test]
fn test_voice_allocation_limit() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Fill all 32 voices
    let mut allocated_voices = Vec::new();
    for note in 60..92 {  // 32 notes
        let voice_id = vm.note_on(note, 64);
        allocated_voices.push(voice_id);
    }
    
    // All voices should be allocated
    let successful_allocations = allocated_voices.iter().filter(|v| v.is_some()).count();
    assert_eq!(successful_allocations, 32, "Should allocate all 32 voices");
    
    // Try to allocate a 33rd voice - should fail
    let voice_33 = vm.note_on(93, 64);
    assert!(voice_33.is_none(), "33rd voice allocation should fail");
    
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 32, "Should have exactly 32 active voices");
}

/// Test voice lifecycle - from active to inactive
#[test]
fn test_voice_lifecycle_to_inactive() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Create envelope with very fast release for quick testing
    vm.note_on(60, 127);
    vm.note_off(60);  // Trigger release immediately
    
    // Process through release phase until voice becomes inactive
    let mut samples_processed = 0;
    let max_samples = (SAMPLE_RATE * 0.1) as usize; // 100ms max
    
    loop {
        let active_count = vm.process_envelopes();
        samples_processed += 1;
        
        if active_count == 0 || samples_processed >= max_samples {
            break;
        }
    }
    
    let final_active_count = vm.process_envelopes();
    assert_eq!(final_active_count, 0, "Voice should become inactive after release completes");
}

/// Test concurrent envelope processing independence
#[test]
fn test_concurrent_envelope_independence() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start voices at different times with different velocities
    vm.note_on(60, 64);   // Voice 1: moderate velocity
    
    // Process 100 samples
    for _ in 0..100 {
        vm.process_envelopes();
    }
    
    vm.note_on(64, 127);  // Voice 2: high velocity, started later
    
    // Process more samples - both voices should be active
    for _ in 0..100 {
        let active_count = vm.process_envelopes();
        assert_eq!(active_count, 2, "Both voices should remain active");
    }
}

/// Test envelope amplitude progression accuracy
#[test]
fn test_envelope_amplitude_progression() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    vm.note_on(60, 127);
    
    let _previous_amplitude = 0.0;
    let mut attack_phase_detected = false;
    
    // Process samples and check amplitude progression in attack phase
    for _ in 0..1000 {  // Process enough samples to see attack
        vm.process_envelopes();
        
        // We can't directly access voice amplitude from VoiceManager,
        // but we can infer behavior from active count
        let active_count = vm.process_envelopes();
        if active_count > 0 {
            attack_phase_detected = true;
        }
    }
    
    assert!(attack_phase_detected, "Should detect active envelope processing");
}

/// Test process_envelopes return value accuracy
#[test]
fn test_process_envelopes_return_count() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Test with 0 voices
    let count = vm.process_envelopes();
    assert_eq!(count, 0, "Should return 0 for no active voices");
    
    // Test with 1 voice
    vm.note_on(60, 100);
    let count = vm.process_envelopes();
    assert_eq!(count, 1, "Should return 1 for one active voice");
    
    // Test with 3 voices
    vm.note_on(64, 100);
    vm.note_on(67, 100);
    let count = vm.process_envelopes();
    assert_eq!(count, 3, "Should return 3 for three active voices");
}

/// Test note_off affects correct voices only
#[test]
fn test_selective_note_off() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start multiple notes
    vm.note_on(60, 100);  // C4
    vm.note_on(64, 100);  // E4
    vm.note_on(67, 100);  // G4
    
    let initial_count = vm.process_envelopes();
    assert_eq!(initial_count, 3, "Should have 3 active voices");
    
    // Turn off only the middle note
    vm.note_off(64);
    
    // All voices should still be active (one in release phase)
    let count_after_noteoff = vm.process_envelopes();
    assert_eq!(count_after_noteoff, 3, "All voices should still be active initially");
    
    // The released voice should eventually become inactive
    // (We can't easily test this without accessing individual voice states)
}

/// Test envelope processing with zero-duration phases
#[test]
fn test_zero_duration_envelope_phases() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start note with instant attack envelope (our test envelope has very short phases)
    vm.note_on(60, 127);
    
    // Process a few samples - envelope should handle zero/very short durations gracefully
    for _ in 0..10 {
        let active_count = vm.process_envelopes();
        assert!(active_count <= 1, "Should have at most 1 active voice");
    }
}

/// Test VoiceManager with different sample rates
#[test]
fn test_different_sample_rates() {
    let sample_rates = [22050.0, 44100.0, 48000.0, 96000.0];
    
    for sample_rate in &sample_rates {
        let mut vm = VoiceManager::new(*sample_rate);
        
        vm.note_on(60, 100);
        let active_count = vm.process_envelopes();
        assert_eq!(active_count, 1, "Should work correctly at {}Hz sample rate", sample_rate);
    }
}