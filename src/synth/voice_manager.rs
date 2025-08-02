use super::voice::{Voice, SampleVoice, MultiZoneSampleVoice};
use crate::soundfont::types::*;
use crate::effects::reverb::ReverbBus;
use crate::effects::chorus::ChorusBus;
use crate::midi::effects_controller::MidiEffectsController;
use crate::log;
use std::collections::HashMap;

/// Zone selection strategies for multi-sample instruments
#[derive(Debug, Clone, PartialEq)]
pub enum ZoneSelectionStrategy {
    /// Select all matching zones (default EMU8000 behavior)
    AllMatching,
    /// Round-robin through matching zones for variation
    RoundRobin,
    /// Select first matching zone only (simple behavior)
    FirstMatch,
    /// Random selection from matching zones
    Random,
    /// Priority-based selection (prefer certain zones)
    Priority,
}

/// Analysis information for zone selection debugging
#[derive(Debug, Clone)]
pub struct ZoneSelectionAnalysis {
    pub note: u8,
    pub velocity: u8,
    pub total_matching_zones: usize,
    pub selected_zones: usize,
    pub strategy: ZoneSelectionStrategy,
    pub round_robin_enabled: bool,
    pub zone_details: Vec<ZoneDetail>,
}

/// Details about a specific zone for analysis
#[derive(Debug, Clone)]
pub struct ZoneDetail {
    pub sample_name: String,
    pub preset_name: String,
    pub instrument_name: String,
    pub weight: f32,
    pub original_pitch: u8,
    pub sample_rate: u32,
}

pub struct VoiceManager {
    voices: [Voice; 32],              // Legacy oscillator-based voices (fallback)
    sample_voices: [SampleVoice; 32], // Modern sample-based voices 
    multi_zone_voices: [MultiZoneSampleVoice; 32], // EMU8000 multi-zone voices (preferred)
    sample_rate: f32,
    // SoundFont integration
    loaded_soundfont: Option<SoundFont>,
    preset_map: HashMap<(u16, u8), usize>, // (bank, program) -> preset_index
    current_preset: Option<usize>, // Currently selected preset index
    // Voice allocation strategy
    prefer_sample_voices: bool,       // True = use SampleVoice first, False = use Voice first
    enable_multi_zone: bool,          // True = use MultiZoneSampleVoice for layering
    // Round-robin and advanced zone selection
    round_robin_counters: HashMap<String, usize>, // Per-instrument round-robin state
    enable_round_robin: bool,         // True = use round-robin sample selection
    zone_selection_strategy: ZoneSelectionStrategy, // Algorithm for multi-sample zones
    // EMU8000 send/return effects
    reverb_bus: ReverbBus,            // Global reverb with send/return architecture
    chorus_bus: ChorusBus,            // Global chorus with send/return architecture
    // MIDI effects control
    midi_effects: MidiEffectsController, // MIDI CC 91/93 effects control
}

impl VoiceManager {
    pub fn new(sample_rate: f32) -> Self {
        let mut voice_manager = VoiceManager {
            voices: core::array::from_fn(|_| Voice::new()),
            sample_voices: core::array::from_fn(|_| SampleVoice::new()),
            multi_zone_voices: core::array::from_fn(|_| MultiZoneSampleVoice::new()),
            sample_rate,
            loaded_soundfont: None,
            preset_map: HashMap::new(),
            current_preset: None,
            prefer_sample_voices: true, // Default to modern sample-based synthesis
            enable_multi_zone: true,    // Default to EMU8000 multi-zone layering
            round_robin_counters: HashMap::new(), // Initialize round-robin state
            enable_round_robin: false,  // Default to all matching zones (EMU8000 authentic)
            zone_selection_strategy: ZoneSelectionStrategy::AllMatching, // Default EMU8000 behavior
            reverb_bus: ReverbBus::new(sample_rate), // Initialize global reverb
            chorus_bus: ChorusBus::new(sample_rate), // Initialize global chorus
            midi_effects: MidiEffectsController::new(), // Initialize MIDI effects control
        };
        
        // Initialize effects buses with default MIDI send levels
        voice_manager.update_effects_from_midi();
        voice_manager
    }
    
    /// Load SoundFont and build preset mapping
    pub fn load_soundfont(&mut self, soundfont: SoundFont) -> Result<(), String> {
        log(&format!("Loading SoundFont: '{}' with {} presets, {} instruments, {} samples",
                   soundfont.header.name, soundfont.presets.len(), 
                   soundfont.instruments.len(), soundfont.samples.len()));
        
        // Build preset mapping for fast lookup
        let mut preset_map = HashMap::new();
        for (i, preset) in soundfont.presets.iter().enumerate() {
            let key = (preset.bank, preset.program);
            preset_map.insert(key, i);
            log(&format!("Preset {}: '{}' mapped to Bank {}, Program {}", 
                       i, preset.name, preset.bank, preset.program));
        }
        
        self.preset_map = preset_map;
        self.loaded_soundfont = Some(soundfont);
        
        // Set default preset (first available)
        if !self.preset_map.is_empty() {
            self.current_preset = Some(0);
            log(&format!("Default preset set to: '{}'", 
                       self.loaded_soundfont.as_ref().unwrap().presets[0].name));
        }
        
        log("SoundFont loaded successfully into VoiceManager");
        Ok(())
    }
    
    /// Enable sample-based voice allocation (preferred for EMU8000 authenticity)
    pub fn enable_sample_voices(&mut self) {
        self.prefer_sample_voices = true;
        log("VoiceManager: Sample-based voice allocation enabled");
    }
    
    /// Enable legacy oscillator-based voice allocation (fallback mode)
    pub fn enable_legacy_voices(&mut self) {
        self.prefer_sample_voices = false;
        log("VoiceManager: Legacy oscillator voice allocation enabled");
    }
    
    /// Check if sample-based voices are preferred
    pub fn is_using_sample_voices(&self) -> bool {
        self.prefer_sample_voices
    }
    
    /// Select a SoundFont preset by bank and program number
    pub fn select_preset(&mut self, bank: u16, program: u8) {
        if let Some(preset_index) = self.preset_map.get(&(bank, program)) {
            self.current_preset = Some(*preset_index);
            if let Some(soundfont) = &self.loaded_soundfont {
                log(&format!("Selected preset: '{}' (Bank {}, Program {})", 
                           soundfont.presets[*preset_index].name, bank, program));
            }
        } else {
            log(&format!("Warning: Preset not found for Bank {}, Program {} - keeping current preset", 
                       bank, program));
        }
    }
    
    /// Enable EMU8000 multi-zone sample layering (preferred for authenticity)
    pub fn enable_multi_zone(&mut self) {
        self.enable_multi_zone = true;
        log("VoiceManager: Multi-zone sample layering enabled");
    }
    
    /// Disable multi-zone layering (single sample per voice)
    pub fn disable_multi_zone(&mut self) {
        self.enable_multi_zone = false;
        log("VoiceManager: Multi-zone layering disabled");
    }
    
    /// Check if multi-zone layering is enabled
    pub fn is_multi_zone_enabled(&self) -> bool {
        self.enable_multi_zone
    }
    
    /// Enable round-robin sample selection for variation
    pub fn enable_round_robin(&mut self) {
        self.enable_round_robin = true;
        self.zone_selection_strategy = ZoneSelectionStrategy::RoundRobin;
        log("VoiceManager: Round-robin sample selection enabled");
    }
    
    /// Disable round-robin (use all matching zones)
    pub fn disable_round_robin(&mut self) {
        self.enable_round_robin = false;
        self.zone_selection_strategy = ZoneSelectionStrategy::AllMatching;
        log("VoiceManager: Round-robin disabled, using all matching zones");
    }
    
    /// Check if round-robin is enabled
    pub fn is_round_robin_enabled(&self) -> bool {
        self.enable_round_robin
    }
    
    /// Set zone selection strategy
    pub fn set_zone_selection_strategy(&mut self, strategy: ZoneSelectionStrategy) {
        // Update round-robin flag for consistency
        self.enable_round_robin = matches!(strategy, ZoneSelectionStrategy::RoundRobin);
        
        log(&format!("VoiceManager: Zone selection strategy set to {:?}", strategy));
        
        self.zone_selection_strategy = strategy;
    }
    
    /// Get current zone selection strategy
    pub fn get_zone_selection_strategy(&self) -> &ZoneSelectionStrategy {
        &self.zone_selection_strategy
    }
    
    /// Set MIDI channel reverb send level (MIDI CC 91)
    pub fn set_channel_reverb_send(&mut self, channel: u8, send_level: f32) {
        self.reverb_bus.set_channel_send(channel, send_level);
    }
    
    /// Configure global reverb parameters
    pub fn configure_reverb(&mut self, room_size: f32, damping: f32, diffusion: f32) {
        self.reverb_bus.configure_reverb(room_size, damping, diffusion);
    }
    
    /// Set master reverb send level
    pub fn set_master_reverb_send(&mut self, send_level: f32) {
        self.reverb_bus.set_master_send(send_level);
    }
    
    /// Set reverb return level (wet signal mixing)
    pub fn set_reverb_return_level(&mut self, return_level: f32) {
        self.reverb_bus.set_return_level(return_level);
    }
    
    /// Set MIDI channel chorus send level (MIDI CC 93)
    pub fn set_channel_chorus_send(&mut self, channel: u8, send_level: f32) {
        self.chorus_bus.set_channel_send(channel, send_level);
    }
    
    /// Configure global chorus parameters
    pub fn configure_chorus(&mut self, rate: f32, depth: f32, feedback: f32, stereo_spread: f32) {
        self.chorus_bus.configure_chorus(rate, depth, feedback, stereo_spread);
    }
    
    /// Set master chorus send level
    pub fn set_master_chorus_send(&mut self, send_level: f32) {
        self.chorus_bus.set_master_send(send_level);
    }
    
    /// Set chorus return level (wet signal mixing)
    pub fn set_chorus_return_level(&mut self, return_level: f32) {
        self.chorus_bus.set_return_level(return_level);
    }
    
    /// Process MIDI Control Change message for effects
    /// 
    /// # Arguments
    /// * `channel` - MIDI channel (0-15)
    /// * `controller` - MIDI CC number  
    /// * `value` - MIDI CC value (0-127)
    /// 
    /// # Returns
    /// True if the CC was processed (effects-related), false otherwise
    pub fn process_midi_control_change(&mut self, channel: u8, controller: u8, value: u8) -> bool {
        let processed = self.midi_effects.process_control_change(channel, controller, value);
        
        if processed {
            // Update effects buses with new MIDI-controlled send levels
            self.update_effects_from_midi();
        }
        
        processed
    }
    
    /// Update effects buses with current MIDI send levels
    fn update_effects_from_midi(&mut self) {
        // Update reverb bus channel send levels from MIDI controller
        for channel in 0..16 {
            let reverb_send = self.midi_effects.get_reverb_send(channel as u8);
            let chorus_send = self.midi_effects.get_chorus_send(channel as u8);
            
            self.reverb_bus.set_channel_send(channel as u8, reverb_send);
            self.chorus_bus.set_channel_send(channel as u8, chorus_send);
        }
    }
    
    /// Set MIDI effects logging enable/disable
    pub fn set_midi_effects_logging(&mut self, enable: bool) {
        self.midi_effects.set_effects_logging(enable);
    }
    
    /// Get MIDI effects status for debugging
    pub fn get_midi_effects_status(&self) -> String {
        self.midi_effects.get_effects_status()
    }
    
    /// Reset MIDI effects to EMU8000 defaults
    pub fn reset_midi_effects(&mut self) {
        self.midi_effects.reset_to_defaults();
        self.update_effects_from_midi();
    }
    
    /// Reset round-robin counters (useful for testing)
    pub fn reset_round_robin_counters(&mut self) {
        self.round_robin_counters.clear();
        log("VoiceManager: Round-robin counters reset");
    }
    
    
    /// Get current preset information
    pub fn get_current_preset_info(&self) -> Option<String> {
        if let (Some(soundfont), Some(preset_index)) = (&self.loaded_soundfont, self.current_preset) {
            let preset = &soundfont.presets[preset_index];
            Some(format!("'{}' (Bank {}, Program {}) - {} zones", 
                       preset.name, preset.bank, preset.program, preset.preset_zones.len()))
        } else {
            None
        }
    }
    
    /// Select SoundFont sample based on MIDI note and velocity
    /// 
    /// This is the core sample selection algorithm that navigates the complete
    /// SoundFont hierarchy: Preset → Instrument → Sample based on key/velocity ranges.
    /// 
    /// # Arguments
    /// * `note` - MIDI note number (0-127)
    /// * `velocity` - MIDI velocity (0-127)
    /// * `bank` - Optional MIDI bank (uses current preset if None)  
    /// * `program` - Optional MIDI program (uses current preset if None)
    /// 
    /// # Returns
    /// Some((sample, preset_name, instrument_name)) if found, None if no match
    pub fn select_sample(&self, note: u8, velocity: u8, bank: Option<u16>, program: Option<u8>) 
        -> Option<(&SoundFontSample, String, String)> {
        
        let soundfont = self.loaded_soundfont.as_ref()?;
        
        // Determine which preset to use
        let preset_index = if let (Some(b), Some(p)) = (bank, program) {
            // Use specified bank/program
            self.preset_map.get(&(b, p)).copied()?
        } else {
            // Use current preset
            self.current_preset?
        };
        
        let preset = &soundfont.presets[preset_index];
        
        // Find matching preset zone for this note/velocity
        let preset_zone = preset.preset_zones.iter().find(|zone| {
            let key_match = zone.key_range.as_ref()
                .map(|range| range.contains(note))
                .unwrap_or(true);
            let vel_match = zone.velocity_range.as_ref()
                .map(|range| range.contains(velocity))
                .unwrap_or(true);
            key_match && vel_match
        })?;
        
        // Get instrument from preset zone
        let instrument_id = preset_zone.instrument_id?;
        let instrument = soundfont.instruments.get(instrument_id as usize)?;
        
        // Find matching instrument zone for this note/velocity
        let instrument_zone = instrument.instrument_zones.iter().find(|zone| {
            let key_match = zone.key_range.as_ref()
                .map(|range| range.contains(note))
                .unwrap_or(true);
            let vel_match = zone.velocity_range.as_ref()
                .map(|range| range.contains(velocity))
                .unwrap_or(true);
            key_match && vel_match
        })?;
        
        // Get sample from instrument zone
        let sample_id = instrument_zone.sample_id?;
        let sample = soundfont.samples.get(sample_id as usize)?;
        
        Some((sample, preset.name.clone(), instrument.name.clone()))
    }
    
    /// Get all available samples for a given MIDI note across all velocity layers
    /// 
    /// Useful for analysis and debugging of SoundFont sample coverage
    pub fn get_samples_for_note(&self, note: u8) -> Vec<(u8, &SoundFontSample, String, String)> {
        let mut samples = Vec::new();
        
        if let Some(_soundfont) = &self.loaded_soundfont {
            // Check all velocity layers (0-127) for this note  
            for velocity in 0..128 {
                if let Some((sample, preset_name, inst_name)) = self.select_sample(note, velocity, None, None) {
                    samples.push((velocity, sample, preset_name, inst_name));
                }
            }
        }
        
        samples
    }
    
    /// EMU8000 Multi-Zone Sample Selection
    /// 
    /// Select ALL matching samples for a note/velocity combination to support:
    /// - Velocity layering with crossfading
    /// - Key splitting with multiple samples  
    /// - Round-robin sampling for variation
    /// - Overlapping zones as per SoundFont 2.0 spec
    /// 
    /// Returns Vec of (sample, weight, preset_name, instrument_name) tuples
    /// where weight indicates the layer contribution (0.0-1.0)
    pub fn select_multi_zone_samples(&mut self, note: u8, velocity: u8, bank: Option<u16>, program: Option<u8>) 
        -> Vec<(&SoundFontSample, f32, String, String)> {
        
        let mut matching_samples = Vec::new();
        
        let soundfont = match &self.loaded_soundfont {
            Some(sf) => sf,
            None => return matching_samples,
        };
        
        // Determine which preset to use
        let preset_index = if let (Some(b), Some(p)) = (bank, program) {
            // Use specified bank/program
            match self.preset_map.get(&(b, p)) {
                Some(&idx) => idx,
                None => return matching_samples,
            }
        } else {
            // Use current preset
            match self.current_preset {
                Some(idx) => idx,
                None => return matching_samples,
            }
        };
        
        let preset = &soundfont.presets[preset_index];
        
        // Find ALL matching preset zones (not just the first one)
        let matching_preset_zones: Vec<_> = preset.preset_zones.iter().filter(|zone| {
            let key_match = zone.key_range.as_ref()
                .map(|range| range.contains(note))
                .unwrap_or(true);
            let vel_match = zone.velocity_range.as_ref()
                .map(|range| range.contains(velocity))
                .unwrap_or(true);
            key_match && vel_match
        }).collect();
        
        // Process each matching preset zone
        for preset_zone in matching_preset_zones {
            if let Some(instrument_id) = preset_zone.instrument_id {
                if let Some(instrument) = soundfont.instruments.get(instrument_id as usize) {
                    
                    // Find ALL matching instrument zones for this preset zone
                    let matching_instrument_zones: Vec<_> = instrument.instrument_zones.iter().filter(|zone| {
                        let key_match = zone.key_range.as_ref()
                            .map(|range| range.contains(note))
                            .unwrap_or(true);
                        let vel_match = zone.velocity_range.as_ref()
                            .map(|range| range.contains(velocity))
                            .unwrap_or(true);
                        key_match && vel_match
                    }).collect();
                    
                    // Process each matching instrument zone
                    for instrument_zone in matching_instrument_zones {
                        if let Some(sample_id) = instrument_zone.sample_id {
                            if let Some(sample) = soundfont.samples.get(sample_id as usize) {
                                
                                // Calculate layer weight based on velocity position within range
                                let weight = self.calculate_layer_weight(velocity, 
                                    &preset_zone.velocity_range, &instrument_zone.velocity_range);
                                
                                matching_samples.push((
                                    sample, 
                                    weight,
                                    preset.name.clone(), 
                                    instrument.name.clone()
                                ));
                            }
                        }
                    }
                }
            }
        }
        
        // Normalize weights so they sum to 1.0 (or close to it)
        let total_weight: f32 = matching_samples.iter().map(|(_, weight, _, _)| weight).sum();
        if total_weight > 0.0 {
            for (_, weight, _, _) in matching_samples.iter_mut() {
                *weight /= total_weight;
            }
        }
        
        // Apply zone selection strategy
        let strategy = self.zone_selection_strategy.clone();
        VoiceManager::apply_zone_selection_strategy_static(&mut self.round_robin_counters, matching_samples, note, velocity, strategy)
    }
    
    /// Apply zone selection strategy to matching samples (static version)
    fn apply_zone_selection_strategy_static<'a>(round_robin_counters: &mut HashMap<String, usize>, 
                                               mut matching_samples: Vec<(&'a SoundFontSample, f32, String, String)>, 
                                               note: u8, velocity: u8, strategy: ZoneSelectionStrategy) -> Vec<(&'a SoundFontSample, f32, String, String)> {
        
        if matching_samples.is_empty() {
            return matching_samples;
        }
        
        match &strategy {
            ZoneSelectionStrategy::AllMatching => {
                // Default EMU8000 behavior - return all matching zones with crossfading
                matching_samples
            },
            
            ZoneSelectionStrategy::FirstMatch => {
                // Simple behavior - return only the first matching zone
                if !matching_samples.is_empty() {
                    let mut first_sample = matching_samples[0].clone();
                    first_sample.1 = 1.0; // Full weight to first sample
                    vec![first_sample]
                } else {
                    matching_samples
                }
            },
            
            ZoneSelectionStrategy::RoundRobin => {
                // Round-robin selection for variation
                VoiceManager::apply_round_robin_selection_static(round_robin_counters, matching_samples, note, velocity)
            },
            
            ZoneSelectionStrategy::Random => {
                // Random selection from matching zones
                if matching_samples.len() > 1 {
                    // Simple pseudo-random selection based on note and velocity
                    let index = ((note as usize + velocity as usize) * 7) % matching_samples.len();
                    let mut selected_sample = matching_samples[index].clone();
                    selected_sample.1 = 1.0; // Full weight to selected sample
                    vec![selected_sample]
                } else {
                    matching_samples
                }
            },
            
            ZoneSelectionStrategy::Priority => {
                // Priority-based selection (prefer samples with higher original pitch)
                matching_samples.sort_by(|a, b| b.0.original_pitch.cmp(&a.0.original_pitch));
                if !matching_samples.is_empty() {
                    let mut priority_sample = matching_samples[0].clone();
                    priority_sample.1 = 1.0; // Full weight to highest priority sample
                    vec![priority_sample]
                } else {
                    matching_samples
                }
            },
        }
    }
    
    /// Apply round-robin selection to matching samples (static version)
    fn apply_round_robin_selection_static<'a>(round_robin_counters: &mut HashMap<String, usize>,
                                             matching_samples: Vec<(&'a SoundFontSample, f32, String, String)>, 
                                             note: u8, _velocity: u8) -> Vec<(&'a SoundFontSample, f32, String, String)> {
        
        if matching_samples.len() <= 1 {
            return matching_samples;
        }
        
        // Create unique key for this note/instrument combination
        let instrument_key = if !matching_samples.is_empty() {
            format!("{}_{}", matching_samples[0].3, note) // instrument_name + note
        } else {
            return matching_samples;
        };
        
        // Get or initialize round-robin counter for this instrument
        let counter = round_robin_counters.entry(instrument_key.clone()).or_insert(0);
        
        // Select sample based on round-robin counter
        let selected_index = *counter % matching_samples.len();
        *counter = (*counter + 1) % matching_samples.len(); // Increment for next time
        
        // Return selected sample with full weight
        let mut selected_sample = matching_samples[selected_index].clone();
        selected_sample.1 = 1.0; // Full weight to selected sample
        
        log(&format!("Round-robin selection: Instrument '{}' Note {} -> Sample '{}' (index {}/{})",
                   selected_sample.3, note, selected_sample.0.name, selected_index, matching_samples.len()));
        
        vec![selected_sample]
    }
    
    /// Calculate layer weight for velocity crossfading
    /// 
    /// Returns weight (0.0-1.0) based on velocity position within overlapping ranges
    fn calculate_layer_weight(&self, velocity: u8, 
                             preset_vel_range: &Option<crate::soundfont::types::VelocityRange>,
                             instrument_vel_range: &Option<crate::soundfont::types::VelocityRange>) -> f32 {
        
        // Start with full weight
        let mut weight = 1.0;
        
        // Apply preset velocity range weighting
        if let Some(preset_range) = preset_vel_range {
            weight *= self.calculate_range_weight(velocity, preset_range.low, preset_range.high);
        }
        
        // Apply instrument velocity range weighting
        if let Some(instrument_range) = instrument_vel_range {
            weight *= self.calculate_range_weight(velocity, instrument_range.low, instrument_range.high);
        }
        
        weight
    }
    
    /// Calculate weight based on position within a velocity range
    /// 
    /// Uses EMU8000-style crossfading:
    /// - Full weight in the center of the range
    /// - Linear falloff at the edges for crossfading
    fn calculate_range_weight(&self, velocity: u8, range_low: u8, range_high: u8) -> f32 {
        if velocity < range_low || velocity > range_high {
            return 0.0; // Outside range
        }
        
        let range_size = range_high - range_low;
        if range_size <= 4 {
            return 1.0; // Small range, no crossfading
        }
        
        let crossfade_size = (range_size / 4).max(1); // 25% of range for crossfading
        let velocity_pos = velocity - range_low;
        
        if velocity_pos < crossfade_size {
            // Fade in at start of range
            velocity_pos as f32 / crossfade_size as f32
        } else if velocity_pos > range_size - crossfade_size {
            // Fade out at end of range
            (range_size - velocity_pos) as f32 / crossfade_size as f32
        } else {
            // Full weight in middle of range
            1.0
        }
    }
    
    /// Get count of matching zones for analysis
    /// 
    /// Useful for debugging multi-zone sample selection
    pub fn get_zone_count(&mut self, note: u8, velocity: u8) -> usize {
        self.select_multi_zone_samples(note, velocity, None, None).len()
    }
    
    /// Get zone selection analysis for debugging
    /// 
    /// Returns detailed information about zone selection for a given note/velocity
    pub fn analyze_zone_selection(&mut self, note: u8, velocity: u8) -> ZoneSelectionAnalysis {
        // Get basic analysis info
        let current_strategy = self.zone_selection_strategy.clone();
        let current_round_robin = self.enable_round_robin;
        
        // Get selected zones with current strategy
        let selected_zones = self.select_multi_zone_samples(note, velocity, None, None);
        let selected_count = selected_zones.len();
        
        // For now, use selected zones as the basis for analysis
        // This avoids the complex borrowing issues while still providing useful info
        let zone_details: Vec<ZoneDetail> = selected_zones.into_iter().map(|(sample, weight, preset, instrument)| {
            ZoneDetail {
                sample_name: sample.name.clone(),
                preset_name: preset,
                instrument_name: instrument,
                weight,
                original_pitch: sample.original_pitch,
                sample_rate: sample.sample_rate,
            }
        }).collect();
        
        ZoneSelectionAnalysis {
            note,
            velocity,
            total_matching_zones: zone_details.len(), // Simplified for now
            selected_zones: selected_count,
            strategy: current_strategy,
            round_robin_enabled: current_round_robin,
            zone_details,
        }
    }
    
    /// Get round-robin counter state for debugging
    pub fn get_round_robin_state(&self) -> Vec<(String, usize)> {
        self.round_robin_counters.iter()
            .map(|(key, counter)| (key.clone(), *counter))
            .collect()
    }
    
    /// Check if SoundFont is loaded
    pub fn is_soundfont_loaded(&self) -> bool {
        self.loaded_soundfont.is_some()
    }
    
    pub fn note_on(&mut self, note: u8, velocity: u8) -> Option<usize> {
        // Use EMU8000 multi-zone layering if enabled
        if self.enable_multi_zone {
            // Try multi-zone sample layering first (most authentic EMU8000)
            if let Some(voice_id) = self.note_on_multi_zone(note, velocity) {
                return Some(voice_id);
            }
        }
        
        // Use the preferred voice allocation strategy
        if self.prefer_sample_voices {
            // Try SampleVoice-based note triggering (modern approach)
            if let Some(voice_id) = self.note_on_sample_voice(note, velocity) {
                return Some(voice_id);
            }
            
            // Fallback to legacy Voice system if SampleVoice fails
            if let Some(voice_id) = self.note_on_soundfont(note, velocity) {
                return Some(voice_id);
            }
            
            // Final fallback to sine wave synthesis
            self.note_on_legacy_fallback(note, velocity)
        } else {
            // Legacy mode: use original Voice system first
            if let Some(voice_id) = self.note_on_soundfont(note, velocity) {
                return Some(voice_id);
            }
            
            // Fallback to sine wave synthesis
            self.note_on_legacy_fallback(note, velocity)
        }
    }
    
    /// EMU8000 Multi-Zone note triggering (most authentic approach)
    fn note_on_multi_zone(&mut self, note: u8, velocity: u8) -> Option<usize> {
        // First, find an available MultiZoneSampleVoice
        let available_voice_index = {
            let mut found_index = None;
            for (i, multi_voice) in self.multi_zone_voices.iter().enumerate() {
                if multi_voice.is_available() {
                    found_index = Some(i);
                    break;
                }
            }
            found_index
        };
        
        let voice_index = match available_voice_index {
            Some(index) => index,
            None => {
                log(&format!("No available MultiZoneSampleVoices for note {} velocity {}", note, velocity));
                return None;
            }
        };
        
        // Now get the multi-zone samples (separate borrow)
        let multi_zone_sample_refs = self.select_multi_zone_samples(note, velocity, None, None);
        
        if multi_zone_sample_refs.is_empty() {
            log(&format!("No multi-zone samples found for note {} velocity {}", note, velocity));
            return None;
        }
        
        // Convert references to owned values for MultiZoneSampleVoice
        let multi_zone_samples: Vec<(SoundFontSample, f32, String, String)> = 
            multi_zone_sample_refs.into_iter()
                .map(|(sample_ref, weight, preset_name, instrument_name)| {
                    (sample_ref.clone(), weight, preset_name, instrument_name)
                })
                .collect();
        
        let sample_rate = self.sample_rate;
        
        // Finally, start the multi-zone note
        self.multi_zone_voices[voice_index].start_multi_zone_note(note, velocity, multi_zone_samples, sample_rate);
        
        log(&format!("Multi-zone note triggered: Note {} Vel {} -> MultiZoneVoice {} with {} layers",
                   note, velocity, voice_index, self.multi_zone_voices[voice_index].get_layer_count()));
        
        Some(voice_index)
    }
    
    /// Modern SampleVoice-based note triggering (single sample approach)
    fn note_on_sample_voice(&mut self, note: u8, velocity: u8) -> Option<usize> {
        // Use the sample selection utility to find the appropriate sample
        let sample_info = self.select_sample(note, velocity, None, None)?;
        let (sample, preset_name, instrument_name) = sample_info;
        
        // Clone sample data to avoid borrow checker issues
        let sample_clone = sample.clone();
        let preset_name_clone = preset_name.clone();
        let instrument_name_clone = instrument_name.clone();
        let sample_rate = self.sample_rate;
        
        // Find available SampleVoice and configure it
        for (i, sample_voice) in self.sample_voices.iter_mut().enumerate() {
            if sample_voice.is_available() {
                // Configure SampleVoice with selected SoundFont sample
                sample_voice.start_note(note, velocity, &sample_clone, sample_rate);
                
                log(&format!("SampleVoice triggered: Note {} Vel {} -> SampleVoice {} using sample '{}' from instrument '{}' in preset '{}'",
                           note, velocity, i, sample_clone.name, instrument_name_clone, preset_name_clone));
                
                return Some(i);
            }
        }
        
        log(&format!("No available SampleVoices for note {} velocity {}", note, velocity));
        None
    }
    
    /// Legacy fallback to sine wave synthesis
    fn note_on_legacy_fallback(&mut self, note: u8, velocity: u8) -> Option<usize> {
        for (i, voice) in self.voices.iter_mut().enumerate() {
            if !voice.is_active {
                voice.start_note(note, velocity);
                log(&format!("Legacy fallback: Note {} on Voice {} (sine wave)", note, i));
                return Some(i);
            }
        }
        
        log(&format!("No available voices for note {} (all voice types exhausted)", note));
        None
    }
    
    /// SoundFont-based note triggering
    fn note_on_soundfont(&mut self, note: u8, velocity: u8) -> Option<usize> {
        // Check if SoundFont is loaded and preset is selected
        let (soundfont, preset_index) = match (&self.loaded_soundfont, self.current_preset) {
            (Some(sf), Some(preset_idx)) => (sf, preset_idx),
            _ => {
                log("No SoundFont loaded or preset selected");
                return None;
            }
        };
        
        let preset = &soundfont.presets[preset_index];
        
        // Find matching preset zone for this note/velocity
        let matching_zone = preset.preset_zones.iter().find(|zone| {
            let key_match = zone.key_range.as_ref()
                .map(|range| range.contains(note))
                .unwrap_or(true);
            let vel_match = zone.velocity_range.as_ref()
                .map(|range| range.contains(velocity))
                .unwrap_or(true);
            key_match && vel_match
        });
        
        let zone = match matching_zone {
            Some(z) => z,
            None => {
                log(&format!("No matching preset zone for note {} velocity {} in preset '{}'", 
                           note, velocity, preset.name));
                return None;
            }
        };
        
        // Get instrument from zone
        let instrument = match zone.instrument_id {
            Some(inst_id) => {
                if let Some(inst) = soundfont.instruments.get(inst_id as usize) {
                    inst
                } else {
                    log(&format!("Invalid instrument ID {} in preset zone", inst_id));
                    return None;
                }
            },
            None => {
                log("Preset zone has no instrument ID");
                return None;
            }
        };
        
        // Find matching instrument zone for this note/velocity
        let matching_inst_zone = instrument.instrument_zones.iter().find(|zone| {
            let key_match = zone.key_range.as_ref()
                .map(|range| range.contains(note))
                .unwrap_or(true);
            let vel_match = zone.velocity_range.as_ref()
                .map(|range| range.contains(velocity))
                .unwrap_or(true);
            key_match && vel_match
        });
        
        let inst_zone = match matching_inst_zone {
            Some(z) => z,
            None => {
                log(&format!("No matching instrument zone for note {} velocity {} in instrument '{}'", 
                           note, velocity, instrument.name));
                return None;
            }
        };
        
        // Get sample from instrument zone
        let sample = match inst_zone.sample_id {
            Some(sample_id) => {
                if let Some(smp) = soundfont.samples.get(sample_id as usize) {
                    smp
                } else {
                    log(&format!("Invalid sample ID {} in instrument zone", sample_id));
                    return None;
                }
            },
            None => {
                log("Instrument zone has no sample ID");
                return None;
            }
        };
        
        // Find available voice and configure it for SoundFont playback
        for (i, voice) in self.voices.iter_mut().enumerate() {
            if !voice.is_active {
                // Configure voice with SoundFont sample data
                voice.start_soundfont_note(note, velocity, sample);
                
                log(&format!("SoundFont note triggered: Note {} Vel {} -> Voice {} using sample '{}' from instrument '{}' in preset '{}'",
                           note, velocity, i, sample.name, instrument.name, preset.name));
                
                return Some(i);
            }
        }
        
        log(&format!("No available voices for SoundFont note {} velocity {}", note, velocity));
        None
    }
    
    pub fn note_off(&mut self, note: u8) {
        let mut released_count = 0;
        
        // Release matching MultiZoneSampleVoices first (most authentic EMU8000)
        for multi_voice in self.multi_zone_voices.iter_mut() {
            if multi_voice.is_active && multi_voice.note == note {
                multi_voice.stop_note();
                released_count += 1;
            }
        }
        
        // Release matching SampleVoices (modern approach)
        for sample_voice in self.sample_voices.iter_mut() {
            if sample_voice.is_active && sample_voice.note == note {
                sample_voice.stop_note();
                released_count += 1;
            }
        }
        
        // Release matching legacy Voices (fallback voice type)
        for voice in self.voices.iter_mut() {
            if voice.is_active && voice.note == note {
                voice.stop_note();
                released_count += 1;
            }
        }
        
        if released_count > 0 {
            log(&format!("Note {} released on {} voice(s)", note, released_count));
        }
    }
    
    /// Process all active voices and return mixed audio sample
    /// This is the main audio processing method - call once per sample
    pub fn process(&mut self) -> f32 {
        let mut dry_mixed_output = 0.0;
        
        // Process MultiZoneSampleVoices (most authentic EMU8000 with layering)
        for multi_voice in self.multi_zone_voices.iter_mut() {
            if multi_voice.is_processing {
                let voice_sample = multi_voice.generate_sample();
                dry_mixed_output += voice_sample;
                // Note: MultiZoneSampleVoice doesn't have reverb send yet (future enhancement)
            }
        }
        
        // Process SampleVoices (modern sample-based synthesis)
        for sample_voice in self.sample_voices.iter_mut() {
            if sample_voice.is_processing {
                let voice_sample = sample_voice.generate_sample();
                dry_mixed_output += voice_sample;
                // Note: SampleVoice doesn't have reverb send yet (future enhancement)
            }
        }
        
        // Process legacy Voices (oscillator-based fallback with reverb send)
        for voice in self.voices.iter_mut() {
            if voice.is_processing {
                let voice_sample = voice.generate_sample(self.sample_rate);
                dry_mixed_output += voice_sample;
                
                // Add to reverb send bus
                let reverb_send = voice.get_reverb_send();
                let chorus_send = voice.get_chorus_send();
                let channel = voice.get_midi_channel();
                self.reverb_bus.add_voice_send(voice_sample, reverb_send, channel);
                self.chorus_bus.add_voice_send(voice_sample, chorus_send, channel);
            }
        }
        
        // Process global effects and get wet signals
        let reverb_wet = self.reverb_bus.process_reverb();
        let chorus_wet = self.chorus_bus.process_chorus();
        
        // Mix dry and wet signals (EMU8000 style)
        let dry_level = 0.7; // 70% dry signal  
        let final_output = (dry_mixed_output * dry_level) + reverb_wet + chorus_wet;
        
        // Simple mixing - divide by max voices to prevent clipping
        final_output / 32.0
    }
    
    /// Process envelopes for all processing voices (call once per audio sample)
    /// Returns the number of voices that are still generating audio  
    pub fn process_envelopes(&mut self) -> u32 {
        let mut processing_count = 0;
        
        // Process MultiZoneSampleVoice envelopes
        for multi_voice in self.multi_zone_voices.iter_mut() {
            if multi_voice.is_processing {
                let _amplitude = multi_voice.get_envelope_amplitude();
                
                // MultiZoneSampleVoice automatically updates is_processing in get_envelope_amplitude()
                if multi_voice.is_processing {
                    processing_count += 1;
                }
            }
        }
        
        // Process SampleVoice envelopes
        for sample_voice in self.sample_voices.iter_mut() {
            if sample_voice.is_processing {
                let _amplitude = sample_voice.get_envelope_amplitude();
                
                // SampleVoice automatically updates is_processing in get_envelope_amplitude()
                if sample_voice.is_processing {
                    processing_count += 1;
                }
            }
        }
        
        // Process legacy Voice envelopes
        for voice in self.voices.iter_mut() {
            if voice.is_processing {
                let _amplitude = voice.get_envelope_amplitude();
                
                // Voice automatically updates is_processing in get_envelope_amplitude()
                if voice.is_processing {
                    processing_count += 1;
                }
            }
        }
        
        processing_count
    }
    
    /// Get the number of active voices (multi-zone, sample, and legacy combined)
    pub fn get_active_voice_count(&self) -> usize {
        let mut active_count = 0;
        
        // Count active multi-zone voices
        for voice in self.multi_zone_voices.iter() {
            if voice.is_active {
                active_count += 1;
            }
        }
        
        // Count active sample voices
        for voice in self.sample_voices.iter() {
            if voice.is_active {
                active_count += 1;
            }
        }
        
        // Count active legacy voices
        for voice in self.voices.iter() {
            if voice.is_active {
                active_count += 1;
            }
        }
        
        active_count
    }
}