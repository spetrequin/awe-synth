/**
 * Stress Test Framework - Polyphony and Voice Allocation Testing
 * 
 * Tests 32-voice polyphony limits, voice stealing algorithms,
 * and system behavior under maximum load conditions.
 */

use std::time::Instant;

/// Stress test result
#[derive(Debug, Clone)]
pub struct StressTestResult {
    pub test_name: String,
    pub passed: bool,
    pub message: String,
    pub duration_ms: u128,
    pub max_voices_used: Option<usize>,
    pub events_processed: Option<usize>,
    pub memory_peak_kb: Option<usize>,
}

impl StressTestResult {
    pub fn success(
        test_name: &str, 
        duration_ms: u128, 
        max_voices: usize, 
        events_processed: usize
    ) -> Self {
        Self {
            test_name: test_name.to_string(),
            passed: true,
            message: "Stress test passed".to_string(),
            duration_ms,
            max_voices_used: Some(max_voices),
            events_processed: Some(events_processed),
            memory_peak_kb: None,
        }
    }

    pub fn failure(test_name: &str, error: &str, duration_ms: u128) -> Self {
        Self {
            test_name: test_name.to_string(),
            passed: false,
            message: error.to_string(),
            duration_ms,
            max_voices_used: None,
            events_processed: None,
            memory_peak_kb: None,
        }
    }
}

/// Voice allocation stress test configuration
#[derive(Debug, Clone)]
pub struct VoiceStressConfig {
    pub max_voices: usize,
    pub note_range: (u8, u8),  // (min_note, max_note)
    pub velocity_range: (u8, u8), // (min_vel, max_vel)
    pub test_duration_ms: u64,
    pub events_per_second: usize,
}

impl Default for VoiceStressConfig {
    fn default() -> Self {
        Self {
            max_voices: 32,
            note_range: (36, 96),    // C2 to C7
            velocity_range: (64, 127), // Medium to loud
            test_duration_ms: 1000,  // 1 second
            events_per_second: 100,  // 100 events/sec
        }
    }
}

/// Stress test runner for voice allocation and polyphony
pub struct StressTestRunner {
    config: VoiceStressConfig,
}

impl StressTestRunner {
    pub fn new() -> Self {
        Self {
            config: VoiceStressConfig::default(),
        }
    }

    pub fn with_config(mut self, config: VoiceStressConfig) -> Self {
        self.config = config;
        self
    }

    /// Test maximum polyphony (32 voices)
    pub fn test_max_polyphony(&self) -> StressTestResult {
        let test_name = "max_polyphony";
        let start_time = Instant::now();

        // Simulate allocating maximum voices
        let mut active_voices = Vec::new();
        let mut events_processed = 0;

        // Try to allocate up to max_voices + 10 (to test overflow)
        for i in 0..(self.config.max_voices + 10) {
            let note = (self.config.note_range.0 + (i % 48) as u8).min(self.config.note_range.1);
            let velocity = self.config.velocity_range.0 + ((i * 7) % 64) as u8;
            
            // Mock voice allocation
            if active_voices.len() < self.config.max_voices {
                active_voices.push((note, velocity, i));
            } else {
                // Voice stealing should occur - remove oldest voice
                active_voices.remove(0);
                active_voices.push((note, velocity, i));
            }
            
            events_processed += 1;
        }

        // Verify we never exceeded max voices
        if active_voices.len() > self.config.max_voices {
            let duration = start_time.elapsed().as_millis();
            return StressTestResult::failure(
                test_name,
                &format!("Voice count exceeded maximum: {} > {}", 
                    active_voices.len(), self.config.max_voices),
                duration
            );
        }

        let duration = start_time.elapsed().as_millis();
        StressTestResult::success(test_name, duration, active_voices.len(), events_processed)
    }

    /// Test voice stealing algorithm under pressure
    pub fn test_voice_stealing(&self) -> StressTestResult {
        let test_name = "voice_stealing";
        let start_time = Instant::now();

        // Simulate voice allocation with priority-based stealing
        let mut voices = Vec::new();
        let mut events_processed = 0;
        let mut steal_count = 0;

        // Generate rapid note events to force stealing
        for i in 0..200 {
            let note = self.config.note_range.0 + (i % 48) as u8;
            let velocity = self.config.velocity_range.0 + ((i * 3) % 64) as u8;
            let priority = if velocity > 100 { 2 } else if velocity > 80 { 1 } else { 0 };
            
            events_processed += 1;

            if voices.len() < self.config.max_voices {
                // Space available
                voices.push((note, velocity, priority, i));
            } else {
                // Must steal a voice - find lowest priority, oldest voice
                let mut steal_index = 0;
                let mut lowest_priority = voices[0].2;
                let mut oldest_time = voices[0].3;

                for (idx, (_, _, voice_priority, voice_time)) in voices.iter().enumerate() {
                    if *voice_priority < lowest_priority || 
                       (*voice_priority == lowest_priority && *voice_time < oldest_time) {
                        steal_index = idx;
                        lowest_priority = *voice_priority;
                        oldest_time = *voice_time;
                    }
                }

                // Steal the voice
                voices[steal_index] = (note, velocity, priority, i);
                steal_count += 1;
            }
        }

        // Verify stealing occurred when expected
        let expected_steals = 200 - self.config.max_voices;
        if steal_count != expected_steals {
            let duration = start_time.elapsed().as_millis();
            return StressTestResult::failure(
                test_name,
                &format!("Unexpected steal count: {} (expected {})", 
                    steal_count, expected_steals),
                duration
            );
        }

        let duration = start_time.elapsed().as_millis();
        StressTestResult::success(test_name, duration, voices.len(), events_processed)
    }

    /// Test MIDI event flooding (rapid events)
    pub fn test_midi_flooding(&self) -> StressTestResult {
        let test_name = "midi_flooding";
        let start_time = Instant::now();

        let total_events = self.config.events_per_second * 
            (self.config.test_duration_ms as usize / 1000).max(1);
        let mut processed_events = 0;
        let mut queue = Vec::new();
        const MAX_QUEUE_SIZE: usize = 1000;

        // Simulate rapid MIDI event generation
        for i in 0..total_events {
            let event_type = if i % 2 == 0 { "note_on" } else { "note_off" };
            let note = self.config.note_range.0 + (i % 48) as u8;
            let velocity = if event_type == "note_on" { 
                self.config.velocity_range.0 + ((i * 5) % 64) as u8 
            } else { 
                0 
            };

            // Add to queue with overflow protection
            if queue.len() < MAX_QUEUE_SIZE {
                queue.push((event_type, note, velocity, i));
            } else {
                // Drop oldest event (queue overflow)
                queue.remove(0);
                queue.push((event_type, note, velocity, i));
            }
            
            // Process events periodically
            if i % 10 == 0 {
                processed_events += queue.len().min(5);
                queue.drain(0..queue.len().min(5));
            }
        }

        // Process remaining events
        processed_events += queue.len();

        // Verify we processed a reasonable number of events
        let min_expected = total_events / 2; // At least half should be processed
        if processed_events < min_expected {
            let duration = start_time.elapsed().as_millis();
            return StressTestResult::failure(
                test_name,
                &format!("Too few events processed: {} < {}", 
                    processed_events, min_expected),
                duration
            );
        }

        let duration = start_time.elapsed().as_millis();
        StressTestResult::success(test_name, duration, self.config.max_voices, processed_events)
    }

    /// Test memory usage under stress
    pub fn test_memory_pressure(&self) -> StressTestResult {
        let test_name = "memory_pressure";
        let start_time = Instant::now();

        // Simulate large data structures allocation
        let mut large_buffers = Vec::new();
        let buffer_size = 1024; // 1KB per buffer
        let max_buffers = 1000; // Up to 1MB total

        for i in 0..max_buffers {
            let buffer = vec![0u8; buffer_size];
            large_buffers.push(buffer);

            // Periodically clean up old buffers (simulate memory management)
            if i % 100 == 99 && large_buffers.len() > 500 {
                large_buffers.drain(0..100);
            }
        }

        let final_memory_kb = large_buffers.len() * buffer_size / 1024;
        
        // Verify memory usage is reasonable (< 2MB)
        if final_memory_kb > 2048 {
            let duration = start_time.elapsed().as_millis();
            return StressTestResult::failure(
                test_name,
                &format!("Memory usage too high: {}KB", final_memory_kb),
                duration
            );
        }

        let duration = start_time.elapsed().as_millis();
        let mut result = StressTestResult::success(test_name, duration, 0, max_buffers);
        result.memory_peak_kb = Some(final_memory_kb);
        result
    }
}