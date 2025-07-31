/**
 * Test Utilities and Helpers
 * 
 * Common utilities for test execution, timing, and validation.
 */

use std::time::{Duration, Instant};

/// Test timeout wrapper
pub struct TestTimeout {
    start_time: Instant,
    timeout_duration: Duration,
}

impl TestTimeout {
    pub fn new(timeout_ms: u64) -> Self {
        Self {
            start_time: Instant::now(),
            timeout_duration: Duration::from_millis(timeout_ms),
        }
    }

    pub fn is_expired(&self) -> bool {
        self.start_time.elapsed() > self.timeout_duration
    }

    pub fn remaining_ms(&self) -> u64 {
        let elapsed = self.start_time.elapsed();
        if elapsed >= self.timeout_duration {
            0
        } else {
            (self.timeout_duration - elapsed).as_millis() as u64
        }
    }

    pub fn elapsed_ms(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }
}

/// Sample rate conversion utilities
pub struct SampleRateConverter {
    sample_rate: u32,
}

impl SampleRateConverter {
    pub fn new(sample_rate: u32) -> Self {
        Self { sample_rate }
    }

    pub fn ms_to_samples(&self, milliseconds: f64) -> u64 {
        ((milliseconds / 1000.0) * self.sample_rate as f64).round() as u64
    }

    pub fn samples_to_ms(&self, samples: u64) -> f64 {
        (samples as f64 / self.sample_rate as f64) * 1000.0
    }

    pub fn samples_per_ms(&self) -> f64 {
        self.sample_rate as f64 / 1000.0
    }

    pub fn sample_period_ns(&self) -> u64 {
        1_000_000_000 / self.sample_rate as u64
    }
}

/// Test result validation
pub struct TestValidator {
    tolerance_samples: f64,
    tolerance_percent: f64,
}

impl TestValidator {
    pub fn new(tolerance_samples: f64, tolerance_percent: f64) -> Self {
        Self {
            tolerance_samples,
            tolerance_percent,
        }
    }

    pub fn validate_timing(&self, expected: u64, actual: u64) -> Result<(), String> {
        let diff = if expected > actual { 
            expected - actual 
        } else { 
            actual - expected 
        };
        
        if diff as f64 > self.tolerance_samples {
            let percent_error = (diff as f64 / expected as f64) * 100.0;
            if percent_error > self.tolerance_percent {
                return Err(format!(
                    "Timing error too large: {} samples ({:.2}% error)", 
                    diff, percent_error
                ));
            }
        }
        
        Ok(())
    }

    pub fn validate_range<T>(&self, value: T, min: T, max: T, name: &str) -> Result<(), String>
    where
        T: PartialOrd + std::fmt::Debug,
    {
        if value < min || value > max {
            Err(format!("{} out of range: {:?} not in [{:?}, {:?}]", name, value, min, max))
        } else {
            Ok(())
        }
    }

    pub fn validate_count(&self, actual: usize, expected: usize, name: &str) -> Result<(), String> {
        if actual != expected {
            Err(format!("{} count mismatch: {} != {}", name, actual, expected))
        } else {
            Ok(())
        }
    }
}

/// Performance measurement utilities
pub struct PerformanceMeter {
    measurements: Vec<Duration>,
    name: String,
}

impl PerformanceMeter {
    pub fn new(name: &str) -> Self {
        Self {
            measurements: Vec::new(),
            name: name.to_string(),
        }
    }

    pub fn measure<F, R>(&mut self, operation: F) -> R
    where
        F: FnOnce() -> R,
    {
        let start = Instant::now();
        let result = operation();
        let duration = start.elapsed();
        self.measurements.push(duration);
        result
    }

    pub fn average_duration(&self) -> Duration {
        if self.measurements.is_empty() {
            Duration::from_nanos(0)
        } else {
            let total_nanos: u64 = self.measurements
                .iter()
                .map(|d| d.as_nanos() as u64)
                .sum();
            Duration::from_nanos(total_nanos / self.measurements.len() as u64)
        }
    }

    pub fn min_duration(&self) -> Duration {
        self.measurements.iter().min().copied().unwrap_or(Duration::from_nanos(0))
    }

    pub fn max_duration(&self) -> Duration {
        self.measurements.iter().max().copied().unwrap_or(Duration::from_nanos(0))
    }

    pub fn measurement_count(&self) -> usize {
        self.measurements.len()
    }

    pub fn summary(&self) -> String {
        if self.measurements.is_empty() {
            format!("{}: No measurements", self.name)
        } else {
            format!(
                "{}: {} measurements, avg={:.2}ms, min={:.2}ms, max={:.2}ms",
                self.name,
                self.measurement_count(),
                self.average_duration().as_secs_f64() * 1000.0,
                self.min_duration().as_secs_f64() * 1000.0,
                self.max_duration().as_secs_f64() * 1000.0
            )
        }
    }
}

/// Test assertion macros
#[macro_export]
macro_rules! assert_timing {
    ($expected:expr, $actual:expr, $tolerance:expr) => {
        let diff = if $expected > $actual { $expected - $actual } else { $actual - $expected };
        if diff > $tolerance {
            panic!("Timing assertion failed: expected {}, got {}, diff {} > tolerance {}", 
                   $expected, $actual, diff, $tolerance);
        }
    };
}

#[macro_export]
macro_rules! assert_range {
    ($value:expr, $min:expr, $max:expr) => {
        if $value < $min || $value > $max {
            panic!("Range assertion failed: {} not in range [{}, {}]", $value, $min, $max);
        }
    };
}

/// Memory usage tracking (simplified)
pub struct MemoryTracker {
    allocations: usize,
    peak_usage: usize,
    current_usage: usize,
}

impl MemoryTracker {
    pub fn new() -> Self {
        Self {
            allocations: 0,
            peak_usage: 0,
            current_usage: 0,
        }
    }

    pub fn allocate(&mut self, size: usize) {
        self.allocations += 1;
        self.current_usage += size;
        if self.current_usage > self.peak_usage {
            self.peak_usage = self.current_usage;
        }
    }

    pub fn deallocate(&mut self, size: usize) {
        if self.current_usage >= size {
            self.current_usage -= size;
        }
    }

    pub fn peak_usage_kb(&self) -> usize {
        self.peak_usage / 1024
    }

    pub fn current_usage_kb(&self) -> usize {
        self.current_usage / 1024
    }

    pub fn allocation_count(&self) -> usize {
        self.allocations
    }

    pub fn reset(&mut self) {
        self.allocations = 0;
        self.peak_usage = 0;
        self.current_usage = 0;
    }
}