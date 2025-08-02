use super::voice::{Voice, SampleVoice};
use crate::soundfont::types::*;
use crate::log;
use std::collections::HashMap;

pub struct VoiceManager {
    voices: [Voice; 32],              // Legacy oscillator-based voices (fallback)
    sample_voices: [SampleVoice; 32], // Modern sample-based voices (preferred)
    sample_rate: f32,
    // SoundFont integration
    loaded_soundfont: Option<SoundFont>,
    preset_map: HashMap<(u16, u8), usize>, // (bank, program) -> preset_index
    current_preset: Option<usize>, // Currently selected preset index
    // Voice allocation strategy
    prefer_sample_voices: bool,       // True = use SampleVoice first, False = use Voice first
}

impl VoiceManager {
    pub fn new(sample_rate: f32) -> Self {
        VoiceManager {
            voices: core::array::from_fn(|_| Voice::new()),
            sample_voices: core::array::from_fn(|_| SampleVoice::new()),
            sample_rate,
            loaded_soundfont: None,
            preset_map: HashMap::new(),
            current_preset: None,
            prefer_sample_voices: true, // Default to modern sample-based synthesis
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
        
        if let Some(soundfont) = &self.loaded_soundfont {
            // Check all velocity layers (0-127) for this note  
            for velocity in 0..128 {
                if let Some((sample, preset_name, inst_name)) = self.select_sample(note, velocity, None, None) {
                    samples.push((velocity, sample, preset_name, inst_name));
                }
            }
        }
        
        samples
    }
    
    /// Check if SoundFont is loaded
    pub fn is_soundfont_loaded(&self) -> bool {
        self.loaded_soundfont.is_some()
    }
    
    pub fn note_on(&mut self, note: u8, velocity: u8) -> Option<usize> {
        // Use the preferred voice allocation strategy
        if self.prefer_sample_voices {
            // Try SampleVoice-based note triggering first (modern approach)
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
    
    /// Modern SampleVoice-based note triggering (preferred approach)
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
        
        // Release matching SampleVoices first (preferred voice type)
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
        let mut mixed_output = 0.0;
        
        // Process SampleVoices (modern sample-based synthesis)
        for sample_voice in self.sample_voices.iter_mut() {
            if sample_voice.is_processing {
                let voice_sample = sample_voice.generate_sample();
                mixed_output += voice_sample;
            }
        }
        
        // Process legacy Voices (oscillator-based fallback)
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
}