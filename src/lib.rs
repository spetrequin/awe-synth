use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

mod error;
mod midi;
mod synth;
mod soundfont;
mod effects;

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
    // Core player state will be added here
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
        MidiPlayer {}
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
                        log(&format!("Processing MIDI event: ch={} type={} @{}", 
                            event.channel, event.message_type, event.timestamp));
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
}