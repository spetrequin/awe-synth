/// SoundFont Preset Hierarchy Tests
/// 
/// Comprehensive tests for SoundFont preset/instrument/sample hierarchy:
/// - Preset to instrument mapping validation
/// - Instrument to sample mapping validation
/// - Zone structure and generator validation
/// - Key/velocity range validation
/// - GM program mapping verification

use awe_synth::soundfont::{SoundFontParser, GeneratorType};
use crate::soundfont::{utils, test_data};

#[cfg(test)]
mod preset_structure_tests {
    use super::*;
    
    #[test]
    fn test_preset_basic_structure() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Basic preset validation
        assert!(!sf.presets.is_empty(), "SoundFont should have presets");
        
        for preset in &sf.presets {
            // Validate preset properties
            assert!(!preset.name.is_empty(), "Preset should have a name");
            assert!(preset.program <= 127, "Program number should be 0-127");
            assert!(preset.bank <= 16383, "Bank number should be 0-16383");
            
            // Validate preset zones
            assert!(!preset.preset_zones.is_empty(), "Preset '{}' should have zones", preset.name);
            
            println!("Preset: Bank {} Program {} - '{}' ({} zones)", 
                    preset.bank, preset.program, preset.name, preset.preset_zones.len());
        }
    }
    
    #[test]
    fn test_gm_program_coverage() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Check GM bank 0 programs 0-127
        let mut gm_programs = std::collections::HashSet::new();
        
        for preset in &sf.presets {
            if preset.bank == 0 {
                gm_programs.insert(preset.program);
            }
        }
        
        // GM requires programs 0-127 in bank 0
        for program in 0..128 {
            assert!(gm_programs.contains(&program),
                   "Missing GM program {} in bank 0", program);
        }
        
        println!("✓ All 128 GM programs (0-127) found in bank 0");
    }
    
    #[test]
    fn test_preset_zone_structure() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut total_zones = 0;
        let mut zones_with_instruments = 0;
        let mut global_zones = 0;
        
        for preset in &sf.presets {
            for zone in &preset.preset_zones {
                total_zones += 1;
                
                if let Some(instrument_id) = zone.instrument_id {
                    zones_with_instruments += 1;
                    
                    // Validate instrument ID is within bounds
                    assert!((instrument_id as usize) < sf.instruments.len(),
                           "Preset '{}' references invalid instrument ID {}", 
                           preset.name, instrument_id);
                } else {
                    global_zones += 1;
                }
                
                // Validate key range if present
                if let Some(key_range) = &zone.key_range {
                    assert!(key_range.low <= key_range.high,
                           "Invalid key range: {} > {}", key_range.low, key_range.high);
                    assert!(key_range.low <= 127 && key_range.high <= 127,
                           "Key range out of bounds: {}-{}", key_range.low, key_range.high);
                }
                
                // Validate velocity range if present
                if let Some(vel_range) = &zone.velocity_range {
                    assert!(vel_range.low <= vel_range.high,
                           "Invalid velocity range: {} > {}", vel_range.low, vel_range.high);
                    assert!(vel_range.low <= 127 && vel_range.high <= 127,
                           "Velocity range out of bounds: {}-{}", vel_range.low, vel_range.high);
                }
            }
        }
        
        println!("Preset zone analysis:");
        println!("  Total zones: {}", total_zones);
        println!("  Zones with instruments: {}", zones_with_instruments);
        println!("  Global zones: {}", global_zones);
        
        assert!(zones_with_instruments > 0, "Should have zones with instruments");
    }
    
    #[test]
    fn test_preset_to_instrument_mapping() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut referenced_instruments = std::collections::HashSet::new();
        
        // Collect all instrument references from presets
        for preset in &sf.presets {
            for zone in &preset.preset_zones {
                if let Some(instrument_id) = zone.instrument_id {
                    referenced_instruments.insert(instrument_id);
                    
                    // Verify the instrument exists
                    let instrument = &sf.instruments[instrument_id as usize];
                    assert!(!instrument.name.is_empty(), 
                           "Instrument {} should have a name", instrument_id);
                    
                    // Verify instrument has zones
                    assert!(!instrument.instrument_zones.is_empty(),
                           "Instrument '{}' should have zones", instrument.name);
                }
            }
        }
        
        println!("Instrument mapping analysis:");
        println!("  Total instruments: {}", sf.instruments.len());
        println!("  Referenced instruments: {}", referenced_instruments.len());
        
        // Most instruments should be referenced (some may be unused)
        let usage_ratio = referenced_instruments.len() as f64 / sf.instruments.len() as f64;
        assert!(usage_ratio > 0.5, "At least 50% of instruments should be used");
    }
}

#[cfg(test)]
mod instrument_structure_tests {
    use super::*;
    
    #[test]
    fn test_instrument_basic_structure() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        assert!(!sf.instruments.is_empty(), "SoundFont should have instruments");
        
        for (i, instrument) in sf.instruments.iter().enumerate() {
            // Skip terminal instruments (may have empty names)
            if instrument.name.is_empty() {
                continue;
            }
            
            assert!(!instrument.instrument_zones.is_empty(),
                   "Instrument {} '{}' should have zones", i, instrument.name);
            
            println!("Instrument {}: '{}' ({} zones)", 
                    i, instrument.name, instrument.instrument_zones.len());
        }
    }
    
    #[test]
    fn test_instrument_zone_structure() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut total_zones = 0;
        let mut zones_with_samples = 0;
        let mut global_zones = 0;
        
        for instrument in &sf.instruments {
            for zone in &instrument.instrument_zones {
                total_zones += 1;
                
                if let Some(sample_id) = zone.sample_id {
                    zones_with_samples += 1;
                    
                    // Validate sample ID is within bounds
                    assert!((sample_id as usize) < sf.samples.len(),
                           "Instrument '{}' references invalid sample ID {}", 
                           instrument.name, sample_id);
                           
                    // Verify the sample exists and is valid
                    let sample = &sf.samples[sample_id as usize];
                    if !sample.name.is_empty() && !sample.name.starts_with("EOS") {
                        assert!(!sample.sample_data.is_empty() || 
                               sample.end_offset > sample.start_offset,
                               "Sample '{}' should have valid data", sample.name);
                    }
                } else {
                    global_zones += 1;
                }
                
                // Validate zone ranges
                if let Some(key_range) = &zone.key_range {
                    assert!(key_range.low <= key_range.high,
                           "Invalid key range in instrument '{}': {} > {}", 
                           instrument.name, key_range.low, key_range.high);
                }
                
                if let Some(vel_range) = &zone.velocity_range {
                    assert!(vel_range.low <= vel_range.high,
                           "Invalid velocity range in instrument '{}': {} > {}", 
                           instrument.name, vel_range.low, vel_range.high);
                }
            }
        }
        
        println!("Instrument zone analysis:");
        println!("  Total zones: {}", total_zones);
        println!("  Zones with samples: {}", zones_with_samples);
        println!("  Global zones: {}", global_zones);
        
        assert!(zones_with_samples > 0, "Should have zones with samples");
    }
    
    #[test]
    fn test_instrument_to_sample_mapping() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut referenced_samples = std::collections::HashSet::new();
        
        // Collect all sample references from instruments
        for instrument in &sf.instruments {
            for zone in &instrument.instrument_zones {
                if let Some(sample_id) = zone.sample_id {
                    referenced_samples.insert(sample_id);
                    
                    // Verify the sample is accessible
                    let sample = &sf.samples[sample_id as usize];
                    
                    // Skip terminal samples
                    if sample.name.starts_with("EOS") || sample.name.is_empty() {
                        continue;
                    }
                    
                    // Verify sample properties
                    assert!(sample.end_offset >= sample.start_offset,
                           "Sample '{}' has invalid offsets", sample.name);
                    assert!(sample.sample_rate > 0 || sample.name.is_empty(),
                           "Sample '{}' should have valid sample rate", sample.name);
                }
            }
        }
        
        println!("Sample mapping analysis:");
        println!("  Total samples: {}", sf.samples.len());
        println!("  Referenced samples: {}", referenced_samples.len());
        
        // Most samples should be referenced
        let usage_ratio = referenced_samples.len() as f64 / sf.samples.len() as f64;
        assert!(usage_ratio > 0.8, "At least 80% of samples should be used");
    }
}

#[cfg(test)]
mod hierarchy_validation_tests {
    use super::*;
    
    #[test]
    fn test_complete_hierarchy_chain() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut valid_chains = 0;
        let mut broken_chains = 0;
        
        // Test preset -> instrument -> sample chain for each preset
        for preset in &sf.presets {
            for preset_zone in &preset.preset_zones {
                if let Some(instrument_id) = preset_zone.instrument_id {
                    let instrument = &sf.instruments[instrument_id as usize];
                    
                    for instrument_zone in &instrument.instrument_zones {
                        if let Some(sample_id) = instrument_zone.sample_id {
                            let sample = &sf.samples[sample_id as usize];
                            
                            // Skip terminal samples
                            if sample.name.starts_with("EOS") || sample.name.is_empty() {
                                continue;
                            }
                            
                            // Verify complete chain
                            if !preset.name.is_empty() && 
                               !instrument.name.is_empty() && 
                               !sample.name.is_empty() {
                                valid_chains += 1;
                            } else {
                                broken_chains += 1;
                            }
                        }
                    }
                }
            }
        }
        
        println!("Hierarchy chain analysis:");
        println!("  Valid preset->instrument->sample chains: {}", valid_chains);
        println!("  Broken chains: {}", broken_chains);
        
        assert!(valid_chains > 0, "Should have valid hierarchy chains");
        assert!(broken_chains < valid_chains / 10, "Less than 10% broken chains allowed");
    }
    
    #[test]
    fn test_gm_instrument_assignments() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Test some well-known GM program assignments
        let gm_tests = vec![
            (0, "Piano"),      // Acoustic Grand Piano
            (1, "Piano"),      // Bright Acoustic Piano
            (24, "Guitar"),    // Acoustic Guitar (nylon)
            (25, "Guitar"),    // Acoustic Guitar (steel)
            (40, "Violin"),    // Violin
            (56, "Trumpet"),   // Trumpet
            (73, "Flute"),     // Flute
        ];
        
        for (program, expected_type) in gm_tests {
            // Find preset for this GM program
            let preset = sf.presets.iter()
                .find(|p| p.bank == 0 && p.program == program)
                .expect(&format!("Should have GM program {}", program));
            
            println!("GM Program {}: '{}' - checking for '{}'", 
                    program, preset.name, expected_type);
            
            // The preset name should contain the expected instrument type
            let name_lower = preset.name.to_lowercase();
            let expected_lower = expected_type.to_lowercase();
            
            assert!(name_lower.contains(&expected_lower) || 
                   // Some alternate naming conventions
                   (expected_type == "Piano" && (name_lower.contains("piano") || name_lower.contains("pno"))) ||
                   (expected_type == "Guitar" && (name_lower.contains("guitar") || name_lower.contains("gtr"))) ||
                   (expected_type == "Violin" && (name_lower.contains("violin") || name_lower.contains("strings"))) ||
                   (expected_type == "Trumpet" && (name_lower.contains("trumpet") || name_lower.contains("brass"))) ||
                   (expected_type == "Flute" && (name_lower.contains("flute") || name_lower.contains("woodwind"))),
                   "GM program {} '{}' should be related to {}", 
                   program, preset.name, expected_type);
        }
    }
    
    #[test]
    fn test_key_velocity_coverage() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Test a few representative presets for proper key/velocity coverage
        for preset in sf.presets.iter().take(10) {
            if preset.bank != 0 { continue; } // Focus on GM bank
            
            let mut key_coverage = vec![false; 128];
            let mut vel_coverage = vec![false; 128];
            
            // Check coverage through preset zones
            for zone in &preset.preset_zones {
                if let Some(key_range) = &zone.key_range {
                    for key in key_range.low..=key_range.high {
                        key_coverage[key as usize] = true;
                    }
                } else {
                    // No key range means all keys
                    for key in 0..128 {
                        key_coverage[key] = true;
                    }
                }
                
                if let Some(vel_range) = &zone.velocity_range {
                    for vel in vel_range.low..=vel_range.high {
                        vel_coverage[vel as usize] = true;
                    }
                } else {
                    // No velocity range means all velocities
                    for vel in 0..128 {
                        vel_coverage[vel] = true;
                    }
                }
            }
            
            let key_coverage_count = key_coverage.iter().filter(|&&x| x).count();
            let vel_coverage_count = vel_coverage.iter().filter(|&&x| x).count();
            
            println!("Preset '{}': {} keys, {} velocities covered", 
                    preset.name, key_coverage_count, vel_coverage_count);
            
            // Most presets should cover a reasonable range
            assert!(key_coverage_count >= 88, 
                   "Preset '{}' should cover at least 88 keys (piano range)", preset.name);
            assert!(vel_coverage_count >= 64,
                   "Preset '{}' should cover at least 64 velocity levels", preset.name);
        }
    }
}

#[cfg(test)]
mod generator_validation_tests {
    use super::*;
    
    #[test]
    fn test_preset_zone_generators() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut generator_usage = std::collections::HashMap::new();
        
        for preset in &sf.presets {
            for zone in &preset.preset_zones {
                for generator in &zone.generators {
                    let gen_name = format!("{:?}", generator.generator_type);
                    *generator_usage.entry(gen_name).or_insert(0) += 1;
                    
                    // Validate generator values are reasonable
                    match generator.generator_type {
                        GeneratorType::InitialAttenuation => {
                            // Attenuation should be positive (0-1440 centibels)
                            if let awe_synth::soundfont::GeneratorAmount::Short(value) = generator.amount {
                                assert!(value >= 0 && value <= 1440,
                                       "Invalid attenuation: {} centibels", value);
                            }
                        },
                        GeneratorType::Pan => {
                            // Pan should be -500 to +500 (left to right)
                            if let awe_synth::soundfont::GeneratorAmount::Short(value) = generator.amount {
                                assert!(value >= -500 && value <= 500,
                                       "Invalid pan: {}", value);
                            }
                        },
                        GeneratorType::CoarseTune => {
                            // Coarse tune should be -120 to +120 semitones
                            if let awe_synth::soundfont::GeneratorAmount::Short(value) = generator.amount {
                                assert!(value >= -120 && value <= 120,
                                       "Invalid coarse tune: {} semitones", value);
                            }
                        },
                        _ => {
                            // Other generators - basic validation that they exist
                        }
                    }
                }
            }
        }
        
        println!("Preset generator usage:");
        let mut sorted_usage: Vec<_> = generator_usage.iter().collect();
        sorted_usage.sort_by_key(|(_, count)| std::cmp::Reverse(*count));
        
        for (gen_type, count) in sorted_usage.iter().take(10) {
            println!("  {}: {} uses", gen_type, count);
        }
        
        // Should have some common generators
        assert!(generator_usage.contains_key("Instrument"), 
               "Should have Instrument generators");
    }
    
    #[test]
    fn test_instrument_zone_generators() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut sample_id_generators = 0;
        
        for instrument in &sf.instruments {
            for zone in &instrument.instrument_zones {
                for generator in &zone.generators {
                    match generator.generator_type {
                        GeneratorType::SampleID => {
                            sample_id_generators += 1;
                            
                            // SampleID generator should reference valid sample
                            if let awe_synth::soundfont::GeneratorAmount::UShort(sample_id) = generator.amount {
                                assert!((sample_id as usize) < sf.samples.len(),
                                       "Invalid sample ID in generator: {}", sample_id);
                            }
                        },
                        GeneratorType::KeyRange => {
                            // Key range generator validation
                            if let awe_synth::soundfont::GeneratorAmount::Range { low, high } = generator.amount {
                                assert!(low <= high,
                                       "Invalid key range: {} > {}", low, high);
                                assert!(low <= 127 && high <= 127,
                                       "Key range out of bounds: {}-{}", low, high);
                            }
                        },
                        GeneratorType::VelRange => {
                            // Velocity range generator validation
                            if let awe_synth::soundfont::GeneratorAmount::Range { low, high } = generator.amount {
                                assert!(low <= high,
                                       "Invalid velocity range: {} > {}", low, high);
                                assert!(low <= 127 && high <= 127,
                                       "Velocity range out of bounds: {}-{}", low, high);
                            }
                        },
                        _ => {}
                    }
                }
            }
        }
        
        println!("Instrument generator analysis:");
        println!("  SampleID generators: {}", sample_id_generators);
        
        assert!(sample_id_generators > 0, "Should have SampleID generators");
    }
}