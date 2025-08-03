/**
 * Reverb Integration Tests - EMU8000 Send/Return Effects Testing
 * 
 * Tests for authentic EMU8000 reverb processor and send/return architecture:
 * - ReverbProcessor initialization and parameter validation
 * - Multi-tap delay lines with golden ratio spacing
 * - All-pass filter chain for diffusion (4 stages)
 * - Comb filter array with feedback and damping
 * - ReverbBus send/return architecture
 * - Integration with VoiceManager effects pipeline
 */

use awe_synth::effects::reverb::{ReverbProcessor, ReverbBus};

#[cfg(test)]
mod reverb_integration_tests {
    use super::*;
    
    #[test]
    fn test_reverb_processor_initialization() {
        let reverb = ReverbProcessor::new(44100.0, 0.5, 0.3, 0.7);
        
        // Test EMU8000 default parameters
        assert_eq!(reverb.sample_rate, 44100.0);
        assert_eq!(reverb.room_size, 0.5);
        assert_eq!(reverb.damping, 0.3);
        assert_eq!(reverb.diffusion, 0.7);
        assert!(reverb.room_size >= 0.0 && reverb.room_size <= 1.0);
        assert!(reverb.damping >= 0.0 && reverb.damping <= 1.0);
        assert!(reverb.diffusion >= 0.0 && reverb.diffusion <= 1.0);
        
        // Test delay buffer allocation (golden ratio spacing)
        assert!(!reverb.delay_lines.is_empty());
        assert_eq!(reverb.delay_lines.len(), 6); // 6 golden ratio delay taps
        
        // Test all-pass filter chain for diffusion (4 stages)
        assert_eq!(reverb.allpass_filters.len(), 4);
        
        println!("✅ ReverbProcessor initialization test passed");
    }
    
    #[test]
    fn test_reverb_bus_functionality() {
        let mut reverb_bus = ReverbBus::new(44100.0);
        
        // Test initial state
        assert_eq!(reverb_bus.master_send_level, 1.0);
        assert_eq!(reverb_bus.return_level, 0.3);
        assert_eq!(reverb_bus.reverb_input_accumulator, 0.0);
        
        // Test channel send level control
        reverb_bus.set_channel_send(0, 0.5);
        assert_eq!(reverb_bus.channel_send_levels[0], 0.5);
        
        // Test master send control
        reverb_bus.set_master_send(0.8);
        assert_eq!(reverb_bus.master_send_level, 0.8);
        
        println!("✅ ReverbBus functionality test passed");
    }
    
    #[test]
    fn test_multi_tap_delay_golden_ratio_spacing() {
        let reverb = ReverbProcessor::new(44100.0, 0.5, 0.3, 0.7);
        
        // Test golden ratio delay line configuration
        assert_eq!(reverb.delay_lines.len(), 6); // 6 golden ratio delay taps
        
        // Calculate expected delay times using golden ratio
        let base_delay_ms = 20.0 + (0.5 * 80.0); // room_size = 0.5
        let expected_ratios = vec![
            1.0,
            1.618,     // Golden ratio
            2.618,     // Golden ratio squared  
            4.236,     // Golden ratio cubed
            6.854,     // Fibonacci progression
            11.090,    // Natural reverb spacing
        ];
        
        // Verify delay line spacing follows golden ratio progression
        for (i, expected_ratio) in expected_ratios.iter().enumerate() {
            let expected_delay_ms = base_delay_ms * expected_ratio;
            let expected_samples = (expected_delay_ms * 44100.0 / 1000.0) as usize;
            
            // Allow small tolerance for sample rate conversion
            let actual_samples = reverb.delay_lines[i].buffer.len();
            let difference = if actual_samples > expected_samples {
                actual_samples - expected_samples
            } else {
                expected_samples - actual_samples
            };
            
            assert!(difference <= 2, 
                "Delay line {} should have ~{} samples (±2), got {}", 
                i, expected_samples, actual_samples);
        }
        
        println!("✅ Multi-tap delay golden ratio spacing test passed");
    }
    
    #[test]
    fn test_allpass_filter_diffusion_chain() {
        let reverb = ReverbProcessor::new(44100.0, 0.5, 0.3, 0.7);
        
        // Test 4-stage all-pass filter chain for diffusion
        assert_eq!(reverb.allpass_filters.len(), 4, "Should have 4 all-pass stages");
        
        // Test prime-based delay times for diffusion
        let expected_delays_ms = vec![5.0, 8.3, 13.7, 21.3];
        
        for (i, &expected_delay_ms) in expected_delays_ms.iter().enumerate() {
            let expected_samples = (expected_delay_ms * 44100.0 / 1000.0) as usize;
            let actual_samples = reverb.allpass_filters[i].buffer.len();
            
            // Allow tolerance for sample rate conversion
            let difference = if actual_samples > expected_samples {
                actual_samples - expected_samples
            } else {
                expected_samples - actual_samples
            };
            
            assert!(difference <= 2,
                "All-pass {} should have ~{} samples (±2), got {}",
                i, expected_samples, actual_samples);
        }
        
        // Test diffusion control affects all-pass gain
        let diffusion = 0.7;
        for filter in &reverb.allpass_filters {
            let expected_gain = 0.7 * diffusion;
            assert!((filter.gain - expected_gain).abs() < 0.01,
                "All-pass gain should be ~{:.2}, got {:.2}", expected_gain, filter.gain);
        }
        
        println!("✅ All-pass filter diffusion chain test passed");
    }
    
    #[test]
    fn test_comb_filter_array_feedback_damping() {
        let reverb = ReverbProcessor::new(44100.0, 0.5, 0.3, 0.7);
        
        // Test comb filter array configuration
        assert!(!reverb.comb_filters.is_empty(), "Should have comb filters");
        
        // EMU8000 typically uses 4-8 comb filters
        assert!(reverb.comb_filters.len() >= 4 && reverb.comb_filters.len() <= 8,
            "Should have 4-8 comb filters, got {}", reverb.comb_filters.len());
        
        // Test feedback and damping parameter validation
        for (i, filter) in reverb.comb_filters.iter().enumerate() {
            // Feedback should be reasonable for stable reverb
            assert!(filter.feedback >= 0.0 && filter.feedback <= 0.95,
                "Comb filter {} feedback should be 0.0-0.95, got {:.2}", i, filter.feedback);
            
            // Damping should be within EMU8000 range
            assert!(filter.damping >= 0.0 && filter.damping <= 1.0,
                "Comb filter {} damping should be 0.0-1.0, got {:.2}", i, filter.damping);
            
            // Buffer size should be reasonable for reverb delays
            assert!(filter.buffer.len() >= 100 && filter.buffer.len() <= 10000,
                "Comb filter {} buffer should be 100-10000 samples, got {}", i, filter.buffer.len());
        }
        
        // Test that comb filters have different delay times for richness
        let mut delay_times: Vec<usize> = reverb.comb_filters.iter()
            .map(|f| f.buffer.len())
            .collect();
        delay_times.sort();
        delay_times.dedup();
        
        // Should have at least 3 different delay times
        assert!(delay_times.len() >= 3,
            "Should have at least 3 different comb delay times for richness, got {}", delay_times.len());
        
        println!("✅ Comb filter array feedback and damping test passed");
    }
}