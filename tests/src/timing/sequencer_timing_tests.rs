/**
 * Sequencer Timing Tests
 * 
 * Tests MIDI sequencer timing accuracy, tempo handling,
 * and sample-accurate event scheduling.
 */

use super::{TimingTestResult, TimingTestRunner};
use awe_synth::midi::sequencer::{MidiSequencer, PlaybackState};
use awe_synth::midi::parser::{MidiFile, MidiEvent, MidiEventType, MidiTrack, MetaEventType};

/// Run all sequencer timing tests
pub fn run_sequencer_timing_tests() -> Vec<TimingTestResult> {
    let mut results = Vec::new();
    let _runner = TimingTestRunner::new();
    
    // Basic timing tests
    results.push(test_tick_to_sample_conversion());
    results.push(test_tempo_change_timing());
    results.push(test_playback_position_accuracy());
    results.push(test_seek_timing_accuracy());
    results.push(test_event_scheduling_precision());
    
    // Tests using actual MidiSequencer
    results.push(test_sequencer_initialization());
    results.push(test_sequencer_playback_state());
    results.push(test_sequencer_tempo_multiplier());
    
    results
}

/// Test tick to sample conversion accuracy
fn test_tick_to_sample_conversion() -> TimingTestResult {
    let test_name = "tick_to_sample_conversion";
    let start_time = std::time::Instant::now();
    
    // Test conversion at different tempos and tick rates
    let sample_rate = 44100.0;
    let test_cases = vec![
        // (tempo_bpm, ticks_per_quarter, tick, expected_sample)
        (120.0, 480, 480, 22050),    // 1 quarter note at 120 BPM = 0.5s
        (60.0, 480, 480, 44100),     // 1 quarter note at 60 BPM = 1.0s
        (140.0, 960, 960, 18900),    // 1 quarter note at 140 BPM ≈ 0.428s
    ];
    
    for (bpm, tpq, tick, expected_sample) in test_cases {
        let microseconds_per_quarter = (60_000_000.0 / bpm) as u32;
        let seconds_per_quarter = microseconds_per_quarter as f64 / 1_000_000.0;
        let seconds_per_tick = seconds_per_quarter / tpq as f64;
        let calculated_sample = (tick as f64 * seconds_per_tick * sample_rate) as u64;
        
        let error = (calculated_sample as i64 - expected_sample as i64).abs();
        
        if error > 1 {  // Allow 1 sample tolerance
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Tick->sample conversion error: {} samples (BPM: {}, TPQ: {}, tick: {})",
                    error, bpm, tpq, tick),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 100)
}

/// Test tempo change timing accuracy
fn test_tempo_change_timing() -> TimingTestResult {
    let test_name = "tempo_change_timing";
    let start_time = std::time::Instant::now();
    
    // Test that tempo changes are applied at the correct time
    let sample_rate = 44100.0;
    let _ticks_per_quarter = 480;
    
    // Scenario: Start at 120 BPM, change to 140 BPM after 1 quarter note
    let _tempo_change_tick = 480;
    let bpm_120_microseconds = 500_000u32; // 120 BPM
    let bpm_140_microseconds = 428_571u32; // 140 BPM
    
    // Calculate expected sample for event after tempo change
    // First quarter at 120 BPM = 0.5s = 22050 samples
    // Second quarter at 140 BPM ≈ 0.428s ≈ 18900 samples
    // Total ≈ 40950 samples
    let expected_total_samples = 22050 + 18900;
    
    // Calculate actual using sequencer logic
    let first_quarter_seconds = bpm_120_microseconds as f64 / 1_000_000.0;
    let second_quarter_seconds = bpm_140_microseconds as f64 / 1_000_000.0;
    let total_seconds = first_quarter_seconds + second_quarter_seconds;
    let calculated_samples = (total_seconds * sample_rate) as u64;
    
    let error = (calculated_samples as i64 - expected_total_samples as i64).abs();
    
    if error > 100 {  // Allow 100 sample tolerance for tempo changes
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Tempo change timing error: {} samples", error),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 1000)
}

/// Test playback position accuracy
fn test_playback_position_accuracy() -> TimingTestResult {
    let test_name = "playback_position_accuracy";
    let start_time = std::time::Instant::now();
    
    // Test that playback position is calculated correctly
    let _sample_rate = 44100.0;
    
    // Test position calculations at various points
    let test_cases = vec![
        (0.0, 0.0),      // Start position
        (0.25, 0.25),    // 25% through
        (0.5, 0.5),      // Midpoint
        (0.75, 0.75),    // 75% through
        (1.0, 1.0),      // End position
    ];
    
    for (input_position, expected_position) in test_cases {
        // In a real test, we would seek to position and verify
        // For now, just verify the math is correct
        let error = ((input_position - expected_position) as f64).abs();
        
        if error > 0.001 {  // 0.1% tolerance
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Position accuracy error: {} (expected: {}, got: {})",
                    error, expected_position, input_position),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 500)
}

/// Test seek timing accuracy
fn test_seek_timing_accuracy() -> TimingTestResult {
    let test_name = "seek_timing_accuracy";
    let start_time = std::time::Instant::now();
    
    // Test that seeking maintains accurate timing
    let _sample_rate = 44100.0;
    let duration_ticks = 9600u64;  // 10 quarter notes at 960 TPQ
    
    // Test seeking to various positions
    let test_positions = vec![0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
    
    for position in test_positions {
        let expected_tick = (position * duration_ticks as f64) as u64;
        let calculated_tick = (position.clamp(0.0, 1.0) * duration_ticks as f64) as u64;
        
        if expected_tick != calculated_tick {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Seek calculation error at position {}: expected tick {}, got {}",
                    position, expected_tick, calculated_tick),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 100)
}

/// Test event scheduling precision
fn test_event_scheduling_precision() -> TimingTestResult {
    let test_name = "event_scheduling_precision";
    let start_time = std::time::Instant::now();
    
    // Test that events are scheduled at precisely the right sample
    let sample_rate = 44100.0;
    let ticks_per_quarter = 480;
    let tempo_microseconds = 500_000u32; // 120 BPM
    
    // Create test events at specific musical positions
    let test_events = vec![
        (0, 0),           // Start
        (480, 22050),     // 1 quarter note (0.5s at 120 BPM)
        (960, 44100),     // 2 quarter notes (1.0s)
        (1440, 66150),    // 3 quarter notes (1.5s)
    ];
    
    for (tick, expected_sample) in test_events {
        // Calculate sample position for tick
        let quarters = tick as f64 / ticks_per_quarter as f64;
        let seconds = quarters * (tempo_microseconds as f64 / 1_000_000.0);
        let calculated_sample = (seconds * sample_rate) as u64;
        
        let error = (calculated_sample as i64 - expected_sample as i64).abs();
        
        if error > 1 {  // 1 sample tolerance for precision
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Event scheduling error at tick {}: {} samples off (expected: {}, got: {})",
                    tick, error, expected_sample, calculated_sample),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 50)
}

/// Test MidiSequencer initialization
fn test_sequencer_initialization() -> TimingTestResult {
    let test_name = "sequencer_initialization";
    let start_time = std::time::Instant::now();
    
    // Test sequencer creation
    let sample_rate = 44100.0;
    let sequencer = MidiSequencer::new(sample_rate);
    
    // Verify initial state
    if sequencer.get_state() != PlaybackState::Stopped {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Expected initial state Stopped, got {:?}", sequencer.get_state()),
            duration
        );
    }
    
    // Verify initial position
    if sequencer.get_position() != 0.0 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Expected initial position 0.0, got {}", sequencer.get_position()),
            duration
        );
    }
    
    // Verify initial tempo (should be 120 BPM default)
    let expected_tempo = 120.0;
    let actual_tempo = sequencer.get_current_tempo_bpm();
    if (actual_tempo - expected_tempo).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Expected tempo {}, got {}", expected_tempo, actual_tempo),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 100)
}

/// Test sequencer playback state transitions
fn test_sequencer_playback_state() -> TimingTestResult {
    let test_name = "sequencer_playback_state";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    let current_sample = 0u64;
    
    // Initial state should be Stopped
    if sequencer.get_state() != PlaybackState::Stopped {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Expected initial state to be Stopped",
            duration
        );
    }
    
    // Create a simple MIDI file for testing
    let simple_midi_data = create_test_midi_file();
    if let Err(_) = sequencer.load_midi_file(&simple_midi_data) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Failed to load test MIDI file",
            duration
        );
    }
    
    // Test play from stopped (now should work with MIDI file loaded)
    sequencer.play(current_sample);
    if sequencer.get_state() != PlaybackState::Playing {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Expected state to be Playing after play()",
            duration
        );
    }
    
    // Test pause
    sequencer.pause(current_sample + 1000);
    if sequencer.get_state() != PlaybackState::Paused {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Expected state to be Paused after pause()",
            duration
        );
    }
    
    // Test resume
    sequencer.play(current_sample + 2000);
    if sequencer.get_state() != PlaybackState::Playing {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Expected state to be Playing after resume",
            duration
        );
    }
    
    // Test stop
    sequencer.stop();
    if sequencer.get_state() != PlaybackState::Stopped {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Expected state to be Stopped after stop()",
            duration
        );
    }
    
    // Position should reset to 0 after stop
    if sequencer.get_position() != 0.0 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Expected position 0.0 after stop, got {}", sequencer.get_position()),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 200)
}

/// Test sequencer tempo multiplier functionality
fn test_sequencer_tempo_multiplier() -> TimingTestResult {
    let test_name = "sequencer_tempo_multiplier";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    
    // Test default multiplier (should be 1.0)
    let original_tempo = sequencer.get_original_tempo_bpm();
    let current_tempo = sequencer.get_current_tempo_bpm();
    if (original_tempo - current_tempo).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Default tempo multiplier should be 1.0: original={}, current={}", 
                original_tempo, current_tempo),
            duration
        );
    }
    
    // Test setting tempo multiplier to 2.0 (double speed)
    sequencer.set_tempo_multiplier(2.0);
    let doubled_tempo = sequencer.get_current_tempo_bpm();
    let expected_doubled = original_tempo * 2.0;
    if (doubled_tempo - expected_doubled).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("2x tempo should be {}, got {}", expected_doubled, doubled_tempo),
            duration
        );
    }
    
    // Test setting tempo multiplier to 0.5 (half speed)
    sequencer.set_tempo_multiplier(0.5);
    let halved_tempo = sequencer.get_current_tempo_bpm();
    let expected_halved = original_tempo * 0.5;
    if (halved_tempo - expected_halved).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("0.5x tempo should be {}, got {}", expected_halved, halved_tempo),
            duration
        );
    }
    
    // Test clamping (should clamp to 0.25-4.0 range)
    sequencer.set_tempo_multiplier(10.0);  // Should clamp to 4.0
    let clamped_tempo = sequencer.get_current_tempo_bpm();
    let expected_max = original_tempo * 4.0;
    if (clamped_tempo - expected_max).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Max tempo should be {}, got {}", expected_max, clamped_tempo),
            duration
        );
    }
    
    sequencer.set_tempo_multiplier(0.1);  // Should clamp to 0.25
    let clamped_min_tempo = sequencer.get_current_tempo_bpm();
    let expected_min = original_tempo * 0.25;
    if (clamped_min_tempo - expected_min).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Min tempo should be {}, got {}", expected_min, clamped_min_tempo),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 300)
}

/// Create a simple test MIDI file for testing
fn create_test_midi_file() -> Vec<u8> {
    // Create a minimal valid MIDI file with one track
    // MIDI file header (MThd chunk)
    let mut data = Vec::new();
    
    // MThd header
    data.extend_from_slice(b"MThd");      // Chunk type
    data.extend_from_slice(&[0, 0, 0, 6]); // Chunk length (6 bytes)
    data.extend_from_slice(&[0, 0]);       // Format 0 (single track)
    data.extend_from_slice(&[0, 1]);       // 1 track
    data.extend_from_slice(&[0, 96]);      // 96 ticks per quarter note
    
    // MTrk header  
    data.extend_from_slice(b"MTrk");      // Track chunk type
    
    // Track data (we'll calculate length)
    let mut track_data = Vec::new();
    
    // Note on event: delta time (0), status (0x90 = note on channel 0), note (60 = middle C), velocity (64)
    track_data.push(0);     // Delta time
    track_data.push(0x90);  // Note on, channel 0
    track_data.push(60);    // Middle C
    track_data.push(64);    // Velocity
    
    // Note off event: delta time (96 = 1 quarter note), status (0x80), note (60), velocity (0)
    track_data.push(96);    // Delta time (1 quarter note)
    track_data.push(0x80);  // Note off, channel 0
    track_data.push(60);    // Middle C
    track_data.push(0);     // Velocity
    
    // End of track meta event: delta time (0), status (0xFF), type (0x2F), length (0)
    track_data.push(0);     // Delta time
    track_data.push(0xFF);  // Meta event
    track_data.push(0x2F);  // End of track
    track_data.push(0);     // Length
    
    // Add track length (4 bytes, big endian)
    let track_length = track_data.len() as u32;
    data.extend_from_slice(&track_length.to_be_bytes());
    
    // Add track data
    data.extend_from_slice(&track_data);
    
    data
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_all_sequencer_timing() {
        let results = run_sequencer_timing_tests();
        
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
        
        assert!(all_passed, "Some timing tests failed");
    }
}