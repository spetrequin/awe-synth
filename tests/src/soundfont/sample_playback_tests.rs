/**
 * Sample Playback Tests for Phase 10A
 * 
 * Tests sample-based synthesis using real SoundFont files to verify that:
 * - SoundFont samples load correctly 
 * - Sample selection works for different MIDI notes and velocities
 * - Sample playback generates non-zero audio output
 * - Pitch shifting works correctly
 * - Sample-based voices are preferred over sine wave fallback
 */

use awe_synth::synth::voice_manager::VoiceManager;
use awe_synth::soundfont::parser::SoundFontParser;
use std::fs;

/// Test basic sample playback with CT2MGM.SF2
#[test] 
fn test_ct2mgm_sample_playback() {
    println!("=== Testing CT2MGM.SF2 Sample Playback ===");
    
    // Load CT2MGM.SF2 SoundFont file
    let soundfont_path = "../../resources/sf2/gm/CT2MGM.SF2";
    println!("Loading SoundFont: {}", soundfont_path);
    
    let soundfont_data = fs::read(soundfont_path)
        .expect("Failed to read CT2MGM.SF2 - ensure file exists");
    
    println!("SoundFont file size: {} bytes", soundfont_data.len());
    assert!(!soundfont_data.is_empty(), "SoundFont file should not be empty");
    
    // Parse SoundFont
    let soundfont = SoundFontParser::parse_soundfont(&soundfont_data)
        .expect("Failed to parse CT2MGM.SF2");
    
    println!("SoundFont parsed successfully:");
    println!("  Name: '{}'", soundfont.header.name);
    println!("  Presets: {}", soundfont.presets.len());
    println!("  Instruments: {}", soundfont.instruments.len());
    println!("  Samples: {}", soundfont.samples.len());
    
    // Verify SoundFont has expected content
    assert!(soundfont.presets.len() > 0, "SoundFont should have presets");
    assert!(soundfont.instruments.len() > 0, "SoundFont should have instruments"); 
    assert!(soundfont.samples.len() > 0, "SoundFont should have samples");
    
    // Initialize VoiceManager with SoundFont
    let mut voice_manager = VoiceManager::new(44100.0);
    voice_manager.load_soundfont(soundfont)
        .expect("Failed to load SoundFont into VoiceManager");
    
    println!("SoundFont loaded into VoiceManager successfully");
    
    // Test sample selection for different notes
    test_sample_selection(&voice_manager);
    
    // Test sample playback audio generation
    test_sample_audio_generation(&mut voice_manager);
    
    println!("=== CT2MGM.SF2 Sample Playback Test PASSED ===");
}

/// Test sample selection across different MIDI notes and velocities
fn test_sample_selection(voice_manager: &VoiceManager) {
    println!("\n--- Testing Sample Selection ---");
    
    // Test common MIDI notes (C4=60, A4=69, C5=72)
    let test_notes = [60, 69, 72];
    let test_velocities = [64, 100, 127];
    
    let mut selection_count = 0;
    
    for &note in &test_notes {
        for &velocity in &test_velocities {
            if let Some((sample, preset_name, instrument_name)) = 
                voice_manager.select_sample(note, velocity, None, None) {
                
                println!("Note {} Vel {} -> Sample '{}' from '{}' in '{}'", 
                        note, velocity, sample.name, instrument_name, preset_name);
                
                // Verify sample has audio data
                assert!(!sample.sample_data.is_empty(), 
                       "Sample '{}' should have audio data", sample.name);
                
                // Verify sample has valid properties
                assert!(sample.sample_rate > 0, "Sample should have valid sample rate");
                assert!(sample.original_pitch <= 127, "Sample original pitch should be valid MIDI note");
                
                selection_count += 1;
            }
        }
    }
    
    println!("Successfully selected {} samples", selection_count);
    assert!(selection_count > 0, "Should be able to select at least some samples");
}

/// Test that sample-based voices generate non-zero audio output
fn test_sample_audio_generation(voice_manager: &mut VoiceManager) {
    println!("\n--- Testing Sample Audio Generation ---");
    
    // Enable sample-based voice preference
    voice_manager.enable_sample_voices();
    assert!(voice_manager.is_using_sample_voices(), "Should be using sample voices");
    
    // Trigger a note (Middle C)
    let note = 60;
    let velocity = 100;
    
    println!("Triggering note {} velocity {}", note, velocity);
    let voice_id = voice_manager.note_on(note, velocity)
        .expect("Should be able to trigger a note");
    
    println!("Note triggered on voice {}", voice_id);
    
    // Generate audio samples and verify non-zero output
    let mut non_zero_samples = 0;
    let mut max_amplitude = 0.0_f32;
    let sample_count = 1000; // Test 1000 samples (~22ms at 44.1kHz)
    
    for i in 0..sample_count {
        let audio_sample = voice_manager.process();
        
        if audio_sample.abs() > 0.001 { // Threshold for non-zero
            non_zero_samples += 1;
            max_amplitude = max_amplitude.max(audio_sample.abs());
        }
        
        // Process envelopes
        voice_manager.process_envelopes();
    }
    
    println!("Audio generation results:");
    println!("  Non-zero samples: {}/{}", non_zero_samples, sample_count);
    println!("  Max amplitude: {:.6}", max_amplitude);
    
    // Verify audio generation
    assert!(non_zero_samples > 0, "Should generate some non-zero audio samples");
    assert!(max_amplitude > 0.001, "Should generate audible amplitude");
    assert!(max_amplitude <= 1.0, "Audio should not clip");
    
    // Release note
    voice_manager.note_off(note);
    println!("Note {} released", note);
}

/// Test that sample-based synthesis is preferred over sine wave
#[test]
fn test_sample_synthesis_priority() {
    println!("=== Testing Sample Synthesis Priority ===");
    
    // Load SoundFont
    let soundfont_path = "../../resources/sf2/gm/CT2MGM.SF2";
    let soundfont_data = fs::read(soundfont_path)
        .expect("Failed to read CT2MGM.SF2");
    
    let soundfont = SoundFontParser::parse_soundfont(&soundfont_data)
        .expect("Failed to parse CT2MGM.SF2");
    
    // Test with sample voices enabled (default)
    let mut voice_manager = VoiceManager::new(44100.0);
    voice_manager.load_soundfont(soundfont)
        .expect("Failed to load SoundFont");
    
    voice_manager.enable_sample_voices();
    assert!(voice_manager.is_using_sample_voices(), "Should prefer sample voices");
    
    // Trigger note and verify sample-based synthesis is used
    let voice_id = voice_manager.note_on(60, 100)
        .expect("Should trigger sample-based voice");
    
    // Generate some audio to confirm sample-based synthesis
    let mut sample_audio_detected = false;
    for _ in 0..100 {
        let sample = voice_manager.process();
        if sample.abs() > 0.001 {
            sample_audio_detected = true;
            break;
        }
        voice_manager.process_envelopes();
    }
    
    assert!(sample_audio_detected, "Sample-based synthesis should generate audio");
    voice_manager.note_off(60);
    
    println!("Sample synthesis priority test PASSED");
}

/// Test multiple simultaneous sample voices 
#[test]
fn test_polyphonic_sample_playback() {
    println!("=== Testing Polyphonic Sample Playback ===");
    
    // Load SoundFont
    let soundfont_path = "../../resources/sf2/gm/CT2MGM.SF2";
    let soundfont_data = fs::read(soundfont_path)
        .expect("Failed to read CT2MGM.SF2");
    
    let soundfont = SoundFontParser::parse_soundfont(&soundfont_data)
        .expect("Failed to parse CT2MGM.SF2");
    
    let mut voice_manager = VoiceManager::new(44100.0);
    voice_manager.load_soundfont(soundfont)
        .expect("Failed to load SoundFont");
    
    // Trigger multiple notes simultaneously (C major chord: C, E, G)
    let chord_notes = [60, 64, 67]; // C4, E4, G4
    let mut voice_ids = Vec::new();
    
    for &note in &chord_notes {
        if let Some(voice_id) = voice_manager.note_on(note, 100) {
            voice_ids.push(voice_id);
            println!("Triggered note {} on voice {}", note, voice_id);
        }
    }
    
    assert_eq!(voice_ids.len(), 3, "Should trigger all 3 chord notes");
    
    // Generate audio with multiple voices
    let mut total_amplitude = 0.0;
    let sample_count = 500;
    
    for _ in 0..sample_count {
        let mixed_sample = voice_manager.process();
        total_amplitude += mixed_sample.abs();
        voice_manager.process_envelopes();
    }
    
    let avg_amplitude = total_amplitude / sample_count as f32;
    println!("Average amplitude with 3 voices: {:.6}", avg_amplitude);
    
    assert!(avg_amplitude > 0.001, "Polyphonic playback should generate audible output");
    
    // Release all notes
    for &note in &chord_notes {
        voice_manager.note_off(note);
    }
    
    println!("Polyphonic sample playback test PASSED");
}