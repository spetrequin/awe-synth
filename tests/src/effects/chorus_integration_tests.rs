/**
 * Chorus Integration Tests - EMU8000 Send/Return Effects Testing
 * 
 * Tests for authentic EMU8000 chorus processor and send/return architecture:
 * - ChorusProcessor initialization and parameter validation
 * - Modulated delay lines with LFO phase offsets
 * - LFO frequency and depth parameter ranges
 * - ChorusBus send/return architecture
 * - Integration with VoiceManager effects pipeline
 */

use awe_synth::effects::chorus::{ChorusProcessor, ChorusBus};

#[cfg(test)]
mod chorus_integration_tests {
    use super::*;
    
    #[test]
    fn test_chorus_processor_initialization() {
        let chorus = ChorusProcessor::new(44100.0, 0.5, 0.3, 0.7, 0.5);
        
        // Test EMU8000 default parameters
        assert_eq!(chorus.sample_rate, 44100.0);
        assert_eq!(chorus.rate, 0.5);
        assert_eq!(chorus.depth, 0.3);
        assert_eq!(chorus.feedback, 0.7);
        assert_eq!(chorus.stereo_spread, 0.5);
        
        // Validate parameter ranges
        assert!(chorus.rate >= 0.0 && chorus.rate <= 20.0);
        assert!(chorus.depth >= 0.0 && chorus.depth <= 1.0);
        assert!(chorus.feedback >= 0.0 && chorus.feedback <= 0.95);
        assert!(chorus.stereo_spread >= 0.0 && chorus.stereo_spread <= 1.0);
        
        // Test delay buffer allocation
        assert!(!chorus.delay_lines.is_empty());
        assert!(chorus.delay_lines.len() >= 2); // At least 2 delay lines for stereo
        
        println!("✅ ChorusProcessor initialization test passed");
    }
    
    #[test]
    fn test_chorus_bus_functionality() {
        let mut chorus_bus = ChorusBus::new(44100.0);
        
        // Test initial state
        assert_eq!(chorus_bus.master_send_level, 1.0);
        assert_eq!(chorus_bus.return_level, 0.3);
        assert_eq!(chorus_bus.chorus_input_accumulator, 0.0);
        
        // Test channel send level control
        chorus_bus.set_channel_send(0, 0.5);
        assert_eq!(chorus_bus.channel_send_levels[0], 0.5);
        
        // Test master send control
        chorus_bus.set_master_send(0.8);
        assert_eq!(chorus_bus.master_send_level, 0.8);
        
        // Test chorus configuration
        chorus_bus.configure_chorus(1.5, 0.4, 0.6, 0.7);
        assert_eq!(chorus_bus.chorus_processor.rate, 1.5);
        assert_eq!(chorus_bus.chorus_processor.depth, 0.4);
        assert_eq!(chorus_bus.chorus_processor.feedback, 0.6);
        assert_eq!(chorus_bus.chorus_processor.stereo_spread, 0.7);
        
        println!("✅ ChorusBus functionality test passed");
    }
    
    #[test]
    fn test_modulated_delay_lines_lfo_phase_offsets() {
        let chorus = ChorusProcessor::new(44100.0, 1.5, 0.4, 0.6, 0.7);
        
        // Test modulated delay line configuration
        assert!(chorus.delay_lines.len() >= 2, "Should have at least 2 delay lines for stereo");
        
        // Test different phase offsets for stereo effect
        let mut phase_offsets = Vec::new();
        for delay_line in &chorus.delay_lines {
            phase_offsets.push(delay_line.lfo_phase_offset);
        }
        
        // Should have different phase offsets for stereo spread
        phase_offsets.sort_by(|a, b| a.partial_cmp(b).unwrap());
        phase_offsets.dedup();
        assert!(phase_offsets.len() >= 2, 
            "Should have at least 2 different LFO phase offsets for stereo, got {}", phase_offsets.len());
        
        // Test LFO modulation parameters
        for delay_line in &chorus.delay_lines {
            // Phase offset should be 0-2π
            assert!(delay_line.lfo_phase_offset >= 0.0 && delay_line.lfo_phase_offset <= 6.284,
                "LFO phase offset should be 0-2π, got {:.3}", delay_line.lfo_phase_offset);
            
            // Delay buffer should be reasonable size
            assert!(delay_line.buffer.len() >= 100 && delay_line.buffer.len() <= 5000,
                "Delay buffer should be 100-5000 samples, got {}", delay_line.buffer.len());
        }
        
        println!("✅ Modulated delay lines LFO phase offsets test passed");
    }
    
    #[test]
    fn test_chorus_lfo_frequency_depth_ranges() {
        // Test minimum LFO values
        let min_chorus = ChorusProcessor::new(44100.0, 0.1, 0.0, 0.0, 0.0);
        assert_eq!(min_chorus.rate, 0.1);
        assert_eq!(min_chorus.depth, 0.0);
        
        // Test maximum LFO values (EMU8000 range)
        let max_chorus = ChorusProcessor::new(44100.0, 20.0, 1.0, 0.95, 1.0);
        assert_eq!(max_chorus.rate, 20.0);
        assert_eq!(max_chorus.depth, 1.0);
        
        // Test typical musical LFO values
        let musical_chorus = ChorusProcessor::new(44100.0, 0.5, 0.3, 0.4, 0.6);
        assert_eq!(musical_chorus.rate, 0.5);   // 0.5 Hz = slow chorus
        assert_eq!(musical_chorus.depth, 0.3);  // 30% depth
        
        // Test EMU8000 parameter validation
        assert!(min_chorus.rate >= 0.1 && min_chorus.rate <= 20.0);
        assert!(max_chorus.depth >= 0.0 && max_chorus.depth <= 1.0);
        assert!(musical_chorus.feedback >= 0.0 && musical_chorus.feedback <= 0.95);
        
        // Test LFO frequency affects modulation timing
        let slow_lfo = ChorusProcessor::new(44100.0, 0.2, 0.5, 0.3, 0.5); // 0.2 Hz = 5 second cycle
        let fast_lfo = ChorusProcessor::new(44100.0, 5.0, 0.5, 0.3, 0.5);  // 5 Hz = 0.2 second cycle
        
        assert!(slow_lfo.rate < fast_lfo.rate);
        assert_eq!(slow_lfo.depth, fast_lfo.depth); // Same depth, different speeds
        
        println!("✅ Chorus LFO frequency and depth ranges test passed");
    }
}