/**
 * Low-Frequency Oscillator (LFO) Implementation - EMU8000 Dual LFO System
 * 
 * EMU8000 dual LFO system for tremolo and vibrato effects:
 * - LFO1: Tremolo (amplitude modulation) - typically 0.1Hz-20Hz
 * - LFO2: Vibrato (pitch modulation) - typically 0.1Hz-20Hz
 * - Multiple waveforms: sine, triangle, square
 * - SoundFont 2.0 generator compliance (generators 21-25)
 * - Phase synchronization and reset capabilities
 */

use crate::log;

/// LFO waveform types available in EMU8000
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LfoWaveform {
    Sine,      // Smooth sinusoidal modulation
    Triangle,  // Linear ramp modulation
    Square,    // Step modulation (on/off)
}

/// Low-frequency oscillator for modulation effects
#[derive(Debug, Clone)]
pub struct LFO {
    /// Current waveform type
    pub waveform: LfoWaveform,
    /// LFO frequency in Hz (0.1-20Hz range for EMU8000)
    pub frequency_hz: f32,
    /// Modulation depth (0.0-1.0)
    pub depth: f32,
    /// Sample rate for timing calculations
    pub sample_rate: f32,
    /// Current phase accumulator (0.0-1.0)
    pub phase: f32,
    /// Phase increment per sample
    pub phase_increment: f32,
    /// Current LFO output level (-1.0 to 1.0)
    pub current_level: f32,
}

impl LFO {
    /// Create new LFO with specified parameters
    pub fn new(sample_rate: f32, frequency_hz: f32, depth: f32, waveform: LfoWaveform) -> Self {
        // Clamp frequency to EMU8000 range (0.1Hz - 20Hz)
        let clamped_frequency = frequency_hz.clamp(0.1, 20.0);
        
        // Calculate phase increment for frequency
        let phase_increment = clamped_frequency / sample_rate;
        
        log(&format!("LFO created: freq={:.2}Hz depth={:.3} waveform={:?}", 
                   clamped_frequency, depth, waveform));
        
        LFO {
            waveform,
            frequency_hz: clamped_frequency,
            depth: depth.clamp(0.0, 1.0),
            sample_rate,
            phase: 0.0,
            phase_increment,
            current_level: 0.0,
        }
    }
    
    /// Set LFO frequency in Hz
    pub fn set_frequency(&mut self, frequency_hz: f32) {
        self.frequency_hz = frequency_hz.clamp(0.1, 20.0);
        self.phase_increment = self.frequency_hz / self.sample_rate;
    }
    
    /// Set modulation depth (0.0-1.0)
    pub fn set_depth(&mut self, depth: f32) {
        self.depth = depth.clamp(0.0, 1.0);
    }
    
    /// Set waveform type
    pub fn set_waveform(&mut self, waveform: LfoWaveform) {
        self.waveform = waveform;
    }
    
    /// Generate waveform output for current phase (-1.0 to 1.0)
    fn generate_waveform(&self) -> f32 {
        match self.waveform {
            LfoWaveform::Sine => {
                // Standard sine wave
                (self.phase * 2.0 * std::f32::consts::PI).sin()
            },
            LfoWaveform::Triangle => {
                // Triangle wave: linear ramp up and down
                if self.phase < 0.5 {
                    // Rising: 0.0 → 0.5 maps to -1.0 → 1.0
                    (self.phase * 4.0) - 1.0
                } else {
                    // Falling: 0.5 → 1.0 maps to 1.0 → -1.0
                    3.0 - (self.phase * 4.0)
                }
            },
            LfoWaveform::Square => {
                // Square wave: 50% duty cycle
                if self.phase < 0.5 {
                    1.0  // High for first half
                } else {
                    -1.0 // Low for second half
                }
            },
        }
    }
    
    /// Get current LFO output level with depth applied
    pub fn get_level(&self) -> f32 {
        self.current_level * self.depth
    }
    
    /// Check if LFO is active (has non-zero depth)
    pub fn is_active(&self) -> bool {
        self.depth > 0.0
    }
    
    /// Process LFO for one sample with phase accumulation
    pub fn process(&mut self) -> f32 {
        // Generate current waveform output
        self.current_level = self.generate_waveform();
        
        // Advance phase for next sample
        self.phase += self.phase_increment;
        
        // Wrap phase to 0.0-1.0 range
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        
        // Return current level with depth applied
        self.current_level * self.depth
    }
    
    /// Create LFO from SoundFont 2.0 generator parameters
    /// 
    /// SoundFont LFO generators:
    /// - Generator 21: freqModLFO (modulation LFO frequency)
    /// - Generator 22: delayModLFO (modulation LFO delay)
    /// - Generator 23: freqVibLFO (vibrato LFO frequency)  
    /// - Generator 24: delayVibLFO (vibrato LFO delay)
    /// - Generator 25: modLfoToPitch (mod LFO to pitch)
    pub fn from_soundfont_generators(
        sample_rate: f32,
        freq_cents: i32,        // Frequency in cents
        _delay_timecents: i32,   // Delay before LFO starts (not implemented yet)
        depth: f32,             // Modulation depth (0.0-1.0)
        waveform: LfoWaveform,  // Waveform type
    ) -> Self {
        // Convert frequency from cents to Hz
        // SoundFont frequency: 8.176 Hz at 0 cents
        let base_frequency = 8.176; // Hz at 0 cents
        let frequency_hz = base_frequency * (2.0_f32).powf(freq_cents as f32 / 1200.0);
        
        log(&format!("LFO from SoundFont: freq_cents={} -> {:.3}Hz, depth={:.3}", 
                   freq_cents, frequency_hz, depth));
        
        // Create LFO with calculated frequency
        // Note: delay_timecents will be implemented in future for delayed LFO start
        LFO::new(sample_rate, frequency_hz, depth, waveform)
    }
    
    /// Reset LFO phase for note-on synchronization
    pub fn trigger(&mut self) {
        self.phase = 0.0;
        self.current_level = self.generate_waveform();
    }
    
    /// Reset LFO to silent state
    pub fn reset(&mut self) {
        self.phase = 0.0;
        self.current_level = 0.0;
    }
}