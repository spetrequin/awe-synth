use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

mod error;
mod midi;
mod synth;
mod soundfont;
mod effects;

static mut DEBUG_LOG: Option<VecDeque<String>> = None;

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
pub struct MidiPlayer {
    // Core player state will be added here
}

#[wasm_bindgen]
impl MidiPlayer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> MidiPlayer {
        log("MidiPlayer::new() - AWE Player initialized");
        MidiPlayer {}
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