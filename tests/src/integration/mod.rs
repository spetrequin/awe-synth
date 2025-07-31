/**
 * Integration Test Framework - Core Module
 * 
 * Provides infrastructure for testing component integration points
 * across the MIDI↔Synth pipeline with zero penetration policy.
 */

pub mod midi_router_tests;
pub mod voice_manager_tests;
pub mod queue_timing_tests;
// pub mod wasm_bridge_tests;
// pub mod end_to_end_tests;

use std::collections::VecDeque;

/// Test event log for capturing integration behavior
pub struct TestEventLog {
    events: VecDeque<String>,
    max_entries: usize,
}

impl TestEventLog {
    pub fn new(max_entries: usize) -> Self {
        Self {
            events: VecDeque::with_capacity(max_entries),
            max_entries,
        }
    }

    pub fn log(&mut self, message: String) {
        if self.events.len() >= self.max_entries {
            self.events.pop_front();
        }
        self.events.push_back(format!("[{}] {}", 
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis(),
            message
        ));
    }

    pub fn get_log(&self) -> String {
        self.events.iter().cloned().collect::<Vec<_>>().join("\n")
    }

    pub fn clear(&mut self) {
        self.events.clear();
    }

    pub fn count(&self) -> usize {
        self.events.len()
    }
}

/// Integration test result
#[derive(Debug, Clone)]
pub struct IntegrationTestResult {
    pub test_name: String,
    pub passed: bool,
    pub message: String,
    pub duration_ms: u128,
    pub event_count: usize,
}

impl IntegrationTestResult {
    pub fn success(test_name: &str, duration_ms: u128, event_count: usize) -> Self {
        Self {
            test_name: test_name.to_string(),
            passed: true,
            message: "Test passed".to_string(),
            duration_ms,
            event_count,
        }
    }

    pub fn failure(test_name: &str, error: &str, duration_ms: u128, event_count: usize) -> Self {
        Self {
            test_name: test_name.to_string(),
            passed: false,
            message: error.to_string(),
            duration_ms,
            event_count,
        }
    }
}

/// Test runner for integration tests
pub struct IntegrationTestRunner {
    log: TestEventLog,
    results: Vec<IntegrationTestResult>,
}

impl IntegrationTestRunner {
    pub fn new() -> Self {
        Self {
            log: TestEventLog::new(1000),
            results: Vec::new(),
        }
    }

    pub fn run_test<F>(&mut self, test_name: &str, test_fn: F) -> IntegrationTestResult
    where
        F: FnOnce(&mut TestEventLog) -> Result<(), String>,
    {
        let start_time = std::time::Instant::now();
        self.log.clear();
        
        self.log.log(format!("Starting integration test: {}", test_name));
        
        let result = match test_fn(&mut self.log) {
            Ok(()) => {
                let duration = start_time.elapsed().as_millis();
                let event_count = self.log.count();
                self.log.log(format!("Test {} PASSED in {}ms with {} events", 
                    test_name, duration, event_count));
                IntegrationTestResult::success(test_name, duration, event_count)
            },
            Err(error) => {
                let duration = start_time.elapsed().as_millis();
                let event_count = self.log.count();
                self.log.log(format!("Test {} FAILED in {}ms: {}", 
                    test_name, duration, error));
                IntegrationTestResult::failure(test_name, &error, duration, event_count)
            }
        };

        self.results.push(result.clone());
        result
    }

    pub fn get_results(&self) -> &[IntegrationTestResult] {
        &self.results
    }

    pub fn get_log(&self) -> String {
        self.log.get_log()
    }

    pub fn clear_results(&mut self) {
        self.results.clear();
        self.log.clear();
    }

    pub fn summary(&self) -> String {
        let total = self.results.len();
        let passed = self.results.iter().filter(|r| r.passed).count();
        let failed = total - passed;
        
        format!("Integration Test Summary: {}/{} passed, {} failed", 
            passed, total, failed)
    }
}