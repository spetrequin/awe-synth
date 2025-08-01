use super::voice::Voice;

pub struct VoiceManager {
    voices: [Voice; 32],
    sample_rate: f32,
}

impl VoiceManager {
    pub fn new(sample_rate: f32) -> Self {
        VoiceManager {
            voices: core::array::from_fn(|_| Voice::new()),
            sample_rate,
        }
    }
    
    pub fn note_on(&mut self, note: u8, velocity: u8) -> Option<usize> {
        for (i, voice) in self.voices.iter_mut().enumerate() {
            if !voice.is_active {
                voice.start_note(note, velocity);
                return Some(i);
            }
        }
        None
    }
    
    pub fn note_off(&mut self, note: u8) {
        for voice in self.voices.iter_mut() {
            if voice.is_active && voice.note == note {
                voice.stop_note();
            }
        }
    }
    
    /// Process all active voices and return mixed audio sample
    /// This is the main audio processing method - call once per sample
    pub fn process(&mut self) -> f32 {
        let mut mixed_output = 0.0;
        
        for voice in self.voices.iter_mut() {
            if voice.is_processing {
                let voice_sample = voice.generate_sample(self.sample_rate);
                mixed_output += voice_sample;
            }
        }
        
        // Simple mixing - divide by max voices to prevent clipping
        mixed_output / 32.0
    }
    
    /// Process envelopes for all processing voices (call once per audio sample)
    /// Returns the number of voices that are still generating audio  
    pub fn process_envelopes(&mut self) -> u32 {
        let mut processing_count = 0;
        
        for voice in self.voices.iter_mut() {
            if voice.is_processing {
                let _amplitude = voice.get_envelope_amplitude();
                
                // Voice automatically updates is_processing in get_envelope_amplitude()
                if voice.is_processing {
                    processing_count += 1;
                }
            }
        }
        
        processing_count
    }
}