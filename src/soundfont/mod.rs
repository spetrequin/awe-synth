/**
 * SoundFont 2.0 Implementation for AWE Player
 * 
 * Complete SF2 file format support for authentic EMU8000 synthesis
 * Maintains EMU8000 compatibility while providing modern error handling
 * 
 * SoundFont 2.0 Structure:
 * - RIFF container with INFO, sdta (sample data), and pdta (preset data) chunks
 * - Hierarchical structure: Presets → Instruments → Samples
 * - All 58 SoundFont generators supported for EMU8000 authenticity
 */

use crate::log;

// Module declarations
pub mod riff_parser;
pub mod types;
pub mod parser;

// Re-export main types for convenience
pub use types::*;
pub use parser::SoundFontParser;

/// SoundFont-specific error types with comprehensive context
#[derive(Debug, Clone)]
pub enum SoundFontError {
    /// Invalid file format or corrupted data
    InvalidFormat { 
        message: String,
        position: Option<usize>,
    },
    
    /// RIFF chunk parsing errors
    RiffError {
        chunk_type: String,
        expected_size: Option<u32>,
        actual_size: u32,
        message: String,
    },
    
    /// Sample data extraction errors
    SampleError {
        sample_name: String,
        sample_index: Option<u32>,
        error_type: SampleErrorType,
        message: String,
    },
    
    /// Preset/Instrument hierarchy errors
    PresetError {
        preset_name: String,
        bank: Option<u8>,
        program: Option<u8>,
        message: String,
    },
    
    /// Generator parameter validation errors
    GeneratorError {
        generator_type: u16,
        value: i16,
        expected_range: (i16, i16),
        message: String,
    },
    
    /// Memory allocation or resource errors
    ResourceError {
        resource_type: String,
        requested_size: Option<usize>,
        available_size: Option<usize>,
        message: String,
    },
    
    /// I/O errors (file reading, etc.)
    IoError {
        file_path: Option<String>,
        operation: String,
        message: String,
    },
}

/// Specific sample-related error types
#[derive(Debug, Clone)]
pub enum SampleErrorType {
    InvalidFormat,
    MissingLoopPoints,
    InvalidSampleRate,
    DataCorruption,
    UnsupportedBitDepth,
    TruncatedData,
}

impl std::fmt::Display for SoundFontError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SoundFontError::InvalidFormat { message, position } => {
                if let Some(pos) = position {
                    write!(f, "SoundFont format error at position {}: {}", pos, message)
                } else {
                    write!(f, "SoundFont format error: {}", message)
                }
            }
            SoundFontError::RiffError { chunk_type, expected_size, actual_size, message } => {
                if let Some(expected) = expected_size {
                    write!(f, "RIFF chunk '{}' error: expected {} bytes, got {} bytes - {}", 
                           chunk_type, expected, actual_size, message)
                } else {
                    write!(f, "RIFF chunk '{}' error: {} bytes - {}", 
                           chunk_type, actual_size, message)
                }
            }
            SoundFontError::SampleError { sample_name, sample_index, error_type, message } => {
                let index_str = sample_index.map(|i| format!(" (index {})", i)).unwrap_or_default();
                write!(f, "Sample '{}'{} {:?} error: {}", sample_name, index_str, error_type, message)
            }
            SoundFontError::PresetError { preset_name, bank, program, message } => {
                let location = match (bank, program) {
                    (Some(b), Some(p)) => format!(" (bank {}, program {})", b, p),
                    (Some(b), None) => format!(" (bank {})", b),
                    (None, Some(p)) => format!(" (program {})", p),
                    (None, None) => String::new(),
                };
                write!(f, "Preset '{}'{} error: {}", preset_name, location, message)
            }
            SoundFontError::GeneratorError { generator_type, value, expected_range, message } => {
                write!(f, "Generator {} error: value {} outside range {:?} - {}", 
                       generator_type, value, expected_range, message)
            }
            SoundFontError::ResourceError { resource_type, requested_size, available_size, message } => {
                match (requested_size, available_size) {
                    (Some(req), Some(avail)) => {
                        write!(f, "{} resource error: requested {} bytes, {} bytes available - {}", 
                               resource_type, req, avail, message)
                    }
                    (Some(req), None) => {
                        write!(f, "{} resource error: requested {} bytes - {}", 
                               resource_type, req, message)
                    }
                    _ => write!(f, "{} resource error: {}", resource_type, message),
                }
            }
            SoundFontError::IoError { file_path, operation, message } => {
                if let Some(path) = file_path {
                    write!(f, "I/O error during {} on '{}': {}", operation, path, message)
                } else {
                    write!(f, "I/O error during {}: {}", operation, message)
                }
            }
        }
    }
}

impl std::error::Error for SoundFontError {}

/// Result type for SoundFont operations
pub type SoundFontResult<T> = Result<T, SoundFontError>;

/// SoundFont module initialization and utilities
pub struct SoundFontModule;

impl SoundFontModule {
    /// Initialize the SoundFont module with logging
    pub fn initialize() -> SoundFontResult<()> {
        log("SoundFont module initialized - EMU8000 compatible SF2 parser ready");
        Ok(())
    }
    
    /// Validate SoundFont file header without full parsing
    pub fn validate_soundfont_header(data: &[u8]) -> SoundFontResult<bool> {
        if data.len() < 12 {
            return Err(SoundFontError::InvalidFormat {
                message: "File too small to contain RIFF header".to_string(),
                position: Some(0),
            });
        }
        
        // Check RIFF signature
        if &data[0..4] != b"RIFF" {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid RIFF signature: expected 'RIFF', found '{}'", 
                                String::from_utf8_lossy(&data[0..4])),
                position: Some(0),
            });
        }
        
        // Check sfbk signature at offset 8
        if &data[8..12] != b"sfbk" {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid SoundFont signature: expected 'sfbk', found '{}'", 
                                String::from_utf8_lossy(&data[8..12])),
                position: Some(8),
            });
        }
        
        log("SoundFont header validation passed - valid SF2 file format");
        Ok(true)
    }
    
    /// Get SoundFont format version string
    pub fn get_format_version() -> &'static str {
        "SF2.0" // EMU8000 supports SoundFont 2.0 format
    }
    
    /// Check if the module supports the given SoundFont version
    pub fn supports_version(version: &str) -> bool {
        matches!(version, "SF2.0" | "SF2.01" | "SF2.1")
    }
}

/// Helper function to create format errors with position
pub fn format_error(message: &str, position: usize) -> SoundFontError {
    SoundFontError::InvalidFormat {
        message: message.to_string(),
        position: Some(position),
    }
}

/// Helper function to create RIFF errors
pub fn riff_error(chunk_type: &str, actual_size: u32, message: &str) -> SoundFontError {
    SoundFontError::RiffError {
        chunk_type: chunk_type.to_string(),
        expected_size: None,
        actual_size,
        message: message.to_string(),
    }
}

/// Helper function to create sample errors
pub fn sample_error(sample_name: &str, error_type: SampleErrorType, message: &str) -> SoundFontError {
    SoundFontError::SampleError {
        sample_name: sample_name.to_string(),
        sample_index: None,
        error_type,
        message: message.to_string(),
    }
}

/// Helper function to create preset errors
pub fn preset_error(preset_name: &str, message: &str) -> SoundFontError {
    SoundFontError::PresetError {
        preset_name: preset_name.to_string(),
        bank: None,
        program: None,
        message: message.to_string(),
    }
}

/// Helper function to create generator errors
pub fn generator_error(generator_type: u16, value: i16, expected_range: (i16, i16), message: &str) -> SoundFontError {
    SoundFontError::GeneratorError {
        generator_type,
        value,
        expected_range,
        message: message.to_string(),
    }
}

/// Debug formatting for SoundFont module status
impl std::fmt::Display for SoundFontModule {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SoundFont Module v{} - EMU8000 Compatible", Self::get_format_version())
    }
}