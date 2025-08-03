/**
 * AWE Player - MIDI Test Sequences (Rust Implementation)
 * Part of AWE Player EMU8000 Emulator
 * 
 * Generates test MIDI sequences for audio pipeline validation
 * Moved from TypeScript ui-controls.ts for centralized test generation
 */

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::MidiEvent;

/// MIDI test sequence configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSequenceConfig {
    pub channel: u8,
    pub velocity: u8,
    pub note_duration_ms: u32,
    pub note_gap_ms: u32,
    pub start_timestamp: u64,
}

impl Default for TestSequenceConfig {
    fn default() -> Self {
        Self {
            channel: 0,
            velocity: 80,
            note_duration_ms: 200,
            note_gap_ms: 250,
            start_timestamp: 0,
        }
    }
}

/// Test sequence for audio pipeline validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiTestSequence {
    pub name: String,
    pub notes: Vec<u8>,
    pub events: Vec<MidiEvent>,
    pub config: TestSequenceConfig,
    pub total_duration_ms: u32,
}

/// MIDI test sequence generator
pub struct MidiTestSequenceGenerator {
    sample_rate: f32,
}

impl MidiTestSequenceGenerator {
    /// Create new test sequence generator
    pub fn new(sample_rate: f32) -> Self {
        Self { sample_rate }
    }
    
    /// Generate C major scale sequence
    pub fn generate_c_major_scale(&self, config: Option<TestSequenceConfig>) -> MidiTestSequence {
        let config = config.unwrap_or_default();
        let notes = vec![60, 62, 64, 65, 67, 69, 71, 72]; // C D E F G A B C
        self.generate_sequence("C Major Scale", notes, config)
    }
    
    /// Generate chromatic scale sequence
    pub fn generate_chromatic_scale(&self, config: Option<TestSequenceConfig>) -> MidiTestSequence {
        let config = config.unwrap_or_default();
        let notes = (60..73).collect(); // C to C (one octave chromatic)
        self.generate_sequence("Chromatic Scale", notes, config)
    }
    
    /// Generate arpeggios sequence
    pub fn generate_c_major_arpeggio(&self, config: Option<TestSequenceConfig>) -> MidiTestSequence {
        let config = config.unwrap_or_default();
        let notes = vec![60, 64, 67, 72, 67, 64, 60]; // C E G C G E C
        self.generate_sequence("C Major Arpeggio", notes, config)
    }
    
    /// Generate polyphonic chord test
    pub fn generate_chord_test(&self, config: Option<TestSequenceConfig>) -> MidiTestSequence {
        let config = config.unwrap_or_default();
        let chord_notes = vec![60, 64, 67]; // C Major chord
        
        let mut events = Vec::new();
        let mut current_timestamp = config.start_timestamp;
        
        // Play chord (all notes on simultaneously)
        for &note in &chord_notes {
            events.push(MidiEvent::new(
                current_timestamp,
                config.channel,
                0x90, // Note On
                note,
                config.velocity,
            ));
        }
        
        // Hold chord for duration
        current_timestamp += self.ms_to_samples(config.note_duration_ms);
        
        // Release chord (all notes off)
        for &note in &chord_notes {
            events.push(MidiEvent::new(
                current_timestamp,
                config.channel,
                0x80, // Note Off
                note,
                0,
            ));
        }
        
        let total_duration_ms = config.note_duration_ms + config.note_gap_ms;
        
        MidiTestSequence {
            name: "C Major Chord Test".to_string(),
            notes: chord_notes,
            events,
            config,
            total_duration_ms,
        }
    }
    
    /// Generate velocity test sequence
    pub fn generate_velocity_test(&self, config: Option<TestSequenceConfig>) -> MidiTestSequence {
        let mut config = config.unwrap_or_default();
        let note = 60; // Middle C
        let velocities = vec![20, 40, 60, 80, 100, 127]; // Various velocity levels
        
        let mut events = Vec::new();
        let mut current_timestamp = config.start_timestamp;
        
        for &velocity in &velocities {
            config.velocity = velocity;
            
            // Note on
            events.push(MidiEvent::new(
                current_timestamp,
                config.channel,
                0x90, // Note On
                note,
                velocity,
            ));
            
            // Note off
            let note_off_timestamp = current_timestamp + self.ms_to_samples(config.note_duration_ms);
            events.push(MidiEvent::new(
                note_off_timestamp,
                config.channel,
                0x80, // Note Off
                note,
                0,
            ));
            
            // Next note
            current_timestamp += self.ms_to_samples(config.note_duration_ms + config.note_gap_ms);
        }
        
        let total_duration_ms = (config.note_duration_ms + config.note_gap_ms) * velocities.len() as u32;
        
        MidiTestSequence {
            name: "Velocity Test".to_string(),
            notes: vec![note],
            events,
            config,
            total_duration_ms,
        }
    }
    
    /// Generate sequence from note array
    fn generate_sequence(&self, name: &str, notes: Vec<u8>, config: TestSequenceConfig) -> MidiTestSequence {
        let mut events = Vec::new();
        let mut current_timestamp = config.start_timestamp;
        
        for &note in &notes {
            // Note on
            events.push(MidiEvent::new(
                current_timestamp,
                config.channel,
                0x90, // Note On
                note,
                config.velocity,
            ));
            
            // Note off
            let note_off_timestamp = current_timestamp + self.ms_to_samples(config.note_duration_ms);
            events.push(MidiEvent::new(
                note_off_timestamp,
                config.channel,
                0x80, // Note Off
                note,
                0,
            ));
            
            // Next note
            current_timestamp += self.ms_to_samples(config.note_duration_ms + config.note_gap_ms);
        }
        
        let total_duration_ms = (config.note_duration_ms + config.note_gap_ms) * notes.len() as u32;
        
        MidiTestSequence {
            name: name.to_string(),
            notes,
            events,
            config,
            total_duration_ms,
        }
    }
    
    /// Convert milliseconds to sample count
    fn ms_to_samples(&self, ms: u32) -> u64 {
        ((ms as f32 * self.sample_rate) / 1000.0) as u64
    }
}

/// Note name conversion utilities
pub struct NoteNameUtils;

impl NoteNameUtils {
    /// Convert MIDI note number to note name (e.g., 60 -> "C4")
    pub fn midi_to_note_name(note: u8) -> String {
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        let octave = (note / 12) as i32 - 1;
        let note_name = note_names[(note % 12) as usize];
        format!("{}{}", note_name, octave)
    }
    
    /// Convert note name to MIDI note number (e.g., "C4" -> 60)
    pub fn note_name_to_midi(note_name: &str) -> Option<u8> {
        if note_name.len() < 2 {
            return None;
        }
        
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        let (note_part, octave_part) = if note_name.len() == 3 && note_name.chars().nth(1) == Some('#') {
            (&note_name[0..2], &note_name[2..])
        } else {
            (&note_name[0..1], &note_name[1..])
        };
        
        let note_index = note_names.iter().position(|&n| n == note_part)?;
        let octave: i32 = octave_part.parse().ok()?;
        
        let midi_note = (octave + 1) * 12 + note_index as i32;
        
        if midi_note >= 0 && midi_note <= 127 {
            Some(midi_note as u8)
        } else {
            None
        }
    }
    
    /// Get all note names for an octave
    pub fn get_note_names() -> Vec<&'static str> {
        vec!["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    }
}

// ===== WASM EXPORTS =====

/// Global test sequence generator for WASM exports
static mut GLOBAL_TEST_GENERATOR: Option<MidiTestSequenceGenerator> = None;

/// Initialize global test sequence generator
#[wasm_bindgen]
pub fn init_test_sequence_generator(sample_rate: f32) {
    unsafe {
        GLOBAL_TEST_GENERATOR = Some(MidiTestSequenceGenerator::new(sample_rate));
        crate::log(&format!("🧪 MIDI test sequence generator initialized at {}Hz", sample_rate));
    }
}

/// Generate C major scale test sequence as JSON
#[wasm_bindgen]
pub fn generate_c_major_scale_test(config_json: Option<String>) -> String {
    unsafe {
        if let Some(ref generator) = GLOBAL_TEST_GENERATOR {
            let config = if let Some(json) = config_json {
                serde_json::from_str(&json).unwrap_or_default()
            } else {
                TestSequenceConfig::default()
            };
            
            let sequence = generator.generate_c_major_scale(Some(config));
            serde_json::to_string(&sequence).unwrap_or_else(|_| "{}".to_string())
        } else {
            crate::log("❌ Test sequence generator not initialized");
            r#"{"error": "Generator not initialized"}"#.to_string()
        }
    }
}

/// Generate chromatic scale test sequence as JSON
#[wasm_bindgen]
pub fn generate_chromatic_scale_test(config_json: Option<String>) -> String {
    unsafe {
        if let Some(ref generator) = GLOBAL_TEST_GENERATOR {
            let config = if let Some(json) = config_json {
                serde_json::from_str(&json).unwrap_or_default()
            } else {
                TestSequenceConfig::default()
            };
            
            let sequence = generator.generate_chromatic_scale(Some(config));
            serde_json::to_string(&sequence).unwrap_or_else(|_| "{}".to_string())
        } else {
            crate::log("❌ Test sequence generator not initialized");
            r#"{"error": "Generator not initialized"}"#.to_string()
        }
    }
}

/// Generate C major arpeggio test sequence as JSON
#[wasm_bindgen]
pub fn generate_arpeggio_test(config_json: Option<String>) -> String {
    unsafe {
        if let Some(ref generator) = GLOBAL_TEST_GENERATOR {
            let config = if let Some(json) = config_json {
                serde_json::from_str(&json).unwrap_or_default()
            } else {
                TestSequenceConfig::default()
            };
            
            let sequence = generator.generate_c_major_arpeggio(Some(config));
            serde_json::to_string(&sequence).unwrap_or_else(|_| "{}".to_string())
        } else {
            crate::log("❌ Test sequence generator not initialized");
            r#"{"error": "Generator not initialized"}"#.to_string()
        }
    }
}

/// Generate chord test sequence as JSON
#[wasm_bindgen]
pub fn generate_chord_test(config_json: Option<String>) -> String {
    unsafe {
        if let Some(ref generator) = GLOBAL_TEST_GENERATOR {
            let config = if let Some(json) = config_json {
                serde_json::from_str(&json).unwrap_or_default()
            } else {
                TestSequenceConfig::default()
            };
            
            let sequence = generator.generate_chord_test(Some(config));
            serde_json::to_string(&sequence).unwrap_or_else(|_| "{}".to_string())
        } else {
            crate::log("❌ Test sequence generator not initialized");
            r#"{"error": "Generator not initialized"}"#.to_string()
        }
    }
}

/// Generate velocity test sequence as JSON
#[wasm_bindgen]
pub fn generate_velocity_test(config_json: Option<String>) -> String {
    unsafe {
        if let Some(ref generator) = GLOBAL_TEST_GENERATOR {
            let config = if let Some(json) = config_json {
                serde_json::from_str(&json).unwrap_or_default()
            } else {
                TestSequenceConfig::default()
            };
            
            let sequence = generator.generate_velocity_test(Some(config));
            serde_json::to_string(&sequence).unwrap_or_else(|_| "{}".to_string())
        } else {
            crate::log("❌ Test sequence generator not initialized");
            r#"{"error": "Generator not initialized"}"#.to_string()
        }
    }
}

/// Convert MIDI note to note name
#[wasm_bindgen]
pub fn midi_note_to_name(note: u8) -> String {
    NoteNameUtils::midi_to_note_name(note)
}

/// Convert note name to MIDI note number (returns 255 for invalid)
#[wasm_bindgen]
pub fn note_name_to_midi(note_name: &str) -> u8 {
    NoteNameUtils::note_name_to_midi(note_name).unwrap_or(255)
}

/// Execute a test sequence by queuing all its events
/// Returns number of events queued
#[wasm_bindgen]
pub fn execute_test_sequence(sequence_json: &str) -> u32 {
    match serde_json::from_str::<MidiTestSequence>(sequence_json) {
        Ok(sequence) => {
            crate::log(&format!("🧪 Executing test sequence: {} ({} events)", 
                sequence.name, sequence.events.len()));
            
            let mut events_queued = 0;
            
            // Queue all events from the sequence
            for event in &sequence.events {
                if let Some(queue) = crate::MIDI_EVENT_QUEUE.get() {
                    if let Ok(mut queue) = queue.lock() {
                        if queue.len() >= 1000 {
                            queue.pop_front();
                        }
                        queue.push_back(*event);
                        events_queued += 1;
                    }
                }
            }
            
            crate::log(&format!("✅ Test sequence queued: {} events, duration: {}ms", 
                events_queued, sequence.total_duration_ms));
            
            events_queued
        },
        Err(e) => {
            crate::log(&format!("❌ Failed to parse test sequence JSON: {}", e));
            0
        }
    }
}

/// Quick test function - generate and execute C major scale
#[wasm_bindgen]
pub fn quick_c_major_test() -> String {
    let sequence_json = generate_c_major_scale_test(None);
    let events_queued = execute_test_sequence(&sequence_json);
    
    format!(r#"{{"success": true, "events_queued": {}, "sequence": "C Major Scale"}}"#, events_queued)
}