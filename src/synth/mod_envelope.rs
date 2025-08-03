/**
 * Modulation Envelope Implementation - EMU8000 6-Stage ADSR
 * 
 * 6-stage modulation envelope for filter cutoff and pitch modulation:
 * - Attack, Hold, Decay, Sustain, Release phases (no Delay for modulation)
 * - Exponential curves matching EMU8000 behavior
 * - SoundFont 2.0 generator compliance (generators 26-32)
 * - Key scaling support for envelope timing
 */

use crate::synth::envelope::{EnvelopeState, timecents_to_seconds};
use crate::log;

/// 6-stage modulation envelope for filter/pitch modulation
#[derive(Debug, Clone)]
pub struct ModulationEnvelope {
    /// Current envelope state
    pub state: EnvelopeState,
    /// Sample rate for timing calculations
    pub sample_rate: f32,
    /// Current envelope output level (0.0 to 1.0)
    pub current_level: f32,
    /// Target level for current phase
    pub target_level: f32,
    /// Samples remaining in current phase
    pub samples_remaining: u32,
    /// Total samples for current phase
    pub phase_samples: u32,
    
    // SoundFont 2.0 modulation envelope parameters (generators 26-32)
    /// Attack time in timecents
    pub attack_timecents: i32,
    /// Hold time in timecents  
    pub hold_timecents: i32,
    /// Decay time in timecents
    pub decay_timecents: i32,
    /// Sustain level (0.1% units, 0-1000)
    pub sustain_level: i32,
    /// Release time in timecents
    pub release_timecents: i32,
    /// Key scaling for hold time (cents per key)
    pub keynum_to_hold: i32,
    /// Key scaling for decay time (cents per key)
    pub keynum_to_decay: i32,
    
    // Key scaling support
    /// MIDI note for key scaling calculations
    pub current_note: u8,
}

impl ModulationEnvelope {
    /// Create new modulation envelope with SoundFont 2.0 generator parameters
    pub fn new(
        sample_rate: f32,
        attack_timecents: i32,    // Generator 26: attackModEnv
        hold_timecents: i32,      // Generator 27: holdModEnv
        decay_timecents: i32,     // Generator 28: decayModEnv
        sustain_level: i32,       // Generator 29: sustainModEnv (0.1% units)
        release_timecents: i32,   // Generator 30: releaseModEnv
        keynum_to_hold: i32,      // Generator 31: keynumToModEnvHold
        keynum_to_decay: i32,     // Generator 32: keynumToModEnvDecay
    ) -> Self {
        log(&format!("ModEnv created: A={}tc H={}tc D={}tc S={} R={}tc", 
                   attack_timecents, hold_timecents, decay_timecents, 
                   sustain_level, release_timecents));
        
        ModulationEnvelope {
            state: EnvelopeState::Off,
            sample_rate,
            current_level: 0.0,
            target_level: 0.0,
            samples_remaining: 0,
            phase_samples: 0,
            attack_timecents,
            hold_timecents,
            decay_timecents,
            sustain_level,
            release_timecents,
            keynum_to_hold,
            keynum_to_decay,
            current_note: 60, // Default to middle C
        }
    }
    
    /// Process modulation envelope for one sample with exponential curves
    pub fn process(&mut self) -> f32 {
        match self.state {
            EnvelopeState::Off => 0.0,
            EnvelopeState::Attack => {
                if self.samples_remaining > 0 {
                    // Exponential attack curve (fast start, slow end)
                    let progress = 1.0 - (self.samples_remaining as f32 / self.phase_samples as f32);
                    self.current_level = progress * progress; // x^2 for exponential curve
                    self.samples_remaining -= 1;
                    
                    if self.samples_remaining == 0 {
                        self.transition_to_hold();
                    }
                } else {
                    self.transition_to_hold();
                }
                self.current_level
            },
            EnvelopeState::Hold => {
                if self.samples_remaining > 0 {
                    self.samples_remaining -= 1;
                    if self.samples_remaining == 0 {
                        self.transition_to_decay();
                    }
                } else {
                    self.transition_to_decay();
                }
                1.0 // Full level during hold
            },
            EnvelopeState::Decay => {
                if self.samples_remaining > 0 {
                    // Exponential decay curve (fast start, slow end)
                    let progress = self.samples_remaining as f32 / self.phase_samples as f32;
                    let sustain_linear = (self.sustain_level as f32 / 1000.0).clamp(0.0, 1.0);
                    self.current_level = sustain_linear + (1.0 - sustain_linear) * progress * progress;
                    self.samples_remaining -= 1;
                    
                    if self.samples_remaining == 0 {
                        self.state = EnvelopeState::Sustain;
                        self.current_level = sustain_linear;
                    }
                } else {
                    let sustain_linear = (self.sustain_level as f32 / 1000.0).clamp(0.0, 1.0);
                    self.current_level = sustain_linear;
                    self.state = EnvelopeState::Sustain;
                }
                self.current_level
            },
            EnvelopeState::Sustain => {
                let sustain_linear = (self.sustain_level as f32 / 1000.0).clamp(0.0, 1.0);
                self.current_level = sustain_linear;
                sustain_linear
            },
            EnvelopeState::Release => {
                if self.samples_remaining > 0 {
                    // Exponential release curve
                    let progress = self.samples_remaining as f32 / self.phase_samples as f32;
                    self.current_level = self.target_level * progress * progress;
                    self.samples_remaining -= 1;
                    
                    if self.samples_remaining == 0 || self.current_level < 0.001 {
                        self.state = EnvelopeState::Off;
                        self.current_level = 0.0;
                    }
                } else {
                    self.state = EnvelopeState::Off;
                    self.current_level = 0.0;
                }
                self.current_level
            },
            EnvelopeState::Delay => 0.0, // Not used in modulation envelope
        }
    }
    
    /// Transition to hold phase
    fn transition_to_hold(&mut self) {
        self.state = EnvelopeState::Hold;
        self.current_level = 1.0;
        
        // Calculate hold time with key scaling
        let scaled_hold_time = self.hold_timecents + 
                              self.keynum_to_hold * (self.current_note as i32 - 60);
        let hold_seconds = timecents_to_seconds(scaled_hold_time);
        self.phase_samples = (hold_seconds * self.sample_rate) as u32;
        self.samples_remaining = self.phase_samples;
    }
    
    /// Transition to decay phase
    fn transition_to_decay(&mut self) {
        self.state = EnvelopeState::Decay;
        
        // Calculate decay time with key scaling
        let scaled_decay_time = self.decay_timecents + 
                               self.keynum_to_decay * (self.current_note as i32 - 60);
        let decay_seconds = timecents_to_seconds(scaled_decay_time);
        self.phase_samples = (decay_seconds * self.sample_rate) as u32;
        self.samples_remaining = self.phase_samples;
    }
    
    /// Trigger modulation envelope for note-on with key scaling
    pub fn trigger(&mut self, note: u8) {
        self.current_note = note;
        self.state = EnvelopeState::Attack;
        self.current_level = 0.0;
        
        // Calculate attack time (no key scaling for attack in modulation envelope)
        let attack_seconds = timecents_to_seconds(self.attack_timecents);
        self.phase_samples = (attack_seconds * self.sample_rate) as u32;
        self.samples_remaining = self.phase_samples;
        
        log(&format!("ModEnv triggered: note={} attack={}ms", 
                   note, attack_seconds * 1000.0));
    }
    
    /// Release modulation envelope for note-off
    pub fn release(&mut self) {
        if self.state != EnvelopeState::Off && self.state != EnvelopeState::Release {
            self.state = EnvelopeState::Release;
            self.target_level = self.current_level; // Release from current level
            
            let release_seconds = timecents_to_seconds(self.release_timecents);
            self.phase_samples = (release_seconds * self.sample_rate) as u32;
            self.samples_remaining = self.phase_samples;
            
            log(&format!("ModEnv released: level={:.3} release={}ms", 
                       self.current_level, release_seconds * 1000.0));
        }
    }
    
    /// Get modulation envelope output level (0.0 to 1.0)
    pub fn get_level(&self) -> f32 {
        self.current_level
    }
    
    /// Check if modulation envelope is active (generating modulation)
    pub fn is_active(&self) -> bool {
        self.state != EnvelopeState::Off
    }
}