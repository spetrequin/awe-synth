use crate::synth::envelope::{DAHDSREnvelope, EnvelopeState};
use crate::synth::oscillator::{Oscillator, midi_note_to_frequency};
use crate::soundfont::types::SoundFontSample;
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
        }
    }
    
    pub fn start_note(&mut self, note: u8, velocity: u8) {
        self.note = note;
        self.velocity = velocity;
        self.phase = 0.0;
        self.is_active = true;
        self.is_processing = true;
        
        // Set oscillator frequency from MIDI note number
        self.oscillator.frequency = midi_note_to_frequency(note);
        self.oscillator.phase = 0.0; // Reset phase for clean note start
        
        // Trigger volume envelope for note-on event
        self.volume_envelope.trigger();
        
        log(&format!("Voice started: Note {} Vel {} Freq {:.2}Hz (Sine wave)", 
                   note, velocity, self.oscillator.frequency));
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
    
    /// Generate one audio sample combining oscillator/sample and envelope
    /// Returns final audio sample (-1.0 to 1.0)
    pub fn generate_sample(&mut self, sample_rate: f32) -> f32 {
        if !self.is_processing {
            return 0.0;
        }
        
        // Generate audio sample based on voice type
        let audio_output = if self.is_soundfont_voice {
            self.generate_soundfont_sample()
        } else {
            // Generate oscillator sample (sine wave)
            self.oscillator.generate_sample(sample_rate)
        };
        
        // Get envelope amplitude (also processes envelope state)
        let envelope_amplitude = self.get_envelope_amplitude();
        
        // Combine audio with envelope
        audio_output * envelope_amplitude
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