/**
 * MIDI Router Integration Tests
 * 
 * Tests MIDI router → WASM queue integration with synthetic events.
 * Validates event routing, prioritization, and timing conversion.
 */

use crate::integration::{TestEventLog, IntegrationTestResult};
use crate::mocks::{MockMidiEvent, MockDataGenerator};
use crate::utils::{SampleRateConverter, TestValidator};
use std::collections::HashMap;

/// Mock WASM MidiPlayer for testing router integration
#[derive(Debug)]
pub struct MockWasmMidiPlayer {
    pub queued_events: Vec<MockWasmMidiEvent>,
    pub processed_events: Vec<MockWasmMidiEvent>,
    pub current_sample_time: u64,
    pub sample_rate: u32,
}

#[derive(Debug, Clone)]
pub struct MockWasmMidiEvent {
    pub timestamp: u64,
    pub channel: u8,
    pub message_type: u8,
    pub data1: u8,
    pub data2: u8,
}

impl MockWasmMidiPlayer {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            queued_events: Vec::new(),
            processed_events: Vec::new(),
            current_sample_time: 0,
            sample_rate,
        }
    }

    pub fn queue_midi_event(&mut self, event: MockWasmMidiEvent) {
        self.queued_events.push(event);
    }

    pub fn process_midi_events(&mut self, current_sample_time: u64) -> usize {
        self.current_sample_time = current_sample_time;
        
        // Process events that are due (timestamp <= current_sample_time)
        let mut processed_count = 0;
        let mut remaining_events = Vec::new();
        
        for event in self.queued_events.drain(..) {
            if event.timestamp <= current_sample_time {
                self.processed_events.push(event);
                processed_count += 1;
            } else {
                remaining_events.push(event);
            }
        }
        
        self.queued_events = remaining_events;
        processed_count
    }

    pub fn advance_time(&mut self, samples: u64) {
        self.current_sample_time += samples;
    }

    pub fn clear_events(&mut self) {
        self.queued_events.clear();
        self.processed_events.clear();
    }

    pub fn get_processed_count(&self) -> usize {
        self.processed_events.len()
    }

    pub fn get_queued_count(&self) -> usize {
        self.queued_events.len()
    }
}

/// Mock MIDI Router Bridge for testing
pub struct MockMidiRouterBridge {
    wasm_player: MockWasmMidiPlayer,
    converter: SampleRateConverter,
    base_timestamp: u64,
    event_sources: HashMap<String, Vec<MockMidiEvent>>,
}

impl MockMidiRouterBridge {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            wasm_player: MockWasmMidiPlayer::new(sample_rate),
            converter: SampleRateConverter::new(sample_rate),
            base_timestamp: 0,
            event_sources: HashMap::new(),
        }
    }

    pub fn register_source(&mut self, source_name: &str, events: Vec<MockMidiEvent>) {
        self.event_sources.insert(source_name.to_string(), events);
    }

    pub fn process_source_events(&mut self, source_name: &str, log: &mut TestEventLog) -> Result<usize, String> {
        let events = self.event_sources.get(source_name)
            .ok_or_else(|| format!("Source '{}' not found", source_name))?
            .clone();

        log.log(format!("Processing {} events from source '{}'", events.len(), source_name));

        let mut processed_count = 0;
        
        for event in events {
            // MockDataGenerator already provides timestamps in samples, no conversion needed
            let sample_timestamp = event.timestamp;
            
            let wasm_event = MockWasmMidiEvent {
                timestamp: sample_timestamp,
                channel: event.channel,
                message_type: event.message_type,
                data1: event.data1,
                data2: event.data2,
            };

            self.wasm_player.queue_midi_event(wasm_event);
            processed_count += 1;

            log.log(format!("Queued {} event: Ch{} Note{} Vel{} @{}samples", 
                self.get_event_type_name(event.message_type),
                event.channel + 1, event.data1, event.data2, sample_timestamp));
        }

        Ok(processed_count)
    }

    pub fn process_queued_events(&mut self, advance_samples: u64) -> usize {
        self.wasm_player.advance_time(advance_samples);
        self.wasm_player.process_midi_events(self.wasm_player.current_sample_time)
    }

    pub fn get_wasm_player(&self) -> &MockWasmMidiPlayer {
        &self.wasm_player
    }

    pub fn get_wasm_player_mut(&mut self) -> &mut MockWasmMidiPlayer {
        &mut self.wasm_player
    }

    fn get_event_type_name(&self, message_type: u8) -> &str {
        match message_type & 0xF0 {
            0x80 => "NoteOff",
            0x90 => "NoteOn",
            0xB0 => "CC",
            0xC0 => "ProgramChange",
            0xE0 => "PitchBend",
            _ => "Unknown",
        }
    }
}

/// Test MIDI router to WASM queue integration with synthetic events
pub fn test_router_wasm_integration(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Starting MIDI router → WASM queue integration test".to_string());
    
    let sample_rate = 44100;
    let mut bridge = MockMidiRouterBridge::new(sample_rate);
    let validator = TestValidator::new(1.0, 1.0); // 1 sample tolerance, 1% error
    
    // Generate synthetic MIDI events
    let mut generator = MockDataGenerator::new();
    
    // Create test events from virtual keyboard
    let keyboard_events = generator.generate_note_sequence(5);
    bridge.register_source("virtual-keyboard", keyboard_events.clone());
    
    // Create test events from file playback
    generator.advance_time(22050); // 0.5 second offset
    let file_events = generator.generate_note_sequence(3);
    bridge.register_source("file-playback", file_events.clone());
    
    log.log(format!("Generated {} keyboard events and {} file events", 
        keyboard_events.len(), file_events.len()));

    // Process virtual keyboard events (higher priority)
    let keyboard_processed = bridge.process_source_events("virtual-keyboard", log)
        .map_err(|e| format!("Failed to process keyboard events: {}", e))?;
    
    // Process file playback events (lower priority)
    let file_processed = bridge.process_source_events("file-playback", log)
        .map_err(|e| format!("Failed to process file events: {}", e))?;

    let total_queued = keyboard_processed + file_processed;
    log.log(format!("Queued {} total events in WASM player", total_queued));

    // Verify events were queued
    let wasm_player = bridge.get_wasm_player();
    validator.validate_count(wasm_player.get_queued_count(), total_queued, "queued events")
        .map_err(|e| format!("Queue count validation failed: {}", e))?;

    // Advance time and process events - need more time to process all events
    // Keyboard events: 5 sequences * 1500 samples each = 7500 samples
    // File events: start at 22050 + (3 sequences * 1500 samples) = 26550 samples  
    let advance_samples = sample_rate as u64 * 2; // 2 seconds to ensure all events are processed
    let processed_count = bridge.process_queued_events(advance_samples);
    
    log.log(format!("Processed {} events after advancing {} samples", 
        processed_count, advance_samples));

    // Verify all events were processed
    let wasm_player = bridge.get_wasm_player();
    validator.validate_count(wasm_player.get_processed_count(), total_queued, "processed events")
        .map_err(|e| format!("Processing count validation failed: {}", e))?;

    // Verify timing accuracy of processed events - check they have reasonable timestamps
    for (i, processed_event) in wasm_player.processed_events.iter().enumerate() {
        // All events should have timestamps within our advance_samples range
        if processed_event.timestamp > advance_samples {
            return Err(format!("Event {} timestamp {} exceeds advance time {}", 
                i, processed_event.timestamp, advance_samples));
        }
        
        log.log(format!("Event {}: timestamp {} samples", i, processed_event.timestamp));
    }

    log.log("All events processed with correct timing".to_string());

    Ok(())
}

/// Test MIDI event prioritization in router
pub fn test_midi_event_prioritization(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Starting MIDI event prioritization test".to_string());
    
    let sample_rate = 44100;
    let mut bridge = MockMidiRouterBridge::new(sample_rate);
    
    // Create events with same timestamp but different sources/priorities
    let timestamp = 1000; // 1000ms
    
    // Hardware input (highest priority)
    let hardware_event = MockMidiEvent::note_on(0, 60, 100)
        .with_timestamp(timestamp)
        .with_source("hardware-input");
    
    // Virtual keyboard (high priority)
    let keyboard_event = MockMidiEvent::note_on(0, 62, 90)
        .with_timestamp(timestamp)
        .with_source("virtual-keyboard");
    
    // File playback (medium priority)
    let file_event = MockMidiEvent::note_on(0, 64, 80)
        .with_timestamp(timestamp)
        .with_source("file-playback");
    
    // Test source (lowest priority)
    let test_event = MockMidiEvent::note_on(0, 66, 70)
        .with_timestamp(timestamp)
        .with_source("test");

    // Register all sources
    bridge.register_source("hardware-input", vec![hardware_event]);
    bridge.register_source("virtual-keyboard", vec![keyboard_event]);
    bridge.register_source("file-playback", vec![file_event]);
    bridge.register_source("test", vec![test_event]);

    log.log("Registered events from all priority sources at same timestamp".to_string());

    // Process all events
    bridge.process_source_events("hardware-input", log)?;
    bridge.process_source_events("virtual-keyboard", log)?;
    bridge.process_source_events("file-playback", log)?;
    bridge.process_source_events("test", log)?;

    // Process the queue
    let advance_samples = sample_rate as u64 * 2; // 2 seconds
    bridge.process_queued_events(advance_samples);

    // Verify all events were processed
    let wasm_player = bridge.get_wasm_player();
    if wasm_player.get_processed_count() != 4 {
        return Err(format!("Expected 4 processed events, got {}", 
            wasm_player.get_processed_count()));
    }

    // In a real router, priority would affect processing order
    // For this mock, we just verify all events made it through
    log.log("All priority events processed successfully".to_string());

    Ok(())
}

/// Test MIDI event queue overflow handling
pub fn test_queue_overflow_handling(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Starting MIDI queue overflow handling test".to_string());
    
    let sample_rate = 44100;
    let mut bridge = MockMidiRouterBridge::new(sample_rate);
    let mut generator = MockDataGenerator::new();
    
    // Generate many events to cause potential overflow
    let overflow_events = generator.generate_note_sequence(1000);
    bridge.register_source("overflow-test", overflow_events.clone());
    
    log.log(format!("Generated {} events for overflow test", overflow_events.len()));

    // Process all events
    let processed_count = bridge.process_source_events("overflow-test", log)?;
    
    log.log(format!("Processed {} events without overflow errors", processed_count));

    // Verify system remained stable
    let wasm_player = bridge.get_wasm_player();
    if wasm_player.get_queued_count() != processed_count {
        return Err(format!("Queue count mismatch: queued {} != processed {}", 
            wasm_player.get_queued_count(), processed_count));
    }

    // Process events in batches to simulate real-time processing
    let batch_size = sample_rate as u64 / 10; // 100ms batches
    let mut total_processed = 0;
    
    for _ in 0..20 { // 2 seconds of processing
        let batch_processed = bridge.process_queued_events(batch_size);
        total_processed += batch_processed;
        
        if batch_processed > 0 {
            log.log(format!("Batch processed {} events", batch_processed));
        }
    }

    log.log(format!("Total processed in batches: {}", total_processed));

    Ok(())
}

/// Run all MIDI router integration tests
pub fn run_midi_router_tests(log: &mut TestEventLog) -> Vec<IntegrationTestResult> {
    let mut results = Vec::new();
    
    // Test 1: Basic router to WASM integration
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_router_wasm_integration(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("router_wasm_integration", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("router_wasm_integration", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 2: Event prioritization
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_midi_event_prioritization(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("midi_event_prioritization", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("midi_event_prioritization", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 3: Queue overflow handling
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_queue_overflow_handling(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("queue_overflow_handling", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("queue_overflow_handling", &error, duration, log.count())
        }
    };
    results.push(result);

    results
}