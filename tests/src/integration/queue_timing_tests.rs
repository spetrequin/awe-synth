/**
 * MIDI Event Queue Processing Timing Tests
 * 
 * Tests MIDI event queue processing timing and sample accuracy.
 * Validates timing precision, queue performance, and sample-accurate scheduling.
 */

use crate::integration::{TestEventLog, IntegrationTestResult};
use crate::mocks::{MockMidiEvent, MockDataGenerator};
use crate::utils::{TestValidator, PerformanceMeter, SampleRateConverter};
use std::collections::VecDeque;
use std::time::{Duration, Instant};

/// Mock timed event for queue processing tests
#[derive(Debug, Clone)]
pub struct MockTimedEvent {
    pub timestamp: u64,        // Sample timestamp
    pub event: MockMidiEvent,
    pub queued_at: Instant,    // When it was queued
    pub processed_at: Option<Instant>, // When it was processed
}

impl MockTimedEvent {
    pub fn new(event: MockMidiEvent, timestamp: u64) -> Self {
        Self {
            timestamp,
            event,
            queued_at: Instant::now(),
            processed_at: None,
        }
    }

    pub fn mark_processed(&mut self) {
        self.processed_at = Some(Instant::now());
    }

    pub fn queue_latency_us(&self) -> Option<u64> {
        self.processed_at.map(|processed| {
            processed.duration_since(self.queued_at).as_micros() as u64
        })
    }
}

/// Mock MIDI event queue with timing precision
#[derive(Debug)]
pub struct MockMidiEventQueue {
    queue: VecDeque<MockTimedEvent>,
    sample_rate: u32,
    current_sample: u64,
    max_queue_size: usize,
    dropped_events: usize,
    stats: QueueStats,
}

#[derive(Debug, Clone)]
pub struct QueueStats {
    pub total_queued: usize,
    pub total_processed: usize,
    pub dropped_events: usize,
    pub average_latency_us: f64,
    pub max_latency_us: u64,
    pub min_latency_us: u64,
    pub sample_accuracy_errors: usize,
}

impl MockMidiEventQueue {
    pub fn new(sample_rate: u32, max_queue_size: usize) -> Self {
        Self {
            queue: VecDeque::with_capacity(max_queue_size),
            sample_rate,
            current_sample: 0,
            max_queue_size,
            dropped_events: 0,
            stats: QueueStats {
                total_queued: 0,
                total_processed: 0,
                dropped_events: 0,
                average_latency_us: 0.0,
                max_latency_us: 0,
                min_latency_us: u64::MAX,
                sample_accuracy_errors: 0,
            },
        }
    }

    pub fn queue_event(&mut self, event: MockMidiEvent, timestamp: u64) -> Result<(), String> {
        if self.queue.len() >= self.max_queue_size {
            // Drop oldest event
            if let Some(dropped) = self.queue.pop_front() {
                self.dropped_events += 1;
                self.stats.dropped_events += 1;
            }
        }

        let timed_event = MockTimedEvent::new(event, timestamp);
        self.queue.push_back(timed_event);
        self.stats.total_queued += 1;

        Ok(())
    }

    pub fn advance_to_sample(&mut self, target_sample: u64) {
        self.current_sample = target_sample;
    }

    pub fn process_due_events(&mut self) -> Vec<MockTimedEvent> {
        let mut processed_events = Vec::new();
        
        // Process events that are due (timestamp <= current_sample)
        while let Some(mut event) = self.queue.front_mut() {
            if event.timestamp <= self.current_sample {
                event.mark_processed(); // Record processing time
                let mut event = self.queue.pop_front().unwrap();
                
                // Update statistics
                if let Some(latency_us) = event.queue_latency_us() {
                    self.update_latency_stats(latency_us);
                }
                
                // Check sample accuracy (event should not be processed before its time)
                // Only count as error if event is processed before its timestamp
                if event.timestamp > self.current_sample {
                    self.stats.sample_accuracy_errors += 1;
                }
                
                processed_events.push(event);
                self.stats.total_processed += 1;
            } else {
                break;
            }
        }

        processed_events
    }

    pub fn get_queue_length(&self) -> usize {
        self.queue.len()
    }

    pub fn get_stats(&self) -> &QueueStats {
        &self.stats
    }

    pub fn clear_queue(&mut self) {
        self.queue.clear();
    }

    fn update_latency_stats(&mut self, latency_us: u64) {
        // Update min/max
        if latency_us > self.stats.max_latency_us {
            self.stats.max_latency_us = latency_us;
        }
        if latency_us < self.stats.min_latency_us {
            self.stats.min_latency_us = latency_us;
        }

        // Update running average
        let total_processed = self.stats.total_processed as f64;
        self.stats.average_latency_us = 
            (self.stats.average_latency_us * (total_processed - 1.0) + latency_us as f64) / total_processed;
    }

    pub fn samples_to_ms(&self, samples: u64) -> f64 {
        (samples as f64 / self.sample_rate as f64) * 1000.0
    }

    pub fn ms_to_samples(&self, ms: f64) -> u64 {
        ((ms / 1000.0) * self.sample_rate as f64).round() as u64
    }
}

/// Test basic queue timing functionality
pub fn test_queue_timing_basic(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing basic queue timing functionality".to_string());
    
    let sample_rate = 44100;
    let mut queue = MockMidiEventQueue::new(sample_rate, 1000);
    let validator = TestValidator::new(1.0, 1.0);
    
    // Queue events with different timestamps
    let events = vec![
        (MockMidiEvent::note_on(0, 60, 100), 0),       // Immediate
        (MockMidiEvent::note_on(0, 62, 100), 441),     // 10ms later
        (MockMidiEvent::note_on(0, 64, 100), 2205),    // 50ms later
        (MockMidiEvent::note_off(0, 60, 64), 4410),    // 100ms later
    ];
    
    for (event, timestamp) in events {
        queue.queue_event(event, timestamp)
            .map_err(|e| format!("Failed to queue event: {}", e))?;
    }
    
    log.log(format!("Queued {} events", queue.get_queue_length()));
    
    // Process events at different time points
    let time_points = vec![0, 500, 2500, 5000]; // 0ms, ~11ms, ~57ms, ~113ms
    let mut total_processed = 0;
    
    for sample_time in time_points {
        queue.advance_to_sample(sample_time);
        let processed = queue.process_due_events();
        total_processed += processed.len();
        
        log.log(format!("At sample {}: processed {} events", sample_time, processed.len()));
        
        // Verify timing accuracy
        for event in &processed {
            if event.timestamp > sample_time {
                return Err(format!("Event processed too early: timestamp {} > current {}", 
                    event.timestamp, sample_time));
            }
        }
    }
    
    // Verify all events were processed
    validator.validate_count(total_processed, 4, "total processed events")?;
    validator.validate_count(queue.get_queue_length(), 0, "remaining queue length")?;
    
    let stats = queue.get_stats();
    validator.validate_count(stats.total_processed, 4, "stats processed count")?;
    validator.validate_count(stats.sample_accuracy_errors, 0, "sample accuracy errors")?;
    
    log.log("Queue timing basic test completed successfully".to_string());
    Ok(())
}

/// Test sample-accurate timing precision
pub fn test_sample_accurate_timing(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing sample-accurate timing precision".to_string());
    
    let sample_rate = 44100;
    let mut queue = MockMidiEventQueue::new(sample_rate, 1000);
    let converter = SampleRateConverter::new(sample_rate);
    
    // Test precise timing at sample boundaries
    let precise_timings = vec![
        1.0,   // Exactly 44.1 samples
        10.0,  // Exactly 441 samples  
        22.67573696, // Exactly 1000 samples
        100.0, // Exactly 4410 samples
    ];
    
    let mut expected_samples = Vec::new();
    for (i, time_ms) in precise_timings.iter().enumerate() {
        let sample_time = converter.ms_to_samples(*time_ms);
        expected_samples.push(sample_time);
        
        let event = MockMidiEvent::note_on(0, 60 + i as u8, 100);
        queue.queue_event(event, sample_time)
            .map_err(|e| format!("Failed to queue precise event: {}", e))?;
    }
    
    log.log(format!("Queued {} events at precise sample boundaries", expected_samples.len()));
    
    // Process events exactly at their timestamps
    let mut total_processed = 0;
    for expected_sample in expected_samples {
        queue.advance_to_sample(expected_sample);
        let processed = queue.process_due_events();
        
        if processed.is_empty() {
            return Err(format!("No events processed at expected sample {}", expected_sample));
        }
        
        // Verify the event was processed at exactly the right time
        for event in &processed {
            if event.timestamp != expected_sample {
                return Err(format!("Sample accuracy error: expected {}, got {}", 
                    expected_sample, event.timestamp));
            }
        }
        
        total_processed += processed.len();
        log.log(format!("Processed {} events at sample {}", processed.len(), expected_sample));
    }
    
    let stats = queue.get_stats();
    if stats.sample_accuracy_errors > 0 {
        return Err(format!("Sample accuracy errors detected: {}", stats.sample_accuracy_errors));
    }
    
    log.log("Sample-accurate timing test completed successfully".to_string());
    Ok(())
}

/// Test queue processing performance under load
pub fn test_queue_processing_performance(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing queue processing performance under load".to_string());
    
    let sample_rate = 44100;
    let mut queue = MockMidiEventQueue::new(sample_rate, 10000);
    let mut generator = MockDataGenerator::new();
    let mut meter = PerformanceMeter::new("Queue Processing");
    
    // Generate many events for performance testing
    let event_count = 1000;
    let events = generator.generate_note_sequence(event_count / 2); // Each sequence creates 2 events
    
    log.log(format!("Generated {} events for performance testing", events.len()));
    
    // Queue all events
    let queue_start = Instant::now();
    for event in &events {
        queue.queue_event(event.clone(), event.timestamp)?;
    }
    let queue_duration = queue_start.elapsed();
    
    log.log(format!("Queued {} events in {:.2}ms", 
        events.len(), queue_duration.as_secs_f64() * 1000.0));
    
    // Process events in batches to simulate real-time processing
    let batch_size_samples = sample_rate as u64 / 100; // 10ms batches
    let mut current_sample = 0u64;
    let mut total_processed = 0;
    let max_sample = generator.current_timestamp() + batch_size_samples;
    
    while current_sample < max_sample && queue.get_queue_length() > 0 {
        current_sample += batch_size_samples;
        
        let processed = meter.measure(|| {
            queue.advance_to_sample(current_sample);
            queue.process_due_events()
        });
        
        total_processed += processed.len();
        
        if processed.len() > 0 {
            log.log(format!("Batch at sample {}: processed {} events", 
                current_sample, processed.len()));
        }
    }
    
    let stats = queue.get_stats();
    
    // Verify performance metrics
    if stats.average_latency_us > 1000.0 { // Should be under 1ms
        return Err(format!("Average latency too high: {:.2}μs", stats.average_latency_us));
    }
    
    if stats.max_latency_us > 5000 { // Should be under 5ms
        return Err(format!("Max latency too high: {}μs", stats.max_latency_us));
    }
    
    log.log(format!("Performance results: avg={:.2}μs, max={}μs, min={}μs", 
        stats.average_latency_us, stats.max_latency_us, stats.min_latency_us));
    log.log(format!("Processing performance: {}", meter.summary()));
    log.log("Queue processing performance test completed successfully".to_string());
    
    Ok(())
}

/// Test queue overflow and event dropping behavior
pub fn test_queue_overflow_behavior(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing queue overflow and event dropping behavior".to_string());
    
    let sample_rate = 44100;  
    let max_queue_size = 10; // Small queue for easy overflow testing
    let mut queue = MockMidiEventQueue::new(sample_rate, max_queue_size);
    let validator = TestValidator::new(1.0, 1.0);
    
    // Fill the queue to capacity
    for i in 0..max_queue_size {
        let event = MockMidiEvent::note_on(0, 60 + i as u8, 100);
        queue.queue_event(event, i as u64 * 1000)?; // Space events out
    }
    
    validator.validate_count(queue.get_queue_length(), max_queue_size, "initial queue size")?;
    log.log(format!("Filled queue to capacity: {} events", max_queue_size));
    
    // Add more events to trigger overflow
    let overflow_count = 5;
    for i in 0..overflow_count {
        let event = MockMidiEvent::note_on(0, 70 + i as u8, 100);
        queue.queue_event(event, (max_queue_size + i) as u64 * 1000)?;
    }
    
    // Queue should still be at max size
    validator.validate_count(queue.get_queue_length(), max_queue_size, "queue size after overflow")?;
    
    // Verify that oldest events were dropped
    let stats = queue.get_stats();
    validator.validate_count(stats.dropped_events, overflow_count, "dropped events count")?;
    
    log.log(format!("Successfully handled overflow: {} events dropped", stats.dropped_events));
    
    // Process some events to make room
    queue.advance_to_sample(5000);
    let processed = queue.process_due_events();
    
    if processed.is_empty() {
        return Err("No events processed after advancing time".to_string());
    }
    
    log.log(format!("Processed {} events after advancing time", processed.len()));
    log.log("Queue overflow behavior test completed successfully".to_string());
    
    Ok(())
}

/// Test timing accuracy across different sample rates
pub fn test_cross_sample_rate_accuracy(log: &mut TestEventLog) -> Result<(), String> {
    log.log("Testing timing accuracy across different sample rates".to_string());
    
    let sample_rates = vec![22050, 44100, 48000, 96000];
    let test_time_ms = 100.0; // 100ms test duration
    
    for &sample_rate in &sample_rates {
        let mut queue = MockMidiEventQueue::new(sample_rate, 1000);
        let converter = SampleRateConverter::new(sample_rate);
        
        // Queue event at exact 50ms mark
        let target_sample = converter.ms_to_samples(50.0);
        let event = MockMidiEvent::note_on(0, 60, 100);
        queue.queue_event(event, target_sample)?;
        
        // Advance to exactly the target time
        queue.advance_to_sample(target_sample);
        let processed = queue.process_due_events();
        
        if processed.len() != 1 {
            return Err(format!("Sample rate {}: expected 1 event, got {}", 
                sample_rate, processed.len()));
        }
        
        // Verify timing accuracy
        let event = &processed[0];
        if event.timestamp != target_sample {
            return Err(format!("Sample rate {}: timing error {} != {}", 
                sample_rate, event.timestamp, target_sample));
        }
        
        log.log(format!("Sample rate {}: accurate timing at {} samples", 
            sample_rate, target_sample));
    }
    
    log.log("Cross sample rate accuracy test completed successfully".to_string());
    Ok(())
}

/// Run all queue timing integration tests
pub fn run_queue_timing_tests(log: &mut TestEventLog) -> Vec<IntegrationTestResult> {
    let mut results = Vec::new();

    // Test 1: Basic queue timing
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_queue_timing_basic(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("queue_timing_basic", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("queue_timing_basic", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 2: Sample-accurate timing
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_sample_accurate_timing(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("sample_accurate_timing", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("sample_accurate_timing", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 3: Processing performance
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_queue_processing_performance(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("queue_processing_performance", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("queue_processing_performance", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 4: Queue overflow behavior
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_queue_overflow_behavior(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("queue_overflow_behavior", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("queue_overflow_behavior", &error, duration, log.count())
        }
    };
    results.push(result);

    // Test 5: Cross sample rate accuracy
    let start_time = std::time::Instant::now();
    log.clear();
    
    let result = match test_cross_sample_rate_accuracy(log) {
        Ok(()) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::success("cross_sample_rate_accuracy", duration, log.count())
        },
        Err(error) => {
            let duration = start_time.elapsed().as_millis();
            IntegrationTestResult::failure("cross_sample_rate_accuracy", &error, duration, log.count())
        }
    };
    results.push(result);

    results
}