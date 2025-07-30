use super::voice::Voice;

pub struct VoiceManager {
    voices: [Voice; 32],
    sample_rate: f32,
}

impl VoiceManager {
    pub fn new(sample_rate: f32) -> Self {
        VoiceManager {
            voices: [Voice::new(); 32],
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
}