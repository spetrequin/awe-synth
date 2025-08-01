use crate::synth::envelope::{DAHDSREnvelope, EnvelopeState};
use crate::synth::oscillator::{Oscillator, midi_note_to_frequency};

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
    
    /// Generate one audio sample combining oscillator and envelope
    /// Returns final audio sample (-1.0 to 1.0)
    pub fn generate_sample(&mut self, sample_rate: f32) -> f32 {
        if !self.is_processing {
            return 0.0;
        }
        
        // Generate oscillator sample
        let oscillator_output = self.oscillator.generate_sample(sample_rate);
        
        // Get envelope amplitude (also processes envelope state)
        let envelope_amplitude = self.get_envelope_amplitude();
        
        // Combine oscillator with envelope
        oscillator_output * envelope_amplitude
    }
}