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