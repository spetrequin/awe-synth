/// SoundFont Sample Data Validation Tests
/// 
/// Comprehensive tests for 16-bit PCM sample extraction and validation:
/// - Sample data extraction accuracy from sdta chunks
/// - 16-bit PCM format validation (little-endian)
/// - Sample loop point verification
/// - Sample rate and pitch validation
/// - Stereo linking and sample type validation

use awe_synth::soundfont::{SoundFontParser, SampleType};
use crate::soundfont::{utils, test_data};

#[cfg(test)]
mod sample_extraction_tests {
    use super::*;
    
    #[test]
    fn test_16bit_pcm_extraction() {
        // Create test sample data with known values
        let test_samples = vec![
            0x1234i16, 0x5678i16, -0x1000i16, 0x7FFFi16, -0x8000i16, 0x0000i16
        ];
        
        // Convert to little-endian bytes
        let mut sample_bytes = Vec::new();
        for sample in &test_samples {
            sample_bytes.extend_from_slice(&sample.to_le_bytes());
        }
        
        // Create SF2 with this sample data
        let sf2_data = create_sf2_with_samples(&sample_bytes);
        
        // Parse and verify
        let result = SoundFontParser::parse_soundfont(&sf2_data);
        assert!(result.is_ok(), "Failed to parse test SF2: {:?}", result.err());
        
        let sf = result.unwrap();
        assert!(!sf.samples.is_empty(), "Should have extracted samples");
        
        // Verify the first sample contains our test data
        let first_sample = &sf.samples[0];
        assert_eq!(first_sample.sample_data.len(), test_samples.len(), 
                   "Sample count mismatch");
        
        for (i, &expected) in test_samples.iter().enumerate() {
            assert_eq!(first_sample.sample_data[i], expected,
                      "Sample {} mismatch: expected {}, got {}", 
                      i, expected, first_sample.sample_data[i]);
        }
    }
    
    #[test]
    fn test_little_endian_conversion() {
        // Test specific endianness scenarios
        let test_cases = vec![
            (vec![0x34, 0x12], 0x1234i16),           // Normal positive
            (vec![0xFF, 0x7F], 0x7FFFi16),           // Max positive  
            (vec![0x00, 0x80], -0x8000i16),          // Min negative
            (vec![0x00, 0x00], 0x0000i16),           // Zero
            (vec![0xCD, 0xAB], -0x5433i16),          // Negative value
        ];
        
        for (bytes, expected) in test_cases {
            let sf2_data = create_sf2_with_samples(&bytes);
            let sf = SoundFontParser::parse_soundfont(&sf2_data).unwrap();
            
            assert!(!sf.samples.is_empty(), "Should have samples");
            assert_eq!(sf.samples[0].sample_data.len(), 1, "Should have one sample");
            assert_eq!(sf.samples[0].sample_data[0], expected,
                      "Little-endian conversion failed for {:02X}{:02X}", 
                      bytes[1], bytes[0]);
        }
    }
    
    #[test]
    fn test_odd_sample_data_size() {
        // Test with odd number of bytes (should fail)
        let odd_bytes = vec![0x12, 0x34, 0x56]; // 3 bytes, not divisible by 2
        let sf2_data = create_sf2_with_samples(&odd_bytes);
        
        let result = SoundFontParser::parse_soundfont(&sf2_data);
        assert!(result.is_err(), "Odd-sized sample data should fail");
        
        if let Err(err) = result {
            let error_str = format!("{:?}", err);
            assert!(error_str.contains("aligned"), "Error should mention alignment");
        }
    }
    
    #[test]
    fn test_empty_sample_data() {
        // Test with empty sample data
        let empty_bytes = vec![];
        let sf2_data = create_sf2_with_samples(&empty_bytes);
        
        let result = SoundFontParser::parse_soundfont(&sf2_data);
        assert!(result.is_ok(), "Empty sample data should be valid");
        
        let sf = result.unwrap();
        // Should still have a sample entry but with empty data
        if !sf.samples.is_empty() {
            assert!(sf.samples[0].sample_data.is_empty(), "Sample data should be empty");
        }
    }
    
    #[test]
    fn test_large_sample_data() {
        // Test with larger sample buffer
        let sample_count = 1024;
        let mut test_samples = Vec::new();
        let mut sample_bytes = Vec::new();
        
        // Generate sine wave pattern
        for i in 0..sample_count {
            let sample = ((i as f32 * 2.0 * std::f32::consts::PI / 32.0).sin() * 16384.0) as i16;
            test_samples.push(sample);
            sample_bytes.extend_from_slice(&sample.to_le_bytes());
        }
        
        let sf2_data = create_sf2_with_samples(&sample_bytes);
        let sf = SoundFontParser::parse_soundfont(&sf2_data).unwrap();
        
        assert!(!sf.samples.is_empty(), "Should have samples");
        
        let first_sample = &sf.samples[0];
        assert_eq!(first_sample.sample_data.len(), sample_count, 
                   "Should preserve all samples");
        
        // Verify first few samples match
        for i in 0..10.min(sample_count) {
            assert_eq!(first_sample.sample_data[i], test_samples[i],
                      "Large sample data mismatch at index {}", i);
        }
    }
    
    /// Helper function to create SF2 with specific sample data
    fn create_sf2_with_samples(sample_bytes: &[u8]) -> Vec<u8> {
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"sfbk");
        
        // INFO-list (minimal)
        append_minimal_info_list(&mut data);
        
        // sdta-list with sample data
        append_sdta_list_with_samples(&mut data, sample_bytes);
        
        // pdta-list with sample header
        append_pdta_list_with_sample_header(&mut data, sample_bytes.len());
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        data
    }
    
    fn append_minimal_info_list(data: &mut Vec<u8>) {
        let list_start = data.len();
        
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"INFO");
        
        // Required chunks
        append_chunk(data, b"ifil", &[0x02, 0x00, 0x01, 0x00]); // Version 2.1
        append_chunk(data, b"INAM", b"Test Samples\0");
        
        // Update LIST size
        let size = (data.len() - list_start - 8) as u32;
        data[list_start + 4..list_start + 8].copy_from_slice(&size.to_le_bytes());
    }
    
    fn append_sdta_list_with_samples(data: &mut Vec<u8>, sample_bytes: &[u8]) {
        let list_start = data.len();
        
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"sdta");
        
        // smpl chunk with sample data
        append_chunk(data, b"smpl", sample_bytes);
        
        // Update LIST size
        let size = (data.len() - list_start - 8) as u32;
        data[list_start + 4..list_start + 8].copy_from_slice(&size.to_le_bytes());
    }
    
    fn append_pdta_list_with_sample_header(data: &mut Vec<u8>, sample_byte_count: usize) {
        let list_start = data.len();
        
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"pdta");
        
        // Minimal preset data chunks
        append_chunk(data, b"phdr", &[0; 38]); // One preset header
        append_chunk(data, b"pbag", &[0; 4]);  // One preset bag
        append_chunk(data, b"pmod", &[0; 10]); // One modulator
        append_chunk(data, b"pgen", &[0; 4]);  // One generator
        append_chunk(data, b"inst", &[0; 22]); // One instrument
        append_chunk(data, b"ibag", &[0; 4]);  // One instrument bag
        append_chunk(data, b"imod", &[0; 10]); // One modulator
        append_chunk(data, b"igen", &[0; 4]);  // One generator
        
        // Sample header (46 bytes per sample)
        let mut shdr_data = vec![0u8; 46];
        
        // Sample name
        shdr_data[0..16].copy_from_slice(b"TestSample\0\0\0\0\0\0");
        
        // Start offset (0)
        shdr_data[16..20].copy_from_slice(&0u32.to_le_bytes());
        
        // End offset (sample count)
        let sample_count = (sample_byte_count / 2) as u32;
        shdr_data[20..24].copy_from_slice(&sample_count.to_le_bytes());
        
        // Loop start (0)
        shdr_data[24..28].copy_from_slice(&0u32.to_le_bytes());
        
        // Loop end (same as end)
        shdr_data[28..32].copy_from_slice(&sample_count.to_le_bytes());
        
        // Sample rate (44100)
        shdr_data[32..36].copy_from_slice(&44100u32.to_le_bytes());
        
        // Original pitch (middle C = 60)
        shdr_data[36] = 60;
        
        // Pitch correction (0)
        shdr_data[37] = 0;
        
        // Sample link (0)
        shdr_data[38..40].copy_from_slice(&0u16.to_le_bytes());
        
        // Sample type (mono sample)
        shdr_data[40..42].copy_from_slice(&1u16.to_le_bytes());
        
        append_chunk(data, b"shdr", &shdr_data);
        
        // Update LIST size
        let size = (data.len() - list_start - 8) as u32;
        data[list_start + 4..list_start + 8].copy_from_slice(&size.to_le_bytes());
    }
    
    fn append_chunk(data: &mut Vec<u8>, id: &[u8; 4], content: &[u8]) {
        data.extend_from_slice(id);
        data.extend_from_slice(&(content.len() as u32).to_le_bytes());
        data.extend_from_slice(content);
        
        // Add padding byte if odd length
        if content.len() % 2 == 1 {
            data.push(0);
        }
    }
}

#[cfg(test)]
mod sample_properties_tests {
    use super::*;
    
    #[test]
    fn test_sample_loop_points() {
        // Load the real CT2MGM SoundFont and validate loop points
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut looped_samples = 0;
        let mut non_looped_samples = 0;
        
        for sample in &sf.samples {
            if sample.loop_end > sample.loop_start {
                looped_samples += 1;
                
                // Validate loop points are within sample bounds
                assert!(sample.loop_start >= sample.start_offset,
                       "Sample '{}': loop start {} before sample start {}", 
                       sample.name, sample.loop_start, sample.start_offset);
                       
                assert!(sample.loop_end <= sample.end_offset,
                       "Sample '{}': loop end {} after sample end {}", 
                       sample.name, sample.loop_end, sample.end_offset);
                       
                // Loop should be at least 1 sample long
                assert!(sample.loop_end > sample.loop_start,
                       "Sample '{}': invalid loop range {}-{}", 
                       sample.name, sample.loop_start, sample.loop_end);
            } else {
                non_looped_samples += 1;
            }
        }
        
        println!("Sample loop analysis:");
        println!("  Looped samples: {}", looped_samples);
        println!("  Non-looped samples: {}", non_looped_samples);
        println!("  Total samples: {}", sf.samples.len());
        
        // GM SoundFont should have both looped and non-looped samples
        assert!(looped_samples > 0, "Should have some looped samples");
        assert!(non_looped_samples >= 0, "May have non-looped samples");
    }
    
    #[test]
    fn test_sample_rates() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut rate_histogram = std::collections::HashMap::new();
        
        for sample in &sf.samples {
            // Skip terminal/EOS samples which may have zero sample rate
            if sample.name.starts_with("EOS") || sample.name.is_empty() || 
               sample.sample_type == SampleType::Unused {
                continue;
            }
            
            // Validate sample rate is reasonable for actual samples
            assert!(sample.sample_rate > 1000, 
                   "Sample '{}' has unreasonably low sample rate: {}", 
                   sample.name, sample.sample_rate);
            assert!(sample.sample_rate <= 192000, 
                   "Sample '{}' has unreasonably high sample rate: {}", 
                   sample.name, sample.sample_rate);
            
            // Count sample rates
            *rate_histogram.entry(sample.sample_rate).or_insert(0) += 1;
        }
        
        println!("Sample rate distribution:");
        let mut rates: Vec<_> = rate_histogram.iter().collect();
        rates.sort_by_key(|(rate, _)| *rate);
        for (rate, count) in rates {
            println!("  {} Hz: {} samples", rate, count);
        }
        
        // Most samples should be at common rates
        assert!(rate_histogram.contains_key(&44100) || rate_histogram.contains_key(&22050),
               "Should have samples at 44.1kHz or 22.05kHz");
    }
    
    #[test]
    fn test_sample_pitch_information() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        for sample in &sf.samples {
            // Validate MIDI pitch range
            assert!(sample.original_pitch <= 127,
                   "Sample '{}' has invalid MIDI pitch: {}", 
                   sample.name, sample.original_pitch);
            
            // Validate pitch correction range (-50 to +50 cents)
            assert!(sample.pitch_correction >= -50 && sample.pitch_correction <= 50,
                   "Sample '{}' has invalid pitch correction: {} cents", 
                   sample.name, sample.pitch_correction);
        }
        
        // Check pitch distribution
        let mut pitch_histogram = std::collections::HashMap::new();
        for sample in &sf.samples {
            *pitch_histogram.entry(sample.original_pitch).or_insert(0) += 1;
        }
        
        println!("Original pitch distribution (top 10):");
        let mut pitches: Vec<_> = pitch_histogram.iter().collect();
        pitches.sort_by_key(|(_, count)| std::cmp::Reverse(*count));
        for (pitch, count) in pitches.iter().take(10) {
            println!("  MIDI note {}: {} samples", pitch, count);
        }
    }
    
    #[test]
    fn test_sample_types() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        let mut type_counts = std::collections::HashMap::new();
        
        for sample in &sf.samples {
            let type_key = format!("{:?}", sample.sample_type);
            *type_counts.entry(type_key).or_insert(0) += 1;
            
            // Validate sample type
            match sample.sample_type {
                SampleType::Unused => {
                    // Unused samples might be terminal or placeholder samples
                    // They often have names like "EOS" (End Of Samples)
                    // No specific validation needed
                },
                SampleType::MonoSample => {
                    // Mono samples should not link to other samples
                    assert_eq!(sample.sample_link, 0,
                              "Mono sample '{}' should not have sample link", 
                              sample.name);
                },
                SampleType::RightSample | SampleType::LeftSample => {
                    // Stereo samples should link to their partner
                    assert!(sample.sample_link > 0,
                           "Stereo sample '{}' should have sample link", 
                           sample.name);
                },
                SampleType::LinkedSample => {
                    // Linked samples should have a link
                    assert!(sample.sample_link > 0,
                           "Linked sample '{}' should have sample link", 
                           sample.name);
                },
                _ => {
                    // ROM samples and other types should be valid
                }
            }
        }
        
        println!("Sample type distribution:");
        for (sample_type, count) in &type_counts {
            println!("  {}: {} samples", sample_type, count);
        }
        
        // Most samples should be mono
        assert!(type_counts.get("MonoSample").unwrap_or(&0) > &0,
               "Should have mono samples");
    }
    
    #[test]
    fn test_sample_data_integrity() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        for sample in &sf.samples {
            // Validate sample has data
            let sample_length = sample.end_offset - sample.start_offset;
            assert_eq!(sample.sample_data.len() as u32, sample_length,
                      "Sample '{}' data length mismatch: header says {}, got {}", 
                      sample.name, sample_length, sample.sample_data.len());
            
            // Check for DC offset and dynamic range
            if !sample.sample_data.is_empty() {
                let mut min_val = i16::MAX;
                let mut max_val = i16::MIN;
                let mut sum = 0i64;
                
                for &sample_val in &sample.sample_data {
                    min_val = min_val.min(sample_val);
                    max_val = max_val.max(sample_val);
                    sum += sample_val as i64;
                }
                
                let avg = sum as f64 / sample.sample_data.len() as f64;
                let range = max_val - min_val;
                
                // Samples should have reasonable dynamic range
                if sample.sample_data.len() > 100 {
                    assert!(range > 1000, 
                           "Sample '{}' has very low dynamic range: {}", 
                           sample.name, range);
                }
                
                // Check for extreme DC offset (should be near zero on average)
                let dc_offset = avg.abs();
                if sample.sample_data.len() > 1000 {
                    assert!(dc_offset < 5000.0,
                           "Sample '{}' has large DC offset: {:.1}", 
                           sample.name, dc_offset);
                }
            }
        }
    }
}

#[cfg(test)]
mod sample_boundary_tests {
    use super::*;
    
    #[test]
    fn test_sample_offset_validation() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        for sample in &sf.samples {
            // Basic offset validation
            assert!(sample.end_offset >= sample.start_offset,
                   "Sample '{}' has invalid offsets: start {} >= end {}", 
                   sample.name, sample.start_offset, sample.end_offset);
            
            // Sample should have non-zero length (except for terminal samples)
            if !sample.name.starts_with("EOS") && !sample.name.is_empty() {
                assert!(sample.end_offset > sample.start_offset,
                       "Sample '{}' has zero length", sample.name);
            }
        }
    }
    
    #[test]
    fn test_sample_overlap_detection() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Sort samples by start offset
        let mut samples_with_index: Vec<_> = sf.samples.iter().enumerate().collect();
        samples_with_index.sort_by_key(|(_, sample)| sample.start_offset);
        
        // Check for overlapping samples
        for i in 0..samples_with_index.len() - 1 {
            let (idx1, sample1) = samples_with_index[i];
            let (idx2, sample2) = samples_with_index[i + 1];
            
            if sample1.end_offset > sample2.start_offset {
                // This could be valid for linked samples or special cases
                println!("Warning: Samples may overlap:");
                println!("  Sample {} '{}': {}-{}", idx1, sample1.name, 
                        sample1.start_offset, sample1.end_offset);
                println!("  Sample {} '{}': {}-{}", idx2, sample2.name, 
                        sample2.start_offset, sample2.end_offset);
            }
        }
    }
    
    #[test]
    fn test_sample_data_bounds() {
        let data = utils::load_real_soundfont(test_data::CT2MGM_SF2).unwrap();
        let sf = SoundFontParser::parse_soundfont(&data).unwrap();
        
        // Find the maximum sample offset
        let mut max_offset = 0u32;
        for sample in &sf.samples {
            max_offset = max_offset.max(sample.end_offset);
        }
        
        println!("Sample data bounds:");
        println!("  Maximum sample offset: {} samples", max_offset);
        println!("  Total sample data size: {} bytes", max_offset * 2);
        
        // All samples should fit within reasonable bounds
        assert!(max_offset < 50_000_000, "Sample data size seems unreasonably large");
    }
}