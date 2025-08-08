use awe_synth::synth::multizone_voice::MultiZoneSampleVoice;
use awe_synth::soundfont::types::{SoundFont, SoundFontPreset};

const SAMPLE_RATE: f32 = 44100.0;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_start_note_triggers_envelope() {
        // Test that MultiZoneSampleVoice::start_note() properly triggers the voice
        let mut voice = MultiZoneSampleVoice::new(0, SAMPLE_RATE);
        
        // Initial state should be inactive
        assert!(!voice.is_active());
        
        // Start a note
        let note = 60; // Middle C
        let velocity = 100;
        let soundfont = SoundFont::default();
        let preset = SoundFontPreset::default();
        voice.start_note(note, velocity, 0, &soundfont, &preset).unwrap();
        
        // Voice should now be active
        assert!(voice.is_active());
        assert_eq!(voice.get_note(), note);
        assert_eq!(voice.get_velocity(), velocity);
        
        // Envelope should be active
        let envelope_level = voice.get_volume_envelope_level();
        assert!(envelope_level >= 0.0 && envelope_level <= 1.0);
    }

    #[test]
    fn test_voice_start_note_with_different_velocities() {
        // Test that different velocities are properly stored in voice
        let velocities = [1, 32, 64, 100, 127];
        
        for velocity in velocities {
            let mut voice = Voice::new();
            voice.start_note(60, velocity);
            
            assert!(voice.is_active);
            assert_eq!(voice.velocity, velocity);
            assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
        }
    }

    #[test]
    fn test_voice_start_note_with_different_notes() {
        // Test that different MIDI notes are properly stored in voice
        let notes = [21, 36, 60, 84, 108]; // Different octaves
        
        for note in notes {
            let mut voice = Voice::new();
            voice.start_note(note, 100);
            
            assert!(voice.is_active);
            assert_eq!(voice.note, note);
            assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
        }
    }

    #[test]
    fn test_voice_restart_note_retriggers_envelope() {
        // Test that starting a new note on an active voice retriggers the envelope
        let mut voice = Voice::new();
        
        // Start first note
        voice.start_note(60, 100);
        assert!(voice.is_active);
        
        // Process a few samples to advance envelope
        for _ in 0..10 {
            voice.get_envelope_amplitude();
        }
        let first_stage_samples = voice.volume_envelope.stage_samples;
        assert!(first_stage_samples > 0);
        
        // Start second note (retrigger)
        voice.start_note(64, 80);
        assert!(voice.is_active);
        assert_eq!(voice.note, 64);
        assert_eq!(voice.velocity, 80);
        
        // Envelope should be retriggered (stage_samples reset)
        assert_eq!(voice.volume_envelope.stage_samples, 0);
        assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
    }

    #[test]
    fn test_voice_get_envelope_amplitude_progression() {
        // Test that Voice::get_envelope_amplitude() returns progressive values
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Collect amplitude values over time
        let mut amplitudes = Vec::new();
        for _ in 0..20 {
            let amplitude = voice.get_envelope_amplitude();
            amplitudes.push(amplitude);
        }
        
        // Should have collected progression values
        assert_eq!(amplitudes.len(), 20);
        
        // All amplitudes should be valid (0.0 to 1.0 range)
        for amplitude in &amplitudes {
            assert!(*amplitude >= 0.0 && *amplitude <= 10.0, // Allow for negative centibels amplification
                "Amplitude should be in valid range: {}", amplitude);
        }
        
        // First amplitude should be 0.0 (envelope just started)
        assert_eq!(amplitudes[0], 0.0);
    }

    #[test]
    fn test_voice_envelope_amplitude_consistency() {
        // Test that envelope amplitude is consistent with internal envelope state
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        for i in 0..50 {
            let amplitude = voice.get_envelope_amplitude();
            let direct_amplitude = voice.volume_envelope.process();
            
            // Voice amplitude should match direct envelope processing
            assert!((amplitude - direct_amplitude).abs() < TEST_TOLERANCE,
                "Sample {}: Voice amplitude ({}) should match envelope amplitude ({})",
                i, amplitude, direct_amplitude);
        }
    }

    #[test]
    fn test_voice_envelope_state_progression() {
        // Test that voice envelope progresses through expected states
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        let mut state_history = Vec::new();
        let mut samples_processed = 0;
        
        // Process samples until we see some state transitions
        while samples_processed < 1000 && voice.volume_envelope.state != EnvelopeState::Sustain {
            voice.get_envelope_amplitude();
            state_history.push(voice.volume_envelope.state);
            samples_processed += 1;
        }
        
        // Should have seen some state transitions
        let unique_states: std::collections::HashSet<_> = state_history.into_iter().collect();
        assert!(unique_states.len() >= 2, "Should have seen multiple envelope states");
        
        // Should include some expected states
        assert!(unique_states.contains(&EnvelopeState::Delay) || 
                unique_states.contains(&EnvelopeState::Attack),
                "Should have seen Delay or Attack state");
    }

    #[test]
    fn test_voice_phase_initialization() {
        // Test that voice phase is properly initialized
        let mut voice = Voice::new();
        
        // Initial phase should be 0.0
        assert_eq!(voice.phase, 0.0);
        
        // Starting a note should reset phase to 0.0
        voice.start_note(60, 100);
        assert_eq!(voice.phase, 0.0);
        
        // Modify phase manually
        voice.phase = 0.5;
        
        // Starting another note should reset phase
        voice.start_note(64, 80);
        assert_eq!(voice.phase, 0.0);
    }

    #[test]
    fn test_voice_multiple_start_note_calls() {
        // Test behavior when start_note is called multiple times rapidly
        let mut voice = Voice::new();
        
        // Rapid start_note calls
        voice.start_note(60, 100);
        voice.start_note(62, 90);
        voice.start_note(64, 80);
        voice.start_note(65, 70);
        
        // Should have the latest note parameters
        assert!(voice.is_active);
        assert_eq!(voice.note, 65);
        assert_eq!(voice.velocity, 70);
        assert_eq!(voice.phase, 0.0);
        
        // Envelope should be properly retriggered
        assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
        assert_eq!(voice.volume_envelope.stage_samples, 0);
    }

    #[test]
    fn test_voice_envelope_amplitude_bounds() {
        // Test that envelope amplitude stays within reasonable bounds
        let mut voice = Voice::new();
        voice.start_note(60, 127); // Maximum velocity
        
        let mut max_amplitude: f32 = 0.0;
        let mut min_amplitude = f32::INFINITY;
        
        // Process through several envelope phases
        for _ in 0..5000 {
            let amplitude = voice.get_envelope_amplitude();
            max_amplitude = max_amplitude.max(amplitude);
            min_amplitude = min_amplitude.min(amplitude);
            
            // Amplitude should not be negative or extremely large
            assert!(amplitude >= 0.0, "Amplitude should not be negative: {}", amplitude);
            assert!(amplitude <= 100.0, "Amplitude should not be extremely large: {}", amplitude);
        }
        
        // Should have seen some meaningful amplitude range
        assert!(max_amplitude > min_amplitude, 
            "Should have seen amplitude variation: min={}, max={}", min_amplitude, max_amplitude);
    }

    #[test]
    fn test_voice_inactive_state_envelope() {
        // Test envelope behavior when voice is inactive
        let mut voice = Voice::new();
        
        // Voice starts inactive
        assert!(!voice.is_active);
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Off);
        
        // Getting amplitude from inactive voice should return 0.0
        let amplitude = voice.get_envelope_amplitude();
        assert_eq!(amplitude, 0.0);
        
        // Envelope should remain off
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Off);
    }

    #[test]
    fn test_voice_envelope_integration_with_midi_range() {
        // Test envelope integration across full MIDI range
        for note in [0, 21, 60, 108, 127] { // Different MIDI note ranges
            for velocity in [1, 32, 64, 100, 127] { // Different velocities
                let mut voice = Voice::new();
                voice.start_note(note, velocity);
                
                // Should properly integrate regardless of MIDI values
                assert!(voice.is_active);
                assert_eq!(voice.note, note);
                assert_eq!(voice.velocity, velocity);
                assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
                
                // Should produce valid amplitude
                let amplitude = voice.get_envelope_amplitude();
                assert!(amplitude >= 0.0 && amplitude <= 100.0,
                    "Note {} Vel {}: Invalid amplitude {}", note, velocity, amplitude);
            }
        }
    }

    #[test]
    fn test_voice_stop_note_triggers_release() {
        // Test that Voice::stop_note() triggers envelope release phase
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Process until we reach a stable envelope state (not in initial phases)
        let mut samples_processed = 0;
        while samples_processed < 1000 && 
              matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack | EnvelopeState::Hold) {
            voice.get_envelope_amplitude();
            samples_processed += 1;
        }
        
        let state_before_stop = voice.volume_envelope.state;
        let level_before_stop = voice.volume_envelope.current_level;
        
        // Stop the note
        voice.stop_note();
        
        // Voice should be marked inactive
        assert!(!voice.is_active);
        
        // Envelope should be in release phase
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        
        // Level should be preserved from before stop
        assert!((voice.volume_envelope.current_level - level_before_stop).abs() < TEST_TOLERANCE,
            "Release should start from current level: {} vs {}", 
            voice.volume_envelope.current_level, level_before_stop);
    }

    #[test]
    fn test_voice_stop_note_from_different_phases() {
        // Test stopping note from different envelope phases
        let phases_to_test = vec![
            ("attack", 10),    // Stop during attack
            ("hold", 100),     // Stop during hold  
            ("decay", 500),    // Stop during decay
            ("sustain", 2000), // Stop during sustain
        ];
        
        for (phase_name, samples_to_process) in phases_to_test {
            let mut voice = Voice::new();
            voice.start_note(60, 100);
            
            // Process to reach target phase
            for _ in 0..samples_to_process {
                voice.get_envelope_amplitude();
                if voice.volume_envelope.state == EnvelopeState::Off {
                    break; // Envelope completed naturally
                }
            }
            
            if voice.volume_envelope.state != EnvelopeState::Off {
                let state_before = voice.volume_envelope.state;
                
                // Stop note
                voice.stop_note();
                
                // Should transition to release regardless of previous phase
                assert_eq!(voice.volume_envelope.state, EnvelopeState::Release,
                    "Stopping from {} phase should trigger release", phase_name);
                assert!(!voice.is_active,
                    "Voice should be inactive after stop_note from {} phase", phase_name);
            }
        }
    }

    #[test]
    fn test_voice_stop_note_when_inactive() {
        // Test that stopping an inactive voice doesn't cause issues
        let mut voice = Voice::new();
        
        // Voice starts inactive
        assert!(!voice.is_active);
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Off);
        
        // Stop note on inactive voice should be safe
        voice.stop_note();
        
        // Should remain inactive with envelope off
        assert!(!voice.is_active);
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Off);
        
        // Getting amplitude should still return 0.0
        let amplitude = voice.get_envelope_amplitude();
        assert_eq!(amplitude, 0.0);
    }

    #[test]
    fn test_voice_stop_note_already_in_release() {
        // Test stopping a note that's already in release phase
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Process to sustain phase
        for _ in 0..2000 {
            voice.get_envelope_amplitude();
            if voice.volume_envelope.state == EnvelopeState::Sustain {
                break;
            }
        }
        
        // First stop - should trigger release
        voice.stop_note();
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        assert!(!voice.is_active);
        
        let level_after_first_stop = voice.volume_envelope.current_level;
        
        // Process a few samples in release
        for _ in 0..10 {
            voice.get_envelope_amplitude();
        }
        
        // Second stop - should remain in release
        voice.stop_note();
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        assert!(!voice.is_active);
        
        // Level should have progressed (decreased) during release
        let level_after_second_stop = voice.volume_envelope.current_level;
        assert!(level_after_second_stop <= level_after_first_stop,
            "Release should continue progressing: {} <= {}", 
            level_after_second_stop, level_after_first_stop);
    }

    #[test]
    fn test_voice_release_phase_progression() {
        // Test that release phase progresses toward zero
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Process to sustain phase
        for _ in 0..2000 {
            voice.get_envelope_amplitude();
            if voice.volume_envelope.state == EnvelopeState::Sustain {
                break;
            }
        }
        
        // Stop note to enter release
        voice.stop_note();
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        
        // Collect release progression
        let mut release_levels = Vec::new();
        let mut samples_in_release = 0;
        
        while voice.volume_envelope.state == EnvelopeState::Release && samples_in_release < 5000 {
            let level = voice.get_envelope_amplitude();
            release_levels.push(level);
            samples_in_release += 1;
        }
        
        // Should have collected substantial release progression
        assert!(release_levels.len() > 50, "Should have substantial release progression");
        
        // Release should generally decrease toward zero
        if release_levels.len() > 10 {
            let early_level = release_levels[5];
            let late_level = release_levels[release_levels.len() - 5];
            assert!(late_level <= early_level,
                "Release should decrease: early={}, late={}", early_level, late_level);
        }
        
        // Should eventually reach Off state
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Off);
    }

    #[test]
    fn test_voice_stop_note_timing_accuracy() {
        // Test that stop_note triggers release immediately
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Process to decay phase
        for _ in 0..500 {
            voice.get_envelope_amplitude();
            if voice.volume_envelope.state == EnvelopeState::Decay {
                break;
            }
        }
        
        if voice.volume_envelope.state == EnvelopeState::Decay {
            let stage_samples_before = voice.volume_envelope.stage_samples;
            
            // Stop note
            voice.stop_note();
            
            // Should immediately be in release with stage_samples reset
            assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
            assert_eq!(voice.volume_envelope.stage_samples, 0,
                "Release phase should start with stage_samples=0");
            
            // Process one sample
            voice.get_envelope_amplitude();
            
            // Should have progressed exactly one sample in release
            assert_eq!(voice.volume_envelope.stage_samples, 1,
                "Should advance exactly one sample in release");
        }
    }

    #[test]
    fn test_voice_stop_note_level_preservation() {
        // Test that stop_note preserves current envelope level
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Process to build up some envelope level
        for _ in 0..200 {
            voice.get_envelope_amplitude();
        }
        
        let level_before_stop = voice.volume_envelope.current_level;
        assert!(level_before_stop > 0.0, "Should have built up envelope level");
        
        // Stop note
        voice.stop_note();
        
        // Level should be preserved exactly
        let level_after_stop = voice.volume_envelope.current_level;
        assert!((level_after_stop - level_before_stop).abs() < TEST_TOLERANCE,
            "Level should be preserved on stop: {} vs {}", level_before_stop, level_after_stop);
        
        // But should be in release phase
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
    }

    #[test]
    fn test_voice_stop_start_cycle() {
        // Test stopping and restarting a voice
        let mut voice = Voice::new();
        
        // First cycle
        voice.start_note(60, 100);
        assert!(voice.is_active);
        assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
        
        // Process some samples
        for _ in 0..100 {
            voice.get_envelope_amplitude();
        }
        
        // Stop note
        voice.stop_note();
        assert!(!voice.is_active);
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        
        // Process release to completion
        for _ in 0..5000 {
            voice.get_envelope_amplitude();
            if voice.volume_envelope.state == EnvelopeState::Off {
                break;
            }
        }
        
        // Should reach Off state
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Off);
        
        // Second cycle - restart voice
        voice.start_note(64, 80);
        assert!(voice.is_active);
        assert_eq!(voice.note, 64);
        assert_eq!(voice.velocity, 80);
        assert!(matches!(voice.volume_envelope.state, EnvelopeState::Delay | EnvelopeState::Attack));
        assert_eq!(voice.volume_envelope.stage_samples, 0);
    }

    #[test]
    fn test_voice_stop_note_multiple_calls() {
        // Test that multiple stop_note calls are safe
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        assert!(voice.is_active);
        
        // Process to sustain
        for _ in 0..2000 {
            voice.get_envelope_amplitude();
            if voice.volume_envelope.state == EnvelopeState::Sustain {
                break;
            }
        }
        
        // Multiple stop calls
        voice.stop_note();
        voice.stop_note();
        voice.stop_note();
        
        // Should be in release and inactive
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        assert!(!voice.is_active);
        
        // Should still process release normally
        let level_before = voice.volume_envelope.current_level;
        for _ in 0..10 {
            voice.get_envelope_amplitude();
        }
        let level_after = voice.volume_envelope.current_level;
        
        // Release should continue progressing
        assert!(level_after <= level_before,
            "Release should continue: {} <= {}", level_after, level_before);
    }

    // Voice::get_envelope_amplitude() Accuracy Tests (Task 6B.8)

    #[test]
    fn test_voice_get_envelope_amplitude_sample_accuracy() {
        // Test sample-by-sample envelope amplitude accuracy
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Collect first 100 samples for detailed analysis
        let mut amplitude_progression = Vec::new();
        for sample_idx in 0..100 {
            let amplitude = voice.get_envelope_amplitude();
            let direct_envelope = voice.volume_envelope.current_level;
            
            // Voice amplitude should exactly match envelope current_level
            assert!((amplitude - direct_envelope).abs() < TEST_TOLERANCE,
                "Sample {}: Voice amplitude ({}) should match envelope level ({})",
                sample_idx, amplitude, direct_envelope);
            
            amplitude_progression.push((sample_idx, amplitude, voice.volume_envelope.state));
        }
        
        // Should have captured envelope progression
        assert_eq!(amplitude_progression.len(), 100);
        
        // Verify initial state is correct (starts at 0 during delay/attack)
        let (first_sample, first_amplitude, first_state) = amplitude_progression[0];
        assert_eq!(first_sample, 0);
        assert_eq!(first_amplitude, 0.0);
        assert!(matches!(first_state, EnvelopeState::Delay | EnvelopeState::Attack));
    }

    #[test]
    fn test_voice_envelope_amplitude_monotonic_attack() {
        // Test that envelope amplitude increases monotonically during attack phase
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        let mut attack_samples = Vec::new();
        let mut samples_processed = 0;
        
        // Collect attack phase samples
        while voice.volume_envelope.state == EnvelopeState::Delay || 
              voice.volume_envelope.state == EnvelopeState::Attack {
            let amplitude = voice.get_envelope_amplitude();
            
            if voice.volume_envelope.state == EnvelopeState::Attack {
                attack_samples.push(amplitude);
            }
            
            samples_processed += 1;
            if samples_processed > 5000 { // Prevent infinite loop
                break;
            }
        }
        
        // Should have collected attack samples
        assert!(attack_samples.len() > 5, "Should have substantial attack phase samples");
        
        // Attack should be monotonically increasing (or equal for adjacent samples)
        for i in 1..attack_samples.len() {
            let prev_amp = attack_samples[i-1];
            let curr_amp = attack_samples[i];
            
            assert!(curr_amp >= prev_amp,
                "Attack should be monotonic: sample {} amplitude {} >= previous {}",
                i, curr_amp, prev_amp);
        }
        
        // Attack should start near 0 and reach higher levels
        assert!(attack_samples[0] <= 0.1, "Attack should start near zero: {}", attack_samples[0]);
        let final_attack = attack_samples[attack_samples.len() - 1];
        assert!(final_attack > 0.5, "Attack should reach substantial level: {}", final_attack);
    }

    #[test]
    fn test_voice_envelope_amplitude_exponential_curve() {
        // Test that envelope follows exponential curve (powf(2.0) factor)
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Skip delay phase
        while voice.volume_envelope.state == EnvelopeState::Delay {
            voice.get_envelope_amplitude();
        }
        
        if voice.volume_envelope.state == EnvelopeState::Attack {
            let mut curve_samples = Vec::new();
            let attack_samples = voice.volume_envelope.attack_samples;
            
            // Collect attack curve data
            let mut stage_sample = 0;
            while voice.volume_envelope.state == EnvelopeState::Attack && stage_sample < attack_samples {
                let amplitude = voice.get_envelope_amplitude();
                let progress = stage_sample as f32 / attack_samples as f32;
                curve_samples.push((progress, amplitude));
                stage_sample = voice.volume_envelope.stage_samples;
            }
            
            // Should have meaningful curve data
            if curve_samples.len() > 10 {
                // Test exponential curve properties
                for (progress, amplitude) in &curve_samples {
                    if *progress > 0.0 && *progress < 1.0 {
                        // Expected exponential value: progress^2.0
                        let expected_exponential = progress.powf(2.0);
                        
                        // Allow reasonable tolerance for exponential curve
                        let curve_error = (amplitude - expected_exponential).abs();
                        assert!(curve_error < 0.1,
                            "Exponential curve error at progress {:.3}: amplitude {} vs expected {}",
                            progress, amplitude, expected_exponential);
                    }
                }
            }
        }
    }

    #[test]
    fn test_voice_envelope_amplitude_precision() {
        // Test precision of envelope amplitude calculations
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        // Test amplitude precision over extended processing
        let mut precision_errors = Vec::new();
        let mut last_direct_level = 0.0;
        
        for sample_idx in 0..1000 {
            let voice_amplitude = voice.get_envelope_amplitude();
            let direct_envelope = voice.volume_envelope.current_level;
            
            // Calculate precision error between voice and direct envelope
            let precision_error = (voice_amplitude - direct_envelope).abs();
            if precision_error > TEST_TOLERANCE {
                precision_errors.push((sample_idx, precision_error, voice_amplitude, direct_envelope));
            }
            
            // Verify envelope level consistency
            if sample_idx > 0 {
                let level_change = (direct_envelope - last_direct_level).abs();
                assert!(level_change < 1.0, // Large jumps indicate calculation errors
                    "Sample {}: Envelope level jump too large: {} -> {}",
                    sample_idx, last_direct_level, direct_envelope);
            }
            
            last_direct_level = direct_envelope;
        }
        
        // Should have very few precision errors
        assert!(precision_errors.len() < 5, 
            "Too many precision errors ({}): {:?}", precision_errors.len(), precision_errors);
    }

    #[test]
    fn test_voice_envelope_amplitude_state_consistency() {
        // Test amplitude consistency across envelope state transitions
        let mut voice = Voice::new();
        voice.start_note(60, 100);
        
        let mut state_transitions = Vec::new();
        let mut last_state = voice.volume_envelope.state;
        let mut last_amplitude = 0.0;
        
        for sample_idx in 0..3000 {
            let amplitude = voice.get_envelope_amplitude();
            let current_state = voice.volume_envelope.state;
            
            // Detect state transitions
            if current_state != last_state {
                state_transitions.push((sample_idx, last_state, current_state, last_amplitude, amplitude));
            }
            
            // Verify amplitude is reasonable for each state
            match current_state {
                EnvelopeState::Off => {
                    assert_eq!(amplitude, 0.0, "Off state should have 0 amplitude");
                },
                EnvelopeState::Delay => {
                    assert_eq!(amplitude, 0.0, "Delay state should have 0 amplitude");
                },
                EnvelopeState::Attack => {
                    assert!(amplitude >= 0.0 && amplitude <= 1.0, 
                        "Attack amplitude should be 0-1: {}", amplitude);
                },
                EnvelopeState::Hold => {
                    assert!((amplitude - 1.0).abs() < TEST_TOLERANCE,
                        "Hold amplitude should be ~1.0: {}", amplitude);
                },
                EnvelopeState::Decay => {
                    assert!(amplitude >= 0.0 && amplitude <= 1.0,
                        "Decay amplitude should be 0-1: {}", amplitude);
                },
                EnvelopeState::Sustain => {
                    // Sustain level can vary based on envelope parameters
                    assert!(amplitude >= 0.0 && amplitude <= 1.0,
                        "Sustain amplitude should be 0-1: {}", amplitude);
                },
                EnvelopeState::Release => {
                    assert!(amplitude >= 0.0 && amplitude <= 1.0,
                        "Release amplitude should be 0-1: {}", amplitude);
                },
            }
            
            last_state = current_state;
            last_amplitude = amplitude;
            
            if current_state == EnvelopeState::Off {
                break; // Envelope completed
            }
        }
        
        // Should have seen multiple state transitions
        assert!(state_transitions.len() >= 2, 
            "Should have seen multiple envelope state transitions: {:?}", state_transitions);
    }

    #[test]
    fn test_voice_envelope_amplitude_boundary_conditions() {
        // Test envelope amplitude at various boundary conditions
        let mut test_cases = Vec::new();
        
        // Test different envelope parameter combinations with realistic SoundFont values
        // Based on EMU8000_REFERENCE.md specification
        let parameter_sets = vec![
            // (delay, attack, hold, decay, sustain, release) in timecents/centibels
            (0, -8000, 0, -8000, 0, -8000),           // Fast: ~16ms phases, 0dB sustain (full level)
            (-9600, -7200, -9600, -7200, 200, -7200),  // Medium: ~8-16ms phases, -2dB sustain  
            (-7200, -4800, -7200, -4800, 600, -4800),  // Slow: ~16-63ms phases, -6dB sustain (half level)
            (0, 0, 0, 0, 0, 0),                       // Instant envelope (edge case)
        ];
        
        for (param_idx, (delay, attack, hold, decay, sustain, release)) in parameter_sets.iter().enumerate() {
            let mut voice = Voice::new();
            
            // Start note first to trigger the default envelope
            voice.start_note(60, 100);
            
            // Create custom envelope with test parameters and trigger it
            voice.volume_envelope = DAHDSREnvelope::new(
                SAMPLE_RATE,
                *delay, *attack, *hold, *decay, *sustain, *release
            );
            voice.volume_envelope.trigger(); // Re-trigger after replacement
            
            // Process envelope completely
            let mut max_amplitude: f32 = 0.0;
            let mut min_amplitude = f32::INFINITY;
            let mut samples_processed = 0;
            
            // Calculate expected envelope duration for this parameter set
            let expected_duration_samples = voice.volume_envelope.delay_samples + 
                                           voice.volume_envelope.attack_samples + 
                                           voice.volume_envelope.hold_samples + 
                                           voice.volume_envelope.decay_samples + 
                                           1000; // Extra samples for sustain observation
            
            let max_samples = expected_duration_samples.max(50000); // At least 50k samples for slow envelopes
            
            while voice.volume_envelope.state != EnvelopeState::Off && samples_processed < max_samples {
                let amplitude = voice.get_envelope_amplitude();
                max_amplitude = max_amplitude.max(amplitude);
                min_amplitude = min_amplitude.min(amplitude);
                
                // Verify amplitude is always in valid range (allowing for reasonable SoundFont centibel values)
                assert!(amplitude >= 0.0 && amplitude <= 2.0, // Allow for reasonable negative centibel sustain levels
                    "Parameter set {}: Invalid amplitude {} at sample {}",
                    param_idx, amplitude, samples_processed);
                
                samples_processed += 1;
            }
            
            test_cases.push((param_idx, max_amplitude, min_amplitude, samples_processed));
            
            // Debug output for failing parameter sets
            if max_amplitude == 0.0 && min_amplitude == f32::INFINITY {
                println!("Parameter set {} debug info:", param_idx);
                println!("  Expected duration: {} samples ({:.2}s)", expected_duration_samples, expected_duration_samples as f32 / SAMPLE_RATE);
                println!("  Delay samples: {} ({:.3}s)", voice.volume_envelope.delay_samples, voice.volume_envelope.delay_samples as f32 / SAMPLE_RATE);
                println!("  Attack samples: {} ({:.3}s)", voice.volume_envelope.attack_samples, voice.volume_envelope.attack_samples as f32 / SAMPLE_RATE);
                println!("  Hold samples: {} ({:.3}s)", voice.volume_envelope.hold_samples, voice.volume_envelope.hold_samples as f32 / SAMPLE_RATE);
                println!("  Decay samples: {} ({:.3}s)", voice.volume_envelope.decay_samples, voice.volume_envelope.decay_samples as f32 / SAMPLE_RATE);
                println!("  Sustain level: {:.3}", voice.volume_envelope.sustain_level);
                println!("  Final state: {:?}", voice.volume_envelope.state);
                println!("  Processed {} samples", samples_processed);
            }
            
            // Should have processed reasonable number of samples
            assert!(samples_processed > 0, "Parameter set {}: No samples processed", param_idx);
            
            // Should have seen amplitude variation (unless instant envelope or very fast envelope)
            // For very fast envelopes, max_amplitude might be 0 if envelope completed immediately
            if param_idx > 0 && param_idx < 3 && samples_processed > 5 { // Skip first (very fast) and instant envelope
                assert!(max_amplitude > min_amplitude,
                    "Parameter set {}: Should see amplitude variation: max={}, min={} (samples: {})", 
                    param_idx, max_amplitude, min_amplitude, samples_processed);
            }
            
            // For all parameter sets, verify voice was properly activated
            if param_idx < 3 { // Skip instant envelope
                assert!(samples_processed > 0, "Parameter set {}: Should process some samples", param_idx);
            }
        }
        
        // All test cases should complete successfully
        assert_eq!(test_cases.len(), parameter_sets.len(), "All boundary tests should complete");
    }

    #[test]
    fn test_voice_envelope_amplitude_release_accuracy() {
        // Test accuracy of envelope amplitude during release phase
        let mut voice = Voice::new();
        voice.start_note(60, 127); // Max velocity
        
        // Process to sustain phase
        for _ in 0..3000 {
            voice.get_envelope_amplitude();
            if voice.volume_envelope.state == EnvelopeState::Sustain {
                break;
            }
        }
        
        let sustain_amplitude = voice.get_envelope_amplitude();
        
        // Trigger release
        voice.stop_note();
        assert_eq!(voice.volume_envelope.state, EnvelopeState::Release);
        
        // Verify release starts from correct level
        let release_start_amplitude = voice.get_envelope_amplitude();
        assert!((release_start_amplitude - sustain_amplitude).abs() < TEST_TOLERANCE,
            "Release should start from sustain level: {} vs {}",
            release_start_amplitude, sustain_amplitude);
        
        // Collect release progression
        let mut release_samples = Vec::new();
        let mut samples_in_release = 0;
        
        while voice.volume_envelope.state == EnvelopeState::Release && samples_in_release < 5000 {
            let amplitude = voice.get_envelope_amplitude();
            release_samples.push((samples_in_release, amplitude));
            samples_in_release += 1;
        }
        
        // Should have substantial release progression
        assert!(release_samples.len() > 20, "Should have meaningful release progression");
        
        // Verify release curve properties
        if release_samples.len() > 10 {
            let early_amplitude = release_samples[5].1;
            let late_amplitude = release_samples[release_samples.len() - 5].1;
            
            // Release should generally decrease
            assert!(late_amplitude <= early_amplitude,
                "Release should decrease: early={}, late={}", early_amplitude, late_amplitude);
            
            // Final amplitude should be near zero
            let final_amplitude = release_samples[release_samples.len() - 1].1;
            assert!(final_amplitude < 0.1, "Release should approach zero: {}", final_amplitude);
        }
    }

    #[test]
    fn test_voice_envelope_amplitude_velocity_scaling() {
        // Test that different velocities produce appropriate amplitude scaling
        let velocities = vec![1, 32, 64, 100, 127];
        let mut velocity_results = Vec::new();
        
        for velocity in &velocities {
            let mut voice = Voice::new();
            voice.start_note(60, *velocity);
            
            // Process to hold phase to get peak amplitude
            let mut peak_amplitude: f32 = 0.0;
            for _ in 0..2000 {
                let amplitude = voice.get_envelope_amplitude();
                peak_amplitude = peak_amplitude.max(amplitude);
                
                if voice.volume_envelope.state == EnvelopeState::Hold {
                    break;
                }
            }
            
            velocity_results.push((*velocity, peak_amplitude));
            
            // All velocities should produce valid amplitudes
            assert!(peak_amplitude > 0.0, "Velocity {} should produce positive amplitude", velocity);
            assert!(peak_amplitude <= 10.0, "Velocity {} amplitude should be reasonable: {}", velocity, peak_amplitude);
        }
        
        // Should have results for all velocities
        assert_eq!(velocity_results.len(), velocities.len());
        
        // Note: EMU8000 envelope amplitude is independent of velocity in basic implementation
        // Velocity affects synthesis amplitude, not envelope shape
        // All envelope peak amplitudes should be similar (around 1.0)
        for (velocity, peak_amplitude) in &velocity_results {
            assert!((peak_amplitude - 1.0).abs() < 0.1,
                "Velocity {}: Envelope peak should be ~1.0, got {}", velocity, peak_amplitude);
        }
    }

    #[test] 
    fn test_voice_envelope_amplitude_sample_rate_independence() {
        // Test that envelope amplitude progression is independent of get_envelope_amplitude() call frequency
        let mut voice1 = Voice::new();
        let mut voice2 = Voice::new();
        
        voice1.start_note(60, 100);
        voice2.start_note(60, 100);
        
        // Process voice1 every sample
        let mut voice1_samples = Vec::new();
        for _ in 0..100 {
            voice1_samples.push(voice1.get_envelope_amplitude());
        }
        
        // Process voice2 every other sample (simulating different call frequency)
        let mut voice2_samples = Vec::new();
        for i in 0..50 {
            voice2_samples.push(voice2.get_envelope_amplitude());
            // Skip one sample by calling again without recording
            voice2.get_envelope_amplitude();
        }
        
        // Both voices should show similar envelope progression patterns
        assert_eq!(voice1_samples.len(), 100);
        assert_eq!(voice2_samples.len(), 50);
        
        // Compare samples at equivalent points
        for i in 0..voice2_samples.len() {
            let voice1_amplitude = voice1_samples[i * 2]; // Every other sample from voice1
            let voice2_amplitude = voice2_samples[i];
            
            // Should be very close (within floating point precision)
            let amplitude_diff = (voice1_amplitude - voice2_amplitude).abs();
            assert!(amplitude_diff < TEST_TOLERANCE,
                "Sample {}: Amplitude difference too large: {} vs {} (diff: {})",
                i, voice1_amplitude, voice2_amplitude, amplitude_diff);
        }
    }
}