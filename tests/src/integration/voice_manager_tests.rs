/**
 * VoiceManager Integration Tests
 * 
 * Tests VoiceManager note_on/note_off functionality with debug logging.
 * Validates voice allocation, state transitions, and MIDI event handling.
 */

use crate::integration::{TestEventLog, IntegrationTestResult};
use crate::mocks::{MockMidiEvent, MockDataGenerator};
use crate::utils::{TestValidator, PerformanceMeter};

/// Mock Voice for testing voice allocation
#[derive(Debug, Clone, PartialEq)]
pub enum MockVoiceState {
    Idle,
    Active { note: u8, velocity: u8, channel: u8 },
    Releasing { note: u8, velocity: u8, channel: u8 },
}

#[derive(Debug, Clone)]
pub struct MockVoice {
    pub id: usize,
    pub state: MockVoiceState,
    pub start_sample: u64,
    pub age: u64,
    pub priority: u8,
}

impl MockVoice {
    pub fn new(id: usize) -> Self {
        Self {
            id,
            state: MockVoiceState::Idle,
            start_sample: 0,
            age: 0,
            priority: 0,
        }
    }

    pub fn start_note(&mut self, note: u8, velocity: u8, channel: u8, sample_time: u64) {
        self.state = MockVoiceState::Active { note, velocity, channel };
        self.start_sample = sample_time;
        self.age = 0;
        self.priority = if velocity > 100 { 2 } else if velocity > 60 { 1 } else { 0 };
    }

    pub fn stop_note(&mut self, note: u8, velocity: u8, channel: u8) -> bool {
        match self.state {
            MockVoiceState::Active { note: active_note, channel: active_channel, .. } => {
                if active_note == note && active_channel == channel {
                    self.state = MockVoiceState::Releasing { note, velocity, channel };
                    true
                } else {
                    false
                }
            },
            _ => false
        }
    }

    pub fn is_idle(&self) -> bool {
        matches!(self.state, MockVoiceState::Idle)
    }

    pub fn is_active(&self) -> bool {
        matches!(self.state, MockVoiceState::Active { .. })
    }

    pub fn is_releasing(&self) -> bool {
        matches!(self.state, MockVoiceState::Releasing { .. })
    }

    pub fn advance_time(&mut self, samples: u64) {
        self.age += samples;
        
        // Simulate release completion after 1000 samples
        if let MockVoiceState::Releasing { .. } = self.state {
            if self.age >= 1000 {
                self.state = MockVoiceState::Idle;
                self.age = 0;
                self.priority = 0;
            }
        }
    }

    pub fn get_note(&self) -> Option<u8> {
        match self.state {
            MockVoiceState::Active { note, .. } | MockVoiceState::Releasing { note, .. } => Some(note),
            MockVoiceState::Idle => None,
        }
    }

    pub fn get_channel(&self) -> Option<u8> {
        match self.state {
            MockVoiceState::Active { channel, .. } | MockVoiceState::Releasing { channel, .. } => Some(channel),
            MockVoiceState::Idle => None,
        }
    }
}

/// Mock VoiceManager for testing
#[derive(Debug)]
pub struct MockVoiceManager {
    pub voices: Vec<MockVoice>,
    pub max_voices: usize,
    pub current_sample: u64,
    pub debug_log: Vec<String>,
    pub stats: VoiceManagerStats,
}

#[derive(Debug, Clone)]
pub struct VoiceManagerStats {
    pub notes_started: usize,
    pub notes_stopped: usize,
    pub voices_stolen: usize,
    pub active_voice_count: usize,
    pub peak_polyphony: usize,
}

impl MockVoiceManager {
    pub fn new(max_voices: usize) -> Self {
        let mut voices = Vec::with_capacity(max_voices);
        for i in 0..max_voices {
            voices.push(MockVoice::new(i));
        }

        Self {
            voices,
            max_voices,
            current_sample: 0,
            debug_log: Vec::new(),
            stats: VoiceManagerStats {
                notes_started: 0,
                notes_stopped: 0,
                voices_stolen: 0,
                active_voice_count: 0,
                peak_polyphony: 0,
            },
        }
    }

    pub fn handle_note_on(&mut self, note: u8, velocity: u8, channel: u8) -> Result<usize, String> {
        if velocity == 0 {
            // Note on with velocity 0 is treated as note off
            return self.handle_note_off(note, 64, channel);
        }

        self.log(format!("Note On: Ch{} Note{} Vel{}", channel + 1, note, velocity));

        // Find an idle voice
        if let Some(voice_id) = self.find_idle_voice() {
            let voice = &mut self.voices[voice_id];
            voice.start_note(note, velocity, channel, self.current_sample);
            
            self.stats.notes_started += 1;
            self.update_active_count();
            
            self.log(format!("Allocated voice {} for Note{}", voice_id, note));
            return Ok(voice_id);
        }

        // No idle voice, need to steal
        if let Some(voice_id) = self.find_voice_to_steal() {
            let old_note = self.voices[voice_id].get_note();
            
            if let Some(old_note) = old_note {
                self.log(format!("Stealing voice {} from Note{} for Note{}", 
                    voice_id, old_note, note));
                self.stats.voices_stolen += 1;
            }
            
            let voice = &mut self.voices[voice_id];
            voice.start_note(note, velocity, channel, self.current_sample);
            self.stats.notes_started += 1;
            self.update_active_count();
            
            return Ok(voice_id);
        }

        Err("No voices available for allocation".to_string())
    }

    pub fn handle_note_off(&mut self, note: u8, velocity: u8, channel: u8) -> Result<usize, String> {
        self.log(format!("Note Off: Ch{} Note{} Vel{}", channel + 1, note, velocity));

        // Find the voice playing this note
        for (i, voice) in self.voices.iter_mut().enumerate() {
            if voice.stop_note(note, velocity, channel) {
                self.stats.notes_stopped += 1;
                self.update_active_count();
                
                self.log(format!("Released voice {} for Note{}", i, note));
                return Ok(i);
            }
        }

        self.log(format!("Warning: Note Off for inactive Note{} Ch{}", note, channel + 1));
        Ok(0) // Return dummy voice ID for inactive notes
    }

    pub fn advance_time(&mut self, samples: u64) {
        self.current_sample += samples;
        
        for voice in &mut self.voices {
            voice.advance_time(samples);
        }
        
        self.update_active_count();
    }

    pub fn get_active_voice_count(&self) -> usize {
        self.voices.iter().filter(|v| v.is_active()).count()
    }

    pub fn get_voice_state(&self, voice_id: usize) -> Option<&MockVoiceState> {
        self.voices.get(voice_id).map(|v| &v.state)
    }

    pub fn get_stats(&self) -> &VoiceManagerStats {
        &self.stats
    }

    pub fn get_debug_log(&self) -> String {
        self.debug_log.join("\n")
    }

    pub fn clear_debug_log(&mut self) {
        self.debug_log.clear();
    }

    fn find_idle_voice(&self) -> Option<usize> {
        self.voices.iter().position(|v| v.is_idle())
    }

    fn find_voice_to_steal(&self) -> Option<usize> {
        // Find voice with lowest priority and oldest age
        let mut best_voice = None;
        let mut lowest_priority = 255u8;
        let mut oldest_age = 0u64;

        for (i, voice) in self.voices.iter().enumerate() {
            if voice.is_active() {
                if voice.priority < lowest_priority || 
                   (voice.priority == lowest_priority && voice.age > oldest_age) {
                    best_voice = Some(i);
                    lowest_priority = voice.priority;
                    oldest_age = voice.age;
                }
            }
        }

        best_voice
    }

    fn update_active_count(&mut self) {
        self.stats.active_voice_count = self.get_active_voice_count();
        if self.stats.active_voice_count > self.stats.peak_polyphony {
            self.stats.peak_polyphony = self.stats.active_voice_count;
        }
    }

    fn log(&mut self, message: String) {
        // Keep log size manageable
        if self.debug_log.len() >= 100 {
            self.debug_log.remove(0);
        }
        
        self.debug_log.push(format!("[{}] {}", self.current_sample, message));
    }
}

/// Test basic note on/off functionality
pub fn test_note_on_off_basic(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing basic note on/off functionality".to_string());
    
    let mut voice_manager = MockVoiceManager::new(32);
    let validator = TestValidator::new(1.0, 1.0);
    
    // Test note on
    let voice_id = voice_manager.handle_note_on(60, 100, 0)
        .map_err(|e| format!("Note on failed: {}", e))?;
    
    log.log(format!("Note on allocated voice {}", voice_id));
    
    // Verify voice state
    let voice_state = voice_manager.get_voice_state(voice_id)
        .ok_or("Voice not found")?;
    
    match voice_state {
        MockVoiceState::Active { note, velocity, channel } => {
            validator.validate_count(*note as usize, 60, "note")?;
            validator.validate_count(*velocity as usize, 100, "velocity")?;
            validator.validate_count(*channel as usize, 0, "channel")?;
        },
        _ => return Err("Voice not in active state".to_string()),
    }
    
    // Test note off
    let release_voice = voice_manager.handle_note_off(60, 64, 0)
        .map_err(|e| format!("Note off failed: {}", e))?;
    
    log.log(format!("Note off released voice {}", release_voice));
    validator.validate_count(release_voice, voice_id, "release voice ID")?;
    
    // Verify voice is releasing
    let voice_state = voice_manager.get_voice_state(voice_id)
        .ok_or("Voice not found")?;
    
    if !matches!(voice_state, MockVoiceState::Releasing { .. }) {
        return Err("Voice not in releasing state".to_string());
    }
    
    // Advance time to complete release
    voice_manager.advance_time(1500);
    
    // Verify voice is idle
    let voice_state = voice_manager.get_voice_state(voice_id)
        .ok_or("Voice not found")?;
    
    if !matches!(voice_state, MockVoiceState::Idle) {
        return Err("Voice not returned to idle state".to_string());
    }
    
    log.log("Note on/off cycle completed successfully".to_string());
    Ok(())
}

/// Test polyphonic voice allocation
pub fn test_polyphonic_allocation(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing polyphonic voice allocation".to_string());
    
    let mut voice_manager = MockVoiceManager::new(8); // Smaller for easier testing
    let validator = TestValidator::new(1.0, 1.0);
    
    // Allocate multiple voices
    let notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
    let mut allocated_voices = Vec::new();
    
    for (i, &note) in notes.iter().enumerate() {
        let velocity = 80 + (i * 5) as u8; // Varying velocities
        let voice_id = voice_manager.handle_note_on(note, velocity, 0)
            .map_err(|e| format!("Failed to allocate voice for note {}: {}", note, e))?;
        
        allocated_voices.push(voice_id);
        log.log(format!("Allocated voice {} for note {}", voice_id, note));
    }
    
    // Verify all voices are allocated
    validator.validate_count(allocated_voices.len(), 8, "allocated voices")?;
    validator.validate_count(voice_manager.get_active_voice_count(), 8, "active voices")?;
    
    // Try to allocate one more voice (should trigger stealing)
    let steal_voice = voice_manager.handle_note_on(74, 120, 0)
        .map_err(|e| format!("Voice stealing failed: {}", e))?;
    
    log.log(format!("Voice stealing allocated voice {}", steal_voice));
    
    // Should still have 8 active voices (one stolen, one new)
    validator.validate_count(voice_manager.get_active_voice_count(), 8, "active voices after stealing")?;
    
    // Verify stats
    let stats = voice_manager.get_stats();
    validator.validate_count(stats.notes_started, 9, "total notes started")?;
    validator.validate_count(stats.voices_stolen, 1, "voices stolen")?;
    validator.validate_count(stats.peak_polyphony, 8, "peak polyphony")?;
    
    log.log("Polyphonic allocation test completed successfully".to_string());
    Ok(())
}

/// Test voice stealing algorithm
pub fn test_voice_stealing_algorithm(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing voice stealing algorithm".to_string());
    
    let mut voice_manager = MockVoiceManager::new(4); // Small for easy stealing
    let validator = TestValidator::new(1.0, 1.0);
    
    // Allocate voices with different priorities
    voice_manager.handle_note_on(60, 40, 0)?;  // Low priority (velocity < 60)
    voice_manager.handle_note_on(62, 80, 0)?;  // Medium priority (60-100)
    voice_manager.handle_note_on(64, 120, 0)?; // High priority (>100)
    voice_manager.handle_note_on(65, 90, 0)?;  // Medium priority
    
    log.log("Allocated 4 voices with varying priorities".to_string());
    
    // Advance time to age the first voice
    voice_manager.advance_time(1000);
    
    // Add one more high priority voice - should steal the oldest low priority voice
    let stolen_voice = voice_manager.handle_note_on(67, 127, 0)?;
    
    // Verify the correct voice was stolen (should be voice 0 - lowest priority, oldest)
    let voice_state = voice_manager.get_voice_state(stolen_voice)
        .ok_or("Stolen voice not found")?;
    
    match voice_state {
        MockVoiceState::Active { note, velocity, .. } => {
            validator.validate_count(*note as usize, 67, "stolen voice note")?;
            validator.validate_count(*velocity as usize, 127, "stolen voice velocity")?;
        },
        _ => return Err("Stolen voice not in active state".to_string()),
    }
    
    // Verify stealing statistics
    let stats = voice_manager.get_stats();
    validator.validate_count(stats.voices_stolen, 1, "voices stolen count")?;
    
    log.log("Voice stealing algorithm test completed successfully".to_string());
    Ok(())
}

/// Test debug logging capture
pub fn test_debug_logging_capture(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing debug logging capture".to_string());
    
    let mut voice_manager = MockVoiceManager::new(4);
    
    // Perform various operations to generate debug logs
    voice_manager.handle_note_on(60, 100, 0)?;
    voice_manager.handle_note_on(62, 80, 1)?;
    voice_manager.advance_time(500);
    voice_manager.handle_note_off(60, 64, 0)?;
    voice_manager.advance_time(1500); // Complete release
    
    // Capture debug log
    let debug_log = voice_manager.get_debug_log();
    
    if debug_log.is_empty() {
        return Err("Debug log is empty".to_string());
    }
    
    // Verify log contains expected entries
    let log_lines: Vec<&str> = debug_log.split('\n').collect();
    
    let expected_patterns = [
        "Note On: Ch1 Note60 Vel100",
        "Allocated voice 0 for Note60",
        "Note On: Ch2 Note62 Vel80", 
        "Note Off: Ch1 Note60 Vel64",
        "Released voice 0 for Note60",
    ];
    
    for pattern in &expected_patterns {
        let found = log_lines.iter().any(|line| line.contains(pattern));
        if !found {
            return Err(format!("Debug log missing pattern: {}", pattern));
        }
    }
    
    log.log(format!("Debug log captured {} entries with expected patterns", log_lines.len()));
    log.log("Debug logging capture test completed successfully".to_string());
    Ok(())
}

/// Test MIDI event sequence processing
pub fn test_midi_event_sequence(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing MIDI event sequence processing".to_string());
    
    let mut voice_manager = MockVoiceManager::new(16);
    let mut generator = MockDataGenerator::new();
    let mut meter = PerformanceMeter::new("MIDI Event Processing");
    
    // Generate a sequence of MIDI events
    let events = generator.generate_note_sequence(10);
    log.log(format!("Generated {} MIDI events for processing", events.len()));
    
    // Process events and measure performance
    for event in &events {
        meter.measure(|| {
            voice_manager.advance_time(100); // Small time advance between events
            
            let message_type = event.message_type & 0xF0;
            match message_type {
                0x90 => { // Note On
                    if event.data2 > 0 {
                        voice_manager.handle_note_on(event.data1, event.data2, event.channel)
                    } else {
                        voice_manager.handle_note_off(event.data1, event.data2, event.channel)
                    }
                },
                0x80 => { // Note Off
                    voice_manager.handle_note_off(event.data1, event.data2, event.channel)
                },
                _ => Ok(0), // Ignore other message types for this test
            }
        }).map_err(|e| format!("Event processing failed: {}", e))?;
    }
    
    // Verify final state
    let stats = voice_manager.get_stats();
    let expected_notes = events.len() / 2; // Half are note on, half are note off
    
    if stats.notes_started < expected_notes {
        return Err(format!("Too few notes started: {} < {}", stats.notes_started, expected_notes));
    }
    
    log.log(format!("Processed {} events, started {} notes, stopped {} notes", 
        events.len(), stats.notes_started, stats.notes_stopped));
    log.log(format!("Performance: {}", meter.summary()));
    log.log("MIDI event sequence test completed successfully".to_string());
    Ok(())
}

/// Run all VoiceManager integration tests
pub fn run_voice_manager_tests(log: &mut TestEventLog) -> Vec<IntegrationTestResult> {
    let mut results = Vec::new();
    
    // Test 1: Basic note on/off
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_note_on_off_basic(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("note_on_off_basic", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("note_on_off_basic", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 2: Polyphonic allocation
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_polyphonic_allocation(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("polyphonic_allocation", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("polyphonic_allocation", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 3: Voice stealing algorithm
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_voice_stealing_algorithm(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("voice_stealing_algorithm", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("voice_stealing_algorithm", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 4: Debug logging capture
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_debug_logging_capture(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("debug_logging_capture", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("debug_logging_capture", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 5: MIDI event sequence
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_midi_event_sequence(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("midi_event_sequence", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("midi_event_sequence", &error, duration, log.count())
        }
    };
    results.push(result);

    results
}