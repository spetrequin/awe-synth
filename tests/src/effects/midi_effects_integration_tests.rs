/**
 * MIDI Effects Integration Tests - EMU8000 CC 91/93 Control Testing
 * 
 * Tests for authentic EMU8000 MIDI effects control:
 * - MIDI CC 91 (reverb send) real-time parameter updates
 * - MIDI CC 93 (chorus send) real-time parameter updates  
 * - 16-channel independent effects send level tracking
 * - VoiceManager integration with global effects buses
 * - MIDI value scaling accuracy (0-127 → 0.0-1.0)
 */

use awe_synth::midi::effects_controller::{MidiEffectsController, MIDI_CC_REVERB_SEND, MIDI_CC_CHORUS_SEND};
use awe_synth::synth::voice_manager::VoiceManager;

#[cfg(test)]
mod midi_effects_integration_tests {
    use super::*;
    
    #[test]
    fn test_midi_effects_controller_cc_91_93() {
        let mut controller = MidiEffectsController::new();
        
        // Test initial state
        assert_eq!(controller.reverb_send_levels[0], 0.4); // Default 40% reverb
        assert_eq!(controller.chorus_send_levels[0], 0.2); // Default 20% chorus
        assert_eq!(controller.master_reverb_send, 1.0);
        assert_eq!(controller.master_chorus_send, 1.0);
        
        // Test MIDI CC 91 (reverb send) processing
        let processed = controller.process_control_change(0, MIDI_CC_REVERB_SEND, 64);
        assert!(processed, "CC 91 should be processed");
        assert!((controller.get_reverb_send(0) - 0.504).abs() < 0.01); // 64/127 ≈ 0.504
        
        // Test MIDI CC 93 (chorus send) processing  
        let processed = controller.process_control_change(1, MIDI_CC_CHORUS_SEND, 127);
        assert!(processed, "CC 93 should be processed");
        assert!((controller.get_chorus_send(1) - 1.0).abs() < 0.01); // 127/127 = 1.0
        
        // Test non-effects CC is not processed
        let processed = controller.process_control_change(0, 7, 100); // Volume CC
        assert!(!processed, "Volume CC should not be processed");
        
        println!("✅ MIDI effects controller CC 91/93 test passed");
    }
    
    #[test]
    fn test_real_time_midi_cc_91_reverb_updates() {
        let mut controller = MidiEffectsController::new();
        
        // Test multiple real-time updates on different channels
        let test_cases = vec![
            (0, 0),     // Channel 0: 0% reverb
            (1, 32),    // Channel 1: 25% reverb  
            (2, 64),    // Channel 2: 50% reverb
            (3, 96),    // Channel 3: 75% reverb
            (4, 127),   // Channel 4: 100% reverb
        ];
        
        for (channel, midi_value) in test_cases {
            let processed = controller.process_control_change(channel, MIDI_CC_REVERB_SEND, midi_value);
            assert!(processed, "CC 91 should be processed for channel {}", channel);
            
            let expected_level = (midi_value as f32) / 127.0;
            let actual_level = controller.get_reverb_send(channel);
            assert!((actual_level - expected_level).abs() < 0.01,
                "Channel {} reverb should be {:.3}, got {:.3}", channel, expected_level, actual_level);
        }
        
        // Test rapid parameter changes (real-time behavior)
        for value in (0..=127).step_by(16) {
            controller.process_control_change(0, MIDI_CC_REVERB_SEND, value);
            let expected = (value as f32) / 127.0;
            assert!((controller.get_reverb_send(0) - expected).abs() < 0.01);
        }
        
        println!("✅ Real-time MIDI CC 91 reverb updates test passed");
    }
    
    #[test] 
    fn test_real_time_midi_cc_93_chorus_updates() {
        let mut controller = MidiEffectsController::new();
        
        // Test multiple real-time updates on different channels
        let test_cases = vec![
            (5, 0),     // Channel 5: 0% chorus
            (6, 25),    // Channel 6: ~20% chorus
            (7, 51),    // Channel 7: ~40% chorus
            (8, 76),    // Channel 8: ~60% chorus
            (9, 102),   // Channel 9: ~80% chorus
            (10, 127),  // Channel 10: 100% chorus
        ];
        
        for (channel, midi_value) in test_cases {
            let processed = controller.process_control_change(channel, MIDI_CC_CHORUS_SEND, midi_value);
            assert!(processed, "CC 93 should be processed for channel {}", channel);
            
            let expected_level = (midi_value as f32) / 127.0;
            let actual_level = controller.get_chorus_send(channel);
            assert!((actual_level - expected_level).abs() < 0.01,
                "Channel {} chorus should be {:.3}, got {:.3}", channel, expected_level, actual_level);
        }
        
        // Test boundary conditions
        controller.process_control_change(0, MIDI_CC_CHORUS_SEND, 0);   // Minimum
        assert_eq!(controller.get_chorus_send(0), 0.0);
        
        controller.process_control_change(0, MIDI_CC_CHORUS_SEND, 127); // Maximum
        assert_eq!(controller.get_chorus_send(0), 1.0);
        
        println!("✅ Real-time MIDI CC 93 chorus updates test passed");
    }
    
    #[test]
    fn test_16_channel_independent_effects_tracking() {
        let mut controller = MidiEffectsController::new();
        
        // Set different reverb levels on all 16 channels
        for channel in 0..16 {
            let reverb_value = (channel * 8) as u8;  // 0, 8, 16, 24, ... 120
            let chorus_value = ((15 - channel) * 8) as u8; // 120, 112, 104, ... 0
            
            controller.process_control_change(channel as u8, MIDI_CC_REVERB_SEND, reverb_value);
            controller.process_control_change(channel as u8, MIDI_CC_CHORUS_SEND, chorus_value);
        }
        
        // Verify each channel maintains independent levels
        for channel in 0..16 {
            let expected_reverb = ((channel * 8) as f32) / 127.0;
            let expected_chorus = (((15 - channel) * 8) as f32) / 127.0;
            
            let actual_reverb = controller.get_reverb_send(channel as u8);
            let actual_chorus = controller.get_chorus_send(channel as u8);
            
            assert!((actual_reverb - expected_reverb).abs() < 0.01,
                "Channel {} reverb should be {:.3}, got {:.3}", channel, expected_reverb, actual_reverb);
            assert!((actual_chorus - expected_chorus).abs() < 0.01,
                "Channel {} chorus should be {:.3}, got {:.3}", channel, expected_chorus, actual_chorus);
        }
        
        // Test channel independence: changing one channel doesn't affect others
        let original_ch5_reverb = controller.get_reverb_send(5);
        controller.process_control_change(3, MIDI_CC_REVERB_SEND, 100); // Change channel 3
        assert_eq!(controller.get_reverb_send(5), original_ch5_reverb); // Channel 5 unchanged
        
        println!("✅ 16-channel independent effects tracking test passed");
    }
    
    #[test]
    fn test_midi_value_scaling_accuracy() {
        let controller = MidiEffectsController::new();
        
        // Test boundary conditions
        assert_eq!(MidiEffectsController::midi_to_float(0), 0.0);
        assert_eq!(MidiEffectsController::midi_to_float(127), 1.0);
        
        // Test specific values
        assert!((MidiEffectsController::midi_to_float(1) - 0.007874).abs() < 0.001);   // 1/127
        assert!((MidiEffectsController::midi_to_float(64) - 0.504).abs() < 0.001);     // 64/127
        assert!((MidiEffectsController::midi_to_float(63) - 0.496).abs() < 0.001);     // 63/127
        
        // Test reverse conversion
        assert_eq!(MidiEffectsController::float_to_midi(0.0), 0);
        assert_eq!(MidiEffectsController::float_to_midi(1.0), 127);
        assert_eq!(MidiEffectsController::float_to_midi(0.5), 63);  // 0.5 * 127 = 63.5 → 63
        
        // Test scaling precision across full range
        for midi_val in 0..=127 {
            let float_val = MidiEffectsController::midi_to_float(midi_val);
            let back_to_midi = MidiEffectsController::float_to_midi(float_val);
            
            // Allow ±1 error due to rounding
            assert!((back_to_midi as i16 - midi_val as i16).abs() <= 1,
                "Round-trip error for {}: {} → {:.3} → {}", midi_val, midi_val, float_val, back_to_midi);
        }
        
        println!("✅ MIDI value scaling accuracy test passed");
    }
}