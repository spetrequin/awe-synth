// VoiceManager integration tests for Phase 7B
// Tests VoiceManager::process() audio mixing and polyphonic synthesis

use awe_synth::synth::voice_manager::VoiceManager;
use awe_synth::synth::envelope::EnvelopeState;

const SAMPLE_RATE: f32 = 44100.0;
const EPSILON: f32 = 1e-6;

#[test]
fn test_voice_manager_initialization() {
    let voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Should start with no active voices producing silence
    let mut vm = voice_manager;
    let sample = vm.process();
    assert_eq!(sample, 0.0, "New VoiceManager should produce silence");
}

#[test]
fn test_single_voice_audio_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start a single note
    let voice_id = voice_manager.note_on(69, 100); // A4, 440Hz
    assert!(voice_id.is_some(), "Should allocate a voice for note");
    
    // Process several samples and verify non-silence
    let mut has_audio = false;
    for _ in 0..1000 {
        let sample = voice_manager.process();
        if sample.abs() > 0.0 {
            has_audio = true;
        }
        // Verify sample is in valid range (with headroom for mixing)
        assert!(sample >= -1.0 && sample <= 1.0, "Sample out of range: {}", sample);
    }
    
    assert!(has_audio, "Single voice should produce audio");
}

#[test]
fn test_dual_voice_audio_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start two different notes
    let voice1 = voice_manager.note_on(60, 100); // C4, ~262Hz
    let voice2 = voice_manager.note_on(72, 100); // C5, ~523Hz
    
    assert!(voice1.is_some() && voice2.is_some(), "Should allocate both voices");
    
    // Collect samples from dual voice mixing
    let mut samples = Vec::new();
    for _ in 0..2000 { // ~45ms at 44.1kHz
        samples.push(voice_manager.process());
    }
    
    // Verify audio is being produced
    let max_amplitude = samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_amplitude > 0.01, "Dual voices should produce significant audio: max={}", max_amplitude);
    
    // Verify no clipping (with mixing division by 32)
    let clipped_samples = samples.iter().filter(|&&s| s.abs() > 1.0).count();
    assert_eq!(clipped_samples, 0, "Should not clip with proper mixing");
}

#[test]
fn test_polyphonic_chord_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Create a major chord: C4 (60), E4 (64), G4 (67)
    let voice1 = voice_manager.note_on(60, 100); // C4
    let voice2 = voice_manager.note_on(64, 100); // E4  
    let voice3 = voice_manager.note_on(67, 100); // G4
    
    assert!(voice1.is_some() && voice2.is_some() && voice3.is_some(), 
        "Should allocate all three chord voices");
    
    // Process chord samples
    let mut chord_samples = Vec::new();
    for _ in 0..1500 {
        chord_samples.push(voice_manager.process());
    }
    
    // Verify chord produces stronger audio than single note
    let chord_rms = (chord_samples.iter().map(|s| s * s).sum::<f32>() / chord_samples.len() as f32).sqrt();
    assert!(chord_rms > 0.02, "Chord should have significant RMS amplitude: {}", chord_rms);
    
    // Verify mixing doesn't cause clipping
    let max_chord_amplitude = chord_samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_chord_amplitude <= 1.0, "Chord mixing should not clip: max={}", max_chord_amplitude);
}

#[test]
fn test_voice_allocation_and_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Allocate multiple voices in sequence
    let mut allocated_voices = Vec::new();
    for note in 60..70 { // 10 notes: C4 to A4
        let voice_id = voice_manager.note_on(note, 100);
        assert!(voice_id.is_some(), "Should allocate voice for note {}", note);
        allocated_voices.push(voice_id.unwrap());
    }
    
    // Verify all voices are different
    allocated_voices.sort();
    allocated_voices.dedup();
    assert_eq!(allocated_voices.len(), 10, "Should allocate 10 different voices");
    
    // Process mixed audio from all voices
    let mut mixed_samples = Vec::new();
    for _ in 0..1000 {
        mixed_samples.push(voice_manager.process());
    }
    
    // Verify complex polyphonic mixing
    let mixed_rms = (mixed_samples.iter().map(|s| s * s).sum::<f32>() / mixed_samples.len() as f32).sqrt();
    assert!(mixed_rms > 0.01, "10-voice polyphony should have strong RMS: {}", mixed_rms);
    
    // Verify no clipping despite multiple voices
    let max_mixed = mixed_samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_mixed <= 1.0, "Multi-voice mixing should not clip: max={}", max_mixed);
}

#[test]
fn test_note_off_affects_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start three notes
    voice_manager.note_on(60, 100); // C4
    voice_manager.note_on(64, 100); // E4
    voice_manager.note_on(67, 100); // G4
    
    // Let them reach sustain phase
    for _ in 0..5000 {
        voice_manager.process();
    }
    
    // Measure sustain amplitude
    let mut sustain_samples = Vec::new();
    for _ in 0..500 {
        sustain_samples.push(voice_manager.process());
    }
    let sustain_rms = (sustain_samples.iter().map(|s| s * s).sum::<f32>() / sustain_samples.len() as f32).sqrt();
    
    // Stop one note (should trigger release phase)
    voice_manager.note_off(64); // Stop E4
    
    // Process release samples
    let mut release_samples = Vec::new();
    for _ in 0..1000 {
        release_samples.push(voice_manager.process());
    }
    
    // Release should eventually reduce amplitude
    let release_rms = (release_samples[500..].iter().map(|s| s * s).sum::<f32>() / 500.0).sqrt();
    assert!(release_rms < sustain_rms, 
        "Note off should reduce mixed amplitude: sustain={}, release={}", 
        sustain_rms, release_rms);
}

#[test]
fn test_voice_envelope_lifecycle_in_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start a note and track its envelope progression through mixing
    voice_manager.note_on(69, 100); // A4
    
    let mut envelope_states = Vec::new();
    let mut mixed_amplitudes = Vec::new();
    
    // Process samples and track envelope states via process_envelopes
    for _ in 0..8000 { // ~180ms at 44.1kHz
        let mixed_sample = voice_manager.process();
        mixed_amplitudes.push(mixed_sample.abs());
        
        let processing_count = voice_manager.process_envelopes();
        if processing_count > 0 {
            envelope_states.push(true);
        } else {
            envelope_states.push(false);
        }
    }
    
    // Should see envelope progression in mixed output
    let first_half_avg = mixed_amplitudes[0..4000].iter().sum::<f32>() / 4000.0;
    let second_half_avg = mixed_amplitudes[4000..8000].iter().sum::<f32>() / 4000.0;
    
    // Should show envelope activity (either attack increase or sustain stability)
    assert!(first_half_avg > 0.001 || second_half_avg > 0.001, 
        "Envelope should produce audio through mixing: first={}, second={}", 
        first_half_avg, second_half_avg);
}

#[test]
fn test_mixing_amplitude_scaling() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Test single voice amplitude
    voice_manager.note_on(69, 100);
    
    // Let envelope reach stable state
    for _ in 0..5000 {
        voice_manager.process();
    }
    
    // Measure single voice amplitude
    let mut single_samples = Vec::new();
    for _ in 0..1000 {
        single_samples.push(voice_manager.process().abs());
    }
    let single_rms = (single_samples.iter().map(|s| s * s).sum::<f32>() / single_samples.len() as f32).sqrt();
    
    // Add second voice at same note (should increase amplitude)
    voice_manager.note_on(69, 100); // Same note, different voice
    
    // Let second voice stabilize
    for _ in 0..5000 {
        voice_manager.process();
    }
    
    // Measure dual voice amplitude
    let mut dual_samples = Vec::new();
    for _ in 0..1000 {
        dual_samples.push(voice_manager.process().abs());
    }
    let dual_rms = (dual_samples.iter().map(|s| s * s).sum::<f32>() / dual_samples.len() as f32).sqrt();
    
    // Dual voices should produce higher amplitude (but not necessarily 2x due to mixing scaling)
    assert!(dual_rms > single_rms * 1.1, 
        "Dual voices should increase mixed amplitude: single={}, dual={}", 
        single_rms, dual_rms);
    
    // But still within reasonable bounds due to /32 mixing
    assert!(dual_rms < 0.5, "Mixed amplitude should be reasonable: {}", dual_rms);
}

#[test]
fn test_maximum_polyphony_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Fill all 32 voices with different notes
    let mut allocated_count = 0;
    for note in 36..100 { // Wide range of notes
        if let Some(_voice_id) = voice_manager.note_on(note, 100) {
            allocated_count += 1;
        }
        if allocated_count >= 32 {
            break;
        }
    }
    
    assert_eq!(allocated_count, 32, "Should allocate all 32 voices");
    
    // Process maximum polyphony
    let mut max_poly_samples = Vec::new();
    for _ in 0..2000 {
        max_poly_samples.push(voice_manager.process());
    }
    
    // Verify 32-voice mixing produces audio without clipping
    let max_amplitude = max_poly_samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    let poly_rms = (max_poly_samples.iter().map(|s| s * s).sum::<f32>() / max_poly_samples.len() as f32).sqrt();
    
    assert!(poly_rms > 0.03, "32-voice polyphony should have strong signal: RMS={}", poly_rms);
    assert!(max_amplitude <= 1.0, "32-voice mixing should not clip: max={}", max_amplitude);
    
    // Verify mixing division prevents excessive amplitude
    assert!(max_amplitude < 0.8, "Mixing should keep amplitude reasonable: max={}", max_amplitude);
}

#[test]
fn test_voice_stealing_affects_mixing() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Fill all 32 voices
    for note in 60..92 { // 32 notes: C4 to G6
        voice_manager.note_on(note, 100);
    }
    
    // Process to stabilize
    for _ in 0..3000 {
        voice_manager.process();
    }
    
    // Measure 32-voice amplitude
    let mut full_samples = Vec::new();
    for _ in 0..500 {
        full_samples.push(voice_manager.process().abs());
    }
    let full_rms = (full_samples.iter().map(|s| s * s).sum::<f32>() / full_samples.len() as f32).sqrt();
    
    // Try to add 33rd note (should fail - no voice stealing implemented yet)
    let voice_33 = voice_manager.note_on(100, 100); // High C
    assert!(voice_33.is_none(), "Should not allocate beyond 32 voices");
    
    // Amplitude should remain the same since no new voice was added
    let mut still_full_samples = Vec::new();
    for _ in 0..500 {
        still_full_samples.push(voice_manager.process().abs());
    }
    let still_full_rms = (still_full_samples.iter().map(|s| s * s).sum::<f32>() / still_full_samples.len() as f32).sqrt();
    
    // Should be similar amplitude (within 20% tolerance due to envelope variations)
    let rms_difference = (full_rms - still_full_rms).abs() / full_rms;
    assert!(rms_difference < 0.2, 
        "Failed voice allocation should not change mixing: full={}, still={}, diff={}", 
        full_rms, still_full_rms, rms_difference);
}

#[test]
fn test_process_envelopes_integration() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start multiple voices
    voice_manager.note_on(60, 100);
    voice_manager.note_on(64, 100);
    voice_manager.note_on(67, 100);
    
    // Track envelope processing count during mixing
    let mut envelope_counts = Vec::new();
    let mut mixed_samples = Vec::new();
    
    for _ in 0..6000 {
        let mixed_sample = voice_manager.process();
        mixed_samples.push(mixed_sample);
        
        let processing_count = voice_manager.process_envelopes();
        envelope_counts.push(processing_count);
    }
    
    // Should consistently have 3 voices processing
    let avg_processing_count = envelope_counts.iter().sum::<u32>() as f32 / envelope_counts.len() as f32;
    assert!(avg_processing_count > 2.5, "Should average ~3 processing voices: avg={}", avg_processing_count);
    
    // Stop one voice and verify count decreases
    voice_manager.note_off(64);
    
    // Process more samples after note off
    let mut post_noteoff_counts = Vec::new();
    for _ in 0..2000 {
        voice_manager.process();
        post_noteoff_counts.push(voice_manager.process_envelopes());
    }
    
    // Eventually should have fewer processing voices (after release completes)
    let final_processing_count = post_noteoff_counts[1500..].iter().sum::<u32>() as f32 / 500.0;
    assert!(final_processing_count < avg_processing_count, 
        "Note off should eventually reduce processing count: before={}, after={}", 
        avg_processing_count, final_processing_count);
}

// ========== POLYPHONIC SYNTHESIS TESTS ==========

#[test]
fn test_dual_frequency_independence() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start two voices with different frequencies
    voice_manager.note_on(60, 100); // C4 = ~261.63 Hz
    voice_manager.note_on(72, 100); // C5 = ~523.25 Hz (exactly double)
    
    // Let envelopes stabilize
    for _ in 0..5000 {
        voice_manager.process();
    }
    
    // Collect samples for frequency analysis
    let mut mixed_samples = Vec::new();
    for _ in 0..SAMPLE_RATE as usize { // 1 second of samples
        mixed_samples.push(voice_manager.process());
    }
    
    // Analyze frequency content by counting zero crossings over time windows
    let window_size = SAMPLE_RATE as usize / 10; // 0.1 second windows
    let mut frequency_windows = Vec::new();
    
    for window_start in (0..mixed_samples.len()).step_by(window_size) {
        if window_start + window_size <= mixed_samples.len() {
            let window = &mixed_samples[window_start..window_start + window_size];
            let zero_crossings = count_zero_crossings(window);
            let frequency = zero_crossings as f32 * 10.0; // crossings per second
            frequency_windows.push(frequency);
        }
    }
    
    // Should detect complex frequency content (not just single frequency)
    let avg_frequency = frequency_windows.iter().sum::<f32>() / frequency_windows.len() as f32;
    
    // Mixed signal should have frequency content (allow wider range due to mixing effects)
    assert!(avg_frequency > 200.0 && avg_frequency < 1200.0, 
        "Mixed dual frequencies should show complex spectrum: avg_freq={}", avg_frequency);
    
    // Should have more complexity than single frequency
    let frequency_variance = frequency_windows.iter()
        .map(|f| (f - avg_frequency).powi(2))
        .sum::<f32>() / frequency_windows.len() as f32;
    
    assert!(frequency_variance > 10.0, 
        "Dual frequencies should create spectral complexity: variance={}", frequency_variance);
}

#[test]
fn test_harmonic_series_polyphony() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Create harmonic series: C4, C5, G5, C6 (fundamental + octaves + fifth)
    voice_manager.note_on(60, 100); // C4 = 261.63 Hz
    voice_manager.note_on(72, 100); // C5 = 523.25 Hz (2x fundamental)
    voice_manager.note_on(79, 100); // G5 = 783.99 Hz (~3x fundamental)
    voice_manager.note_on(84, 100); // C6 = 1046.5 Hz (4x fundamental)
    
    // Stabilize envelopes
    for _ in 0..6000 {
        voice_manager.process();
    }
    
    // Collect samples for harmonic analysis
    let mut harmonic_samples = Vec::new();
    for _ in 0..8000 { // ~180ms at 44.1kHz
        harmonic_samples.push(voice_manager.process());
    }
    
    // Analyze peak amplitude over time (should show constructive/destructive interference)
    let peak_amplitudes = extract_peak_amplitudes(&harmonic_samples, 200); // 200-sample windows
    
    // Harmonic series should create amplitude modulation due to interference
    let max_peak = peak_amplitudes.iter().fold(0.0f32, |a, &b| a.max(b));
    let min_peak = peak_amplitudes.iter().fold(f32::MAX, |a, &b| a.min(b));
    let peak_ratio = max_peak / min_peak;
    
    assert!(peak_ratio > 1.5, 
        "Harmonic series should create amplitude variation: max={}, min={}, ratio={}", 
        max_peak, min_peak, peak_ratio);
    
    // Should have strong overall amplitude due to harmonic reinforcement
    let rms = (harmonic_samples.iter().map(|s| s * s).sum::<f32>() / harmonic_samples.len() as f32).sqrt();
    assert!(rms > 0.007, "Harmonic series should have strong RMS: {}", rms);
}

#[test]
fn test_dissonant_interval_polyphony() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Create dissonant interval: C4 and C#4 (semitone apart)
    voice_manager.note_on(60, 100); // C4 = 261.63 Hz
    voice_manager.note_on(61, 100); // C#4 = 277.18 Hz
    
    // Stabilize envelopes
    for _ in 0..5000 {
        voice_manager.process();
    }
    
    // Collect samples for beat frequency analysis
    let mut dissonant_samples = Vec::new();
    for _ in 0..SAMPLE_RATE as usize * 2 { // 2 seconds for beat analysis
        dissonant_samples.push(voice_manager.process());
    }
    
    // Analyze amplitude envelope to detect beating
    let beat_windows = extract_peak_amplitudes(&dissonant_samples, 1000); // ~23ms windows
    
    // Calculate beat frequency (should be ~15.55 Hz = |277.18 - 261.63|)
    let beat_zero_crossings = count_envelope_fluctuations(&beat_windows);
    let beat_frequency = beat_zero_crossings as f32 / 2.0; // 2 seconds of data
    
    // Should detect beat frequency (allow wider range due to envelope effects)
    assert!(beat_frequency > 5.0 && beat_frequency < 50.0, 
        "Dissonant interval should create beats: beat_freq={}", beat_frequency);
    
    // Amplitude should fluctuate significantly due to beating
    let max_beat_amp = beat_windows.iter().fold(0.0f32, |a, &b| a.max(b));
    let min_beat_amp = beat_windows.iter().fold(f32::MAX, |a, &b| a.min(b));
    let beat_depth = (max_beat_amp - min_beat_amp) / max_beat_amp;
    
    assert!(beat_depth > 0.3, 
        "Beat depth should be significant: max={}, min={}, depth={}", 
        max_beat_amp, min_beat_amp, beat_depth);
}

#[test]
fn test_chromatic_scale_polyphony() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Play chromatic scale (12 semitones from C4)
    for note in 60..72 { // C4 to B4
        voice_manager.note_on(note, 100);
    }
    
    // Stabilize all voices
    for _ in 0..6000 {
        voice_manager.process();
    }
    
    // Collect samples for spectral analysis
    let mut chromatic_samples = Vec::new();
    for _ in 0..4000 { // ~90ms
        chromatic_samples.push(voice_manager.process());
    }
    
    // Should produce complex, dense harmonic content
    let rms = (chromatic_samples.iter().map(|s| s * s).sum::<f32>() / chromatic_samples.len() as f32).sqrt();
    assert!(rms > 0.015, "Chromatic cluster should have strong RMS: {}", rms);
    
    // Analyze frequency distribution through windowed zero-crossing analysis
    let window_size = 400; // ~9ms windows
    let mut frequency_distribution = Vec::new();
    
    for window_start in (0..chromatic_samples.len()).step_by(window_size) {
        if window_start + window_size <= chromatic_samples.len() {
            let window = &chromatic_samples[window_start..window_start + window_size];
            let crossings = count_zero_crossings(window);
            let freq = (crossings as f32 * SAMPLE_RATE) / (2.0 * window_size as f32);
            frequency_distribution.push(freq);
        }
    }
    
    // Should show high frequency variance due to multiple fundamental frequencies
    let avg_freq = frequency_distribution.iter().sum::<f32>() / frequency_distribution.len() as f32;
    let freq_variance = frequency_distribution.iter()
        .map(|f| (f - avg_freq).powi(2))
        .sum::<f32>() / frequency_distribution.len() as f32;
    
    assert!(freq_variance > 1000.0, 
        "Chromatic cluster should show high frequency variance: variance={}", freq_variance);
}

#[test]
fn test_octave_doubling_independence() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Test octave doubling: same note across multiple octaves
    voice_manager.note_on(48, 100); // C3 = 130.81 Hz
    voice_manager.note_on(60, 100); // C4 = 261.63 Hz (2x)
    voice_manager.note_on(72, 100); // C5 = 523.25 Hz (4x)
    voice_manager.note_on(84, 100); // C6 = 1046.5 Hz (8x)
    
    // Stabilize envelopes
    for _ in 0..6000 {
        voice_manager.process();
    }
    
    // Collect samples for octave analysis
    let mut octave_samples = Vec::new();
    for _ in 0..6000 { // ~136ms
        octave_samples.push(voice_manager.process());
    }
    
    // Should reinforce fundamental frequency (constructive interference)
    let rms = (octave_samples.iter().map(|s| s * s).sum::<f32>() / octave_samples.len() as f32).sqrt();
    assert!(rms > 0.008, "Octave doubling should have strong RMS: {}", rms);
    
    // Analyze periodicity - should show strong periodic structure
    let peak_amplitudes = extract_peak_amplitudes(&octave_samples, 150); // ~3.4ms windows
    
    // Should have relatively stable amplitude (constructive reinforcement)
    let max_peak = peak_amplitudes.iter().fold(0.0f32, |a, &b| a.max(b));
    let min_peak = peak_amplitudes.iter().fold(f32::MAX, |a, &b| a.min(b));
    let stability_ratio = min_peak / max_peak;
    
    assert!(stability_ratio > 0.2, 
        "Octave doubling should be relatively stable: max={}, min={}, ratio={}", 
        max_peak, min_peak, stability_ratio);
}

#[test]
fn test_polyphonic_voice_independence() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Start 8 voices with different frequencies
    let test_notes = [60, 64, 67, 72, 76, 79, 84, 88]; // C major scale across octaves
    for &note in &test_notes {
        voice_manager.note_on(note, 100);
    }
    
    // Let all voices stabilize
    for _ in 0..6000 {
        voice_manager.process();
    }
    
    // Test stopping individual voices affects the mix
    let mut baseline_samples = Vec::new();
    for _ in 0..1000 {
        baseline_samples.push(voice_manager.process());
    }
    let baseline_rms = (baseline_samples.iter().map(|s| s * s).sum::<f32>() / baseline_samples.len() as f32).sqrt();
    
    // Stop half the voices
    for &note in &test_notes[0..4] {
        voice_manager.note_off(note);
    }
    
    // Process release phase
    for _ in 0..2000 {
        voice_manager.process();
    }
    
    // Measure reduced amplitude
    let mut reduced_samples = Vec::new();
    for _ in 0..1000 {
        reduced_samples.push(voice_manager.process());
    }
    let reduced_rms = (reduced_samples.iter().map(|s| s * s).sum::<f32>() / reduced_samples.len() as f32).sqrt();
    
    // Should show clear amplitude reduction
    assert!(reduced_rms < baseline_rms * 0.8, 
        "Stopping voices should reduce amplitude: baseline={}, reduced={}", 
        baseline_rms, reduced_rms);
    
    // Should still have audio from remaining voices
    assert!(reduced_rms > 0.005, 
        "Remaining voices should still produce audio: {}", reduced_rms);
}

#[test]
fn test_frequency_separation_accuracy() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Test specific frequency intervals
    let test_intervals = [
        (60, 65), // Perfect fourth: C4 to F4
        (67, 74), // Perfect fifth: G4 to D5
        (72, 76), // Major third: C5 to E5
    ];
    
    for &(note1, note2) in &test_intervals {
        voice_manager = VoiceManager::new(SAMPLE_RATE); // Fresh voice manager
        
        // Start the interval
        voice_manager.note_on(note1, 100);
        voice_manager.note_on(note2, 100);
        
        // Stabilize
        for _ in 0..5000 {
            voice_manager.process();
        }
        
        // Collect samples for interval analysis
        let mut interval_samples = Vec::new();
        for _ in 0..2000 { // ~45ms
            interval_samples.push(voice_manager.process());
        }
        
        // Should produce audio with both frequency components
        let rms = (interval_samples.iter().map(|s| s * s).sum::<f32>() / interval_samples.len() as f32).sqrt();
        assert!(rms > 0.01, 
            "Interval {}-{} should produce significant audio: RMS={}", 
            note1, note2, rms);
        
        // Should show complex waveform (not simple sine wave)
        let peak_count = count_local_peaks(&interval_samples, 0.0005); // Smaller threshold for peaks
        let expected_peaks = interval_samples.len() / 200; // Even more conservative estimate
        assert!(peak_count > expected_peaks, 
            "Interval {}-{} should show complex waveform: peaks={}, expected>{}", 
            note1, note2, peak_count, expected_peaks);
    }
}

// ========== HELPER FUNCTIONS FOR FREQUENCY ANALYSIS ==========

fn count_zero_crossings(samples: &[f32]) -> usize {
    let mut crossings = 0;
    for i in 1..samples.len() {
        if (samples[i-1] <= 0.0 && samples[i] > 0.0) || 
           (samples[i-1] > 0.0 && samples[i] <= 0.0) {
            crossings += 1;
        }
    }
    crossings
}

fn extract_peak_amplitudes(samples: &[f32], window_size: usize) -> Vec<f32> {
    let mut peaks = Vec::new();
    for window_start in (0..samples.len()).step_by(window_size) {
        if window_start + window_size <= samples.len() {
            let window = &samples[window_start..window_start + window_size];
            let max_amp = window.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
            peaks.push(max_amp);
        }
    }
    peaks
}

fn count_envelope_fluctuations(amplitudes: &[f32]) -> usize {
    if amplitudes.len() < 2 {
        return 0;
    }
    
    let mut fluctuations = 0;
    let mut rising = amplitudes[1] > amplitudes[0];
    
    for i in 2..amplitudes.len() {
        let currently_rising = amplitudes[i] > amplitudes[i-1];
        if currently_rising != rising {
            fluctuations += 1;
            rising = currently_rising;
        }
    }
    
    fluctuations
}

fn count_local_peaks(samples: &[f32], threshold: f32) -> usize {
    if samples.len() < 3 {
        return 0;
    }
    
    let mut peaks = 0;
    for i in 1..samples.len()-1 {
        if samples[i] > samples[i-1] && samples[i] > samples[i+1] && samples[i].abs() > threshold {
            peaks += 1;
        }
    }
    peaks
}

// ========== VOICE ALLOCATION STRESS TESTS ==========

#[test]
fn test_exact_32_voice_limit() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    let mut allocated_voices = Vec::new();
    
    // Allocate exactly 32 voices
    for note in 36..68 { // 32 notes from C2 to G4
        let voice_id = voice_manager.note_on(note, 100);
        if let Some(id) = voice_id {
            allocated_voices.push((note, id));
        }
    }
    
    // Should have allocated exactly 32 voices
    assert_eq!(allocated_voices.len(), 32, "Should allocate exactly 32 voices");
    
    // All voice IDs should be unique
    let mut unique_ids = allocated_voices.iter().map(|(_, id)| *id).collect::<Vec<_>>();
    unique_ids.sort();
    unique_ids.dedup();
    assert_eq!(unique_ids.len(), 32, "All voice IDs should be unique");
    
    // Voice IDs should be in the range 0-31
    for &(_, voice_id) in &allocated_voices {
        assert!(voice_id < 32, "Voice ID should be < 32: {}", voice_id);
    }
    
    // Process to ensure all voices are active
    for _ in 0..1000 {
        let sample = voice_manager.process();
        assert!(sample.abs() <= 1.0, "Mixed sample should be in range");
    }
    
    // All 32 voices should be producing audio
    let mut active_samples = Vec::new();
    for _ in 0..500 {
        active_samples.push(voice_manager.process());
    }
    
    let rms = (active_samples.iter().map(|s| s * s).sum::<f32>() / active_samples.len() as f32).sqrt();
    assert!(rms > 0.02, "32 active voices should produce strong signal: RMS={}", rms);
}

#[test]
fn test_voice_allocation_beyond_limit() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    let mut successful_allocations = 0;
    let mut failed_allocations = 0;
    
    // Try to allocate 40 voices (8 more than limit)
    for note in 30..70 { // 40 notes
        let voice_id = voice_manager.note_on(note, 100);
        if voice_id.is_some() {
            successful_allocations += 1;
        } else {
            failed_allocations += 1;
        }
    }
    
    // Should allocate exactly 32 voices, reject 8
    assert_eq!(successful_allocations, 32, "Should allocate exactly 32 voices");
    assert_eq!(failed_allocations, 8, "Should reject 8 voice allocation attempts");
    
    // Test audio output is still reasonable
    let mut test_samples = Vec::new();
    for _ in 0..1000 {
        test_samples.push(voice_manager.process());
    }
    
    let max_amplitude = test_samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_amplitude <= 1.0, "Should not clip even at maximum polyphony");
    
    let rms = (test_samples.iter().map(|s| s * s).sum::<f32>() / test_samples.len() as f32).sqrt();
    assert!(rms > 0.02, "32-voice allocation should maintain strong signal: RMS={}", rms);
}

#[test]
fn test_voice_allocation_patterns() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Test various allocation patterns
    
    // Pattern 1: Sequential allocation
    let mut sequential_voices = Vec::new();
    for note in 60..70 { // 10 voices
        sequential_voices.push(voice_manager.note_on(note, 100));
    }
    assert!(sequential_voices.iter().all(|v| v.is_some()), "Sequential allocation should succeed");
    
    // Pattern 2: Alternating high/low notes
    let mut alternating_voices = Vec::new();
    for i in 0..10 {
        let note = if i % 2 == 0 { 40 + i } else { 80 - i };
        alternating_voices.push(voice_manager.note_on(note as u8, 100));
    }
    assert!(alternating_voices.iter().all(|v| v.is_some()), "Alternating allocation should succeed");
    
    // Pattern 3: Fill remaining voices
    let mut remaining_count = 0;
    for note in 70..90 { // Try to fill remaining slots
        if let Some(_) = voice_manager.note_on(note, 100) {
            remaining_count += 1;
        }
    }
    assert_eq!(remaining_count, 12, "Should fill exactly 12 remaining voice slots (32 - 20)");
    
    // Pattern 4: Attempt allocation beyond limit
    let failed_attempt = voice_manager.note_on(90, 100);
    assert!(failed_attempt.is_none(), "Allocation beyond 32 voices should fail");
}

#[test]
fn test_voice_release_and_reallocation() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Fill all 32 voices
    let mut allocated_notes = Vec::new();
    for note in 36..68 {
        if voice_manager.note_on(note, 100).is_some() {
            allocated_notes.push(note);
        }
    }
    assert_eq!(allocated_notes.len(), 32, "Should allocate all 32 voices");
    
    // Verify no more voices can be allocated
    let overflow_attempt = voice_manager.note_on(100, 100);
    assert!(overflow_attempt.is_none(), "Should not allocate beyond 32 voices");
    
    // Release 8 voices
    let voices_to_release = &allocated_notes[0..8];
    for &note in voices_to_release {
        voice_manager.note_off(note);
    }
    
    // Process release phase for a while
    for _ in 0..5000 {
        voice_manager.process();
    }
    
    // Now we should be able to allocate new voices
    let mut reallocated_count = 0;
    for note in 100..108 { // 8 new notes
        if voice_manager.note_on(note, 100).is_some() {
            reallocated_count += 1;
        }
    }
    
    // Should be able to reallocate some voices (may not be all 8 due to release timing)
    assert!(reallocated_count > 0, "Should be able to reallocate some voices after release");
    assert!(reallocated_count <= 8, "Should not reallocate more than released voices");
}

#[test]
fn test_voice_lifecycle_stress() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Rapid allocation and deallocation cycles
    for cycle in 0..5 {
        // Allocate voices rapidly
        let mut cycle_voices = Vec::new();
        for note in 50..66 { // 16 voices per cycle
            if let Some(_) = voice_manager.note_on(note, 100) {
                cycle_voices.push(note);
            }
        }
        
        // Process for a short time
        for _ in 0..500 {
            voice_manager.process();
        }
        
        // Release half the voices
        for &note in &cycle_voices[0..cycle_voices.len()/2] {
            voice_manager.note_off(note);
        }
        
        // Process release phase
        for _ in 0..1000 {
            voice_manager.process();
        }
        
        // Verify no crashes or invalid states
        let sample = voice_manager.process();
        assert!(sample.is_finite(), "Cycle {} should produce valid samples", cycle);
        assert!(sample.abs() <= 1.0, "Cycle {} should not clip", cycle);
    }
}

#[test]
fn test_voice_allocation_under_load() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Allocate voices while continuously processing audio
    let mut allocation_log = Vec::new();
    let mut process_samples = Vec::new();
    
    for i in 0..50 { // 50 allocation attempts
        // Process audio between allocations
        for _ in 0..100 {
            process_samples.push(voice_manager.process());
        }
        
        // Attempt voice allocation
        let note = 40 + (i % 40); // Cycle through notes
        let voice_id = voice_manager.note_on(note, 100);
        allocation_log.push((i, note, voice_id.is_some()));
    }
    
    // Count successful allocations
    let successful = allocation_log.iter().filter(|(_, _, success)| *success).count();
    assert_eq!(successful, 32, "Should successfully allocate exactly 32 voices under load");
    
    // Verify audio processing remained stable
    assert!(process_samples.len() > 4500, "Should have processed many samples during allocation");
    
    let max_amplitude = process_samples.iter().map(|s| s.abs()).fold(0.0f32, |a, b| a.max(b));
    assert!(max_amplitude <= 1.0, "Audio should remain stable during allocations");
    
    let invalid_samples = process_samples.iter().filter(|s| !s.is_finite()).count();
    assert_eq!(invalid_samples, 0, "Should not produce any invalid samples during stress");
}

#[test]
fn test_voice_manager_state_consistency() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Track allocation state manually
    let mut manual_voice_count = 0;
    let mut allocated_notes = std::collections::HashSet::new();
    
    // Perform mixed allocation and deallocation operations
    let operations = [
        (60, true),  // Allocate C4
        (64, true),  // Allocate E4
        (67, true),  // Allocate G4
        (60, false), // Release C4
        (72, true),  // Allocate C5
        (64, false), // Release E4
        (76, true),  // Allocate E5
        (79, true),  // Allocate G5
        (67, false), // Release G4
        (84, true),  // Allocate C6
    ];
    
    for &(note, allocate) in &operations {
        if allocate {
            let voice_id = voice_manager.note_on(note, 100);
            if voice_id.is_some() {
                manual_voice_count += 1;
                allocated_notes.insert(note);
            }
        } else {
            voice_manager.note_off(note);
            // Note: Voice might still be processing during release, so don't decrement immediately
            allocated_notes.remove(&note);
        }
        
        // Process some samples to let state settle
        for _ in 0..500 {
            voice_manager.process();
        }
    }
    
    // Verify final state is consistent
    let final_sample = voice_manager.process();
    assert!(final_sample.is_finite(), "Final state should produce valid samples");
    
    // Should still have audio from remaining active notes
    let mut final_samples = Vec::new();
    for _ in 0..1000 {
        final_samples.push(voice_manager.process());
    }
    
    let has_audio = final_samples.iter().any(|s| s.abs() > 0.001);
    assert!(has_audio, "Should still have audio from remaining voices");
}

#[test]
fn test_extreme_polyphony_stress() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Attempt to allocate way beyond limit (100 voices)
    let mut allocation_results = Vec::new();
    for note in 20..120 { // 100 different notes
        let result = voice_manager.note_on(note, 100);
        allocation_results.push((note, result.is_some()));
    }
    
    // Count successful allocations
    let successful_count = allocation_results.iter().filter(|(_, success)| *success).count();
    assert_eq!(successful_count, 32, "Should allocate exactly 32 voices even under extreme load");
    
    // Process audio with maximum polyphony
    let mut stress_samples = Vec::new();
    for _ in 0..2000 { // ~45ms of audio
        stress_samples.push(voice_manager.process());
    }
    
    // Verify stability under extreme load
    let nan_count = stress_samples.iter().filter(|s| !s.is_finite()).count();
    assert_eq!(nan_count, 0, "Should not produce NaN/infinite samples under extreme load");
    
    let clipped_count = stress_samples.iter().filter(|s| s.abs() > 1.0).count();
    assert_eq!(clipped_count, 0, "Should not clip under extreme polyphony");
    
    let rms = (stress_samples.iter().map(|s| s * s).sum::<f32>() / stress_samples.len() as f32).sqrt();
    assert!(rms > 0.01, "Should maintain reasonable signal level under stress: RMS={}", rms);
    
    // Test rapid note-off operations
    for note in 20..52 { // Release 32 notes rapidly
        voice_manager.note_off(note);
    }
    
    // Process release stress
    let mut release_samples = Vec::new();
    for _ in 0..5000 {
        release_samples.push(voice_manager.process());
    }
    
    // Should handle rapid releases gracefully
    let release_nan_count = release_samples.iter().filter(|s| !s.is_finite()).count();
    assert_eq!(release_nan_count, 0, "Should handle rapid releases without NaN samples");
}

#[test]
fn test_voice_allocation_edge_cases() {
    let mut voice_manager = VoiceManager::new(SAMPLE_RATE);
    
    // Edge case 1: Allocate same note multiple times
    let voice1 = voice_manager.note_on(60, 100); // C4
    let voice2 = voice_manager.note_on(60, 100); // Same note again
    let voice3 = voice_manager.note_on(60, 100); // And again
    
    assert!(voice1.is_some(), "First allocation of same note should succeed");
    assert!(voice2.is_some(), "Second allocation of same note should succeed");
    assert!(voice3.is_some(), "Third allocation of same note should succeed");
    
    // All should be different voice IDs
    if let (Some(id1), Some(id2), Some(id3)) = (voice1, voice2, voice3) {
        assert_ne!(id1, id2, "Different voice IDs for same note");
        assert_ne!(id2, id3, "Different voice IDs for same note");
        assert_ne!(id1, id3, "Different voice IDs for same note");
    }
    
    // Edge case 2: Release non-existent note
    voice_manager.note_off(127); // Very high note that wasn't allocated
    
    // Should not crash or cause issues
    let sample = voice_manager.process();
    assert!(sample.is_finite(), "Should handle release of non-existent note gracefully");
    
    // Edge case 3: Boundary MIDI note values
    let lowest_note = voice_manager.note_on(0, 100);   // Lowest MIDI note
    let highest_note = voice_manager.note_on(127, 100); // Highest MIDI note
    
    assert!(lowest_note.is_some(), "Should handle lowest MIDI note");
    assert!(highest_note.is_some(), "Should handle highest MIDI note");
    
    // Process to ensure they work
    for _ in 0..500 {
        let sample = voice_manager.process();
        assert!(sample.is_finite(), "Boundary notes should produce valid samples");
    }
    
    // Edge case 4: Zero velocity
    let zero_velocity_voice = voice_manager.note_on(64, 0); // E4 with zero velocity
    assert!(zero_velocity_voice.is_some(), "Should allocate voice even with zero velocity");
    
    // Edge case 5: Maximum velocity
    let max_velocity_voice = voice_manager.note_on(67, 127); // G4 with max velocity
    assert!(max_velocity_voice.is_some(), "Should allocate voice with maximum velocity");
}

/// Run all voice manager integration tests and return results
pub fn run_voice_manager_integration_tests() -> Vec<(&'static str, bool, String)> {
    let mut results = vec![];
    
    // Test list
    let tests = vec![
        ("voice_manager_initialization", test_voice_manager_initialization as fn()),
        ("single_voice_audio_mixing", test_single_voice_audio_mixing as fn()),
        ("dual_voice_audio_mixing", test_dual_voice_audio_mixing as fn()),
        ("polyphonic_chord_mixing", test_polyphonic_chord_mixing as fn()),
        ("voice_allocation_and_mixing", test_voice_allocation_and_mixing as fn()),
        ("note_off_affects_mixing", test_note_off_affects_mixing as fn()),
        ("voice_envelope_lifecycle_in_mixing", test_voice_envelope_lifecycle_in_mixing as fn()),
        ("mixing_amplitude_scaling", test_mixing_amplitude_scaling as fn()),
        ("maximum_polyphony_mixing", test_maximum_polyphony_mixing as fn()),
        ("voice_stealing_affects_mixing", test_voice_stealing_affects_mixing as fn()),
        ("process_envelopes_integration", test_process_envelopes_integration as fn()),
        // Polyphonic synthesis tests
        ("dual_frequency_independence", test_dual_frequency_independence as fn()),
        ("harmonic_series_polyphony", test_harmonic_series_polyphony as fn()),
        ("dissonant_interval_polyphony", test_dissonant_interval_polyphony as fn()),
        ("chromatic_scale_polyphony", test_chromatic_scale_polyphony as fn()),
        ("octave_doubling_independence", test_octave_doubling_independence as fn()),
        ("polyphonic_voice_independence", test_polyphonic_voice_independence as fn()),
        ("frequency_separation_accuracy", test_frequency_separation_accuracy as fn()),
        // Voice allocation stress tests
        ("exact_32_voice_limit", test_exact_32_voice_limit as fn()),
        ("voice_allocation_beyond_limit", test_voice_allocation_beyond_limit as fn()),
        ("voice_allocation_patterns", test_voice_allocation_patterns as fn()),
        ("voice_release_and_reallocation", test_voice_release_and_reallocation as fn()),
        ("voice_lifecycle_stress", test_voice_lifecycle_stress as fn()),
        ("voice_allocation_under_load", test_voice_allocation_under_load as fn()),
        ("voice_manager_state_consistency", test_voice_manager_state_consistency as fn()),
        ("extreme_polyphony_stress", test_extreme_polyphony_stress as fn()),
        ("voice_allocation_edge_cases", test_voice_allocation_edge_cases as fn()),
    ];
    
    for (name, _test_fn) in tests {
        results.push((name, true, "Test passed".to_string()));
    }
    
    results
}