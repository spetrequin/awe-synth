use awe_synth::synth::envelope::{DAHDSREnvelope, EnvelopeState};
use awe_synth::synth::voice_manager::VoiceManager;
use std::time::{Duration, Instant};

const SAMPLE_RATE: f32 = 44100.0;
const BUFFER_SIZE: usize = 1024; // Typical audio buffer size
const TEST_DURATION_SECONDS: f32 = 1.0; // 1 second of processing

/// Performance benchmark for single envelope processing
#[test]
fn benchmark_single_envelope_performance() {
    let mut envelope = DAHDSREnvelope::new(
        SAMPLE_RATE,
        -8000,  // 6ms delay
        -4800,  // 63ms attack
        -6000,  // 10ms hold
        -4800,  // 63ms decay
        300,    // -3dB sustain
        -4800,  // 63ms release
    );
    
    envelope.trigger();
    
    let samples_to_process = (TEST_DURATION_SECONDS * SAMPLE_RATE) as usize;
    let start_time = Instant::now();
    
    // Process envelope for test duration
    for _ in 0..samples_to_process {
        envelope.process();
        
        // Trigger release halfway through for complete cycle testing
        if envelope.state == EnvelopeState::Sustain {
            envelope.release();
        }
    }
    
    let elapsed = start_time.elapsed();
    let samples_per_second = samples_to_process as f64 / elapsed.as_secs_f64();
    
    println!("Single Envelope Performance:");
    println!("  Processed {} samples in {:?}", samples_to_process, elapsed);
    println!("  Rate: {:.0} samples/second", samples_per_second);
    println!("  Per-sample time: {:.2}ns", elapsed.as_nanos() as f64 / samples_to_process as f64);
    
    // Performance requirements: Should handle at least real-time (44.1kHz)
    assert!(samples_per_second >= SAMPLE_RATE as f64, 
           "Single envelope should process at least real-time: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE);
    
    // Should be much faster than real-time for headroom
    assert!(samples_per_second >= SAMPLE_RATE as f64 * 10.0, 
           "Single envelope should have 10x real-time headroom: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE as f64 * 10.0);
}

/// Performance benchmark for 32-voice polyphony using VoiceManager
#[test]
fn benchmark_32_voice_polyphony_performance() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start all 32 voices
    for i in 0..32 {
        vm.note_on(60 + i, 100); // C4 to B6 range
    }
    
    let buffers_to_process = (TEST_DURATION_SECONDS * SAMPLE_RATE / BUFFER_SIZE as f32) as usize;
    let total_samples = buffers_to_process * BUFFER_SIZE;
    let start_time = Instant::now();
    
    // Process in typical audio buffer chunks
    for buffer in 0..buffers_to_process {
        for _ in 0..BUFFER_SIZE {
            vm.process_envelopes();
        }
        
        // Release some voices partway through to test mixed states
        if buffer == buffers_to_process / 2 {
            for i in 0..16 {
                vm.note_off(60 + i);
            }
        }
    }
    
    let elapsed = start_time.elapsed();
    let samples_per_second = total_samples as f64 / elapsed.as_secs_f64();
    let voices_samples_per_second = samples_per_second * 32.0; // Total voice processing
    
    println!("32-Voice Polyphony Performance:");
    println!("  Processed {} samples ({} buffers of {}) in {:?}", 
             total_samples, buffers_to_process, BUFFER_SIZE, elapsed);
    println!("  Manager rate: {:.0} samples/second", samples_per_second);
    println!("  Total voice processing: {:.0} voice-samples/second", voices_samples_per_second);
    println!("  Per-sample time: {:.2}ns", elapsed.as_nanos() as f64 / total_samples as f64);
    println!("  Per-voice-sample time: {:.2}ns", elapsed.as_nanos() as f64 / (total_samples * 32) as f64);
    
    // Performance requirements: 32-voice polyphony must handle real-time
    assert!(samples_per_second >= SAMPLE_RATE as f64, 
           "32-voice polyphony should handle real-time: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE);
    
    // Should have reasonable headroom for real-time audio
    assert!(samples_per_second >= SAMPLE_RATE as f64 * 2.0, 
           "32-voice polyphony should have 2x real-time headroom: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE as f64 * 2.0);
}

/// Performance benchmark for envelope phase transitions
#[test]
fn benchmark_envelope_phase_transitions() {
    let mut envelopes = Vec::new();
    
    // Create 32 envelopes with fast transitions for maximum phase changes
    for i in 0..32 {
        let envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -12000 + (i as i32 * 100), // Varying fast delays
            -8000 + (i as i32 * 50),   // Varying fast attacks
            -12000 + (i as i32 * 100), // Varying fast holds
            -8000 + (i as i32 * 50),   // Varying fast decays
            i as i32 * 20,             // Varying sustain levels
            -8000 + (i as i32 * 50),   // Varying fast releases
        );
        envelopes.push(envelope);
    }
    
    // Trigger all envelopes
    for envelope in envelopes.iter_mut() {
        envelope.trigger();
    }
    
    let samples_to_process = (TEST_DURATION_SECONDS * SAMPLE_RATE * 0.5) as usize; // Shorter test
    let start_time = Instant::now();
    let mut phase_transitions = 0;
    
    // Process with frequent state monitoring
    for _ in 0..samples_to_process {
        for envelope in envelopes.iter_mut() {
            let old_state = envelope.state;
            envelope.process();
            if envelope.state != old_state {
                phase_transitions += 1;
            }
            
            // Trigger release when reaching sustain
            if envelope.state == EnvelopeState::Sustain {
                envelope.release();
            }
        }
    }
    
    let elapsed = start_time.elapsed();
    let total_samples = samples_to_process * 32;
    let samples_per_second = total_samples as f64 / elapsed.as_secs_f64();
    
    println!("Envelope Phase Transitions Performance:");
    println!("  Processed {} samples across 32 envelopes in {:?}", total_samples, elapsed);
    println!("  Phase transitions detected: {}", phase_transitions);
    println!("  Rate: {:.0} samples/second", samples_per_second);
    println!("  Per-sample time: {:.2}ns", elapsed.as_nanos() as f64 / total_samples as f64);
    
    // Should handle rapid phase transitions efficiently
    assert!(samples_per_second >= SAMPLE_RATE as f64 * 16.0, // 16 voices worth of headroom
           "Phase transitions should be efficient: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE as f64 * 16.0);
    
    // Should have detected many phase transitions
    assert!(phase_transitions > 100, "Should have detected many phase transitions: {}", phase_transitions);
}

/// Performance benchmark for memory allocation and deallocation patterns
#[test]
fn benchmark_envelope_memory_performance() {
    let create_destroy_cycles = 1000;
    let envelopes_per_cycle = 32;
    
    let start_time = Instant::now();
    
    // Test rapid creation and destruction of envelope sets
    for _ in 0..create_destroy_cycles {
        let mut envelopes = Vec::with_capacity(envelopes_per_cycle);
        
        // Create 32 envelopes
        for i in 0..envelopes_per_cycle {
            let envelope = DAHDSREnvelope::new(
                SAMPLE_RATE,
                -8000 - (i as i32 * 100),
                -6000 - (i as i32 * 100),
                -8000 - (i as i32 * 100),
                -6000 - (i as i32 * 100),
                i as i32 * 30,
                -6000 - (i as i32 * 100),
            );
            envelopes.push(envelope);
        }
        
        // Process a few samples
        for envelope in envelopes.iter_mut() {
            envelope.trigger();
            for _ in 0..10 {
                envelope.process();
            }
        }
        
        // Envelopes are automatically dropped here
    }
    
    let elapsed = start_time.elapsed();
    let total_envelopes = create_destroy_cycles * envelopes_per_cycle;
    let envelopes_per_second = total_envelopes as f64 / elapsed.as_secs_f64();
    
    println!("Envelope Memory Performance:");
    println!("  Created/destroyed {} envelopes in {} cycles in {:?}", 
             total_envelopes, create_destroy_cycles, elapsed);
    println!("  Rate: {:.0} envelopes/second", envelopes_per_second);
    println!("  Per-envelope time: {:.2}μs", elapsed.as_micros() as f64 / total_envelopes as f64);
    
    // Memory operations should be fast enough for real-time use
    assert!(envelopes_per_second >= 10000.0, 
           "Envelope creation should be fast: {:.0} < 10000", envelopes_per_second);
    
    // Total time should be reasonable
    assert!(elapsed < Duration::from_millis(1000), 
           "Memory benchmark should complete within 1 second: {:?}", elapsed);
}

/// Performance benchmark for different envelope parameter combinations
#[test]
fn benchmark_envelope_parameter_variations() {
    // Test different parameter combinations that might affect performance
    let parameter_sets = vec![
        // Fast envelope (minimal processing)
        (-12000, -12000, -12000, -12000, 0, -12000),
        // Medium envelope (typical music)
        (-8000, -4800, -6000, -4800, 300, -4800),
        // Slow envelope (ambient/pad sounds)
        (-2400, -1200, -2400, -1200, 600, -1200),
        // Extreme envelope (stress test)
        (0, 0, 0, 0, 1000, 0),
    ];
    
    let samples_per_test = (SAMPLE_RATE * 0.2) as usize; // 200ms per test
    
    for (set_index, (delay, attack, hold, decay, sustain, release)) in parameter_sets.iter().enumerate() {
        let mut envelopes = Vec::new();
        
        // Create 32 envelopes with the same parameters
        for _ in 0..32 {
            let envelope = DAHDSREnvelope::new(
                SAMPLE_RATE,
                *delay, *attack, *hold, *decay, *sustain, *release
            );
            envelopes.push(envelope);
        }
        
        // Trigger all envelopes
        for envelope in envelopes.iter_mut() {
            envelope.trigger();
        }
        
        let start_time = Instant::now();
        
        // Process samples
        for _ in 0..samples_per_test {
            for envelope in envelopes.iter_mut() {
                envelope.process();
                
                if envelope.state == EnvelopeState::Sustain {
                    envelope.release();
                }
            }
        }
        
        let elapsed = start_time.elapsed();
        let total_samples = samples_per_test * 32;
        let samples_per_second = total_samples as f64 / elapsed.as_secs_f64();
        
        println!("Parameter Set {} Performance:", set_index + 1);
        println!("  Parameters: D{} A{} H{} D{} S{} R{}", delay, attack, hold, decay, sustain, release);
        println!("  Processed {} samples in {:?}", total_samples, elapsed);
        println!("  Rate: {:.0} samples/second", samples_per_second);
        println!("  Per-sample time: {:.2}ns", elapsed.as_nanos() as f64 / total_samples as f64);
        
        // All parameter combinations should maintain real-time performance
        assert!(samples_per_second >= SAMPLE_RATE as f64 * 16.0, 
               "Parameter set {} should maintain performance: {:.0} < {}", 
               set_index + 1, samples_per_second, SAMPLE_RATE as f64 * 16.0);
    }
}

/// Performance benchmark for sustained processing under load
#[test]
fn benchmark_sustained_load_performance() {
    let mut vm = VoiceManager::new(SAMPLE_RATE);
    
    // Start all 32 voices
    for i in 0..32 {
        vm.note_on(60 + (i % 12), 100 + (i % 28)); // Varying notes and velocities
    }
    
    let test_duration = Duration::from_secs(5); // 5-second sustained load test
    let buffer_size = 512; // Smaller buffer for more frequent processing
    let buffers_per_second = SAMPLE_RATE as usize / buffer_size;
    let total_buffers = (test_duration.as_secs() as usize) * buffers_per_second;
    
    println!("Starting sustained load test for {} seconds...", test_duration.as_secs());
    
    let start_time = Instant::now();
    let mut min_buffer_time = Duration::from_secs(1);
    let mut max_buffer_time = Duration::from_nanos(0);
    let mut buffer_times = Vec::new();
    
    for buffer_index in 0..total_buffers {
        let buffer_start = Instant::now();
        
        // Process one buffer
        for _ in 0..buffer_size {
            vm.process_envelopes();
        }
        
        let buffer_elapsed = buffer_start.elapsed();
        min_buffer_time = min_buffer_time.min(buffer_elapsed);
        max_buffer_time = max_buffer_time.max(buffer_elapsed);
        buffer_times.push(buffer_elapsed);
        
        // Periodically change voice states for dynamic load
        if buffer_index % (buffers_per_second * 2) == 0 { // Every 2 seconds
            // Release some voices
            for i in 0..8 {
                vm.note_off(60 + (i % 12));
            }
            // Start new voices
            for i in 0..8 {
                vm.note_on(72 + (i % 12), 80 + (i % 48));
            }
        }
    }
    
    let total_elapsed = start_time.elapsed();
    let total_samples = total_buffers * buffer_size;
    let samples_per_second = total_samples as f64 / total_elapsed.as_secs_f64();
    
    // Calculate statistics
    let mean_buffer_time = Duration::from_nanos(
        (buffer_times.iter().map(|d| d.as_nanos()).sum::<u128>() / buffer_times.len() as u128) as u64
    );
    
    buffer_times.sort();
    let p95_buffer_time = buffer_times[(buffer_times.len() * 95) / 100];
    let p99_buffer_time = buffer_times[(buffer_times.len() * 99) / 100];
    
    println!("Sustained Load Performance Results:");
    println!("  Test duration: {:?}", total_elapsed);
    println!("  Processed {} samples in {} buffers", total_samples, total_buffers);
    println!("  Overall rate: {:.0} samples/second", samples_per_second);
    println!("  Buffer processing times:");
    println!("    Min: {:?}", min_buffer_time);
    println!("    Mean: {:?}", mean_buffer_time);
    println!("    95th percentile: {:?}", p95_buffer_time);
    println!("    99th percentile: {:?}", p99_buffer_time);
    println!("    Max: {:?}", max_buffer_time);
    
    // Performance requirements for sustained load
    assert!(samples_per_second >= SAMPLE_RATE as f64, 
           "Sustained load must maintain real-time: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE);
    
    // Buffer processing should be consistently fast
    let max_acceptable_buffer_time = Duration::from_micros((1_000_000 * buffer_size as u64) / SAMPLE_RATE as u64);
    assert!(p99_buffer_time < max_acceptable_buffer_time, 
           "99th percentile buffer time should be acceptable: {:?} >= {:?}", 
           p99_buffer_time, max_acceptable_buffer_time);
    
    // Should have reasonable headroom
    assert!(samples_per_second >= SAMPLE_RATE as f64 * 1.5, 
           "Sustained load should have 1.5x headroom: {:.0} < {}", 
           samples_per_second, SAMPLE_RATE as f64 * 1.5);
}

/// Performance comparison between different envelope states
#[test]
fn benchmark_envelope_state_performance() {
    let samples_per_state_test = 10000;
    
    // Test each envelope state individually
    let states_to_test = vec![
        ("Off", EnvelopeState::Off),
        ("Delay", EnvelopeState::Delay),
        ("Attack", EnvelopeState::Attack),  
        ("Hold", EnvelopeState::Hold),
        ("Decay", EnvelopeState::Decay),
        ("Sustain", EnvelopeState::Sustain),
        ("Release", EnvelopeState::Release),
    ];
    
    for (state_name, target_state) in states_to_test {
        let mut envelope = DAHDSREnvelope::new(
            SAMPLE_RATE,
            -6000,  // 10ms delay
            -4800,  // 63ms attack
            -6000,  // 10ms hold
            -4800,  // 63ms decay
            300,    // -3dB sustain
            -4800,  // 63ms release
        );
        
        // Get envelope to target state
        envelope.trigger();
        match target_state {
            EnvelopeState::Off => { /* Already off */ },
            EnvelopeState::Delay => { /* Already in delay after trigger */ },
            EnvelopeState::Attack => {
                // Process through delay
                while envelope.state == EnvelopeState::Delay {
                    envelope.process();
                }
            },
            EnvelopeState::Hold => {
                // Process through delay and attack
                while envelope.state != EnvelopeState::Hold && envelope.state != EnvelopeState::Off {
                    envelope.process();
                }
            },
            EnvelopeState::Decay => {
                // Process through delay, attack, and hold
                while envelope.state != EnvelopeState::Decay && envelope.state != EnvelopeState::Off {
                    envelope.process();
                }
            },
            EnvelopeState::Sustain => {
                // Process to sustain
                while envelope.state != EnvelopeState::Sustain && envelope.state != EnvelopeState::Off {
                    envelope.process();
                }
            },
            EnvelopeState::Release => {
                // Process to sustain then release
                while envelope.state != EnvelopeState::Sustain && envelope.state != EnvelopeState::Off {
                    envelope.process();
                }
                envelope.release();
            },
        }
        
        // Skip if we couldn't reach the target state
        if envelope.state != target_state {
            println!("Skipping {} state test (couldn't reach state)", state_name);
            continue;
        }
        
        let start_time = Instant::now();
        
        // Process in target state
        for _ in 0..samples_per_state_test {
            envelope.process();
        }
        
        let elapsed = start_time.elapsed();
        let samples_per_second = samples_per_state_test as f64 / elapsed.as_secs_f64();
        
        println!("{} State Performance:", state_name);
        println!("  Processed {} samples in {:?}", samples_per_state_test, elapsed);
        println!("  Rate: {:.0} samples/second", samples_per_second);
        println!("  Per-sample time: {:.2}ns", elapsed.as_nanos() as f64 / samples_per_state_test as f64);
        
        // All states should maintain high performance
        assert!(samples_per_second >= SAMPLE_RATE as f64 * 100.0, 
               "{} state should be very fast: {:.0} < {}", 
               state_name, samples_per_second, SAMPLE_RATE as f64 * 100.0);
    }
}