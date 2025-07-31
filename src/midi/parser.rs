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
        
        // For now, just skip the track data (will parse events in later tasks)
        self.position = track_end;
        
        Ok(MidiTrack {
            name: None,
            events: Vec::new(), // Will be populated in task 3.2.3+
        })
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
}