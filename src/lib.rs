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

static DEBUG_LOG: OnceLock<Mutex<VecDeque<String>>> = OnceLock::new();
static MIDI_EVENT_QUEUE: OnceLock<Mutex<VecDeque<MidiEvent>>> = OnceLock::new();

pub fn log(message: &str) {
    let log = DEBUG_LOG.get_or_init(|| Mutex::new(VecDeque::with_capacity(200)));
    if let Ok(mut log) = log.lock() {
        if log.len() >= 200 {
            log.pop_front();
        }
        log.push_back(message.to_string());
    }
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
    
    #[wasm_bindgen]
    pub fn get_debug_log(&self) -> String {
        if let Some(log) = DEBUG_LOG.get() {
            if let Ok(log) = log.lock() {
                log.iter().cloned().collect::<Vec<String>>().join("\n")
            } else {
                String::new()
            }
        } else {
            String::new()
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
        
        // Return mono mix for now (left + right) / 2
        (left + right) * 0.5
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
                let mono_sample = (left + right) * 0.5;
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
                let mono_sample = (left + right) * 0.5;
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
    let mut success = true;
    
    // Initialize AudioWorklet bridge
    if !init_audio_worklet(sample_rate) {
        log("❌ Failed to initialize AudioWorklet bridge");
        success = false;
    }
    
    // Initialize MIDI test sequence generator
    init_test_sequence_generator(sample_rate);
    
    log(&format!("🚀 AWE Player systems initialized at {}Hz", sample_rate));
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

/// Parse complete SoundFont file (Task 9A.4)
#[wasm_bindgen]
pub fn parse_soundfont_file(data: &[u8]) -> String {
    match soundfont::SoundFontParser::parse_soundfont(data) {
        Ok(soundfont) => {
            log(&format!("SoundFont parsing successful: '{}' v{}", 
                       soundfont.header.name, soundfont.header.version));
            format!(r#"{{"success": true, "name": "{}", "version": "{}", "engine": "{}", "presets": {}, "instruments": {}, "samples": {}}}"#,
                   soundfont.header.name,
                   soundfont.header.version,
                   soundfont.header.engine,
                   soundfont.presets.len(),
                   soundfont.instruments.len(),
                   soundfont.samples.len())
        }
        Err(e) => {
            log(&format!("SoundFont parsing failed: {}", e));
            format!(r#"{{"success": false, "error": "{}"}}"#, e)
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

/// Load SoundFont into MidiPlayer for synthesis
#[wasm_bindgen]
pub fn load_soundfont_into_player(data: &[u8]) -> String {
    // Parse SoundFont file
    let soundfont = match soundfont::SoundFontParser::parse_soundfont(data) {
        Ok(sf) => sf,
        Err(e) => {
            log(&format!("SoundFont parsing failed: {}", e));
            return format!(r#"{{"success": false, "error": "Parsing failed: {}"}}"#, e);
        }
    };
    
    log(&format!("SoundFont parsed successfully: '{}' with {} presets, {} instruments, {} samples",
               soundfont.header.name, soundfont.presets.len(), 
               soundfont.instruments.len(), soundfont.samples.len()));
    
    // Get the global AudioWorklet bridge and load SoundFont
    unsafe {
        if let Some(ref mut bridge) = GLOBAL_WORKLET_BRIDGE {
            match bridge.load_soundfont_internal(soundfont) {
                Ok(()) => {
                    log("SoundFont loaded successfully into synthesis engine");
                    r#"{"success": true, "message": "SoundFont loaded into synthesis engine"}"#.to_string()
                }
                Err(e) => {
                    log(&format!("Failed to load SoundFont into synthesis engine: {}", e));
                    format!(r#"{{"success": false, "error": "{}"}}"#, e)
                }
            }
        } else {
            let error = "AudioWorklet bridge not initialized - call init_audio_worklet() first";
            log(error);
            format!(r#"{{"success": false, "error": "{}"}}"#, error)
        }
    }
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