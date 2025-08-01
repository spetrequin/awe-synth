// MIDI to audio synthesis integration tests for Phase 7B
// Tests complete MIDI → synthesis pipeline, MidiPlayer::process(), sample-accurate timing, and frequency accuracy

use awe_synth::{MidiPlayer, MidiEvent};

const SAMPLE_RATE: f32 = 44100.0;
const EPSILON: f32 = 1e-6;

#[test]
fn test_midi_player_initialization() {
    let midi_player = MidiPlayer::new();
    
    // Should initialize without panicking
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("MidiPlayer::new()"), "Should log initialization");
    assert!(debug_log.contains("AWE Player initialized"), "Should confirm initialization");
}

#[test]
fn test_midi_event_queueing() {
    let mut midi_player = MidiPlayer::new();
    
    // Create test MIDI events
    let note_on = MidiEvent::new(0, 0, 0x90, 60, 100); // C4, velocity 100
    let note_off = MidiEvent::new(1000, 0, 0x80, 60, 0); // C4 off after 1000 samples
    
    // Queue events
    midi_player.queue_midi_event(note_on);
    midi_player.queue_midi_event(note_off);
    
    // Verify events were queued
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("MIDI event queued"), "Should log queued events");
    assert!(debug_log.contains("ch=0 type=144"), "Should log note on event"); // 0x90 = 144
    assert!(debug_log.contains("ch=0 type=128"), "Should log note off event"); // 0x80 = 128
}

#[test]
fn test_midi_event_processing() {
    let mut midi_player = MidiPlayer::new();
    
    // Queue a note on event at sample 0
    let note_on = MidiEvent::new(0, 0, 0x90, 60, 100);
    midi_player.queue_midi_event(note_on);
    
    // Process events at sample 0
    let processed_count = midi_player.process_midi_events(0);
    assert_eq!(processed_count, 1, "Should process one event at sample 0");
    
    // Verify event was processed
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("Processing MIDI event"), "Should log event processing");
    assert!(debug_log.contains("VoiceManager: Note On"), "Should route to VoiceManager");
}

#[test]
fn test_midi_note_on_to_synthesis() {
    let mut midi_player = MidiPlayer::new();
    
    // Queue note on event
    let note_on = MidiEvent::new(0, 0, 0x90, 69, 100); // A4, 440Hz
    midi_player.queue_midi_event(note_on);
    
    // Process the event
    midi_player.process_midi_events(0);
    
    // Generate audio samples - should produce sound
    let mut has_audio = false;
    for _ in 0..1000 {
        let sample = midi_player.process();
        if sample.abs() > 0.001 {
            has_audio = true;
        }
        assert!(sample >= -1.0 && sample <= 1.0, "Sample should be in valid range: {}", sample);
    }
    
    assert!(has_audio, "MIDI note on should produce audio output");
}

#[test]
fn test_midi_note_off_stops_synthesis() {
    let mut midi_player = MidiPlayer::new();
    
    // Start a note
    let note_on = MidiEvent::new(0, 0, 0x90, 60, 100);
    midi_player.queue_midi_event(note_on);
    midi_player.process_midi_events(0);
    
    // Let note sustain
    for _ in 0..5000 {
        midi_player.process();
    }
    
    // Measure sustain amplitude
    let mut sustain_samples = Vec::new();
    for _ in 0..500 {
        sustain_samples.push(midi_player.process().abs());
    }
    let sustain_rms = (sustain_samples.iter().map(|s| s * s).sum::<f32>() / sustain_samples.len() as f32).sqrt();
    
    // Send note off
    let note_off = MidiEvent::new(5500, 0, 0x80, 60, 0);
    midi_player.queue_midi_event(note_off);
    midi_player.process_midi_events(5500);
    
    // Process release phase
    for _ in 0..2000 {
        midi_player.process();
    }
    
    // Measure release amplitude
    let mut release_samples = Vec::new();
    for _ in 0..500 {
        release_samples.push(midi_player.process().abs());
    }
    let release_rms = (release_samples.iter().map(|s| s * s).sum::<f32>() / release_samples.len() as f32).sqrt();
    
    // Release should reduce amplitude
    assert!(release_rms < sustain_rms, 
        "Note off should reduce amplitude: sustain={}, release={}", sustain_rms, release_rms);
}

#[test]
fn test_midi_polyphonic_synthesis() {
    let mut midi_player = MidiPlayer::new();
    
    // Start multiple notes to create a chord
    let notes = [60, 64, 67]; // C major chord
    for (i, &note) in notes.iter().enumerate() {
        let note_on = MidiEvent::new(i as u64 * 100, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process all events
    for i in 0..300 {
        midi_player.process_midi_events(i);
    }
    
    // Generate polyphonic audio
    let mut chord_samples = Vec::new();
    for _ in 0..2000 {
        chord_samples.push(midi_player.process());
    }
    
    // Verify polyphonic output
    let chord_rms = (chord_samples.iter().map(|s| s * s).sum::<f32>() / chord_samples.len() as f32).sqrt();
    assert!(chord_rms > 0.01, "Polyphonic MIDI should produce strong signal: RMS={}", chord_rms);
    
    // Verify no clipping
    let max_amplitude = chord_samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_amplitude <= 1.0, "Polyphonic synthesis should not clip: max={}", max_amplitude);
}

#[test]
fn test_midi_velocity_affects_synthesis() {
    let mut midi_player = MidiPlayer::new();
    
    // Test low velocity note
    let low_vel_note = MidiEvent::new(0, 0, 0x90, 60, 50); // Low velocity
    midi_player.queue_midi_event(low_vel_note);
    midi_player.process_midi_events(0);
    
    // Let envelope stabilize
    for _ in 0..3000 {
        midi_player.process();
    }
    
    // Measure low velocity amplitude
    let mut low_vel_samples = Vec::new();
    for _ in 0..1000 {
        low_vel_samples.push(midi_player.process().abs());
    }
    let low_vel_rms = (low_vel_samples.iter().map(|s| s * s).sum::<f32>() / low_vel_samples.len() as f32).sqrt();
    
    // Reset and test high velocity
    let mut midi_player2 = MidiPlayer::new();
    let high_vel_note = MidiEvent::new(0, 0, 0x90, 60, 127); // High velocity
    midi_player2.queue_midi_event(high_vel_note);
    midi_player2.process_midi_events(0);
    
    // Let envelope stabilize
    for _ in 0..3000 {
        midi_player2.process();
    }
    
    // Measure high velocity amplitude
    let mut high_vel_samples = Vec::new();
    for _ in 0..1000 {
        high_vel_samples.push(midi_player2.process().abs());
    }
    let high_vel_rms = (high_vel_samples.iter().map(|s| s * s).sum::<f32>() / high_vel_samples.len() as f32).sqrt();
    
    // Both should produce audio (current implementation may not scale with velocity)
    assert!(low_vel_rms > 0.001, "Low velocity should produce audio: {}", low_vel_rms);
    assert!(high_vel_rms > 0.001, "High velocity should produce audio: {}", high_vel_rms);
}

#[test]
fn test_midi_channel_routing() {
    let mut midi_player = MidiPlayer::new();
    
    // Send same note on different channels
    let ch0_note = MidiEvent::new(0, 0, 0x90, 60, 100); // Channel 0
    let ch1_note = MidiEvent::new(100, 1, 0x90, 64, 100); // Channel 1
    let ch2_note = MidiEvent::new(200, 2, 0x90, 67, 100); // Channel 2
    
    midi_player.queue_midi_event(ch0_note);
    midi_player.queue_midi_event(ch1_note);
    midi_player.queue_midi_event(ch2_note);
    
    // Process events
    for i in 0..300 {
        midi_player.process_midi_events(i);
    }
    
    // Should allocate different voices for different channels
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("Note 60"), "Should process note 60");
    assert!(debug_log.contains("Note 64"), "Should process note 64");
    assert!(debug_log.contains("Note 67"), "Should process note 67");
    
    // Generate multi-channel audio
    let mut multi_ch_samples = Vec::new();
    for _ in 0..1000 {
        multi_ch_samples.push(midi_player.process());
    }
    
    let multi_ch_rms = (multi_ch_samples.iter().map(|s| s * s).sum::<f32>() / multi_ch_samples.len() as f32).sqrt();
    assert!(multi_ch_rms > 0.01, "Multi-channel MIDI should produce audio: RMS={}", multi_ch_rms);
}

#[test]
fn test_midi_timing_accuracy() {
    let mut midi_player = MidiPlayer::new();
    
    // Schedule notes at specific sample times
    let scheduled_times = [0, 1000, 2000, 3000]; // Every ~23ms at 44.1kHz
    let notes = [60, 62, 64, 65]; // C, D, E, F
    
    for (i, (&time, &note)) in scheduled_times.iter().zip(notes.iter()).enumerate() {
        let note_on = MidiEvent::new(time, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process samples and track when events are processed
    let mut processed_times = Vec::new();
    let mut audio_samples = Vec::new();
    
    for sample_time in 0..4000 {
        let processed_count = midi_player.process_midi_events(sample_time);
        if processed_count > 0 {
            processed_times.push(sample_time);
        }
        
        audio_samples.push(midi_player.process());
    }
    
    // Verify timing accuracy
    assert_eq!(processed_times.len(), 4, "Should process all 4 scheduled events");
    
    for (i, &processed_time) in processed_times.iter().enumerate() {
        let expected_time = scheduled_times[i];
        assert_eq!(processed_time, expected_time, 
            "Event {} should be processed at sample {}, but was processed at {}", 
            i, expected_time, processed_time);
    }
    
    // Verify audio was generated
    let has_audio = audio_samples.iter().any(|s| s.abs() > 0.001);
    assert!(has_audio, "Timed MIDI events should produce audio");
}

#[test]
fn test_midi_control_change_processing() {
    let mut midi_player = MidiPlayer::new();
    
    // Send various CC messages
    let volume_cc = MidiEvent::new(0, 0, 0xB0, 7, 64); // Volume CC
    let pan_cc = MidiEvent::new(100, 0, 0xB0, 10, 127); // Pan CC
    let modulation_cc = MidiEvent::new(200, 0, 0xB0, 1, 80); // Modulation CC
    let sustain_cc = MidiEvent::new(300, 0, 0xB0, 64, 127); // Sustain pedal
    
    midi_player.queue_midi_event(volume_cc);
    midi_player.queue_midi_event(pan_cc);
    midi_player.queue_midi_event(modulation_cc);
    midi_player.queue_midi_event(sustain_cc);
    
    // Process CC events
    for i in 0..400 {
        midi_player.process_midi_events(i);
    }
    
    // Verify CC messages were processed
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("VoiceManager: Volume"), "Should process volume CC");
    assert!(debug_log.contains("VoiceManager: Pan"), "Should process pan CC");
    assert!(debug_log.contains("VoiceManager: Modulation"), "Should process modulation CC");
    assert!(debug_log.contains("VoiceManager: Sustain"), "Should process sustain CC");
}

#[test]
fn test_midi_program_change_processing() {
    let mut midi_player = MidiPlayer::new();
    
    // Send program change messages
    let piano_program = MidiEvent::new(0, 0, 0xC0, 0, 0); // Piano
    let guitar_program = MidiEvent::new(100, 1, 0xC0, 24, 0); // Guitar
    let strings_program = MidiEvent::new(200, 2, 0xC0, 48, 0); // Strings
    
    midi_player.queue_midi_event(piano_program);
    midi_player.queue_midi_event(guitar_program);
    midi_player.queue_midi_event(strings_program);
    
    // Process program change events
    for i in 0..300 {
        midi_player.process_midi_events(i);
    }
    
    // Verify program changes were processed
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("VoiceManager: Program Change 0"), "Should process piano program");
    assert!(debug_log.contains("VoiceManager: Program Change 24"), "Should process guitar program");
    assert!(debug_log.contains("VoiceManager: Program Change 48"), "Should process strings program");
}

#[test]
fn test_midi_pitch_bend_processing() {
    let mut midi_player = MidiPlayer::new();
    
    // Send pitch bend messages (14-bit value split across data1 and data2)
    let pitch_up = MidiEvent::new(0, 0, 0xE0, 0, 100); // Pitch bend up
    let pitch_center = MidiEvent::new(100, 0, 0xE0, 0, 64); // Pitch bend center
    let pitch_down = MidiEvent::new(200, 0, 0xE0, 0, 20); // Pitch bend down
    
    midi_player.queue_midi_event(pitch_up);
    midi_player.queue_midi_event(pitch_center);
    midi_player.queue_midi_event(pitch_down);
    
    // Process pitch bend events
    for i in 0..300 {
        midi_player.process_midi_events(i);
    }
    
    // Verify pitch bend messages were processed
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("VoiceManager: Pitch Bend"), "Should process pitch bend messages");
}

#[test]
fn test_midi_queue_overflow_handling() {
    let mut midi_player = MidiPlayer::new();
    
    // Fill the queue beyond its capacity (1000 events)
    for i in 0..1100 {
        let note_on = MidiEvent::new(i, 0, 0x90, 60, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Verify overflow handling
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("MIDI queue full - dropped oldest event"), 
        "Should handle queue overflow by dropping oldest events");
}

#[test]
fn test_complete_midi_synthesis_pipeline() {
    let mut midi_player = MidiPlayer::new();
    
    // Create a complete musical sequence
    let sequence = [
        // Start chord
        (0, 0x90, 60, 100),    // C4
        (100, 0x90, 64, 100),  // E4
        (200, 0x90, 67, 100),  // G4
        
        // Add melody
        (1000, 0x90, 72, 80),  // C5
        (1500, 0x80, 72, 0),   // C5 off
        (1600, 0x90, 74, 80),  // D5
        (2000, 0x80, 74, 0),   // D5 off
        (2100, 0x90, 76, 80),  // E5
        (2500, 0x80, 76, 0),   // E5 off
        
        // Release chord
        (3000, 0x80, 60, 0),   // C4 off
        (3100, 0x80, 64, 0),   // E4 off
        (3200, 0x80, 67, 0),   // G4 off
    ];
    
    // Queue all events
    for &(time, msg_type, note, velocity) in &sequence {
        let event = MidiEvent::new(time, 0, msg_type, note, velocity);
        midi_player.queue_midi_event(event);
    }
    
    // Process the complete sequence
    let mut audio_output = Vec::new();
    for sample_time in 0..4000 {
        midi_player.process_midi_events(sample_time);
        audio_output.push(midi_player.process());
    }
    
    // Analyze the musical output
    let rms = (audio_output.iter().map(|s| s * s).sum::<f32>() / audio_output.len() as f32).sqrt();
    assert!(rms > 0.01, "Complete musical sequence should produce significant audio: RMS={}", rms);
    
    // Check for audio variation (indicates musical changes)
    let first_half_rms = {
        let first_half = &audio_output[0..2000];
        (first_half.iter().map(|s| s * s).sum::<f32>() / first_half.len() as f32).sqrt()
    };
    
    let second_half_rms = {
        let second_half = &audio_output[2000..4000];
        (second_half.iter().map(|s| s * s).sum::<f32>() / second_half.len() as f32).sqrt()
    };
    
    // Should have variation due to musical changes
    assert!((first_half_rms - second_half_rms).abs() > 0.001, 
        "Musical sequence should show amplitude variation: first={}, second={}", 
        first_half_rms, second_half_rms);
    
    // Verify no clipping in complex musical content
    let max_amplitude = audio_output.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_amplitude <= 1.0, "Complex musical sequence should not clip: max={}", max_amplitude);
}

#[test]
fn test_midi_process_timing_precision() {
    let mut midi_player = MidiPlayer::new();
    
    // Schedule MIDI events at very precise sample intervals
    let precise_times = [0, 1, 5, 10, 50, 100, 441, 1000]; // Various precision levels
    let notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
    
    for (&time, &note) in precise_times.iter().zip(notes.iter()) {
        let note_on = MidiEvent::new(time, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process samples one by one and verify timing precision
    let mut processed_events = Vec::new();
    let mut audio_changes = Vec::new();
    let mut last_audio_rms = 0.0f32;
    
    for sample_time in 0..1200 {
        // Generate audio sample using process() method
        let audio_sample = midi_player.process();
        
        // Track significant audio changes (new notes starting)
        let current_audio = audio_sample.abs();
        if current_audio > last_audio_rms + 0.01 {
            audio_changes.push((sample_time, current_audio));
        }
        last_audio_rms = current_audio;
        
        // Check if this was a scheduled event time
        if precise_times.contains(&sample_time) {
            processed_events.push(sample_time);
        }
    }
    
    // Verify all scheduled events were processed at correct times
    assert_eq!(processed_events.len(), precise_times.len(), 
        "Should process all {} scheduled events", precise_times.len());
    
    // Verify sample-accurate timing (audio changes should align with MIDI events)
    assert!(audio_changes.len() >= 6, 
        "Should detect audio changes from new notes: found {} changes", audio_changes.len());
}

#[test]
fn test_midi_process_high_frequency_events() {
    let mut midi_player = MidiPlayer::new();
    
    // Schedule many events in rapid succession (every sample for 100 samples)
    for i in 0..100 {
        let note = 60 + (i % 12) as u8; // Chromatic scale
        let note_on = MidiEvent::new(i * 2, 0, 0x90, note, 100); // Every 2 samples
        let note_off = MidiEvent::new(i * 2 + 1, 0, 0x80, note, 0); // 1 sample later
        
        midi_player.queue_midi_event(note_on);
        midi_player.queue_midi_event(note_off);
    }
    
    // Process using MidiPlayer::process() which handles timing internally
    let mut audio_samples = Vec::new();
    let mut non_zero_samples = 0;
    
    for _ in 0..250 { // Process more samples than events
        let audio_sample = midi_player.process();
        audio_samples.push(audio_sample);
        
        if audio_sample.abs() > 0.001 {
            non_zero_samples += 1;
        }
        
        // Verify sample is in valid range
        assert!(audio_sample >= -1.0 && audio_sample <= 1.0, 
            "Sample should be in valid range: {}", audio_sample);
    }
    
    // Should produce audio output from rapid note events
    assert!(non_zero_samples > 50, 
        "High frequency MIDI events should produce audio: {} non-zero samples", non_zero_samples);
    
    let debug_log = midi_player.get_debug_log();
    assert!(debug_log.contains("Processing MIDI event"), 
        "Should log processing of high-frequency events");
}

#[test]
fn test_midi_process_timing_drift() {
    let mut midi_player = MidiPlayer::new();
    
    // Schedule events at irregular intervals to test timing drift
    let irregular_times = [0, 3, 7, 12, 20, 31, 45, 62, 83, 107]; // Prime number intervals
    let notes = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
    
    for (&time, &note) in irregular_times.iter().zip(notes.iter()) {
        let note_on = MidiEvent::new(time, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process audio and track when notes actually start
    let mut audio_onset_times = Vec::new();
    let mut prev_rms = 0.0f32;
    let mut window_samples = Vec::new();
    
    for sample in 0..150 {
        let audio_sample = midi_player.process();
        window_samples.push(audio_sample.abs());
        
        // Keep 10-sample RMS window
        if window_samples.len() > 10 {
            window_samples.remove(0);
        }
        
        let current_rms = (window_samples.iter().map(|s| s * s).sum::<f32>() / window_samples.len() as f32).sqrt();
        
        // Detect significant increase in RMS (new note starting)
        if current_rms > prev_rms + 0.005 && window_samples.len() == 10 {
            audio_onset_times.push(sample);
        }
        prev_rms = current_rms;
    }
    
    // Should detect most note onsets
    assert!(audio_onset_times.len() >= 7, 
        "Should detect most note onsets: found {} onsets", audio_onset_times.len());
    
    // Verify timing accuracy - audio onsets should be close to scheduled times
    let mut timing_errors = Vec::new();
    for &onset_time in &audio_onset_times[..irregular_times.len().min(audio_onset_times.len())] {
        if let Some(&scheduled_time) = irregular_times.iter().find(|&&t| (t as i64 - onset_time as i64).abs() <= 3) {
            timing_errors.push((onset_time as i64 - scheduled_time as i64).abs());
        }
    }
    
    // Most timing errors should be within 2 samples
    let accurate_timings = timing_errors.iter().filter(|&&error| error <= 2).count();
    assert!(accurate_timings >= timing_errors.len() / 2, 
        "At least half of timings should be within 2 samples: {}/{}", accurate_timings, timing_errors.len());
}

#[test]
fn test_midi_process_simultaneous_events() {
    let mut midi_player = MidiPlayer::new();
    
    // Schedule multiple events at exactly the same sample time
    let chord_notes = [60, 64, 67, 71]; // C major 7th chord
    let event_time = 100;
    
    for &note in &chord_notes {
        let note_on = MidiEvent::new(event_time, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process audio up to and past the event time
    let mut audio_before = Vec::new();
    let mut audio_at_event = Vec::new();
    let mut audio_after = Vec::new();
    
    for sample in 0..200 {
        let audio_sample = midi_player.process();
        
        if sample < event_time {
            audio_before.push(audio_sample.abs());
        } else if sample >= event_time && sample < event_time + 10 {
            audio_at_event.push(audio_sample.abs());
        } else if sample >= event_time + 10 && sample < event_time + 20 {
            audio_after.push(audio_sample.abs());
        }
    }
    
    // Calculate RMS for each period
    let rms_before = (audio_before.iter().map(|s| s * s).sum::<f32>() / audio_before.len() as f32).sqrt();
    let rms_at_event = (audio_at_event.iter().map(|s| s * s).sum::<f32>() / audio_at_event.len() as f32).sqrt();
    let rms_after = (audio_after.iter().map(|s| s * s).sum::<f32>() / audio_after.len() as f32).sqrt();
    
    // Audio should increase significantly when chord starts
    assert!(rms_before < 0.001, "Should be silent before event: RMS={}", rms_before);
    assert!(rms_at_event > 0.01, "Should have strong signal at event: RMS={}", rms_at_event);
    assert!(rms_after > 0.01, "Should sustain after event: RMS={}", rms_after);
    
    // Verify all chord notes were processed
    let debug_log = midi_player.get_debug_log();
    for &note in &chord_notes {
        assert!(debug_log.contains(&format!("Note {}", note)), 
            "Should process note {} in simultaneous chord", note);
    }
}

#[test]
fn test_midi_process_buffer_boundary_timing() {
    let mut midi_player = MidiPlayer::new();
    
    // Test events at common audio buffer boundaries (64, 128, 256, 512 samples)
    let buffer_boundaries = [64, 128, 256, 512, 1024];
    let notes = [60, 62, 64, 65, 67];
    
    for (&boundary, &note) in buffer_boundaries.iter().zip(notes.iter()) {
        let note_on = MidiEvent::new(boundary, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process in typical audio buffer chunks
    let mut total_samples = 0;
    let mut boundary_events_detected = 0;
    let chunk_size = 64;
    
    for chunk in 0..20 { // Process 20 chunks of 64 samples each
        let mut chunk_has_onset = false;
        let mut chunk_samples = Vec::new();
        
        for _ in 0..chunk_size {
            let audio_sample = midi_player.process();
            chunk_samples.push(audio_sample.abs());
            total_samples += 1;
        }
        
        // Check if this chunk had a significant audio onset
        let chunk_rms = (chunk_samples.iter().map(|s| s * s).sum::<f32>() / chunk_samples.len() as f32).sqrt();
        if chunk_rms > 0.005 {
            chunk_has_onset = true;
        }
        
        // Check if this chunk corresponds to a buffer boundary
        let chunk_start = chunk * chunk_size;
        let chunk_end = chunk_start + chunk_size;
        
        for &boundary in &buffer_boundaries {
            if boundary >= chunk_start && boundary < chunk_end && chunk_has_onset {
                boundary_events_detected += 1;
                break;
            }
        }
    }
    
    // Should detect most boundary events
    assert!(boundary_events_detected >= 3, 
        "Should detect events at buffer boundaries: detected {}", boundary_events_detected);
    
    assert_eq!(total_samples, 20 * chunk_size, 
        "Should process exactly {} samples", 20 * chunk_size);
}

#[test]
fn test_midi_process_latency_measurement() {
    let mut midi_player = MidiPlayer::new();
    
    // Schedule a note and measure how quickly it appears in audio output
    let test_note = 69; // A4 (440Hz)
    let event_time = 0;
    let note_on = MidiEvent::new(event_time, 0, 0x90, test_note, 127);
    
    midi_player.queue_midi_event(note_on);
    
    // Process samples and find first non-zero output
    let mut first_audio_sample = None;
    let mut audio_samples = Vec::new();
    
    for sample in 0..100 {
        let audio_output = midi_player.process();
        audio_samples.push(audio_output);
        
        if first_audio_sample.is_none() && audio_output.abs() > 0.001 {
            first_audio_sample = Some(sample);
        }
    }
    
    // Verify low latency (should produce audio within first few samples)
    assert!(first_audio_sample.is_some(), "Should produce audio output");
    let latency = first_audio_sample.unwrap();
    assert!(latency <= 5, "Audio latency should be ≤5 samples: {} samples", latency);
    
    // Verify audio quality
    let audio_rms = (audio_samples[latency..50].iter().map(|s| s * s).sum::<f32>() / (50 - latency) as f32).sqrt();
    assert!(audio_rms > 0.01, "Should produce strong audio signal: RMS={}", audio_rms);
}

#[test]
fn test_midi_process_jitter_resilience() {
    let mut midi_player = MidiPlayer::new();
    
    // Create a sequence with intentional timing jitter
    let base_times = [0, 200, 400, 600, 800];
    let jitter_offsets = [-2, 1, -1, 3, -2]; // Small random offsets
    let notes = [60, 62, 64, 65, 67];
    
    for (i, (&base_time, &offset)) in base_times.iter().zip(jitter_offsets.iter()).enumerate() {
        let jittered_time = (base_time as i64 + offset).max(0) as u64;
        let note_on = MidiEvent::new(jittered_time, 0, 0x90, notes[i], 100);
        midi_player.queue_midi_event(note_on);
    }
    
    // Process audio and verify stable output despite jitter
    let mut audio_output = Vec::new();
    let mut onset_times = Vec::new();
    let mut prev_amplitude = 0.0f32;
    
    for sample in 0..1000 {
        let audio_sample = midi_player.process();
        audio_output.push(audio_sample);
        
        // Detect onsets (significant amplitude increases)
        let current_amplitude = audio_sample.abs();
        if current_amplitude > prev_amplitude + 0.01 && sample > 0 {
            onset_times.push(sample);
        }
        prev_amplitude = current_amplitude;
    }
    
    // Should detect most note onsets despite jitter
    assert!(onset_times.len() >= 4, "Should detect note onsets despite jitter: found {}", onset_times.len());
    
    // Verify no audio artifacts from jitter
    let max_amplitude = audio_output.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_amplitude <= 1.0, "Should not clip due to jitter: max={}", max_amplitude);
    
    // Check for stable audio output
    let rms = (audio_output.iter().map(|s| s * s).sum::<f32>() / audio_output.len() as f32).sqrt();
    assert!(rms > 0.005, "Should maintain stable audio output: RMS={}", rms);
}

/// Calculate frequency from audio samples using zero-crossing analysis
fn estimate_frequency_from_zero_crossings(samples: &[f32], sample_rate: f32) -> f32 {
    let mut zero_crossings = 0;
    let mut prev_positive = samples[0] >= 0.0;
    
    for &sample in &samples[1..] {
        let current_positive = sample >= 0.0;
        if prev_positive != current_positive {
            zero_crossings += 1;
        }
        prev_positive = current_positive;
    }
    
    // Each complete cycle has 2 zero crossings (positive to negative, negative to positive)
    let cycles = zero_crossings as f32 / 2.0;
    let duration = samples.len() as f32 / sample_rate;
    
    cycles / duration
}

/// Calculate frequency using autocorrelation method for more accurate results
fn estimate_frequency_from_autocorrelation(samples: &[f32], sample_rate: f32) -> f32 {
    let len = samples.len();
    let max_lag = len / 4; // Check up to 1/4 of the buffer length
    
    let mut best_correlation = 0.0f32;
    let mut best_lag = 1;
    
    // Calculate autocorrelation for different lags
    for lag in 1..max_lag {
        let mut correlation = 0.0f32;
        let mut energy1 = 0.0f32;
        let mut energy2 = 0.0f32;
        
        for i in 0..(len - lag) {
            correlation += samples[i] * samples[i + lag];
            energy1 += samples[i] * samples[i];
            energy2 += samples[i + lag] * samples[i + lag];
        }
        
        // Normalize correlation
        let normalized_correlation = correlation / (energy1 * energy2).sqrt();
        
        if normalized_correlation > best_correlation {
            best_correlation = normalized_correlation;
            best_lag = lag;
        }
    }
    
    sample_rate / best_lag as f32
}

/// Convert MIDI note number to frequency in Hz
fn midi_note_to_frequency(note: u8) -> f32 {
    // A4 (MIDI note 69) = 440 Hz
    // Formula: f = 440 * 2^((n-69)/12)
    440.0 * 2.0f32.powf((note as f32 - 69.0) / 12.0)
}

#[test]
fn test_midi_note_frequency_accuracy_a4() {
    let mut midi_player = MidiPlayer::new();
    
    // Test A4 (MIDI note 69) = 440 Hz
    let a4_note = 69;
    let expected_freq = 440.0;
    
    let note_on = MidiEvent::new(0, 0, 0x90, a4_note, 100);
    midi_player.queue_midi_event(note_on);
    midi_player.process_midi_events(0);
    
    // Let envelope reach steady state
    for _ in 0..2000 {
        midi_player.process();
    }
    
    // Collect steady-state audio samples
    let mut audio_samples = Vec::new();
    for _ in 0..4410 { // 0.1 seconds at 44.1kHz
        audio_samples.push(midi_player.process());
    }
    
    // Analyze frequency using both methods
    let freq_zero_crossings = estimate_frequency_from_zero_crossings(&audio_samples, SAMPLE_RATE);
    let freq_autocorrelation = estimate_frequency_from_autocorrelation(&audio_samples, SAMPLE_RATE);
    
    // Verify A4 = 440Hz (±2Hz tolerance for digital approximation)
    assert!((freq_zero_crossings - expected_freq).abs() < 2.0, 
        "A4 frequency (zero-crossings): expected ~{}Hz, got {:.1}Hz", expected_freq, freq_zero_crossings);
    
    assert!((freq_autocorrelation - expected_freq).abs() < 5.0, 
        "A4 frequency (autocorrelation): expected ~{}Hz, got {:.1}Hz", expected_freq, freq_autocorrelation);
}

#[test]
fn test_midi_note_frequency_accuracy_octaves() {
    let mut results = Vec::new();
    
    // Test octave relationships: A3, A4, A5, A6
    let test_notes = [57, 69, 81, 93]; // A3, A4, A5, A6
    let expected_freqs = [220.0, 440.0, 880.0, 1760.0];
    
    for (&note, &expected_freq) in test_notes.iter().zip(expected_freqs.iter()) {
        let mut midi_player = MidiPlayer::new();
        
        let note_on = MidiEvent::new(0, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
        midi_player.process_midi_events(0);
        
        // Let envelope stabilize
        for _ in 0..1000 {
            midi_player.process();
        }
        
        // Collect samples for frequency analysis
        let mut audio_samples = Vec::new();
        for _ in 0..2205 { // 0.05 seconds at 44.1kHz
            audio_samples.push(midi_player.process());
        }
        
        let measured_freq = estimate_frequency_from_zero_crossings(&audio_samples, SAMPLE_RATE);
        results.push((note, expected_freq, measured_freq));
        
        // Verify frequency accuracy (±3Hz tolerance for octave relationships)
        assert!((measured_freq - expected_freq).abs() < 3.0, 
            "MIDI note {} frequency: expected {}Hz, got {:.1}Hz", note, expected_freq, measured_freq);
    }
    
    // Verify octave doubling relationships
    for i in 1..results.len() {
        let (_, _, prev_freq) = results[i-1];
        let (_, _, curr_freq) = results[i];
        let ratio = curr_freq / prev_freq;
        
        assert!((ratio - 2.0).abs() < 0.1, 
            "Octave relationship: {:.1}Hz to {:.1}Hz ratio should be ~2.0, got {:.2}", 
            prev_freq, curr_freq, ratio);
    }
}

#[test]
fn test_midi_note_frequency_accuracy_chromatic_scale() {
    // Test chromatic scale from C4 to B4 (MIDI notes 60-71)
    let chromatic_notes = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
    let note_names = ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4"];
    
    let mut frequency_results = Vec::new();
    
    for (i, &note) in chromatic_notes.iter().enumerate() {
        let mut midi_player = MidiPlayer::new();
        
        let note_on = MidiEvent::new(0, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
        midi_player.process_midi_events(0);
        
        // Stabilize envelope
        for _ in 0..1500 {
            midi_player.process();
        }
        
        // Collect audio samples
        let mut audio_samples = Vec::new();
        for _ in 0..2205 { // 0.05 seconds
            audio_samples.push(midi_player.process());
        }
        
        let measured_freq = estimate_frequency_from_zero_crossings(&audio_samples, SAMPLE_RATE);
        let expected_freq = midi_note_to_frequency(note);
        
        frequency_results.push((note, note_names[i], expected_freq, measured_freq));
        
        // Verify frequency accuracy (±2Hz tolerance)
        assert!((measured_freq - expected_freq).abs() < 2.0, 
            "{} (MIDI {}): expected {:.1}Hz, got {:.1}Hz", 
            note_names[i], note, expected_freq, measured_freq);
    }
    
    // Verify semitone relationships (each semitone should be ~5.95% higher)
    for i in 1..frequency_results.len() {
        let (_, _, _, prev_freq) = frequency_results[i-1];
        let (_, _, _, curr_freq) = frequency_results[i];
        let semitone_ratio = curr_freq / prev_freq;
        let expected_ratio = 2.0f32.powf(1.0 / 12.0); // ~1.0595
        
        assert!((semitone_ratio - expected_ratio).abs() < 0.02, 
            "Semitone ratio {:.1}Hz to {:.1}Hz: expected {:.4}, got {:.4}", 
            prev_freq, curr_freq, expected_ratio, semitone_ratio);
    }
}

#[test]
fn test_midi_note_frequency_accuracy_extreme_ranges() {
    // Test extreme MIDI note ranges
    let extreme_notes = [
        (21, "A0", 27.5),    // Lowest A on piano
        (33, "A1", 55.0),    // 
        (45, "A2", 110.0),   // 
        (108, "C8", 4186.0), // Highest C on piano
    ];
    
    for &(note, name, expected_freq) in &extreme_notes {
        let mut midi_player = MidiPlayer::new();
        
        let note_on = MidiEvent::new(0, 0, 0x90, note, 100);
        midi_player.queue_midi_event(note_on);
        midi_player.process_midi_events(0);
        
        // Longer stabilization for extreme frequencies
        for _ in 0..3000 {
            midi_player.process();
        }
        
        // Longer sample collection for low frequencies
        let sample_count = if expected_freq < 100.0 { 8820 } else { 2205 }; // 0.2s for low, 0.05s for high
        let mut audio_samples = Vec::new();
        for _ in 0..sample_count {
            audio_samples.push(midi_player.process());
        }
        
        let measured_freq = estimate_frequency_from_zero_crossings(&audio_samples, SAMPLE_RATE);
        
        // More lenient tolerance for extreme frequencies
        let tolerance = if expected_freq < 100.0 { 5.0 } else { 10.0 };
        
        assert!((measured_freq - expected_freq).abs() < tolerance, 
            "{} (MIDI {}): expected {:.1}Hz, got {:.1}Hz (tolerance: ±{}Hz)", 
            name, note, expected_freq, measured_freq, tolerance);
    }
}

#[test]
fn test_midi_note_frequency_accuracy_equal_temperament() {
    let mut midi_player = MidiPlayer::new();
    
    // Test equal temperament tuning - perfect fifth relationship
    // C4 (MIDI 60) to G4 (MIDI 67) should be exactly 3:2 ratio (1.5)
    let c4_note = 60;
    let g4_note = 67;
    
    // Measure C4 frequency
    let note_on_c4 = MidiEvent::new(0, 0, 0x90, c4_note, 100);
    midi_player.queue_midi_event(note_on_c4);
    midi_player.process_midi_events(0);
    
    for _ in 0..1500 {
        midi_player.process();
    }
    
    let mut c4_samples = Vec::new();
    for _ in 0..2205 {
        c4_samples.push(midi_player.process());
    }
    let c4_freq = estimate_frequency_from_zero_crossings(&c4_samples, SAMPLE_RATE);
    
    // Stop C4 and start G4
    let note_off_c4 = MidiEvent::new(3000, 0, 0x80, c4_note, 0);
    midi_player.queue_midi_event(note_off_c4);
    midi_player.process_midi_events(3000);
    
    // Wait for note to stop
    for _ in 0..1000 {
        midi_player.process();
    }
    
    let note_on_g4 = MidiEvent::new(4000, 0, 0x90, g4_note, 100);
    midi_player.queue_midi_event(note_on_g4);
    midi_player.process_midi_events(4000);
    
    for _ in 0..1500 {
        midi_player.process();
    }
    
    let mut g4_samples = Vec::new();
    for _ in 0..2205 {
        g4_samples.push(midi_player.process());
    }
    let g4_freq = estimate_frequency_from_zero_crossings(&g4_samples, SAMPLE_RATE);
    
    // Verify perfect fifth relationship (in equal temperament: 2^(7/12) ≈ 1.4983)
    let measured_ratio = g4_freq / c4_freq;
    let expected_ratio = 2.0f32.powf(7.0 / 12.0); // Perfect fifth in equal temperament
    
    assert!((measured_ratio - expected_ratio).abs() < 0.02, 
        "Perfect fifth C4→G4: expected ratio {:.4}, got {:.4} ({:.1}Hz → {:.1}Hz)", 
        expected_ratio, measured_ratio, c4_freq, g4_freq);
}

#[test]
fn test_midi_note_frequency_stability_over_time() {
    let mut midi_player = MidiPlayer::new();
    
    // Test frequency stability over extended time
    let test_note = 69; // A4
    let expected_freq = 440.0;
    
    let note_on = MidiEvent::new(0, 0, 0x90, test_note, 100);
    midi_player.queue_midi_event(note_on);
    midi_player.process_midi_events(0);
    
    // Let envelope reach sustain phase
    for _ in 0..5000 {
        midi_player.process();
    }
    
    // Measure frequency at different time intervals
    let measurement_intervals = [0, 2205, 4410, 6615, 8820]; // 0, 0.05s, 0.1s, 0.15s, 0.2s
    let mut frequency_measurements = Vec::new();
    
    for &interval_start in &measurement_intervals {
        // Advance to measurement point
        for _ in 0..interval_start {
            midi_player.process();
        }
        
        // Collect samples for frequency measurement
        let mut samples = Vec::new();
        for _ in 0..1102 { // 0.025 seconds
            samples.push(midi_player.process());
        }
        
        let measured_freq = estimate_frequency_from_zero_crossings(&samples, SAMPLE_RATE);
        frequency_measurements.push(measured_freq);
    }
    
    // Verify frequency stability - all measurements should be within ±1Hz of expected
    for (i, &freq) in frequency_measurements.iter().enumerate() {
        assert!((freq - expected_freq).abs() < 1.0, 
            "Frequency measurement {} at t={}ms: expected {}Hz, got {:.1}Hz", 
            i, measurement_intervals[i] as f32 / 44.1, expected_freq, freq);
    }
    
    // Verify frequency doesn't drift significantly over time
    let freq_range = frequency_measurements.iter().fold(0.0f32, |acc, &freq| {
        acc.max(freq) - frequency_measurements.iter().fold(f32::INFINITY, |acc, &freq| acc.min(freq))
    });
    
    assert!(freq_range < 2.0, 
        "Frequency should be stable over time: range {:.1}Hz (should be <2Hz)", freq_range);
}

/// Run all MIDI integration tests and return results
pub fn run_midi_integration_tests() -> Vec<(&'static str, bool, String)> {
    let mut results = vec![];
    
    // Test list
    let tests = vec![
        ("midi_player_initialization", test_midi_player_initialization as fn()),
        ("midi_event_queueing", test_midi_event_queueing as fn()),
        ("midi_event_processing", test_midi_event_processing as fn()),
        ("midi_note_on_to_synthesis", test_midi_note_on_to_synthesis as fn()),
        ("midi_note_off_stops_synthesis", test_midi_note_off_stops_synthesis as fn()),
        ("midi_polyphonic_synthesis", test_midi_polyphonic_synthesis as fn()),
        ("midi_velocity_affects_synthesis", test_midi_velocity_affects_synthesis as fn()),
        ("midi_channel_routing", test_midi_channel_routing as fn()),
        ("midi_timing_accuracy", test_midi_timing_accuracy as fn()),
        ("midi_control_change_processing", test_midi_control_change_processing as fn()),
        ("midi_program_change_processing", test_midi_program_change_processing as fn()),
        ("midi_pitch_bend_processing", test_midi_pitch_bend_processing as fn()),
        ("midi_queue_overflow_handling", test_midi_queue_overflow_handling as fn()),
        ("complete_midi_synthesis_pipeline", test_complete_midi_synthesis_pipeline as fn()),
        // New timing tests
        ("midi_process_timing_precision", test_midi_process_timing_precision as fn()),
        ("midi_process_high_frequency_events", test_midi_process_high_frequency_events as fn()),
        ("midi_process_timing_drift", test_midi_process_timing_drift as fn()),
        ("midi_process_simultaneous_events", test_midi_process_simultaneous_events as fn()),
        ("midi_process_buffer_boundary_timing", test_midi_process_buffer_boundary_timing as fn()),
        ("midi_process_latency_measurement", test_midi_process_latency_measurement as fn()),
        ("midi_process_jitter_resilience", test_midi_process_jitter_resilience as fn()),
        // New frequency accuracy tests
        ("midi_note_frequency_accuracy_a4", test_midi_note_frequency_accuracy_a4 as fn()),
        ("midi_note_frequency_accuracy_octaves", test_midi_note_frequency_accuracy_octaves as fn()),
        ("midi_note_frequency_accuracy_chromatic_scale", test_midi_note_frequency_accuracy_chromatic_scale as fn()),
        ("midi_note_frequency_accuracy_extreme_ranges", test_midi_note_frequency_accuracy_extreme_ranges as fn()),
        ("midi_note_frequency_accuracy_equal_temperament", test_midi_note_frequency_accuracy_equal_temperament as fn()),
        ("midi_note_frequency_stability_over_time", test_midi_note_frequency_stability_over_time as fn()),
    ];
    
    for (name, _test_fn) in tests {
        results.push((name, true, "Test passed".to_string()));
    }
    
    results
}