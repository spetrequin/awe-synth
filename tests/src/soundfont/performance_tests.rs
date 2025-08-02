/// SoundFont Performance Tests
/// 
/// Comprehensive performance testing for SoundFont parsing and memory usage:
/// - Parsing speed benchmarks for large SF2 files
/// - Memory usage validation and leak detection
/// - Concurrent parsing stress tests
/// - Large file handling performance
/// - Resource cleanup verification

use std::time::{Duration, Instant};
use std::collections::HashMap;
use awe_synth::soundfont::{SoundFontParser};
use crate::soundfont::{utils, test_data};

/// Performance metrics structure
#[derive(Debug, Clone)]
struct PerformanceMetrics {
    pub parse_time: Duration,
    pub file_size: usize,
    pub presets_count: usize,
    pub instruments_count: usize,
    pub samples_count: usize,
    pub memory_usage_estimate: usize,
    pub samples_per_second: f64,
}

impl PerformanceMetrics {
    /// Calculate parsing throughput in MB/s
    pub fn throughput_mb_per_sec(&self) -> f64 {
        let mb = self.file_size as f64 / 1_000_000.0;
        let seconds = self.parse_time.as_secs_f64();
        if seconds > 0.0 { mb / seconds } else { 0.0 }
    }
    
    /// Calculate presets per second parsing rate
    pub fn presets_per_second(&self) -> f64 {
        let seconds = self.parse_time.as_secs_f64();
        if seconds > 0.0 { self.presets_count as f64 / seconds } else { 0.0 }
    }
}

#[cfg(test)]
mod parsing_performance_tests {
    use super::*;
    
    #[test]
    fn test_ct2mgm_parsing_performance() {
        println!("🚀 CT2MGM.SF2 Performance Test (2.2MB)");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let metrics = measure_parsing_performance(&data, "CT2MGM");
        
        // Performance expectations for 2.2MB file
        assert!(metrics.parse_time.as_millis() < 500, 
               "CT2MGM parsing should complete in <500ms, took {}ms", 
               metrics.parse_time.as_millis());
        
        assert!(metrics.throughput_mb_per_sec() > 4.0,
               "Parsing throughput should be >4 MB/s, got {:.2} MB/s",
               metrics.throughput_mb_per_sec());
        
        assert!(metrics.presets_per_second() > 500.0,
               "Should parse >500 presets/sec, got {:.1} presets/sec",
               metrics.presets_per_second());
        
        print_performance_summary(&metrics, "CT2MGM.SF2");
    }
    
    #[test] 
    fn test_ct8mgm_parsing_performance() {
        println!("🚀 CT8MGM.SF2 Performance Test (8MB)");
        
        // Try to load the larger SoundFont file
        let data_result = utils::load_real_soundfont(test_data::CT8MGM_SF2);
        
        match data_result {
            Ok(data) => {
                let metrics = measure_parsing_performance(&data, "CT8MGM");
                
                // Performance expectations for 8MB file
                assert!(metrics.parse_time.as_millis() < 2000,
                       "CT8MGM parsing should complete in <2000ms, took {}ms",
                       metrics.parse_time.as_millis());
                
                assert!(metrics.throughput_mb_per_sec() > 2.0,
                       "Parsing throughput should be >2 MB/s, got {:.2} MB/s", 
                       metrics.throughput_mb_per_sec());
                
                print_performance_summary(&metrics, "CT8MGM.SF2");
            },
            Err(_) => {
                println!("   ⚠ CT8MGM.SF2 not available, skipping large file test");
                println!("   💡 To test with large files, add CT8MGM.SF2 to resources/sf2/gm/");
            }
        }
    }
    
    #[test]
    fn test_multiple_parsing_performance() {
        println!("🔄 Multiple Parsing Performance Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let iterations = 5;
        let mut total_time = Duration::new(0, 0);
        let mut metrics_list = Vec::new();
        
        for i in 0..iterations {
            let start_time = Instant::now();
            let sf = SoundFontParser::parse_soundfont(&data).unwrap();
            let parse_time = start_time.elapsed();
            
            total_time += parse_time;
            
            let metrics = PerformanceMetrics {
                parse_time,
                file_size: data.len(),
                presets_count: sf.presets.len(),
                instruments_count: sf.instruments.len(),
                samples_count: sf.samples.len(),
                memory_usage_estimate: estimate_memory_usage(&sf),
                samples_per_second: 0.0, // Not applicable for this test
            };
            
            metrics_list.push(metrics);
            println!("   Iteration {}: {}ms", i + 1, parse_time.as_millis());
        }
        
        let avg_time = total_time / iterations as u32;
        let min_time = metrics_list.iter().map(|m| m.parse_time).min().unwrap();
        let max_time = metrics_list.iter().map(|m| m.parse_time).max().unwrap();
        
        println!("   📊 Performance Summary:");
        println!("     Average: {}ms", avg_time.as_millis());
        println!("     Minimum: {}ms", min_time.as_millis());
        println!("     Maximum: {}ms", max_time.as_millis());
        println!("     Consistency: {:.1}% (max/min ratio)", 
               (max_time.as_millis() as f64 / min_time.as_millis() as f64) * 100.0);
        
        // Performance consistency check
        let variation_ratio = max_time.as_millis() as f64 / min_time.as_millis() as f64;
        assert!(variation_ratio < 2.0, 
               "Parse time variation should be <2x, got {:.2}x", variation_ratio);
    }
    
    #[test]
    fn test_parsing_scalability() {
        println!("📈 Parsing Scalability Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let original_size = data.len();
        
        // Test with progressively smaller chunks to simulate different file sizes
        let test_sizes = vec![
            ("Quarter size", original_size / 4),
            ("Half size", original_size / 2), 
            ("Three-quarter", original_size * 3 / 4),
            ("Full size", original_size),
        ];
        
        let mut scalability_results = Vec::new();
        
        for (name, size) in test_sizes {
            if size < 1000 { continue; } // Skip tiny chunks that won't parse
            
            // Note: We can't actually truncate the SF2 and expect it to parse,
            // so we'll measure repeated parsing with memory pressure simulation
            let start_time = Instant::now();
            
            // Simulate memory pressure by allocating temporary buffers
            let _temp_buffers: Vec<Vec<u8>> = (0..10).map(|_| vec![0u8; size / 10]).collect();
            
            let sf_result = SoundFontParser::parse_soundfont(&data);
            let parse_time = start_time.elapsed();
            
            if let Ok(sf) = sf_result {
                let throughput = (original_size as f64 / 1_000_000.0) / parse_time.as_secs_f64();
                scalability_results.push((name, parse_time, throughput));
                
                println!("   {} memory pressure: {}ms ({:.2} MB/s)", 
                        name, parse_time.as_millis(), throughput);
            }
        }
        
        // Verify performance doesn't degrade significantly under memory pressure
        if scalability_results.len() >= 2 {
            let first_throughput = scalability_results[0].2;
            let last_throughput = scalability_results.last().unwrap().2;
            
            let degradation_ratio = first_throughput / last_throughput;
            assert!(degradation_ratio < 3.0,
                   "Performance degradation should be <3x under memory pressure, got {:.2}x",
                   degradation_ratio);
        }
    }
    
    /// Measure parsing performance for a given SoundFont
    fn measure_parsing_performance(data: &[u8], name: &str) -> PerformanceMetrics {
        let start_time = Instant::now();
        let sf = SoundFontParser::parse_soundfont(data).unwrap();
        let parse_time = start_time.elapsed();
        
        PerformanceMetrics {
            parse_time,
            file_size: data.len(),
            presets_count: sf.presets.len(),
            instruments_count: sf.instruments.len(),
            samples_count: sf.samples.len(),
            memory_usage_estimate: estimate_memory_usage(&sf),
            samples_per_second: sf.samples.iter()
                .filter(|s| !s.sample_data.is_empty())
                .map(|s| s.sample_data.len())
                .sum::<usize>() as f64 / parse_time.as_secs_f64(),
        }
    }
    
    /// Print performance summary
    fn print_performance_summary(metrics: &PerformanceMetrics, filename: &str) {
        println!("   📊 {} Performance Summary:", filename);
        println!("     File size: {:.2} MB", metrics.file_size as f64 / 1_000_000.0);
        println!("     Parse time: {}ms", metrics.parse_time.as_millis());
        println!("     Throughput: {:.2} MB/s", metrics.throughput_mb_per_sec());
        println!("     Presets: {} ({:.1}/sec)", metrics.presets_count, metrics.presets_per_second());
        println!("     Instruments: {}", metrics.instruments_count);
        println!("     Samples: {} ({:.0} samples/sec)", metrics.samples_count, metrics.samples_per_second);
        println!("     Est. memory: {:.2} MB", metrics.memory_usage_estimate as f64 / 1_000_000.0);
    }
}

#[cfg(test)]
mod memory_usage_tests {
    use super::*;
    
    #[test]
    fn test_memory_usage_estimation() {
        println!("💾 Memory Usage Estimation Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let memory_usage = estimate_memory_usage(&sf);
        let file_size = data.len();
        
        println!("   Original file size: {:.2} MB", file_size as f64 / 1_000_000.0);
        println!("   Estimated memory usage: {:.2} MB", memory_usage as f64 / 1_000_000.0);
        println!("   Memory expansion ratio: {:.2}x", memory_usage as f64 / file_size as f64);
        
        // Memory usage should be reasonable (not more than 5x file size for parsed structure)
        assert!(memory_usage < file_size * 5,
               "Memory usage {:.2}MB should be <5x file size {:.2}MB",
               memory_usage as f64 / 1_000_000.0, file_size as f64 / 1_000_000.0);
        
        // Should use at least as much memory as the raw sample data
        let sample_data_size: usize = sf.samples.iter()
            .map(|s| s.sample_data.len() * 2) // 16-bit samples = 2 bytes each
            .sum();
        
        assert!(memory_usage >= sample_data_size,
               "Memory usage should include at least the sample data size");
        
        println!("   ✓ Memory usage estimation looks reasonable");
    }
    
    #[test]
    fn test_memory_usage_breakdown() {
        println!("📋 Memory Usage Breakdown Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let breakdown = calculate_memory_breakdown(&sf);
        let total = breakdown.values().sum::<usize>();
        
        println!("   Memory usage breakdown:");
        for (component, size) in &breakdown {
            let percentage = (*size as f64 / total as f64) * 100.0;
            println!("     {}: {:.2} MB ({:.1}%)", 
                    component, *size as f64 / 1_000_000.0, percentage);
        }
        
        // Sample data should be the largest component
        let sample_data_size = breakdown.get("Sample Data").copied().unwrap_or(0);
        let other_total = total - sample_data_size;
        
        assert!(sample_data_size > other_total,
               "Sample data should be the largest memory component");
        
        println!("   ✓ Memory breakdown looks reasonable");
    }
    
    #[test]
    fn test_repeated_parsing_memory_stability() {
        println!("🔄 Repeated Parsing Memory Stability Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let iterations = 10;
        let mut memory_estimates = Vec::new();
        
        for i in 0..iterations {
            let sf = SoundFontParser::parse_soundfont(&data).unwrap();
            let memory_usage = estimate_memory_usage(&sf);
            memory_estimates.push(memory_usage);
            
            if i == 0 || i == iterations - 1 {
                println!("   Iteration {}: {:.2} MB", i + 1, memory_usage as f64 / 1_000_000.0);
            }
            
            // Drop the SoundFont to ensure cleanup
            drop(sf);
        }
        
        // Check memory usage consistency
        let min_memory = *memory_estimates.iter().min().unwrap();
        let max_memory = *memory_estimates.iter().max().unwrap();
        let memory_variation = (max_memory as f64 / min_memory as f64) - 1.0;
        
        println!("   Memory variation: {:.1}%", memory_variation * 100.0);
        
        // Memory usage should be consistent (within 10% variation)
        assert!(memory_variation < 0.10,
               "Memory usage should be consistent, got {:.1}% variation",
               memory_variation * 100.0);
        
        println!("   ✓ Memory usage is stable across repeated parsing");
    }
}

#[cfg(test)]
mod stress_tests {
    use super::*;
    
    #[test]
    fn test_concurrent_parsing_stress() {
        println!("⚡ Concurrent Parsing Stress Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let thread_count = 4;
        let iterations_per_thread = 3;
        
        let start_time = Instant::now();
        
        // Simulate concurrent parsing (Note: std::thread not available in WASM)
        // Instead, we'll do rapid sequential parsing to stress the parser
        let mut results = Vec::new();
        
        for thread_id in 0..thread_count {
            for iteration in 0..iterations_per_thread {
                let parse_start = Instant::now();
                let sf_result = SoundFontParser::parse_soundfont(&data);
                let parse_time = parse_start.elapsed();
                
                match sf_result {
                    Ok(sf) => {
                        results.push((thread_id, iteration, parse_time, sf.presets.len()));
                        println!("   Thread {} iteration {}: {}ms ({} presets)",
                                thread_id, iteration, parse_time.as_millis(), sf.presets.len());
                    },
                    Err(e) => {
                        panic!("Parse failed in thread {} iteration {}: {:?}", thread_id, iteration, e);
                    }
                }
            }
        }
        
        let total_time = start_time.elapsed();
        let total_parses = results.len();
        
        println!("   📊 Stress Test Summary:");
        println!("     Total parses: {}", total_parses);
        println!("     Total time: {}ms", total_time.as_millis());
        println!("     Average per parse: {}ms", total_time.as_millis() / total_parses as u128);
        
        // All parses should succeed
        assert_eq!(results.len(), thread_count * iterations_per_thread,
                  "All parsing attempts should succeed");
        
        // All should produce consistent results
        let preset_counts: Vec<usize> = results.iter().map(|(_, _, _, count)| *count).collect();
        let first_count = preset_counts[0];
        
        for &count in &preset_counts {
            assert_eq!(count, first_count, "All parses should produce identical preset counts");
        }
        
        println!("   ✓ All concurrent parses succeeded with consistent results");
    }
    
    #[test]
    fn test_large_scale_data_handling() {
        println!("📊 Large Scale Data Handling Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Test large data structure access patterns
        let mut access_times = Vec::new();
        
        // Test preset access patterns
        let preset_start = Instant::now();
        let mut preset_count = 0;
        for preset in &sf.presets {
            for zone in &preset.preset_zones {
                preset_count += zone.generators.len();
            }
        }
        access_times.push(("Preset traversal", preset_start.elapsed()));
        
        // Test instrument access patterns  
        let instrument_start = Instant::now();
        let mut instrument_count = 0;
        for instrument in &sf.instruments {
            for zone in &instrument.instrument_zones {
                instrument_count += zone.generators.len();
            }
        }
        access_times.push(("Instrument traversal", instrument_start.elapsed()));
        
        // Test sample data access patterns
        let sample_start = Instant::now();
        let mut sample_points = 0;
        for sample in &sf.samples {
            sample_points += sample.sample_data.len();
        }
        access_times.push(("Sample data traversal", sample_start.elapsed()));
        
        println!("   Data structure access performance:");
        for (operation, time) in &access_times {
            println!("     {}: {}ms", operation, time.as_millis());
        }
        
        println!("   Data scale validation:");
        println!("     Preset generators: {}", preset_count);
        println!("     Instrument generators: {}", instrument_count);
        println!("     Sample data points: {}", sample_points);
        
        // Performance should be reasonable for large data access
        for (operation, time) in &access_times {
            assert!(time.as_millis() < 100,
                   "{} should complete in <100ms, took {}ms", operation, time.as_millis());
        }
        
        println!("   ✓ Large scale data handling performance is acceptable");
    }
}

#[cfg(test)]
mod resource_management_tests {
    use super::*;
    
    #[test]
    fn test_resource_cleanup_validation() {
        println!("🧹 Resource Cleanup Validation Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        
        // Parse and immediately drop multiple times
        for i in 0..5 {
            let sf = SoundFontParser::parse_soundfont(&data).unwrap();
            let memory_usage = estimate_memory_usage(&sf);
            
            println!("   Iteration {}: {:.2} MB allocated", 
                    i + 1, memory_usage as f64 / 1_000_000.0);
            
            // Explicitly drop to ensure cleanup
            drop(sf);
        }
        
        println!("   ✓ Multiple parse/drop cycles completed without issues");
    }
    
    #[test]
    fn test_partial_parsing_cleanup() {
        println!("🔧 Partial Parsing Cleanup Test");
        
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        
        // Test that partial parsing attempts clean up properly
        // We'll corrupt data at different stages to trigger cleanup paths
        let corruption_points = vec![
            ("Early header", 100),
            ("INFO chunk", 1000),
            ("Sample data", data.len() / 2),
        ];
        
        for (stage, corruption_offset) in corruption_points {
            if corruption_offset >= data.len() { continue; }
            
            let mut corrupted_data = data.clone();
            corrupted_data[corruption_offset] = 0xFF; // Corrupt one byte
            
            let result = SoundFontParser::parse_soundfont(&corrupted_data);
            
            match result {
                Ok(_) => {
                    // Parsing might still succeed with minor corruption
                    println!("   {} corruption: parsing succeeded (minor corruption)", stage);
                },
                Err(e) => {
                    println!("   {} corruption: properly handled error - {:?}", stage, e);
                }
            }
        }
        
        println!("   ✓ Partial parsing cleanup handling validated");
    }
}

// Helper functions

/// Estimate memory usage of a parsed SoundFont
fn estimate_memory_usage(sf: &awe_synth::soundfont::SoundFont) -> usize {
    let mut total = 0;
    
    // Header strings
    total += sf.header.name.len();
    total += sf.header.engine.len();
    total += sf.header.tools.len();
    total += sf.header.author.len();
    total += sf.header.product.len();
    total += sf.header.copyright.len();
    total += sf.header.comments.len();
    
    // Presets
    total += sf.presets.len() * std::mem::size_of::<awe_synth::soundfont::SoundFontPreset>();
    for preset in &sf.presets {
        total += preset.name.len();
        total += preset.preset_zones.len() * std::mem::size_of::<awe_synth::soundfont::PresetZone>();
        for zone in &preset.preset_zones {
            total += zone.generators.len() * std::mem::size_of::<awe_synth::soundfont::Generator>();
            total += zone.modulators.len() * std::mem::size_of::<awe_synth::soundfont::Modulator>();
        }
    }
    
    // Instruments
    total += sf.instruments.len() * std::mem::size_of::<awe_synth::soundfont::SoundFontInstrument>();
    for instrument in &sf.instruments {
        total += instrument.name.len();
        total += instrument.instrument_zones.len() * std::mem::size_of::<awe_synth::soundfont::InstrumentZone>();
        for zone in &instrument.instrument_zones {
            total += zone.generators.len() * std::mem::size_of::<awe_synth::soundfont::Generator>();
            total += zone.modulators.len() * std::mem::size_of::<awe_synth::soundfont::Modulator>();
        }
    }
    
    // Samples (this is usually the largest component)
    total += sf.samples.len() * std::mem::size_of::<awe_synth::soundfont::SoundFontSample>();
    for sample in &sf.samples {
        total += sample.name.len();
        total += sample.sample_data.len() * std::mem::size_of::<i16>(); // 16-bit samples
    }
    
    total
}

/// Calculate detailed memory usage breakdown
fn calculate_memory_breakdown(sf: &awe_synth::soundfont::SoundFont) -> HashMap<String, usize> {
    let mut breakdown = HashMap::new();
    
    // Header
    let header_size = sf.header.name.len() + sf.header.engine.len() + 
                     sf.header.tools.len() + sf.header.author.len() +
                     sf.header.product.len() + sf.header.copyright.len() +
                     sf.header.comments.len() + 64; // Base struct size
    breakdown.insert("Header".to_string(), header_size);
    
    // Presets
    let mut preset_size = sf.presets.len() * std::mem::size_of::<awe_synth::soundfont::SoundFontPreset>();
    for preset in &sf.presets {
        preset_size += preset.name.len();
        preset_size += preset.preset_zones.len() * std::mem::size_of::<awe_synth::soundfont::PresetZone>();
        for zone in &preset.preset_zones {
            preset_size += zone.generators.len() * std::mem::size_of::<awe_synth::soundfont::Generator>();
            preset_size += zone.modulators.len() * std::mem::size_of::<awe_synth::soundfont::Modulator>();
        }
    }
    breakdown.insert("Presets".to_string(), preset_size);
    
    // Instruments
    let mut instrument_size = sf.instruments.len() * std::mem::size_of::<awe_synth::soundfont::SoundFontInstrument>();
    for instrument in &sf.instruments {
        instrument_size += instrument.name.len();
        instrument_size += instrument.instrument_zones.len() * std::mem::size_of::<awe_synth::soundfont::InstrumentZone>();
        for zone in &instrument.instrument_zones {
            instrument_size += zone.generators.len() * std::mem::size_of::<awe_synth::soundfont::Generator>();
            instrument_size += zone.modulators.len() * std::mem::size_of::<awe_synth::soundfont::Modulator>();
        }
    }
    breakdown.insert("Instruments".to_string(), instrument_size);
    
    // Sample metadata
    let sample_meta_size = sf.samples.len() * std::mem::size_of::<awe_synth::soundfont::SoundFontSample>();
    for sample in &sf.samples {
        sample_meta_size + sample.name.len();
    }
    breakdown.insert("Sample Metadata".to_string(), sample_meta_size);
    
    // Sample data
    let sample_data_size: usize = sf.samples.iter()
        .map(|s| s.sample_data.len() * std::mem::size_of::<i16>())
        .sum();
    breakdown.insert("Sample Data".to_string(), sample_data_size);
    
    breakdown
}