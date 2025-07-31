/**
 * Mock Implementations for Testing
 * 
 * External mock implementations that don't pollute production code.
 * Follows zero penetration policy - all mocking is external.
 */

pub mod mock_midi_player;
pub mod mock_midi_router;
// pub mod mock_voice_manager;

/// Mock MIDI event for testing
#[derive(Debug, Clone, PartialEq)]
pub struct MockMidiEvent {
    pub timestamp: u64,
    pub channel: u8,
    pub message_type: u8,
    pub data1: u8,
    pub data2: u8,
    pub source: String,
}

impl MockMidiEvent {
    pub fn note_on(channel: u8, note: u8, velocity: u8) -> Self {
        Self {
            timestamp: 0,
            channel,
            message_type: 0x90,
            data1: note,
            data2: velocity,
            source: "test".to_string(),
        }
    }

    pub fn note_off(channel: u8, note: u8, velocity: u8) -> Self {
        Self {
            timestamp: 0,
            channel,
            message_type: 0x80,
            data1: note,
            data2: velocity,
            source: "test".to_string(),
        }
    }

    pub fn control_change(channel: u8, controller: u8, value: u8) -> Self {
        Self {
            timestamp: 0,
            channel,
            message_type: 0xB0,
            data1: controller,
            data2: value,
            source: "test".to_string(),
        }
    }

    pub fn program_change(channel: u8, program: u8) -> Self {
        Self {
            timestamp: 0,
            channel,
            message_type: 0xC0,
            data1: program,
            data2: 0,
            source: "test".to_string(),
        }
    }

    pub fn with_timestamp(mut self, timestamp: u64) -> Self {
        self.timestamp = timestamp;
        self
    }

    pub fn with_source(mut self, source: &str) -> Self {
        self.source = source.to_string();
        self
    }
}

/// Mock voice state for testing voice allocation
#[derive(Debug, Clone)]
pub struct MockVoice {
    pub id: usize,
    pub channel: u8,
    pub note: u8,
    pub velocity: u8,
    pub active: bool,
    pub priority: u8,
    pub start_time: u64,
}

impl MockVoice {
    pub fn new(id: usize, channel: u8, note: u8, velocity: u8, start_time: u64) -> Self {
        Self {
            id,
            channel,
            note,
            velocity,
            active: true,
            priority: if velocity > 100 { 2 } else if velocity > 60 { 1 } else { 0 },
            start_time,
        }
    }

    pub fn stop(&mut self) {
        self.active = false;
    }

    pub fn is_available(&self) -> bool {
        !self.active
    }
}

/// Mock test data generator
pub struct MockDataGenerator {
    current_time: u64,
    event_counter: usize,
}

impl MockDataGenerator {
    pub fn new() -> Self {
        Self {
            current_time: 0,
            event_counter: 0,
        }
    }

    pub fn advance_time(&mut self, samples: u64) {
        self.current_time += samples;
    }

    pub fn generate_note_sequence(&mut self, note_count: usize) -> Vec<MockMidiEvent> {
        let mut events = Vec::new();
        let base_note = 60; // Middle C
        
        for i in 0..note_count {
            let note = base_note + (i % 12) as u8;
            let velocity = 64 + (i * 7 % 64) as u8;
            
            // Note on
            events.push(MockMidiEvent::note_on(0, note, velocity)
                .with_timestamp(self.current_time)
                .with_source("test_sequence"));
            
            self.advance_time(1000); // 1000 samples apart
            
            // Note off after some time
            events.push(MockMidiEvent::note_off(0, note, 64)
                .with_timestamp(self.current_time)
                .with_source("test_sequence"));
            
            self.advance_time(500); 
            self.event_counter += 2;
        }
        
        events
    }

    pub fn generate_polyphonic_chord(&mut self, notes: &[u8], velocity: u8) -> Vec<MockMidiEvent> {
        let mut events = Vec::new();
        
        // All notes on simultaneously
        for &note in notes {
            events.push(MockMidiEvent::note_on(0, note, velocity)
                .with_timestamp(self.current_time)
                .with_source("chord_test"));
        }
        
        self.advance_time(44100); // 1 second at 44.1kHz
        
        // All notes off
        for &note in notes {
            events.push(MockMidiEvent::note_off(0, note, 64)  
                .with_timestamp(self.current_time)
                .with_source("chord_test"));
        }
        
        self.event_counter += events.len();
        events
    }

    pub fn generate_cc_sweep(&mut self, controller: u8, start_val: u8, end_val: u8, steps: usize) -> Vec<MockMidiEvent> {
        let mut events = Vec::new();
        let step_size = if end_val > start_val { 
            (end_val - start_val) as f32 / steps as f32 
        } else { 
            (start_val - end_val) as f32 / steps as f32 
        };
        
        for i in 0..steps {
            let value = if end_val > start_val {
                start_val + (i as f32 * step_size) as u8
            } else {
                start_val - (i as f32 * step_size) as u8
            };
            
            events.push(MockMidiEvent::control_change(0, controller, value)
                .with_timestamp(self.current_time)
                .with_source("cc_sweep"));
            
            self.advance_time(441); // 10ms steps at 44.1kHz
        }
        
        self.event_counter += events.len();
        events
    }

    pub fn current_timestamp(&self) -> u64 {
        self.current_time
    }

    pub fn event_count(&self) -> usize {
        self.event_counter
    }
}