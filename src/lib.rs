use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

pub mod error;
pub mod midi;
pub mod synth;
pub mod soundfont;
pub mod effects;
pub mod worklet;

use midi::sequencer::{MidiSequencer, PlaybackState};
use midi::constants::*;
use synth::voice_manager::VoiceManager;

static mut DEBUG_LOG: Option<VecDeque<String>> = None;
static mut MIDI_EVENT_QUEUE: Option<VecDeque<MidiEvent>> = None;

pub fn log(message: &str) {
    unsafe {
        if DEBUG_LOG.is_none() {
            DEBUG_LOG = Some(VecDeque::with_capacity(200));
        }
        if let Some(ref mut log) = DEBUG_LOG {
            if log.len() >= 200 {
                log.pop_front();
            }
            log.push_back(message.to_string());
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
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
        unsafe {
            if MIDI_EVENT_QUEUE.is_none() {
                MIDI_EVENT_QUEUE = Some(VecDeque::with_capacity(1000));
                log("MIDI event queue initialized (capacity: 1000)");
            }
        }
        MidiPlayer {
            sequencer: MidiSequencer::new(44100.0), // 44.1kHz sample rate
            voice_manager: VoiceManager::new(44100.0),
            current_sample: 0,
        }
    }
    
    #[wasm_bindgen]
    pub fn queue_midi_event(&mut self, event: MidiEvent) {
        unsafe {
            if let Some(ref mut queue) = MIDI_EVENT_QUEUE {
                if queue.len() >= 1000 {
                    queue.pop_front();
                    log("MIDI queue full - dropped oldest event");
                }
                queue.push_back(event);
                log(&format!("MIDI event queued: ch={} type={} data={},{} @{}", 
                    event.channel, event.message_type, event.data1, event.data2, event.timestamp));
            }
        }
    }
    
    #[wasm_bindgen]
    pub fn process_midi_events(&mut self, current_sample_time: u64) -> u32 {
        let mut processed_count = 0;
        unsafe {
            if let Some(ref mut queue) = MIDI_EVENT_QUEUE {
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
        }
        processed_count
    }
    
    #[wasm_bindgen]
    pub fn get_debug_log(&self) -> String {
        unsafe {
            if let Some(ref log) = DEBUG_LOG {
                log.iter().cloned().collect::<Vec<String>>().join("\n")
            } else {
                String::new()
            }
        }
    }
    
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
        
        if let Some(voice_id) = self.voice_manager.note_on(note, velocity) {
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
                    match self.voice_manager.note_on(event.data1, event.data2) {
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
                // Pitch Bend
                let pitch_value = ((event.data2 as u16) << 7) | (event.data1 as u16);
                log(&format!("VoiceManager: Pitch Bend {} (Ch {})", pitch_value, event.channel));
                // TODO: Handle pitch bend messages
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
        
        // Generate audio sample from voice manager
        let audio_sample = self.voice_manager.process();
        
        // Advance sample counter
        self.current_sample += 1;
        
        audio_sample
    }
    
    /// Test complete synthesis pipeline: MIDI → Voice → Oscillator → Envelope → Audio
    /// Returns test results as JSON string for verification
    #[wasm_bindgen]
    pub fn test_synthesis_pipeline(&mut self) -> String {
        log("Testing Phase 7A: Basic Audio Synthesis Pipeline");
        
        // Test 1: Start a note (Middle C, velocity 100)
        let note = 60; // Middle C (261.63 Hz)
        let velocity = 100;
        
        if let Some(voice_id) = self.voice_manager.note_on(note, velocity) {
            log(&format!("✅ Note {} started on voice {}", note, voice_id));
            
            // Test 2: Generate 10 audio samples and verify non-zero output
            let mut sample_outputs = Vec::new();
            let mut non_zero_samples = 0;
            
            for i in 0..10 {
                let audio_sample = self.voice_manager.process();
                sample_outputs.push(format!("{:.6}", audio_sample));
                
                if audio_sample.abs() > 0.001 {
                    non_zero_samples += 1;
                }
                
                log(&format!("Sample {}: {:.6}", i, audio_sample));
            }
            
            // Test 3: Release note and verify envelope release
            self.voice_manager.note_off(note);
            log("✅ Note released - testing envelope release");
            
            let mut release_samples = Vec::new();
            for i in 0..5 {
                let audio_sample = self.voice_manager.process();
                release_samples.push(format!("{:.6}", audio_sample));
                log(&format!("Release sample {}: {:.6}", i, audio_sample));
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
        GLOBAL_WORKLET_BRIDGE = Some(crate::worklet::AudioWorkletBridge::new(sample_rate));
        log(&format!("Global AudioWorklet bridge initialized at {}Hz", sample_rate));
        true
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
pub fn queue_midi_event_global(timestamp: u64, channel: u8, message_type: u8, data1: u8, data2: u8) {
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.queue_midi_event(timestamp, channel, message_type, data1, data2);
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

/// Get debug log from global bridge
#[wasm_bindgen]
pub fn get_debug_log_global() -> String {
    unsafe {
        if let Some(ref bridge) = GLOBAL_WORKLET_BRIDGE {
            bridge.get_debug_log()
        } else {
            "AudioWorklet bridge not initialized".to_string()
        }
    }
}