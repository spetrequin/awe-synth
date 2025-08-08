/**
 * Global Chorus Processor - EMU8000 Send/Return Architecture
 * 
 * EMU8000 chorus implementation using modulated delay algorithm:
 * - Send/return architecture: per-voice send levels → global chorus bus
 * - Modulated delay lines with LFO for pitch shifting and detuning
 * - Multi-voice chorus with 2-4 delay taps for stereo width
 * - MIDI CC 93 (chorus send) real-time control per channel
 * - Configurable rate, depth, feedback, and stereo spread parameters
 * - Wet/dry mixing for final chorus output
 */

use crate::log;

/// Send/Return chorus bus for EMU8000 architecture
#[derive(Debug, Clone)]
pub struct ChorusBus {
    /// Global chorus processor
    pub chorus_processor: ChorusProcessor,
    /// Per-channel send levels (16 MIDI channels)
    pub channel_send_levels: [f32; 16],
    /// Master chorus send level
    pub master_send_level: f32,
    /// Chorus return level (wet signal mixing)
    pub return_level: f32,
    /// Accumulated chorus input for current audio frame
    pub chorus_input_accumulator: f32,
}

/// Global chorus processor for EMU8000 send/return architecture
#[derive(Debug, Clone)]
pub struct ChorusProcessor {
    /// Sample rate for delay calculations
    pub sample_rate: f32,
    /// Chorus rate (LFO frequency in Hz, typically 0.1-10.0)
    pub rate: f32,
    /// Chorus depth (modulation depth, 0.0-1.0)
    pub depth: f32,
    /// Feedback amount for chorus resonance (0.0-0.8)
    pub feedback: f32,
    /// Stereo spread amount (0.0-1.0)
    pub stereo_spread: f32,
    /// Wet signal level (0.0 = dry, 1.0 = full wet)
    pub wet_level: f32,
    /// Modulated delay lines for chorus effect
    pub delay_lines: Vec<ModulatedDelayLine>,
    /// LFO for chorus modulation
    pub lfo: ChorusLFO,
    /// Input gain for chorus bus
    pub input_gain: f32,
}

/// Modulated delay line for chorus processing
#[derive(Debug, Clone)]
pub struct ModulatedDelayLine {
    /// Circular buffer for delay storage
    pub buffer: Vec<f32>,
    /// Current write position in buffer
    pub write_pos: usize,
    /// Base delay time in samples
    pub base_delay_samples: f32,
    /// Modulation depth in samples
    pub modulation_depth_samples: f32,
    /// Feedback amount for this delay line
    pub feedback: f32,
    /// Phase offset for stereo chorus effect
    pub phase_offset: f32,
    /// Previous output for feedback
    pub previous_output: f32,
}

/// Low-frequency oscillator for chorus modulation
#[derive(Debug, Clone)]
pub struct ChorusLFO {
    /// LFO frequency in Hz
    pub frequency: f32,
    /// Current phase (0.0-1.0)
    pub phase: f32,
    /// Phase increment per sample
    pub phase_increment: f32,
    /// Sample rate
    pub sample_rate: f32,
    /// Waveform type (sine for smooth chorus)
    pub waveform: ChorusWaveform,
}

/// Chorus LFO waveform types
#[derive(Debug, Clone, PartialEq)]
pub enum ChorusWaveform {
    Sine,     // Smooth modulation (default for chorus)
    Triangle, // Linear modulation
}

impl ChorusProcessor {
    /// Create new global chorus processor with EMU8000 parameters
    /// 
    /// # Arguments
    /// * `sample_rate` - Audio sample rate (typically 44100.0)
    /// * `rate` - Chorus rate in Hz (0.1-10.0, typical 1.0-3.0)
    /// * `depth` - Modulation depth (0.0-1.0, typical 0.3-0.7)
    /// * `feedback` - Feedback amount (0.0-0.8, typical 0.2-0.4)
    /// * `stereo_spread` - Stereo width (0.0-1.0, typical 0.5-0.8)
    pub fn new(sample_rate: f32, rate: f32, depth: f32, feedback: f32, stereo_spread: f32) -> Self {
        // ChorusProcessor creation debug removed
        
        let mut chorus = ChorusProcessor {
            sample_rate,
            rate: rate.clamp(0.1, 10.0),
            depth: depth.clamp(0.0, 1.0),
            feedback: feedback.clamp(0.0, 0.8),
            stereo_spread: stereo_spread.clamp(0.0, 1.0),
            wet_level: 0.5, // Default 50% wet signal
            delay_lines: Vec::new(),
            lfo: ChorusLFO::new(sample_rate, rate, ChorusWaveform::Sine),
            input_gain: 0.7, // Input gain to prevent clipping
        };
        
        // Initialize EMU8000-style chorus structure
        chorus.initialize_chorus_structure();
        
        chorus
    }
    
    /// Initialize EMU8000 chorus structure with multiple modulated delay lines
    fn initialize_chorus_structure(&mut self) {
        // EMU8000 uses 4 delay lines for rich chorus effect
        let base_delay_ms = 2.0 + (self.depth * 8.0); // 2-10ms base delay
        
        // Create 4 delay lines with different delays and phase offsets for stereo width
        let delay_configs = vec![
            (base_delay_ms * 1.0, 0.0),        // Left channel, 0° phase
            (base_delay_ms * 1.3, 0.25),       // Left channel, 90° phase
            (base_delay_ms * 1.6, 0.5),        // Right channel, 180° phase
            (base_delay_ms * 1.9, 0.75),       // Right channel, 270° phase
        ];
        
        // Create modulated delay lines
        for (_i, (delay_ms, phase_offset)) in delay_configs.iter().enumerate() {
            let delay_samples = (delay_ms * self.sample_rate / 1000.0) as usize;
            let modulation_depth_samples = self.depth * 2.0 * self.sample_rate / 1000.0; // Up to 2ms modulation
            let feedback = self.feedback * 0.8; // Reduce feedback per line to avoid buildup
            
            let delay_line = ModulatedDelayLine::new(
                delay_samples, 
                modulation_depth_samples, 
                feedback, 
                *phase_offset
            );
            self.delay_lines.push(delay_line);
        }
        
        // Chorus structure debug removed
    }
    
    /// Process chorus for one audio sample using EMU8000 algorithm
    /// 
    /// # Arguments
    /// * `input` - Input audio sample from chorus send bus
    /// 
    /// # Returns
    /// Processed chorus output sample
    pub fn process(&mut self, input: f32) -> f32 {
        // Apply input gain to prevent clipping
        let signal = input * self.input_gain;
        
        // Update LFO for modulation
        let lfo_output = self.lfo.process();
        
        // Process through all modulated delay lines
        let mut chorus_output = 0.0;
        for delay_line in self.delay_lines.iter_mut() {
            let delayed_sample = delay_line.process(signal, lfo_output);
            chorus_output += delayed_sample * 0.25; // Mix 4 delay lines
        }
        
        // Apply stereo spread by mixing original and processed signal
        let spread_mix = signal * (1.0 - self.stereo_spread) + chorus_output * self.stereo_spread;
        
        // Final wet signal with level control
        spread_mix * self.wet_level
    }
    
    /// Set chorus rate (LFO frequency)
    pub fn set_rate(&mut self, rate: f32) {
        self.rate = rate.clamp(0.1, 10.0);
        self.lfo.set_frequency(self.rate);
        // Chorus rate debug removed
    }
    
    /// Set chorus depth (modulation amount)
    pub fn set_depth(&mut self, depth: f32) {
        self.depth = depth.clamp(0.0, 1.0);
        // Update modulation depth for all delay lines
        let modulation_depth_samples = self.depth * 2.0 * self.sample_rate / 1000.0;
        for delay_line in self.delay_lines.iter_mut() {
            delay_line.set_modulation_depth(modulation_depth_samples);
        }
        // Chorus depth debug removed
    }
    
    /// Set chorus feedback amount
    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = feedback.clamp(0.0, 0.8);
        // Update feedback for all delay lines
        for delay_line in self.delay_lines.iter_mut() {
            delay_line.set_feedback(self.feedback * 0.8);
        }
        // Chorus feedback debug removed
    }
    
    /// Set stereo spread amount
    pub fn set_stereo_spread(&mut self, stereo_spread: f32) {
        self.stereo_spread = stereo_spread.clamp(0.0, 1.0);
        // Chorus stereo spread debug removed
    }
    
    /// Set wet signal level
    pub fn set_wet_level(&mut self, wet_level: f32) {
        self.wet_level = wet_level.clamp(0.0, 1.0);
        // Chorus wet level debug removed
    }
}

impl ChorusBus {
    /// Create new send/return chorus bus with EMU8000 defaults
    pub fn new(sample_rate: f32) -> Self {
        let chorus_processor = ChorusProcessor::new(
            sample_rate,
            2.0,    // 2Hz rate
            0.5,    // 50% depth
            0.3,    // 30% feedback
            0.7,    // 70% stereo spread
        );
        
        ChorusBus {
            chorus_processor,
            channel_send_levels: [0.0; 16], // All channels start with no chorus
            master_send_level: 1.0,          // Full send level
            return_level: 0.4,               // 40% return level
            chorus_input_accumulator: 0.0,
        }
    }
    
    /// Add voice output to chorus send bus
    /// 
    /// # Arguments
    /// * `dry_signal` - Voice's dry audio output
    /// * `send_level` - Voice's chorus send amount (0.0-1.0)
    /// * `channel` - MIDI channel (0-15) for channel-specific send control
    pub fn add_voice_send(&mut self, dry_signal: f32, send_level: f32, channel: u8) {
        let channel_idx = (channel as usize).min(15);
        let channel_send = self.channel_send_levels[channel_idx];
        let total_send = send_level * channel_send * self.master_send_level;
        
        // Accumulate chorus input for this audio frame
        self.chorus_input_accumulator += dry_signal * total_send;
    }
    
    /// Process accumulated chorus input and return wet signal
    /// Call this once per audio frame after all voices have added their sends
    pub fn process_chorus(&mut self) -> f32 {
        // Process accumulated chorus input
        let wet_signal = self.chorus_processor.process(self.chorus_input_accumulator);
        
        // Reset accumulator for next frame
        self.chorus_input_accumulator = 0.0;
        
        // Return wet signal with return level
        wet_signal * self.return_level
    }
    
    /// Set MIDI channel chorus send level (MIDI CC 93)
    pub fn set_channel_send(&mut self, channel: u8, send_level: f32) {
        let channel_idx = (channel as usize).min(15);
        self.channel_send_levels[channel_idx] = send_level.clamp(0.0, 1.0);
        // Channel chorus send debug removed
    }
    
    /// Set master chorus send level
    pub fn set_master_send(&mut self, send_level: f32) {
        self.master_send_level = send_level.clamp(0.0, 1.0);
        // Master chorus send debug removed
    }
    
    /// Set chorus return level (wet signal mixing)
    pub fn set_return_level(&mut self, return_level: f32) {
        self.return_level = return_level.clamp(0.0, 1.0);
        // Chorus return level debug removed
    }
    
    /// Configure chorus parameters
    pub fn configure_chorus(&mut self, rate: f32, depth: f32, feedback: f32, stereo_spread: f32) {
        self.chorus_processor.set_rate(rate);
        self.chorus_processor.set_depth(depth);
        self.chorus_processor.set_feedback(feedback);
        self.chorus_processor.set_stereo_spread(stereo_spread);
    }
}

impl ModulatedDelayLine {
    /// Create new modulated delay line
    pub fn new(base_delay_samples: usize, modulation_depth_samples: f32, feedback: f32, phase_offset: f32) -> Self {
        let buffer_size = (base_delay_samples as f32 + modulation_depth_samples + 10.0) as usize; // Extra room for modulation
        ModulatedDelayLine {
            buffer: vec![0.0; buffer_size],
            write_pos: 0,
            base_delay_samples: base_delay_samples as f32,
            modulation_depth_samples,
            feedback: feedback.clamp(0.0, 0.9),
            phase_offset,
            previous_output: 0.0,
        }
    }
    
    /// Process one sample through modulated delay line
    pub fn process(&mut self, input: f32, lfo_output: f32) -> f32 {
        // Calculate modulated delay time
        let lfo_with_phase = ((lfo_output + self.phase_offset) % 1.0) * 2.0 - 1.0; // -1.0 to 1.0
        let modulated_delay = self.base_delay_samples + (lfo_with_phase * self.modulation_depth_samples);
        let delay_samples = modulated_delay.max(1.0).min(self.buffer.len() as f32 - 1.0);
        
        // Linear interpolation for fractional delay
        let delay_int = delay_samples as usize;
        let delay_frac = delay_samples - delay_int as f32;
        
        let read_pos1 = (self.write_pos + self.buffer.len() - delay_int) % self.buffer.len();
        let read_pos2 = (read_pos1 + self.buffer.len() - 1) % self.buffer.len();
        
        let sample1 = self.buffer[read_pos1];
        let sample2 = self.buffer[read_pos2];
        let delayed_sample = sample1 + (sample2 - sample1) * delay_frac;
        
        // Write new sample with feedback
        self.buffer[self.write_pos] = input + (self.previous_output * self.feedback);
        
        // Advance write position
        self.write_pos = (self.write_pos + 1) % self.buffer.len();
        
        // Store output for next feedback
        self.previous_output = delayed_sample;
        
        delayed_sample
    }
    
    /// Set modulation depth
    pub fn set_modulation_depth(&mut self, modulation_depth_samples: f32) {
        self.modulation_depth_samples = modulation_depth_samples;
    }
    
    /// Set feedback amount
    pub fn set_feedback(&mut self, feedback: f32) {
        self.feedback = feedback.clamp(0.0, 0.9);
    }
}

impl ChorusLFO {
    /// Create new chorus LFO
    pub fn new(sample_rate: f32, frequency: f32, waveform: ChorusWaveform) -> Self {
        let phase_increment = frequency / sample_rate;
        ChorusLFO {
            frequency,
            phase: 0.0,
            phase_increment,
            sample_rate,
            waveform,
        }
    }
    
    /// Process one sample and return LFO output (0.0-1.0)
    pub fn process(&mut self) -> f32 {
        let output = match self.waveform {
            ChorusWaveform::Sine => {
                (self.phase * 2.0 * std::f32::consts::PI).sin() * 0.5 + 0.5
            },
            ChorusWaveform::Triangle => {
                if self.phase < 0.5 {
                    self.phase * 2.0
                } else {
                    2.0 - (self.phase * 2.0)
                }
            },
        };
        
        // Advance phase
        self.phase += self.phase_increment;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        
        output
    }
    
    /// Set LFO frequency
    pub fn set_frequency(&mut self, frequency: f32) {
        self.frequency = frequency.clamp(0.1, 10.0);
        self.phase_increment = self.frequency / self.sample_rate;
    }
}