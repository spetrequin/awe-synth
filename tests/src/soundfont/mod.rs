/// SoundFont 2.0 Testing Module
/// 
/// This module provides comprehensive testing for the AWE Player SoundFont implementation,
/// including parser validation, sample extraction, preset hierarchy, and integration tests.

// Test modules for different aspects of SoundFont functionality
pub mod parser_tests;
// pub mod sample_tests;      // Task 9B.3
// pub mod preset_tests;      // Task 9B.4
// pub mod generator_tests;   // Future enhancement
// pub mod integration_tests; // Task 9B.5
// pub mod performance_tests; // Task 9B.6

// Re-export commonly used test utilities
pub use crate::utils::*;

/// Test data constants for SoundFont testing
pub mod test_data {
    /// Path to test SoundFont files
    pub const TEST_SF2_PATH: &str = "../reference/soundfonts/";
    
    /// Path to real SoundFont files
    pub const REAL_SF2_PATH: &str = "../resources/sf2/";
    
    /// Creative Technology 2MB GM SoundFont
    pub const CT2MGM_SF2: &str = "gm/CT2MGM.SF2";
    
    /// Creative Technology 8MB GM SoundFont (if available)
    pub const CT8MGM_SF2: &str = "gm/CT8MGM.SF2";
    
    /// Small test SF2 file for unit testing
    pub const SMALL_SF2: &str = "test_small.sf2";
    
    /// Medium test SF2 file for integration testing
    pub const MEDIUM_SF2: &str = "test_medium.sf2";
    
    /// Large test SF2 file for performance testing
    pub const LARGE_SF2: &str = "test_large.sf2";
    
    /// Malformed SF2 file for error handling tests
    pub const INVALID_SF2: &str = "test_invalid.sf2";
}

/// Common test utilities for SoundFont testing
pub mod utils {
    use awe_synth::soundfont::SoundFont;
    use std::fs;
    use std::path::Path;
    
    /// Load a test SoundFont file
    pub fn load_test_soundfont(filename: &str) -> Result<Vec<u8>, std::io::Error> {
        let path = Path::new(super::test_data::TEST_SF2_PATH).join(filename);
        fs::read(path)
    }
    
    /// Load a real SoundFont file from resources
    pub fn load_real_soundfont(filename: &str) -> Result<Vec<u8>, std::io::Error> {
        let path = Path::new(super::test_data::REAL_SF2_PATH).join(filename);
        fs::read(path)
    }
    
    /// Create a minimal valid SF2 file for testing
    pub fn create_minimal_sf2() -> Vec<u8> {
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size (to be filled)
        data.extend_from_slice(b"sfbk");
        
        // INFO list chunk
        let info_start = data.len();
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size (to be filled)
        data.extend_from_slice(b"INFO");
        
        // Required ifil chunk (version)
        data.extend_from_slice(b"ifil");
        data.extend_from_slice(&[0x04, 0x00, 0x00, 0x00]); // 4 bytes
        data.extend_from_slice(&[0x02, 0x00, 0x01, 0x00]); // Version 2.1
        
        // Required INAM chunk (name)
        data.extend_from_slice(b"INAM");
        data.extend_from_slice(&[0x08, 0x00, 0x00, 0x00]); // 8 bytes
        data.extend_from_slice(b"MinSF2\0\0");
        
        // Update INFO list size
        let info_size = (data.len() - info_start - 8) as u32;
        data[info_start + 4..info_start + 8].copy_from_slice(&info_size.to_le_bytes());
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        data
    }
    
    /// Verify basic SF2 structure
    pub fn verify_sf2_structure(sf: &SoundFont) -> Result<(), String> {
        // Verify header is present
        if sf.header.name.is_empty() {
            return Err("Missing SoundFont name".to_string());
        }
        
        if sf.samples.is_empty() && sf.presets.is_empty() {
            return Err("No samples or presets found".to_string());
        }
        
        Ok(())
    }
    
    /// Compare two samples for equality (with tolerance for floating point)
    pub fn samples_equal(a: &[i16], b: &[i16], tolerance: i16) -> bool {
        if a.len() != b.len() {
            return false;
        }
        
        a.iter().zip(b.iter()).all(|(x, y)| {
            (x - y).abs() <= tolerance
        })
    }
}

#[cfg(test)]
mod soundfont_test_framework {
    use super::*;
    
    #[test]
    fn test_framework_setup() {
        // Verify test utilities compile
        let minimal_sf2 = utils::create_minimal_sf2();
        assert!(minimal_sf2.len() > 20, "Minimal SF2 should have header");
        assert_eq!(&minimal_sf2[0..4], b"RIFF");
        assert_eq!(&minimal_sf2[8..12], b"sfbk");
    }
}