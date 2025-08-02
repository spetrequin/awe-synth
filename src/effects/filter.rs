/**
 * EMU8000 Low-Pass Filter Implementation
 * 
 * 2-pole (12dB/octave) resonant low-pass filter matching EMU8000 specifications:
 * - Cutoff range: 100Hz to 8kHz (hardware limitation)
 * - Resonance: 0 to 40dB peak at cutoff frequency
 * - Real-time coefficient calculation for modulation
 */

use crate::log;

/// EMU8000 2-pole low-pass resonant filter
#[derive(Debug, Clone)]
pub struct LowPassFilter {
    /// Current cutoff frequency in Hz (100Hz-8kHz range)
    pub cutoff_hz: f32,
    /// Resonance Q factor (0.7 to ~40 for 0-40dB peak)
    pub resonance_q: f32,
    /// Sample rate for coefficient calculation
    pub sample_rate: f32,
    
    // Filter state variables (2-pole = 2 delay elements)
    /// First delay element (z^-1)
    pub delay1: f32,
    /// Second delay element (z^-2)  
    pub delay2: f32,
    
    // Filter coefficients (calculated from cutoff/resonance)
    /// Feed-forward coefficient for input
    pub a0: f32,
    /// Feed-forward coefficient for z^-1
    pub a1: f32,
    /// Feed-forward coefficient for z^-2
    pub a2: f32,
    /// Feedback coefficient for z^-1
    pub b1: f32,
    /// Feedback coefficient for z^-2
    pub b2: f32,
}

impl LowPassFilter {
    /// Create new 2-pole low-pass filter with EMU8000 specifications
    pub fn new(sample_rate: f32, cutoff_hz: f32, resonance_q: f32) -> Self {
        let mut filter = LowPassFilter {
            cutoff_hz: cutoff_hz.clamp(100.0, 8000.0), // EMU8000 range limit
            resonance_q: resonance_q.clamp(0.7, 40.0), // EMU8000 resonance limit
            sample_rate,
            delay1: 0.0,
            delay2: 0.0,
            a0: 0.0,
            a1: 0.0,
            a2: 0.0,
            b1: 0.0,
            b2: 0.0,
        };
        
        // Calculate initial filter coefficients
        filter.calculate_coefficients();
        filter
    }
    
    /// Process audio sample through 2-pole low-pass filter
    pub fn process(&mut self, input: f32) -> f32 {
        // 2-pole IIR filter equation:
        // y[n] = a0*x[n] + a1*x[n-1] + a2*x[n-2] - b1*y[n-1] - b2*y[n-2]
        
        // Calculate output using current coefficients
        let output = self.a0 * input + self.a1 * self.delay1 + self.a2 * self.delay2
                   - self.b1 * self.delay1 - self.b2 * self.delay2;
        
        // Update delay line (shift history)
        self.delay2 = self.delay1;
        self.delay1 = output;
        
        // Clamp output to prevent runaway feedback
        output.clamp(-2.0, 2.0)
    }
    
    /// Update cutoff frequency with EMU8000 range validation
    pub fn set_cutoff(&mut self, cutoff_hz: f32) {
        let new_cutoff = cutoff_hz.clamp(100.0, 8000.0);
        if (new_cutoff - self.cutoff_hz).abs() > 0.1 {
            self.cutoff_hz = new_cutoff;
            self.calculate_coefficients();
        }
    }
    
    /// Update resonance with EMU8000 range validation  
    pub fn set_resonance(&mut self, resonance_q: f32) {
        let new_resonance = resonance_q.clamp(0.7, 40.0);
        if (new_resonance - self.resonance_q).abs() > 0.01 {
            self.resonance_q = new_resonance;
            self.calculate_coefficients();
        }
    }
    
    /// Calculate 2-pole Butterworth filter coefficients for current cutoff/resonance
    fn calculate_coefficients(&mut self) {
        // Prevent division by zero and ensure valid range
        if self.sample_rate <= 0.0 || self.cutoff_hz <= 0.0 {
            log("Warning: Invalid filter parameters, using safe defaults");
            self.a0 = 1.0; // Pass-through
            self.a1 = 0.0;
            self.a2 = 0.0;
            self.b1 = 0.0;
            self.b2 = 0.0;
            return;
        }
        
        // Calculate normalized frequency (0 to π)
        let omega = 2.0 * std::f32::consts::PI * self.cutoff_hz / self.sample_rate;
        let cos_omega = omega.cos();
        let sin_omega = omega.sin();
        
        // Calculate alpha for resonance (Q factor)
        let alpha = sin_omega / (2.0 * self.resonance_q);
        
        // Calculate denominator for normalization
        let norm = 1.0 + alpha;
        
        // Butterworth 2-pole low-pass coefficients
        self.a0 = (1.0 - cos_omega) / (2.0 * norm);
        self.a1 = (1.0 - cos_omega) / norm;
        self.a2 = (1.0 - cos_omega) / (2.0 * norm);
        self.b1 = (-2.0 * cos_omega) / norm;
        self.b2 = (1.0 - alpha) / norm;
        
        log(&format!("Filter coefficients: fc={:.1}Hz Q={:.2} a0={:.4} b1={:.4} b2={:.4}", 
                   self.cutoff_hz, self.resonance_q, self.a0, self.b1, self.b2));
    }
}