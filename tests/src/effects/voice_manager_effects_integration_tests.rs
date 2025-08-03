/**
 * Phase 16.14: Test VoiceManager integration with global effects buses
 * 
 * Verifies that the VoiceManager correctly integrates with ReverbBus and ChorusBus,
 * including voice send accumulation, channel-based effects levels, and proper
 * signal flow through the EMU8000 send/return architecture.
 */

use awe_synth::synth::voice_manager::VoiceManager;

#[cfg(test)]
mod voice_manager_effects_integration_tests {
    use super::*;
    
    #[test]
    fn test_voice_manager_effects_bus_integration() {
    let sample_rate = 44100.0;
    let mut voice_manager = VoiceManager::new(sample_rate);
    
    // Configure effects parameters
    voice_manager.configure_reverb(0.7, 0.5, 0.8);
    voice_manager.configure_chorus(1.5, 0.3, 0.5, 0.8);
    
    // Set channel-specific send levels
    voice_manager.set_channel_reverb_send(0, 0.5);
    voice_manager.set_channel_chorus_send(0, 0.3);
    
    // Trigger a note
    let note = 60; // Middle C
    let velocity = 80;
    voice_manager.note_on(note, velocity);
    
    // Process some samples to verify effects integration
    let mut has_output = false;
    for _ in 0..1000 {
        voice_manager.process_envelopes();
        let output = voice_manager.process();
        
        if output.abs() > 0.0001 {
            has_output = true;
        }
    }
    
    assert!(has_output, "VoiceManager should produce audio output with effects");
    
    // Test MIDI CC control integration
    voice_manager.process_midi_control_change(0, 91, 100); // Reverb send
    voice_manager.process_midi_control_change(0, 93, 64);  // Chorus send
    
    // Process more samples to verify CC changes take effect
    for _ in 0..100 {
        voice_manager.process_envelopes();
        voice_manager.process();
    }
    
    // Verify effects status
    let status = voice_manager.get_midi_effects_status();
    assert!(status.contains("Channel 0: Reverb=0.79"));
    assert!(status.contains("Chorus=0.50"));
    
    println!("✅ VoiceManager effects bus integration test passed");
    }
}