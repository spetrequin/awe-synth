/**
 * Modulation Routing System - EMU8000 Modulation Architecture
 * 
 * EMU8000 modulation routing connects modulation sources to synthesis parameters:
 * - Modulation sources: Modulation envelope, LFO1, LFO2, velocity, key scaling
 * - Modulation destinations: Filter cutoff, pitch, amplitude, LFO frequency
 * - Proper scaling and depth control for each modulation type
 * - Real-time parameter updates without artifacts
 */

use crate::log;

/// Modulation sources available in EMU8000
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ModulationSource {
    ModulationEnvelope,  // 6-stage modulation envelope
    Lfo1,               // LFO1 (tremolo)
    Lfo2,               // LFO2 (vibrato)
    Velocity,           // MIDI velocity (0-127)
    KeyNumber,          // MIDI key number (0-127)
    None,               // No modulation
}

/// Modulation destinations for synthesis parameters
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ModulationDestination {
    FilterCutoff,       // Low-pass filter cutoff frequency
    FilterResonance,    // Low-pass filter resonance/Q
    Pitch,              // Sample/oscillator pitch
    Amplitude,          // Voice amplitude (tremolo)
    LfoFrequency,       // LFO frequency modulation
    None,               // No destination
}

/// Modulation routing connection with depth and scaling
#[derive(Debug, Clone)]
pub struct ModulationRoute {
    /// Modulation source
    pub source: ModulationSource,
    /// Modulation destination
    pub destination: ModulationDestination,
    /// Modulation depth/amount (-1.0 to 1.0)
    pub depth: f32,
    /// Parameter scaling for different destination types
    pub scaling: f32,
}

/// Modulation router for connecting sources to destinations
#[derive(Debug, Clone)]
pub struct ModulationRouter {
    /// Active modulation routes
    pub routes: Vec<ModulationRoute>,
    /// Current modulation source values
    pub source_values: [f32; 6], // Index matches ModulationSource enum
}

impl ModulationRouter {
    /// Create new modulation router with default EMU8000 routing
    pub fn new() -> Self {
        log("ModulationRouter created with default EMU8000 routing");
        
        ModulationRouter {
            routes: Vec::new(),
            source_values: [0.0; 6], // Initialize all sources to 0
        }
    }
    
    /// Add a modulation route from source to destination
    pub fn add_route(&mut self, source: ModulationSource, destination: ModulationDestination, 
                     depth: f32, scaling: f32) {
        let clamped_depth = depth.clamp(-1.0, 1.0);
        let route = ModulationRoute {
            source,
            destination,
            depth: clamped_depth,
            scaling,
        };
        
        self.routes.push(route);
        
        log(&format!("Modulation route added: {:?} -> {:?} depth={:.3} scale={:.3}", 
                   source, destination, clamped_depth, scaling));
    }
    
    /// Remove all routes for a specific destination
    pub fn clear_destination_routes(&mut self, destination: ModulationDestination) {
        self.routes.retain(|route| route.destination != destination);
        log(&format!("Cleared all routes to destination: {:?}", destination));
    }
    
    /// Update modulation source value
    pub fn set_source_value(&mut self, source: ModulationSource, value: f32) {
        let index = source as usize;
        if index < self.source_values.len() {
            self.source_values[index] = value.clamp(-1.0, 1.0);
        }
    }
    
    /// Calculate modulated parameter value for a destination
    pub fn get_modulated_value(&self, destination: ModulationDestination, base_value: f32) -> f32 {
        let mut modulated_value = base_value;
        
        // Apply all routes targeting this destination
        for route in &self.routes {
            if route.destination == destination {
                let source_value = self.source_values[route.source as usize];
                let modulation_amount = source_value * route.depth * route.scaling;
                
                // Different parameter types use different modulation methods
                match destination {
                    ModulationDestination::FilterCutoff => {
                        // Filter cutoff: multiplicative modulation (frequency scaling)
                        let cutoff_multiplier = 1.0 + modulation_amount;
                        modulated_value *= cutoff_multiplier.max(0.1); // Prevent negative frequency
                    },
                    ModulationDestination::Amplitude => {
                        // Amplitude: multiplicative modulation (tremolo)
                        let amplitude_multiplier = 1.0 + modulation_amount;
                        modulated_value *= amplitude_multiplier.max(0.0); // Prevent negative amplitude
                    },
                    ModulationDestination::Pitch => {
                        // Pitch: additive modulation in cents
                        modulated_value += modulation_amount;
                    },
                    ModulationDestination::FilterResonance => {
                        // Resonance: additive modulation
                        modulated_value += modulation_amount;
                    },
                    ModulationDestination::LfoFrequency => {
                        // LFO frequency: multiplicative modulation
                        let freq_multiplier = 1.0 + modulation_amount;
                        modulated_value *= freq_multiplier.max(0.01); // Prevent zero frequency
                    },
                    ModulationDestination::None => {}, // No modulation
                }
            }
        }
        
        modulated_value
    }
}