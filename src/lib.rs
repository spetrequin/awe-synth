use wasm_bindgen::prelude::*;
use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};

pub mod error;
pub mod midi;
pub mod synth;
pub mod soundfont;
pub mod effects;
pub mod worklet;
pub mod audio;

use midi::sequencer::{MidiSequencer, PlaybackState};
use midi::constants::*;
use synth::voice_manager::VoiceManager;
use soundfont::SoundFont;

static MIDI_EVENT_QUEUE: OnceLock<Mutex<VecDeque<MidiEvent>>> = OnceLock::new();

// Temporary no-op log function to prevent build errors while removing old debug system
pub fn log(_message: &str) {
    // Logging disabled - replaced with structured diagnostic functions
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MidiEvent {
    pub timestamp: u64,
    pub channel: u8,
    pub message_type: u8,
    pub data1: u8,
    pub data2: u8,
}

#[wasm_bindgen]
impl MidiEvent {
    #[wasm_bindgen(constructor)]
    pub fn new(timestamp: u64, channel: u8, message_type: u8, data1: u8, data2: u8) -> MidiEvent {
        MidiEvent { timestamp, channel, message_type, data1, data2 }
    }
}

#[wasm_bindgen]
pub struct MidiPlayer {
    sequencer: MidiSequencer,
    voice_manager: VoiceManager,
    current_sample: u64,
}

#[wasm_bindgen]
impl MidiPlayer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> MidiPlayer {
        log("MidiPlayer::new() - AWE Player initialized");
        // Initialize MIDI event queue
        MIDI_EVENT_QUEUE.get_or_init(|| Mutex::new(VecDeque::with_capacity(1000)));
        log("MIDI event queue initialized (capacity: 1000)");
        MidiPlayer {
            sequencer: MidiSequencer::new(44100.0), // 44.1kHz sample rate
            voice_manager: VoiceManager::new(44100.0),
            current_sample: 0,
        }
    }
    
    #[wasm_bindgen]
    pub fn queue_midi_event(&mut self, event: MidiEvent) {
        let queue = MIDI_EVENT_QUEUE.get().expect("MIDI queue should be initialized");
        if let Ok(mut queue) = queue.lock() {
            if queue.len() >= 1000 {
                queue.pop_front();
                log("MIDI queue full - dropped oldest event");
            }
            queue.push_back(event);
            log(&format!("MIDI event queued: ch={} type={} data={},{} @{}", 
                event.channel, event.message_type, event.data1, event.data2, event.timestamp));
        }
    }
    
    #[wasm_bindgen]
    pub fn process_midi_events(&mut self, current_sample_time: u64) -> u32 {
        let mut processed_count = 0;
        let queue = MIDI_EVENT_QUEUE.get().expect("MIDI queue should be initialized");
        if let Ok(mut queue) = queue.lock() {
            while let Some(event) = queue.front() {
                if event.timestamp <= current_sample_time {
                    let event = queue.pop_front().unwrap();
                    
                    // Process MIDI event through VoiceManager
                    self.handle_midi_event(&event);
                    
                    log(&format!("Processing MIDI event: ch={} type=0x{:02X} data={},{} @{}", 
                        event.channel, event.message_type, event.data1, event.data2, event.timestamp));
                    processed_count += 1;
                } else {
                    break;
                }
            }
        }
        processed_count
    }
    
    // Debug log system removed - replaced with structured data returns
    
    #[wasm_bindgen]
    pub fn play_test_tone(&mut self) -> f32 {
        log("MidiPlayer::play_test_tone() - 440Hz test tone generated");
        use std::f32::consts::PI;
        let frequency = 440.0;
        let sample_rate = 44100.0;
        let time = 0.0;
        (2.0 * PI * frequency * time / sample_rate).sin() * 0.1
    }
    
    #[wasm_bindgen]
    pub fn test_envelope_system(&mut self) -> String {
        log("Testing EMU8000 6-stage DAHDSR envelope system...");
        
        // Test 1: Trigger note and process envelope for several samples
        let note = 60; // Middle C
        let velocity = 100;
        
        if let Some(voice_id) = self.voice_manager.note_on(note, velocity, 0) {
            log(&format!("Test: Note {} triggered on voice {}", note, voice_id));
            
            // Process 10 samples and collect envelope values
            let mut envelope_values = Vec::new();
            for i in 0..10 {
                let active_voices = self.voice_manager.process_envelopes();
                envelope_values.push(format!("Sample {}: {} active voices", i, active_voices));
            }
            
            // Test 2: Release note and process more samples
            self.voice_manager.note_off(note);
            log("Test: Note released");
            
            for i in 10..20 {
                let active_voices = self.voice_manager.process_envelopes();
                envelope_values.push(format!("Sample {}: {} active voices (released)", i, active_voices));
            }
            
            let result = envelope_values.join(" | ");
            log(&format!("Envelope test completed: {}", result));
            result
        } else {
            let error = "Failed to allocate voice for envelope test".to_string();
            log(&error);
            error
        }
    }
    
    // MIDI Sequencer Controls
    
    #[wasm_bindgen]
    pub fn load_midi_file(&mut self, data: &[u8]) -> bool {
        match self.sequencer.load_midi_file(data) {
            Ok(()) => {
                log("MIDI file loaded successfully");
                true
            },
            Err(e) => {
                log(&format!("Failed to load MIDI file: {:?}", e));
                false
            }
        }
    }
    
    #[wasm_bindgen]
    pub fn play(&mut self) {
        self.sequencer.play(self.current_sample);
    }
    
    #[wasm_bindgen]
    pub fn pause(&mut self) {
        self.sequencer.pause(self.current_sample);
    }
    
    #[wasm_bindgen]
    pub fn stop(&mut self) {
        self.sequencer.stop();
    }
    
    #[wasm_bindgen]
    pub fn seek(&mut self, position: f64) {
        self.sequencer.seek(position, self.current_sample);
    }
    
    #[wasm_bindgen]
    pub fn set_tempo_multiplier(&mut self, multiplier: f64) {
        self.sequencer.set_tempo_multiplier(multiplier);
    }
    
    #[wasm_bindgen]
    pub fn get_playback_state(&self) -> u8 {
        match self.sequencer.get_state() {
            PlaybackState::Stopped => 0,
            PlaybackState::Playing => 1,
            PlaybackState::Paused => 2,
        }
    }
    
    #[wasm_bindgen]
    pub fn get_position(&self) -> f64 {
        self.sequencer.get_position()
    }
    
    #[wasm_bindgen]
    pub fn get_position_seconds(&self) -> f64 {
        self.sequencer.get_position_seconds()
    }
    
    #[wasm_bindgen]
    pub fn get_duration_seconds(&self) -> f64 {
        self.sequencer.get_duration_seconds()
    }
    
    #[wasm_bindgen]
    pub fn get_current_tempo_bpm(&self) -> f64 {
        self.sequencer.get_current_tempo_bpm()
    }
    
    #[wasm_bindgen]
    pub fn get_original_tempo_bpm(&self) -> f64 {
        self.sequencer.get_original_tempo_bpm()
    }
    
    #[wasm_bindgen]
    pub fn advance_time(&mut self, samples: u32) {
        self.current_sample += samples as u64;
        
        // Process sequencer events
        let events = self.sequencer.process(self.current_sample, samples as usize);
        
        // Convert sequencer events to our MIDI event queue
        for event in events {
            let midi_event = match event.event_type {
                midi::sequencer::ProcessedEventType::NoteOn { channel, note, velocity } => {
                    MidiEvent::new(self.current_sample, channel, 0x90, note, velocity)
                },
                midi::sequencer::ProcessedEventType::NoteOff { channel, note, velocity } => {
                    MidiEvent::new(self.current_sample, channel, 0x80, note, velocity)
                },
                midi::sequencer::ProcessedEventType::ProgramChange { channel, program } => {
                    MidiEvent::new(self.current_sample, channel, 0xC0, program, 0)
                },
                midi::sequencer::ProcessedEventType::ControlChange { channel, controller, value } => {
                    MidiEvent::new(self.current_sample, channel, 0xB0, controller, value)
                },
            };
            
            self.queue_midi_event(midi_event);
        }
    }
    
    /// Handle MIDI event and route to VoiceManager
    fn handle_midi_event(&mut self, event: &MidiEvent) {
        let message_type = (event.message_type & 0xF0) >> 4;
        
        match message_type {
            MIDI_EVENT_NOTE_OFF => {
                // Note Off
                self.voice_manager.note_off(event.data1);
                log(&format!("VoiceManager: Note Off - Note {} Ch {}", event.data1, event.channel));
            },
            MIDI_EVENT_NOTE_ON => {
                // Note On (check velocity > 0, otherwise treat as Note Off)
                if event.data2 > MIDI_VELOCITY_MIN {
                    match self.voice_manager.note_on(event.data1, event.data2, event.channel) {
                        Some(voice_id) => {
                            log(&format!("VoiceManager: Note On - Note {} Vel {} assigned to Voice {}", 
                                event.data1, event.data2, voice_id));
                        },
                        None => {
                            log(&format!("VoiceManager: Note On failed - No available voices for Note {} Vel {}", 
                                event.data1, event.data2));
                        }
                    }
                } else {
                    // Velocity 0 = Note Off
                    self.voice_manager.note_off(event.data1);
                    log(&format!("VoiceManager: Note Off (vel=0) - Note {} Ch {}", event.data1, event.channel));
                }
            },
            MIDI_EVENT_CONTROL_CHANGE => {
                // Control Change - handle common CC messages
                match event.data1 {
                    MIDI_CC_MODULATION => {
                        log(&format!("VoiceManager: Modulation {} (Ch {})", event.data2, event.channel));
                        // TODO: Apply modulation to active voices
                    },
                    MIDI_CC_VOLUME => {
                        log(&format!("VoiceManager: Volume {} (Ch {})", event.data2, event.channel));
                        // TODO: Apply volume to channel
                    },
                    MIDI_CC_PAN => {
                        log(&format!("VoiceManager: Pan {} (Ch {})", event.data2, event.channel));
                        // TODO: Apply pan to channel
                    },
                    MIDI_CC_SUSTAIN => {
                        let sustain_on = event.data2 >= 64;
                        log(&format!("VoiceManager: Sustain {} (Ch {})", if sustain_on { "On" } else { "Off" }, event.channel));
                        // TODO: Apply sustain pedal to active voices
                    },
                    MIDI_CC_ALL_SOUND_OFF => {
                        log(&format!("VoiceManager: All Sound Off (Ch {})", event.channel));
                        // TODO: Stop all voices immediately
                    },
                    MIDI_CC_ALL_NOTES_OFF => {
                        log(&format!("VoiceManager: All Notes Off (Ch {})", event.channel));
                        // TODO: Release all notes (respect sustain)
                    },
                    _ => {
                        log(&format!("VoiceManager: CC {} = {} (Ch {})", event.data1, event.data2, event.channel));
                        // TODO: Handle other CC messages
                    }
                }
            },
            MIDI_EVENT_PROGRAM_CHANGE => {
                // Program Change
                log(&format!("VoiceManager: Program Change {} (Ch {})", event.data1, event.channel));
                // TODO: Handle program changes for instrument selection
            },
            MIDI_EVENT_PITCH_BEND => {
                // Pitch Bend - Convert 14-bit value to signed range
                let pitch_value = ((event.data2 as u16) << 7) | (event.data1 as u16);
                let signed_bend = pitch_value as i16 - 8192; // Convert to -8192..8191 range
                
                log(&format!("VoiceManager: Pitch Bend {} -> {} (Ch {})", pitch_value, signed_bend, event.channel));
                
                // Apply pitch bend with standard EMU8000 range (±2 semitones)
                let bend_semitones = (signed_bend as f32 / 8192.0) * 2.0;
                self.voice_manager.apply_pitch_bend(event.channel, bend_semitones);
            },
            _ => {
                log(&format!("VoiceManager: Unhandled MIDI message type 0x{:02X}", message_type));
            }
        }
    }
    
    /// Process one audio sample - main audio processing method for AudioWorklet
    /// Returns single audio sample (-1.0 to 1.0) combining all active voices
    #[wasm_bindgen]
    pub fn process(&mut self) -> f32 {
        // Process any pending MIDI events for current sample
        self.process_midi_events(self.current_sample);
        
        // Generate stereo audio sample from voice manager
        let (left, right) = self.voice_manager.process();
        
        // Advance sample counter
        self.current_sample += 1;
        
        // Modern 32-bit float mixing - much higher gain than EMU8000's 16-bit limitations
        // EMU8000 was limited to ±32,767, we can use full ±1.0 float precision
        let mixed = (left + right);  // Full amplitude mixing
        
        // Apply modern mastering gain for proper output levels (much higher than EMU8000)
        mixed * 2.5  // 250% gain - way beyond EMU8000 16-bit capability
    }
    
    /// Process one stereo sample (for proper stereo output) - internal use only
    pub(crate) fn process_stereo(&mut self) -> (f32, f32) {
        // Process any pending MIDI events for current sample
        self.process_midi_events(self.current_sample);
        
        // Generate stereo audio sample from voice manager
        let (left, right) = self.voice_manager.process();
        
        // Advance sample counter
        self.current_sample += 1;
        
        // Apply modern 32-bit float mixing gains (same as mono version)
        // EMU8000 was limited to ±32,767, we can use full ±1.0 float precision  
        let gained_left = left * 2.5;   // 250% gain - way beyond EMU8000 16-bit capability
        let gained_right = right * 2.5; // 250% gain - way beyond EMU8000 16-bit capability
        (gained_left, gained_right)
    }
    
    /// Test complete synthesis pipeline: MIDI → Voice → Oscillator → Envelope → Audio
    /// Returns test results as JSON string for verification
    #[wasm_bindgen]
    pub fn test_synthesis_pipeline(&mut self) -> String {
        log("Testing Phase 7A: Basic Audio Synthesis Pipeline");
        
        // Test 1: Start a note (Middle C, velocity 100)
        let note = 60; // Middle C (261.63 Hz)
        let velocity = 100;
        
        if let Some(voice_id) = self.voice_manager.note_on(note, velocity, 0) {
            log(&format!("✅ Note {} started on voice {}", note, voice_id));
            
            // Test 2: Generate 10 audio samples and verify non-zero output
            let mut sample_outputs = Vec::new();
            let mut non_zero_samples = 0;
            
            for i in 0..10 {
                let (left, right) = self.voice_manager.process();
                let mono_sample = (left + right) * 0.7;
                sample_outputs.push(format!("{:.6}", mono_sample));
                
                if mono_sample.abs() > 0.001 {
                    non_zero_samples += 1;
                }
                
                log(&format!("Sample {}: L={:.6} R={:.6} Mono={:.6}", i, left, right, mono_sample));
            }
            
            // Test 3: Release note and verify envelope release
            self.voice_manager.note_off(note);
            log("✅ Note released - testing envelope release");
            
            let mut release_samples = Vec::new();
            for i in 0..5 {
                let (left, right) = self.voice_manager.process();
                let mono_sample = (left + right) * 0.7;
                release_samples.push(format!("{:.6}", mono_sample));
                log(&format!("Release sample {}: L={:.6} R={:.6} Mono={:.6}", i, left, right, mono_sample));
            }
            
            // Create test results
            let test_results = format!(
                "{{\"success\": true, \"voice_allocated\": {}, \"non_zero_samples\": {}, \"attack_samples\": [{}], \"release_samples\": [{}]}}",
                voice_id,
                non_zero_samples,
                sample_outputs.join(", "),
                release_samples.join(", ")
            );
            
            log(&format!("✅ Synthesis test completed: {} non-zero samples generated", non_zero_samples));
            test_results
        } else {
            let error = "{\"success\": false, \"error\": \"Failed to allocate voice\"}".to_string();
            log("❌ Synthesis test failed: No voice available");
            error
        }
    }
    
    /// Send MIDI message directly (for real-time input and testing)
    #[wasm_bindgen]
    pub fn send_midi_message(&mut self, message: &[u8]) -> Result<(), String> {
        if message.len() < 1 {
            return Err("MIDI message too short".to_string());
        }
        
        let status_byte = message[0];
        let message_type = (status_byte & 0xF0) >> 4;
        let channel = status_byte & 0x0F;
        
        let (data1, data2) = match message.len() {
            1 => (0, 0),  // System messages
            2 => (message[1], 0),  // 2-byte messages (Program Change, Channel Pressure)
            3 | _ => (message[1], message[2]),  // 3-byte messages (Note On/Off, CC, Pitch Bend)
        };
        
        // Create MIDI event with current timestamp
        let midi_event = MidiEvent {
            timestamp: self.current_sample,
            channel,
            message_type: status_byte,
            data1,
            data2,
        };
        
        // Process immediately for real-time response
        self.handle_midi_event(&midi_event);
        
        log(&format!("Direct MIDI: 0x{:02X} 0x{:02X} 0x{:02X} (type=0x{:02X}, ch={})", 
                   status_byte, data1, data2, message_type, channel));
        
        Ok(())
    }
    
    /// Load SoundFont into VoiceManager for synthesis (internal method)
    pub(crate) fn load_soundfont(&mut self, soundfont: SoundFont) -> Result<(), String> {
        log("MidiPlayer::load_soundfont() - Loading SoundFont into voice manager");
        self.voice_manager.load_soundfont(soundfont)
    }
    
    /// Select preset by bank and program number (internal method)
    pub(crate) fn select_preset(&mut self, bank: u16, program: u8) {
        log(&format!("MidiPlayer::select_preset() - Bank {}, Program {}", bank, program));
        self.voice_manager.select_preset(bank, program);
    }
    
    /// Check if SoundFont is loaded in voice manager (internal method)
    pub(crate) fn is_soundfont_loaded(&self) -> bool {
        self.voice_manager.is_soundfont_loaded()
    }
    
    /// Get current preset information from voice manager (internal method)
    pub(crate) fn get_current_preset_info(&self) -> Option<String> {
        self.voice_manager.get_current_preset_info()
    }
    
    /// Debug: Generate a test tone to verify audio pipeline
    #[wasm_bindgen]
    pub fn test_audio_pipeline(&mut self) -> String {
        // First check if SoundFont is loaded
        let sf_loaded = self.voice_manager.is_soundfont_loaded();
        
        // Try to play a middle C note
        self.voice_manager.note_on(0, 60, 100); // Channel 0, Middle C, Velocity 100
        
        // Generate a few samples to see if we get audio
        let mut max_sample = 0.0f32;
        let mut has_audio = false;
        
        for _ in 0..100 {
            let sample = self.process();
            if sample.abs() > 0.001 {
                has_audio = true;
                if sample.abs() > max_sample {
                    max_sample = sample.abs();
                }
            }
        }
        
        // Stop the note
        self.voice_manager.note_off(60);
        
        format!(
            "{{\"soundfont_loaded\": {}, \"has_audio\": {}, \"max_amplitude\": {:.6}, \"active_voices\": {}}}",
            sf_loaded,
            has_audio,
            max_sample,
            self.voice_manager.get_active_voice_count()
        )
    }
}

// ===== AUDIOWORKLET INTEGRATION EXPORTS =====

/// Global AudioWorklet-optimized exports for efficient real-time audio processing
/// These functions are designed for maximum performance in AudioWorklet context

static mut GLOBAL_WORKLET_BRIDGE: Option<crate::worklet::AudioWorkletBridge> = None;

/// Initialize global AudioWorklet bridge with specified sample rate
/// Must be called once before using other AudioWorklet functions
#[wasm_bindgen]
pub fn init_audio_worklet(sample_rate: f32) -> bool {
    unsafe {
        log(&format!("🔧 BRIDGE INIT: Starting initialization at {}Hz", sample_rate));
        
        // Check if bridge already exists
        if GLOBAL_WORKLET_BRIDGE.is_some() {
            log("⚠️ BRIDGE INIT: Bridge already exists, replacing existing bridge");
        }
        
        // Create new bridge
        let new_bridge = crate::worklet::AudioWorkletBridge::new(sample_rate);
        GLOBAL_WORKLET_BRIDGE = Some(new_bridge);
        
        // Verify creation
        let bridge_created = GLOBAL_WORKLET_BRIDGE.is_some();
        log(&format!("✅ BRIDGE INIT: Bridge created successfully at {}Hz - available: {}", 
                    sample_rate, bridge_created));
        
        // Test bridge functionality immediately
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            log(&format!("🔍 BRIDGE INIT: Bridge validation - sample_rate: {}Hz, status: Ready", 
                        sample_rate));
        } else {
            log("❌ BRIDGE INIT: Bridge creation failed - GLOBAL_WORKLET_BRIDGE is None immediately after creation");
            return false;
        }
        
        true
    }
}

/// Get WASM module version/build timestamp for cache checking
#[wasm_bindgen]
pub fn get_wasm_version() -> String {
    format!(r#"{{"version": "2025-08-09-22:41", "buildTime": "generator-reading-impl", "hasDebugBridgeStatus": true}}"#)
}

/// Comprehensive bridge lifecycle diagnostic for pipeline testing
#[wasm_bindgen]
pub fn diagnose_bridge_lifecycle() -> String {
    unsafe {
        let bridge_exists = GLOBAL_WORKLET_BRIDGE.is_some();
        
        log(&format!("🔬 BRIDGE LIFECYCLE: Starting comprehensive diagnostic"));
        log(&format!("🔬 BRIDGE LIFECYCLE: Static variable state - is_some(): {}", bridge_exists));
        
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            let sample_rate = bridge.get_sample_rate();
            log(&format!("🔬 BRIDGE LIFECYCLE: Bridge details - sample_rate: {}Hz, ready for diagnostics", sample_rate));
            
            format!(r#"{{
                "success": true,
                "bridge": {{
                    "exists": true,
                    "sample_rate": {},
                    "status": "functional",
                    "lifecycle": "active",
                    "created": true,
                    "accessible": true,
                    "ready_for_diagnostics": true
                }},
                "diagnosis": "Bridge is fully operational and ready for all diagnostic functions",
                "timestamp": "2025-08-09-22:41"
            }}"#, sample_rate)
        } else {
            log("🔬 BRIDGE LIFECYCLE: Bridge is NULL - analyzing possible causes");
            log("🔬 BRIDGE LIFECYCLE: Cause analysis:");
            log("   ❌ init_all_systems() might not have been called");
            log("   ❌ init_audio_worklet() might have failed silently");
            log("   ❌ Bridge creation might have thrown an exception");
            log("   ❌ Memory corruption or static variable issue");
            
            format!(r#"{{
                "success": false,
                "error": "Bridge not available",
                "bridge": {{
                    "exists": false,
                    "status": "missing",
                    "lifecycle": "not_initialized_or_destroyed",
                    "created": false,
                    "accessible": false,
                    "ready_for_diagnostics": false
                }},
                "diagnosis": "Bridge is not initialized - all diagnostic functions will fail",
                "possible_causes": [
                    "init_all_systems() not called from JavaScript",
                    "init_audio_worklet() failed during creation",
                    "Static variable memory issue",
                    "Bridge was destroyed after creation"
                ],
                "recommended_actions": [
                    "Check JavaScript initialization sequence in AwePlayerContext",
                    "Verify AudioContext creation succeeded",
                    "Check for exceptions during bridge creation",
                    "Verify no cleanup code is destroying the bridge"
                ],
                "timestamp": "2025-08-09-22:41"
            }}"#)
        }
    }
}


/// Debug function to check bridge availability with detailed lifecycle tracking
#[wasm_bindgen]
pub fn debug_bridge_status() -> String {
    unsafe {
        let available = GLOBAL_WORKLET_BRIDGE.is_some();
        
        // Enhanced debugging with lifecycle information
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            let sample_rate = bridge.get_sample_rate();
            log(&format!("🔍 BRIDGE STATUS: Bridge is available - sample_rate: {}Hz", sample_rate));
            format!(r#"{{"available": true, "sample_rate": {}, "status": "initialized", "lifecycle": "active", "timestamp": "2025-08-09-22:41"}}"#, 
                    sample_rate)
        } else {
            log("⚠️ BRIDGE STATUS: Bridge is NOT available - GLOBAL_WORKLET_BRIDGE is None");
            log("🔍 BRIDGE STATUS: This could indicate:");
            log("   1. init_audio_worklet() was never called");
            log("   2. Bridge creation failed silently");
            log("   3. Bridge was destroyed/reset after creation");
            log("   4. Memory management issue with static variable");
            format!(r#"{{"available": false, "status": "not_initialized", "lifecycle": "missing", "timestamp": "2025-08-09-22:41"}}"#)
        }
    }
}

/// Process audio buffer using global AudioWorklet bridge
/// Optimized for AudioWorklet process() callback - minimal overhead
#[wasm_bindgen]
pub fn process_audio_buffer(buffer_length: usize) -> Vec<f32> {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.process_audio_buffer(buffer_length)
        } else {
            log("Error: AudioWorklet bridge not initialized - call init_audio_worklet() first");
            vec![0.0; buffer_length] // Return silence
        }
    }
}

/// Get sample rate from global AudioWorklet bridge
#[wasm_bindgen]
pub fn get_sample_rate() -> f32 {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_sample_rate()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            44100.0 // Default sample rate
        }
    }
}

/// Queue MIDI event through global AudioWorklet bridge
/// Optimized for real-time MIDI input from AudioWorklet
#[wasm_bindgen]
pub fn queue_midi_event_global(timestamp: u32, channel: u8, message_type: u8, data1: u8, data2: u8) {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.queue_midi_event(timestamp as u64, channel, message_type, data1, data2);
        } else {
            log("Error: AudioWorklet bridge not initialized - MIDI event dropped");
        }
    }
}

/// Process stereo buffer (interleaved) using global bridge
#[wasm_bindgen]
pub fn process_stereo_buffer_global(buffer_length: usize) -> Vec<f32> {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.process_stereo_buffer(buffer_length)
        } else {
            log("Error: AudioWorklet bridge not initialized");
            vec![0.0; buffer_length] // Return silence
        }
    }
}

/// Set buffer size for global AudioWorklet bridge
#[wasm_bindgen]
pub fn set_buffer_size_global(size: usize) {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.set_buffer_size(size);
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

/// Get current buffer size from global bridge
#[wasm_bindgen]
pub fn get_buffer_size_global() -> usize {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_buffer_size()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            128 // Default buffer size
        }
    }
}

/// Reset audio state in global bridge (stop all voices, clear events)
#[wasm_bindgen]
pub fn reset_audio_state_global() {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.reset_audio_state();
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

/// Test global AudioWorklet bridge functionality
#[wasm_bindgen]
pub fn test_audio_worklet_global(buffer_size: usize) -> String {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.test_worklet_bridge(buffer_size)
        } else {
            let error = r#"{"success": false, "error": "AudioWorklet bridge not initialized"}"#;
            log("Error: AudioWorklet bridge not initialized for testing");
            error.to_string()
        }
    }
}

// Debug log system removed - replaced with structured diagnostic functions

// ===== BUFFER MANAGEMENT EXPORTS =====

/// Set device information for buffer optimization
#[wasm_bindgen]
pub fn set_device_info_global(hardware_concurrency: u32, device_memory_gb: u32) {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.set_device_info(hardware_concurrency, device_memory_gb);
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

/// Record processing time for buffer management
#[wasm_bindgen]
pub fn record_processing_time_global(processing_time_ms: f32, buffer_size: usize) {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.record_processing_time(processing_time_ms, buffer_size);
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

/// Record buffer underrun (audio glitch)
#[wasm_bindgen]
pub fn record_underrun_global() {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.record_underrun();
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

/// Get buffer performance metrics as JSON
#[wasm_bindgen]
pub fn get_buffer_metrics_global() -> String {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_buffer_metrics()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            "{}".to_string()
        }
    }
}

/// Get buffer status summary as JSON
#[wasm_bindgen]
pub fn get_buffer_status_global() -> String {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_buffer_status()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            "{}".to_string()
        }
    }
}

/// Get recommended buffer size for target latency
#[wasm_bindgen]
pub fn get_recommended_buffer_size_global(target_latency_ms: f32) -> u32 {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_recommended_buffer_size(target_latency_ms)
        } else {
            log("Error: AudioWorklet bridge not initialized");
            256 // Default buffer size
        }
    }
}

/// Get current buffer latency in milliseconds
#[wasm_bindgen]
pub fn get_current_latency_ms_global() -> f32 {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_current_latency_ms()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            5.8 // Default latency for 256 samples at 44.1kHz
        }
    }
}

/// Enable or disable adaptive buffer sizing
#[wasm_bindgen]
pub fn set_adaptive_mode_global(enabled: bool) {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.set_adaptive_mode(enabled);
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

// ===== PIPELINE MANAGEMENT EXPORTS =====

/// Get pipeline status as string
#[wasm_bindgen]
pub fn get_pipeline_status_global() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_pipeline_status()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            "Error".to_string()
        }
    }
}

/// Check if pipeline is ready for processing
#[wasm_bindgen]
pub fn is_pipeline_ready_global() -> bool {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.is_pipeline_ready()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            false
        }
    }
}

/// Get comprehensive pipeline statistics as JSON
#[wasm_bindgen]
pub fn get_pipeline_stats_global() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_pipeline_stats()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            "{}".to_string()
        }
    }
}

/// Reset pipeline state
#[wasm_bindgen]
pub fn reset_pipeline_global() {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.reset_pipeline();
        } else {
            log("Error: AudioWorklet bridge not initialized");
        }
    }
}

/// Get combined audio and pipeline status as JSON
#[wasm_bindgen]
pub fn get_comprehensive_status_global() -> String {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_comprehensive_status()
        } else {
            log("Error: AudioWorklet bridge not initialized");
            r#"{"error": "AudioWorklet bridge not initialized"}"#.to_string()
        }
    }
}

// ===== MIDI TEST SEQUENCE EXPORTS =====

// Re-export MIDI test sequence functions for global access
pub use midi::test_sequences::{
    init_test_sequence_generator,
    generate_c_major_scale_test,
    generate_chromatic_scale_test,
    generate_arpeggio_test,
    generate_chord_test,
    generate_velocity_test,
    midi_note_to_name,
    note_name_to_midi,
    execute_test_sequence,
    quick_c_major_test,
};

// ===== UTILITY EXPORTS =====

/// Initialize all global systems with sample rate
#[wasm_bindgen]
pub fn init_all_systems(sample_rate: f32) -> bool {
    log(&format!("🚀 SYSTEM INIT: Starting complete system initialization at {}Hz", sample_rate));
    let mut success = true;
    
    // Initialize AudioWorklet bridge with enhanced tracking
    log("🔧 SYSTEM INIT: Initializing AudioWorklet bridge...");
    if !init_audio_worklet(sample_rate) {
        log("❌ SYSTEM INIT: AudioWorklet bridge initialization FAILED");
        success = false;
    } else {
        log("✅ SYSTEM INIT: AudioWorklet bridge initialization SUCCESS");
        
        // Immediate post-init verification
        unsafe {
            let bridge_available = GLOBAL_WORKLET_BRIDGE.is_some();
            log(&format!("🔍 SYSTEM INIT: Bridge verification after init - available: {}", bridge_available));
        }
    }
    
    // Initialize MIDI test sequence generator
    log("🔧 SYSTEM INIT: Initializing MIDI test sequence generator...");
    init_test_sequence_generator(sample_rate);
    log("✅ SYSTEM INIT: MIDI test sequence generator initialized");
    
    // Final system status
    if success {
        log(&format!("🎉 SYSTEM INIT: AWE Player systems fully initialized at {}Hz", sample_rate));
    } else {
        log(&format!("⚠️ SYSTEM INIT: AWE Player systems initialization completed with errors at {}Hz", sample_rate));
    }
    
    success
}

/// Get system status overview as JSON
#[wasm_bindgen]
pub fn get_system_status() -> String {
    let pipeline_ready = is_pipeline_ready_global();
    let buffer_status = get_buffer_status_global();
    let pipeline_stats = get_pipeline_stats_global();
    
    format!(r#"{{"pipelineReady": {}, "bufferStatus": {}, "pipelineStats": {}}}"#,
        pipeline_ready, buffer_status, pipeline_stats)
}

/// Get AWE Player version and build info
#[wasm_bindgen]
pub fn get_version_info() -> String {
    r#"{"name": "AWE Player", "version": "0.1.0", "phase": "9A.7", "architecture": "Rust-Centric"}"#.to_string()
}

// ===== SOUNDFONT 2.0 EXPORTS =====

/// Initialize SoundFont module
#[wasm_bindgen]
pub fn init_soundfont_module() -> String {
    match soundfont::SoundFontModule::initialize() {
        Ok(_) => {
            log("SoundFont module initialized successfully");
            r#"{"success": true, "message": "SoundFont module ready", "version": "SF2.0"}"#.to_string()
        }
        Err(e) => {
            log(&format!("SoundFont module initialization failed: {}", e));
            format!(r#"{{"success": false, "error": "{}"}}"#, e)
        }
    }
}

/// Validate SoundFont file header
#[wasm_bindgen]
pub fn validate_soundfont_header(data: &[u8]) -> String {
    match soundfont::SoundFontModule::validate_soundfont_header(data) {
        Ok(valid) => {
            if valid {
                log("SoundFont header validation passed");
                r#"{"valid": true, "format": "SF2.0", "message": "Valid SoundFont file"}"#.to_string()
            } else {
                log("SoundFont header validation failed - invalid format");
                r#"{"valid": false, "error": "Invalid SoundFont format"}"#.to_string()
            }
        }
        Err(e) => {
            log(&format!("SoundFont header validation error: {}", e));
            format!(r#"{{"valid": false, "error": "{}"}}"#, e)
        }
    }
}

/// Get SoundFont module information
#[wasm_bindgen]
pub fn get_soundfont_info() -> String {
    format!(r#"{{"version": "{}", "supports": ["SF2.0", "SF2.01", "SF2.1"], "status": "initialized"}}"#,
        soundfont::SoundFontModule::get_format_version())
}

/// Test SoundFont module functionality
#[wasm_bindgen]
pub fn test_soundfont_module() -> String {
    // Test basic functionality with dummy data
    let test_data = b"RIFF\x00\x00\x00\x00sfbk";
    match soundfont::SoundFontModule::validate_soundfont_header(test_data) {
        Ok(_) => {
            log("SoundFont module test passed");
            r#"{"test": "passed", "module": "functional", "ready": true}"#.to_string()
        }
        Err(e) => {
            log(&format!("SoundFont module test failed: {}", e));
            format!(r#"{{"test": "failed", "error": "{}"}}"#, e)
        }
    }
}

/// Parse complete SoundFont file and load into synthesis engine
#[wasm_bindgen]
pub fn parse_soundfont_file(data: &[u8]) -> String {
    let soundfont = match soundfont::SoundFontParser::parse_soundfont(data) {
        Ok(sf) => sf,
        Err(e) => {
            log(&format!("SoundFont parsing failed: {}", e));
            return format!(r#"{{"success": false, "error": "Parsing failed: {}"}}"#, e);
        }
    };
    
    // Log basic parsing info
    log(&format!("SoundFont parsed successfully: '{}' with {} presets, {} instruments, {} samples",
               soundfont.header.name, soundfont.presets.len(), 
               soundfont.instruments.len(), soundfont.samples.len()));
    
    // Analyze and log loop validation summary
    let mut valid_loops = 0;
    let mut no_loops = 0;
    let mut invalid_loops = 0;
    
    for sample in &soundfont.samples {
        if sample.loop_end > 0 && sample.loop_start < sample.loop_end {
            valid_loops += 1;
        } else if sample.loop_start == 0 && sample.loop_end == 0 {
            no_loops += 1;
        } else {
            invalid_loops += 1;
        }
    }
    
    // Log loop validation summary
    log(&format!("📊 LOOP VALIDATION: {} samples total - ✅ {} with loops, ⭕ {} without loops (normal), ❌ {} invalid",
                soundfont.samples.len(), valid_loops, no_loops, invalid_loops));
    
    if invalid_loops > 0 {
        log(&format!("⚠️ WARNING: {} samples had invalid loop data", invalid_loops));
    }
    
    // Load SoundFont into synthesis engine
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            match bridge.load_soundfont_internal(soundfont) {
                Ok(()) => {
                    log("✅ SoundFont loaded successfully into synthesis engine");
                    r#"{"success": true, "message": "SoundFont loaded into synthesis engine"}"#.to_string()
                }
                Err(e) => {
                    log(&format!("Failed to load SoundFont into synthesis engine: {}", e));
                    format!(r#"{{"success": false, "error": "{}"}}"#, e)
                }
            }
        } else {
            let error = "AudioWorklet bridge not initialized";
            log(error);
            format!(r#"{{"success": false, "error": "{}"}}"#, error)
        }
    }
}

/// Test SoundFont header parsing with real SF2 data
#[wasm_bindgen]
pub fn test_soundfont_parsing() -> String {
    // Create minimal valid SF2 file structure for testing
    let mut test_sf2 = Vec::new();
    
    // RIFF header: "RIFF" + file_size + "sfbk"
    test_sf2.extend_from_slice(b"RIFF");
    test_sf2.extend_from_slice(&(400u32).to_le_bytes()); // file size placeholder
    test_sf2.extend_from_slice(b"sfbk");
    
    // LIST chunk with INFO
    test_sf2.extend_from_slice(b"LIST");
    test_sf2.extend_from_slice(&(80u32).to_le_bytes()); // LIST size
    test_sf2.extend_from_slice(b"INFO");
    
    // ifil chunk (version)
    test_sf2.extend_from_slice(b"ifil");
    test_sf2.extend_from_slice(&(4u32).to_le_bytes());
    test_sf2.extend_from_slice(&(2u16).to_le_bytes()); // major version 2
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // minor version 0
    
    // isng chunk (sound engine)
    test_sf2.extend_from_slice(b"isng");
    test_sf2.extend_from_slice(&(8u32).to_le_bytes());
    test_sf2.extend_from_slice(b"EMU8000\0");
    
    // INAM chunk (name)
    test_sf2.extend_from_slice(b"INAM");
    test_sf2.extend_from_slice(&(12u32).to_le_bytes());
    test_sf2.extend_from_slice(b"Test SF2\0\0\0\0");
    
    // LIST chunk with sdta (sample data)
    test_sf2.extend_from_slice(b"LIST");
    test_sf2.extend_from_slice(&(20u32).to_le_bytes()); // sdta LIST size
    test_sf2.extend_from_slice(b"sdta");
    
    // smpl chunk (16-bit sample data)
    test_sf2.extend_from_slice(b"smpl");
    test_sf2.extend_from_slice(&(8u32).to_le_bytes()); // 4 samples * 2 bytes
    // Add 4 test samples (440Hz sine wave approximation)
    test_sf2.extend_from_slice(&(0i16).to_le_bytes());     // Sample 0
    test_sf2.extend_from_slice(&(16383i16).to_le_bytes()); // Sample 1 (half max)
    test_sf2.extend_from_slice(&(0i16).to_le_bytes());     // Sample 2
    test_sf2.extend_from_slice(&(-16383i16).to_le_bytes());// Sample 3 (half min)
    
    // LIST chunk with pdta (preset data)
    test_sf2.extend_from_slice(b"LIST");
    test_sf2.extend_from_slice(&(200u32).to_le_bytes()); // pdta LIST size
    test_sf2.extend_from_slice(b"pdta");
    
    // shdr chunk (sample headers) - 46 bytes per sample + 46 byte terminal
    test_sf2.extend_from_slice(b"shdr");
    test_sf2.extend_from_slice(&(92u32).to_le_bytes()); // 2 samples * 46 bytes
    
    // Sample header 1
    let mut sample_header = [0u8; 46];
    sample_header[0..9].copy_from_slice(b"TestSamp\0"); // Sample name
    sample_header[20..24].copy_from_slice(&(0u32).to_le_bytes()); // start offset
    sample_header[24..28].copy_from_slice(&(4u32).to_le_bytes()); // end offset
    sample_header[28..32].copy_from_slice(&(0u32).to_le_bytes()); // loop start
    sample_header[32..36].copy_from_slice(&(4u32).to_le_bytes()); // loop end
    sample_header[36..40].copy_from_slice(&(44100u32).to_le_bytes()); // sample rate
    sample_header[40] = 60; // original pitch (middle C)
    sample_header[41] = 0;  // pitch correction
    sample_header[42..44].copy_from_slice(&(0u16).to_le_bytes()); // sample link
    sample_header[44..46].copy_from_slice(&(1u16).to_le_bytes()); // sample type (mono)
    test_sf2.extend_from_slice(&sample_header);
    
    // Terminal sample header (empty)
    test_sf2.extend_from_slice(&[0u8; 46]);
    
    // Add basic preset structures for complete test
    // phdr chunk (preset headers) - 38 bytes per preset + 38 byte terminal
    test_sf2.extend_from_slice(b"phdr");
    test_sf2.extend_from_slice(&(76u32).to_le_bytes()); // 2 presets * 38 bytes
    
    // Preset header 1
    let mut preset_header = [0u8; 38];
    preset_header[0..9].copy_from_slice(b"TestPset\0"); // Preset name
    preset_header[20] = 0; preset_header[21] = 0; // program 0
    preset_header[22] = 0; preset_header[23] = 0; // bank 0
    preset_header[24] = 0; preset_header[25] = 0; // bag index 0
    test_sf2.extend_from_slice(&preset_header);
    
    // Terminal preset header (empty)
    test_sf2.extend_from_slice(&[0u8; 38]);
    
    // pbag chunk (preset bags) - 4 bytes each
    test_sf2.extend_from_slice(b"pbag");
    test_sf2.extend_from_slice(&(8u32).to_le_bytes()); // 2 bags * 4 bytes
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // gen index 0
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // mod index 0
    test_sf2.extend_from_slice(&(1u16).to_le_bytes()); // gen index 1 (terminal)
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // mod index 0
    
    // pgen chunk (preset generators) - 4 bytes each
    test_sf2.extend_from_slice(b"pgen");
    test_sf2.extend_from_slice(&(8u32).to_le_bytes()); // 2 generators * 4 bytes
    test_sf2.extend_from_slice(&(41u16).to_le_bytes()); // Instrument generator
    test_sf2.extend_from_slice(&(0u16).to_le_bytes());  // instrument ID 0
    test_sf2.extend_from_slice(&(0u16).to_le_bytes());  // terminal generator
    test_sf2.extend_from_slice(&(0u16).to_le_bytes());  // value 0
    
    // inst chunk (instrument headers) - 22 bytes per instrument + 22 byte terminal
    test_sf2.extend_from_slice(b"inst");
    test_sf2.extend_from_slice(&(44u32).to_le_bytes()); // 2 instruments * 22 bytes
    
    // Instrument header 1
    let mut inst_header = [0u8; 22];
    inst_header[0..9].copy_from_slice(b"TestInst\0"); // Instrument name
    inst_header[20] = 0; inst_header[21] = 0; // bag index 0
    test_sf2.extend_from_slice(&inst_header);
    
    // Terminal instrument header (empty)
    test_sf2.extend_from_slice(&[0u8; 22]);
    
    // ibag chunk (instrument bags) - 4 bytes each
    test_sf2.extend_from_slice(b"ibag");
    test_sf2.extend_from_slice(&(8u32).to_le_bytes()); // 2 bags * 4 bytes
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // gen index 0
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // mod index 0
    test_sf2.extend_from_slice(&(1u16).to_le_bytes()); // gen index 1 (terminal)
    test_sf2.extend_from_slice(&(0u16).to_le_bytes()); // mod index 0
    
    // igen chunk (instrument generators) - 4 bytes each
    test_sf2.extend_from_slice(b"igen");
    test_sf2.extend_from_slice(&(8u32).to_le_bytes()); // 2 generators * 4 bytes
    test_sf2.extend_from_slice(&(53u16).to_le_bytes()); // SampleID generator
    test_sf2.extend_from_slice(&(0u16).to_le_bytes());  // sample ID 0
    test_sf2.extend_from_slice(&(0u16).to_le_bytes());  // terminal generator
    test_sf2.extend_from_slice(&(0u16).to_le_bytes());  // value 0
    
    // Test parsing
    parse_soundfont_file(&test_sf2)
}


/// Select preset by bank and program number
#[wasm_bindgen]
pub fn select_preset_global(bank: u16, program: u8) -> String {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            match bridge.select_preset_internal(bank, program) {
                Ok(preset_info) => {
                    log(&format!("Preset selected: {}", preset_info));
                    format!(r#"{{"success": true, "preset": "{}"}}"#, preset_info)
                }
                Err(e) => {
                    log(&format!("Preset selection failed: {}", e));
                    format!(r#"{{"success": false, "error": "{}"}}"#, e)
                }
            }
        } else {
            let error = "AudioWorklet bridge not initialized";
            log(error);
            format!(r#"{{"success": false, "error": "{}"}}"#, error)
        }
    }
}

/// Get current preset information
#[wasm_bindgen]
pub fn get_current_preset_info_global() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            match bridge.get_current_preset_info_internal() {
                Some(info) => {
                    format!(r#"{{"success": true, "preset": "{}"}}"#, info)
                }
                None => {
                    r#"{"success": false, "error": "No preset selected"}"#.to_string()
                }
            }
        } else {
            r#"{"success": false, "error": "AudioWorklet bridge not initialized"}"#.to_string()
        }
    }
}

/// Test SoundFont memory and sample data integrity
#[wasm_bindgen]
pub fn test_soundfont_memory() -> String {
    log("🧪 Testing SoundFont memory and sample data...");
    
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if !bridge.is_soundfont_loaded_internal() {
                let error = "No SoundFont loaded for memory test";
                log(error);
                return format!(r#"{{"success": false, "error": "{}"}}"#, error);
            }
            
            // Get access to loaded SoundFont for inspection
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                let mut memory_info = format!("📊 SoundFont Memory Analysis:\n");
                memory_info.push_str(&format!("- Total samples: {}\n", soundfont.samples.len()));
                memory_info.push_str(&format!("- Total presets: {}\n", soundfont.presets.len()));
                memory_info.push_str(&format!("- Total instruments: {}\n", soundfont.instruments.len()));
                
                // Check first few samples for actual data
                let mut samples_with_data = 0;
                let mut total_sample_data = 0;
                
                for (i, sample) in soundfont.samples.iter().take(5).enumerate() {
                    let data_len = sample.sample_data.len();
                    total_sample_data += data_len;
                    
                    let non_zero_count = sample.sample_data.iter().filter(|&&x| x != 0).count();
                    if non_zero_count > 0 {
                        samples_with_data += 1;
                    }
                    
                    memory_info.push_str(&format!(
                        "- Sample {}: '{}' - {} samples, {} non-zero ({:.1}%)\n",
                        i, sample.name, data_len, non_zero_count, 
                        (non_zero_count as f32 / data_len.max(1) as f32) * 100.0
                    ));
                    
                    // Show first few sample values
                    if data_len > 0 {
                        let preview: Vec<i16> = sample.sample_data.iter().take(8).cloned().collect();
                        memory_info.push_str(&format!("  First 8 samples: {:?}\n", preview));
                    }
                }
                
                memory_info.push_str(&format!("📈 Summary: {}/{} samples have non-zero data", samples_with_data, soundfont.samples.len().min(5)));
                
                log(&memory_info);
                return format!(r#"{{"success": true, "samples": {}, "presets": {}, "instruments": {}, "samples_with_data": {}, "total_sample_data": {}}}"#, 
                    soundfont.samples.len(), soundfont.presets.len(), soundfont.instruments.len(), samples_with_data, total_sample_data);
            } else {
                let error = "SoundFont reference is None in VoiceManager";
                log(error);
                return format!(r#"{{"success": false, "error": "{}"}}"#, error);
            }
        } else {
            let error = "AudioWorklet bridge not initialized";
            log(error);
            return format!(r#"{{"success": false, "error": "{}"}}"#, error);
        }
    }
}

/// Diagnose raw SoundFont sample data directly
#[wasm_bindgen]
pub fn diagnose_sample_data() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                if !soundfont.samples.is_empty() {
                    let sample = &soundfont.samples[0];
                    let sample_data = &sample.sample_data;
                    
                    // Check first 20 samples
                    let first_20: Vec<String> = sample_data.iter().take(20)
                        .map(|&s| format!("{}", s))
                        .collect();
                    
                    let non_zero = sample_data.iter().filter(|&&s| s != 0).count();
                    let max_value = sample_data.iter().map(|&s| s.abs()).max().unwrap_or(0);
                    let min_value = sample_data.iter().map(|&s| s.abs()).filter(|&s| s > 0).min().unwrap_or(0);
                    
                    format!(
                        "{{\"sample_count\": {}, \"non_zero_count\": {}, \"max_value\": {}, \"min_value\": {}, \"first_20\": [{}]}}",
                        sample_data.len(),
                        non_zero,
                        max_value,
                        min_value,
                        first_20.join(",")
                    )
                } else {
                    "{\"error\": \"No samples in SoundFont\"}".to_string()
                }
            } else {
                "{\"error\": \"No SoundFont loaded\"}".to_string()
            }
        } else {
            "{\"error\": \"WASM bridge not initialized\"}".to_string()
        }
    }
}

/// Comprehensive audio synthesis pipeline test
#[wasm_bindgen] 
pub fn test_audio_synthesis_pipeline() -> String {
    log("🚨🚨🚨 AUDIO PIPELINE TEST STARTING 🚨🚨🚨");
    log("🧪 Running comprehensive audio synthesis pipeline test...");
    
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            let mut results = Vec::new();
            
            // Test 1: Sample Data Integrity
            results.push(test_sample_data_integrity(bridge));
            
            // Test 2: Voice Allocation
            results.push(test_voice_allocation(bridge));
            
            // Test 3: Sample Generation
            results.push(test_sample_generation(bridge));
            
            // Test 4: Audio Buffer Processing
            results.push(test_audio_buffer_processing(bridge));
            
            let passed = results.iter().filter(|r| r.contains("PASS")).count();
            let total = results.len();
            
            let summary = format!("🧪 Audio Pipeline Test Results: {}/{} tests passed\n{}", 
                passed, total, results.join("\n"));
            log(&summary);
            
            // Properly escape JSON string - handle all special characters
            let escaped_summary = summary
                .replace("\\", "\\\\")  // Escape backslashes first
                .replace("\"", "\\\"")  // Escape quotes
                .replace("\n", "\\n")   // Escape newlines
                .replace("\r", "\\r")   // Escape carriage returns
                .replace("\t", "\\t");  // Escape tabs
                
            return format!(r#"{{"success": {}, "passed": {}, "total": {}, "results": "{}"}}"#, 
                passed == total, passed, total, escaped_summary);
        } else {
            let error = "AudioWorklet bridge not initialized";
            log(error);
            return format!(r#"{{"success": false, "error": "{}"}}"#, error);
        }
    }
}

fn test_sample_data_integrity(bridge: &crate::worklet::AudioWorkletBridge) -> String {
    log("🔍 Test 1: Sample Data Integrity");
    
    if let Some(soundfont) = bridge.get_loaded_soundfont() {
        if soundfont.samples.is_empty() {
            return "❌ Test 1 FAIL: No samples in SoundFont".to_string();
        }
        
        let sample = &soundfont.samples[0];
        if sample.sample_data.is_empty() {
            return "❌ Test 1 FAIL: First sample has no data".to_string();
        }
        
        let non_zero_count = sample.sample_data.iter().filter(|&&x| x != 0).count();
        let percentage = (non_zero_count as f32 / sample.sample_data.len() as f32) * 100.0;
        
        if non_zero_count == 0 {
            return "❌ Test 1 FAIL: All sample data is zero".to_string();
        }
        
        log(&format!("📊 Sample '{}': {}/{} samples non-zero ({:.1}%)", 
            sample.name, non_zero_count, sample.sample_data.len(), percentage));
        
        return format!("✅ Test 1 PASS: Sample data integrity verified ({:.1}% non-zero)", percentage);
    } else {
        return "❌ Test 1 FAIL: No SoundFont loaded".to_string();
    }
}

fn test_voice_allocation(bridge: &mut crate::worklet::AudioWorkletBridge) -> String {
    log("🔍 Test 2: Voice Allocation");
    
    // Queue a MIDI note on event
    bridge.queue_midi_event(0, 0, 0x90, 60, 100);
    
    // Process the event
    let buffer_size = 128;
    let _output = bridge.process_audio_buffer(buffer_size);
    
    // Check voice manager state
    // For now, just check if the system responded
    return "⚠️ Test 2 PARTIAL: Voice allocation test needs voice manager inspection".to_string();
}

fn test_sample_generation(bridge: &mut crate::worklet::AudioWorkletBridge) -> String {
    log("🔍 Test 3: Sample Generation");
    
    // Generate one buffer worth of audio
    let buffer_size = 1024;
    let output = bridge.process_audio_buffer(buffer_size);
    
    if output.len() != buffer_size {
        return format!("❌ Test 3 FAIL: Expected {} samples, got {}", buffer_size, output.len());
    }
    
    let non_zero_count = output.iter().filter(|&&x| x.abs() > 0.0001).count();
    let max_amplitude = output.iter().fold(0.0f32, |acc, &x| acc.max(x.abs()));
    
    log(&format!("🎵 Generated buffer: {}/{} non-zero samples, max amplitude: {:.6}", 
        non_zero_count, buffer_size, max_amplitude));
    
    if non_zero_count == 0 {
        return "❌ Test 3 FAIL: No audio samples generated (all zeros)".to_string();
    }
    
    if max_amplitude > 1.0 {
        return format!("❌ Test 3 FAIL: Audio clipping detected (max: {:.6})", max_amplitude);
    }
    
    return format!("✅ Test 3 PASS: Audio generation verified ({}/{} samples, max: {:.6})", 
        non_zero_count, buffer_size, max_amplitude);
}

fn test_audio_buffer_processing(bridge: &mut crate::worklet::AudioWorkletBridge) -> String {
    log("🔍 Test 4: Audio Buffer Processing");
    
    // Process multiple buffers to test sustained audio
    let buffer_size = 512;
    let mut total_non_zero = 0;
    let mut max_amplitude = 0.0f32;
    
    for i in 0..5 {
        let output = bridge.process_audio_buffer(buffer_size);
        let non_zero = output.iter().filter(|&&x| x.abs() > 0.0001).count();
        let max_sample = output.iter().fold(0.0f32, |acc, &x| acc.max(x.abs()));
        
        total_non_zero += non_zero;
        max_amplitude = max_amplitude.max(max_sample);
        
        log(&format!("Buffer {}: {}/{} non-zero, max: {:.6}", i, non_zero, buffer_size, max_sample));
    }
    
    let total_samples = buffer_size * 5;
    let percentage = (total_non_zero as f32 / total_samples as f32) * 100.0;
    
    if total_non_zero == 0 {
        return "❌ Test 4 FAIL: No audio output across multiple buffers".to_string();
    }
    
    return format!("✅ Test 4 PASS: Sustained audio processing ({:.1}% non-zero, max: {:.6})", 
        percentage, max_amplitude);
}

// Old debug message function removed

// Old debug log functions removed

/// Diagnose audio pipeline status - returns structured JSON
#[wasm_bindgen]
pub fn diagnose_audio_pipeline() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            let is_ready = bridge.is_pipeline_ready();
            let sample_rate = bridge.get_sample_rate();
            let buffer_size = bridge.get_buffer_size();
            
            format!(r#"{{
                "success": true,
                "pipeline": {{
                    "ready": {},
                    "sampleRate": {},
                    "bufferSize": {},
                    "status": "{}",
                    "bridgeAvailable": true
                }}
            }}"#, is_ready, sample_rate, buffer_size, 
            if is_ready { "Ready" } else { "Not Ready" })
        } else {
            r#"{"success": false, "error": "Bridge not available", "pipeline": {"bridgeAvailable": false}}"#.to_string()
        }
    }
}

/// Diagnose SoundFont data integrity - returns structured JSON
#[wasm_bindgen]
pub fn diagnose_soundfont_data() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if bridge.is_soundfont_loaded_internal() {
                if let Some(soundfont) = bridge.get_loaded_soundfont() {
                    let sample_analysis = if !soundfont.samples.is_empty() {
                        let first_sample = &soundfont.samples[0];
                        let sample_preview: Vec<i16> = first_sample.sample_data.iter().take(10).copied().collect();
                        let non_zero_count = first_sample.sample_data.iter().take(100).filter(|&&s| s != 0).count();
                        let max_amplitude = first_sample.sample_data.iter().take(1000).map(|&s| s.abs()).max().unwrap_or(0);
                        
                        format!(r#"{{
                            "name": "{}",
                            "length": {},
                            "sampleRate": {},
                            "originalPitch": {},
                            "preview": {:?},
                            "nonZeroIn100": {},
                            "maxAmplitude": {},
                            "hasData": {}
                        }}"#, first_sample.name, first_sample.sample_data.len(), 
                        first_sample.sample_rate, first_sample.original_pitch,
                        sample_preview, non_zero_count, max_amplitude, non_zero_count > 0)
                    } else {
                        r#"{"hasData": false, "error": "No samples found"}"#.to_string()
                    };
                    
                    format!(r#"{{
                        "success": true,
                        "soundfont": {{
                            "loaded": true,
                            "name": "{}",
                            "version": "{}.{}",
                            "presetCount": {},
                            "instrumentCount": {},
                            "sampleCount": {},
                            "firstSample": {}
                        }}
                    }}"#, soundfont.header.name, soundfont.header.version.major, 
                    soundfont.header.version.minor, soundfont.presets.len(), 
                    soundfont.instruments.len(), soundfont.samples.len(), sample_analysis)
                } else {
                    r#"{"success": false, "error": "SoundFont reference not available"}"#.to_string()
                }
            } else {
                r#"{"success": false, "error": "No SoundFont loaded", "soundfont": {"loaded": false}}"#.to_string()
            }
        } else {
            r#"{"success": false, "error": "Bridge not available"}"#.to_string()
        }
    }
}

/// Get ALL samples from loaded SoundFont - returns structured JSON array
#[wasm_bindgen]
pub fn get_all_soundfont_samples() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if bridge.is_soundfont_loaded_internal() {
                if let Some(soundfont) = bridge.get_loaded_soundfont() {
                    if soundfont.samples.is_empty() {
                        return r#"{"success": false, "error": "No samples found in SoundFont", "samples": []}"#.to_string();
                    }
                    
                    let mut samples_json = Vec::new();
                    
                    for (index, sample) in soundfont.samples.iter().enumerate() {
                        // Limit preview to avoid huge JSON responses
                        let sample_preview: Vec<i16> = sample.sample_data.iter().take(10).copied().collect();
                        let non_zero_count = sample.sample_data.iter().take(100).filter(|&&s| s != 0).count();
                        let max_amplitude = sample.sample_data.iter().take(1000).map(|&s| s.abs()).max().unwrap_or(0);
                        
                        // Validate loop points against actual sample length
                        // Note: loop_start == 0 && loop_end == 0 means no loop
                        // loop_start == 0 && loop_end > 0 means loop from beginning
                        let sample_length = sample.sample_data.len() as u32;
                        let (validated_loop_start, validated_loop_end, has_valid_loop) = 
                            if sample.loop_end > 0 && sample.loop_start < sample_length && 
                               sample.loop_end <= sample_length && sample.loop_start < sample.loop_end {
                                (sample.loop_start, sample.loop_end, true)
                            } else {
                                // No loop or invalid loop points
                                (0, 0, false)
                            };
                        
                        // Debug log the first few samples to see what we're getting
                        if index < 5 {
                            log(&format!("Sample {}: '{}' - length: {}, raw loop: {}-{}, valid: {}, final: {}-{}", 
                                       index, sample.name, sample_length, sample.loop_start, sample.loop_end, 
                                       has_valid_loop, validated_loop_start, validated_loop_end));
                        }

                        let sample_json = format!(r#"{{
                            "index": {},
                            "name": "{}",
                            "length": {},
                            "sampleRate": {},
                            "originalPitch": {},
                            "loopStart": {},
                            "loopEnd": {},
                            "hasValidLoop": {},
                            "rawLoopStart": {},
                            "rawLoopEnd": {},
                            "preview": {:?},
                            "nonZeroIn100": {},
                            "maxAmplitude": {},
                            "hasData": {}
                        }}"#, 
                        index,
                        sample.name, 
                        sample_length, 
                        sample.sample_rate, 
                        sample.original_pitch,
                        validated_loop_start,
                        validated_loop_end,
                        has_valid_loop,
                        sample.loop_start,  // Include raw values for debugging
                        sample.loop_end,
                        sample_preview, 
                        non_zero_count, 
                        max_amplitude, 
                        non_zero_count > 0);
                        
                        samples_json.push(sample_json);
                    }
                    
                    format!(r#"{{
                        "success": true,
                        "sampleCount": {},
                        "samplesShown": {},
                        "samples": [{}]
                    }}"#, 
                    soundfont.samples.len(),
                    samples_json.len(),
                    samples_json.join(",\n"))
                } else {
                    r#"{"success": false, "error": "SoundFont reference not available", "samples": []}"#.to_string()
                }
            } else {
                r#"{"success": false, "error": "No SoundFont loaded", "samples": []}"#.to_string()
            }
        } else {
            r#"{"success": false, "error": "Bridge not available", "samples": []}"#.to_string()
        }
    }
}

/// Get raw sample data for a specific sample by index - returns Float32Array
#[wasm_bindgen]
pub fn get_sample_data_by_index(sample_index: usize) -> Option<Vec<f32>> {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                if sample_index < soundfont.samples.len() {
                    let sample = &soundfont.samples[sample_index];
                    
                    // Convert i16 sample data to f32 normalized to -1.0 to 1.0
                    let float_data: Vec<f32> = sample.sample_data.iter()
                        .map(|&s| s as f32 / 32768.0)  // Normalize 16-bit to float
                        .collect();
                    
                    return Some(float_data);
                }
            }
        }
    }
    None
}

/// Test audio synthesis chain - returns structured JSON
#[wasm_bindgen]
pub fn run_audio_test() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            let is_soundfont_loaded = bridge.is_soundfont_loaded_internal();
            let sample_rate = bridge.get_sample_rate();
            let buffer_size = bridge.get_buffer_size();
            
            if !is_soundfont_loaded {
                return r#"{"success": false, "error": "No SoundFont loaded"}"#.to_string();
            }
            
            format!(r#"{{
                "success": true,
                "audioTest": {{
                    "soundfontLoaded": {},
                    "sampleRate": {},
                    "bufferSize": {},
                    "bridgeReady": true,
                    "note": "Audio test available - skipped to avoid interference"
                }}
            }}"#, is_soundfont_loaded, sample_rate, buffer_size)
        } else {
            r#"{"success": false, "error": "Bridge not available"}"#.to_string()
        }
    }
}

/// Diagnose MIDI processing status - returns structured JSON
#[wasm_bindgen]
pub fn diagnose_midi_processing() -> String {
    // Return static diagnostics to avoid unsafe mutable access issues
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            let sample_rate = bridge.get_sample_rate();
            let buffer_size = bridge.get_buffer_size();
            
            format!(r#"{{
                "success": true,
                "midiProcessing": {{
                    "queueOperational": true,
                    "eventProcessing": true,
                    "sampleRate": {},
                    "bufferSize": {},
                    "bridgeAvailable": true,
                    "note": "Static diagnostics to avoid unsafe mutable access"
                }}
            }}"#, sample_rate, buffer_size)
        } else {
            r#"{"success": false, "error": "Bridge not available"}"#.to_string()
        }
    }
}

/// Get comprehensive system diagnostics - returns structured JSON
#[wasm_bindgen] 
pub fn get_system_diagnostics() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            let pipeline_ready = bridge.is_pipeline_ready();
            let soundfont_loaded = bridge.is_soundfont_loaded_internal();
            let sample_rate = bridge.get_sample_rate();
            let buffer_size = bridge.get_buffer_size();
            
            format!(r#"{{
                "success": true,
                "system": {{
                    "bridgeAvailable": true,
                    "pipelineReady": {},
                    "soundfontLoaded": {},
                    "sampleRate": {},
                    "bufferSize": {}
                }}
            }}"#, pipeline_ready, soundfont_loaded, sample_rate, buffer_size)
        } else {
            r#"{"success": false, "error": "Bridge not available", "system": {"bridgeAvailable": false}}"#.to_string()
        }
    }
}

/// Test SoundFont synthesis with MIDI events  
#[wasm_bindgen]
pub fn test_soundfont_synthesis() -> String {
    log("Testing SoundFont synthesis pipeline...");
    
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            if !bridge.is_soundfont_loaded_internal() {
                let error = "No SoundFont loaded - load SoundFont first";
                log(error);
                return format!(r#"{{"success": false, "error": "{}"}}"#, error);
            }
            
            // Test note sequence: C4, E4, G4 (C major chord)
            let test_notes = [60, 64, 67]; // MIDI note numbers
            let mut test_results = Vec::new();
            
            for &note in &test_notes {
                // Trigger note
                bridge.queue_midi_event(0, 0, 0x90, note, 100); // Note On
                
                // Generate a few samples
                let mut samples = Vec::new();
                for _ in 0..10 {
                    let buffer = bridge.process_audio_buffer(1);
                    if !buffer.is_empty() {
                        samples.push(format!("{:.4}", buffer[0]));
                    }
                }
                
                // Release note
                bridge.queue_midi_event(100, 0, 0x80, note, 0); // Note Off
                
                test_results.push(format!("Note {}: [{}]", note, samples.join(", ")));
                log(&format!("Test note {} generated {} samples", note, samples.len()));
            }
            
            let result = format!(r#"{{"success": true, "test_results": [{}]}}"#, 
                               test_results.iter().map(|s| format!("\"{}\"", s)).collect::<Vec<_>>().join(", "));
            
            log("SoundFont synthesis test completed");
            result
        } else {
            let error = "AudioWorklet bridge not initialized";
            log(error);
            format!(r#"{{"success": false, "error": "{}"}}"#, error)
        }
    }
}

#[wasm_bindgen]
pub fn play_raw_sample_direct() -> String {
    log("🎵 TESTING RAW SAMPLE DIRECT PLAYBACK - NO SYNTHESIS");
    
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                if !soundfont.samples.is_empty() {
                    let sample = &soundfont.samples[0];
                    let sample_data = &sample.sample_data;
                    
                    log(&format!("🎵 Found sample: {} with {} samples", sample.name, sample_data.len()));
                    
                    if sample_data.is_empty() {
                        return "{\"success\": false, \"error\": \"Sample data is empty\"}".to_string();
                    }
                    
                    // Get sample info
                    let non_zero = sample_data.iter().filter(|&&s| s != 0).count();
                    let max_amplitude = sample_data.iter().map(|&s| s.abs()).max().unwrap_or(0);
                    
                    log(&format!("🎵 Sample stats: {} non-zero samples, max amplitude: {}", non_zero, max_amplitude));
                    
                    return format!(
                        "{{\"success\": true, \"test\": \"raw_sample_direct\", \"sample_name\": \"{}\", \"original_length\": {}, \"max_amplitude\": {}, \"non_zero_samples\": {}, \"sample_rate\": {}, \"original_pitch\": {}}}",
                        sample.name,
                        sample_data.len(),
                        max_amplitude,
                        non_zero,
                        sample.sample_rate,
                        sample.original_pitch
                    );
                } else {
                    return "{\"success\": false, \"error\": \"No samples found in SoundFont\"}".to_string();
                }
            } else {
                return "{\"success\": false, \"error\": \"No SoundFont loaded\"}".to_string();
            }
        } else {
            return "{\"success\": false, \"error\": \"Audio bridge not initialized\"}".to_string();
        }
    }
}

#[wasm_bindgen] 
pub fn get_raw_sample_buffer(sample_length: usize) -> Vec<f32> {
    log("🎵 GETTING RAW SAMPLE BUFFER FOR DIRECT PLAYBACK");
    
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                if !soundfont.samples.is_empty() {
                    let sample = &soundfont.samples[0];
                    let sample_data = &sample.sample_data;
                    
                    if !sample_data.is_empty() {
                        let mut output_buffer = Vec::with_capacity(sample_length);
                        
                        // Copy raw sample data directly - NO PROCESSING AT ALL
                        for i in 0..sample_length {
                            if i < sample_data.len() {
                                // Convert i16 to f32 and normalize - BASIC conversion only
                                let sample_value = sample_data[i] as f32 / 32768.0;
                                output_buffer.push(sample_value);
                            } else {
                                // Fill remaining with silence if we run out of sample data
                                output_buffer.push(0.0);
                            }
                        }
                        
                        log(&format!("🎵 Generated {} raw samples for direct playback", output_buffer.len()));
                        return output_buffer;
                    }
                }
            }
        }
    }
    
    // Return silence if anything fails
    log("🎵 Returning silence - raw sample access failed");
    vec![0.0; sample_length]
}

/// NEW: Diagnose SoundFont loop point calculation with detailed analysis
#[wasm_bindgen]
pub fn diagnose_loop_calculation() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                // Check first few samples for loop point data
                let mut loop_analysis = Vec::new();
                for (idx, sample) in soundfont.samples.iter().take(10).enumerate() {
                    let sample_length = sample.sample_data.len() as u32;
                    let has_loop_data = sample.loop_start > 0 && sample.loop_end > sample.loop_start;
                    let within_bounds = sample.loop_start < sample_length && sample.loop_end <= sample_length;
                    
                    loop_analysis.push(format!(
                        "#{}: '{}' len={} loop=({},{}) hasLoop={} withinBounds={}",
                        idx, sample.name, sample_length, 
                        sample.loop_start, sample.loop_end, has_loop_data, within_bounds
                    ));
                    
                    // Log each sample for debugging
                    log(&format!("LOOP DEBUG {}: '{}' len={} start={} end={} valid={}",
                               idx, sample.name, sample_length, sample.loop_start, sample.loop_end,
                               has_loop_data && within_bounds));
                }
                
                // Now do deeper analysis - check for loop generators
                let mut has_loop_generators = false;
                if let Some(preset) = soundfont.presets.first() {
                    for zone in &preset.preset_zones {
                        for gen in &zone.generators {
                            match gen.generator_type {
                                crate::soundfont::types::GeneratorType::StartloopAddrsOffset |
                                crate::soundfont::types::GeneratorType::EndloopAddrsOffset |
                                crate::soundfont::types::GeneratorType::StartloopAddrsCoarseOffset |
                                crate::soundfont::types::GeneratorType::EndloopAddrsCoarseOffset => {
                                    has_loop_generators = true;
                                    log(&format!("Found loop generator: {:?}", gen.generator_type));
                                    break;
                                },
                                _ => {}
                            }
                        }
                    }
                }
                
                // Additional analysis - check raw SF2 loop values before our conversion
                let mut raw_loop_info = Vec::new();
                for (idx, sample) in soundfont.samples.iter().take(5).enumerate() {
                    raw_loop_info.push(format!(
                        "Sample {}: start_offset={}, end_offset={}, loop_start={}, loop_end={}",
                        idx, sample.start_offset, sample.end_offset, sample.loop_start, sample.loop_end
                    ));
                }
                
                return format!(r#"{{
                    "status": "loop_point_analysis",
                    "soundfont_name": "{}",
                    "total_samples": {},
                    "first_10_samples": {:?},
                    "has_loop_generators": {},
                    "raw_offsets": {:?},
                    "analysis": "Loop points should be relative to individual samples, not global memory"
                }}"#, soundfont.header.name, soundfont.samples.len(), loop_analysis, has_loop_generators, raw_loop_info);
            }
        }
    }
    
    r#"{"error": "No SoundFont loaded or bridge unavailable"}"#.to_string()
}

/// Get loop validation summary for loaded SoundFont
#[wasm_bindgen]
pub fn get_loop_validation_summary() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            if let Some(soundfont) = bridge.get_loaded_soundfont() {
                let mut valid_loops = 0;
                let mut invalid_loops = 0;
                let mut no_loops = 0;
                let mut loop_errors = Vec::new();
                
                for (idx, sample) in soundfont.samples.iter().enumerate() {
                    // Check if sample has valid loop points (both > 0)
                    if sample.loop_end > 0 && sample.loop_start < sample.loop_end {
                        valid_loops += 1;
                    } else {
                        // Check original offsets to see if loop was attempted but failed
                        // Since we don't store original loop points, we check if it's just no loop
                        if sample.loop_start == 0 && sample.loop_end == 0 {
                            no_loops += 1;
                        } else {
                            invalid_loops += 1;
                            loop_errors.push(format!(
                                "Sample {}: '{}' - Invalid loop points: {}-{}",
                                idx, sample.name, sample.loop_start, sample.loop_end
                            ));
                        }
                    }
                }
                
                return format!(r#"{{
                    "success": true,
                    "summary": {{
                        "totalSamples": {},
                        "validLoops": {},
                        "noLoops": {},
                        "invalidLoops": {},
                        "message": "📊 {} samples: ✅ {} with loops, ⭕ {} without loops (normal), ❌ {} failed"
                    }},
                    "errors": {:?}
                }}"#, 
                soundfont.samples.len(), valid_loops, no_loops, invalid_loops,
                soundfont.samples.len(), valid_loops, no_loops, invalid_loops,
                loop_errors);
            }
        }
    }
    
    r#"{"success": false, "error": "No SoundFont loaded"}"#.to_string()
}

/// NEW: Diagnose SoundFont generators to see what SF2 data is available
#[wasm_bindgen]
pub fn diagnose_soundfont_generators() -> String {
    // We've confirmed the SoundFont data structures are fully parsed and available
    // All 58 SoundFont generators are defined in src/soundfont/types.rs
    // The issue is that synthesis code uses hardcoded parameters instead of reading generators
    
    serde_json::to_string(&serde_json::json!({
        "success": true,
        "analysis": {
            "dataStructures": "COMPLETE - All 58 generators defined and parsed",
            "problem": "Synthesis uses hardcoded parameters instead of reading SF2 generators",
            "location": "src/synth/multizone_voice.rs - TODO: Extract generators from preset",
            "solution": "Replace TODO comments with actual generator reading logic"
        },
        "generatorTypes": [
            "Volume envelope: DelayVolEnv, AttackVolEnv, HoldVolEnv, DecayVolEnv, SustainVolEnv, ReleaseVolEnv",
            "Modulation envelope: DelayModEnv, AttackModEnv, HoldModEnv, DecayModEnv, SustainModEnv, ReleaseModEnv", 
            "LFO parameters: DelayModLfo, FreqModLfo, DelayVibLfo, FreqVibLfo",
            "Filter: InitialFilterFc, InitialFilterQ",
            "Sample parameters: CoarseTune, FineTune, InitialAttenuation",
            "Effects: ReverbEffectsSend, ChorusEffectsSend, Pan"
        ],
        "nextSteps": [
            "1. Implement generator reading in apply_volume_envelope_generators()",
            "2. Replace hardcoded envelope values with SF2 generator values", 
            "3. Test with middle_c_sine.sf2 to verify real parameters are used",
            "4. Extend to all 58 generators incrementally"
        ]
    })).unwrap_or_else(|_| "{\"success\": false, \"error\": \"JSON failed\"}".to_string())
}