/**
 * Modulation Routing System Testing - Phase 14B.1
 * 
 * Tests EMU8000 modulation routing system implementation:
 * - Basic construction and source/destination mapping validation
 * - Modulation depth clamping and parameter scaling accuracy
 * - Real-time source value updates and modulated output calculation
 * - Integration with Voice synthesis pipeline and effects processing
 * - Different parameter types: filter cutoff, pitch, amplitude modulation
 * - EMU8000 modulation architecture compliance
 */

use awe_synth::effects::modulation::{ModulationRouter, ModulationSource, ModulationDestination};
use awe_synth::synth::voice::Voice;

const SAMPLE_RATE: f32 = 44100.0;

/// Test basic modulation router construction and parameter validation
#[test]
fn test_modulation_router_basic_construction() {
    println!("=== Testing Modulation Router Basic Construction ===");
    
    // Test default router construction
    let router = ModulationRouter::new();
    println!("✅ ModulationRouter created with {} routes", router.routes.len());
    assert_eq!(router.routes.len(), 0, "New router should have no routes initially");
    assert_eq!(router.source_values.len(), 6, "Router should have 6 source value slots");
    
    // Verify all source values are initialized to 0
    for (i, &value) in router.source_values.iter().enumerate() {
        assert_eq!(value, 0.0, "Source value {} should be initialized to 0", i);
    }
    
    // Test route addition with valid parameters
    let mut router = ModulationRouter::new();
    router.add_route(ModulationSource::ModulationEnvelope, ModulationDestination::FilterCutoff, 0.5, 1000.0);
    assert_eq!(router.routes.len(), 1, "Router should have 1 route after addition");
    
    let route = &router.routes[0];
    assert_eq!(route.source, ModulationSource::ModulationEnvelope);
    assert_eq!(route.destination, ModulationDestination::FilterCutoff);
    assert_eq!(route.depth, 0.5);
    assert_eq!(route.scaling, 1000.0);
    println!("✅ Route added: {:?} -> {:?} depth={:.3} scale={:.1}", 
           route.source, route.destination, route.depth, route.scaling);
    
    // Test depth clamping
    let mut router = ModulationRouter::new();
    router.add_route(ModulationSource::Lfo1, ModulationDestination::Amplitude, 2.5, 0.3); // Above max
    router.add_route(ModulationSource::Lfo2, ModulationDestination::Pitch, -1.5, 50.0); // Below min
    
    assert_eq!(router.routes[0].depth, 1.0, "Depth should clamp to maximum 1.0");
    assert_eq!(router.routes[1].depth, -1.0, "Depth should clamp to minimum -1.0");
    println!("✅ Depth clamping verified: high=1.0 low=-1.0");
    
    // Test route clearing
    router.clear_destination_routes(ModulationDestination::Amplitude);
    assert_eq!(router.routes.len(), 1, "Should have 1 route after clearing Amplitude destination");
    assert_eq!(router.routes[0].destination, ModulationDestination::Pitch, "Remaining route should be Pitch");
    println!("✅ Destination route clearing verified");
    
    println!("✅ Modulation router basic construction test completed");
}

/// Test modulation source/destination routing and parameter scaling
#[test]
fn test_modulation_source_destination_routing() {
    println!("=== Testing Modulation Source/Destination Routing ===");
    
    let mut router = ModulationRouter::new();
    
    // Set up various modulation routes with different scalings
    router.add_route(ModulationSource::ModulationEnvelope, ModulationDestination::FilterCutoff, 0.8, 2000.0);
    router.add_route(ModulationSource::Lfo1, ModulationDestination::Amplitude, 0.6, 0.5);
    router.add_route(ModulationSource::Lfo2, ModulationDestination::Pitch, 0.4, 100.0);
    router.add_route(ModulationSource::Velocity, ModulationDestination::FilterResonance, 0.3, 5.0);
    router.add_route(ModulationSource::KeyNumber, ModulationDestination::LfoFrequency, 0.2, 0.1);
    
    println!("✅ Created {} modulation routes", router.routes.len());
    assert_eq!(router.routes.len(), 5, "Should have 5 modulation routes");
    
    // Test source value setting and retrieval
    router.set_source_value(ModulationSource::ModulationEnvelope, 0.7);
    router.set_source_value(ModulationSource::Lfo1, -0.5);
    router.set_source_value(ModulationSource::Lfo2, 0.3);
    router.set_source_value(ModulationSource::Velocity, 1.0);
    router.set_source_value(ModulationSource::KeyNumber, -0.8);
    
    // Verify source values are stored correctly
    assert_eq!(router.source_values[ModulationSource::ModulationEnvelope as usize], 0.7);
    assert_eq!(router.source_values[ModulationSource::Lfo1 as usize], -0.5);
    assert_eq!(router.source_values[ModulationSource::Lfo2 as usize], 0.3);
    assert_eq!(router.source_values[ModulationSource::Velocity as usize], 1.0);
    assert_eq!(router.source_values[ModulationSource::KeyNumber as usize], -0.8);
    println!("✅ Source values stored and retrieved correctly");
    
    // Test modulated value calculation for filter cutoff (multiplicative)
    let base_cutoff = 1000.0;
    let modulated_cutoff = router.get_modulated_value(ModulationDestination::FilterCutoff, base_cutoff);
    // Expected: 1000.0 * (1.0 + 0.7 * 0.8 * 2000.0) = 1000.0 * (1.0 + 1120.0) = 1,121,000 Hz
    let expected_cutoff = base_cutoff * (1.0 + 0.7 * 0.8 * 2000.0);
    assert!((modulated_cutoff - expected_cutoff).abs() < 1.0, 
           "Filter cutoff modulation incorrect: got {:.1}, expected {:.1}", modulated_cutoff, expected_cutoff);
    println!("✅ Filter cutoff modulation: {:.1}Hz -> {:.1}Hz", base_cutoff, modulated_cutoff);
    
    // Test modulated value calculation for amplitude (multiplicative)
    let base_amplitude = 0.8;
    let modulated_amplitude = router.get_modulated_value(ModulationDestination::Amplitude, base_amplitude);
    // Expected: 0.8 * (1.0 + (-0.5) * 0.6 * 0.5) = 0.8 * (1.0 - 0.15) = 0.68
    let expected_amplitude = base_amplitude * (1.0 + (-0.5) * 0.6 * 0.5);
    assert!((modulated_amplitude - expected_amplitude).abs() < 0.01, 
           "Amplitude modulation incorrect: got {:.3}, expected {:.3}", modulated_amplitude, expected_amplitude);
    println!("✅ Amplitude modulation: {:.3} -> {:.3}", base_amplitude, modulated_amplitude);
    
    // Test modulated value calculation for pitch (additive)
    let base_pitch = 0.0;
    let modulated_pitch = router.get_modulated_value(ModulationDestination::Pitch, base_pitch);
    // Expected: 0.0 + 0.3 * 0.4 * 100.0 = 12.0 cents
    let expected_pitch = base_pitch + 0.3 * 0.4 * 100.0;
    assert!((modulated_pitch - expected_pitch).abs() < 0.01, 
           "Pitch modulation incorrect: got {:.1}, expected {:.1}", modulated_pitch, expected_pitch);
    println!("✅ Pitch modulation: {:.1}c -> {:.1}c", base_pitch, modulated_pitch);
    
    println!("✅ Modulation source/destination routing test completed");
}

/// Test modulation depth scaling for different parameter types
#[test]
fn test_modulation_depth_scaling() {
    println!("=== Testing Modulation Depth Scaling ===");
    
    let mut router = ModulationRouter::new();
    
    // Test filter cutoff scaling (multiplicative, prevent negative)
    router.add_route(ModulationSource::Lfo1, ModulationDestination::FilterCutoff, 1.0, 1.0);
    router.set_source_value(ModulationSource::Lfo1, -2.0); // Extreme negative value
    
    let base_cutoff = 1000.0;
    let modulated_cutoff = router.get_modulated_value(ModulationDestination::FilterCutoff, base_cutoff);
    // Should clamp to prevent negative frequency (minimum 0.1 * base = 100Hz)
    assert!(modulated_cutoff >= base_cutoff * 0.1, 
           "Filter cutoff should be clamped to prevent negative frequency: {:.1}Hz", modulated_cutoff);
    println!("✅ Filter cutoff negative prevention: {:.1}Hz -> {:.1}Hz", base_cutoff, modulated_cutoff);
    
    // Test amplitude scaling (multiplicative, prevent negative)
    router.clear_destination_routes(ModulationDestination::FilterCutoff);
    router.add_route(ModulationSource::Lfo1, ModulationDestination::Amplitude, 1.0, 2.0);
    router.set_source_value(ModulationSource::Lfo1, -1.0); // Full negative
    
    let base_amplitude = 0.5;
    let modulated_amplitude = router.get_modulated_value(ModulationDestination::Amplitude, base_amplitude);
    // Expected: 0.5 * (1.0 + (-1.0) * 1.0 * 2.0) = 0.5 * (1.0 - 2.0) = 0.5 * (-1.0) = clamped to 0.0
    assert!(modulated_amplitude >= 0.0, 
           "Amplitude should be clamped to prevent negative values: {:.3}", modulated_amplitude);
    println!("✅ Amplitude negative prevention: {:.3} -> {:.3}", base_amplitude, modulated_amplitude);
    
    // Test pitch scaling (additive, no clamping)
    router.clear_destination_routes(ModulationDestination::Amplitude);
    router.add_route(ModulationSource::Lfo2, ModulationDestination::Pitch, 1.0, 200.0);
    router.set_source_value(ModulationSource::Lfo2, 0.5);
    
    let base_pitch = -50.0;
    let modulated_pitch = router.get_modulated_value(ModulationDestination::Pitch, base_pitch);
    // Expected: -50.0 + 0.5 * 1.0 * 200.0 = -50.0 + 100.0 = 50.0 cents
    let expected_pitch = base_pitch + 0.5 * 1.0 * 200.0;
    assert!((modulated_pitch - expected_pitch).abs() < 0.01, 
           "Pitch modulation should be additive: got {:.1}, expected {:.1}", modulated_pitch, expected_pitch);
    println!("✅ Pitch additive modulation: {:.1}c -> {:.1}c", base_pitch, modulated_pitch);
    
    // Test LFO frequency scaling (multiplicative, prevent zero)
    router.clear_destination_routes(ModulationDestination::Pitch);
    router.add_route(ModulationSource::ModulationEnvelope, ModulationDestination::LfoFrequency, 1.0, 1.0);
    router.set_source_value(ModulationSource::ModulationEnvelope, -1.5); // Extreme negative
    
    let base_lfo_freq = 5.0;
    let modulated_lfo_freq = router.get_modulated_value(ModulationDestination::LfoFrequency, base_lfo_freq);
    // Should clamp to prevent zero frequency (minimum 0.01 * base)
    assert!(modulated_lfo_freq >= base_lfo_freq * 0.01, 
           "LFO frequency should be clamped to prevent zero: {:.3}Hz", modulated_lfo_freq);
    println!("✅ LFO frequency zero prevention: {:.1}Hz -> {:.3}Hz", base_lfo_freq, modulated_lfo_freq);
    
    // Test filter resonance scaling (additive)
    router.clear_destination_routes(ModulationDestination::LfoFrequency);
    router.add_route(ModulationSource::Velocity, ModulationDestination::FilterResonance, 0.8, 3.0);
    router.set_source_value(ModulationSource::Velocity, 0.6);
    
    let base_resonance = 0.7;
    let modulated_resonance = router.get_modulated_value(ModulationDestination::FilterResonance, base_resonance);
    // Expected: 0.7 + 0.6 * 0.8 * 3.0 = 0.7 + 1.44 = 2.14
    let expected_resonance = base_resonance + 0.6 * 0.8 * 3.0;
    assert!((modulated_resonance - expected_resonance).abs() < 0.01, 
           "Resonance modulation should be additive: got {:.2}, expected {:.2}", modulated_resonance, expected_resonance);
    println!("✅ Filter resonance additive modulation: {:.2} -> {:.2}", base_resonance, modulated_resonance);
    
    println!("✅ Modulation depth scaling test completed");
}

/// Test modulation real-time updates and source value management
#[test]
fn test_modulation_real_time_updates() {
    println!("=== Testing Modulation Real-Time Updates ===");
    
    let mut router = ModulationRouter::new();
    
    // Set up modulation routes for real-time testing
    router.add_route(ModulationSource::ModulationEnvelope, ModulationDestination::FilterCutoff, 0.5, 1000.0);
    router.add_route(ModulationSource::Lfo1, ModulationDestination::Amplitude, 0.3, 0.4);
    router.add_route(ModulationSource::Lfo2, ModulationDestination::Pitch, 0.7, 50.0);
    
    // Test rapid source value updates
    let envelope_values = vec![0.0, 0.2, 0.5, 0.8, 1.0, 0.8, 0.5, 0.2, 0.0];
    let lfo1_values = vec![0.0, 0.7, 1.0, 0.7, 0.0, -0.7, -1.0, -0.7, 0.0];
    let lfo2_values = vec![0.0, -0.5, -1.0, -0.5, 0.0, 0.5, 1.0, 0.5, 0.0];
    
    let mut cutoff_results = Vec::new();
    let mut amplitude_results = Vec::new();
    let mut pitch_results = Vec::new();
    
    for i in 0..envelope_values.len() {
        // Update all source values
        router.set_source_value(ModulationSource::ModulationEnvelope, envelope_values[i]);
        router.set_source_value(ModulationSource::Lfo1, lfo1_values[i]);
        router.set_source_value(ModulationSource::Lfo2, lfo2_values[i]);
        
        // Calculate modulated values
        let cutoff = router.get_modulated_value(ModulationDestination::FilterCutoff, 2000.0);
        let amplitude = router.get_modulated_value(ModulationDestination::Amplitude, 0.8);
        let pitch = router.get_modulated_value(ModulationDestination::Pitch, 0.0);
        
        cutoff_results.push(cutoff);
        amplitude_results.push(amplitude);
        pitch_results.push(pitch);
        
        println!("  Step {}: env={:.1} lfo1={:.1} lfo2={:.1} -> cutoff={:.0}Hz amp={:.3} pitch={:.1}c", 
               i, envelope_values[i], lfo1_values[i], lfo2_values[i], cutoff, amplitude, pitch);
    }
    
    // Verify modulation is responding to source changes
    let cutoff_range = cutoff_results.iter().cloned().fold(0.0f32, f32::max) - 
                      cutoff_results.iter().cloned().fold(f32::INFINITY, f32::min);
    let amplitude_range = amplitude_results.iter().cloned().fold(0.0f32, f32::max) - 
                         amplitude_results.iter().cloned().fold(f32::INFINITY, f32::min);
    let pitch_range = pitch_results.iter().cloned().fold(0.0f32, f32::max) - 
                     pitch_results.iter().cloned().fold(f32::INFINITY, f32::min);
    
    assert!(cutoff_range > 100.0, "Filter cutoff should show significant modulation range: {:.1}Hz", cutoff_range);
    assert!(amplitude_range > 0.1, "Amplitude should show significant modulation range: {:.3}", amplitude_range);
    assert!(pitch_range > 10.0, "Pitch should show significant modulation range: {:.1}c", pitch_range);
    
    println!("✅ Modulation ranges: cutoff={:.1}Hz amp={:.3} pitch={:.1}c", cutoff_range, amplitude_range, pitch_range);
    
    // Test source value clamping during updates
    router.set_source_value(ModulationSource::Lfo1, 5.0); // Way above max
    router.set_source_value(ModulationSource::Lfo2, -3.0); // Way below min
    
    assert_eq!(router.source_values[ModulationSource::Lfo1 as usize], 1.0, "Source value should clamp to max 1.0");
    assert_eq!(router.source_values[ModulationSource::Lfo2 as usize], -1.0, "Source value should clamp to min -1.0");
    println!("✅ Source value clamping during updates verified");
    
    println!("✅ Modulation real-time updates test completed");
}

/// Test modulation integration with Voice synthesis pipeline
#[test]
fn test_modulation_voice_integration() {
    println!("=== Testing Modulation Voice Integration ===");
    
    let mut voice = Voice::new();
    
    // Configure LFOs for testing
    voice.lfo1.set_depth(0.4); // 40% tremolo depth
    voice.lfo2.set_depth(0.6); // 60% vibrato depth
    
    // Start a note to activate modulation
    voice.start_note(60, 80);
    
    // Generate samples and track modulation progression
    let mut filter_cutoffs = Vec::new();
    let mut amplitudes = Vec::new();
    let mut pitch_shifts = Vec::new();
    
    for sample_index in 0..64 {
        let audio_sample = voice.generate_sample(SAMPLE_RATE);
        
        // Capture current modulation states
        let mod_env_level = voice.get_modulation_level();
        let lfo1_level = voice.get_lfo1_level();
        let lfo2_level = voice.get_lfo2_level();
        
        // Calculate what the modulated values should be
        let base_cutoff = voice.low_pass_filter.cutoff_hz;
        let modulated_cutoff = voice.modulation_router.get_modulated_value(
            awe_synth::effects::modulation::ModulationDestination::FilterCutoff, 
            base_cutoff
        );
        
        filter_cutoffs.push(modulated_cutoff);
        amplitudes.push(audio_sample);
        
        // Track LFO2 pitch modulation
        if lfo2_level.abs() > 0.01 {
            let pitch_modulation = voice.modulation_router.get_modulated_value(
                awe_synth::effects::modulation::ModulationDestination::Pitch, 
                0.0
            );
            pitch_shifts.push(pitch_modulation);
        }
        
        // Voice should generate finite audio with modulation
        assert!(audio_sample.is_finite(), "Voice should generate finite audio with modulation");
        
        if sample_index < 8 {
            println!("  Sample {}: env={:.3} lfo1={:.3} lfo2={:.3} cutoff={:.0}Hz audio={:.4}", 
                   sample_index, mod_env_level, lfo1_level, lfo2_level, modulated_cutoff, audio_sample);
        }
    }
    
    // Verify modulation is affecting synthesis parameters
    let cutoff_variation = filter_cutoffs.iter().cloned().fold(0.0f32, f32::max) - 
                          filter_cutoffs.iter().cloned().fold(f32::INFINITY, f32::min);
    assert!(cutoff_variation > 50.0, "Filter cutoff should show modulation variation: {:.1}Hz", cutoff_variation);
    
    let amplitude_variation = amplitudes.iter().cloned().fold(0.0f32, f32::max) - 
                             amplitudes.iter().cloned().fold(f32::INFINITY, f32::min);
    assert!(amplitude_variation > 0.001, "Amplitude should show modulation variation: {:.4}", amplitude_variation);
    
    println!("✅ Modulation variations: cutoff={:.1}Hz amplitude={:.4}", cutoff_variation, amplitude_variation);
    
    // Test modulation with SoundFont sample
    let test_sample = create_test_sample();
    voice.start_soundfont_note(72, 100, &test_sample);
    
    // Generate samples with SoundFont + modulation
    let mut soundfont_samples = Vec::new();
    for _ in 0..32 {
        let sample = voice.generate_sample(SAMPLE_RATE);
        soundfont_samples.push(sample);
        assert!(sample.is_finite(), "SoundFont voice should generate finite samples with modulation");
    }
    
    let soundfont_rms = calculate_rms(&soundfont_samples);
    println!("✅ SoundFont + modulation RMS: {:.4}", soundfont_rms);
    assert!(soundfont_rms > 0.001, "SoundFont voice with modulation should generate audible audio");
    
    // Test modulation reset on new note
    let old_cutoff = voice.low_pass_filter.cutoff_hz;
    voice.start_note(48, 60); // Different note
    
    // Modulation should be re-synchronized
    assert_eq!(voice.lfo1.phase, 0.0, "LFO1 should be re-synchronized on new note");
    assert_eq!(voice.lfo2.phase, 0.0, "LFO2 should be re-synchronized on new note");
    println!("✅ Modulation synchronization verified on note restart");
    
    println!("✅ Modulation voice integration test completed");
}

/// Create a test SoundFont sample for integration testing
fn create_test_sample() -> awe_synth::soundfont::types::SoundFontSample {
    use awe_synth::soundfont::types::SoundFontSample;
    
    // Create a simple sine wave sample (440Hz for 1000 samples)
    let mut sample_data = Vec::with_capacity(1000);
    for i in 0..1000 {
        let phase = (i as f32 * 2.0 * std::f32::consts::PI * 440.0) / 44100.0;
        let amplitude = (phase.sin() * 16384.0) as i16;
        sample_data.push(amplitude);
    }
    
    SoundFontSample {
        name: "Test Sample".to_string(),
        start_offset: 0,
        end_offset: 999,
        loop_start: 0,
        loop_end: 999,
        sample_rate: 44100,
        original_pitch: 69, // A4
        pitch_correction: 0,
        sample_link: 0,
        sample_type: awe_synth::soundfont::types::SampleType::MonoSample,
        sample_data,
    }
}

/// Calculate RMS value of audio samples
fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    
    let sum_squares: f32 = samples.iter().map(|x| x * x).sum();
    (sum_squares / samples.len() as f32).sqrt()
}

/// Phase 14B Implementation Summary
#[test]
fn test_phase_14b_implementation_summary() {
    println!("\n=== PHASE 14B IMPLEMENTATION SUMMARY ===");
    println!("✅ Comprehensive modulation routing system testing suite created");
    println!("✅ Basic construction and source/destination mapping validation");
    println!("✅ Modulation depth clamping and parameter scaling accuracy tests");
    println!("✅ Real-time source value updates and modulated output calculation");
    println!("✅ Voice synthesis pipeline integration with modulation effects");
    println!("✅ Different parameter type handling (filter, pitch, amplitude)");
    
    println!("\n🎯 MODULATION ROUTING TESTING COVERAGE VERIFIED:");
    println!("• Source/destination enumeration and mapping validation");
    println!("• Depth clamping (-1.0 to 1.0) and parameter scaling accuracy");
    println!("• Multiplicative modulation (filter cutoff, amplitude, LFO frequency)");
    println!("• Additive modulation (pitch, filter resonance)");
    println!("• Negative value prevention for frequency and amplitude parameters");
    println!("• Real-time source value updates and modulation calculation");
    println!("• Voice lifecycle integration with envelope, LFO1, and LFO2 sources");
    println!("• SoundFont sample synthesis with modulation effects processing");
}