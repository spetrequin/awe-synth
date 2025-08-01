use super::voice::Voice;
use crate::soundfont::types::*;
use crate::log;
use std::collections::HashMap;

pub struct VoiceManager {
    voices: [Voice; 32],
    sample_rate: f32,
    // SoundFont integration
    loaded_soundfont: Option<SoundFont>,
    preset_map: HashMap<(u16, u8), usize>, // (bank, program) -> preset_index
    current_preset: Option<usize>, // Currently selected preset index
}

impl VoiceManager {
    pub fn new(sample_rate: f32) -> Self {
        VoiceManager {
            voices: core::array::from_fn(|_| Voice::new()),
            sample_rate,
            loaded_soundfont: None,
            preset_map: HashMap::new(),
            current_preset: None,
        }
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
    
    /// Select preset by bank and program number
    pub fn select_preset(&mut self, bank: u16, program: u8) -> Result<(), String> {
        if let Some(preset_index) = self.preset_map.get(&(bank, program)) {
            self.current_preset = Some(*preset_index);
            let preset_name = &self.loaded_soundfont.as_ref().unwrap().presets[*preset_index].name;
            log(&format!("Preset selected: '{}' (Bank {}, Program {})", preset_name, bank, program));
            Ok(())
        } else {
            let error = format!("Preset not found: Bank {}, Program {}", bank, program);
            log(&error);
            Err(error)
        }
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
    
    /// Check if SoundFont is loaded
    pub fn is_soundfont_loaded(&self) -> bool {
        self.loaded_soundfont.is_some()
    }
    
    pub fn note_on(&mut self, note: u8, velocity: u8) -> Option<usize> {
        // Try SoundFont-based note triggering first
        if let Some(voice_id) = self.note_on_soundfont(note, velocity) {
            return Some(voice_id);
        }
        
        // Fallback to simple sine wave synthesis
        for (i, voice) in self.voices.iter_mut().enumerate() {
            if !voice.is_active {
                voice.start_note(note, velocity);
                log(&format!("Fallback synthesis: Note {} on voice {} (no SoundFont)", note, i));
                return Some(i);
            }
        }
        
        log(&format!("No available voices for note {}", note));
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
        for voice in self.voices.iter_mut() {
            if voice.is_active && voice.note == note {
                voice.stop_note();
                released_count += 1;
            }
        }
        
        if released_count > 0 {
            log(&format!("Note {} released on {} voices", note, released_count));
        }
    }
    
    /// Process all active voices and return mixed audio sample
    /// This is the main audio processing method - call once per sample
    pub fn process(&mut self) -> f32 {
        let mut mixed_output = 0.0;
        
        for voice in self.voices.iter_mut() {
            if voice.is_processing {
                let voice_sample = voice.generate_sample(self.sample_rate);
                mixed_output += voice_sample;
            }
        }
        
        // Simple mixing - divide by max voices to prevent clipping
        mixed_output / 32.0
    }
    
    /// Process envelopes for all processing voices (call once per audio sample)
    /// Returns the number of voices that are still generating audio  
    pub fn process_envelopes(&mut self) -> u32 {
        let mut processing_count = 0;
        
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
}