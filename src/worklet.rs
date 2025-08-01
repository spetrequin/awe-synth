/**
 * AWE Player - AudioWorkletProcessor Bridge
 * Part of AWE Player EMU8000 Emulator
 * 
 * Bridges Web Audio API AudioWorkletProcessor to MidiPlayer::process()
 * Handles efficient buffer processing for real-time audio synthesis
 */

use wasm_bindgen::prelude::*;
use crate::{MidiPlayer, log};

/// AudioWorklet bridge for real-time audio processing
/// Manages buffer-based audio processing between Web Audio API and WASM
#[wasm_bindgen]
pub struct AudioWorkletBridge {
    midi_player: MidiPlayer,
    sample_rate: f32,
    buffer_size: usize,
}

#[wasm_bindgen]
impl AudioWorkletBridge {
    /// Create new AudioWorkletBridge with specified sample rate
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> AudioWorkletBridge {
        log(&format!("AudioWorkletBridge::new() - Sample rate: {}Hz", sample_rate));
        
        AudioWorkletBridge {
            midi_player: MidiPlayer::new(),
            sample_rate,
            buffer_size: 128, // Default Web Audio buffer size
        }
    }
    
    /// Get the current sample rate
    #[wasm_bindgen]
    pub fn get_sample_rate(&self) -> f32 {
        self.sample_rate
    }
    
    /// Set the buffer size for processing (128, 256, or 512 samples)
    #[wasm_bindgen]
    pub fn set_buffer_size(&mut self, size: usize) {
        if size == 128 || size == 256 || size == 512 {
            self.buffer_size = size;
            log(&format!("AudioWorkletBridge: Buffer size set to {}", size));
        } else {
            log(&format!("AudioWorkletBridge: Invalid buffer size {} - using 128", size));
            self.buffer_size = 128;
        }
    }
    
    /// Get the current buffer size
    #[wasm_bindgen]
    pub fn get_buffer_size(&self) -> usize {
        self.buffer_size
    }
    
    /// Process audio buffer - main AudioWorklet processing method
    /// Takes output buffer size and fills it with synthesized audio
    /// Returns number of samples processed
    #[wasm_bindgen]
    pub fn process_audio_buffer(&mut self, buffer_length: usize) -> Vec<f32> {
        // Validate buffer size
        if buffer_length > 1024 {
            log(&format!("AudioWorkletBridge: Buffer size {} too large, capping at 1024", buffer_length));
        }
        
        let actual_length = buffer_length.min(1024);
        let mut output_buffer = Vec::with_capacity(actual_length);
        
        // Generate audio samples using MidiPlayer::process()
        for _ in 0..actual_length {
            let sample = self.midi_player.process();
            output_buffer.push(sample);
        }
        
        output_buffer
    }
    
    /// Process stereo audio buffer (interleaved L/R samples)
    /// For stereo output: [L0, R0, L1, R1, L2, R2, ...]
    #[wasm_bindgen]
    pub fn process_stereo_buffer(&mut self, buffer_length: usize) -> Vec<f32> {
        let mono_length = buffer_length / 2;
        let mut output_buffer = Vec::with_capacity(buffer_length);
        
        // Generate mono samples and duplicate to stereo
        for _ in 0..mono_length {
            let sample = self.midi_player.process();
            output_buffer.push(sample); // Left channel
            output_buffer.push(sample); // Right channel
        }
        
        output_buffer
    }
    
    /// Process audio with separate left/right channel buffers
    /// Used when AudioWorklet provides separate channel arrays
    #[wasm_bindgen]
    pub fn process_dual_mono(&mut self, buffer_length: usize) -> js_sys::Array {
        let mut left_buffer = Vec::with_capacity(buffer_length);
        let mut right_buffer = Vec::with_capacity(buffer_length);
        
        // Generate mono samples and duplicate to both channels
        for _ in 0..buffer_length {
            let sample = self.midi_player.process();
            left_buffer.push(sample);
            right_buffer.push(sample);
        }
        
        // Convert to JavaScript arrays
        let left_array = js_sys::Float32Array::from(&left_buffer[..]);
        let right_array = js_sys::Float32Array::from(&right_buffer[..]);
        
        let result = js_sys::Array::new();
        result.push(&left_array);
        result.push(&right_array);
        result
    }
    
    /// Get reference to internal MidiPlayer for MIDI event handling
    /// This allows the JavaScript side to queue MIDI events
    #[wasm_bindgen]
    pub fn get_midi_player(&mut self) -> *mut MidiPlayer {
        &mut self.midi_player as *mut MidiPlayer
    }
    
    /// Queue MIDI event through the worklet bridge
    #[wasm_bindgen]
    pub fn queue_midi_event(&mut self, timestamp: u64, channel: u8, message_type: u8, data1: u8, data2: u8) {
        let event = crate::MidiEvent::new(timestamp, channel, message_type, data1, data2);
        self.midi_player.queue_midi_event(event);
    }
    
    /// Get debug log from internal systems
    #[wasm_bindgen]
    pub fn get_debug_log(&self) -> String {
        self.midi_player.get_debug_log()
    }
    
    /// Test the worklet bridge with a simple tone
    #[wasm_bindgen]
    pub fn test_worklet_bridge(&mut self, buffer_size: usize) -> String {
        log("Testing AudioWorkletBridge - generating test buffer");
        
        // Queue a test note (Middle C, velocity 100)
        self.queue_midi_event(0, 0, 0x90, 60, 100);
        
        // Process a small buffer and check output
        let test_buffer = self.process_audio_buffer(buffer_size);
        
        // Analyze buffer for non-zero samples
        let non_zero_count = test_buffer.iter().filter(|&&sample| sample.abs() > 0.001).count();
        let max_amplitude = test_buffer.iter().map(|&sample| sample.abs()).fold(0.0, f32::max);
        let min_amplitude = test_buffer.iter().map(|&sample| sample.abs()).fold(f32::INFINITY, f32::min);
        
        // Release the note
        self.queue_midi_event(0, 0, 0x80, 60, 0);
        
        let result = format!(
            "{{\"buffer_size\": {}, \"non_zero_samples\": {}, \"max_amplitude\": {:.6}, \"min_amplitude\": {:.6}, \"success\": {}}}",
            buffer_size,
            non_zero_count,
            max_amplitude,
            min_amplitude,
            non_zero_count > 0
        );
        
        log(&format!("AudioWorkletBridge test: {}/{} non-zero samples, max amplitude: {:.6}", 
            non_zero_count, buffer_size, max_amplitude));
        
        result
    }
    
    /// Reset all audio state (stop all voices, clear events)
    #[wasm_bindgen]
    pub fn reset_audio_state(&mut self) {
        // Create a new MidiPlayer to reset all state
        self.midi_player = MidiPlayer::new();
        log("AudioWorkletBridge: Audio state reset - all voices stopped");
    }
    
    /// Get current audio statistics for monitoring
    #[wasm_bindgen]
    pub fn get_audio_stats(&self) -> String {
        // Return basic audio statistics as JSON
        format!(
            "{{\"sample_rate\": {}, \"buffer_size\": {}}}",
            self.sample_rate,
            self.buffer_size
        )
    }
}

/// Utility functions for AudioWorklet integration

/// Calculate optimal buffer size based on sample rate and target latency
#[wasm_bindgen]
pub fn calculate_optimal_buffer_size(sample_rate: f32, target_latency_ms: f32) -> usize {
    let target_samples = (sample_rate * target_latency_ms / 1000.0) as usize;
    
    // Round to nearest Web Audio standard buffer size
    if target_samples <= 128 {
        128
    } else if target_samples <= 256 {
        256
    } else {
        512
    }
}

/// Validate sample rate for EMU8000 compatibility  
#[wasm_bindgen]
pub fn validate_sample_rate(sample_rate: f32) -> bool {
    // EMU8000 supports various sample rates, but 44.1kHz is standard
    match sample_rate as u32 {
        8000 | 11025 | 16000 | 22050 | 44100 | 48000 => true,
        _ => {
            log(&format!("Warning: Unusual sample rate {}Hz - EMU8000 optimized for 44.1kHz", sample_rate));
            true // Allow but warn
        }
    }
}

/// Convert milliseconds to samples at given sample rate
#[wasm_bindgen]
pub fn ms_to_samples(milliseconds: f32, sample_rate: f32) -> usize {
    (milliseconds * sample_rate / 1000.0) as usize
}

/// Convert samples to milliseconds at given sample rate
#[wasm_bindgen]
pub fn samples_to_ms(samples: usize, sample_rate: f32) -> f32 {
    (samples as f32 * 1000.0) / sample_rate
}