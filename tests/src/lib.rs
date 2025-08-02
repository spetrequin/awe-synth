/**
 * AWE Synth Integration Test Library
 * 
 * Complete integration test framework following zero penetration policy.
 * Tests all integration points between MIDI router, WASM bridge, and VoiceManager.
 */

pub mod integration;
pub mod timing;
pub mod stress;
pub mod mocks;
pub mod utils;
pub mod envelope;
pub mod audio;
pub mod soundfont;

// Re-export main test modules
pub use integration::IntegrationTestRunner;
pub use timing::TimingTestRunner;
pub use stress::StressTestRunner;

/// Test configuration
#[derive(Debug, Clone)]
pub struct TestConfig {
    pub sample_rate: u32,
    pub max_voices: usize,
    pub debug_logging: bool,
    pub test_timeout_ms: u64,
}

impl Default for TestConfig {
    fn default() -> Self {
        Self {
            sample_rate: 44100,
            max_voices: 32,
            debug_logging: true,
            test_timeout_ms: 5000,
        }
    }
}

/// Main test suite runner
pub struct TestSuite {
    config: TestConfig,
    integration_runner: IntegrationTestRunner,
    timing_runner: TimingTestRunner,
    stress_runner: StressTestRunner,
}

impl TestSuite {
    pub fn new(config: TestConfig) -> Self {
        Self {
            config,
            integration_runner: IntegrationTestRunner::new(),
            timing_runner: TimingTestRunner::new(),
            stress_runner: StressTestRunner::new(),
        }
    }

    pub fn run_all_tests(&mut self) -> TestSuiteResults {
        let mut results = TestSuiteResults::new();
        
        // Run integration tests
        results.integration_results = self.run_integration_tests();
        
        // Run timing tests
        results.timing_results = self.run_timing_tests();
        
        // Run stress tests
        results.stress_results = self.run_stress_tests();
        
        results
    }

    fn run_integration_tests(&mut self) -> Vec<integration::IntegrationTestResult> {
        use integration::{midi_router_tests, voice_manager_tests, queue_timing_tests};
        
        let mut results = Vec::new();
        let mut log = integration::TestEventLog::new(1000);
        
        // Run MIDI router tests
        results.extend(midi_router_tests::run_midi_router_tests(&mut log));
        
        // Run VoiceManager tests
        results.extend(voice_manager_tests::run_voice_manager_tests(&mut log));
        
        // Run queue timing tests
        results.extend(queue_timing_tests::run_queue_timing_tests(&mut log));
        
        results
    }

    fn run_timing_tests(&mut self) -> Vec<timing::TimingTestResult> {
        timing::run_all_timing_tests()
    }

    fn run_stress_tests(&mut self) -> Vec<stress::StressTestResult> {
        // Will be implemented in subsequent tasks
        vec![]
    }
}

/// Complete test suite results
#[derive(Debug)]
pub struct TestSuiteResults {
    pub integration_results: Vec<integration::IntegrationTestResult>,
    pub timing_results: Vec<timing::TimingTestResult>,
    pub stress_results: Vec<stress::StressTestResult>,
}

impl TestSuiteResults {
    fn new() -> Self {
        Self {
            integration_results: Vec::new(),
            timing_results: Vec::new(),
            stress_results: Vec::new(),
        }
    }

    pub fn total_tests(&self) -> usize {
        self.integration_results.len() + 
        self.timing_results.len() + 
        self.stress_results.len()
    }

    pub fn passed_tests(&self) -> usize {
        self.integration_results.iter().filter(|r| r.passed).count() +
        self.timing_results.iter().filter(|r| r.passed).count() +
        self.stress_results.iter().filter(|r| r.passed).count()
    }

    pub fn failed_tests(&self) -> usize {
        self.total_tests() - self.passed_tests()
    }

    pub fn success_rate(&self) -> f64 {
        if self.total_tests() == 0 {
            0.0
        } else {
            self.passed_tests() as f64 / self.total_tests() as f64
        }
    }
}