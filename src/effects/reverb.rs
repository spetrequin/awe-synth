/**
 * Global Reverb Processor - EMU8000 Send/Return Architecture
 * 
 * EMU8000 reverb implementation using multi-tap delay algorithm:
 * - Send/return architecture: per-voice send levels → global reverb bus
 * - Multi-tap delay lines with diffusion for spatial characteristics
 * - All-pass and comb filters for authentic EMU8000 reverb sound
 * - MIDI CC 91 (reverb send) real-time control per channel
 * - Configurable room size, damping, and diffusion parameters
 * - Wet/dry mixing for final reverb output
 */

use crate::log;

/// Send/Return reverb bus for EMU8000 architecture
#[derive(Debug, Clone)]
pub struct ReverbBus {
    /// Global reverb processor
    pub reverb_processor: ReverbProcessor,
    /// Per-channel send levels (16 MIDI channels)
    pub channel_send_levels: [f32; 16],
    /// Master reverb send level
    pub master_send_level: f32,
    /// Reverb return level (wet signal mixing)
    pub return_level: f32,
    /// Accumulated reverb input for current audio frame
    pub reverb_input_accumulator: f32,
}

/// Global reverb processor for EMU8000 send/return architecture
#[derive(Debug, Clone)]
pub struct ReverbProcessor {
    /// Sample rate for delay calculations
    pub sample_rate: f32,
    /// Room size parameter (0.0 = small, 1.0 = large hall)
    pub room_size: f32,
    /// Damping factor (0.0 = no damping, 1.0 = heavy damping)
    pub damping: f32,
    /// Diffusion amount (0.0 = no diffusion, 1.0 = maximum)
    pub diffusion: f32,
    /// Wet signal level (0.0 = dry, 1.0 = full wet)
    pub wet_level: f32,
    /// Multi-tap delay lines for reverb generation
    pub delay_lines: Vec<DelayLine>,
    /// All-pass filters for diffusion
    pub allpass_filters: Vec<AllPassFilter>,
    /// Comb filters with feedback for decay
    pub comb_filters: Vec<CombFilter>,
    /// Input gain for reverb bus
    pub input_gain: f32,
}

/// Delay line for reverb multi-tap processing
#[derive(Debug, Clone)]
pub struct DelayLine {
    /// Circular buffer for delay storage
    pub buffer: Vec<f32>,
    /// Current write position in buffer
    pub write_pos: usize,
    /// Delay time in samples
    pub delay_samples: usize,
    /// Feedback amount for delay line
    pub feedback: f32,
}

/// All-pass filter for reverb diffusion
#[derive(Debug, Clone)]
pub struct AllPassFilter {
    /// Delay line for all-pass processing
    pub delay_line: DelayLine,
    /// All-pass gain coefficient
    pub gain: f32,
}

/// Comb filter with feedback for reverb decay
#[derive(Debug, Clone)]
pub struct CombFilter {
    /// Delay line for comb processing
    pub delay_line: DelayLine,
    /// Damping filter for high-frequency rolloff
    pub damping_filter: f32,
    /// Previous output for damping calculation
    pub damping_state: f32,
}

impl ReverbProcessor {
    /// Create new global reverb processor with EMU8000 parameters
    /// 
    /// # Arguments
    /// * `sample_rate` - Audio sample rate (typically 44100.0)
    /// * `room_size` - Room size (0.0 = small room, 1.0 = large hall)
    /// * `damping` - High-frequency damping (0.0 = bright, 1.0 = dark)
    /// * `diffusion` - Echo density (0.0 = sparse, 1.0 = dense)
    pub fn new(sample_rate: f32, room_size: f32, damping: f32, diffusion: f32) -> Self {
        log(&format!("ReverbProcessor created: room_size={:.2} damping={:.2} diffusion={:.2} @{:.0}Hz", 
                   room_size, damping, diffusion, sample_rate));
        
        let mut reverb = ReverbProcessor {
            sample_rate,
            room_size: room_size.clamp(0.0, 1.0),
            damping: damping.clamp(0.0, 1.0),
            diffusion: diffusion.clamp(0.0, 1.0),
            wet_level: 0.3, // Default 30% wet signal
            delay_lines: Vec::new(),
            allpass_filters: Vec::new(),
            comb_filters: Vec::new(),
            input_gain: 0.5, // Input gain to prevent clipping
        };
        
        // Initialize EMU8000-style reverb structure
        reverb.initialize_reverb_structure();
        
        reverb
    }
    
    /// Initialize EMU8000 reverb structure with multiple delay lines and filters
    fn initialize_reverb_structure(&mut self) {
        // EMU8000 uses multiple delay taps with different times for spatial effect
        let base_delay_ms = 20.0 + (self.room_size * 80.0); // 20-100ms base delay
        
        // Create 6 delay taps with golden ratio spacing for natural sound
        let delay_times_ms = vec![
            base_delay_ms * 1.0,
            base_delay_ms * 1.618,     // Golden ratio
            base_delay_ms * 2.618,     // Golden ratio squared  
            base_delay_ms * 4.236,     // Golden ratio cubed
            base_delay_ms * 6.854,     // Fibonacci progression
            base_delay_ms * 11.090,    // Natural reverb spacing
        ];
        
        // Create delay lines with decreasing feedback
        for (i, &delay_ms) in delay_times_ms.iter().enumerate() {
            let delay_samples = (delay_ms * self.sample_rate / 1000.0) as usize;
            let feedback = 0.7 - (i as f32 * 0.1); // Decreasing feedback: 0.7, 0.6, 0.5, etc.
            
            let delay_line = DelayLine::new(delay_samples, feedback);
            self.delay_lines.push(delay_line);
        }
        
        // Create all-pass filters for diffusion (EMU8000 uses 4 all-pass stages)
        let allpass_delays_ms = vec![5.0, 8.3, 13.7, 21.3]; // Prime-based delays for diffusion
        for &delay_ms in allpass_delays_ms.iter() {
            let delay_samples = (delay_ms * self.sample_rate / 1000.0) as usize;
            let gain = 0.7 * self.diffusion; // Diffusion controls all-pass gain
            
            let allpass = AllPassFilter::new(delay_samples, gain);
            self.allpass_filters.push(allpass);
        }
        
        // Create comb filters for decay characteristics (EMU8000 style)
        let comb_delays_ms = vec![29.7, 37.1, 41.1, 43.7]; // Prime delays to avoid resonances
        for &delay_ms in comb_delays_ms.iter() {
            let delay_samples = (delay_ms * self.sample_rate / 1000.0) as usize;
            let feedback = 0.8 - (self.damping * 0.3); // Damping reduces feedback
            
            let comb = CombFilter::new(delay_samples, feedback, self.damping);
            self.comb_filters.push(comb);
        }
        
        log(&format!("Reverb structure: {} delays, {} allpass, {} combs", 
                   self.delay_lines.len(), self.allpass_filters.len(), self.comb_filters.len()));
    }
    
    /// Process reverb for one audio sample using EMU8000 algorithm
    /// 
    /// # Arguments
    /// * `input` - Input audio sample from reverb send bus
    /// 
    /// # Returns
    /// Processed reverb output sample
    pub fn process(&mut self, input: f32) -> f32 {
        // Apply input gain to prevent clipping
        let mut signal = input * self.input_gain;
        
        // Stage 1: All-pass diffusion for early reflections
        for allpass in self.allpass_filters.iter_mut() {
            signal = allpass.process(signal);
        }
        
        // Stage 2: Multi-tap delays for spatial characteristics
        let mut delay_output = 0.0;
        for delay_line in self.delay_lines.iter_mut() {
            delay_output += delay_line.process(signal) * 0.166; // Mix 6 delays
        }
        
        // Stage 3: Comb filters for decay and resonance
        let mut comb_output = 0.0;
        for comb in self.comb_filters.iter_mut() {
            comb_output += comb.process(delay_output) * 0.25; // Mix 4 combs
        }
        
        // Final wet signal with level control
        comb_output * self.wet_level
    }
    
    /// Set room size parameter (affects delay times)
    pub fn set_room_size(&mut self, room_size: f32) {
        self.room_size = room_size.clamp(0.0, 1.0);
        self.initialize_reverb_structure(); // Rebuild with new delays
        log(&format!("Reverb room size set to {:.2}", self.room_size));
    }
    
    /// Set damping parameter (affects high-frequency decay)
    pub fn set_damping(&mut self, damping: f32) {
        self.damping = damping.clamp(0.0, 1.0);
        // Update comb filter damping
        for comb in self.comb_filters.iter_mut() {
            comb.set_damping(self.damping);
        }
        log(&format!("Reverb damping set to {:.2}", self.damping));
    }
    
    /// Set diffusion parameter (affects echo density)
    pub fn set_diffusion(&mut self, diffusion: f32) {
        self.diffusion = diffusion.clamp(0.0, 1.0);
        // Update all-pass filter gains
        for allpass in self.allpass_filters.iter_mut() {
            allpass.set_gain(0.7 * self.diffusion);
        }
        log(&format!("Reverb diffusion set to {:.2}", self.diffusion));
    }
    
    /// Set wet signal level
    pub fn set_wet_level(&mut self, wet_level: f32) {
        self.wet_level = wet_level.clamp(0.0, 1.0);
        log(&format!("Reverb wet level set to {:.2}", self.wet_level));
    }
}

impl ReverbBus {
    /// Create new send/return reverb bus with EMU8000 defaults
    pub fn new(sample_rate: f32) -> Self {
        let reverb_processor = ReverbProcessor::new(
            sample_rate,
            0.5,    // Medium room size
            0.3,    // Light damping
            0.7,    // Good diffusion
        );
        
        ReverbBus {
            reverb_processor,
            channel_send_levels: [0.0; 16], // All channels start with no reverb
            master_send_level: 1.0,          // Full send level
            return_level: 0.5,               // 50% return level
            reverb_input_accumulator: 0.0,
        }
    }
    
    /// Add voice output to reverb send bus
    /// 
    /// # Arguments
    /// * `dry_signal` - Voice's dry audio output
    /// * `send_level` - Voice's reverb send amount (0.0-1.0)
    /// * `channel` - MIDI channel (0-15) for channel-specific send control
    pub fn add_voice_send(&mut self, dry_signal: f32, send_level: f32, channel: u8) {
        let channel_idx = (channel as usize).min(15);
        let channel_send = self.channel_send_levels[channel_idx];
        let total_send = send_level * channel_send * self.master_send_level;
        
        // Accumulate reverb input for this audio frame
        self.reverb_input_accumulator += dry_signal * total_send;
    }
    
    /// Process accumulated reverb input and return wet signal
    /// Call this once per audio frame after all voices have added their sends
    pub fn process_reverb(&mut self) -> f32 {
        // Process accumulated reverb input
        let wet_signal = self.reverb_processor.process(self.reverb_input_accumulator);
        
        // Reset accumulator for next frame
        self.reverb_input_accumulator = 0.0;
        
        // Return wet signal with return level
        wet_signal * self.return_level
    }
    
    /// Set MIDI channel reverb send level (MIDI CC 91)
    pub fn set_channel_send(&mut self, channel: u8, send_level: f32) {
        let channel_idx = (channel as usize).min(15);
        self.channel_send_levels[channel_idx] = send_level.clamp(0.0, 1.0);
        log(&format!("Channel {} reverb send set to {:.2}", channel, send_level));
    }
    
    /// Set master reverb send level
    pub fn set_master_send(&mut self, send_level: f32) {
        self.master_send_level = send_level.clamp(0.0, 1.0);
        log(&format!("Master reverb send set to {:.2}", self.master_send_level));
    }
    
    /// Set reverb return level (wet signal mixing)
    pub fn set_return_level(&mut self, return_level: f32) {
        self.return_level = return_level.clamp(0.0, 1.0);
        log(&format!("Reverb return level set to {:.2}", self.return_level));
    }
    
    /// Configure reverb parameters
    pub fn configure_reverb(&mut self, room_size: f32, damping: f32, diffusion: f32) {
        self.reverb_processor.set_room_size(room_size);
        self.reverb_processor.set_damping(damping);
        self.reverb_processor.set_diffusion(diffusion);
    }
}

impl DelayLine {
    /// Create new delay line
    pub fn new(delay_samples: usize, feedback: f32) -> Self {
        let buffer_size = delay_samples.max(1); // Minimum 1 sample delay
        DelayLine {
            buffer: vec![0.0; buffer_size],
            write_pos: 0,
            delay_samples,
            feedback: feedback.clamp(0.0, 0.95), // Prevent runaway feedback
        }
    }
    
    /// Process one sample through delay line with feedback
    pub fn process(&mut self, input: f32) -> f32 {
        // Read delayed sample
        let read_pos = (self.write_pos + self.buffer.len() - self.delay_samples) % self.buffer.len();
        let delayed_sample = self.buffer[read_pos];
        
        // Write new sample with feedback
        self.buffer[self.write_pos] = input + (delayed_sample * self.feedback);
        
        // Advance write position
        self.write_pos = (self.write_pos + 1) % self.buffer.len();
        
        delayed_sample
    }
}

impl AllPassFilter {
    /// Create new all-pass filter
    pub fn new(delay_samples: usize, gain: f32) -> Self {
        AllPassFilter {
            delay_line: DelayLine::new(delay_samples, 0.0), // No feedback in delay line
            gain: gain.clamp(-0.9, 0.9), // Stable all-pass range
        }
    }
    
    /// Process one sample through all-pass filter
    pub fn process(&mut self, input: f32) -> f32 {
        let delayed = self.delay_line.process(input + (self.delay_line.buffer[self.delay_line.write_pos] * -self.gain));
        delayed + (input * self.gain)
    }
    
    /// Set all-pass gain
    pub fn set_gain(&mut self, gain: f32) {
        self.gain = gain.clamp(-0.9, 0.9);
    }
}

impl CombFilter {
    /// Create new comb filter with damping
    pub fn new(delay_samples: usize, feedback: f32, damping: f32) -> Self {
        CombFilter {
            delay_line: DelayLine::new(delay_samples, 0.0), // Handle feedback internally
            damping_filter: damping.clamp(0.0, 1.0),
            damping_state: 0.0,
        }
    }
    
    /// Process one sample through comb filter with damping
    pub fn process(&mut self, input: f32) -> f32 {
        let delayed = self.delay_line.process(input);
        
        // Apply damping filter (simple one-pole lowpass)
        self.damping_state = delayed + (self.damping_state - delayed) * self.damping_filter;
        
        // Add damped feedback
        let feedback_amount = 0.8 - (self.damping_filter * 0.3);
        self.delay_line.buffer[self.delay_line.write_pos] += self.damping_state * feedback_amount;
        
        delayed
    }
    
    /// Set damping amount
    pub fn set_damping(&mut self, damping: f32) {
        self.damping_filter = damping.clamp(0.0, 1.0);
    }
}