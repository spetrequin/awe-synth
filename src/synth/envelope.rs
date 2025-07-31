/**
 * EMU8000 6-Stage DAHDSR Envelope Implementation
 * 
 * Implements authentic EMU8000 envelope behavior with:
 * - 6-stage envelope: Delay → Attack → Hold → Decay → Sustain → Release
 * - Exponential curves (FluidSynth-compatible)
 * - SoundFont 2.0 generator parameter support
 * - Key scaling for authentic instrument behavior
 */

/// EMU8000 envelope states for 6-stage DAHDSR envelope
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EnvelopeState {
    /// Envelope is inactive (voice not playing)
    Off,
    /// Initial delay before envelope starts (Generator 33: delayVolEnv)
    Delay,
    /// Rising from 0 to peak level (Generator 34: attackVolEnv)
    Attack,
    /// Holding at peak level (Generator 35: holdVolEnv)
    Hold,
    /// Falling from peak to sustain level (Generator 36: decayVolEnv)
    Decay,
    /// Holding at sustain level until note off (Generator 37: sustainVolEnv)
    Sustain,
    /// Falling from sustain to 0 after note off (Generator 38: releaseVolEnv)
    Release,
}

/// Convert timecents to seconds (EMU8000/SoundFont 2.0 specification)
/// Used for envelope timing phases: delay, attack, hold, decay, release
/// Formula: time_seconds = 2^(timecents / 1200)
pub fn timecents_to_seconds(timecents: i32) -> f32 {
    2.0_f32.powf(timecents as f32 / 1200.0)
}

/// Convert centibels to linear amplitude (EMU8000/SoundFont 2.0 specification)  
/// Used for sustain levels and attenuation
/// Formula: amplitude = 10^(-centibels / 200)
pub fn centibels_to_linear(centibels: i32) -> f32 {
    10.0_f32.powf(-centibels as f32 / 200.0)
}

/// EMU8000 6-stage DAHDSR envelope generator
/// Implements authentic envelope behavior with exponential curves
#[derive(Debug, Clone)]
pub struct DAHDSREnvelope {
    /// Current envelope state
    pub state: EnvelopeState,
    /// Current envelope amplitude (0.0 to 1.0)
    pub current_level: f32,
    /// Number of samples elapsed in current stage
    pub stage_samples: u32,
    
    // Stage durations in samples (converted from timecents)
    pub delay_samples: u32,
    pub attack_samples: u32,
    pub hold_samples: u32,
    pub decay_samples: u32,
    pub release_samples: u32,
    
    /// Sustain level (0.0 to 1.0, converted from centibels)
    pub sustain_level: f32,
}

impl DAHDSREnvelope {
    /// Create new DAHDSR envelope with SoundFont generator parameters
    /// Parameters correspond to SoundFont 2.0 generators 33-38 (volume envelope)
    pub fn new(
        sample_rate: f32,
        delay_timecents: i32,    // Generator 33: delayVolEnv
        attack_timecents: i32,   // Generator 34: attackVolEnv  
        hold_timecents: i32,     // Generator 35: holdVolEnv
        decay_timecents: i32,    // Generator 36: decayVolEnv
        sustain_centibels: i32,  // Generator 37: sustainVolEnv
        release_timecents: i32,  // Generator 38: releaseVolEnv
    ) -> Self {
        // Convert timecents to sample counts
        let delay_seconds = timecents_to_seconds(delay_timecents);
        let attack_seconds = timecents_to_seconds(attack_timecents);
        let hold_seconds = timecents_to_seconds(hold_timecents);
        let decay_seconds = timecents_to_seconds(decay_timecents);
        let release_seconds = timecents_to_seconds(release_timecents);
        
        Self {
            state: EnvelopeState::Off,
            current_level: 0.0,
            stage_samples: 0,
            delay_samples: (delay_seconds * sample_rate) as u32,
            attack_samples: (attack_seconds * sample_rate) as u32,
            hold_samples: (hold_seconds * sample_rate) as u32,
            decay_samples: (decay_seconds * sample_rate) as u32,
            release_samples: (release_seconds * sample_rate) as u32,
            sustain_level: centibels_to_linear(sustain_centibels),
        }
    }
    
    /// Trigger envelope start (note-on event)
    /// Transitions from Off state to Delay stage
    pub fn trigger(&mut self) {
        self.state = EnvelopeState::Delay;
        self.stage_samples = 0;
        self.current_level = 0.0;
    }
    
    /// Release envelope (note-off event)
    /// Transitions to Release stage from any active state
    pub fn release(&mut self) {
        if self.state != EnvelopeState::Off {
            self.state = EnvelopeState::Release;
            self.stage_samples = 0;
        }
    }
    
    /// Process envelope for one sample with exponential curves
    /// Returns current envelope amplitude (0.0 to 1.0)
    /// Uses FluidSynth-compatible exponential curve factor of 2.0
    pub fn process(&mut self) -> f32 {
        match self.state {
            EnvelopeState::Off => {
                self.current_level = 0.0;
            },
            EnvelopeState::Delay => {
                // Stay at 0 during delay phase
                self.current_level = 0.0;
                self.stage_samples += 1;
                if self.stage_samples >= self.delay_samples {
                    self.state = EnvelopeState::Attack;
                    self.stage_samples = 0;
                }
            },
            EnvelopeState::Attack => {
                // Exponential rise from 0 to 1.0
                if self.attack_samples > 0 {
                    let progress = (self.stage_samples as f32 / self.attack_samples as f32).min(1.0);
                    let exp_progress = progress.powf(2.0); // EMU8000/FluidSynth exponential curve
                    self.current_level = exp_progress;
                }
                self.stage_samples += 1;
                if self.stage_samples >= self.attack_samples {
                    self.state = EnvelopeState::Hold;
                    self.stage_samples = 0;
                    self.current_level = 1.0; // Ensure we reach peak
                }
            },
            EnvelopeState::Hold => {
                // Hold at peak level
                self.current_level = 1.0;
                self.stage_samples += 1;
                if self.stage_samples >= self.hold_samples {
                    self.state = EnvelopeState::Decay;
                    self.stage_samples = 0;
                }
            },
            EnvelopeState::Decay => {
                // Exponential fall from 1.0 to sustain_level
                if self.decay_samples > 0 {
                    let progress = (self.stage_samples as f32 / self.decay_samples as f32).min(1.0);
                    let exp_progress = progress.powf(2.0); // EMU8000/FluidSynth exponential curve
                    self.current_level = 1.0 + (self.sustain_level - 1.0) * exp_progress;
                }
                self.stage_samples += 1;
                if self.stage_samples >= self.decay_samples {
                    self.state = EnvelopeState::Sustain;
                    self.stage_samples = 0;
                    self.current_level = self.sustain_level; // Ensure we reach sustain level
                }
            },
            EnvelopeState::Sustain => {
                // Hold at sustain level until note off
                self.current_level = self.sustain_level;
            },
            EnvelopeState::Release => {
                // Exponential fall from current level to 0
                if self.release_samples > 0 {
                    let progress = (self.stage_samples as f32 / self.release_samples as f32).min(1.0);
                    let exp_progress = progress.powf(2.0); // EMU8000/FluidSynth exponential curve
                    let start_level = self.sustain_level; // Level when release started
                    self.current_level = start_level * (1.0 - exp_progress);
                }
                self.stage_samples += 1;
                if self.stage_samples >= self.release_samples || self.current_level <= 0.001 {
                    self.state = EnvelopeState::Off;
                    self.current_level = 0.0;
                }
            },
        }
        
        self.current_level
    }
}