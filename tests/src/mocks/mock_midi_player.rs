/**
 * Mock MIDI Player Implementation
 * 
 * External mock for testing MIDI player integration without
 * contaminating production code.
 */

use crate::mocks::MockMidiEvent;
use std::collections::VecDeque;

/// Mock MIDI player state
#[derive(Debug, Clone, PartialEq)]
pub enum MockPlaybackState {
    Stopped,
    Playing,
    Paused,
}

/// Mock MIDI player for integration testing
#[derive(Debug)]
pub struct MockMidiPlayer {
    pub state: MockPlaybackState,
    pub current_sample: u64,
    pub sample_rate: u32,
    pub midi_queue: VecDeque<MockMidiEvent>,
    pub processed_events: Vec<MockMidiEvent>,
    pub tempo_bpm: f64,
    pub volume: f32,
    pub debug_log: VecDeque<String>,
    pub max_queue_size: usize,
    pub dropped_events: usize,
}

impl MockMidiPlayer {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            state: MockPlaybackState::Stopped,
            current_sample: 0,
            sample_rate,
            midi_queue: VecDeque::new(),
            processed_events: Vec::new(),
            tempo_bpm: 120.0,
            volume: 1.0,
            debug_log: VecDeque::new(),
            max_queue_size: 1000,
            dropped_events: 0,
        }
    }

    /// Queue a MIDI event for processing
    pub fn queue_midi_event(&mut self, event: MockMidiEvent) -> Result<(), String> {
        if self.midi_queue.len() >= self.max_queue_size {
            // Drop oldest event
            if let Some(dropped) = self.midi_queue.pop_front() {
                self.dropped_events += 1;
                self.log(format!("Dropped MIDI event due to queue overflow: {:?}", dropped));
            }
        }

        self.midi_queue.push_back(event.clone());
        self.log(format!("Queued MIDI event: {:?}", event));
        Ok(())
    }

    /// Process MIDI events up to current sample time
    pub fn process_midi_events(&mut self, current_sample_time: u64) -> usize {
        self.current_sample = current_sample_time;
        let mut processed_count = 0;

        // Process events that are due
        while let Some(event) = self.midi_queue.front() {
            if event.timestamp <= current_sample_time {
                let event = self.midi_queue.pop_front().unwrap();
                self.handle_midi_event(&event);
                self.processed_events.push(event);
                processed_count += 1;
            } else {
                break;
            }
        }

        if processed_count > 0 {
            self.log(format!("Processed {} MIDI events @{} samples", 
                processed_count, current_sample_time));
        }

        processed_count
    }

    /// Handle individual MIDI event
    fn handle_midi_event(&mut self, event: &MockMidiEvent) {
        let message_type = event.message_type & 0xF0;
        
        match message_type {
            0x80 | 0x90 => { // Note Off / Note On
                let is_note_on = message_type == 0x90 && event.data2 > 0;
                let event_name = if is_note_on { "Note On" } else { "Note Off" };
                
                self.log(format!("{} Ch{} Note{} Vel{}", 
                    event_name, event.channel + 1, event.data1, event.data2));
            },
            0xB0 => { // Control Change
                self.log(format!("CC Ch{} Controller{} Value{}", 
                    event.channel + 1, event.data1, event.data2));
                
                // Handle special controllers
                match event.data1 {
                    7 => { // Volume
                        self.volume = event.data2 as f32 / 127.0;
                        self.log(format!("Volume changed to {:.2}", self.volume));
                    },
                    _ => {}
                }
            },
            0xC0 => { // Program Change
                self.log(format!("Program Change Ch{} Program{}", 
                    event.channel + 1, event.data1));
            },
            0xE0 => { // Pitch Bend
                let pitch_value = (event.data2 as u16) << 7 | event.data1 as u16;
                self.log(format!("Pitch Bend Ch{} Value{}", 
                    event.channel + 1, pitch_value));
            },
            _ => {
                self.log(format!("Unknown MIDI event: {:?}", event));
            }
        }
    }

    /// Advance time by specified samples
    pub fn advance_time(&mut self, samples: u64) {
        self.current_sample += samples;
    }

    /// Start playback
    pub fn play(&mut self) -> Result<(), String> {
        match self.state {
            MockPlaybackState::Stopped | MockPlaybackState::Paused => {
                self.state = MockPlaybackState::Playing;
                self.log("Playback started".to_string());
                Ok(())
            },
            MockPlaybackState::Playing => {
                Err("Already playing".to_string())
            }
        }
    }

    /// Pause playback
    pub fn pause(&mut self) -> Result<(), String> {
        match self.state {
            MockPlaybackState::Playing => {
                self.state = MockPlaybackState::Paused;
                self.log("Playback paused".to_string());
                Ok(())
            },
            _ => {
                Err("Not playing".to_string())
            }
        }
    }

    /// Stop playback
    pub fn stop(&mut self) -> Result<(), String> {
        self.state = MockPlaybackState::Stopped;
        self.current_sample = 0;
        self.clear_queue();
        self.log("Playback stopped".to_string());
        Ok(())
    }

    /// Set tempo
    pub fn set_tempo(&mut self, bpm: f64) -> Result<(), String> {
        if bpm < 30.0 || bpm > 300.0 {
            return Err(format!("Invalid tempo: {}", bpm));
        }
        
        self.tempo_bpm = bpm;
        self.log(format!("Tempo changed to {:.1} BPM", bpm));
        Ok(())
    }

    /// Seek to specific sample position
    pub fn seek(&mut self, sample_position: u64) -> Result<(), String> {
        self.current_sample = sample_position;
        
        // Clear events that are now in the past
        self.midi_queue.retain(|event| event.timestamp >= sample_position);
        
        self.log(format!("Seeked to sample {}", sample_position));
        Ok(())
    }

    /// Clear all queued events
    pub fn clear_queue(&mut self) {
        let cleared_count = self.midi_queue.len();
        self.midi_queue.clear();
        
        if cleared_count > 0 {
            self.log(format!("Cleared {} queued events", cleared_count));
        }
    }

    /// Get current playback state
    pub fn get_state(&self) -> MockPlaybackState {
        self.state.clone()
    }

    /// Get current sample position
    pub fn get_current_sample(&self) -> u64 {
        self.current_sample
    }

    /// Get current tempo
    pub fn get_tempo(&self) -> f64 {
        self.tempo_bpm
    }

    /// Get queue statistics
    pub fn get_queue_stats(&self) -> QueueStats {
        QueueStats {
            queued_events: self.midi_queue.len(),
            processed_events: self.processed_events.len(),
            dropped_events: self.dropped_events,
            max_queue_size: self.max_queue_size,
        }
    }

    /// Get debug log
    pub fn get_debug_log(&self) -> String {
        self.debug_log.iter().cloned().collect::<Vec<_>>().join("\n")
    }

    /// Clear debug log
    pub fn clear_debug_log(&mut self) {
        self.debug_log.clear();
    }

    /// Internal logging
    fn log(&mut self, message: String) {
        // Keep log size manageable
        if self.debug_log.len() >= 100 {
            self.debug_log.pop_front();
        }
        
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        
        self.debug_log.push_back(format!("[{}] {}", timestamp, message));
    }

    /// Convert samples to milliseconds
    pub fn samples_to_ms(&self, samples: u64) -> f64 {
        (samples as f64 / self.sample_rate as f64) * 1000.0
    }

    /// Convert milliseconds to samples
    pub fn ms_to_samples(&self, ms: f64) -> u64 {
        ((ms / 1000.0) * self.sample_rate as f64).round() as u64
    }

    /// Reset to initial state
    pub fn reset(&mut self) {
        self.state = MockPlaybackState::Stopped;
        self.current_sample = 0;
        self.midi_queue.clear();
        self.processed_events.clear();
        self.tempo_bpm = 120.0;
        self.volume = 1.0;
        self.debug_log.clear();
        self.dropped_events = 0;
    }
}

/// Queue statistics
#[derive(Debug, Clone)]
pub struct QueueStats {
    pub queued_events: usize,
    pub processed_events: usize,
    pub dropped_events: usize,
    pub max_queue_size: usize,
}

impl QueueStats {
    pub fn total_events(&self) -> usize {
        self.queued_events + self.processed_events + self.dropped_events
    }

    pub fn queue_utilization(&self) -> f64 {
        self.queued_events as f64 / self.max_queue_size as f64
    }
}