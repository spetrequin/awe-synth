/**
 * RIFF Chunk Parser for SoundFont 2.0 Files
 * 
 * Handles binary parsing of RIFF container format used by SF2 files
 * Complete implementation for SF2 RIFF structure parsing
 */

use super::{SoundFontResult, SoundFontError};
use crate::log;

/// RIFF chunk header structure (8 bytes)
#[derive(Debug, Clone)]
pub struct RiffChunkHeader {
    pub chunk_id: [u8; 4],    // 4-byte chunk identifier
    pub chunk_size: u32,      // Size of chunk data (excluding header)
}

/// RIFF chunk with header and data
#[derive(Debug, Clone)]
pub struct RiffChunk {
    pub header: RiffChunkHeader,
    pub data: Vec<u8>,
    pub offset: usize,        // Position in file
}

/// SoundFont RIFF structure
#[derive(Debug, Clone)]
pub struct SoundFontRiff {
    pub file_size: u32,
    pub format_type: [u8; 4], // Should be "sfbk"
    pub chunks: Vec<RiffChunk>,
}

/// RIFF Parser for SoundFont files
pub struct RiffParser;

impl RiffParser {
    /// Create new RIFF parser
    pub fn new() -> Self {
        Self
    }
    
    /// Parse complete RIFF structure from SF2 file data
    pub fn parse_soundfont_riff(data: &[u8]) -> SoundFontResult<SoundFontRiff> {
        if data.len() < 12 {
            return Err(SoundFontError::InvalidFormat {
                message: "File too small for RIFF header".to_string(),
                position: Some(0),
            });
        }
        
        // RIFF parsing - reduced logging
        
        // Parse main RIFF header
        let riff_header = Self::read_u32_le(&data[0..4]);
        if riff_header != 0x46464952 { // "RIFF" in little-endian
            return Err(SoundFontError::InvalidFormat {
                message: "Invalid RIFF signature".to_string(),
                position: Some(0),
            });
        }
        
        let file_size = Self::read_u32_le(&data[4..8]);
        let format_type = [
            data[8], data[9], data[10], data[11]
        ];
        
        // Verify SoundFont format
        if &format_type != b"sfbk" {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid SoundFont format: expected 'sfbk', found '{}'",
                               String::from_utf8_lossy(&format_type)),
                position: Some(8),
            });
        }
        
        // RIFF header parsing debug removed
        
        // Parse all chunks starting after main header
        let chunks = Self::parse_chunks(&data[12..])?;
        
        // RIFF parsing completion debug removed
        
        Ok(SoundFontRiff {
            file_size,
            format_type,
            chunks,
        })
    }
    
    /// Parse all RIFF chunks from data
    pub fn parse_chunks(data: &[u8]) -> SoundFontResult<Vec<RiffChunk>> {
        let mut chunks = Vec::new();
        let mut offset = 0;
        
        while offset + 8 <= data.len() {
            // Read chunk header (8 bytes)
            let chunk_id = [
                data[offset], data[offset + 1], data[offset + 2], data[offset + 3]
            ];
            let chunk_size = Self::read_u32_le(&data[offset + 4..offset + 8]);
            
            let header = RiffChunkHeader {
                chunk_id,
                chunk_size,
            };
            
            // Calculate padded size (RIFF chunks are word-aligned)
            let padded_size = if chunk_size % 2 == 0 { chunk_size } else { chunk_size + 1 };
            let data_end = offset + 8 + padded_size as usize;
            
            if data_end > data.len() {
                return Err(SoundFontError::RiffError {
                    chunk_type: String::from_utf8_lossy(&chunk_id).to_string(),
                    expected_size: Some(chunk_size),
                    actual_size: (data.len() - offset - 8) as u32,
                    message: "Chunk extends beyond file end".to_string(),
                });
            }
            
            // Extract chunk data (without padding)
            let chunk_data = data[offset + 8..offset + 8 + chunk_size as usize].to_vec();
            
            let chunk = RiffChunk {
                header,
                data: chunk_data,
                offset,
            };
            
            // RIFF chunk logging removed to prevent flooding
            
            chunks.push(chunk);
            offset = data_end;
        }
        
        Ok(chunks)
    }
    
    /// Find chunk by ID (4-byte identifier)
    pub fn find_chunk<'a>(chunks: &'a [RiffChunk], chunk_id: &[u8; 4]) -> Option<&'a RiffChunk> {
        chunks.iter().find(|chunk| &chunk.header.chunk_id == chunk_id)
    }
    
    /// Find all chunks with matching ID
    pub fn find_chunks<'a>(chunks: &'a [RiffChunk], chunk_id: &[u8; 4]) -> Vec<&'a RiffChunk> {
        chunks.iter().filter(|chunk| &chunk.header.chunk_id == chunk_id).collect()
    }
    
    /// Read u32 value in little-endian format
    fn read_u32_le(bytes: &[u8]) -> u32 {
        if bytes.len() < 4 {
            return 0;
        }
        u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])
    }
    
    /// Read u16 value in little-endian format
    pub fn read_u16_le(bytes: &[u8]) -> u16 {
        if bytes.len() < 2 {
            return 0;
        }
        u16::from_le_bytes([bytes[0], bytes[1]])
    }
    
    /// Validate expected SoundFont chunks are present
    pub fn validate_soundfont_structure(chunks: &[RiffChunk]) -> SoundFontResult<()> {
        // Check for required INFO chunk
        if Self::find_chunk(chunks, b"LIST").is_none() {
            return Err(SoundFontError::InvalidFormat {
                message: "Missing required LIST chunk".to_string(),
                position: None,
            });
        }
        
        // Check for sample data chunk (sdta)
        if Self::find_chunk(chunks, b"sdta").is_none() {
            // No sample data warning debug removed
        }
        
        // Check for preset data chunk (pdta)
        if Self::find_chunk(chunks, b"pdta").is_none() {
            // No preset data warning debug removed
        }
        
        // RIFF structure validation debug removed
        Ok(())
    }
}

/// Helper functions for chunk data parsing
impl RiffChunk {
    /// Get chunk ID as string
    pub fn id_string(&self) -> String {
        String::from_utf8_lossy(&self.header.chunk_id).to_string()
    }
    
    /// Check if chunk has expected ID
    pub fn has_id(&self, expected_id: &[u8; 4]) -> bool {
        &self.header.chunk_id == expected_id
    }
    
    /// Get chunk data size
    pub fn data_size(&self) -> u32 {
        self.header.chunk_size
    }
    
    /// Get chunk data as slice
    pub fn data(&self) -> &[u8] {
        &self.data
    }
}