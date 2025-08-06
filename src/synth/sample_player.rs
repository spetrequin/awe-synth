/**
 * Sample Player for AWE Player EMU8000 Synthesis
 * 
 * High-performance sample playback engine with pitch shifting for authentic
 * SoundFont 2.0 sample-based synthesis. Supports linear interpolation,
 * seamless looping, and sample-accurate timing for real-time audio.
 */

use crate::soundfont::types::SoundFontSample;
use crate::synth::oscillator::midi_note_to_frequency;
use crate::log;

/// Interpolation method for sample pitch shifting
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum InterpolationMethod {
    Linear,      // Fast linear interpolation (default)
    Cubic,       // Higher quality cubic interpolation
}

impl Default for InterpolationMethod {
    fn default() -> Self {
        InterpolationMethod::Linear
    }
}

/// Sample playback engine with pitch shifting and looping
#[derive(Debug, Clone)]
pub struct SamplePlayer {
    /// Current position in sample data (fractional for smooth interpolation)
    pub position: f64,
    /// Playback rate ratio for pitch shifting (1.0 = original pitch)
    pub playback_rate: f64,
    /// Current pitch bend ratio applied to playback rate
    pub pitch_bend_ratio: Option<f64>,
    /// Interpolation method for pitch shifting accuracy
    pub interpolation: InterpolationMethod,
    /// Whether the sample player is active
    pub is_active: bool,
}

impl SamplePlayer {
    /// Create new sample player
    pub fn new() -> Self {
        Self {
            position: 0.0,
            playback_rate: 1.0,
            pitch_bend_ratio: None,
            interpolation: InterpolationMethod::default(),
            is_active: false,
        }
    }
    
    /// Start sample playback with pitch shifting
    /// 
    /// # Arguments
    /// * `sample` - SoundFont sample to play
    /// * `midi_note` - Target MIDI note (0-127)
    /// * `sample_rate` - Audio system sample rate (typically 44100.0)
    pub fn start_sample(&mut self, sample: &SoundFontSample, midi_note: u8, sample_rate: f32) {
        self.position = 0.0;
        self.is_active = true;
        
        // Calculate pitch shifting ratio
        self.playback_rate = self.calculate_playback_rate(sample, midi_note, sample_rate);
        
        log(&format!("Sample player started: '{}' note {} rate {:.3}", 
                   sample.name, midi_note, self.playback_rate));
    }
    
    /// Stop sample playback
    pub fn stop(&mut self) {
        self.is_active = false;
    }
    
    /// Generate one audio sample with pitch shifting and interpolation
    /// 
    /// # Arguments
    /// * `sample` - SoundFont sample data
    /// 
    /// # Returns
    /// Audio sample value (-1.0 to 1.0), or 0.0 if inactive
    pub fn generate_sample(&mut self, sample: &SoundFontSample) -> f32 {
        if !self.is_active || sample.sample_data.is_empty() {
            return 0.0;
        }
        
        // Handle end-of-sample and looping
        if !self.handle_sample_bounds(sample) {
            return 0.0;
        }
        
        // Generate interpolated sample based on method
        let audio_sample = match self.interpolation {
            InterpolationMethod::Linear => self.linear_interpolation(sample),
            InterpolationMethod::Cubic => self.cubic_interpolation(sample),
        };
        
        // Advance playback position
        self.position += self.playback_rate;
        
        audio_sample
    }
    
    /// Set interpolation method for pitch shifting quality
    pub fn set_interpolation(&mut self, method: InterpolationMethod) {
        self.interpolation = method;
    }
    
    /// Check if sample player is active
    pub fn is_playing(&self) -> bool {
        self.is_active
    }
    
    /// Get current playback position in samples
    pub fn get_position(&self) -> f64 {
        self.position
    }
    
    /// Calculate playback rate for pitch shifting
    /// 
    /// Combines MIDI note pitch conversion with sample rate conversion
    fn calculate_playback_rate(&self, sample: &SoundFontSample, midi_note: u8, sample_rate: f32) -> f64 {
        // Calculate pitch ratio (MIDI note vs original sample pitch)
        let target_frequency = midi_note_to_frequency(midi_note);
        let original_frequency = midi_note_to_frequency(sample.original_pitch);
        let pitch_ratio = target_frequency / original_frequency;
        
        // Calculate sample rate conversion ratio
        let sample_rate_ratio = sample.sample_rate as f32 / sample_rate;
        
        // Combine both ratios for final playback rate
        (pitch_ratio * sample_rate_ratio) as f64
    }
    
    /// Handle sample boundary conditions and looping
    /// 
    /// # Returns
    /// true if playback should continue, false if sample finished
    fn handle_sample_bounds(&mut self, sample: &SoundFontSample) -> bool {
        let current_pos = self.position as usize;
        
        // Check if we've reached the end of the sample
        if current_pos >= sample.sample_data.len() {
            // Check if sample has valid loop points
            if self.has_valid_loop(sample) {
                self.handle_sample_loop(sample);
                true
            } else {
                // No loop - sample finished
                self.is_active = false;
                false
            }
        } else {
            true
        }
    }
    
    /// Check if sample has valid loop points
    fn has_valid_loop(&self, sample: &SoundFontSample) -> bool {
        sample.loop_start < sample.loop_end && 
        sample.loop_end <= sample.sample_data.len() as u32 &&
        sample.loop_start < sample.sample_data.len() as u32
    }
    
    /// Handle sample looping with seamless position wrapping
    fn handle_sample_loop(&mut self, sample: &SoundFontSample) {
        let loop_start = sample.loop_start as f64;
        let loop_end = sample.loop_end as f64;
        let loop_length = loop_end - loop_start;
        
        if loop_length > 0.0 {
            // Wrap position within loop boundaries
            let overshoot = self.position - loop_end;
            self.position = loop_start + (overshoot % loop_length);
        } else {
            // Degenerate loop - just reset to loop start
            self.position = loop_start;
        }
    }
    
    /// Linear interpolation between adjacent samples
    fn linear_interpolation(&self, sample: &SoundFontSample) -> f32 {
        let current_pos = self.position as usize;
        let frac = (self.position - current_pos as f64) as f32;
        
        // Get current sample (converted to -1.0..1.0 range)
        let current_sample = sample.sample_data[current_pos] as f32 / 32768.0;
        
        // Get next sample (with bounds checking)
        let next_sample = if current_pos + 1 < sample.sample_data.len() {
            sample.sample_data[current_pos + 1] as f32 / 32768.0
        } else {
            current_sample // Use current sample if at end
        };
        
        // Linear interpolation: current + (next - current) * fraction
        current_sample + (next_sample - current_sample) * frac
    }
    
    /// Cubic interpolation for higher quality pitch shifting
    /// 
    /// Uses 4-point interpolation for smoother frequency response
    fn cubic_interpolation(&self, sample: &SoundFontSample) -> f32 {
        let current_pos = self.position as usize;
        let frac = (self.position - current_pos as f64) as f32;
        let data_len = sample.sample_data.len();
        
        // Get 4 sample points for cubic interpolation (with bounds checking)
        let s0 = if current_pos > 0 { 
            sample.sample_data[current_pos - 1] as f32 / 32768.0 
        } else { 
            sample.sample_data[current_pos] as f32 / 32768.0 
        };
        
        let s1 = sample.sample_data[current_pos] as f32 / 32768.0;
        
        let s2 = if current_pos + 1 < data_len {
            sample.sample_data[current_pos + 1] as f32 / 32768.0
        } else {
            s1
        };
        
        let s3 = if current_pos + 2 < data_len {
            sample.sample_data[current_pos + 2] as f32 / 32768.0
        } else {
            s2
        };
        
        // 4-point cubic interpolation (Catmull-Rom)
        let c0 = s1;
        let c1 = 0.5 * (s2 - s0);
        let c2 = s0 - 2.5 * s1 + 2.0 * s2 - 0.5 * s3;
        let c3 = 0.5 * (s3 - s0) + 1.5 * (s1 - s2);
        
        c0 + c1 * frac + c2 * frac * frac + c3 * frac * frac * frac
    }
}

impl Default for SamplePlayer {
    fn default() -> Self {
        Self::new()
    }
}