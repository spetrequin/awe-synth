/**
 * Integration Test Runner Binary
 * 
 * Standalone test runner for executing all integration tests
 * and generating comprehensive reports.
 */

use awe_synth_tests::{TestSuite, TestConfig};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("AWE Synth Integration Test Runner");
    println!("=================================");
    
    // Create test configuration
    let config = TestConfig {
        sample_rate: 44100,
        max_voices: 32,
        debug_logging: true,
        test_timeout_ms: 10000, // 10 second timeout
    };
    
    println!("Test Configuration:");
    println!("  Sample Rate: {}Hz", config.sample_rate);
    println!("  Max Voices: {}", config.max_voices);
    println!("  Debug Logging: {}", config.debug_logging);
    println!("  Timeout: {}ms", config.test_timeout_ms);
    println!();
    
    // Create and run test suite
    let mut test_suite = TestSuite::new(config);
    
    println!("Running all integration tests...");
    let start_time = std::time::Instant::now();
    
    let results = test_suite.run_all_tests();
    let total_duration = start_time.elapsed();
    
    // Print results summary
    println!("\nTest Results Summary:");
    println!("====================");
    println!("Total Tests: {}", results.total_tests());
    println!("Passed: {}", results.passed_tests());
    println!("Failed: {}", results.failed_tests());
    println!("Success Rate: {:.1}%", results.success_rate() * 100.0);
    println!("Total Duration: {:.2}s", total_duration.as_secs_f64());
    println!();
    
    // Print detailed results
    if !results.integration_results.is_empty() {
        println!("Integration Test Results:");
        println!("------------------------");
        for result in &results.integration_results {
            let status = if result.passed { "PASS" } else { "FAIL" };
            println!("  {} {}: {} ({}ms, {} events)", 
                status, result.test_name, result.message, 
                result.duration_ms, result.event_count);
        }
        println!();
    }
    
    if !results.timing_results.is_empty() {
        println!("Timing Test Results:");
        println!("-------------------");
        for result in &results.timing_results {
            let status = if result.passed { "PASS" } else { "FAIL" };
            let accuracy = result.timing_accuracy_ns
                .map(|ns| format!("{}ns accuracy", ns))
                .unwrap_or_else(|| "N/A".to_string());
            println!("  {} {}: {} ({}ms, {})", 
                status, result.test_name, result.message, 
                result.duration_ms, accuracy);
        }
        println!();
    }
    
    if !results.stress_results.is_empty() {
        println!("Stress Test Results:");
        println!("-------------------");
        for result in &results.stress_results {
            let status = if result.passed { "PASS" } else { "FAIL" };
            let voices = result.max_voices_used
                .map(|v| format!("{} voices", v))
                .unwrap_or_else(|| "N/A".to_string());
            let events = result.events_processed
                .map(|e| format!("{} events", e))
                .unwrap_or_else(|| "N/A".to_string());
            println!("  {} {}: {} ({}ms, {}, {})", 
                status, result.test_name, result.message, 
                result.duration_ms, voices, events);
        }
        println!();
    }
    
    // Exit with appropriate code
    if results.failed_tests() > 0 {
        println!("❌ Some tests failed!");
        std::process::exit(1);
    } else {
        println!("✅ All tests passed!");
        std::process::exit(0);
    }
}