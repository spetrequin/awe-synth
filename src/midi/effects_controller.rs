/**
 * MIDI Effects Controller - EMU8000 Effects Control via MIDI CC
 * 
 * EMU8000 MIDI effects control implementation:
 * - MIDI CC 91 (Effects 1 - Reverb Send) per-channel control
 * - MIDI CC 93 (Effects 3 - Chorus Send) per-channel control
 * - Real-time parameter updates during MIDI playback
 * - 16-channel independent effects send levels
 * - Integration with VoiceManager global effects buses
 * - Proper MIDI value scaling (0-127 → 0.0-1.0)
 */

use crate::log;

/// MIDI effects controller for EMU8000 CC 91/93 processing
#[derive(Debug, Clone)]
pub struct MidiEffectsController {
    /// Per-channel reverb send levels (CC 91) for 16 MIDI channels
    pub reverb_send_levels: [f32; 16],
    /// Per-channel chorus send levels (CC 93) for 16 MIDI channels  
    pub chorus_send_levels: [f32; 16],
    /// Master reverb send level (global scaling)
    pub master_reverb_send: f32,
    /// Master chorus send level (global scaling)
    pub master_chorus_send: f32,
    /// Enable real-time effects logging
    pub enable_effects_logging: bool,
}

/// MIDI CC constants for EMU8000 effects
pub const MIDI_CC_REVERB_SEND: u8 = 91;  // Effects 1 - Reverb Send
pub const MIDI_CC_CHORUS_SEND: u8 = 93;  // Effects 3 - Chorus Send

impl MidiEffectsController {
    /// Create new MIDI effects controller with EMU8000 defaults
    pub fn new() -> Self {
        log("MidiEffectsController created with EMU8000 defaults");
        
        MidiEffectsController {
            reverb_send_levels: [0.4; 16], // Default 40% reverb on all channels
            chorus_send_levels: [0.2; 16], // Default 20% chorus on all channels
            master_reverb_send: 1.0,        // Full master reverb level
            master_chorus_send: 1.0,        // Full master chorus level
            enable_effects_logging: true,   // Enable logging by default
        }
    }
    
    /// Process MIDI Control Change message for effects
    /// 
    /// # Arguments
    /// * `channel` - MIDI channel (0-15)
    /// * `controller` - MIDI CC number
    /// * `value` - MIDI CC value (0-127)
    /// 
    /// # Returns
    /// True if the CC was processed (effects-related), false otherwise
    pub fn process_control_change(&mut self, channel: u8, controller: u8, value: u8) -> bool {
        let channel_idx = (channel as usize).min(15);
        let scaled_value = Self::midi_to_float(value);
        
        match controller {
            MIDI_CC_REVERB_SEND => {
                self.reverb_send_levels[channel_idx] = scaled_value;
                if self.enable_effects_logging {
                    log(&format!("MIDI CH{}: CC91 (Reverb Send) = {} -> {:.2}", 
                               channel, value, scaled_value));
                }
                true
            },
            MIDI_CC_CHORUS_SEND => {
                self.chorus_send_levels[channel_idx] = scaled_value;
                if self.enable_effects_logging {
                    log(&format!("MIDI CH{}: CC93 (Chorus Send) = {} -> {:.2}", 
                               channel, value, scaled_value));
                }
                true
            },
            _ => false, // Not an effects controller
        }
    }
    
    /// Get current reverb send level for a MIDI channel
    pub fn get_reverb_send(&self, channel: u8) -> f32 {
        let channel_idx = (channel as usize).min(15);
        self.reverb_send_levels[channel_idx] * self.master_reverb_send
    }
    
    /// Get current chorus send level for a MIDI channel
    pub fn get_chorus_send(&self, channel: u8) -> f32 {
        let channel_idx = (channel as usize).min(15);
        self.chorus_send_levels[channel_idx] * self.master_chorus_send
    }
    
    /// Set reverb send level for a specific channel (programmatic control)
    pub fn set_reverb_send(&mut self, channel: u8, level: f32) {
        let channel_idx = (channel as usize).min(15);
        self.reverb_send_levels[channel_idx] = level.clamp(0.0, 1.0);
        if self.enable_effects_logging {
            log(&format!("Direct CH{}: Reverb Send set to {:.2}", channel, level));
        }
    }
    
    /// Set chorus send level for a specific channel (programmatic control)
    pub fn set_chorus_send(&mut self, channel: u8, level: f32) {
        let channel_idx = (channel as usize).min(15);
        self.chorus_send_levels[channel_idx] = level.clamp(0.0, 1.0);
        if self.enable_effects_logging {
            log(&format!("Direct CH{}: Chorus Send set to {:.2}", channel, level));
        }
    }
    
    /// Set master reverb send level (affects all channels)
    pub fn set_master_reverb_send(&mut self, level: f32) {
        self.master_reverb_send = level.clamp(0.0, 1.0);
        log(&format!("Master Reverb Send set to {:.2}", self.master_reverb_send));
    }
    
    /// Set master chorus send level (affects all channels)
    pub fn set_master_chorus_send(&mut self, level: f32) {
        self.master_chorus_send = level.clamp(0.0, 1.0);
        log(&format!("Master Chorus Send set to {:.2}", self.master_chorus_send));
    }
    
    /// Reset all channels to default effects levels
    pub fn reset_to_defaults(&mut self) {
        self.reverb_send_levels = [0.4; 16]; // 40% reverb default
        self.chorus_send_levels = [0.2; 16]; // 20% chorus default
        self.master_reverb_send = 1.0;
        self.master_chorus_send = 1.0;
        log("MIDI Effects Controller reset to EMU8000 defaults");
    }
    
    /// Enable or disable real-time effects logging
    pub fn set_effects_logging(&mut self, enable: bool) {
        self.enable_effects_logging = enable;
        log(&format!("Effects logging {}", if enable { "enabled" } else { "disabled" }));
    }
    
    /// Convert MIDI value (0-127) to float (0.0-1.0)
    fn midi_to_float(midi_value: u8) -> f32 {
        (midi_value as f32) / 127.0
    }
    
    /// Convert float (0.0-1.0) to MIDI value (0-127)
    pub fn float_to_midi(float_value: f32) -> u8 {
        (float_value.clamp(0.0, 1.0) * 127.0) as u8
    }
    
    /// Get effects status for debugging
    pub fn get_effects_status(&self) -> String {
        let mut status = String::new();
        status.push_str("MIDI Effects Status:\n");
        status.push_str(&format!("Master Reverb: {:.2}, Master Chorus: {:.2}\n", 
                               self.master_reverb_send, self.master_chorus_send));
        
        for channel in 0..16 {
            let reverb = self.reverb_send_levels[channel];
            let chorus = self.chorus_send_levels[channel];
            if reverb > 0.0 || chorus > 0.0 {
                status.push_str(&format!("CH{:2}: Rev={:.2} Cho={:.2}\n", 
                               channel, reverb, chorus));
            }
        }
        
        status
    }
    
    /// Process multiple MIDI CC messages (batch processing)
    pub fn process_control_changes(&mut self, messages: &[(u8, u8, u8)]) -> usize {
        let mut processed_count = 0;
        
        for &(channel, controller, value) in messages {
            if self.process_control_change(channel, controller, value) {
                processed_count += 1;
            }
        }
        
        if processed_count > 0 && self.enable_effects_logging {
            log(&format!("Processed {} effects CC messages", processed_count));
        }
        
        processed_count
    }
}

impl Default for MidiEffectsController {
    fn default() -> Self {
        Self::new()
    }
}

/// EMU8000 MIDI effects integration helper
#[derive(Debug, Clone)]
pub struct EffectsIntegration {
    /// MIDI effects controller
    pub effects_controller: MidiEffectsController,
    /// Last update frame for optimization
    pub last_update_frame: u64,
    /// Update frequency (frames between VoiceManager updates)
    pub update_frequency: u64,
}

impl EffectsIntegration {
    /// Create new effects integration with specified update frequency
    pub fn new(update_frequency: u64) -> Self {
        EffectsIntegration {
            effects_controller: MidiEffectsController::new(),
            last_update_frame: 0,
            update_frequency,
        }
    }
    
    /// Check if VoiceManager should be updated this frame
    pub fn should_update(&self, current_frame: u64) -> bool {
        current_frame.saturating_sub(self.last_update_frame) >= self.update_frequency
    }
    
    /// Mark that VoiceManager was updated
    pub fn mark_updated(&mut self, current_frame: u64) {
        self.last_update_frame = current_frame;
    }
    
    /// Process MIDI CC and determine if VoiceManager update is needed
    pub fn process_midi_cc(&mut self, channel: u8, controller: u8, value: u8, current_frame: u64) -> bool {
        let processed = self.effects_controller.process_control_change(channel, controller, value);
        
        if processed && self.should_update(current_frame) {
            self.mark_updated(current_frame);
            return true; // Signal that VoiceManager should be updated
        }
        
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_midi_effects_controller_creation() {
        let controller = MidiEffectsController::new();
        
        // Check default values
        assert_eq!(controller.reverb_send_levels[0], 0.4);
        assert_eq!(controller.chorus_send_levels[0], 0.2);
        assert_eq!(controller.master_reverb_send, 1.0);
        assert_eq!(controller.master_chorus_send, 1.0);
    }
    
    #[test]
    fn test_cc_91_reverb_processing() {
        let mut controller = MidiEffectsController::new();
        
        // Test CC 91 (reverb send)
        let processed = controller.process_control_change(0, 91, 64); // Mid-range value
        assert!(processed);
        assert!((controller.get_reverb_send(0) - 0.504).abs() < 0.01); // 64/127 ≈ 0.504
    }
    
    #[test]
    fn test_cc_93_chorus_processing() {
        let mut controller = MidiEffectsController::new();
        
        // Test CC 93 (chorus send)
        let processed = controller.process_control_change(1, 93, 127); // Maximum value
        assert!(processed);
        assert!((controller.get_chorus_send(1) - 1.0).abs() < 0.01);
    }
    
    #[test]
    fn test_midi_value_scaling() {
        assert_eq!(MidiEffectsController::midi_to_float(0), 0.0);
        assert_eq!(MidiEffectsController::midi_to_float(127), 1.0);
        assert!((MidiEffectsController::midi_to_float(64) - 0.504).abs() < 0.01);
        
        assert_eq!(MidiEffectsController::float_to_midi(0.0), 0);
        assert_eq!(MidiEffectsController::float_to_midi(1.0), 127);
        assert_eq!(MidiEffectsController::float_to_midi(0.5), 63);
    }
}