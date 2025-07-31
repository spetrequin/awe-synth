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
    
    /// Process envelopes for all active voices (call once per audio sample)
    /// Returns the number of voices that are still generating audio
    pub fn process_envelopes(&mut self) -> u32 {
        let mut active_count = 0;
        
        for voice in self.voices.iter_mut() {
            if voice.is_active {
                let amplitude = voice.get_envelope_amplitude();
                
                // Voice is considered inactive when envelope reaches silence
                if amplitude <= 0.001 {
                    voice.is_active = false;
                } else {
                    active_count += 1;
                }
            }
        }
        
        active_count
    }
}