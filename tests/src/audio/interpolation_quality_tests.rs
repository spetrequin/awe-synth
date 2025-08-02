/**
 * Interpolation Quality Tests - Phase 10B.2
 * 
 * Tests for linear vs cubic interpolation quality in sample-based synthesis.
 * Verifies implementation correctness, performance characteristics, and quality metrics.
 */

use awe_synth::synth::sample_player::{SamplePlayer, InterpolationMethod};
use awe_synth::soundfont::types::SoundFontSample;

const SAMPLE_RATE: f32 = 44100.0;

/// Test interpolation method enum and basic functionality
#[test]
fn test_interpolation_method_enum() {
    println!("=== Testing InterpolationMethod Enum ===");
    
    // Test enum variants exist
    let linear = InterpolationMethod::Linear;
    let cubic = InterpolationMethod::Cubic;
    
    // Test default implementation
    let default_method = InterpolationMethod::default();
    assert_eq!(default_method, InterpolationMethod::Linear, 
              "Default interpolation should be Linear for performance");
    
    // Test comparison
    assert_ne!(linear, cubic, "Linear and Cubic should be different variants");
    
    println!("✅ InterpolationMethod enum functionality verified");
}

/// Test SamplePlayer interpolation method switching
#[test]
fn test_sample_player_interpolation_switching() {
    println!("=== Testing SamplePlayer Interpolation Switching ===");
    
    let mut player = SamplePlayer::new();
    
    // Test default interpolation
    assert_eq!(player.interpolation, InterpolationMethod::Linear,
              "SamplePlayer should default to Linear interpolation");
    
    // Test switching to cubic
    player.set_interpolation(InterpolationMethod::Cubic);
    assert_eq!(player.interpolation, InterpolationMethod::Cubic,
              "Should be able to switch to Cubic interpolation");
    
    // Test switching back to linear
    player.set_interpolation(InterpolationMethod::Linear);
    assert_eq!(player.interpolation, InterpolationMethod::Linear,
              "Should be able to switch back to Linear interpolation");
    
    println!("✅ SamplePlayer interpolation switching verified");
}

/// Test interpolation with synthetic sample data
#[test]
fn test_interpolation_with_synthetic_sample() {
    println!("=== Testing Interpolation with Synthetic Sample ===");
    
    // Create synthetic sample data (simple sine wave)
    let sample_length = 1000;
    let mut sample_data = Vec::new();
    
    for i in 0..sample_length {
        let phase = 2.0 * std::f32::consts::PI * i as f32 / sample_length as f32;
        let amplitude = (phase.sin() * 32767.0) as i16;
        sample_data.push(amplitude);
    }
    
    let test_sample = SoundFontSample {
        name: "TestSine".to_string(),
        sample_data,
        sample_rate: 44100,
        original_pitch: 60, // Middle C
        loop_start: 0,
        loop_end: sample_length as u32,
    };
    
    // Test both interpolation methods
    test_interpolation_method_quality(&test_sample, InterpolationMethod::Linear, "Linear");
    test_interpolation_method_quality(&test_sample, InterpolationMethod::Cubic, "Cubic");
    
    println!("✅ Interpolation quality testing with synthetic sample completed");
}

/// Test interpolation quality metrics
fn test_interpolation_method_quality(sample: &SoundFontSample, method: InterpolationMethod, method_name: &str) {
    println!("\n📋 Testing {} Interpolation Quality", method_name);
    
    let mut player = SamplePlayer::new();
    player.set_interpolation(method);
    
    // Start sample playback at different pitch ratios
    let test_ratios = [0.5, 1.0, 1.5, 2.0, 3.0]; // Different pitch shifting scenarios
    
    for &ratio in &test_ratios {
        player.position = 0.0;
        player.playback_rate = ratio;
        player.is_active = true;
        
        // Generate some samples
        let mut output_samples = Vec::new();
        let sample_count = 100;
        
        for _ in 0..sample_count {
            let audio_sample = player.generate_sample(sample);
            output_samples.push(audio_sample);
            
            if !player.is_active {
                break; // Sample finished
            }
        }
        
        // Basic quality checks
        let max_amplitude = output_samples.iter().fold(0.0, |max, &x| max.max(x.abs()));
        let non_zero_count = output_samples.iter().filter(|&&x| x.abs() > 0.001).count();
        
        println!("  Ratio {:.1}x: {} samples, max amplitude: {:.3}", 
                ratio, non_zero_count, max_amplitude);
        
        // Verify we got reasonable output
        assert!(max_amplitude > 0.0, "Should generate non-zero audio");
        assert!(max_amplitude <= 1.0, "Should not exceed unity amplitude");
    }
}

/// Test interpolation performance characteristics
#[test]
fn test_interpolation_performance_characteristics() {
    println!("=== Testing Interpolation Performance Characteristics ===");
    
    // Create test sample
    let sample_data: Vec<i16> = (0..1000).map(|i| (i % 1000) as i16).collect();
    let test_sample = SoundFontSample {
        name: "PerfTest".to_string(),
        sample_data,
        sample_rate: 44100,
        original_pitch: 60,
        loop_start: 0,
        loop_end: 1000,
    };
    
    let sample_count = 10000;
    
    // Test Linear interpolation performance
    let linear_time = time_interpolation_method(&test_sample, InterpolationMethod::Linear, sample_count);
    
    // Test Cubic interpolation performance
    let cubic_time = time_interpolation_method(&test_sample, InterpolationMethod::Cubic, sample_count);
    
    println!("Performance comparison ({} samples):", sample_count);
    println!("  Linear interpolation: {:.2}ms", linear_time * 1000.0);
    println!("  Cubic interpolation: {:.2}ms", cubic_time * 1000.0);
    
    if cubic_time > 0.0 && linear_time > 0.0 {
        let performance_ratio = cubic_time / linear_time;
        println!("  Performance ratio: {:.1}x (cubic is {:.1}x slower)", 
                performance_ratio, performance_ratio);
        
        // Cubic should be slower but not excessively so
        assert!(performance_ratio > 1.0, "Cubic should be slower than Linear");
        assert!(performance_ratio < 20.0, "Cubic shouldn't be more than 20x slower");
    }
    
    println!("✅ Interpolation performance characteristics verified");
}

/// Time interpolation method execution
fn time_interpolation_method(sample: &SoundFontSample, method: InterpolationMethod, sample_count: usize) -> f64 {
    let mut player = SamplePlayer::new();
    player.set_interpolation(method);
    player.start_sample(sample, 60, SAMPLE_RATE);
    
    let start_time = std::time::Instant::now();
    
    for _ in 0..sample_count {
        let _sample = player.generate_sample(sample);
        if !player.is_active {
            player.position = 0.0; // Reset for continuous testing
            player.is_active = true;
        }
    }
    
    start_time.elapsed().as_secs_f64()
}

/// Test interpolation boundary conditions
#[test]
fn test_interpolation_boundary_conditions() {
    println!("=== Testing Interpolation Boundary Conditions ===");
    
    // Create small test sample
    let sample_data = vec![1000_i16, 2000, 3000, 4000, 5000];
    let test_sample = SoundFontSample {
        name: "BoundaryTest".to_string(),
        sample_data,
        sample_rate: 44100,
        original_pitch: 60,
        loop_start: 1,
        loop_end: 4,
    };
    
    let mut player = SamplePlayer::new();
    
    // Test both interpolation methods at boundaries
    for method in [InterpolationMethod::Linear, InterpolationMethod::Cubic] {
        player.set_interpolation(method);
        player.start_sample(&test_sample, 60, SAMPLE_RATE);
        
        let method_name = match method {
            InterpolationMethod::Linear => "Linear",
            InterpolationMethod::Cubic => "Cubic",
        };
        
        println!("Testing {} interpolation boundaries:", method_name);
        
        // Test at start of sample
        player.position = 0.0;
        let start_sample = player.generate_sample(&test_sample);
        println!("  Start position (0.0): {:.3}", start_sample);
        assert!(start_sample.abs() > 0.0, "Should generate output at start");
        
        // Test at fractional position
        player.position = 1.5;
        let mid_sample = player.generate_sample(&test_sample);
        println!("  Mid position (1.5): {:.3}", mid_sample);
        assert!(mid_sample.abs() > 0.0, "Should generate output at mid position");
        
        // Test near end
        player.position = 3.9;
        let end_sample = player.generate_sample(&test_sample);
        println!("  Near end (3.9): {:.3}", end_sample);
    }
    
    println!("✅ Interpolation boundary conditions verified");
}

/// Test interpolation with looping samples
#[test]
fn test_interpolation_with_looping() {
    println!("=== Testing Interpolation with Sample Looping ===");
    
    // Create sample with loop points
    let sample_data: Vec<i16> = (0..20).map(|i| (i * 1000) as i16).collect();
    let test_sample = SoundFontSample {
        name: "LoopTest".to_string(),
        sample_data,
        sample_rate: 44100,
        original_pitch: 60,
        loop_start: 5,
        loop_end: 15,
    };
    
    let mut player = SamplePlayer::new();
    player.set_interpolation(InterpolationMethod::Cubic);
    player.start_sample(&test_sample, 60, SAMPLE_RATE);
    
    // Play past the loop end to test loop behavior
    let mut samples_generated = 0;
    let mut loop_detected = false;
    let max_samples = 1000;
    
    while samples_generated < max_samples && player.is_active {
        let old_position = player.position;
        let _sample = player.generate_sample(&test_sample);
        
        // Check if position wrapped back (loop occurred)
        if player.position < old_position && old_position > test_sample.loop_start as f64 {
            loop_detected = true;
            println!("  Loop detected: position {:.2} -> {:.2}", old_position, player.position);
            break;
        }
        
        samples_generated += 1;
    }
    
    assert!(loop_detected, "Should detect sample looping behavior");
    println!("✅ Interpolation with looping verified ({} samples)", samples_generated);
}