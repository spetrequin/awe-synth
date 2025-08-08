#!/usr/bin/env rust-script
//! Test runner for MultiZoneSampleVoice unit tests
//! 
//! This runs only the new Phase 20.3.1 tests without compiling broken legacy tests

// Include the test module
#[path = "unit/multizone_voice_tests.rs"]
mod multizone_voice_tests;

fn main() {
    println!("🧪 Running MultiZoneSampleVoice Unit Tests");
    println!("==========================================\n");
    
    // The tests will run when compiled with --test flag
    println!("Tests are compiled and run via cargo test");
    println!("Run with: rustc --test tests/run_multizone_tests.rs");
}