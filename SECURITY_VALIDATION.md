# AWE Player Security & Validation Framework

**⚠️ CRITICAL: All input validation must be implemented BEFORE file parsing to prevent crashes and security vulnerabilities.**

## 🔒 **Input Validation Architecture**

### **Core Security Principles:**
1. **Validate everything** - No trust in external file formats or user input
2. **Fail safely** - Invalid input causes graceful error, never crash
3. **Resource limits** - Prevent memory exhaustion and DoS attacks
4. **Bounds checking** - All array/buffer access must be validated
5. **Early rejection** - Validate file headers before parsing content

## 📁 **File Format Security**

### **SoundFont (.sf2) Validation Framework:**

```rust
// src/security/soundfont_validator.rs

use crate::error::ValidationError;

#[derive(Debug)]
pub struct SoundFontLimits {
    pub max_file_size: usize,       // 500MB max (prevent memory exhaustion)
    pub max_samples: u32,           // 65535 max samples
    pub max_presets: u32,           // 65535 max presets
    pub max_instruments: u32,       // 65535 max instruments
    pub max_sample_size: usize,     // 50MB max per sample
    pub max_sample_rate: u32,       // 192kHz max (prevent extreme rates)
    pub min_sample_rate: u32,       // 8kHz min (ensure reasonable quality)
}

impl Default for SoundFontLimits {
    fn default() -> Self {
        Self {
            max_file_size: 500 * 1024 * 1024,      // 500MB
            max_samples: 65535,
            max_presets: 65535,
            max_instruments: 65535,
            max_sample_size: 50 * 1024 * 1024,     // 50MB
            max_sample_rate: 192000,                // 192kHz
            min_sample_rate: 8000,                  // 8kHz
        }
    }
}

pub struct SoundFontValidator {
    limits: SoundFontLimits,
}

impl SoundFontValidator {
    pub fn new(limits: SoundFontLimits) -> Self {
        Self { limits }
    }

    /// Validate SoundFont file before parsing
    pub fn validate_file(&self, data: &[u8]) -> Result<(), ValidationError> {
        // 1. File size check
        if data.len() > self.limits.max_file_size {
            return Err(ValidationError::FileTooLarge {
                size: data.len(),
                max_size: self.limits.max_file_size,
            });
        }

        if data.len() < 12 {
            return Err(ValidationError::FileTooSmall);
        }

        // 2. RIFF header validation
        self.validate_riff_header(data)?;

        // 3. Quick structure validation (don't parse everything)
        self.validate_basic_structure(data)?;

        Ok(())
    }

    fn validate_riff_header(&self, data: &[u8]) -> Result<(), ValidationError> {
        // Check RIFF signature
        if &data[0..4] != b"RIFF" {
            return Err(ValidationError::InvalidFileFormat("Missing RIFF header"));
        }

        // Check sfbk signature
        if &data[8..12] != b"sfbk" {
            return Err(ValidationError::InvalidFileFormat("Not a SoundFont file"));
        }

        // Validate RIFF chunk size
        let riff_size = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;
        if riff_size + 8 != data.len() {
            return Err(ValidationError::CorruptedData("RIFF size mismatch"));
        }

        Ok(())
    }

    fn validate_basic_structure(&self, data: &[u8]) -> Result<(), ValidationError> {
        // Basic chunk validation without full parsing
        let mut offset = 12; // Skip RIFF header

        while offset < data.len() {
            if offset + 8 > data.len() {
                return Err(ValidationError::CorruptedData("Incomplete chunk header"));
            }

            let chunk_id = &data[offset..offset + 4];
            let chunk_size = u32::from_le_bytes([
                data[offset + 4], data[offset + 5], 
                data[offset + 6], data[offset + 7]
            ]) as usize;

            // Validate chunk size
            if offset + 8 + chunk_size > data.len() {
                return Err(ValidationError::CorruptedData("Chunk extends beyond file"));
            }

            // Validate known chunk types
            match chunk_id {
                b"INFO" | b"sdta" | b"pdta" => {
                    // Valid SoundFont chunks
                }
                _ => {
                    // Unknown chunk - skip but don't fail (forward compatibility)
                    crate::log(&format!("Unknown chunk type: {:?}", 
                        std::str::from_utf8(chunk_id).unwrap_or("invalid")));
                }
            }

            offset += 8 + chunk_size;
            // Align to even boundary (RIFF standard)
            if chunk_size % 2 == 1 {
                offset += 1;
            }
        }

        Ok(())
    }

    /// Validate sample data during parsing
    pub fn validate_sample(&self, sample_data: &[u8], sample_rate: u32) -> Result<(), ValidationError> {
        if sample_data.len() > self.limits.max_sample_size {
            return Err(ValidationError::SampleTooLarge {
                size: sample_data.len(),
                max_size: self.limits.max_sample_size,
            });
        }

        if sample_rate < self.limits.min_sample_rate || sample_rate > self.limits.max_sample_rate {
            return Err(ValidationError::InvalidSampleRate {
                rate: sample_rate,
                min_rate: self.limits.min_sample_rate,
                max_rate: self.limits.max_sample_rate,
            });
        }

        // Validate sample data is 16-bit aligned
        if sample_data.len() % 2 != 0 {
            return Err(ValidationError::InvalidSampleData("Sample data not 16-bit aligned"));
        }

        Ok(())
    }
}
```

### **MIDI File (.mid) Validation Framework:**

```rust
// src/security/midi_validator.rs

use crate::error::ValidationError;

#[derive(Debug)]
pub struct MidiFileLimits {
    pub max_file_size: usize,       // 10MB max MIDI file
    pub max_tracks: u16,            // 256 max tracks
    pub max_events_per_track: u32,  // 1M max events per track
    pub max_tempo: u32,             // 300 BPM max
    pub min_tempo: u32,             // 20 BPM min
    pub max_track_duration: u32,    // 1 hour max per track (in ticks)
}

impl Default for MidiFileLimits {
    fn default() -> Self {
        Self {
            max_file_size: 10 * 1024 * 1024,   // 10MB
            max_tracks: 256,
            max_events_per_track: 1_000_000,
            max_tempo: 300,                     // 300 BPM
            min_tempo: 20,                      // 20 BPM
            max_track_duration: 44100 * 3600,  // 1 hour at 44.1kHz
        }
    }
}

pub struct MidiValidator {
    limits: MidiFileLimits,
}

impl MidiValidator {
    pub fn new(limits: MidiFileLimits) -> Self {
        Self { limits }
    }

    /// Validate MIDI file before parsing
    pub fn validate_file(&self, data: &[u8]) -> Result<(), ValidationError> {
        if data.len() > self.limits.max_file_size {
            return Err(ValidationError::FileTooLarge {
                size: data.len(),
                max_size: self.limits.max_file_size,
            });
        }

        if data.len() < 14 {
            return Err(ValidationError::FileTooSmall);
        }

        // Validate MIDI header
        self.validate_midi_header(data)?;

        Ok(())
    }

    fn validate_midi_header(&self, data: &[u8]) -> Result<(), ValidationError> {
        // Check MThd signature
        if &data[0..4] != b"MThd" {
            return Err(ValidationError::InvalidFileFormat("Missing MThd header"));
        }

        // Check header length (should be 6)
        let header_len = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
        if header_len != 6 {
            return Err(ValidationError::InvalidFileFormat("Invalid MIDI header length"));
        }

        // Validate format type (0, 1, or 2)
        let format = u16::from_be_bytes([data[8], data[9]]);
        if format > 2 {
            return Err(ValidationError::InvalidFileFormat("Unsupported MIDI format"));
        }

        // Validate track count
        let track_count = u16::from_be_bytes([data[10], data[11]]);
        if track_count > self.limits.max_tracks {
            return Err(ValidationError::TooManyTracks {
                count: track_count,
                max_count: self.limits.max_tracks,
            });
        }

        // Validate division (timing)
        let division = u16::from_be_bytes([data[12], data[13]]);
        if division == 0 {
            return Err(ValidationError::InvalidFileFormat("Invalid MIDI division"));
        }

        Ok(())
    }

    /// Validate MIDI message during parsing
    pub fn validate_midi_message(&self, message: &[u8]) -> Result<(), ValidationError> {
        if message.is_empty() {
            return Err(ValidationError::InvalidMidiMessage("Empty MIDI message"));
        }

        let status = message[0];

        // Validate status byte
        if status < 0x80 {
            return Err(ValidationError::InvalidMidiMessage("Invalid status byte"));
        }

        // Validate message length based on type
        let expected_length = match status & 0xF0 {
            0x80 | 0x90 | 0xA0 | 0xB0 | 0xE0 => 3, // Note On/Off, Aftertouch, CC, Pitch Bend
            0xC0 | 0xD0 => 2,                        // Program Change, Channel Pressure
            0xF0 => {
                // System messages - variable length
                match status {
                    0xF1 | 0xF3 => 2,       // MTC Quarter Frame, Song Select
                    0xF2 => 3,              // Song Position Pointer
                    0xF6 | 0xF8..=0xFF => 1, // Tune Request, Clock, etc.
                    _ => return Ok(()),     // SysEx and other variable length
                }
            }
            _ => return Err(ValidationError::InvalidMidiMessage("Unknown message type")),
        };

        if message.len() != expected_length {
            return Err(ValidationError::InvalidMidiMessage("Incorrect message length"));
        }

        // Validate data bytes (must be < 128)
        for &byte in &message[1..] {
            if byte >= 0x80 {
                return Err(ValidationError::InvalidMidiMessage("Invalid data byte"));
            }
        }

        Ok(())
    }
}
```

## 🛡️ **Runtime Validation Framework**

### **Memory Safety Guards:**

```rust
// src/security/memory_guard.rs

use std::sync::atomic::{AtomicUsize, Ordering};
use crate::error::ValidationError;

pub struct MemoryGuard {
    current_usage: AtomicUsize,
    max_usage: usize,
    sample_memory_limit: usize,
    voice_memory_limit: usize,
}

impl MemoryGuard {
    pub fn new(max_total_mb: usize) -> Self {
        let max_usage = max_total_mb * 1024 * 1024;
        Self {
            current_usage: AtomicUsize::new(0),
            max_usage,
            sample_memory_limit: max_usage / 2,     // 50% for samples
            voice_memory_limit: max_usage / 4,      // 25% for voice data
        }
    }

    /// Attempt to allocate memory - returns error if would exceed limits
    pub fn allocate(&self, size: usize, category: MemoryCategory) -> Result<MemoryTicket, ValidationError> {
        let current = self.current_usage.load(Ordering::Relaxed);
        
        if current + size > self.max_usage {
            return Err(ValidationError::OutOfMemory {
                requested: size,
                available: self.max_usage - current,
            });
        }

        // Category-specific limits
        match category {
            MemoryCategory::Samples if size > self.sample_memory_limit => {
                return Err(ValidationError::SampleMemoryExhausted);
            }
            MemoryCategory::Voices if size > self.voice_memory_limit => {
                return Err(ValidationError::VoiceMemoryExhausted);
            }
            _ => {}
        }

        self.current_usage.fetch_add(size, Ordering::Relaxed);
        Ok(MemoryTicket { size, guard: self })
    }

    pub fn current_usage(&self) -> usize {
        self.current_usage.load(Ordering::Relaxed)
    }

    pub fn available(&self) -> usize {
        self.max_usage - self.current_usage()
    }
}

#[derive(Debug)]
pub enum MemoryCategory {
    Samples,
    Voices,
    Effects,
    General,
}

pub struct MemoryTicket<'a> {
    size: usize,
    guard: &'a MemoryGuard,
}

impl<'a> Drop for MemoryTicket<'a> {
    fn drop(&mut self) {
        self.guard.current_usage.fetch_sub(self.size, Ordering::Relaxed);
    }
}
```

### **Bounds Checking Framework:**

```rust
// src/security/bounds_checker.rs

use crate::error::ValidationError;

pub struct BoundsChecker;

impl BoundsChecker {
    /// Safe array access with bounds checking
    pub fn get_safe<T>(slice: &[T], index: usize) -> Result<&T, ValidationError> {
        slice.get(index).ok_or(ValidationError::IndexOutOfBounds {
            index,
            length: slice.len(),
        })
    }

    /// Safe array access for mutable slice
    pub fn get_safe_mut<T>(slice: &mut [T], index: usize) -> Result<&mut T, ValidationError> {
        let length = slice.len();
        slice.get_mut(index).ok_or(ValidationError::IndexOutOfBounds {
            index,
            length,
        })
    }

    /// Safe range access
    pub fn get_range_safe<T>(slice: &[T], start: usize, end: usize) -> Result<&[T], ValidationError> {
        if start > end {
            return Err(ValidationError::InvalidRange { start, end });
        }
        
        if end > slice.len() {
            return Err(ValidationError::RangeOutOfBounds {
                start,
                end,
                length: slice.len(),
            });
        }

        Ok(&slice[start..end])
    }

    /// Validate voice index for 32-voice system
    pub fn validate_voice_index(voice_index: usize) -> Result<(), ValidationError> {
        if voice_index >= 32 {
            return Err(ValidationError::InvalidVoiceIndex {
                index: voice_index,
                max_voices: 32,
            });
        }
        Ok(())
    }

    /// Validate MIDI channel (0-15)
    pub fn validate_midi_channel(channel: u8) -> Result<(), ValidationError> {
        if channel > 15 {
            return Err(ValidationError::InvalidMidiChannel { channel });
        }
        Ok(())
    }

    /// Validate MIDI data byte (0-127)
    pub fn validate_midi_data(data: u8) -> Result<(), ValidationError> {
        if data > 127 {
            return Err(ValidationError::InvalidMidiData { data });
        }
        Ok(())
    }
}

/// Macro for safe array access
#[macro_export]
macro_rules! safe_get {
    ($slice:expr, $index:expr) => {
        crate::security::bounds_checker::BoundsChecker::get_safe($slice, $index)
    };
}

#[macro_export]
macro_rules! safe_get_mut {
    ($slice:expr, $index:expr) => {
        crate::security::bounds_checker::BoundsChecker::get_safe_mut($slice, $index)
    };
}
```

## 🚨 **Error Types for Validation**

```rust
// src/error.rs (additions)

#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("File too large: {size} bytes, maximum {max_size} bytes")]
    FileTooLarge { size: usize, max_size: usize },

    #[error("File too small to be valid")]
    FileTooSmall,

    #[error("Invalid file format: {0}")]
    InvalidFileFormat(&'static str),

    #[error("Corrupted data: {0}")]
    CorruptedData(&'static str),

    #[error("Sample too large: {size} bytes, maximum {max_size} bytes")]
    SampleTooLarge { size: usize, max_size: usize },

    #[error("Invalid sample rate: {rate}Hz, must be between {min_rate}Hz and {max_rate}Hz")]
    InvalidSampleRate { rate: u32, min_rate: u32, max_rate: u32 },

    #[error("Invalid sample data: {0}")]
    InvalidSampleData(&'static str),

    #[error("Too many tracks: {count}, maximum {max_count}")]
    TooManyTracks { count: u16, max_count: u16 },

    #[error("Invalid MIDI message: {0}")]
    InvalidMidiMessage(&'static str),

    #[error("Out of memory: requested {requested} bytes, available {available} bytes")]
    OutOfMemory { requested: usize, available: usize },

    #[error("Sample memory exhausted")]
    SampleMemoryExhausted,

    #[error("Voice memory exhausted")]
    VoiceMemoryExhausted,

    #[error("Index out of bounds: index {index}, length {length}")]
    IndexOutOfBounds { index: usize, length: usize },

    #[error("Invalid range: start {start}, end {end}")]
    InvalidRange { start: usize, end: usize },

    #[error("Range out of bounds: {start}..{end}, length {length}")]
    RangeOutOfBounds { start: usize, end: usize, length: usize },

    #[error("Invalid voice index: {index}, maximum voices: {max_voices}")]
    InvalidVoiceIndex { index: usize, max_voices: usize },

    #[error("Invalid MIDI channel: {channel}, must be 0-15")]
    InvalidMidiChannel { channel: u8 },

    #[error("Invalid MIDI data: {data}, must be 0-127")]
    InvalidMidiData { data: u8 },
}
```

## 🎯 **Integration with Main Architecture**

### **Usage in SoundFont Parser:**

```rust
// src/soundfont/parser.rs (example integration)

use crate::security::{SoundFontValidator, MemoryGuard, MemoryCategory};
use crate::error::{ValidationError, SoundFontError};

pub struct SoundFontParser {
    validator: SoundFontValidator,
    memory_guard: MemoryGuard,
}

impl SoundFontParser {
    pub fn new() -> Self {
        Self {
            validator: SoundFontValidator::new(Default::default()),
            memory_guard: MemoryGuard::new(500), // 500MB limit
        }
    }

    pub fn parse(&mut self, data: &[u8]) -> Result<SoundFont, SoundFontError> {
        // 1. Validate file BEFORE parsing
        self.validator.validate_file(data)
            .map_err(SoundFontError::ValidationError)?;

        // 2. Allocate memory with guard
        let _memory_ticket = self.memory_guard
            .allocate(data.len(), MemoryCategory::Samples)
            .map_err(SoundFontError::ValidationError)?;

        // 3. Parse with bounds checking
        self.parse_internal(data)
    }

    fn parse_internal(&self, data: &[u8]) -> Result<SoundFont, SoundFontError> {
        // All array access uses safe_get! macro
        let chunk_id = safe_get!(data, 0..4)
            .map_err(SoundFontError::ValidationError)?;
        
        // ... rest of parsing with validation
        Ok(SoundFont::new())
    }
}
```

## 📊 **Security Monitoring**

### **Security Metrics:**

```rust
// src/security/metrics.rs

pub struct SecurityMetrics {
    pub validation_failures: u64,
    pub memory_allocation_failures: u64,
    pub bounds_check_failures: u64,
    pub malformed_file_attempts: u64,
    pub oversized_file_attempts: u64,
}

impl SecurityMetrics {
    pub fn record_validation_failure(&mut self, error: &ValidationError) {
        self.validation_failures += 1;
        
        match error {
            ValidationError::FileTooLarge { .. } => self.oversized_file_attempts += 1,
            ValidationError::OutOfMemory { .. } => self.memory_allocation_failures += 1,
            ValidationError::IndexOutOfBounds { .. } => self.bounds_check_failures += 1,
            ValidationError::InvalidFileFormat(_) => self.malformed_file_attempts += 1,
            _ => {}
        }

        crate::log(&format!("Security validation failure: {}", error));
    }
}
```

---

## 🚀 **Implementation Priority**

**Phase 1: Core Validation (Immediate)**
- File format validators (SoundFont, MIDI)
- Basic bounds checking framework
- Memory guard system

**Phase 2: Runtime Protection (After basic parsing)**
- Memory allocation tracking
- Resource limit enforcement
- Security metrics collection

**Phase 3: Advanced Security (After core features)**
- Malicious file detection
- Performance attack prevention
- Advanced memory analysis

This security framework ensures the EMU8000 emulator can handle malicious or malformed input gracefully while maintaining real-time audio performance.