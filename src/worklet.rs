/**
 * AWE Player - AudioWorkletProcessor Bridge
 * Part of AWE Player EMU8000 Emulator
 * 
 * Bridges Web Audio API AudioWorkletProcessor to MidiPlayer::process()
 * Handles efficient buffer processing for real-time audio synthesis
 */

use wasm_bindgen::prelude::*;
use crate::{MidiPlayer, log};
use crate::audio::{AudioBufferManager, BufferSize};

/// Pipeline status for audio worklet coordination
#[derive(Debug, Clone, PartialEq)]
pub enum PipelineStatus {
    Initializing,
    Ready,
    Error(String),
    Reset,
    BufferSizeChanged,
    AdaptiveModeChanged,
}

/// Audio pipeline coordination and management
/// Handles all the logic that was previously in TypeScript AudioWorkletManager
pub struct AudioPipelineManager {
    current_sample_time: u64,
    is_initialized: bool,
    status: PipelineStatus,
    sample_rate: f32,
    connected_to_destination: bool,
    last_status_report_time: u64,
    status_report_interval: u64, // Report status every N samples
}

impl AudioPipelineManager {
    /// Create new pipeline manager
    pub fn new(sample_rate: f32) -> Self {
        Self {
            current_sample_time: 0,
            is_initialized: false,
            status: PipelineStatus::Initializing,
            sample_rate,
            connected_to_destination: false,
            last_status_report_time: 0,
            status_report_interval: (sample_rate * 5.0) as u64, // Report every 5 seconds
        }
    }
    
    /// Initialize the pipeline
    pub fn initialize(&mut self) -> Result<(), String> {
        if self.is_initialized {
            return Err("Pipeline already initialized".to_string());
        }
        
        self.status = PipelineStatus::Ready;
        self.is_initialized = true;
        self.connected_to_destination = true;
        
        crate::log(&format!("🎵 AudioPipeline initialized: {}Hz, ready for processing", self.sample_rate));
        Ok(())
    }
    
    /// Update sample time and check for status reports
    pub fn advance_sample_time(&mut self, samples: u64) {
        self.current_sample_time += samples;
        
        // Periodic status reporting
        if self.current_sample_time - self.last_status_report_time >= self.status_report_interval {
            self.report_pipeline_status();
            self.last_status_report_time = self.current_sample_time;
        }
    }
    
    /// Set pipeline status
    pub fn set_status(&mut self, status: PipelineStatus) {
        if status != self.status {
            let old_status = std::mem::replace(&mut self.status, status.clone());
            crate::log(&format!("🔄 Pipeline status: {:?} → {:?}", old_status, status));
        }
    }
    
    /// Get current status
    pub fn get_status(&self) -> &PipelineStatus {
        &self.status
    }
    
    /// Check if pipeline is ready for processing
    pub fn is_ready(&self) -> bool {
        self.is_initialized && matches!(self.status, PipelineStatus::Ready)
    }
    
    /// Handle pipeline reset
    pub fn reset(&mut self) {
        self.current_sample_time = 0;
        self.last_status_report_time = 0;
        self.status = PipelineStatus::Reset;
        crate::log("🔄 Pipeline reset - sample time zeroed");
        
        // Return to ready state after reset
        self.status = PipelineStatus::Ready;
    }
    
    /// Handle buffer size change notification
    pub fn on_buffer_size_changed(&mut self, new_size: usize) {
        self.status = PipelineStatus::BufferSizeChanged;
        crate::log(&format!("🔧 Pipeline notified of buffer size change: {} samples", new_size));
        
        // Return to ready state
        self.status = PipelineStatus::Ready;
    }
    
    /// Handle adaptive mode change notification
    pub fn on_adaptive_mode_changed(&mut self, enabled: bool) {
        self.status = PipelineStatus::AdaptiveModeChanged;
        crate::log(&format!("🤖 Pipeline notified of adaptive mode change: {}", 
            if enabled { "ENABLED" } else { "DISABLED" }));
        
        // Return to ready state
        self.status = PipelineStatus::Ready;
    }
    
    /// Report pipeline status with timing information
    fn report_pipeline_status(&self) {
        let uptime_seconds = self.current_sample_time as f32 / self.sample_rate;
        crate::log(&format!("📊 Pipeline status: {:?} | Uptime: {:.1}s | Sample: {} | Connected: {}", 
            self.status, uptime_seconds, self.current_sample_time, self.connected_to_destination));
    }
    
    /// Get pipeline statistics as JSON string
    pub fn get_pipeline_stats(&self) -> String {
        let uptime_seconds = self.current_sample_time as f32 / self.sample_rate;
        format!(r#"{{"sampleTime": {}, "uptimeSeconds": {:.1}, "sampleRate": {}, "status": "{:?}", "isReady": {}, "connected": {}}}"#,
            self.current_sample_time, uptime_seconds, self.sample_rate, self.status, self.is_ready(), self.connected_to_destination)
    }
}

/// AudioWorklet bridge for real-time audio processing
/// Manages buffer-based audio processing between Web Audio API and WASM
#[wasm_bindgen]
pub struct AudioWorkletBridge {
    midi_player: MidiPlayer,
    sample_rate: f32,
    buffer_size: usize,
    buffer_manager: AudioBufferManager,
    pipeline_manager: AudioPipelineManager,
}

#[wasm_bindgen]
impl AudioWorkletBridge {
    /// Create new AudioWorkletBridge with specified sample rate
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> AudioWorkletBridge {
        log(&format!("AudioWorkletBridge::new() - Sample rate: {}Hz", sample_rate));
        
        let mut buffer_manager = AudioBufferManager::new(None);
        buffer_manager.set_sample_rate(sample_rate);
        
        let mut pipeline_manager = AudioPipelineManager::new(sample_rate);
        if let Err(e) = pipeline_manager.initialize() {
            log(&format!("⚠️ Pipeline initialization warning: {}", e));
        }
        
        AudioWorkletBridge {
            midi_player: MidiPlayer::new(),
            sample_rate,
            buffer_size: 128, // Default Web Audio buffer size
            buffer_manager,
            pipeline_manager,
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
            self.pipeline_manager.on_buffer_size_changed(size);
            log(&format!("AudioWorkletBridge: Buffer size set to {}", size));
        } else {
            log(&format!("AudioWorkletBridge: Invalid buffer size {} - using 128", size));
            self.buffer_size = 128;
            self.pipeline_manager.on_buffer_size_changed(128);
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
        // Check pipeline readiness
        if !self.pipeline_manager.is_ready() {
            log(&format!("⚠️ Pipeline not ready: {:?}", self.pipeline_manager.get_status()));
            return vec![0.0; buffer_length.min(1024)];
        }
        
        // Validate buffer size
        if buffer_length > 1024 {
            log(&format!("AudioWorkletBridge: Buffer size {} too large, capping at 1024", buffer_length));
        }
        
        let actual_length = buffer_length.min(1024);
        let mut output_buffer = Vec::with_capacity(actual_length);
        
        // Generate audio samples using MidiPlayer::process()
        // Note: In WASM context, precise timing measurements are limited
        // We'll use a simple estimation based on sample count for now
        for _ in 0..actual_length {
            let sample = self.midi_player.process();
            output_buffer.push(sample);
        }
        
        // Estimate processing time based on buffer size and sample rate
        // This is a placeholder until we have proper WASM timing
        let estimated_processing_time_ms = (actual_length as f32 / self.sample_rate) * 1000.0 * 0.1; // Assume 10% CPU usage
        self.buffer_manager.record_processing_time(estimated_processing_time_ms, actual_length);
        self.pipeline_manager.advance_sample_time(actual_length as u64);
        
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
    
    // === Buffer Manager Methods ===
    
    /// Set device information for buffer optimization
    #[wasm_bindgen]
    pub fn set_device_info(&mut self, hardware_concurrency: u32, device_memory_gb: u32) {
        self.buffer_manager.set_device_info(hardware_concurrency, device_memory_gb);
    }
    
    /// Record processing time for buffer performance monitoring
    #[wasm_bindgen]
    pub fn record_processing_time(&mut self, processing_time_ms: f32, buffer_size: usize) {
        self.buffer_manager.record_processing_time(processing_time_ms, buffer_size);
    }
    
    /// Record buffer underrun (audio glitch)
    #[wasm_bindgen]
    pub fn record_underrun(&mut self) {
        self.buffer_manager.record_underrun();
    }
    
    /// Record buffer overrun (processing too fast)
    #[wasm_bindgen]
    pub fn record_overrun(&mut self) {
        self.buffer_manager.record_overrun();
    }
    
    /// Get buffer performance metrics as JSON string
    #[wasm_bindgen]
    pub fn get_buffer_metrics(&mut self) -> String {
        serde_json::to_string(&self.buffer_manager.get_metrics()).unwrap_or_else(|_| "{}".to_string())
    }
    
    /// Get buffer status summary as JSON string
    #[wasm_bindgen]
    pub fn get_buffer_status(&mut self) -> String {
        self.buffer_manager.get_status_summary()
    }
    
    /// Get recommended buffer size for target latency
    #[wasm_bindgen]
    pub fn get_recommended_buffer_size(&self, target_latency_ms: f32) -> u32 {
        self.buffer_manager.get_recommended_buffer_size(target_latency_ms).as_u32()
    }
    
    /// Get current buffer latency in milliseconds
    #[wasm_bindgen]
    pub fn get_current_latency_ms(&self) -> f32 {
        self.buffer_manager.get_current_latency_ms()
    }
    
    /// Set buffer size (affects buffer manager and worklet)
    #[wasm_bindgen]
    pub fn set_optimal_buffer_size(&mut self, size: u32) {
        if let Some(buffer_size) = BufferSize::from_usize(size as usize) {
            self.buffer_manager.set_buffer_size(buffer_size);
            self.buffer_size = size as usize;
        }
    }
    
    /// Enable or disable adaptive buffer sizing
    #[wasm_bindgen]
    pub fn set_adaptive_mode(&mut self, enabled: bool) {
        self.buffer_manager.set_adaptive_mode(enabled);
        self.pipeline_manager.on_adaptive_mode_changed(enabled);
    }
    
    /// Reset buffer performance metrics
    #[wasm_bindgen]
    pub fn reset_buffer_metrics(&mut self) {
        self.buffer_manager.reset_metrics();
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
        self.pipeline_manager.reset();
        log("AudioWorkletBridge: Audio state reset - all voices stopped, pipeline reset");
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
    
    // === Pipeline Management Methods ===
    
    /// Get pipeline status as string for JavaScript
    #[wasm_bindgen]
    pub fn get_pipeline_status(&self) -> String {
        format!("{:?}", self.pipeline_manager.get_status())
    }
    
    /// Check if pipeline is ready for processing
    #[wasm_bindgen]
    pub fn is_pipeline_ready(&self) -> bool {
        self.pipeline_manager.is_ready()
    }
    
    /// Get comprehensive pipeline statistics as JSON
    #[wasm_bindgen]
    pub fn get_pipeline_stats(&self) -> String {
        self.pipeline_manager.get_pipeline_stats()
    }
    
    /// Force pipeline status update (for testing/debugging)
    #[wasm_bindgen]
    pub fn reset_pipeline(&mut self) {
        self.pipeline_manager.reset();
    }
    
    /// Get combined audio and pipeline status as JSON
    #[wasm_bindgen]
    pub fn get_comprehensive_status(&mut self) -> String {
        let buffer_status = self.buffer_manager.get_status_summary();
        let pipeline_stats = self.pipeline_manager.get_pipeline_stats();
        
        format!(r#"{{"bufferManager": {}, "pipeline": {}}}"#, buffer_status, pipeline_stats)
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