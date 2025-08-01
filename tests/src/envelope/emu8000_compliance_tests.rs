use awe_synth::synth::envelope::{DAHDSREnvelope, EnvelopeState, timecents_to_seconds, centibels_to_linear};

const SAMPLE_RATE: f32 = 44100.0;

/// Test EMU8000 parameter range compliance - timecents
#[test]
fn test_emu8000_timecents_range_compliance() {
    // EMU8000 timecents range: -12000 to +8000 (SoundFont 2.0 spec)
    let test_timecents = vec![-12000, -8000, -4800, 0, 4800, 8000];
    
    for timecent in test_timecents {
        let seconds = timecents_to_seconds(timecent);
        
        // Very fast timing: -12000tc = ~1ms
        if timecent == -12000 {
            assert!((seconds - 0.001).abs() < 0.0001, 
                   "Fast timing: {}tc should be ~1ms, got {}s", timecent, seconds);
        }
        
        // Slow timing: 8000tc = 2^(8000/1200) = 2^6.667 ≈ 101.6 seconds
        if timecent == 8000 {
            assert!((seconds - 101.6).abs() < 1.0,
                   "Slow timing: {}tc should be ~101.6s, got {}s", timecent, seconds);
        }
        
        // All timings should be positive
        assert!(seconds > 0.0, "Timecents {} should produce positive time", timecent);
    }
}

/// Test EMU8000 centibels range compliance
#[test]
fn test_emu8000_centibels_range_compliance() {
    // EMU8000 centibels range: 0 to 1440cb (SoundFont 2.0 spec)
    let test_centibels = vec![0, 100, 200, 600, 1000, 1440];
    
    for centibel in test_centibels {
        let amplitude = centibels_to_linear(centibel);
        
        // 0cb = full amplitude (1.0)
        if centibel == 0 {
            assert!((amplitude - 1.0).abs() < 0.001,
                   "0cb should be full amplitude, got {}", amplitude);
        }
        
        // 600cb = 10^(-600/200) = 10^(-3) = 0.001 amplitude
        if centibel == 600 {
            assert!((amplitude - 0.001).abs() < 0.0001,
                   "600cb should be 0.001 amplitude, got {}", amplitude);
        }
        
        // 1440cb = maximum attenuation (~silent)
        if centibel == 1440 {
            assert!(amplitude < 0.01,
                   "1440cb should be very quiet, got {}", amplitude);
        }
        
        // All amplitudes should be in valid range
        assert!(amplitude >= 0.0 && amplitude <= 1.0,
               "Amplitude {} out of range for {}cb", amplitude, centibel);
    }
}

/// Test EMU8000 envelope curve authenticity - exponential attack
#[test]
fn test_emu8000_exponential_attack_curve() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000, // Very fast delay (1ms)
        -1200,  // ~1 second attack (much longer for better curve capture)
        0,      // No hold
        -7200,  // 16ms decay
        200,    // -2dB sustain
        -7200,  // 16ms release
    );
    
    envelope.trigger();
    
    let attack_samples = (1.0 * SAMPLE_RATE) as usize; // 1 second
    let mut attack_curve = Vec::new();
    
    // Collect attack curve samples
    for _ in 0..attack_samples {
        let amplitude = envelope.process();
        if envelope.state == EnvelopeState::Attack {
            attack_curve.push(amplitude);
        }
    }
    
    assert!(!attack_curve.is_empty(), "Should capture attack phase samples");
    
    // Verify exponential curve characteristics
    let quarter_point = attack_curve.len() / 4;
    let half_point = attack_curve.len() / 2;
    let three_quarter_point = 3 * attack_curve.len() / 4;
    
    if attack_curve.len() > 4 {
        // Exponential curve: slow start, fast finish
        let quarter_amp = attack_curve[quarter_point];
        let half_amp = attack_curve[half_point];
        let three_quarter_amp = attack_curve[three_quarter_point];
        
        // Should be exponentially increasing
        assert!(quarter_amp < half_amp, "Attack should be exponentially increasing");
        assert!(half_amp < three_quarter_amp, "Attack should be exponentially increasing");
        
        // Exponential curve should have more gain in later stages
        let first_half_gain = half_amp - attack_curve[0];
        let second_half_gain = attack_curve.last().unwrap() - half_amp;
        assert!(second_half_gain > first_half_gain, 
               "Exponential attack should have more gain in second half");
    }
}

/// Test EMU8000 envelope curve authenticity - exponential decay
#[test]
fn test_emu8000_exponential_decay_curve() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000,  // Very fast delay (1ms)
        -12000,  // Very fast attack (1ms)
        0,      // No hold
        -1200,  // ~1 second decay (much longer for better curve capture)
        600,    // 600cb sustain
        -7200,  // 16ms release
    );
    
    envelope.trigger();
    
    // Process through attack to get to decay
    for _ in 0..100 {
        envelope.process();
        if envelope.state == EnvelopeState::Decay {
            break;
        }
    }
    
    let decay_samples = (1.0 * SAMPLE_RATE) as usize; // 1 second
    let mut decay_curve = Vec::new();
    
    // Collect decay curve samples
    for _ in 0..decay_samples {
        let amplitude = envelope.process();
        if envelope.state == EnvelopeState::Decay {
            decay_curve.push(amplitude);
        }
    }
    
    assert!(!decay_curve.is_empty(), "Should capture decay phase samples");
    
    // Verify exponential decay characteristics
    if decay_curve.len() > 4 {
        let quarter_point = decay_curve.len() / 4;
        let half_point = decay_curve.len() / 2;
        let three_quarter_point = 3 * decay_curve.len() / 4;
        
        let quarter_amp = decay_curve[quarter_point];
        let half_amp = decay_curve[half_point];
        let three_quarter_amp = decay_curve[three_quarter_point];
        
        // Should be exponentially decreasing
        assert!(quarter_amp > half_amp, "Decay should be exponentially decreasing");
        assert!(half_amp > three_quarter_amp, "Decay should be exponentially decreasing");
        
        // Exponential decay should have more drop in second half (exponential curve is steep later)
        let first_half_drop = decay_curve[0] - half_amp;
        let second_half_drop = half_amp - decay_curve.last().unwrap();
        assert!(second_half_drop > first_half_drop, 
               "Exponential decay should have more drop in second half: first={:.4}, second={:.4}", 
               first_half_drop, second_half_drop);
    }
}

/// Test EMU8000 6-stage sequence compliance
#[test]
fn test_emu8000_6_stage_sequence() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -8000,  // ~6ms delay
        -6000,  // ~10ms attack
        -8000,  // ~6ms hold
        -6000,  // ~10ms decay
        400,    // -4dB sustain
        -6000,  // ~10ms release
    );
    
    // Should start in Off state
    assert_eq!(envelope.state, EnvelopeState::Off);
    
    envelope.trigger();
    assert_eq!(envelope.state, EnvelopeState::Delay);
    
    let mut state_sequence = Vec::new();
    
    // Process through all phases
    for _ in 0..5000 {
        envelope.process();
        let current_state = envelope.state;
        
        // Record state transitions
        if state_sequence.is_empty() || state_sequence.last() != Some(&current_state) {
            state_sequence.push(current_state);
        }
        
        // Trigger release when we reach sustain
        if current_state == EnvelopeState::Sustain && state_sequence.len() == 5 {
            envelope.release();
        }
        
        // Stop when we reach Off again
        if current_state == EnvelopeState::Off && state_sequence.len() > 5 {
            break;
        }
    }
    
    // Verify EMU8000 6-stage sequence: Off -> Delay -> Attack -> Hold -> Decay -> Sustain -> Release -> Off
    let expected_sequence = vec![
        EnvelopeState::Delay,
        EnvelopeState::Attack,
        EnvelopeState::Hold,
        EnvelopeState::Decay,
        EnvelopeState::Sustain,
        EnvelopeState::Release,
        EnvelopeState::Off,
    ];
    
    assert_eq!(state_sequence, expected_sequence, 
              "Should follow EMU8000 6-stage sequence exactly");
}

/// Test EMU8000 sustain level accuracy
#[test]
fn test_emu8000_sustain_level_accuracy() {
    // Test various sustain levels from SoundFont specification
    // Formula: amplitude = 10^(-centibels/200)
    let sustain_tests = vec![
        (0, 1.0),           // 0cb = 10^0 = 1.0
        (100, 0.316),       // 100cb = 10^(-0.5) ≈ 0.316
        (200, 0.1),         // 200cb = 10^(-1) = 0.1
        (600, 0.001),       // 600cb = 10^(-3) = 0.001
        (1000, 0.00001),    // 1000cb = 10^(-5) = 0.00001
    ];
    
    for (sustain_cb, expected_amplitude) in sustain_tests {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000,   // Very fast delay (1ms)
            -8000,    // Fast attack (~6ms)
            -12000,   // Very fast hold (1ms)
            -8000,    // Fast decay (~6ms)
            sustain_cb,
            -7200,    // Normal release
        );
        
        envelope.trigger();
        
        // Process to sustain phase - need more samples for longer timing
        for _ in 0..5000 {
            envelope.process();
            if envelope.state == EnvelopeState::Sustain {
                break;
            }
        }
        
        assert_eq!(envelope.state, EnvelopeState::Sustain, 
                  "Should reach sustain phase for {}cb", sustain_cb);
        
        let sustain_amplitude = envelope.current_level;
        let tolerance = 0.02; // 2% tolerance for float precision
        
        assert!((sustain_amplitude - expected_amplitude).abs() < tolerance,
               "Sustain {}cb: expected {:.3}, got {:.3}", 
               sustain_cb, expected_amplitude, sustain_amplitude);
    }
}

/// Test EMU8000 timing precision at 44.1kHz
#[test]
fn test_emu8000_timing_precision() {
    // Test specific timecents values for precise timing
    let timing_tests = vec![
        (-12000, 0.001),   // 1ms
        (-9600, 0.004),    // ~4ms  
        (-7200, 0.016),    // ~16ms
        (-4800, 0.063),    // ~63ms
        (-2400, 0.251),    // ~251ms
        (0, 1.0),          // 1 second
    ];
    
    for (timecents, expected_seconds) in timing_tests {
        let actual_seconds = timecents_to_seconds(timecents);
        let tolerance = (expected_seconds * 0.05_f32).max(0.0001_f32); // 5% tolerance, minimum 0.1ms
        
        assert!((actual_seconds - expected_seconds).abs() < tolerance,
               "Timing {}tc: expected {:.6}s, got {:.6}s (tolerance: {:.6})", 
               timecents, expected_seconds, actual_seconds, tolerance);
        
        // Test in actual envelope with sample counting
        let expected_samples = (expected_seconds * SAMPLE_RATE) as u32;
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,         // No delay
            timecents, // Test attack timing
            0,         // No hold
            -7200,     // Normal decay
            200,       // Normal sustain
            -7200,     // Normal release
        );
        
        // Check that sample count matches expectation
        let sample_tolerance = 50; // ±50 samples tolerance for floating point precision  
        assert!((envelope.attack_samples as i32 - expected_samples as i32).abs() <= sample_tolerance,
               "Attack samples for {}tc: expected ~{}, got {} (tolerance: ±{})", 
               timecents, expected_samples, envelope.attack_samples, sample_tolerance);
    }
}

/// Test EMU8000 envelope release from any phase
#[test]
fn test_emu8000_release_from_any_phase() {
    let phases_to_test = vec![
        (EnvelopeState::Delay, 100),
        (EnvelopeState::Attack, 3000),   // Much more samples needed for attack 
        (EnvelopeState::Hold, 6000),     // Much more samples for hold
        (EnvelopeState::Decay, 12000),   // Much more samples for decay
        (EnvelopeState::Sustain, 20000), // Much more samples for sustain
    ];
    
    for (target_phase, samples_to_process) in phases_to_test {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -6000,  // ~10ms delay
            -4800,  // ~63ms attack
            -6000,  // ~10ms hold
            -4800,  // ~63ms decay
            400,    // -4dB sustain
            -4800,  // ~63ms release
        );
        
        envelope.trigger();
        
        // Process to target phase
        for _ in 0..samples_to_process {
            envelope.process();
            if envelope.state == target_phase {
                break;
            }
        }
        
        // Should reach target phase
        assert_eq!(envelope.state, target_phase, "Should reach {:?} phase", target_phase);
        
        // Release from this phase
        let pre_release_level = envelope.current_level;
        envelope.release();
        
        // Should immediately transition to Release phase
        assert_eq!(envelope.state, EnvelopeState::Release, 
                  "Should transition to Release from {:?}", target_phase);
        
        // Process several release samples
        let mut post_release_level = pre_release_level;
        for _ in 0..10 {
            post_release_level = envelope.process();
        }
        
        // Level should be decreasing or at least not significantly increasing
        // Allow small increase for numerical precision in first sample
        let tolerance = 0.01;
        assert!(post_release_level <= pre_release_level + tolerance,
               "Release should not significantly increase level from {:?} phase: {:.6} -> {:.6}", 
               target_phase, pre_release_level, post_release_level);
    }
}

/// Test EMU8000 parameter boundary conditions
#[test]
fn test_emu8000_parameter_boundaries() {
    // Test extreme parameter values
    let boundary_envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -12000,  // Minimum delay (fastest)
        8000,    // Maximum attack (slowest)
        -12000,  // Minimum hold (fastest)
        8000,    // Maximum decay (slowest)
        1440,    // Maximum sustain attenuation (quietest)
        -12000,  // Minimum release (fastest)
    );
    
    // All parameters should be within valid ranges
    assert!(boundary_envelope.delay_samples <= 100, 
           "Very fast delay should be ≤100 samples");
    assert!(boundary_envelope.attack_samples > 100000, 
           "Very slow attack should be >100k samples");
    assert!(boundary_envelope.hold_samples <= 100, 
           "Very fast hold should be ≤100 samples");
    assert!(boundary_envelope.decay_samples > 100000, 
           "Very slow decay should be >100k samples");
    assert!(boundary_envelope.sustain_level < 0.01, 
           "Maximum attenuation should be nearly silent");
    assert!(boundary_envelope.release_samples <= 100, 
           "Very fast release should be ≤100 samples");
}

/// Test EMU8000 envelope amplitude never exceeds 1.0
#[test]
fn test_emu8000_amplitude_ceiling() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        0,      // No delay
        -7200,  // 16ms attack
        -4800,  // 63ms hold
        -7200,  // 16ms decay
        0,      // 0dB sustain (full level)
        -7200,  // 16ms release
    );
    
    envelope.trigger();
    
    // Process through entire envelope lifecycle
    for _ in 0..10000 {
        let amplitude = envelope.process();
        
        // Amplitude must never exceed 1.0 (EMU8000 hardware limit)
        assert!(amplitude <= 1.0, 
               "Amplitude {:.6} exceeds 1.0 limit in {:?} phase", 
               amplitude, envelope.state);
        
        // Also ensure amplitude is never negative
        assert!(amplitude >= 0.0,
               "Amplitude {:.6} is negative in {:?} phase",
               amplitude, envelope.state);
        
        if envelope.state == EnvelopeState::Sustain {
            envelope.release();
        }
        
        if envelope.state == EnvelopeState::Off {
            break;
        }
    }
}

/// Test EMU8000 envelope consistency across multiple triggers
#[test]
fn test_emu8000_envelope_trigger_consistency() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -8000,  // 6ms delay
        -6000,  // 10ms attack
        -8000,  // 6ms hold
        -6000,  // 10ms decay
        300,    // -3dB sustain
        -6000,  // 10ms release
    );
    
    let mut first_run_samples = Vec::new();
    let mut second_run_samples = Vec::new();
    
    // First run
    envelope.trigger();
    for _ in 0..1000 {
        first_run_samples.push(envelope.process());
        if envelope.state == EnvelopeState::Sustain {
            envelope.release();
        }
        if envelope.state == EnvelopeState::Off {
            break;
        }
    }
    
    // Second run (should be identical)
    envelope.trigger();
    for _ in 0..1000 {
        second_run_samples.push(envelope.process());
        if envelope.state == EnvelopeState::Sustain {
            envelope.release();
        }
        if envelope.state == EnvelopeState::Off {
            break;
        }
    }
    
    // Both runs should produce identical results
    assert_eq!(first_run_samples.len(), second_run_samples.len(),
              "Envelope runs should have same length");
    
    let tolerance = 0.0001;
    for (i, (first, second)) in first_run_samples.iter().zip(second_run_samples.iter()).enumerate() {
        assert!((first - second).abs() < tolerance,
               "Sample {}: first run {:.6} != second run {:.6}", i, first, second);
    }
}