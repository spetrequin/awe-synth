/**
 * Timing Test Runner Binary
 * 
 * Executes all sequencer timing tests and reports results.
 */

use awe_synth_tests::timing;

fn main() {
    println!("=== AWE Synth Timing Tests ===\n");
    
    let results = timing::run_all_timing_tests();
    
    let mut passed = 0;
    let mut failed = 0;
    
    for result in &results {
        if result.passed {
            passed += 1;
            println!("✓ {} - PASSED ({}ms)", result.test_name, result.duration_ms);
            if let Some(accuracy_ns) = result.timing_accuracy_ns {
                println!("  Timing accuracy: {}ns", accuracy_ns);
            }
            if let Some(sample_accuracy) = result.sample_accuracy {
                println!("  Sample accuracy: {:.3}ms", sample_accuracy);
            }
        } else {
            failed += 1;
            println!("✗ {} - FAILED ({}ms)", result.test_name, result.duration_ms);
            println!("  Error: {}", result.message);
        }
        println!();
    }
    
    println!("=== Summary ===");
    println!("Total tests: {}", results.len());
    println!("Passed: {}", passed);
    println!("Failed: {}", failed);
    println!("Success rate: {:.1}%", (passed as f64 / results.len() as f64) * 100.0);
    
    if failed > 0 {
        std::process::exit(1);
    }
}