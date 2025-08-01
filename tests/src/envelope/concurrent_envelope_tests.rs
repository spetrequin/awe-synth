use awe_synth::synth::voice_manager::VoiceManager;
use awe_synth::synth::envelope::{DAHDSREnvelope, EnvelopeState};
use std::collections::HashSet;

const SAMPLE_RATE: f32 = 44100.0;

/// Test that all 32 envelope instances are truly independent
#[test]
fn test_32_independent_envelopes() {
    let mut envelopes = Vec::new();
    
    // Create 32 envelopes with different parameters
    for i in 0..32 {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000 + (i as i32 * 100),  // Varying delay times
            -7200 + (i as i32 * 50),    // Varying attack times
            0,                           // No hold
            -7200 + (i as i32 * 50),    // Varying decay times
            (i as i32 * 20),            // Varying sustain levels
            -7200 + (i as i32 * 50),    // Varying release times
        );
        envelopes.push(envelope);
    }
    
    // Trigger all envelopes
    for envelope in envelopes.iter_mut() {
        envelope.trigger();
    }
    
    // Process and verify each envelope has unique progression
    let mut amplitude_sets = Vec::new();
    for _ in 0..100 {  // Process 100 samples
        let mut amplitudes = Vec::new();
        for envelope in envelopes.iter_mut() {
            amplitudes.push(envelope.process());
        }
        amplitude_sets.push(amplitudes);
    }
    
    // Verify that envelopes produce different amplitude patterns
    let mut unique_patterns = HashSet::new();
    for i in 0..32 {
        let pattern: Vec<String> = amplitude_sets.iter()
            .map(|set| format!("{:.6}", set[i]))
            .collect();
        unique_patterns.insert(pattern.join(","));
    }
    
    // Should have many unique patterns (not all 32 need to be unique due to similar parameters)
    assert!(unique_patterns.len() >= 16, 
            "Expected at least 16 unique envelope patterns, found {}", unique_patterns.len());
}

/// Test concurrent envelope state transitions
#[test]
fn test_concurrent_envelope_states() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start all 32 voices with staggered timing
    for i in 0..32 {
        vm.note_on(60 + (i as u8), 64 + (i as u8 * 2));
        
        // Process a few samples between each note
        for _ in 0..(i * 10) {
            vm.process_envelopes();
        }
    }
    
    // All 32 voices should be active
    let active_count = vm.process_envelopes();
    assert_eq!(active_count, 32, "All 32 voices should be active");
    
    // Process samples and verify voices are in different states
    for _ in 0..1000 {
        vm.process_envelopes();
    }
    
    // Stop every other voice
    for i in 0..16 {
        vm.note_off(60 + (i as u8 * 2));
    }
    
    // Should still have 32 active (16 sustaining, 16 releasing)
    let count_after_partial_release = vm.process_envelopes();
    assert_eq!(count_after_partial_release, 32, "All voices still active");
}

/// Test envelope independence with rapid triggering
#[test]
fn test_envelope_rapid_trigger_independence() {
    let mut envelopes: Vec<DAHDSREnvelope> = Vec::new();
    
    // Create 32 identical envelopes
    for _ in 0..32 {
        envelopes.push(DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,      // No delay
            -7200,  // 16ms attack
            0,      // No hold
            -7200,  // 16ms decay
            200,    // -2dB sustain
            -7200,  // 16ms release
        ));
    }
    
    // Trigger them with slight delays
    for (i, envelope) in envelopes.iter_mut().enumerate() {
        // Process i samples before triggering
        for _ in 0..i {
            envelope.process();
        }
        envelope.trigger();
    }
    
    // Process and verify they're at different phases
    let mut states = Vec::new();
    let mut amplitudes = Vec::new();
    
    for envelope in envelopes.iter_mut() {
        envelope.process();
        states.push(envelope.state);
        amplitudes.push(envelope.current_level);
    }
    
    // First envelope should be furthest along
    assert!(amplitudes[0] >= amplitudes[31], 
            "First triggered envelope should have progressed more");
    
    // Verify gradual progression
    let mut increasing_count = 0;
    for i in 1..32 {
        if amplitudes[i-1] >= amplitudes[i] {
            increasing_count += 1;
        }
    }
    assert!(increasing_count > 20, "Most envelopes should show decreasing progression");
}

/// Test maximum polyphony stress test
#[test]
fn test_maximum_polyphony_stress() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start all 32 voices as quickly as possible
    for i in 0..32 {
        vm.note_on(21 + i, 127); // Full velocity, chromatic from A0
    }
    
    assert_eq!(vm.process_envelopes(), 32, "All 32 voices should be active");
    
    // Process 1 second of audio samples
    let samples_per_second = SAMPLE_RATE as usize;
    for _ in 0..samples_per_second {
        let active = vm.process_envelopes();
        assert_eq!(active, 32, "All voices should remain active during processing");
    }
    
    // Release all notes
    for i in 0..32 {
        vm.note_off(21 + i);
    }
    
    // Process until some voices complete
    let mut final_count = 32;
    for _ in 0..(samples_per_second / 2) {
        final_count = vm.process_envelopes();
        if final_count < 32 {
            break;
        }
    }
    
    // Some voices should have completed their release
    assert!(final_count < 32, "Some voices should have completed after release");
}

/// Test envelope parameter independence
#[test]
fn test_envelope_parameter_independence() {
    let mut envelopes = Vec::new();
    
    // Create envelopes with extreme parameter differences
    let params = vec![
        (-12000, -12000, -12000, 0),     // Very fast envelope
        (-2400, -2400, -2400, 600),      // Slow envelope
        (-7200, -4800, -7200, 200),      // Medium envelope
        (0, 0, 0, 1000),                 // Instant envelope with high attenuation
    ];
    
    for i in 0..32 {
        let (delay, attack, decay, sustain) = params[i % 4];
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            delay,
            attack,
            0,      // No hold
            decay,
            sustain,
            -7200,  // Same release for all
        );
        envelopes.push(envelope);
    }
    
    // Trigger all and process
    for envelope in envelopes.iter_mut() {
        envelope.trigger();
    }
    
    // Process to different phases
    for _ in 0..2000 {
        for envelope in envelopes.iter_mut() {
            envelope.process();
        }
    }
    
    // Check that envelopes are in different states
    let mut state_counts = std::collections::HashMap::new();
    for envelope in envelopes.iter() {
        *state_counts.entry(envelope.state).or_insert(0) += 1;
    }
    
    // Should have variety in states
    assert!(state_counts.len() >= 2, "Envelopes should be in different states");
}

/// Test concurrent release behavior
#[test]
fn test_concurrent_release_behavior() {
    let mut envelopes = Vec::new();
    
    // Create 32 envelopes with simple fast timings
    for _ in 0..32 {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // 1ms delay
            -8000,  // ~6ms attack
            -12000, // 1ms hold  
            -8000,  // ~6ms decay
            200,    // -2dB sustain
            -8000,  // ~6ms release
        );
        envelopes.push(envelope);
    }
    
    // Trigger all
    for envelope in envelopes.iter_mut() {
        envelope.trigger();
    }
    
    // Process to sustain (need enough samples for delay + attack + hold + decay)
    // With our parameters: 1ms + 6ms + 1ms + 6ms = 14ms = ~617 samples
    for _ in 0..1000 {
        for envelope in envelopes.iter_mut() {
            envelope.process();
        }
    }
    
    // Release in groups
    for (i, envelope) in envelopes.iter_mut().enumerate() {
        if i % 4 == 0 {
            envelope.release(); // Release every 4th envelope
        }
    }
    
    // Process and check states
    for _ in 0..100 {
        for envelope in envelopes.iter_mut() {
            envelope.process();
        }
    }
    
    // Count envelopes in each state  
    let mut state_map = std::collections::HashMap::new();
    for envelope in envelopes.iter() {
        *state_map.entry(envelope.state).or_insert(0) += 1;
    }
    
    // We should have 24 in sustain and 8 in release
    let sustain_count = *state_map.get(&EnvelopeState::Sustain).unwrap_or(&0);
    let release_count = *state_map.get(&EnvelopeState::Release).unwrap_or(&0);
    
    // With 0 delay and 2000 samples of processing, all should reach sustain
    // The issue might be that stage_samples starts at 0, so with 0 delay_samples,
    // the condition (0 >= 0) is true and should transition immediately.
    
    // All envelopes should have progressed past early phases
    let delay_count = *state_map.get(&EnvelopeState::Delay).unwrap_or(&0);
    let attack_count = *state_map.get(&EnvelopeState::Attack).unwrap_or(&0);
    let hold_count = *state_map.get(&EnvelopeState::Hold).unwrap_or(&0);
    let decay_count = *state_map.get(&EnvelopeState::Decay).unwrap_or(&0);
    
    assert_eq!(delay_count + attack_count + hold_count + decay_count, 0, 
               "All envelopes should be in Sustain or Release. States: {:?}", state_map);
    assert_eq!(sustain_count, 24, "24 envelopes should be in sustain");
    assert_eq!(release_count, 8, "8 envelopes should be in release");
}

/// Test envelope memory independence
#[test]
fn test_envelope_memory_independence() {
    let mut envelopes = Vec::new();
    
    // Create envelopes with specific initial states
    for i in 0..32 {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,
            -7200,
            0,
            -7200,
            200,
            -7200,
        );
        
        // Set unique initial conditions
        envelope.current_level = (i as f32) / 32.0;
        envelope.stage_samples = i as u32 * 100;
        
        envelopes.push(envelope);
    }
    
    // Verify each maintains its own state
    for (i, envelope) in envelopes.iter().enumerate() {
        assert_eq!(envelope.current_level, (i as f32) / 32.0, 
                   "Envelope {} should maintain its unique level", i);
        assert_eq!(envelope.stage_samples, i as u32 * 100,
                   "Envelope {} should maintain its unique sample count", i);
    }
    
    // Trigger and process
    for envelope in envelopes.iter_mut() {
        envelope.trigger();
        envelope.process();
    }
    
    // All should have reset properly
    for envelope in envelopes.iter() {
        assert_eq!(envelope.stage_samples, 1, "All should have processed 1 sample");
        assert_eq!(envelope.current_level, 0.0, "All should be at 0.0 (delay phase)");
    }
}

/// Test voice stealing scenario with 32 active envelopes
#[test]
fn test_voice_stealing_envelope_behavior() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Fill all 32 voices
    for i in 0..32 {
        let result = vm.note_on(60 + i, 100);
        assert!(result.is_some(), "Should allocate voice {}", i);
    }
    
    // Try to allocate 33rd voice - should fail
    let overflow = vm.note_on(92, 100);
    assert!(overflow.is_none(), "33rd voice should not be allocated");
    
    // Process some samples
    for _ in 0..1000 {
        vm.process_envelopes();
    }
    
    // Release the oldest voices
    for i in 0..8 {
        vm.note_off(60 + i);
    }
    
    // Process until some complete
    for _ in 0..5000 {
        let active = vm.process_envelopes();
        if active < 32 {
            // Now we should be able to allocate new voices
            let new_voice = vm.note_on(92, 100);
            assert!(new_voice.is_some(), "Should be able to allocate after voice completes");
            break;
        }
    }
}

/// Test envelope phase distribution across 32 voices
#[test]
fn test_envelope_phase_distribution() {
    let mut envelopes = Vec::new();
    
    // Create and trigger envelopes with staggered processing
    for i in 0..32 {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -10000, // ~3ms delay
            -7200,  // 16ms attack
            -10000, // ~3ms hold
            -7200,  // 16ms decay
            200,    // -2dB sustain
            -7200,  // 16ms release
        );
        
        envelope.trigger();
        
        // Process different amounts for each to distribute across phases
        // Some will be in delay, attack, hold, decay, or sustain
        for _ in 0..(i * 50) {
            envelope.process();
        }
        
        envelopes.push(envelope);
    }
    
    // Count envelopes in each phase
    let mut phase_counts = std::collections::HashMap::new();
    for envelope in envelopes.iter() {
        *phase_counts.entry(envelope.state).or_insert(0) += 1;
    }
    
    // Should have good distribution across phases
    assert!(phase_counts.len() >= 3, "Should have at least 3 different phases active");
    
    // No single phase should dominate
    for (phase, count) in phase_counts.iter() {
        assert!(*count <= 20, "Phase {:?} has too many envelopes: {}", phase, count);
    }
}

/// Test concurrent envelope amplitude range
#[test]
fn test_concurrent_amplitude_ranges() {
    let mut envelopes = Vec::new();
    
    // Create envelopes and process to different phases
    for i in 0..32 {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // ~1ms delay instead of 1s delay
            -7200,
            -12000, // ~1ms hold instead of 1s hold
            -7200,
            (i as i32 * 30), // Different sustain levels
            -7200,
        );
        
        envelope.trigger();
        
        // Process to different points
        let samples_to_process = match i % 4 {
            0 => 100,   // Still in attack
            1 => 1000,  // In decay
            2 => 3000,  // In sustain
            3 => {      // In release
                envelope.release();
                100
            },
            _ => 0,
        };
        
        for _ in 0..samples_to_process {
            envelope.process();
        }
        
        envelopes.push(envelope);
    }
    
    // Collect amplitudes
    let mut amplitudes: Vec<f32> = envelopes.iter_mut()
        .map(|e| e.process())
        .collect();
    
    amplitudes.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    // Should have good range of amplitudes
    let min = amplitudes[0];
    let max = amplitudes[31];
    
    assert!(max > min, "Should have amplitude variation");
    assert!(max <= 1.0, "Maximum amplitude should not exceed 1.0");
    assert!(min >= 0.0, "Minimum amplitude should not be negative");
    
    // Should have good distribution
    let range = max - min;
    assert!(range > 0.1, "Should have significant amplitude range: {}", range);
}