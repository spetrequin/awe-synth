/// SoundFont Parser Unit Tests
/// 
/// Comprehensive tests for SF2 file parsing including:
/// - RIFF chunk structure validation
/// - INFO chunk parsing for metadata
/// - Error handling for malformed files
/// - Boundary condition testing

use awe_synth::soundfont::{SoundFontParser, SoundFontError};
use crate::soundfont::utils;

#[cfg(test)]
mod parser_unit_tests {
    use super::*;
    
    #[test]
    fn test_parse_minimal_sf2() {
        // Create minimal valid SF2 structure
        let data = utils::create_minimal_sf2();
        
        // Parse should succeed with minimal file
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_ok(), "Failed to parse minimal SF2: {:?}", result.err());
        
        let sf = result.unwrap();
        assert!(!sf.header.name.is_empty(), "SoundFont should have a name");
    }
    
    #[test]
    fn test_parse_empty_data() {
        let data = vec![];
        let result = SoundFontParser::parse_soundfont(&data);
        
        assert!(result.is_err(), "Empty data should fail to parse");
        if let Err(SoundFontError::InvalidFormat { message, position }) = result {
            assert!(message.contains("too small"), "Error should mention file size");
            assert_eq!(position, Some(0), "Error position should be 0");
        } else {
            panic!("Wrong error type for empty data");
        }
    }
    
    #[test]
    fn test_parse_invalid_riff_header() {
        let mut data = vec![0u8; 20];
        // Invalid RIFF identifier
        data[0..4].copy_from_slice(b"XXXX");
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_err(), "Invalid RIFF header should fail");
        
        if let Err(SoundFontError::RiffError { chunk_type, .. }) = result {
            assert_eq!(chunk_type, "RIFF", "Error should identify RIFF chunk");
        } else {
            panic!("Wrong error type for invalid RIFF header");
        }
    }
    
    #[test]
    fn test_parse_wrong_format_type() {
        let mut data = utils::create_minimal_sf2();
        // Change "sfbk" to "WAVE" 
        data[8..12].copy_from_slice(b"WAVE");
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_err(), "Wrong format type should fail");
        
        if let Err(SoundFontError::InvalidFormat { message, .. }) = result {
            assert!(message.contains("sfbk"), "Error should mention expected format");
        } else {
            panic!("Wrong error type for invalid format");
        }
    }
    
    #[test]
    fn test_parse_truncated_chunk() {
        let mut data = utils::create_minimal_sf2();
        // Truncate the data to simulate incomplete chunk
        data.truncate(16);
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_err(), "Truncated chunk should fail to parse");
    }
    
    #[test]
    fn test_parse_info_chunk() {
        // Create SF2 with complete INFO chunk
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size (to be filled)
        data.extend_from_slice(b"sfbk");
        
        // INFO list chunk
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x40, 0x00, 0x00, 0x00]); // 64 bytes
        data.extend_from_slice(b"INFO");
        
        // INAM sub-chunk (SoundFont name)
        data.extend_from_slice(b"INAM");
        data.extend_from_slice(&[0x0C, 0x00, 0x00, 0x00]); // 12 bytes
        data.extend_from_slice(b"Test Font\0\0\0");
        
        // ISNG sub-chunk (Sound Engine)
        data.extend_from_slice(b"ISNG");
        data.extend_from_slice(&[0x08, 0x00, 0x00, 0x00]); // 8 bytes
        data.extend_from_slice(b"EMU8000\0");
        
        // IENG sub-chunk (Engineer/Creator)
        data.extend_from_slice(b"IENG");
        data.extend_from_slice(&[0x0C, 0x00, 0x00, 0x00]); // 12 bytes
        data.extend_from_slice(b"AWE Player\0\0");
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_ok(), "INFO chunk parsing failed: {:?}", result.err());
        
        let sf = result.unwrap();
        assert_eq!(sf.header.name, "Test Font", "SoundFont name mismatch");
        assert_eq!(sf.header.engine, "EMU8000", "Engine name mismatch");
        assert!(sf.header.tools.contains("AWE Player"), "Tools info mismatch");
    }
    
    #[test]
    fn test_parse_version_chunk() {
        // Create SF2 with version information
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size (to be filled)
        data.extend_from_slice(b"sfbk");
        
        // INFO list chunk with version
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x18, 0x00, 0x00, 0x00]); // 24 bytes
        data.extend_from_slice(b"INFO");
        
        // ifil sub-chunk (Version)
        data.extend_from_slice(b"ifil");
        data.extend_from_slice(&[0x04, 0x00, 0x00, 0x00]); // 4 bytes
        data.extend_from_slice(&[0x02, 0x00]); // Major version 2
        data.extend_from_slice(&[0x01, 0x00]); // Minor version 1
        
        // INAM sub-chunk (required)
        data.extend_from_slice(b"INAM");
        data.extend_from_slice(&[0x04, 0x00, 0x00, 0x00]); // 4 bytes
        data.extend_from_slice(b"SF2\0");
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_ok(), "Version chunk parsing failed");
        
        let sf = result.unwrap();
        assert_eq!(sf.header.version.major, 2, "Major version mismatch");
        assert_eq!(sf.header.version.minor, 1, "Minor version mismatch");
    }
    
    #[test]
    fn test_chunk_size_validation() {
        let mut data = utils::create_minimal_sf2();
        
        // Set RIFF size to exceed actual data size
        let fake_size = (data.len() + 1000) as u32;
        data[4..8].copy_from_slice(&fake_size.to_le_bytes());
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_err(), "Oversized chunk should fail validation");
        
        if let Err(SoundFontError::RiffError { expected_size, actual_size, .. }) = result {
            assert!(expected_size.is_some(), "Should have expected size");
            assert!(actual_size < expected_size.unwrap(), "Actual should be less than expected");
        } else {
            panic!("Wrong error type for size validation");
        }
    }
    
    #[test]
    fn test_multiple_list_chunks() {
        // Test parsing multiple LIST chunks (INFO, sdta, pdta)
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size (to be filled)
        data.extend_from_slice(b"sfbk");
        
        // INFO list
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x10, 0x00, 0x00, 0x00]); // 16 bytes
        data.extend_from_slice(b"INFO");
        data.extend_from_slice(b"INAM");
        data.extend_from_slice(&[0x04, 0x00, 0x00, 0x00]);
        data.extend_from_slice(b"SF2\0");
        
        // sdta list (sample data)
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x0C, 0x00, 0x00, 0x00]); // 12 bytes
        data.extend_from_slice(b"sdta");
        data.extend_from_slice(b"smpl");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // 0 samples
        
        // pdta list (preset data)
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x04, 0x00, 0x00, 0x00]); // 4 bytes
        data.extend_from_slice(b"pdta");
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_ok(), "Multiple LIST chunks should parse successfully");
    }
    
    #[test]
    fn test_odd_chunk_size_padding() {
        // Test that odd-sized chunks are padded correctly
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size (to be filled)
        data.extend_from_slice(b"sfbk");
        
        // INFO list with odd-sized name
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x0E, 0x00, 0x00, 0x00]); // 14 bytes
        data.extend_from_slice(b"INFO");
        data.extend_from_slice(b"INAM");
        data.extend_from_slice(&[0x05, 0x00, 0x00, 0x00]); // 5 bytes (odd)
        data.extend_from_slice(b"Test\0");
        data.push(0); // Padding byte
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        let result = SoundFontParser::parse_soundfont(&data);
        assert!(result.is_ok(), "Odd chunk size with padding should parse");
        
        let sf = result.unwrap();
        assert_eq!(sf.header.name, "Test", "Name should be parsed correctly");
    }
}

/// RIFF chunk parsing tests
#[cfg(test)]
mod riff_parser_tests {
    use super::*;
    use awe_synth::soundfont::riff_parser::{RiffParser, RiffChunk};
    
    #[test]
    fn test_parse_chunks() {
        // Create test data with multiple chunks
        let mut data = Vec::new();
        
        // First chunk
        data.extend_from_slice(b"TEST");
        data.extend_from_slice(&[0x04, 0x00, 0x00, 0x00]); // 4 bytes
        data.extend_from_slice(b"DATA");
        
        // Second chunk
        data.extend_from_slice(b"SMPL");
        data.extend_from_slice(&[0x08, 0x00, 0x00, 0x00]); // 8 bytes
        data.extend_from_slice(b"SAMPLES!");
        
        let result = RiffParser::parse_chunks(&data);
        assert!(result.is_ok(), "Chunk parsing failed");
        
        let chunks = result.unwrap();
        assert_eq!(chunks.len(), 2, "Should have 2 chunks");
        assert_eq!(&chunks[0].header.chunk_id, b"TEST", "First chunk ID mismatch");
        assert_eq!(&chunks[1].header.chunk_id, b"SMPL", "Second chunk ID mismatch");
    }
    
    #[test]
    fn test_find_chunk() {
        let mut chunks = Vec::new();
        
        // Create test chunks
        chunks.push(RiffChunk {
            header: awe_synth::soundfont::riff_parser::RiffChunkHeader {
                chunk_id: *b"INFO",
                chunk_size: 10,
            },
            data: vec![0; 10],
            offset: 0,
        });
        
        chunks.push(RiffChunk {
            header: awe_synth::soundfont::riff_parser::RiffChunkHeader {
                chunk_id: *b"SMPL",
                chunk_size: 20,
            },
            data: vec![0; 20],
            offset: 18,
        });
        
        // Test finding existing chunk
        let info_chunk = RiffParser::find_chunk(&chunks, b"INFO");
        assert!(info_chunk.is_some(), "Should find INFO chunk");
        assert_eq!(info_chunk.unwrap().data_size(), 10);
        
        // Test finding non-existent chunk
        let missing_chunk = RiffParser::find_chunk(&chunks, b"MISS");
        assert!(missing_chunk.is_none(), "Should not find MISS chunk");
    }
    
    #[test]
    fn test_validate_soundfont_structure() {
        let mut chunks = Vec::new();
        
        // Add required LIST chunk
        chunks.push(RiffChunk {
            header: awe_synth::soundfont::riff_parser::RiffChunkHeader {
                chunk_id: *b"LIST",
                chunk_size: 100,
            },
            data: vec![0; 100],
            offset: 0,
        });
        
        let result = RiffParser::validate_soundfont_structure(&chunks);
        assert!(result.is_ok(), "Valid structure should pass validation");
        
        // Test without LIST chunk
        chunks.clear();
        let result = RiffParser::validate_soundfont_structure(&chunks);
        assert!(result.is_err(), "Missing LIST chunk should fail validation");
    }
    
    #[test]
    fn test_read_u16_le() {
        let data = vec![0x34, 0x12]; // Little-endian 0x1234
        assert_eq!(RiffParser::read_u16_le(&data), 0x1234);
        
        // Test with insufficient data
        let short_data = vec![0x34];
        assert_eq!(RiffParser::read_u16_le(&short_data), 0);
    }
    
    #[test]
    fn test_chunk_methods() {
        let chunk = RiffChunk {
            header: awe_synth::soundfont::riff_parser::RiffChunkHeader {
                chunk_id: *b"TEST",
                chunk_size: 16,
            },
            data: vec![1, 2, 3, 4],
            offset: 0,
        };
        
        assert_eq!(chunk.id_string(), "TEST");
        assert!(chunk.has_id(b"TEST"));
        assert!(!chunk.has_id(b"FAIL"));
        assert_eq!(chunk.data_size(), 16);
        assert_eq!(chunk.data(), &[1, 2, 3, 4]);
    }
}

/// Test data generation and validation
#[cfg(test)]
mod test_data_validation {
    use super::*;
    
    #[test]
    fn test_create_valid_sf2_structure() {
        let sf2_data = create_test_sf2_with_all_chunks();
        
        // Verify RIFF header
        assert_eq!(&sf2_data[0..4], b"RIFF");
        assert_eq!(&sf2_data[8..12], b"sfbk");
        
        // Parse and validate
        let result = SoundFontParser::parse_soundfont(&sf2_data);
        assert!(result.is_ok(), "Test SF2 should parse successfully");
        
        let sf = result.unwrap();
        assert!(sf.header.preset_count >= 0);
        assert!(sf.header.sample_count >= 0);
    }
    
    /// Create a complete test SF2 with all required chunks
    fn create_test_sf2_with_all_chunks() -> Vec<u8> {
        let mut data = Vec::new();
        
        // RIFF header
        data.extend_from_slice(b"RIFF");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"sfbk");
        
        // INFO-list
        append_info_list(&mut data);
        
        // sdta-list (sample data)
        append_sdta_list(&mut data);
        
        // pdta-list (preset data)
        append_pdta_list(&mut data);
        
        // Update RIFF size
        let size = (data.len() - 8) as u32;
        data[4..8].copy_from_slice(&size.to_le_bytes());
        
        data
    }
    
    fn append_info_list(data: &mut Vec<u8>) {
        let list_start = data.len();
        
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"INFO");
        
        // Required chunks
        append_chunk(data, b"ifil", &[0x02, 0x00, 0x01, 0x00]); // Version 2.1
        append_chunk(data, b"INAM", b"Test SoundFont\0");
        append_chunk(data, b"ISNG", b"EMU8000\0");
        
        // Update LIST size
        let size = (data.len() - list_start - 8) as u32;
        data[list_start + 4..list_start + 8].copy_from_slice(&size.to_le_bytes());
    }
    
    fn append_sdta_list(data: &mut Vec<u8>) {
        let list_start = data.len();
        
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"sdta");
        
        // Empty sample data chunk
        append_chunk(data, b"smpl", &[]);
        
        // Update LIST size
        let size = (data.len() - list_start - 8) as u32;
        data[list_start + 4..list_start + 8].copy_from_slice(&size.to_le_bytes());
    }
    
    fn append_pdta_list(data: &mut Vec<u8>) {
        let list_start = data.len();
        
        data.extend_from_slice(b"LIST");
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Size placeholder
        data.extend_from_slice(b"pdta");
        
        // Minimal preset data chunks (all required)
        append_chunk(data, b"phdr", &[0; 38]); // One preset header
        append_chunk(data, b"pbag", &[0; 4]);  // One preset bag
        append_chunk(data, b"pmod", &[0; 10]); // One modulator
        append_chunk(data, b"pgen", &[0; 4]);  // One generator
        append_chunk(data, b"inst", &[0; 22]); // One instrument
        append_chunk(data, b"ibag", &[0; 4]);  // One instrument bag
        append_chunk(data, b"imod", &[0; 10]); // One modulator
        append_chunk(data, b"igen", &[0; 4]);  // One generator
        append_chunk(data, b"shdr", &[0; 46]); // One sample header
        
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