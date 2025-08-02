use crate::synth::envelope::{DAHDSREnvelope, EnvelopeState};
use crate::synth::oscillator::{Oscillator, midi_note_to_frequency};
use crate::synth::sample_player::{SamplePlayer, InterpolationMethod};
use crate::soundfont::types::SoundFontSample;
use crate::effects::filter::LowPassFilter;
use crate::log;

#[derive(Debug, Clone)]
pub struct Voice {
    pub note: u8,
    pub velocity: u8,
    pub phase: f64,
    pub is_active: bool,
    /// True when voice is generating audio (including release phase)
    pub is_processing: bool,
    pub volume_envelope: DAHDSREnvelope,
    pub oscillator: Oscillator,
    
    // SoundFont sample playback
    pub soundfont_sample: Option<SoundFontSample>,
    pub sample_position: f64,     // Current position in sample data
    pub sample_rate_ratio: f64,   // Ratio for sample rate conversion
    pub is_soundfont_voice: bool, // True if playing SoundFont sample, false for sine wave
    
    // EMU8000 per-voice effects
    pub low_pass_filter: LowPassFilter, // 2-pole resonant filter (100Hz-8kHz)
}

impl Voice {
    pub fn new() -> Self {
        // Default EMU8000 volume envelope parameters
        // Using 44.1kHz sample rate and reasonable envelope timings
        let volume_envelope = DAHDSREnvelope::new(
            44100.0,     // sample_rate
            -12000,      // delay_timecents (1ms)
            -7200,       // attack_timecents (~16ms)
            -12000,      // hold_timecents (1ms)
            -2400,       // decay_timecents (~250ms)
            200,         // sustain_centibels (~-2dB)
            -7200,       // release_timecents (~16ms)
        );
        
        Voice {
            note: 0,
            velocity: 0,
            phase: 0.0,
            is_active: false,
            is_processing: false,
            volume_envelope,
            oscillator: Oscillator::new(440.0), // Default frequency, will be updated in start_note
            soundfont_sample: None,
            sample_position: 0.0,
            sample_rate_ratio: 1.0,
            is_soundfont_voice: false,
            // Initialize filter with EMU8000 default parameters
            low_pass_filter: LowPassFilter::new(44100.0, 8000.0, 0.7), // Wide open, minimal resonance
        }
    }
    
    pub fn start_note(&mut self, note: u8, velocity: u8) {
        self.note = note;
        self.velocity = velocity;
        self.phase = 0.0;
        self.is_active = true;
        self.is_processing = true;
        
        // Set oscillator frequency from MIDI note number (fallback mode)
        self.oscillator.frequency = midi_note_to_frequency(note);
        self.oscillator.phase = 0.0; // Reset phase for clean note start
        
        // Trigger volume envelope for note-on event
        self.volume_envelope.trigger();
        
        // Log synthesis mode based on available sample data
        if self.soundfont_sample.is_some() {
            log(&format!("Voice started: Note {} Vel {} -> Sample-based synthesis", 
                       note, velocity));
        } else {
            log(&format!("Voice started: Note {} Vel {} -> Sine wave fallback @{:.2}Hz", 
                       note, velocity, self.oscillator.frequency));
        }
    }
    
    /// Start note with SoundFont sample
    pub fn start_soundfont_note(&mut self, note: u8, velocity: u8, sample: &SoundFontSample) {
        self.note = note;
        self.velocity = velocity;
        self.phase = 0.0;
        self.is_active = true;
        self.is_processing = true;
        self.is_soundfont_voice = true;
        
        // Set up SoundFont sample playback
        self.soundfont_sample = Some(sample.clone());
        self.sample_position = 0.0;
        
        // Calculate sample rate conversion ratio
        // This handles pitch shifting based on MIDI note vs original pitch
        let target_frequency = midi_note_to_frequency(note);
        let original_frequency = midi_note_to_frequency(sample.original_pitch);
        let pitch_ratio = target_frequency / original_frequency;
        self.sample_rate_ratio = pitch_ratio as f64 * (sample.sample_rate as f64 / 44100.0);
        
        // Set oscillator frequency for fallback (shouldn't be used)
        self.oscillator.frequency = target_frequency;
        self.oscillator.phase = 0.0;
        
        // Trigger volume envelope
        self.volume_envelope.trigger();
        
        log(&format!("SoundFont voice started: Note {} Vel {} -> Sample '{}' @{:.2}Hz (ratio: {:.3})", 
                   note, velocity, sample.name, target_frequency, self.sample_rate_ratio));
    }
    
    pub fn stop_note(&mut self) {
        // Trigger envelope release phase for note-off event
        self.volume_envelope.release();
        // Mark voice as inactive for voice allocation, but still processing during release
        self.is_active = false;
        // Keep is_processing = true until envelope reaches Off state
    }
    
    /// Get current envelope amplitude by processing one sample
    /// Returns exponential envelope level (0.0 to 1.0)
    /// Also updates voice processing state based on envelope state
    pub fn get_envelope_amplitude(&mut self) -> f32 {
        let amplitude = self.volume_envelope.process();
        
        // Voice stops processing when envelope reaches Off state
        if self.volume_envelope.state == EnvelopeState::Off {
            self.is_processing = false;
        }
        
        amplitude
    }
    
    /// Generate one audio sample prioritizing sample data over sine wave
    /// Returns final audio sample (-1.0 to 1.0)
    pub fn generate_sample(&mut self, sample_rate: f32) -> f32 {
        if !self.is_processing {
            return 0.0;
        }
        
        // PRIORITY 1: Try sample-based synthesis if SoundFont sample is available
        let audio_output = if self.soundfont_sample.is_some() {
            // Use authentic sample-based synthesis
            self.generate_soundfont_sample()
        } else {
            // FALLBACK: Use sine wave oscillator only if no sample available
            log(&format!("Voice {}: No SoundFont sample, falling back to sine wave", self.note));
            self.oscillator.generate_sample(sample_rate)
        };
        
        // Apply low-pass filter to audio output (EMU8000 per-voice filtering)
        let filtered_output = self.low_pass_filter.process(audio_output);
        
        // Get envelope amplitude (also processes envelope state)
        let envelope_amplitude = self.get_envelope_amplitude();
        
        // Combine filtered audio with envelope modulation
        filtered_output * envelope_amplitude
    }
    
    /// Generate sample from SoundFont sample data
    fn generate_soundfont_sample(&mut self) -> f32 {
        let sample = match &self.soundfont_sample {
            Some(s) => s,
            None => {
                log("SoundFont voice has no sample data");
                return 0.0;
            }
        };
        
        if sample.sample_data.is_empty() {
            return 0.0;
        }
        
        // Get current sample position as integer and fractional parts
        let current_pos = self.sample_position as usize;
        let frac = self.sample_position - (current_pos as f64);
        
        // Check if we've reached the end of the sample
        if current_pos >= sample.sample_data.len() {
            // Handle looping if loop points are defined
            if sample.loop_start < sample.loop_end && sample.loop_end <= sample.sample_data.len() as u32 {
                // Loop back to loop start
                let loop_length = (sample.loop_end - sample.loop_start) as f64;
                if loop_length > 0.0 {
                    self.sample_position = sample.loop_start as f64 + 
                                         (self.sample_position - sample.loop_start as f64) % loop_length;
                } else {
                    self.sample_position = sample.loop_start as f64;
                }
            } else {
                // No loop - voice finished
                self.is_processing = false;
                return 0.0;
            }
        }
        
        // Linear interpolation between current and next sample
        let current_sample = sample.sample_data[current_pos] as f32 / 32768.0; // Convert to -1.0..1.0
        let next_sample = if current_pos + 1 < sample.sample_data.len() {
            sample.sample_data[current_pos + 1] as f32 / 32768.0
        } else {
            current_sample // Use current sample if at end
        };
        
        let interpolated_sample = current_sample + (next_sample - current_sample) * (frac as f32);
        
        // Advance sample position by playback rate ratio
        self.sample_position += self.sample_rate_ratio;
        
        interpolated_sample
    }
}

/// Sample-based voice for authentic EMU8000 synthesis
/// 
/// Dedicated voice structure that eliminates oscillator complexity and focuses
/// exclusively on sample-based synthesis using the SamplePlayer engine.
#[derive(Debug, Clone)]
pub struct SampleVoice {
    /// MIDI note number (0-127)
    pub note: u8,
    /// MIDI velocity (0-127)
    pub velocity: u8,
    /// Voice activity state (true = allocated for note, false = available)
    pub is_active: bool,
    /// Processing state (true = generating audio, false = silent)
    pub is_processing: bool,
    /// EMU8000 6-stage DAHDSR volume envelope
    pub volume_envelope: DAHDSREnvelope,
    /// High-performance sample playback engine
    pub sample_player: SamplePlayer,
    /// Currently loaded SoundFont sample
    pub soundfont_sample: Option<SoundFontSample>,
}

impl SampleVoice {
    /// Create new sample-based voice with EMU8000 envelope defaults
    pub fn new() -> Self {
        // EMU8000 default envelope parameters for sample-based synthesis
        let volume_envelope = DAHDSREnvelope::new(
            44100.0,     // sample_rate
            -12000,      // delay_timecents (1ms)
            -12000,      // attack_timecents (1ms)  
            -12000,      // hold_timecents (1ms)
            -12000,      // decay_timecents (1ms)
            0,           // sustain_centibels (full level)
            -12000,      // release_timecents (1ms)
        );
        
        Self {
            note: 0,
            velocity: 0,
            is_active: false,
            is_processing: false,
            volume_envelope,
            sample_player: SamplePlayer::new(),
            soundfont_sample: None,
        }
    }
    
    /// Start sample-based note with SoundFont sample
    /// 
    /// # Arguments
    /// * `note` - MIDI note number (0-127)
    /// * `velocity` - MIDI velocity (0-127)
    /// * `sample` - SoundFont sample for authentic synthesis
    /// * `sample_rate` - Audio system sample rate (typically 44100.0)
    pub fn start_note(&mut self, note: u8, velocity: u8, sample: &SoundFontSample, sample_rate: f32) {
        self.note = note;
        self.velocity = velocity;
        self.is_active = true;
        self.is_processing = true;
        
        // Store SoundFont sample
        self.soundfont_sample = Some(sample.clone());
        
        // Start sample playback with pitch shifting
        self.sample_player.start_sample(sample, note, sample_rate);
        
        // Configure interpolation based on sample quality needs
        // Use cubic interpolation for high-quality pitch shifting
        self.sample_player.set_interpolation(InterpolationMethod::Cubic);
        
        // Trigger EMU8000 envelope
        self.volume_envelope.trigger();
        
        log(&format!("SampleVoice started: Note {} Vel {} -> Sample '{}'", 
                   note, velocity, sample.name));
    }
    
    /// Stop note (triggers envelope release phase)
    pub fn stop_note(&mut self) {
        // Trigger envelope release phase for note-off event
        self.volume_envelope.release();
        // Mark voice as inactive for voice allocation
        self.is_active = false;
        // Keep processing until envelope reaches Off state
    }
    
    /// Generate one audio sample with envelope modulation
    /// 
    /// # Returns
    /// Final audio sample (-1.0 to 1.0) combining sample playback and envelope
    pub fn generate_sample(&mut self) -> f32 {
        if !self.is_processing {
            return 0.0;
        }
        
        // Get sample audio output
        let audio_output = match &self.soundfont_sample {
            Some(sample) => self.sample_player.generate_sample(sample),
            None => {
                log("SampleVoice has no SoundFont sample");
                0.0
            }
        };
        
        // Process envelope and update voice state
        let envelope_amplitude = self.volume_envelope.process();
        
        // Voice stops processing when envelope reaches Off state or sample finishes
        if self.volume_envelope.state == EnvelopeState::Off || !self.sample_player.is_playing() {
            self.is_processing = false;
        }
        
        // Combine sample audio with envelope modulation
        audio_output * envelope_amplitude
    }
    
    /// Check if voice is available for new note allocation
    pub fn is_available(&self) -> bool {
        !self.is_active
    }
    
    /// Check if voice is generating audio
    pub fn is_generating_audio(&self) -> bool {
        self.is_processing
    }
    
    /// Get current envelope amplitude (for analysis/debugging)
    pub fn get_envelope_amplitude(&mut self) -> f32 {
        self.volume_envelope.process()
    }
    
    /// Set sample interpolation method for quality vs performance trade-off
    pub fn set_interpolation(&mut self, method: InterpolationMethod) {
        self.sample_player.set_interpolation(method);
    }
}

impl Default for SampleVoice {
    fn default() -> Self {
        Self::new()
    }
}

/// Multi-Zone Sample Voice for EMU8000 Layering
/// 
/// Enhanced voice that supports multiple simultaneous samples with crossfading
/// for authentic EMU8000 velocity layering and key splitting capabilities.
#[derive(Debug, Clone)]
pub struct MultiZoneSampleVoice {
    /// MIDI note number (0-127)
    pub note: u8,
    /// MIDI velocity (0-127)
    pub velocity: u8,
    /// Voice activity state (true = allocated for note, false = available)
    pub is_active: bool,
    /// Processing state (true = generating audio, false = silent)
    pub is_processing: bool,
    /// EMU8000 6-stage DAHDSR volume envelope
    pub volume_envelope: DAHDSREnvelope,
    /// Multiple sample layers with weights for crossfading
    pub sample_layers: Vec<SampleLayer>,
}

/// Single sample layer within a multi-zone voice
#[derive(Debug, Clone)]
pub struct SampleLayer {
    /// Sample playback engine for this layer
    pub sample_player: SamplePlayer,
    /// SoundFont sample data
    pub soundfont_sample: SoundFontSample,
    /// Layer weight for crossfading (0.0-1.0)
    pub weight: f32,
    /// Layer metadata for debugging
    pub preset_name: String,
    pub instrument_name: String,
}

impl MultiZoneSampleVoice {
    /// Create new multi-zone sample voice
    pub fn new() -> Self {
        // EMU8000 default envelope parameters for multi-zone synthesis
        let volume_envelope = DAHDSREnvelope::new(
            44100.0,     // sample_rate
            -12000,      // delay_timecents (1ms)
            -12000,      // attack_timecents (1ms)  
            -12000,      // hold_timecents (1ms)
            -12000,      // decay_timecents (1ms)
            0,           // sustain_centibels (full level)
            -12000,      // release_timecents (1ms)
        );
        
        Self {
            note: 0,
            velocity: 0,
            is_active: false,
            is_processing: false,
            volume_envelope,
            sample_layers: Vec::new(),
        }
    }
    
    /// Start multi-zone note with layered samples
    /// 
    /// # Arguments
    /// * `note` - MIDI note number (0-127)
    /// * `velocity` - MIDI velocity (0-127)
    /// * `samples` - Vec of (sample, weight, preset_name, instrument_name) tuples
    /// * `sample_rate` - Audio system sample rate (typically 44100.0)
    pub fn start_multi_zone_note(&mut self, note: u8, velocity: u8, 
                                 samples: Vec<(SoundFontSample, f32, String, String)>, 
                                 sample_rate: f32) {
        self.note = note;
        self.velocity = velocity;
        self.is_active = true;
        self.is_processing = true;
        
        // Clear existing layers
        self.sample_layers.clear();
        
        // Create sample layers from the provided samples
        for (sample, weight, preset_name, instrument_name) in samples {
            let mut sample_player = SamplePlayer::new();
            sample_player.start_sample(&sample, note, sample_rate);
            
            // Use cubic interpolation for high-quality multi-zone synthesis
            sample_player.set_interpolation(InterpolationMethod::Cubic);
            
            let layer = SampleLayer {
                sample_player,
                soundfont_sample: sample,
                weight,
                preset_name,
                instrument_name,
            };
            
            self.sample_layers.push(layer);
        }
        
        // Trigger EMU8000 envelope
        self.volume_envelope.trigger();
        
        log(&format!("MultiZoneSampleVoice started: Note {} Vel {} -> {} layers", 
                   note, velocity, self.sample_layers.len()));
        
        // Log layer details
        for (i, layer) in self.sample_layers.iter().enumerate() {
            log(&format!("  Layer {}: Sample '{}' weight {:.3} from '{}'", 
                       i, layer.soundfont_sample.name, layer.weight, layer.instrument_name));
        }
    }
    
    /// Stop note (triggers envelope release phase)
    pub fn stop_note(&mut self) {
        // Trigger envelope release phase for note-off event
        self.volume_envelope.release();
        // Mark voice as inactive for voice allocation
        self.is_active = false;
        // Keep processing until envelope reaches Off state
    }
    
    /// Generate one audio sample with multi-zone mixing and envelope modulation
    /// 
    /// # Returns
    /// Final audio sample (-1.0 to 1.0) combining all sample layers with crossfading
    pub fn generate_sample(&mut self) -> f32 {
        if !self.is_processing {
            return 0.0;
        }
        
        // Mix all sample layers with their weights
        let mut mixed_audio = 0.0;
        let mut active_layers = 0;
        
        for layer in self.sample_layers.iter_mut() {
            let layer_audio = layer.sample_player.generate_sample(&layer.soundfont_sample);
            
            // Apply layer weight for crossfading
            mixed_audio += layer_audio * layer.weight;
            
            if layer.sample_player.is_playing() {
                active_layers += 1;
            }
        }
        
        // Process envelope and update voice state
        let envelope_amplitude = self.volume_envelope.process();
        
        // Voice stops processing when envelope reaches Off state or all samples finish
        if self.volume_envelope.state == EnvelopeState::Off || active_layers == 0 {
            self.is_processing = false;
        }
        
        // Combine mixed audio with envelope modulation
        mixed_audio * envelope_amplitude
    }
    
    /// Check if voice is available for new note allocation
    pub fn is_available(&self) -> bool {
        !self.is_active
    }
    
    /// Check if voice is generating audio
    pub fn is_generating_audio(&self) -> bool {
        self.is_processing
    }
    
    /// Get number of active sample layers
    pub fn get_layer_count(&self) -> usize {
        self.sample_layers.len()
    }
    
    /// Get total weight of all layers (should be close to 1.0)
    pub fn get_total_weight(&self) -> f32 {
        self.sample_layers.iter().map(|layer| layer.weight).sum()
    }
    
    /// Get current envelope amplitude (for analysis/debugging)
    pub fn get_envelope_amplitude(&mut self) -> f32 {
        self.volume_envelope.process()
    }
    
    /// Set interpolation method for all sample layers
    pub fn set_interpolation(&mut self, method: InterpolationMethod) {
        for layer in self.sample_layers.iter_mut() {
            layer.sample_player.set_interpolation(method);
        }
    }
    
    /// Get details about sample layers for debugging
    pub fn get_layer_info(&self) -> Vec<(String, f32, bool)> {
        self.sample_layers.iter().map(|layer| {
            (layer.soundfont_sample.name.clone(), 
             layer.weight, 
             layer.sample_player.is_playing())
        }).collect()
    }
}

impl Default for MultiZoneSampleVoice {
    fn default() -> Self {
        Self::new()
    }
}