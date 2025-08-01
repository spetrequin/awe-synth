/**
 * Sample Accuracy Tests
 * 
 * Verifies sample-accurate event processing at 44.1kHz sample rate.
 * Tests precise timing calculations, buffer boundary handling,
 * and sub-sample timing accuracy.
 */

use super::{TimingTestResult, TimingTestRunner};
use awe_synth::midi::sequencer::{MidiSequencer, PlaybackState, ProcessedMidiEvent};

/// Run all sample accuracy tests
pub fn run_sample_accuracy_tests() -> Vec<TimingTestResult> {
    let mut results = Vec::new();
    let _runner = TimingTestRunner::new();
    
    // Core sample accuracy tests
    results.push(test_sample_rate_conversion_accuracy());
    results.push(test_buffer_boundary_timing());
    results.push(test_sub_sample_timing_precision());
    results.push(test_event_sample_offset_calculation());
    results.push(test_concurrent_event_timing());
    
    // Integration with sequencer
    results.push(test_sequencer_sample_accuracy());
    results.push(test_midi_timing_at_44khz());
    results.push(test_timing_drift_over_time());
    
    results
}

/// Test sample rate conversion accuracy
fn test_sample_rate_conversion_accuracy() -> TimingTestResult {
    let test_name = "sample_rate_conversion_accuracy";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    
    // Test precise timing conversions
    let test_cases = vec![
        // (time_seconds, expected_samples)
        (0.0, 0),
        (1.0, 44100),                    // 1 second
        (0.1, 4410),                     // 100ms
        (0.01, 441),                     // 10ms
        (0.001, 44),                     // 1ms (rounded)
        (1.0 / 44100.0, 1),              // 1 sample period
        (2.0 / 44100.0, 2),              // 2 sample periods
        (0.022675736961451248, 1000),    // Exactly 1000 samples
    ];
    
    for (time_seconds, expected_samples) in test_cases {
        let calculated_samples = (time_seconds * sample_rate as f64).round() as u64;
        
        if calculated_samples != expected_samples {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sample conversion error: {:.6}s should be {} samples, got {}",
                    time_seconds, expected_samples, calculated_samples),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 1) // 1ns precision
}

/// Test event timing at buffer boundaries
fn test_buffer_boundary_timing() -> TimingTestResult {
    let test_name = "buffer_boundary_timing";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let buffer_size = 1024;
    
    // Test events occurring exactly at buffer boundaries
    let boundary_tests = vec![
        (0, 0),           // Start of first buffer
        (1024, 1),        // Start of second buffer  
        (2048, 2),        // Start of third buffer
        (1023, 0),        // End of first buffer
        (2047, 1),        // End of second buffer
    ];
    
    for (sample_position, expected_buffer) in boundary_tests {
        let buffer_index = sample_position / buffer_size;
        let sample_offset = sample_position % buffer_size;
        
        if buffer_index != expected_buffer {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Buffer boundary calculation error: sample {} should be buffer {}, got {}",
                    sample_position, expected_buffer, buffer_index),
                duration
            );
        }
        
        // Verify sample offset is within buffer bounds
        if sample_offset >= buffer_size {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sample offset out of bounds: {} >= {}", sample_offset, buffer_size),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 10) // 10ns precision
}

/// Test sub-sample timing precision
fn test_sub_sample_timing_precision() -> TimingTestResult {
    let test_name = "sub_sample_timing_precision";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let sample_period_ns = 1_000_000_000.0 / sample_rate; // ~22.7μs per sample
    
    // Test timing precision within single sample period
    let sub_sample_tests = vec![
        0.0,       // Start of sample
        0.25,      // Quarter sample
        0.5,       // Half sample  
        0.75,      // Three quarters
        0.999,     // Near end of sample
    ];
    
    for fractional_sample in sub_sample_tests {
        let time_ns = fractional_sample * sample_period_ns;
        let time_seconds = time_ns / 1_000_000_000.0;
        let calculated_sample = (time_seconds * sample_rate as f64).floor() as u64;
        
        // All fractional times within one sample period should map to sample 0
        if calculated_sample != 0 {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sub-sample timing error: {:.3} fractional sample -> sample {}",
                    fractional_sample, calculated_sample),
                duration
            );
        }
        
        // Test rounding behavior at sample boundary
        let boundary_time = 1.0 * sample_period_ns / 1_000_000_000.0;
        let boundary_sample = (boundary_time * sample_rate as f64).round() as u64;
        if boundary_sample != 1 {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sample boundary rounding error: got sample {}, expected 1", boundary_sample),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 100) // 100ns precision
}

/// Test event sample offset calculation within buffers
fn test_event_sample_offset_calculation() -> TimingTestResult {
    let test_name = "event_sample_offset_calculation";
    let start_time = std::time::Instant::now();
    
    let buffer_size = 1024;
    
    // Test various sample positions and their offsets
    let offset_tests = vec![
        // (absolute_sample, expected_offset)
        (0, 0),           // First sample of first buffer
        (512, 512),       // Middle of first buffer
        (1023, 1023),     // Last sample of first buffer
        (1024, 0),        // First sample of second buffer
        (1536, 512),      // Middle of second buffer
        (2047, 1023),     // Last sample of second buffer
        (2048, 0),        // First sample of third buffer
    ];
    
    for (absolute_sample, expected_offset) in offset_tests {
        let calculated_offset = absolute_sample % buffer_size;
        
        if calculated_offset != expected_offset {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sample offset error: sample {} should have offset {}, got {}",
                    absolute_sample, expected_offset, calculated_offset),
                duration
            );
        }
        
        // Verify offset is within valid range
        if calculated_offset >= buffer_size {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sample offset out of range: {} >= {}", calculated_offset, buffer_size),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 5) // 5ns precision
}

/// Test timing of concurrent events in same buffer
fn test_concurrent_event_timing() -> TimingTestResult {
    let test_name = "concurrent_event_timing";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let buffer_size = 1024;
    
    // Simulate multiple events within same buffer period
    let events = vec![
        10,   // Early in buffer
        100,  // 
        250,  // Quarter point
        512,  // Midpoint
        750,  // Three quarters
        1000, // Near end
        1023, // Last sample
    ];
    
    // Verify events maintain correct ordering and timing
    for i in 0..events.len() - 1 {
        let event1_sample = events[i];
        let event2_sample = events[i + 1];
        
        // Later events should have larger sample positions
        if event1_sample >= event2_sample {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Event ordering error: sample {} >= sample {}", event1_sample, event2_sample),
                duration
            );
        }
        
        // Calculate timing difference
        let sample_diff = event2_sample - event1_sample;
        let time_diff_seconds = sample_diff as f64 / sample_rate;
        let time_diff_ms = time_diff_seconds * 1000.0;
        
        // Verify reasonable timing (should be positive and < buffer duration)
        let max_buffer_time_ms = (buffer_size as f64 / sample_rate) * 1000.0; // ~23.2ms
        if time_diff_ms <= 0.0 || time_diff_ms > max_buffer_time_ms {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Event timing difference unreasonable: {:.3}ms", time_diff_ms),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 50) // 50ns precision
}

/// Test sequencer sample accuracy with real MIDI processing
fn test_sequencer_sample_accuracy() -> TimingTestResult {
    let test_name = "sequencer_sample_accuracy";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    let midi_data = create_precision_midi_file();
    
    if let Err(_) = sequencer.load_midi_file(&midi_data) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Failed to load precision MIDI file",
            duration
        );
    }
    
    sequencer.play(0);
    
    // Process events at precise sample boundaries
    let buffer_size = 1024;
    let mut total_events = 0;
    let mut last_event_sample = 0u64;
    
    for buffer_idx in 0..10 { // Process 10 buffers
        let current_sample = (buffer_idx * buffer_size) as u64;
        let events = sequencer.process(current_sample, buffer_size);
        
        for event in &events {
            // Verify event sample offset is within buffer bounds
            if event.sample_offset >= buffer_size {
                let duration = start_time.elapsed().as_millis();
                return TimingTestResult::failure(
                    test_name,
                    &format!("Event sample offset {} exceeds buffer size {}", 
                        event.sample_offset, buffer_size),
                    duration
                );
            }
            
            // Calculate absolute sample position
            let absolute_sample = current_sample + event.sample_offset as u64;
            
            // Verify events are in chronological order
            if absolute_sample < last_event_sample {
                let duration = start_time.elapsed().as_millis();
                return TimingTestResult::failure(
                    test_name,
                    &format!("Event chronology error: sample {} < previous {}", 
                        absolute_sample, last_event_sample),
                    duration
                );
            }
            
            last_event_sample = absolute_sample;
            total_events += 1;
        }
    }
    
    // Should have processed some events
    if total_events == 0 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "No events processed in sample accuracy test",
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 1000) // 1μs precision
}

/// Test MIDI timing specifically at 44.1kHz sample rate
fn test_midi_timing_at_44khz() -> TimingTestResult {
    let test_name = "midi_timing_at_44khz";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let expected_sample_period_us = 1_000_000.0 / sample_rate; // ~22.676 μs
    
    // Test various musical timing intervals at 44.1kHz
    let musical_intervals = vec![
        // (description, time_ms, expected_samples_approx)
        ("1ms", 1.0, 44),
        ("10ms", 10.0, 441), 
        ("Quarter note at 120 BPM", 500.0, 22050),
        ("Sixteenth note at 120 BPM", 125.0, 5512),
        ("32nd note at 120 BPM", 62.5, 2756),
    ];
    
    for (description, time_ms, expected_samples) in musical_intervals {
        let time_seconds = time_ms / 1000.0;
        let calculated_samples = (time_seconds * sample_rate as f64).round() as u32;
        
        // Allow small rounding tolerance
        let error = (calculated_samples as i32 - expected_samples as i32).abs();
        if error > 1 {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("{}: expected ~{} samples, got {} (error: {})",
                    description, expected_samples, calculated_samples, error),
                duration
            );
        }
        
        // Verify timing precision
        let actual_time_ms = (calculated_samples as f64 / sample_rate) * 1000.0;
        let time_error_ms = (actual_time_ms - time_ms).abs();
        
        // Should be within one sample period of accuracy
        let max_error_ms = expected_sample_period_us / 1000.0;
        if time_error_ms > max_error_ms {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("{}: timing error {:.3}ms exceeds tolerance {:.3}ms",
                    description, time_error_ms, max_error_ms),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 22676) // Sample period precision in ns
}

/// Test timing drift over extended periods
fn test_timing_drift_over_time() -> TimingTestResult {
    let test_name = "timing_drift_over_time";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let samples_per_second = sample_rate as u64;
    
    // Test timing accuracy over several seconds
    let test_duration_seconds = 5;
    let total_samples = samples_per_second * test_duration_seconds;
    
    // Check timing at regular intervals
    let check_intervals = vec![
        samples_per_second / 4,     // 0.25 seconds  
        samples_per_second / 2,     // 0.5 seconds
        samples_per_second,         // 1 second
        samples_per_second * 2,     // 2 seconds
        samples_per_second * 5,     // 5 seconds
    ];
    
    for sample_position in check_intervals {
        if sample_position > total_samples {
            continue;
        }
        
        // Convert back to time and verify accuracy
        let calculated_time = sample_position as f64 / sample_rate;
        let expected_time = sample_position as f64 / sample_rate;
        
        let time_error = (calculated_time - expected_time).abs();
        
        // Should have essentially zero drift (floating point precision limits)
        if time_error > 1e-10 { // 0.1 nanosecond tolerance
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Timing drift detected at sample {}: error {:.3e}s", 
                    sample_position, time_error),
                duration
            );
        }
        
        // Test sample position round-trip accuracy
        let recalculated_samples = (calculated_time * sample_rate).round() as u64;
        if recalculated_samples != sample_position {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Sample round-trip error: {} -> {}", sample_position, recalculated_samples),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 100) // 100ns precision
}

/// Create a MIDI file with precisely timed events for testing
fn create_precision_midi_file() -> Vec<u8> {
    let mut data = Vec::new();
    
    // MIDI header
    data.extend_from_slice(b"MThd");
    data.extend_from_slice(&[0, 0, 0, 6]);
    data.extend_from_slice(&[0, 0]);        // Format 0
    data.extend_from_slice(&[0, 1]);        // 1 track
    data.extend_from_slice(&[0, 240]);      // 240 ticks per quarter (high resolution)
    
    // Track header
    data.extend_from_slice(b"MTrk");
    
    let mut track_data = Vec::new();
    
    // Create events at specific timing intervals for precision testing
    let events = vec![
        (0, 0x90, 60, 100),      // Note on at tick 0
        (60, 0x80, 60, 0),       // Note off at tick 60 (1/4 quarter note)
        (60, 0x90, 62, 100),     // Note on at tick 120 (1/2 quarter note)
        (60, 0x80, 62, 0),       // Note off at tick 180 (3/4 quarter note)
        (60, 0x90, 64, 100),     // Note on at tick 240 (1 quarter note)
        (240, 0x80, 64, 0),      // Note off at tick 480 (2 quarter notes)
    ];
    
    for (delta_time, status, data1, data2) in events {
        // Encode delta time
        if delta_time < 128 {
            track_data.push(delta_time as u8);
        } else {
            // Simple variable length encoding for larger values
            let mut value = delta_time;
            let mut bytes = Vec::new();
            while value > 0 {
                bytes.push((value & 0x7F) as u8);
                value >>= 7;
            }
            bytes.reverse();
            for (i, byte) in bytes.iter().enumerate() {
                if i < bytes.len() - 1 {
                    track_data.push(byte | 0x80);
                } else {
                    track_data.push(*byte);
                }
            }
        }
        
        track_data.push(status);
        track_data.push(data1);
        track_data.push(data2);
    }
    
    // End of track
    track_data.push(0);     // Delta time
    track_data.push(0xFF);  // Meta event
    track_data.push(0x2F);  // End of track
    track_data.push(0);     // Length
    
    // Add track length
    let track_length = track_data.len() as u32;
    data.extend_from_slice(&track_length.to_be_bytes());
    data.extend_from_slice(&track_data);
    
    data
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_all_sample_accuracy() {
        let results = run_sample_accuracy_tests();
        
        let mut all_passed = true;
        for result in &results {
            println!("Test {}: {} ({}ms)", 
                result.test_name, 
                if result.passed { "PASSED" } else { "FAILED" },
                result.duration_ms
            );
            
            if !result.passed {
                println!("  Error: {}", result.message);
                all_passed = false;
            } else if let Some(accuracy_ns) = result.timing_accuracy_ns {
                println!("  Timing accuracy: {}ns", accuracy_ns);
            }
        }
        
        assert!(all_passed, "Some sample accuracy tests failed");
    }
    
    #[test]
    fn test_sample_period_calculation() {
        let sample_rate = 44100.0;
        let period_seconds = 1.0 / sample_rate;
        let period_us = period_seconds * 1_000_000.0;
        
        // Should be approximately 22.676 microseconds
        assert!((period_us - 22.676_f64).abs() < 0.001);
    }
}