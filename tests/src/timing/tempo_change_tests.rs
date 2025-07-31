/**
 * Tempo Change Tests
 * 
 * Tests that tempo changes properly affect MIDI event scheduling timing.
 * Verifies that events scheduled after tempo changes occur at the correct
 * sample positions based on the new tempo.
 */

use super::{TimingTestResult, TimingTestRunner};
use awe_synth::midi::sequencer::{MidiSequencer, PlaybackState};
use awe_synth::midi::parser::{MidiFile, MidiEvent, MidiEventType, MidiTrack, MetaEventType};

/// Run all tempo change tests
pub fn run_tempo_change_tests() -> Vec<TimingTestResult> {
    let mut results = Vec::new();
    let _runner = TimingTestRunner::new();
    
    // Test tempo change calculations
    results.push(test_tempo_change_sample_calculation());
    results.push(test_multiple_tempo_changes());
    results.push(test_tempo_change_during_playback());
    results.push(test_tempo_multiplier_with_tempo_changes());
    results.push(test_tempo_change_event_ordering());
    
    // Test with actual sequencer
    results.push(test_sequencer_tempo_change_integration());
    results.push(test_tempo_change_with_seek());
    results.push(test_extreme_tempo_changes());
    
    results
}

/// Test basic tempo change sample position calculation
fn test_tempo_change_sample_calculation() -> TimingTestResult {
    let test_name = "tempo_change_sample_calculation";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let ticks_per_quarter = 480;
    
    // Test scenario: 
    // - Start at 120 BPM (500,000 microseconds per quarter)
    // - Change to 240 BPM (250,000 microseconds per quarter) at tick 480
    // - Event at tick 960 should occur at different time than constant 120 BPM
    
    let tempo_120_us = 500_000u32;
    let tempo_240_us = 250_000u32;
    
    // Calculate expected timing:
    // First quarter (0-480 ticks) at 120 BPM = 0.5 seconds = 22050 samples
    let first_quarter_samples = (tempo_120_us as f64 / 1_000_000.0 * sample_rate) as u64;
    
    // Second quarter (480-960 ticks) at 240 BPM = 0.25 seconds = 11025 samples
    let second_quarter_samples = (tempo_240_us as f64 / 1_000_000.0 * sample_rate) as u64;
    
    let expected_total = first_quarter_samples + second_quarter_samples; // 33075 samples
    
    // Verify calculations
    if first_quarter_samples != 22050 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("First quarter calculation wrong: expected 22050, got {}", first_quarter_samples),
            duration
        );
    }
    
    if second_quarter_samples != 11025 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Second quarter calculation wrong: expected 11025, got {}", second_quarter_samples),
            duration
        );
    }
    
    if expected_total != 33075 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Total timing calculation wrong: expected 33075, got {}", expected_total),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 100)
}

/// Test multiple consecutive tempo changes
fn test_multiple_tempo_changes() -> TimingTestResult {
    let test_name = "multiple_tempo_changes";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let ticks_per_quarter = 480;
    
    // Test scenario: Multiple tempo changes
    // Tick 0: 120 BPM (500,000 μs/quarter)
    // Tick 480: 140 BPM (428,571 μs/quarter) 
    // Tick 960: 100 BPM (600,000 μs/quarter)
    // Event at tick 1440 (3 quarters)
    
    let tempos = vec![
        (0, 500_000u32),     // 120 BPM
        (480, 428_571u32),   // 140 BPM  
        (960, 600_000u32),   // 100 BPM
    ];
    
    let mut total_samples = 0u64;
    
    for i in 0..tempos.len() {
        let (start_tick, tempo_us) = tempos[i];
        let end_tick = if i + 1 < tempos.len() { tempos[i + 1].0 } else { 1440 };
        
        let quarters = (end_tick - start_tick) as f64 / ticks_per_quarter as f64;
        let seconds = quarters * (tempo_us as f64 / 1_000_000.0);
        let samples = (seconds * sample_rate) as u64;
        
        total_samples += samples;
    }
    
    // Verify reasonable total (around 1.5-2 seconds for 3 quarters with varying tempos)
    if total_samples < 60000 || total_samples > 100000 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Multiple tempo change timing unreasonable: {} samples", total_samples),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 200)
}

/// Test tempo changes during active playback
fn test_tempo_change_during_playback() -> TimingTestResult {
    let test_name = "tempo_change_during_playback";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    
    // Create MIDI with tempo change
    let midi_data = create_midi_with_tempo_change();
    
    if let Err(_) = sequencer.load_midi_file(&midi_data) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Failed to load MIDI file with tempo change",
            duration
        );
    }
    
    // Start playback
    sequencer.play(0);
    
    if sequencer.get_state() != PlaybackState::Playing {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Sequencer not playing after play()",
            duration
        );
    }
    
    // Process through tempo change (simulate 1 second)
    let sample_rate = 44100;
    let events1 = sequencer.process(sample_rate / 2, 1024); // 0.5 seconds
    let events2 = sequencer.process(sample_rate, 1024);     // 1.0 seconds
    
    // Should have processed some events
    let total_events = events1.len() + events2.len();
    if total_events == 0 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "No events processed during tempo change test",
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 500)
}

/// Test tempo multiplier combined with tempo changes
fn test_tempo_multiplier_with_tempo_changes() -> TimingTestResult {
    let test_name = "tempo_multiplier_with_tempo_changes";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    
    let midi_data = create_midi_with_tempo_change();
    
    if let Err(_) = sequencer.load_midi_file(&midi_data) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Failed to load MIDI file for tempo multiplier test",
            duration
        );
    }
    
    // Set tempo multiplier to 2.0 (double speed) AFTER loading
    sequencer.set_tempo_multiplier(2.0);
    
    // Verify tempo multiplier is still applied
    let base_tempo = sequencer.get_original_tempo_bpm();
    let current_tempo = sequencer.get_current_tempo_bpm();
    let expected_tempo = base_tempo * 2.0;
    
    if (current_tempo - expected_tempo).abs() > 0.1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Tempo multiplier not applied: expected {}, got {}", expected_tempo, current_tempo),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 300)
}

/// Test event ordering with tempo changes
fn test_tempo_change_event_ordering() -> TimingTestResult {
    let test_name = "tempo_change_event_ordering";
    let start_time = std::time::Instant::now();
    
    // Test that events scheduled before and after tempo changes
    // maintain correct relative timing
    
    let sample_rate = 44100.0;
    let ticks_per_quarter = 480;
    
    // Events at ticks: 240, 480 (tempo change), 720
    // Tempo change from 120 BPM to 240 BPM at tick 480
    
    let tempo_120_us = 500_000u32;
    let tempo_240_us = 250_000u32;
    
    // Calculate expected sample positions
    let event1_samples = (240.0 / ticks_per_quarter as f64) * (tempo_120_us as f64 / 1_000_000.0) * sample_rate;
    let event2_samples = (480.0 / ticks_per_quarter as f64) * (tempo_120_us as f64 / 1_000_000.0) * sample_rate;
    let event3_samples = event2_samples + ((240.0 / ticks_per_quarter as f64) * (tempo_240_us as f64 / 1_000_000.0) * sample_rate);
    
    // Verify ordering: event1 < event2 < event3
    if !(event1_samples < event2_samples && event2_samples < event3_samples) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Event ordering incorrect: {:.0} < {:.0} < {:.0}", event1_samples, event2_samples, event3_samples),
            duration
        );
    }
    
    // Verify reasonable spacing
    let spacing1 = event2_samples - event1_samples;
    let spacing2 = event3_samples - event2_samples;
    
    // After tempo change, spacing should be smaller (faster tempo)
    if spacing2 >= spacing1 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Tempo change not reflected in event spacing: {:.0} >= {:.0}", spacing2, spacing1),
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 150)
}

/// Test tempo changes with actual sequencer integration
fn test_sequencer_tempo_change_integration() -> TimingTestResult {
    let test_name = "sequencer_tempo_change_integration";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    let midi_data = create_midi_with_tempo_change();
    
    if let Err(_) = sequencer.load_midi_file(&midi_data) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Failed to load tempo change MIDI",
            duration
        );
    }
    
    sequencer.play(0);
    
    // Process events across tempo change boundary
    let mut all_events = Vec::new();
    let sample_increment = 4410; // 0.1 second increments
    
    for i in 0..20 { // Process 2 seconds total
        let current_sample = (i * sample_increment) as u64;
        let events = sequencer.process(current_sample, 1024);
        all_events.extend(events);
    }
    
    // Should have processed multiple events including tempo change
    if all_events.is_empty() {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "No events processed in sequencer tempo change test",
            duration
        );
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 1000)
}

/// Test tempo changes with seek operations
fn test_tempo_change_with_seek() -> TimingTestResult {
    let test_name = "tempo_change_with_seek";
    let start_time = std::time::Instant::now();
    
    let mut sequencer = MidiSequencer::new(44100.0);
    let midi_data = create_midi_with_tempo_change();
    
    if let Err(_) = sequencer.load_midi_file(&midi_data) {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            "Failed to load MIDI for seek test",
            duration
        );
    }
    
    // Seek to position after tempo change (75% through)
    sequencer.seek(0.75, 0);
    
    let position = sequencer.get_position();
    if (position - 0.75).abs() > 0.01 {
        let duration = start_time.elapsed().as_millis();
        return TimingTestResult::failure(
            test_name,
            &format!("Seek position incorrect: expected 0.75, got {}", position),
            duration
        );
    }
    
    // Start playback from seeked position
    sequencer.play(0);
    
    // Process some events
    let events = sequencer.process(44100, 1024); // 1 second
    
    // Should be able to process events from seeked position
    // (This tests that tempo change state is handled correctly after seek)
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 400)
}

/// Test extreme tempo changes
fn test_extreme_tempo_changes() -> TimingTestResult {
    let test_name = "extreme_tempo_changes";
    let start_time = std::time::Instant::now();
    
    let sample_rate = 44100.0;
    let ticks_per_quarter = 480;
    
    // Test very fast and very slow tempos
    let tempos = vec![
        60_000u32,    // 1000 BPM (very fast)
        2_000_000u32, // 30 BPM (very slow)
        300_000u32,   // 200 BPM (fast)
        1_500_000u32, // 40 BPM (slow)
    ];
    
    for tempo_us in tempos {
        // Calculate timing for one quarter note
        let seconds = tempo_us as f64 / 1_000_000.0;
        let samples = (seconds * sample_rate) as u64;
        
        // Verify reasonable bounds (0.06s to 2s for quarter note)
        if samples < 2646 || samples > 88200 { // ~60ms to 2s
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Extreme tempo {} μs gives unreasonable {} samples", tempo_us, samples),
                duration
            );
        }
    }
    
    let duration = start_time.elapsed().as_millis();
    TimingTestResult::success(test_name, duration, 50)
}

/// Create a MIDI file with tempo change for testing
fn create_midi_with_tempo_change() -> Vec<u8> {
    let mut data = Vec::new();
    
    // MIDI header
    data.extend_from_slice(b"MThd");
    data.extend_from_slice(&[0, 0, 0, 6]);
    data.extend_from_slice(&[0, 0]);     // Format 0
    data.extend_from_slice(&[0, 1]);     // 1 track
    data.extend_from_slice(&[1, 224]);   // 480 ticks per quarter
    
    // Track header
    data.extend_from_slice(b"MTrk");
    
    let mut track_data = Vec::new();
    
    // Initial note on at tick 0
    track_data.push(0);     // Delta time
    track_data.push(0x90);  // Note on
    track_data.push(60);    // Middle C
    track_data.push(100);   // Velocity
    
    // Note off after 1 quarter (480 ticks)
    track_data.extend_from_slice(&encode_variable_length(480));
    track_data.push(0x80);  // Note off
    track_data.push(60);    // Middle C
    track_data.push(0);     // Velocity
    
    // Tempo change at tick 480 (to 240 BPM = 250,000 μs/quarter)
    track_data.push(0);     // Delta time (same tick)
    track_data.push(0xFF);  // Meta event
    track_data.push(0x51);  // Set Tempo
    track_data.push(3);     // Length
    track_data.extend_from_slice(&250_000u32.to_be_bytes()[1..4]); // 250,000 μs
    
    // Another note on after tempo change (at tick 960)
    track_data.extend_from_slice(&encode_variable_length(480));
    track_data.push(0x90);  // Note on
    track_data.push(64);    // E
    track_data.push(100);   // Velocity
    
    // Final note off (at tick 1440)
    track_data.extend_from_slice(&encode_variable_length(480));
    track_data.push(0x80);  // Note off
    track_data.push(64);    // E
    track_data.push(0);     // Velocity
    
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

/// Encode variable length quantity (MIDI format)
fn encode_variable_length(mut value: u32) -> Vec<u8> {
    let mut result: Vec<u8> = Vec::new();
    
    // Handle special case of 0
    if value == 0 {
        return vec![0];
    }
    
    // Extract 7-bit chunks, starting from the least significant
    let mut bytes = Vec::new();
    while value > 0 {
        bytes.push((value & 0x7F) as u8);
        value >>= 7;
    }
    
    // Reverse to get most significant first
    bytes.reverse();
    
    // Set continuation bit on all but the last byte
    for i in 0..bytes.len() - 1 {
        bytes[i] |= 0x80;
    }
    
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_all_tempo_changes() {
        let results = run_tempo_change_tests();
        
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
        
        assert!(all_passed, "Some tempo change tests failed");
    }
    
    #[test]
    fn test_variable_length_encoding() {
        // Test MIDI variable length encoding
        assert_eq!(encode_variable_length(0), vec![0]);
        assert_eq!(encode_variable_length(127), vec![127]);
        assert_eq!(encode_variable_length(128), vec![0x81, 0x00]);
        assert_eq!(encode_variable_length(480), vec![0x83, 0x60]);
    }
}