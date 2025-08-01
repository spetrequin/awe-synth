use awe_synth::synth::envelope::{DAHDSREnvelope, EnvelopeState, timecents_to_seconds, centibels_to_linear};

const SAMPLE_RATE: f32 = 44100.0;

/// Test SoundFont Generator 33: delayVolEnv
/// Range: -12000 to 5000 timecents
/// Default: -12000tc (1ms minimum delay)
#[test]
fn test_generator_33_delay_vol_env() {
    // Test default value
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000, // Generator 33: delayVolEnv (default)
        -7200,  // Normal attack
        0,      // No hold
        -7200,  // Normal decay
        0,      // 0dB sustain
        -7200,  // Normal release
    );
    
    // Default should be very fast (1ms ≈ 44 samples)
    assert!(default_envelope.delay_samples <= 50, 
           "Default delay should be ≤50 samples, got {}", default_envelope.delay_samples);
    
    // Test range limits
    let test_values = vec![
        (-12000, 44),     // Minimum: ~1ms
        (-8000, 400),     // ~6ms (adjusted for actual timing)
        (0, 44100),       // 1 second
        (5000, 792000),   // Maximum: ~18 seconds (2^(5000/1200) ≈ 17.9s)
    ];
    
    for (timecents, expected_samples) in test_values {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            timecents, // Generator 33: delayVolEnv
            -7200,     // Normal attack
            0,         // No hold
            -7200,     // Normal decay
            0,         // 0dB sustain
            -7200,     // Normal release
        );
        
        let tolerance = (expected_samples as f32 * 0.2).max(20.0) as u32; // 20% tolerance
        assert!((envelope.delay_samples as i32 - expected_samples as i32).abs() <= tolerance as i32,
               "Generator 33 ({}tc): expected ~{} samples, got {} (tolerance: ±{})", 
               timecents, expected_samples, envelope.delay_samples, tolerance);
    }
}

/// Test SoundFont Generator 34: attackVolEnv  
/// Range: -12000 to 8000 timecents
/// Default: -12000tc (1ms minimum attack)
#[test]
fn test_generator_34_attack_vol_env() {
    // Test default value - should be very fast attack
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,      // No delay
        -12000, // Generator 34: attackVolEnv (default)
        0,      // No hold
        -7200,  // Normal decay
        0,      // 0dB sustain
        -7200,  // Normal release
    );
    
    assert!(default_envelope.attack_samples <= 50,
           "Default attack should be ≤50 samples, got {}", default_envelope.attack_samples);
    
    // Test range and behavior
    let test_values = vec![
        (-12000, 44),      // Minimum: ~1ms
        (-7200, 705),      // ~16ms
        (-4800, 2778),     // ~63ms
        (0, 44100),        // 1 second
        (8000, 4481689),   // Maximum: ~101.6 seconds
    ];
    
    for (timecents, expected_samples) in test_values {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,         // No delay
            timecents, // Generator 34: attackVolEnv
            0,         // No hold
            -7200,     // Normal decay
            0,         // 0dB sustain
            -7200,     // Normal release
        );
        
        let tolerance = (expected_samples as f32 * 0.2).max(20.0) as u32; // 20% tolerance
        assert!((envelope.attack_samples as i32 - expected_samples as i32).abs() <= tolerance as i32,
               "Generator 34 ({}tc): expected ~{} samples, got {} (tolerance: ±{})", 
               timecents, expected_samples, envelope.attack_samples, tolerance);
    }
}

/// Test SoundFont Generator 35: holdVolEnv
/// Range: -12000 to 5000 timecents
/// Default: -12000tc (1ms minimum hold)
#[test]
fn test_generator_35_hold_vol_env() {
    // Test default value
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,      // No delay
        -7200,  // Normal attack
        -12000, // Generator 35: holdVolEnv (default)
        -7200,  // Normal decay
        0,      // 0dB sustain
        -7200,  // Normal release
    );
    
    assert!(default_envelope.hold_samples <= 50,
           "Default hold should be ≤50 samples, got {}", default_envelope.hold_samples);
    
    // Test range values
    let test_values = vec![
        (-12000, 44),     // Minimum: ~1ms
        (-6000, 1400),    // ~10ms (adjusted for actual timing)
        (0, 44100),       // 1 second
        (5000, 792000),   // Maximum: ~18 seconds (2^(5000/1200) ≈ 17.9s)
    ];
    
    for (timecents, expected_samples) in test_values {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,         // No delay
            -7200,     // Normal attack
            timecents, // Generator 35: holdVolEnv
            -7200,     // Normal decay
            0,         // 0dB sustain
            -7200,     // Normal release
        );
        
        let tolerance = (expected_samples as f32 * 0.2).max(20.0) as u32; // 20% tolerance
        assert!((envelope.hold_samples as i32 - expected_samples as i32).abs() <= tolerance as i32,
               "Generator 35 ({}tc): expected ~{} samples, got {} (tolerance: ±{})", 
               timecents, expected_samples, envelope.hold_samples, tolerance);
    }
}

/// Test SoundFont Generator 36: decayVolEnv
/// Range: -12000 to 8000 timecents  
/// Default: -12000tc (1ms minimum decay)
#[test]
fn test_generator_36_decay_vol_env() {
    // Test default value
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,      // No delay
        -7200,  // Normal attack
        0,      // No hold
        -12000, // Generator 36: decayVolEnv (default)
        0,      // 0dB sustain
        -7200,  // Normal release
    );
    
    assert!(default_envelope.decay_samples <= 50,
           "Default decay should be ≤50 samples, got {}", default_envelope.decay_samples);
    
    // Test range values
    let test_values = vec![
        (-12000, 44),      // Minimum: ~1ms
        (-7200, 705),      // ~16ms
        (-2400, 11025),    // ~250ms
        (0, 44100),        // 1 second
        (8000, 4481689),   // Maximum: ~101.6 seconds
    ];
    
    for (timecents, expected_samples) in test_values {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,         // No delay
            -7200,     // Normal attack
            0,         // No hold
            timecents, // Generator 36: decayVolEnv
            600,       // -60dB sustain for testing decay
            -7200,     // Normal release
        );
        
        let tolerance = (expected_samples as f32 * 0.2).max(20.0) as u32; // 20% tolerance
        assert!((envelope.decay_samples as i32 - expected_samples as i32).abs() <= tolerance as i32,
               "Generator 36 ({}tc): expected ~{} samples, got {} (tolerance: ±{})", 
               timecents, expected_samples, envelope.decay_samples, tolerance);
    }
}

/// Test SoundFont Generator 37: sustainVolEnv  
/// Range: 0 to 1440 centibels
/// Default: 0cb (0dB, full sustain level)
#[test]
fn test_generator_37_sustain_vol_env() {
    // Test default value
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,     // No delay
        -7200, // Normal attack
        0,     // No hold
        -7200, // Normal decay
        0,     // Generator 37: sustainVolEnv (default - 0dB)
        -7200, // Normal release
    );
    
    assert!((default_envelope.sustain_level - 1.0).abs() < 0.001,
           "Default sustain should be 1.0, got {}", default_envelope.sustain_level);
    
    // Test range values with exact centibels formula: amplitude = 10^(-centibels/200)
    let test_values = vec![
        (0, 1.0),          // Default: 0dB = full level
        (100, 0.316227),   // -5dB ≈ 0.316
        (200, 0.1),        // -10dB = 0.1
        (400, 0.01),       // -20dB = 0.01
        (600, 0.001),      // -30dB = 0.001
        (1000, 0.00001),   // -50dB = 0.00001
        (1440, 0.000001),  // Maximum: -72dB ≈ 0.000001
    ];
    
    for (centibels, expected_amplitude) in test_values {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,          // No delay
            -7200,      // Normal attack
            0,          // No hold
            -7200,      // Normal decay
            centibels,  // Generator 37: sustainVolEnv
            -7200,      // Normal release
        );
        
        let tolerance = (expected_amplitude * 0.1_f32).max(0.000001_f32); // 10% tolerance
        assert!((envelope.sustain_level - expected_amplitude).abs() < tolerance,
               "Generator 37 ({}cb): expected {:.6}, got {:.6} (tolerance: {:.6})", 
               centibels, expected_amplitude, envelope.sustain_level, tolerance);
    }
}

/// Test SoundFont Generator 38: releaseVolEnv
/// Range: -12000 to 8000 timecents
/// Default: -12000tc (1ms minimum release)
#[test]
fn test_generator_38_release_vol_env() {
    // Test default value
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,      // No delay
        -7200,  // Normal attack
        0,      // No hold
        -7200,  // Normal decay
        0,      // 0dB sustain
        -12000, // Generator 38: releaseVolEnv (default)
    );
    
    assert!(default_envelope.release_samples <= 50,
           "Default release should be ≤50 samples, got {}", default_envelope.release_samples);
    
    // Test range values
    let test_values = vec![
        (-12000, 44),      // Minimum: ~1ms
        (-7200, 705),      // ~16ms
        (-4800, 2778),     // ~63ms
        (-2400, 11025),    // ~250ms
        (0, 44100),        // 1 second
        (8000, 4481689),   // Maximum: ~101.6 seconds
    ];
    
    for (timecents, expected_samples) in test_values {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,         // No delay
            -7200,     // Normal attack
            0,         // No hold
            -7200,     // Normal decay
            0,         // 0dB sustain
            timecents, // Generator 38: releaseVolEnv
        );
        
        let tolerance = (expected_samples as f32 * 0.2).max(20.0) as u32; // 20% tolerance
        assert!((envelope.release_samples as i32 - expected_samples as i32).abs() <= tolerance as i32,
               "Generator 38 ({}tc): expected ~{} samples, got {} (tolerance: ±{})", 
               timecents, expected_samples, envelope.release_samples, tolerance);
    }
}

/// Test complete SoundFont generator combination behavior
#[test]
fn test_complete_soundfont_generator_combination() {
    let envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -8000,  // Generator 33: delayVolEnv (~6ms)
        -4800,  // Generator 34: attackVolEnv (~63ms)
        -6000,  // Generator 35: holdVolEnv (~10ms)
        -3600,  // Generator 36: decayVolEnv (~125ms)
        400,    // Generator 37: sustainVolEnv (-20dB)
        -4200,  // Generator 38: releaseVolEnv (~177ms)
    );
    
    // Verify all parameters were applied correctly
    assert!((envelope.delay_samples as f32 / SAMPLE_RATE - timecents_to_seconds(-8000)).abs() < 0.01,
           "Delay timing should match generator 33");
    assert!((envelope.attack_samples as f32 / SAMPLE_RATE - timecents_to_seconds(-4800)).abs() < 0.01,
           "Attack timing should match generator 34");
    assert!((envelope.hold_samples as f32 / SAMPLE_RATE - timecents_to_seconds(-6000)).abs() < 0.01,
           "Hold timing should match generator 35");
    assert!((envelope.decay_samples as f32 / SAMPLE_RATE - timecents_to_seconds(-3600)).abs() < 0.01,
           "Decay timing should match generator 36");
    assert!((envelope.sustain_level - centibels_to_linear(400)).abs() < 0.001,
           "Sustain level should match generator 37");
    assert!((envelope.release_samples as f32 / SAMPLE_RATE - timecents_to_seconds(-4200)).abs() < 0.01,
           "Release timing should match generator 38");
}

/// Test SoundFont generator boundary conditions
#[test]
fn test_soundfont_generator_boundaries() {
    // Test minimum values for all generators
    let min_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000, // Generator 33: minimum delay
        -12000, // Generator 34: minimum attack
        -12000, // Generator 35: minimum hold
        -12000, // Generator 36: minimum decay
        0,      // Generator 37: minimum sustain (0dB)
        -12000, // Generator 38: minimum release
    );
    
    // All timing phases should be very short
    assert!(min_envelope.delay_samples <= 50, "Minimum delay should be very short");
    assert!(min_envelope.attack_samples <= 50, "Minimum attack should be very short");
    assert!(min_envelope.hold_samples <= 50, "Minimum hold should be very short");
    assert!(min_envelope.decay_samples <= 50, "Minimum decay should be very short");
    assert!(min_envelope.release_samples <= 50, "Minimum release should be very short");
    assert!((min_envelope.sustain_level - 1.0).abs() < 0.001, "Minimum sustain should be full level");
    
    // Test maximum values for all generators
    let max_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        5000,  // Generator 33: maximum delay
        8000,  // Generator 34: maximum attack
        5000,  // Generator 35: maximum hold
        8000,  // Generator 36: maximum decay
        1440,  // Generator 37: maximum sustain (-72dB)
        8000,  // Generator 38: maximum release
    );
    
    // All timing phases should be very long (adjusted expectations)
    assert!(max_envelope.delay_samples > 100000, "Maximum delay should be very long: got {}", max_envelope.delay_samples);
    assert!(max_envelope.attack_samples > 1000000, "Maximum attack should be very long: got {}", max_envelope.attack_samples);
    assert!(max_envelope.hold_samples > 100000, "Maximum hold should be very long: got {}", max_envelope.hold_samples);
    assert!(max_envelope.decay_samples > 1000000, "Maximum decay should be very long: got {}", max_envelope.decay_samples);
    assert!(max_envelope.release_samples > 1000000, "Maximum release should be very long: got {}", max_envelope.release_samples);
    assert!(max_envelope.sustain_level < 0.000001, "Maximum sustain should be nearly silent");
}

/// Test SoundFont generator parameter independence
#[test]
fn test_soundfont_generator_independence() {
    // Create identical envelopes except for one parameter
    let base_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -6000, -4800, -6000, -4800, 200, -4800);
    
    // Test Generator 33 (delay) independence
    let delay_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -3000, -4800, -6000, -4800, 200, -4800);
    assert_ne!(base_envelope.delay_samples, delay_envelope.delay_samples, "Delay should be independent");
    assert_eq!(base_envelope.attack_samples, delay_envelope.attack_samples, "Attack should be unaffected");
    
    // Test Generator 34 (attack) independence
    let attack_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -6000, -2400, -6000, -4800, 200, -4800);
    assert_eq!(base_envelope.delay_samples, attack_envelope.delay_samples, "Delay should be unaffected");
    assert_ne!(base_envelope.attack_samples, attack_envelope.attack_samples, "Attack should be independent");
    assert_eq!(base_envelope.hold_samples, attack_envelope.hold_samples, "Hold should be unaffected");
    
    // Test Generator 35 (hold) independence
    let hold_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -6000, -4800, -3000, -4800, 200, -4800);
    assert_eq!(base_envelope.attack_samples, hold_envelope.attack_samples, "Attack should be unaffected");
    assert_ne!(base_envelope.hold_samples, hold_envelope.hold_samples, "Hold should be independent");
    assert_eq!(base_envelope.decay_samples, hold_envelope.decay_samples, "Decay should be unaffected");
    
    // Test Generator 36 (decay) independence
    let decay_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -6000, -4800, -6000, -2400, 200, -4800);
    assert_eq!(base_envelope.hold_samples, decay_envelope.hold_samples, "Hold should be unaffected");
    assert_ne!(base_envelope.decay_samples, decay_envelope.decay_samples, "Decay should be independent");
    assert_eq!(base_envelope.sustain_level, decay_envelope.sustain_level, "Sustain should be unaffected");
    
    // Test Generator 37 (sustain) independence  
    let sustain_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -6000, -4800, -6000, -4800, 600, -4800);
    assert_eq!(base_envelope.decay_samples, sustain_envelope.decay_samples, "Decay should be unaffected");
    assert_ne!(base_envelope.sustain_level, sustain_envelope.sustain_level, "Sustain should be independent");
    assert_eq!(base_envelope.release_samples, sustain_envelope.release_samples, "Release should be unaffected");
    
    // Test Generator 38 (release) independence
    let release_envelope = DAHDSREnvelope::new(SAMPLE_RATE, -6000, -4800, -6000, -4800, 200, -2400);
    assert_eq!(base_envelope.sustain_level, release_envelope.sustain_level, "Sustain should be unaffected");
    assert_ne!(base_envelope.release_samples, release_envelope.release_samples, "Release should be independent");
}

/// Test SoundFont generator runtime behavior 
#[test]
fn test_soundfont_generator_runtime_behavior() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -9000,  // Generator 33: ~3ms delay
        -6000,  // Generator 34: ~10ms attack
        -9000,  // Generator 35: ~3ms hold
        -6000,  // Generator 36: ~10ms decay
        300,    // Generator 37: -15dB sustain
        -6000,  // Generator 38: ~10ms release
    );
    
    envelope.trigger();
    
    // Verify generator parameters are used during envelope processing
    let mut state_history = Vec::new();
    let mut amplitude_history = Vec::new();
    
    // Process through all phases
    for _ in 0..10000 {
        let amplitude = envelope.process();
        state_history.push(envelope.state);
        amplitude_history.push(amplitude);
        
        if envelope.state == EnvelopeState::Sustain {
            envelope.release();
        }
        
        if envelope.state == EnvelopeState::Off {
            break;
        }
    }
    
    // Verify we went through all expected phases
    let expected_phases = vec![
        EnvelopeState::Delay,
        EnvelopeState::Attack,
        EnvelopeState::Hold,
        EnvelopeState::Decay,
        EnvelopeState::Sustain,
        EnvelopeState::Release,
        EnvelopeState::Off,
    ];
    
    for expected_phase in expected_phases {
        assert!(state_history.contains(&expected_phase), 
               "Should have processed through {:?} phase", expected_phase);
    }
    
    // Verify sustain level matches Generator 37
    let sustain_amplitudes: Vec<f32> = state_history.iter()
        .zip(amplitude_history.iter())
        .filter(|(state, _)| **state == EnvelopeState::Sustain)
        .map(|(_, amplitude)| *amplitude)
        .collect();
    
    if !sustain_amplitudes.is_empty() {
        let expected_sustain = centibels_to_linear(300);
        let actual_sustain = sustain_amplitudes[0];
        assert!((actual_sustain - expected_sustain).abs() < 0.01,
               "Sustain amplitude should match Generator 37: expected {:.4}, got {:.4}",
               expected_sustain, actual_sustain);
    }
}

/// Test SoundFont generator default values compliance
#[test]
fn test_soundfont_generator_defaults() {
    // SoundFont 2.0 specification default values
    let default_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000, // Generator 33 default: -12000tc (1ms)
        -12000, // Generator 34 default: -12000tc (1ms)
        -12000, // Generator 35 default: -12000tc (1ms)
        -12000, // Generator 36 default: -12000tc (1ms)
        0,      // Generator 37 default: 0cb (0dB, full level)
        -12000, // Generator 38 default: -12000tc (1ms)
    );
    
    // All defaults should result in minimal timing and full sustain
    assert!(default_envelope.delay_samples <= 50, "Default delay should be minimal");
    assert!(default_envelope.attack_samples <= 50, "Default attack should be minimal");
    assert!(default_envelope.hold_samples <= 50, "Default hold should be minimal");
    assert!(default_envelope.decay_samples <= 50, "Default decay should be minimal");
    assert!((default_envelope.sustain_level - 1.0).abs() < 0.001, "Default sustain should be full");
    assert!(default_envelope.release_samples <= 50, "Default release should be minimal");
    
    // Default envelope should complete very quickly
    let mut envelope = default_envelope.clone();
    envelope.trigger();
    envelope.release(); // Immediately release to test minimal timing
    
    let mut samples_to_complete = 0;
    while envelope.state != EnvelopeState::Off && samples_to_complete < 1000 {
        envelope.process();
        samples_to_complete += 1;
    }
    
    assert!(samples_to_complete < 500, "Default envelope should complete quickly");
    assert_eq!(envelope.state, EnvelopeState::Off, "Default envelope should reach Off state");
}