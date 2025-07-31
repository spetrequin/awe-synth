use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

mod error;
mod midi;
mod synth;
mod soundfont;
mod effects;

use midi::sequencer::{MidiSequencer, PlaybackState};
use midi::constants::*;
use synth::voice_manager::VoiceManager;

static mut DEBUG_LOG: Option<VecDeque<String>> = None;
static mut MIDI_EVENT_QUEUE: Option<VecDeque<MidiEvent>> = None;

pub fn log(message: &str) {
    unsafe {
        if DEBUG_LOG.is_none() {
            DEBUG_LOG = Some(VecDeque::with_capacity(200));
        }
        if let Some(ref mut log) = DEBUG_LOG {
            if log.len() >= 200 {
                log.pop_front();
            }
            log.push_back(message.to_string());
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct MidiEvent {
    pub timestamp: u64,
    pub channel: u8,
    pub message_type: u8,
    pub data1: u8,
    pub data2: u8,
}

#[wasm_bindgen]
impl MidiEvent {
    #[wasm_bindgen(constructor)]
    pub fn new(timestamp: u64, channel: u8, message_type: u8, data1: u8, data2: u8) -> MidiEvent {
        MidiEvent { timestamp, channel, message_type, data1, data2 }
    }
}

#[wasm_bindgen]
pub struct MidiPlayer {
    sequencer: MidiSequencer,
    voice_manager: VoiceManager,
    current_sample: u64,
}

#[wasm_bindgen]
impl MidiPlayer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> MidiPlayer {
        log("MidiPlayer::new() - AWE Player initialized");
        unsafe {
            if MIDI_EVENT_QUEUE.is_none() {
                MIDI_EVENT_QUEUE = Some(VecDeque::with_capacity(1000));
                log("MIDI event queue initialized (capacity: 1000)");
            }
        }
        MidiPlayer {
            sequencer: MidiSequencer::new(44100.0), // 44.1kHz sample rate
            voice_manager: VoiceManager::new(44100.0),
            current_sample: 0,
        }
    }
    
    #[wasm_bindgen]
    pub fn queue_midi_event(&mut self, event: MidiEvent) {
        unsafe {
            if let Some(ref mut queue) = MIDI_EVENT_QUEUE {
                if queue.len() >= 1000 {
                    queue.pop_front();
                    log("MIDI queue full - dropped oldest event");
                }
                queue.push_back(event);
                log(&format!("MIDI event queued: ch={} type={} data={},{} @{}", 
                    event.channel, event.message_type, event.data1, event.data2, event.timestamp));
            }
        }
    }
    
    #[wasm_bindgen]
    pub fn process_midi_events(&mut self, current_sample_time: u64) -> u32 {
        let mut processed_count = 0;
        unsafe {
            if let Some(ref mut queue) = MIDI_EVENT_QUEUE {
                while let Some(event) = queue.front() {
                    if event.timestamp <= current_sample_time {
                        let event = queue.pop_front().unwrap();
                        
                        // Process MIDI event through VoiceManager
                        self.handle_midi_event(&event);
                        
                        log(&format!("Processing MIDI event: ch={} type=0x{:02X} data={},{} @{}", 
                            event.channel, event.message_type, event.data1, event.data2, event.timestamp));
                        processed_count += 1;
                    } else {
                        break;
                    }
                }
            }
        }
        processed_count
    }
    
    #[wasm_bindgen]
    pub fn get_debug_log(&self) -> String {
        unsafe {
            if let Some(ref log) = DEBUG_LOG {
                log.iter().cloned().collect::<Vec<String>>().join("\n")
            } else {
                String::new()
            }
        }
    }
    
    #[wasm_bindgen]
    pub fn play_test_tone(&mut self) -> f32 {
        log("MidiPlayer::play_test_tone() - 440Hz test tone generated");
        use std::f32::consts::PI;
        let frequency = 440.0;
        let sample_rate = 44100.0;
        let time = 0.0;
        (2.0 * PI * frequency * time / sample_rate).sin() * 0.1
    }
    
    // MIDI Sequencer Controls
    
    #[wasm_bindgen]
    pub fn load_midi_file(&mut self, data: &[u8]) -> bool {
        match self.sequencer.load_midi_file(data) {
            Ok(()) => {
                log("MIDI file loaded successfully");
                true
            },
            Err(e) => {
                log(&format!("Failed to load MIDI file: {:?}", e));
                false
            }
        }
    }
    
    #[wasm_bindgen]
    pub fn play(&mut self) {
        self.sequencer.play(self.current_sample);
    }
    
    #[wasm_bindgen]
    pub fn pause(&mut self) {
        self.sequencer.pause(self.current_sample);
    }
    
    #[wasm_bindgen]
    pub fn stop(&mut self) {
        self.sequencer.stop();
    }
    
    #[wasm_bindgen]
    pub fn seek(&mut self, position: f64) {
        self.sequencer.seek(position, self.current_sample);
    }
    
    #[wasm_bindgen]
    pub fn set_tempo_multiplier(&mut self, multiplier: f64) {
        self.sequencer.set_tempo_multiplier(multiplier);
    }
    
    #[wasm_bindgen]
    pub fn get_playback_state(&self) -> u8 {
        match self.sequencer.get_state() {
            PlaybackState::Stopped => 0,
            PlaybackState::Playing => 1,
            PlaybackState::Paused => 2,
        }
    }
    
    #[wasm_bindgen]
    pub fn get_position(&self) -> f64 {
        self.sequencer.get_position()
    }
    
    #[wasm_bindgen]
    pub fn get_position_seconds(&self) -> f64 {
        self.sequencer.get_position_seconds()
    }
    
    #[wasm_bindgen]
    pub fn get_duration_seconds(&self) -> f64 {
        self.sequencer.get_duration_seconds()
    }
    
    #[wasm_bindgen]
    pub fn get_current_tempo_bpm(&self) -> f64 {
        self.sequencer.get_current_tempo_bpm()
    }
    
    #[wasm_bindgen]
    pub fn get_original_tempo_bpm(&self) -> f64 {
        self.sequencer.get_original_tempo_bpm()
    }
    
    #[wasm_bindgen]
    pub fn advance_time(&mut self, samples: u32) {
        self.current_sample += samples as u64;
        
        // Process sequencer events
        let events = self.sequencer.process(self.current_sample, samples as usize);
        
        // Convert sequencer events to our MIDI event queue
        for event in events {
            let midi_event = match event.event_type {
                midi::sequencer::ProcessedEventType::NoteOn { channel, note, velocity } => {
                    MidiEvent::new(self.current_sample, channel, 0x90, note, velocity)
                },
                midi::sequencer::ProcessedEventType::NoteOff { channel, note, velocity } => {
                    MidiEvent::new(self.current_sample, channel, 0x80, note, velocity)
                },
                midi::sequencer::ProcessedEventType::ProgramChange { channel, program } => {
                    MidiEvent::new(self.current_sample, channel, 0xC0, program, 0)
                },
                midi::sequencer::ProcessedEventType::ControlChange { channel, controller, value } => {
                    MidiEvent::new(self.current_sample, channel, 0xB0, controller, value)
                },
            };
            
            self.queue_midi_event(midi_event);
        }
    }
    
    /// Handle MIDI event and route to VoiceManager
    fn handle_midi_event(&mut self, event: &MidiEvent) {
        let message_type = (event.message_type & 0xF0) >> 4;
        
        match message_type {
            MIDI_EVENT_NOTE_OFF => {
                // Note Off
                self.voice_manager.note_off(event.data1);
                log(&format!("VoiceManager: Note Off - Note {} Ch {}", event.data1, event.channel));
            },
            MIDI_EVENT_NOTE_ON => {
                // Note On (check velocity > 0, otherwise treat as Note Off)
                if event.data2 > MIDI_VELOCITY_MIN {
                    match self.voice_manager.note_on(event.data1, event.data2) {
                        Some(voice_id) => {
                            log(&format!("VoiceManager: Note On - Note {} Vel {} assigned to Voice {}", 
                                event.data1, event.data2, voice_id));
                        },
                        None => {
                            log(&format!("VoiceManager: Note On failed - No available voices for Note {} Vel {}", 
                                event.data1, event.data2));
                        }
                    }
                } else {
                    // Velocity 0 = Note Off
                    self.voice_manager.note_off(event.data1);
                    log(&format!("VoiceManager: Note Off (vel=0) - Note {} Ch {}", event.data1, event.channel));
                }
            },
            MIDI_EVENT_CONTROL_CHANGE => {
                // Control Change - handle common CC messages
                match event.data1 {
                    MIDI_CC_MODULATION => {
                        log(&format!("VoiceManager: Modulation {} (Ch {})", event.data2, event.channel));
                        // TODO: Apply modulation to active voices
                    },
                    MIDI_CC_VOLUME => {
                        log(&format!("VoiceManager: Volume {} (Ch {})", event.data2, event.channel));
                        // TODO: Apply volume to channel
                    },
                    MIDI_CC_PAN => {
                        log(&format!("VoiceManager: Pan {} (Ch {})", event.data2, event.channel));
                        // TODO: Apply pan to channel
                    },
                    MIDI_CC_SUSTAIN => {
                        let sustain_on = event.data2 >= 64;
                        log(&format!("VoiceManager: Sustain {} (Ch {})", if sustain_on { "On" } else { "Off" }, event.channel));
                        // TODO: Apply sustain pedal to active voices
                    },
                    MIDI_CC_ALL_SOUND_OFF => {
                        log(&format!("VoiceManager: All Sound Off (Ch {})", event.channel));
                        // TODO: Stop all voices immediately
                    },
                    MIDI_CC_ALL_NOTES_OFF => {
                        log(&format!("VoiceManager: All Notes Off (Ch {})", event.channel));
                        // TODO: Release all notes (respect sustain)
                    },
                    _ => {
                        log(&format!("VoiceManager: CC {} = {} (Ch {})", event.data1, event.data2, event.channel));
                        // TODO: Handle other CC messages
                    }
                }
            },
            MIDI_EVENT_PROGRAM_CHANGE => {
                // Program Change
                log(&format!("VoiceManager: Program Change {} (Ch {})", event.data1, event.channel));
                // TODO: Handle program changes for instrument selection
            },
            MIDI_EVENT_PITCH_BEND => {
                // Pitch Bend
                let pitch_value = ((event.data2 as u16) << 7) | (event.data1 as u16);
                log(&format!("VoiceManager: Pitch Bend {} (Ch {})", pitch_value, event.channel));
                // TODO: Handle pitch bend messages
            },
            _ => {
                log(&format!("VoiceManager: Unhandled MIDI message type 0x{:02X}", message_type));
            }
        }
    }
}