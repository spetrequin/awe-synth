use crate::error::AweError;

/// Standard MIDI file structure
pub struct MidiFile {
    /// Format type: 0 (single track), 1 (multi-track), 2 (multi-sequence)
    pub format: u16,
    
    /// Number of tracks in the file
    pub track_count: u16,
    
    /// Time division - ticks per quarter note (if positive) or SMPTE format (if negative)
    pub division: u16,
    
    /// All tracks in the file
    pub tracks: Vec<MidiTrack>,
}

/// Individual MIDI track
pub struct MidiTrack {
    /// Track name (from track name meta event)
    pub name: Option<String>,
    
    /// All events in this track
    pub events: Vec<MidiEvent>,
}

/// MIDI event with timing information
pub struct MidiEvent {
    /// Delta time in ticks since last event
    pub delta_time: u32,
    
    /// Absolute time in ticks from start
    pub absolute_time: u64,
    
    /// The actual event data
    pub event_type: MidiEventType,
}

/// Types of MIDI events
pub enum MidiEventType {
    /// Note Off event
    NoteOff { channel: u8, note: u8, velocity: u8 },
    
    /// Note On event
    NoteOn { channel: u8, note: u8, velocity: u8 },
    
    /// Program Change event
    ProgramChange { channel: u8, program: u8 },
    
    /// Control Change event
    ControlChange { channel: u8, controller: u8, value: u8 },
    
    /// Pitch Bend event
    PitchBend { channel: u8, value: i16 },
    
    /// Meta events
    MetaEvent(MetaEventType),
    
    /// System Exclusive
    SysEx { data: Vec<u8> },
}

/// Meta event types
pub enum MetaEventType {
    /// Set tempo (microseconds per quarter note)
    SetTempo { microseconds_per_quarter: u32 },
    
    /// Time signature
    TimeSignature { numerator: u8, denominator: u8, clocks_per_click: u8, notes_per_quarter: u8 },
    
    /// Track name
    TrackName { name: String },
    
    /// End of track marker
    EndOfTrack,
}

impl MidiFile {
    /// Parse a MIDI file from bytes
    pub fn parse(data: &[u8]) -> Result<MidiFile, AweError> {
        let mut parser = MidiParser::new(data);
        parser.parse_file()
    }
}

/// Internal parser state
struct MidiParser<'a> {
    data: &'a [u8],
    position: usize,
}

impl<'a> MidiParser<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, position: 0 }
    }

    /// Parse the complete MIDI file
    fn parse_file(&mut self) -> Result<MidiFile, AweError> {
        // Parse MThd header chunk
        let (format, track_count, division) = self.parse_header()?;
        
        crate::log(&format!("MIDI Header: format={}, tracks={}, division={}", 
            format, track_count, division));
        
        // Parse all tracks
        let mut tracks = Vec::new();
        for i in 0..track_count {
            crate::log(&format!("Parsing track {}...", i));
            let track = self.parse_track()?;
            tracks.push(track);
        }
        
        Ok(MidiFile {
            format,
            track_count,
            division,
            tracks,
        })
    }

    /// Parse the MThd header chunk (14 bytes total)
    fn parse_header(&mut self) -> Result<(u16, u16, u16), AweError> {
        // Check chunk type (4 bytes) - should be "MThd"
        if self.data.len() < 14 {
            crate::log("ERROR: MIDI file too short");
            return Err(AweError::InvalidMidiFile);
        }
        
        if &self.data[0..4] != b"MThd" {
            crate::log("ERROR: Invalid MIDI header - expected MThd");
            return Err(AweError::InvalidMidiFile);
        }
        self.position += 4;
        
        // Chunk length (4 bytes) - should be 6
        let chunk_length = self.read_u32_be()?;
        if chunk_length != 6 {
            crate::log(&format!("ERROR: Invalid header length: {} (expected 6)", chunk_length));
            return Err(AweError::InvalidMidiFile);
        }
        
        // Format type (2 bytes)
        let format = self.read_u16_be()?;
        if format > 2 {
            crate::log(&format!("ERROR: Invalid MIDI format: {} (expected 0, 1, or 2)", format));
            return Err(AweError::InvalidMidiFile);
        }
        
        // Number of tracks (2 bytes)
        let track_count = self.read_u16_be()?;
        
        // Time division (2 bytes)
        let division = self.read_u16_be()?;
        
        Ok((format, track_count, division))
    }

    /// Parse a single track (MTrk chunk)
    fn parse_track(&mut self) -> Result<MidiTrack, AweError> {
        // Check chunk type (4 bytes) - should be "MTrk"
        if self.position + 8 > self.data.len() {
            crate::log("ERROR: Unexpected end of file before MTrk chunk");
            return Err(AweError::InvalidMidiFile);
        }
        
        let chunk_type = &self.data[self.position..self.position + 4];
        if chunk_type != b"MTrk" {
            crate::log(&format!("ERROR: Expected MTrk chunk, got {:?}", 
                String::from_utf8_lossy(chunk_type)));
            return Err(AweError::InvalidMidiFile);
        }
        self.position += 4;
        
        // Read chunk length (4 bytes)
        let chunk_length = self.read_u32_be()?;
        crate::log(&format!("Track chunk length: {} bytes", chunk_length));
        
        // Verify we have enough data for the track
        if self.position + chunk_length as usize > self.data.len() {
            crate::log(&format!("ERROR: Track data truncated. Expected {} bytes, have {}", 
                chunk_length, self.data.len() - self.position));
            return Err(AweError::InvalidMidiFile);
        }
        
        // Save the end position of this track
        let track_end = self.position + chunk_length as usize;
        
        // Parse all events in this track
        let mut events = Vec::new();
        let mut absolute_time = 0u64;
        let mut running_status: Option<u8> = None;
        let mut track_name: Option<String> = None;
        
        while self.position < track_end {
            // Read delta time
            let delta_time = self.read_vlq()?;
            absolute_time += delta_time as u64;
            
            // Parse the event
            let event = self.parse_event(&mut running_status)?;
            
            // Extract track name if this is a TrackName meta event
            if let MidiEventType::MetaEvent(MetaEventType::TrackName { ref name }) = event {
                track_name = Some(name.clone());
            }
            
            events.push(MidiEvent {
                delta_time,
                absolute_time,
                event_type: event,
            });
            
            // Check for End of Track
            if matches!(events.last(), Some(MidiEvent { event_type: MidiEventType::MetaEvent(MetaEventType::EndOfTrack), .. })) {
                break;
            }
        }
        
        crate::log(&format!("Parsed {} events in track", events.len()));
        
        Ok(MidiTrack {
            name: track_name,
            events,
        })
    }

    /// Parse a single MIDI event
    fn parse_event(&mut self, running_status: &mut Option<u8>) -> Result<MidiEventType, AweError> {
        let status_byte = self.read_u8()?;
        
        // Handle running status (reuse previous status byte if < 0x80)
        let actual_status = if status_byte < 0x80 {
            // This is data, not a status byte - use running status
            if let Some(status) = *running_status {
                // Put the byte back since it's data, not status
                self.position -= 1;
                status
            } else {
                crate::log("ERROR: No running status available");
                return Err(AweError::InvalidMidiFile);
            }
        } else {
            // This is a status byte
            *running_status = Some(status_byte);
            status_byte
        };
        
        let event_type = (actual_status & 0xF0) >> 4;
        let channel = actual_status & 0x0F;
        
        match event_type {
            0x8 => {
                // Note Off
                let note = self.read_u8()?;
                let velocity = self.read_u8()?;
                Ok(MidiEventType::NoteOff { channel, note, velocity })
            },
            0x9 => {
                // Note On (velocity 0 = Note Off)
                let note = self.read_u8()?;
                let velocity = self.read_u8()?;
                if velocity == 0 {
                    Ok(MidiEventType::NoteOff { channel, note, velocity })
                } else {
                    Ok(MidiEventType::NoteOn { channel, note, velocity })
                }
            },
            0xC => {
                // Program Change
                let program = self.read_u8()?;
                Ok(MidiEventType::ProgramChange { channel, program })
            },
            0xFF => {
                // Meta Event
                self.parse_meta_event()
            },
            _ => {
                // For now, skip unknown events
                crate::log(&format!("Skipping unknown event type: 0x{:02X}", event_type));
                // Skip the data bytes (most events have 1-2 data bytes)
                match event_type {
                    0xA | 0xB | 0xE => { // 2 data bytes
                        self.read_u8()?;
                        self.read_u8()?;
                    },
                    0xD => { // 1 data byte
                        self.read_u8()?;
                    },
                    _ => {
                        // Unknown, skip 1 byte and hope for the best
                        self.read_u8()?;
                    }
                }
                // Return a placeholder - in a real implementation we'd handle all event types
                Ok(MidiEventType::MetaEvent(MetaEventType::EndOfTrack))
            }
        }
    }

    /// Parse a meta event (0xFF events)
    fn parse_meta_event(&mut self) -> Result<MidiEventType, AweError> {
        let meta_type = self.read_u8()?;
        let length = self.read_vlq()?;
        
        match meta_type {
            0x51 => {
                // Set Tempo (3 bytes: microseconds per quarter note)
                if length != 3 {
                    crate::log(&format!("ERROR: Invalid tempo event length: {} (expected 3)", length));
                    return Err(AweError::InvalidMidiFile);
                }
                
                let byte1 = self.read_u8()? as u32;
                let byte2 = self.read_u8()? as u32;
                let byte3 = self.read_u8()? as u32;
                
                let microseconds_per_quarter = (byte1 << 16) | (byte2 << 8) | byte3;
                
                // Convert to BPM for logging
                let bpm = 60_000_000.0 / microseconds_per_quarter as f64;
                crate::log(&format!("Set Tempo: {} microseconds/quarter ({:.1} BPM)", 
                    microseconds_per_quarter, bpm));
                
                Ok(MidiEventType::MetaEvent(MetaEventType::SetTempo { 
                    microseconds_per_quarter 
                }))
            },
            0x58 => {
                // Time Signature (4 bytes: numerator, denominator, clocks_per_click, notes_per_quarter)
                if length != 4 {
                    crate::log(&format!("ERROR: Invalid time signature event length: {} (expected 4)", length));
                    return Err(AweError::InvalidMidiFile);
                }
                
                let numerator = self.read_u8()?;
                let denominator_power = self.read_u8()?;
                let clocks_per_click = self.read_u8()?;
                let notes_per_quarter = self.read_u8()?;
                
                // Denominator is stored as power of 2 (e.g., 2 = 2^2 = 4 for 4/4 time)
                let denominator = 1u8 << denominator_power;
                
                crate::log(&format!("Time Signature: {}/{} (clocks_per_click: {}, notes_per_quarter: {})", 
                    numerator, denominator, clocks_per_click, notes_per_quarter));
                
                Ok(MidiEventType::MetaEvent(MetaEventType::TimeSignature { 
                    numerator, 
                    denominator, 
                    clocks_per_click, 
                    notes_per_quarter 
                }))
            },
            0x03 => {
                // Track Name
                let mut name_bytes = Vec::with_capacity(length as usize);
                for _ in 0..length {
                    name_bytes.push(self.read_u8()?);
                }
                
                let name = String::from_utf8_lossy(&name_bytes).to_string();
                crate::log(&format!("Track Name: '{}'", name));
                
                Ok(MidiEventType::MetaEvent(MetaEventType::TrackName { name }))
            },
            0x2F => {
                // End of Track
                if length != 0 {
                    crate::log(&format!("WARNING: End of Track has non-zero length: {}", length));
                    // Skip the data anyway
                    for _ in 0..length {
                        self.read_u8()?;
                    }
                }
                Ok(MidiEventType::MetaEvent(MetaEventType::EndOfTrack))
            },
            _ => {
                // Skip unknown meta events
                crate::log(&format!("Skipping unknown meta event: 0x{:02X}, length: {}", meta_type, length));
                for _ in 0..length {
                    self.read_u8()?;
                }
                // Return a placeholder
                Ok(MidiEventType::MetaEvent(MetaEventType::EndOfTrack))
            }
        }
    }

    /// Read 16-bit big-endian value
    fn read_u16_be(&mut self) -> Result<u16, AweError> {
        if self.position + 2 > self.data.len() {
            crate::log("ERROR: Unexpected end of file while reading u16");
            return Err(AweError::InvalidMidiFile);
        }
        let value = u16::from_be_bytes([
            self.data[self.position],
            self.data[self.position + 1],
        ]);
        self.position += 2;
        Ok(value)
    }

    /// Read 32-bit big-endian value
    fn read_u32_be(&mut self) -> Result<u32, AweError> {
        if self.position + 4 > self.data.len() {
            crate::log("ERROR: Unexpected end of file while reading u32");
            return Err(AweError::InvalidMidiFile);
        }
        let value = u32::from_be_bytes([
            self.data[self.position],
            self.data[self.position + 1],
            self.data[self.position + 2],
            self.data[self.position + 3],
        ]);
        self.position += 4;
        Ok(value)
    }

    /// Read a variable-length quantity (VLQ)
    /// MIDI uses VLQ to encode delta times efficiently
    fn read_vlq(&mut self) -> Result<u32, AweError> {
        let mut value: u32 = 0;
        let mut byte_count = 0;
        
        loop {
            if self.position >= self.data.len() {
                crate::log("ERROR: Unexpected end of file while reading VLQ");
                return Err(AweError::InvalidMidiFile);
            }
            
            let byte = self.data[self.position];
            self.position += 1;
            byte_count += 1;
            
            // Each byte contributes 7 bits to the value
            value = (value << 7) | (byte & 0x7F) as u32;
            
            // If the high bit is not set, this is the last byte
            if (byte & 0x80) == 0 {
                break;
            }
            
            // Prevent overflow - VLQ should not exceed 4 bytes
            if byte_count > 4 {
                crate::log(&format!("ERROR: VLQ too long ({} bytes)", byte_count));
                return Err(AweError::InvalidMidiFile);
            }
        }
        
        Ok(value)
    }

    /// Read a single byte
    fn read_u8(&mut self) -> Result<u8, AweError> {
        if self.position >= self.data.len() {
            crate::log("ERROR: Unexpected end of file while reading u8");
            return Err(AweError::InvalidMidiFile);
        }
        let value = self.data[self.position];
        self.position += 1;
        Ok(value)
    }
}