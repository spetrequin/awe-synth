use crate::envelope::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_envelope_initial_state() {
        let envelope = create_test_envelope();
        assert_eq!(envelope.state, EnvelopeState::Off);
        assert_eq!(envelope.current_level, 0.0);
    }

    #[test]
    fn test_envelope_trigger_starts_delay_phase() {
        let mut envelope = create_test_envelope();
        envelope.trigger();
        
        // Should transition to Delay phase (or Attack if delay is 0)
        assert!(matches!(envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
        assert_eq!(envelope.stage_samples, 0);
    }

    #[test]
    fn test_envelope_state_transitions_complete_cycle() {
        let mut envelope = create_timed_envelope();
        envelope.trigger();
        
        // Track state transitions through complete envelope cycle
        let mut state_history = Vec::new();
        let mut max_samples = 10000; // Prevent infinite loop
        
        while max_samples > 0 && envelope.state != EnvelopeState::Off {
            state_history.push(envelope.state);
            envelope.process();
            max_samples -= 1;
        }
        
        // Verify we went through all expected states
        let unique_states: std::collections::HashSet<_> = state_history.into_iter().collect();
        
        // Should have seen Delay, Attack, Hold, Decay, Sustain phases
        assert!(unique_states.contains(&EnvelopeState::Delay));
        assert!(unique_states.contains(&EnvelopeState::Attack));
        assert!(unique_states.contains(&EnvelopeState::Hold));
        assert!(unique_states.contains(&EnvelopeState::Decay));
        assert!(unique_states.contains(&EnvelopeState::Sustain));
    }

    #[test]
    fn test_envelope_release_triggers_release_phase() {
        let mut envelope = create_test_envelope();
        envelope.trigger();
        
        // Process a few samples to get into a stable state
        for _ in 0..10 {
            envelope.process();
        }
        
        // Trigger release
        envelope.release();
        
        // Should be in Release phase
        assert_eq!(envelope.state, EnvelopeState::Release);
    }

    #[test]
    fn test_envelope_off_state_no_processing() {
        let mut envelope = create_test_envelope();
        
        // Envelope should start in Off state
        assert_eq!(envelope.state, EnvelopeState::Off);
        
        // Processing in Off state should return 0.0
        let amplitude = envelope.process();
        assert_eq!(amplitude, 0.0);
        assert_eq!(envelope.current_level, 0.0);
    }

    #[test]
    fn test_envelope_delay_phase_timing() {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -6000, // delay_time_cents (~10ms = ~441 samples at 44.1kHz)
            -7200, // attack_time_cents
            0,     // hold_time_cents
            -7200, // decay_time_cents
            0,     // sustain_level_cb
            -7200, // release_time_cents
        );
        
        envelope.trigger();
        assert_eq!(envelope.state, EnvelopeState::Delay);
        
        // Process through delay phase
        let expected_delay_samples = envelope.delay_samples;
        let mut samples_processed = 0;
        
        while envelope.state == EnvelopeState::Delay && samples_processed < expected_delay_samples + 10 {
            envelope.process();
            samples_processed += 1;
        }
        
        // Should have transitioned to Attack after delay period
        assert_eq!(envelope.state, EnvelopeState::Attack);
        
        // Delay timing should be approximately correct (within 2 samples)
        assert!((samples_processed as i32 - expected_delay_samples as i32).abs() <= 2);
    }

    #[test]
    fn test_envelope_attack_phase_progression() {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // delay_time_cents (~1ms, minimal delay)
            -4800,  // attack_time_cents (~63ms)
            -12000, // hold_time_cents (~1ms, minimal hold)
            -7200,  // decay_time_cents
            0,      // sustain_level_cb
            -7200,  // release_time_cents
        );
        
        envelope.trigger();
        assert_eq!(envelope.state, EnvelopeState::Delay);
        
        // Process through delay to reach attack
        while envelope.state == EnvelopeState::Delay {
            envelope.process();
        }
        assert_eq!(envelope.state, EnvelopeState::Attack);
        
        let mut previous_level = 0.0;
        let mut samples_in_attack = 0;
        
        // Process through attack phase
        while envelope.state == EnvelopeState::Attack && samples_in_attack < 10000 {
            let current_level = envelope.process();
            
            // Level should increase during attack (exponential curve)
            if samples_in_attack > 0 {
                assert!(current_level >= previous_level, 
                    "Attack level should increase: {} -> {}", previous_level, current_level);
            }
            
            previous_level = current_level;
            samples_in_attack += 1;
        }
        
        // Should have transitioned to Hold phase
        assert!(matches!(envelope.state, EnvelopeState::Hold | EnvelopeState::Decay));
        
        // Attack should have increased the level significantly
        assert!(previous_level > 0.5, "Attack should reach significant level: {}", previous_level);
    }

    #[test]
    fn test_envelope_sustain_phase_stable_level() {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // delay_time_cents (~1ms, minimal delay)
            -7200,  // attack_time_cents (~16ms, fast attack)
            -12000, // hold_time_cents (~1ms, minimal hold)
            -7200,  // decay_time_cents (~16ms, fast decay)
            -200,   // sustain_level_cb (-200cb = ~79% level)
            -4800,  // release_time_cents (~63ms)
        );
        
        envelope.trigger();
        
        // Process until we reach sustain phase
        let mut samples_processed = 0;
        while envelope.state != EnvelopeState::Sustain && samples_processed < 10000 {
            envelope.process();
            samples_processed += 1;
        }
        
        assert_eq!(envelope.state, EnvelopeState::Sustain);
        
        // Sustain level should remain stable
        let sustain_level = envelope.current_level;
        
        for _ in 0..100 {
            let level = envelope.process();
            assert!((level - sustain_level).abs() < TEST_TOLERANCE,
                "Sustain level should be stable: expected {}, got {}", sustain_level, level);
        }
        
        // Should still be in sustain phase
        assert_eq!(envelope.state, EnvelopeState::Sustain);
    }

    #[test]
    fn test_envelope_release_phase_decay_to_zero() {
        let mut envelope = create_test_envelope();
        envelope.trigger();
        
        // Process to get some level
        for _ in 0..50 {
            envelope.process();
        }
        
        let level_before_release = envelope.current_level;
        assert!(level_before_release > 0.0);
        
        // Trigger release
        envelope.release();
        assert_eq!(envelope.state, EnvelopeState::Release);
        
        let mut release_samples = 0;
        let mut previous_level = level_before_release;
        
        // Process through release phase
        while envelope.state == EnvelopeState::Release && release_samples < 10000 {
            let current_level = envelope.process();
            
            // Level should decrease during release
            assert!(current_level <= previous_level + TEST_TOLERANCE,
                "Release level should decrease: {} -> {}", previous_level, current_level);
            
            previous_level = current_level;
            release_samples += 1;
        }
        
        // Should eventually reach Off state
        assert_eq!(envelope.state, EnvelopeState::Off);
        assert!(envelope.current_level <= TEST_TOLERANCE);
    }

    #[test]
    fn test_timecents_conversion_accuracy() {
        // Test various timecents values for accuracy at 44.1kHz
        let sample_rate = SAMPLE_RATE;
        
        // Test timecents conversion formula: time_seconds = 2^(timecents / 1200)
        
        // Test case 1: -7200 timecents = 2^(-7200/1200) = 2^(-6) = 1/64 ≈ 0.015625 seconds
        let timecents = -7200;
        let actual_seconds = timecents_to_seconds(timecents);
        let expected_seconds = 2.0_f32.powf(-7200.0 / 1200.0); // 2^(-6) = 0.015625
        let expected_samples = (expected_seconds * sample_rate) as u32;
        let actual_samples = (actual_seconds * sample_rate) as u32;
        
        // Should be within ±1 sample tolerance
        assert!((actual_samples as i32 - expected_samples as i32).abs() <= 1,
            "Timecents {} conversion: expected {} samples ({}s), got {} samples ({}s)",
            timecents, expected_samples, expected_seconds, actual_samples, actual_seconds);
        
        // Test case 2: -6000 timecents = 2^(-6000/1200) = 2^(-5) = 1/32 ≈ 0.03125 seconds
        let timecents = -6000;
        let actual_seconds = timecents_to_seconds(timecents);
        let expected_seconds = 2.0_f32.powf(-6000.0 / 1200.0); // 2^(-5) = 0.03125
        let expected_samples = (expected_seconds * sample_rate) as u32;
        let actual_samples = (actual_seconds * sample_rate) as u32;
        
        assert!((actual_samples as i32 - expected_samples as i32).abs() <= 1,
            "Timecents {} conversion: expected {} samples ({}s), got {} samples ({}s)",
            timecents, expected_samples, expected_seconds, actual_samples, actual_seconds);
        
        // Test case 3: -4800 timecents = 2^(-4800/1200) = 2^(-4) = 1/16 ≈ 0.0625 seconds
        let timecents = -4800;
        let actual_seconds = timecents_to_seconds(timecents);
        let expected_seconds = 2.0_f32.powf(-4800.0 / 1200.0); // 2^(-4) = 0.0625
        let expected_samples = (expected_seconds * sample_rate) as u32;
        let actual_samples = (actual_seconds * sample_rate) as u32;
        
        assert!((actual_samples as i32 - expected_samples as i32).abs() <= 1,
            "Timecents {} conversion: expected {} samples ({}s), got {} samples ({}s)",
            timecents, expected_samples, expected_seconds, actual_samples, actual_seconds);
        
        // Test case 4: 0 timecents = 2^(0/1200) = 2^0 = 1.0 second
        let timecents = 0;
        let actual_seconds = timecents_to_seconds(timecents);
        let expected_seconds = 1.0;
        let expected_samples = (expected_seconds * sample_rate) as u32;
        let actual_samples = (actual_seconds * sample_rate) as u32;
        
        assert!((actual_samples as i32 - expected_samples as i32).abs() <= 1,
            "Timecents {} conversion: expected {} samples ({}s), got {} samples ({}s)",
            timecents, expected_samples, expected_seconds, actual_samples, actual_seconds);
    }

    #[test]
    fn test_envelope_timing_at_44khz_sample_rate() {
        // Test envelope with known timing parameters at 44.1kHz
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // delay: ~1ms = ~44 samples
            -8854,  // attack: ~6ms = ~265 samples (corrected from -8000tc)
            -12000, // hold: ~1ms = ~44 samples
            -8854,  // decay: ~6ms = ~265 samples (corrected from -8000tc)
            -200,   // sustain: -200cb
            -8854,  // release: ~6ms = ~265 samples (corrected from -8000tc)
        );
        
        envelope.trigger();
        
        // Test delay timing
        let mut delay_samples = 0;
        while envelope.state == EnvelopeState::Delay {
            envelope.process();
            delay_samples += 1;
            if delay_samples > 100 { break; } // Safety check
        }
        
        // Delay should be approximately 44 samples (±1 sample tolerance)
        assert!((delay_samples as i32 - 44).abs() <= 1,
            "Delay timing: expected ~44 samples, got {} samples", delay_samples);
        
        // Test attack timing
        let mut attack_samples = 0;
        while envelope.state == EnvelopeState::Attack {
            envelope.process();
            attack_samples += 1;
            if attack_samples > 500 { break; } // Safety check
        }
        
        // Attack should be approximately 265 samples (±5 sample tolerance for -8854tc)
        assert!((attack_samples as i32 - 265).abs() <= 5,
            "Attack timing: expected ~265 samples, got {} samples", attack_samples);
        
        // Test hold timing
        let mut hold_samples = 0;
        while envelope.state == EnvelopeState::Hold {
            envelope.process();
            hold_samples += 1;
            if hold_samples > 100 { break; } // Safety check
        }
        
        // Hold should be approximately 44 samples (±1 sample tolerance)
        assert!((hold_samples as i32 - 44).abs() <= 1,
            "Hold timing: expected ~44 samples, got {} samples", hold_samples);
    }

    #[test]
    fn test_sample_accurate_envelope_progression() {
        // Test that envelope processes exactly one sample per process() call
        let mut envelope = create_test_envelope();
        envelope.trigger();
        
        let initial_stage_samples = envelope.stage_samples;
        envelope.process();
        let after_one_sample = envelope.stage_samples;
        
        // Stage samples should advance by exactly 1
        assert_eq!(after_one_sample, initial_stage_samples + 1,
            "Envelope should advance by exactly 1 sample per process() call");
        
        // Process multiple samples and verify consistent progression
        for i in 2..=10 {
            envelope.process();
            let current_stage_samples = envelope.stage_samples;
            assert_eq!(current_stage_samples, initial_stage_samples + i,
                "After {} process() calls, stage_samples should be {}", i, initial_stage_samples + i);
        }
    }

    #[test]
    fn test_timing_precision_boundary_conditions() {
        // Test timing precision at boundary conditions
        
        // Very short envelope (minimum timing)
        let mut short_envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -32768, // delay: minimum timecents (very short)
            -32768, // attack: minimum timecents
            -32768, // hold: minimum timecents
            -32768, // decay: minimum timecents
            0,      // sustain: full level
            -32768, // release: minimum timecents
        );
        
        short_envelope.trigger();
        
        // Should still progress through states even with minimum timing
        let mut state_changes = 0;
        let mut previous_state = short_envelope.state;
        
        for _ in 0..1000 {
            short_envelope.process();
            if short_envelope.state != previous_state {
                state_changes += 1;
                previous_state = short_envelope.state;
            }
            if short_envelope.state == EnvelopeState::Sustain {
                break;
            }
        }
        
        // Should have progressed through at least 3 states (Delay->Attack->Hold->Decay->Sustain)
        assert!(state_changes >= 3, "Should progress through multiple states even with minimum timing");
        
        // Long envelope timing test
        let mut long_envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // delay: ~1ms, minimal delay
            -2400,  // attack: ~250ms (long attack for testing)
            -12000, // hold: ~1ms, minimal hold
            -2400,  // decay: ~250ms 
            -960,   // sustain: -960cb = 50% level
            -2400,  // release: ~250ms
        );
        
        long_envelope.trigger();
        
        // Should still be in attack phase after 100 samples (250ms attack = ~11025 samples)
        for _ in 0..100 {
            long_envelope.process();
        }
        
        assert_eq!(long_envelope.state, EnvelopeState::Attack,
            "Long envelope should still be in attack phase after 100 samples");
    }

    #[test]
    fn test_exponential_curve_attack_progression() {
        // Test that attack phase uses exponential curve with powf(2.0) factor
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // delay: ~1ms, minimal delay
            -6000,  // attack: ~10ms = ~441 samples
            -12000, // hold: ~1ms, minimal hold
            -7200,  // decay: fast decay
            0,      // sustain: full level
            -7200,  // release: fast release
        );
        
        envelope.trigger();
        
        // Process through delay to reach attack phase
        while envelope.state == EnvelopeState::Delay {
            envelope.process();
        }
        assert_eq!(envelope.state, EnvelopeState::Attack);
        
        // Collect attack progression samples
        let mut attack_levels = Vec::new();
        let mut samples_in_attack = 0;
        
        while envelope.state == EnvelopeState::Attack && samples_in_attack < 2000 {
            let level = envelope.process();
            attack_levels.push(level);
            samples_in_attack += 1;
        }
        
        // Verify we have sufficient attack samples
        assert!(attack_levels.len() > 100, "Should have substantial attack progression");
        
        // Test exponential curve characteristics
        // Early attack should progress slower than linear
        let quarter_point = attack_levels.len() / 4;
        let half_point = attack_levels.len() / 2;
        let three_quarter_point = (attack_levels.len() * 3) / 4;
        
        if attack_levels.len() > 4 {
            let early_level = attack_levels[quarter_point];
            let mid_level = attack_levels[half_point];
            let late_level = attack_levels[three_quarter_point];
            let final_level = attack_levels[attack_levels.len() - 1];
            
            // Exponential curve should show accelerating progression
            // (slower start, faster end compared to linear)
            let first_quarter_gain = mid_level - early_level;
            let last_quarter_gain = final_level - late_level;
            
            assert!(last_quarter_gain > first_quarter_gain,
                "Exponential attack: last quarter gain ({}) should exceed first quarter gain ({})",
                last_quarter_gain, first_quarter_gain);
        }
    }

    #[test]
    fn test_exponential_curve_decay_progression() {
        // Test that decay phase uses exponential curve with powf(2.0) factor
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000, // delay: ~1ms, minimal delay
            -7200,  // attack: ~16ms, fast attack to reach peak quickly
            -12000, // hold: ~1ms, minimal hold
            -6000,  // decay: ~10ms = ~441 samples
            600,    // sustain: 600cb ≈ 50% level (0.5 amplitude)
            -7200,  // release: ~16ms, fast release
        );
        
        envelope.trigger();
        
        // Process until we reach decay phase
        let mut samples_processed = 0;
        while envelope.state != EnvelopeState::Decay && samples_processed < 5000 {
            envelope.process();
            samples_processed += 1;
        }
        
        // Should now be in decay phase
        assert_eq!(envelope.state, EnvelopeState::Decay);
        
        // Collect decay progression samples
        let mut decay_levels = Vec::new();
        let mut samples_in_decay = 0;
        
        while envelope.state == EnvelopeState::Decay && samples_in_decay < 2000 {
            let level = envelope.process();
            decay_levels.push(level);
            samples_in_decay += 1;
        }
        
        // Verify we have sufficient decay samples
        assert!(decay_levels.len() > 100, "Should have substantial decay progression");
        
        // Test exponential decay characteristics
        if decay_levels.len() > 4 {
            let quarter_point = decay_levels.len() / 4;
            let half_point = decay_levels.len() / 2;
            let three_quarter_point = (decay_levels.len() * 3) / 4;
            
            let early_level = decay_levels[quarter_point];
            let mid_level = decay_levels[half_point];
            let late_level = decay_levels[three_quarter_point];
            let final_level = decay_levels[decay_levels.len() - 1];
            
            // Exponential decay should show decelerating progression
            // (faster start, slower end)
            let first_quarter_drop = early_level - mid_level;
            let last_quarter_drop = late_level - final_level;
            
            assert!(first_quarter_drop > last_quarter_drop,
                "Exponential decay: first quarter drop ({}) should exceed last quarter drop ({})",
                first_quarter_drop, last_quarter_drop);
            
            // All levels should be decreasing
            assert!(early_level > mid_level, "Decay levels should decrease: {} > {}", early_level, mid_level);
            assert!(mid_level > late_level, "Decay levels should decrease: {} > {}", mid_level, late_level);
            assert!(late_level > final_level, "Decay levels should decrease: {} > {}", late_level, final_level);
        }
    }

    #[test]
    fn test_exponential_curve_release_progression() {
        // Test that release phase uses exponential curve with powf(2.0) factor
        let mut envelope = create_test_envelope();
        envelope.trigger();
        
        // Process to get to sustain phase
        let mut samples_processed = 0;
        while envelope.state != EnvelopeState::Sustain && samples_processed < 5000 {
            envelope.process();
            samples_processed += 1;
        }
        
        // Verify we're in sustain, then trigger release
        if envelope.state == EnvelopeState::Sustain {
            envelope.release();
            assert_eq!(envelope.state, EnvelopeState::Release);
            
            // Collect release progression samples
            let mut release_levels = Vec::new();
            let mut samples_in_release = 0;
            
            while envelope.state == EnvelopeState::Release && samples_in_release < 2000 {
                let level = envelope.process();
                release_levels.push(level);
                samples_in_release += 1;
            }
            
            // Verify we have sufficient release samples
            assert!(release_levels.len() > 50, "Should have substantial release progression");
            
            // Test exponential release characteristics
            if release_levels.len() > 4 {
                let quarter_point = release_levels.len() / 4;
                let half_point = release_levels.len() / 2;
                let three_quarter_point = (release_levels.len() * 3) / 4;
                
                let early_level = release_levels[quarter_point];
                let mid_level = release_levels[half_point];
                let late_level = release_levels[three_quarter_point];
                let final_level = release_levels[release_levels.len() - 1];
                
                // Exponential release should show decelerating progression
                let first_quarter_drop = early_level - mid_level;
                let last_quarter_drop = late_level - final_level;
                
                assert!(first_quarter_drop > last_quarter_drop,
                    "Exponential release: first quarter drop ({}) should exceed last quarter drop ({})",
                    first_quarter_drop, last_quarter_drop);
                
                // All levels should be decreasing toward zero
                assert!(early_level > mid_level, "Release levels should decrease: {} > {}", early_level, mid_level);
                assert!(mid_level > late_level, "Release levels should decrease: {} > {}", mid_level, late_level);
                assert!(late_level >= final_level, "Release levels should decrease: {} >= {}", late_level, final_level);
            }
        }
    }

    #[test]
    fn test_exponential_curve_powf_factor_validation() {
        // Test that envelope curves use the correct powf(2.0) exponential factor
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            0,     // delay: no delay
            -4800, // attack: longer attack for better curve analysis
            0,     // hold: no hold
            -4800, // decay: longer decay
            -600,  // sustain: -600cb = ~25% level
            -4800, // release: longer release
        );
        
        envelope.trigger();
        
        // Process through attack phase and collect progression
        let mut attack_progression = Vec::new();
        let mut samples_in_attack = 0;
        
        while envelope.state == EnvelopeState::Attack && samples_in_attack < 5000 {
            let level = envelope.process();
            attack_progression.push(level);
            samples_in_attack += 1;
        }
        
        // Verify exponential characteristics exist
        if attack_progression.len() > 10 {
            // Check that progression is not linear
            let start_level = attack_progression[0];
            let end_level = attack_progression[attack_progression.len() - 1];
            let midpoint_index = attack_progression.len() / 2;
            let actual_midpoint = attack_progression[midpoint_index];
            
            // Linear progression would be: start + (end - start) * 0.5
            let linear_midpoint = start_level + (end_level - start_level) * 0.5;
            
            // Exponential curve should differ significantly from linear
            let difference = (actual_midpoint - linear_midpoint).abs();
            let range = (end_level - start_level).abs();
            let relative_difference = difference / range;
            
            assert!(relative_difference > 0.1,
                "Exponential curve should differ from linear by >10%: actual mid={}, linear mid={}, diff={}%",
                actual_midpoint, linear_midpoint, relative_difference * 100.0);
        }
    }

    #[test]
    fn test_curve_smoothness_and_continuity() {
        // Test that exponential curves are smooth without sudden jumps
        let mut envelope = create_timed_envelope();
        envelope.trigger();
        
        let mut previous_level = 0.0;
        let mut max_jump: f32 = 0.0;
        let mut samples_processed = 0;
        
        // Process through multiple envelope phases
        while samples_processed < 10000 && envelope.state != EnvelopeState::Off {
            let current_level = envelope.process();
            
            if samples_processed > 0 {
                let jump = (current_level - previous_level).abs();
                max_jump = max_jump.max(jump);
                
                // No single sample should cause a jump >50% of full range
                assert!(jump < 0.5,
                    "Envelope curve too steep: jump of {} at sample {} (state: {:?})",
                    jump, samples_processed, envelope.state);
            }
            
            previous_level = current_level;
            samples_processed += 1;
        }
        
        // Overall curve should be reasonably smooth
        assert!(max_jump < 0.2, "Maximum envelope jump should be <0.2, got {}", max_jump);
    }

    #[test]
    fn test_timecents_to_seconds_formula() {
        // Test the SoundFont 2.0 timecents conversion formula: time_seconds = 2^(timecents / 1200)
        
        // Test known values with high precision
        assert_eq!(timecents_to_seconds(0), 1.0);  // 2^(0/1200) = 2^0 = 1.0 second
        assert_eq!(timecents_to_seconds(1200), 2.0);  // 2^(1200/1200) = 2^1 = 2.0 seconds
        assert_eq!(timecents_to_seconds(-1200), 0.5);  // 2^(-1200/1200) = 2^-1 = 0.5 seconds
        
        // Test common SoundFont timing values
        let result_7200 = timecents_to_seconds(-7200);  // 2^(-6) = 1/64
        let expected_7200 = 1.0 / 64.0;
        assert!((result_7200 - expected_7200).abs() < 0.0001, 
            "-7200 timecents: expected {}, got {}", expected_7200, result_7200);
        
        let result_6000 = timecents_to_seconds(-6000);  // 2^(-5) = 1/32
        let expected_6000 = 1.0 / 32.0;
        assert!((result_6000 - expected_6000).abs() < 0.0001,
            "-6000 timecents: expected {}, got {}", expected_6000, result_6000);
        
        let result_4800 = timecents_to_seconds(-4800);  // 2^(-4) = 1/16
        let expected_4800 = 1.0 / 16.0;
        assert!((result_4800 - expected_4800).abs() < 0.0001,
            "-4800 timecents: expected {}, got {}", expected_4800, result_4800);
        
        // Test extreme values
        let result_min = timecents_to_seconds(-32768);  // Minimum timecents
        assert!(result_min > 0.0 && result_min < 0.001, "Minimum timecents should be very small but positive");
        
        let result_max = timecents_to_seconds(32767);   // Maximum timecents
        assert!(result_max > 1000.0, "Maximum timecents should be very large");
    }

    #[test]
    fn test_centibels_to_linear_formula() {
        // Test the SoundFont 2.0 centibels conversion formula: amplitude = 10^(-centibels / 200)
        
        // Test known values with high precision
        assert_eq!(centibels_to_linear(0), 1.0);  // 10^(-0/200) = 10^0 = 1.0 (full level)
        
        let result_200 = centibels_to_linear(-200);  // 10^(-(-200)/200) = 10^1 = 10.0
        assert!((result_200 - 10.0).abs() < 0.0001,
            "-200 centibels: expected 10.0, got {}", result_200);
        
        let result_pos_200 = centibels_to_linear(200);  // 10^(-200/200) = 10^-1 = 0.1
        assert!((result_pos_200 - 0.1).abs() < 0.0001,
            "200 centibels: expected 0.1, got {}", result_pos_200);
        
        // Test common SoundFont sustain levels
        let result_960 = centibels_to_linear(960);  // 10^(-960/200) = 10^-4.8
        let expected_960 = 10.0_f32.powf(-4.8);
        assert!((result_960 - expected_960).abs() < 0.0001,
            "960 centibels: expected {}, got {}", expected_960, result_960);
        
        let result_600 = centibels_to_linear(600);  // 10^(-600/200) = 10^-3 = 0.001
        let expected_600 = 0.001;
        assert!((result_600 - expected_600).abs() < 0.000001,
            "600 centibels: expected {}, got {}", expected_600, result_600);
        
        // Test that positive centibels reduce amplitude
        assert!(centibels_to_linear(100) < 1.0, "Positive centibels should reduce amplitude");
        assert!(centibels_to_linear(400) < centibels_to_linear(200), "Higher centibels should reduce amplitude more");
        
        // Test that negative centibels increase amplitude
        assert!(centibels_to_linear(-100) > 1.0, "Negative centibels should increase amplitude");
        assert!(centibels_to_linear(-400) > centibels_to_linear(-200), "More negative centibels should increase amplitude more");
    }

    #[test]
    fn test_parameter_conversion_edge_cases() {
        // Test edge cases and boundary conditions for parameter conversions
        
        // Timecents edge cases
        let zero_timecents = timecents_to_seconds(0);
        assert_eq!(zero_timecents, 1.0, "Zero timecents should equal 1.0 second");
        
        let very_negative = timecents_to_seconds(-20000);
        assert!(very_negative > 0.0, "Very negative timecents should still be positive");
        assert!(very_negative < 0.0001, "Very negative timecents should be very small");
        
        let very_positive = timecents_to_seconds(20000);
        assert!(very_positive > 100.0, "Very positive timecents should be very large");
        
        // Centibels edge cases
        let zero_centibels = centibels_to_linear(0);
        assert_eq!(zero_centibels, 1.0, "Zero centibels should equal 1.0 amplitude");
        
        let very_positive_cb = centibels_to_linear(2000);
        assert!(very_positive_cb > 0.0, "Very positive centibels should still be positive");
        assert!(very_positive_cb < 0.0001, "Very positive centibels should be very small");
        
        let very_negative_cb = centibels_to_linear(-2000);
        assert!(very_negative_cb > 10.0, "Very negative centibels should be very large");
    }

    #[test]
    fn test_parameter_conversion_precision() {
        // Test precision of parameter conversions for common musical values
        
        // Test musically relevant timecents values
        let one_ms = timecents_to_seconds(-7200);  // Approximately 1ms
        assert!((one_ms - 0.015625).abs() < 0.000001, "1ms timecents conversion precision");
        
        let ten_ms = timecents_to_seconds(-6000);  // Approximately 10ms  
        assert!((ten_ms - 0.03125).abs() < 0.000001, "10ms timecents conversion precision");
        
        let hundred_ms = timecents_to_seconds(-4800);  // Approximately 100ms
        assert!((hundred_ms - 0.0625).abs() < 0.000001, "100ms timecents conversion precision");
        
        // Test musically relevant centibels values
        let half_volume = centibels_to_linear(602);  // Approximately -6dB (half volume)
        let expected_half = 10.0_f32.powf(-602.0 / 200.0);
        assert!((half_volume - expected_half).abs() < 0.000001, "Half volume centibels precision");
        
        let quarter_volume = centibels_to_linear(1204);  // Approximately -12dB (quarter volume)
        let expected_quarter = 10.0_f32.powf(-1204.0 / 200.0);
        assert!((quarter_volume - expected_quarter).abs() < 0.000001, "Quarter volume centibels precision");
    }

    #[test]
    fn test_parameter_conversion_monotonicity() {
        // Test that parameter conversions are monotonic (preserve ordering)
        
        // Timecents should be monotonically increasing
        let times = vec![-10000, -8000, -6000, -4000, -2000, 0, 2000, 4000];
        let converted_times: Vec<f32> = times.iter().map(|&t| timecents_to_seconds(t)).collect();
        
        for i in 1..converted_times.len() {
            assert!(converted_times[i] > converted_times[i-1],
                "Timecents conversion should be monotonically increasing: {} > {}",
                converted_times[i], converted_times[i-1]);
        }
        
        // Centibels should be monotonically decreasing (more centibels = less amplitude)
        let centibels = vec![-1000, -500, -200, 0, 200, 500, 1000, 1500];
        let converted_amplitudes: Vec<f32> = centibels.iter().map(|&cb| centibels_to_linear(cb)).collect();
        
        for i in 1..converted_amplitudes.len() {
            assert!(converted_amplitudes[i] < converted_amplitudes[i-1],
                "Centibels conversion should be monotonically decreasing: {} < {}",
                converted_amplitudes[i], converted_amplitudes[i-1]);
        }
    }

    #[test]
    fn test_parameter_conversion_soundfont_compatibility() {
        // Test parameter conversions match SoundFont 2.0 specification exactly
        
        // Test specific SoundFont 2.0 examples from specification
        // Default values from SoundFont 2.0 spec
        let default_attack = timecents_to_seconds(-12000);  // Default attack time
        assert!(default_attack > 0.0 && default_attack < 1.0, "Default attack time should be reasonable");
        
        let default_release = timecents_to_seconds(-12000);  // Default release time
        assert!(default_release > 0.0 && default_release < 1.0, "Default release time should be reasonable");
        
        let default_sustain = centibels_to_linear(0);  // Default sustain level (full)
        assert_eq!(default_sustain, 1.0, "Default sustain should be full level");
        
        // Test that converted values are suitable for EMU8000 hardware
        let emu_fast_attack = timecents_to_seconds(-8000);
        assert!(emu_fast_attack < 0.1, "Fast attack should be under 100ms");
        
        let emu_slow_attack = timecents_to_seconds(-2000);
        assert!(emu_slow_attack > 0.1, "Slow attack should be over 100ms");
        
        let emu_quiet_sustain = centibels_to_linear(960);  // -48dB approximately
        assert!(emu_quiet_sustain < 0.01, "Quiet sustain should be very low amplitude");
    }
}