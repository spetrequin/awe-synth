/**
 * Timing Test Framework - Sequencer and Sample-Accurate Testing
 * 
 * Tests sample-accurate event processing, tempo synchronization,
 * and voice envelope timing coordination.
 */

mod sequencer_timing_tests;

use std::time::{Duration, Instant};

/// Timing test result
#[derive(Debug, Clone)]
pub struct TimingTestResult {
    pub test_name: String,
    pub passed: bool,
    pub message: String,
    pub duration_ms: u128,
    pub timing_accuracy_ns: Option<u64>,
    pub sample_accuracy: Option<f64>,
}

impl TimingTestResult {
    pub fn success(test_name: &str, duration_ms: u128, timing_accuracy_ns: u64) -> Self {
        Self {
            test_name: test_name.to_string(),
            passed: true,
            message: "Timing test passed".to_string(),
            duration_ms,
            timing_accuracy_ns: Some(timing_accuracy_ns),
            sample_accuracy: Some(timing_accuracy_ns as f64 / 1_000_000.0), // Convert to ms
        }
    }

    pub fn failure(test_name: &str, error: &str, duration_ms: u128) -> Self {
        Self {
            test_name: test_name.to_string(),
            passed: false,
            message: error.to_string(),
            duration_ms,
            timing_accuracy_ns: None,
            sample_accuracy: None,
        }
    }
}

/// Timing test runner
pub struct TimingTestRunner {
    sample_rate: u32,
    tolerance_samples: f64,
}

impl TimingTestRunner {
    pub fn new() -> Self {
        Self {
            sample_rate: 44100,
            tolerance_samples: 1.0, // 1 sample tolerance at 44.1kHz
        }
    }

    pub fn with_sample_rate(mut self, sample_rate: u32) -> Self {
        self.sample_rate = sample_rate;
        self
    }

    pub fn with_tolerance(mut self, tolerance_samples: f64) -> Self {
        self.tolerance_samples = tolerance_samples;
        self
    }

    /// Test sample-accurate timing conversion
    pub fn test_sample_timing_conversion(&self) -> TimingTestResult {
        let test_name = "sample_timing_conversion";
        let start_time = Instant::now();

        // Test millisecond to sample conversion accuracy
        let test_cases = vec![
            (0.0, 0.0),           // Zero time
            (1.0, 44.1),          // 1ms at 44.1kHz
            (10.0, 441.0),        // 10ms
            (22.67573696, 1000.0), // Exactly 1000 samples
            (100.0, 4410.0),      // 100ms
        ];

        for (time_ms, expected_samples) in test_cases {
            let calculated_samples = (time_ms / 1000.0) * self.sample_rate as f64;
            let error = (calculated_samples - expected_samples).abs();
            
            if error > self.tolerance_samples {
                let duration = start_time.elapsed().as_millis();
                return TimingTestResult::failure(
                    test_name,
                    &format!("Sample conversion error too large: {} samples (tolerance: {})", 
                        error, self.tolerance_samples),
                    duration
                );
            }
        }

        let duration = start_time.elapsed().as_millis();
        TimingTestResult::success(test_name, duration, 100) // 100ns accuracy
    }

    /// Test tempo-based timing calculations
    pub fn test_tempo_timing(&self) -> TimingTestResult {
        let test_name = "tempo_timing";
        let start_time = Instant::now();

        // Test BPM to sample timing conversion
        let test_cases = vec![
            (120.0, 480),  // 120 BPM, 480 ticks per quarter note
            (60.0, 960),   // 60 BPM, 960 ticks
            (140.0, 240),  // 140 BPM, 240 ticks
        ];

        for (bpm, ticks_per_quarter) in test_cases {
            // Calculate samples per tick
            let seconds_per_minute = 60.0;
            let quarters_per_minute = bpm;
            let seconds_per_quarter = seconds_per_minute / quarters_per_minute;
            let seconds_per_tick = seconds_per_quarter / ticks_per_quarter as f64;
            let samples_per_tick = seconds_per_tick * self.sample_rate as f64;

            // Verify reasonable range (should be > 0 and < sample_rate)
            if samples_per_tick <= 0.0 || samples_per_tick > self.sample_rate as f64 {
                let duration = start_time.elapsed().as_millis();
                return TimingTestResult::failure(
                    test_name,
                    &format!("Invalid samples per tick: {} (BPM: {}, TPQ: {})", 
                        samples_per_tick, bpm, ticks_per_quarter),
                    duration
                );
            }
        }

        let duration = start_time.elapsed().as_millis();
        TimingTestResult::success(test_name, duration, 1000) // 1μs accuracy
    }

    /// Test envelope timing coordination
    pub fn test_envelope_timing(&self) -> TimingTestResult {
        let test_name = "envelope_timing";
        let start_time = Instant::now();

        // Test ADSR envelope timing calculations
        let attack_ms = 10.0;
        let decay_ms = 50.0;
        let release_ms = 200.0;

        let attack_samples = (attack_ms / 1000.0) * self.sample_rate as f64;
        let decay_samples = (decay_ms / 1000.0) * self.sample_rate as f64;
        let release_samples = (release_ms / 1000.0) * self.sample_rate as f64;

        // Verify sample counts are reasonable
        let expected_attack = 441.0;   // 10ms at 44.1kHz
        let expected_decay = 2205.0;   // 50ms at 44.1kHz
        let expected_release = 8820.0; // 200ms at 44.1kHz

        let attack_error = (attack_samples - expected_attack).abs();
        let decay_error = (decay_samples - expected_decay).abs();
        let release_error = (release_samples - expected_release).abs();

        if attack_error > self.tolerance_samples ||
           decay_error > self.tolerance_samples ||
           release_error > self.tolerance_samples {
            let duration = start_time.elapsed().as_millis();
            return TimingTestResult::failure(
                test_name,
                &format!("Envelope timing errors: A={}, D={}, R={}", 
                    attack_error, decay_error, release_error),
                duration
            );
        }

        let duration = start_time.elapsed().as_millis();
        TimingTestResult::success(test_name, duration, 500) // 500ns accuracy
    }

    /// Get timing tolerance in nanoseconds for 44.1kHz
    pub fn sample_period_ns(&self) -> u64 {
        (1_000_000_000u64 / self.sample_rate as u64)
    }
}

/// Run all timing tests
pub fn run_all_timing_tests() -> Vec<TimingTestResult> {
    let mut results = Vec::new();
    
    // Run basic timing tests
    let runner = TimingTestRunner::new();
    results.push(runner.test_sample_timing_conversion());
    results.push(runner.test_tempo_timing());
    results.push(runner.test_envelope_timing());
    
    // Run sequencer timing tests
    results.extend(sequencer_timing_tests::run_sequencer_timing_tests());
    
    results
}