// Note: AweResult may be used in future error handling

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum WaveType {
    Sine,
    Square,
    Triangle,
    Sawtooth,
}

impl Default for WaveType {
    fn default() -> Self {
        WaveType::Sine
    }
}

#[derive(Debug, Clone)]
pub struct Oscillator {
    pub frequency: f32,
    pub phase: f32,
    pub wave_type: WaveType,
}

impl Oscillator {
    pub fn new(frequency: f32) -> Self {
        Self {
            frequency,
            phase: 0.0,
            wave_type: WaveType::default(),
        }
    }

    pub fn generate_sample(&mut self, sample_rate: f32) -> f32 {
        let sample = match self.wave_type {
            WaveType::Sine => (self.phase * 2.0 * std::f32::consts::PI).sin(),
            _ => 0.0, // Other waveforms not implemented yet
        };

        // Advance phase
        self.phase += self.frequency / sample_rate;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }

        sample
    }
}

/// Convert MIDI note number to frequency in Hz
/// A4 (MIDI note 69) = 440Hz, 12-tone equal temperament
pub fn midi_note_to_frequency(note: u8) -> f32 {
    const A4_FREQ: f32 = 440.0;
    const A4_NOTE: f32 = 69.0;
    
    A4_FREQ * 2.0_f32.powf((note as f32 - A4_NOTE) / 12.0)
}