/// MIDI event type constants (upper nibble of status byte >> 4)
pub const MIDI_EVENT_NOTE_OFF: u8 = 0x8;
pub const MIDI_EVENT_NOTE_ON: u8 = 0x9;
pub const MIDI_EVENT_POLYPHONIC_PRESSURE: u8 = 0xA;
pub const MIDI_EVENT_CONTROL_CHANGE: u8 = 0xB;
pub const MIDI_EVENT_PROGRAM_CHANGE: u8 = 0xC;
pub const MIDI_EVENT_CHANNEL_PRESSURE: u8 = 0xD;
pub const MIDI_EVENT_PITCH_BEND: u8 = 0xE;
pub const MIDI_EVENT_SYSTEM: u8 = 0xF;

/// Full status byte constants (for special cases)
pub const MIDI_STATUS_META_EVENT: u8 = 0xFF;
pub const MIDI_STATUS_SYSEX_START: u8 = 0xF0;
pub const MIDI_STATUS_SYSEX_END: u8 = 0xF7;

/// MIDI meta event type constants
pub const META_EVENT_SEQUENCE_NUMBER: u8 = 0x00;
pub const META_EVENT_TEXT: u8 = 0x01;
pub const META_EVENT_COPYRIGHT: u8 = 0x02;
pub const META_EVENT_TRACK_NAME: u8 = 0x03;
pub const META_EVENT_INSTRUMENT_NAME: u8 = 0x04;
pub const META_EVENT_LYRIC: u8 = 0x05;
pub const META_EVENT_MARKER: u8 = 0x06;
pub const META_EVENT_CUE_POINT: u8 = 0x07;
pub const META_EVENT_CHANNEL_PREFIX: u8 = 0x20;
pub const META_EVENT_END_OF_TRACK: u8 = 0x2F;
pub const META_EVENT_SET_TEMPO: u8 = 0x51;
pub const META_EVENT_SMPTE_OFFSET: u8 = 0x54;
pub const META_EVENT_TIME_SIGNATURE: u8 = 0x58;
pub const META_EVENT_KEY_SIGNATURE: u8 = 0x59;
pub const META_EVENT_SEQUENCER_SPECIFIC: u8 = 0x7F;

/// Common MIDI controller numbers
pub const MIDI_CC_MODULATION: u8 = 0x01;
pub const MIDI_CC_VOLUME: u8 = 0x07;
pub const MIDI_CC_PAN: u8 = 0x0A;
pub const MIDI_CC_SUSTAIN: u8 = 0x40;
pub const MIDI_CC_ALL_SOUND_OFF: u8 = 0x78;
pub const MIDI_CC_ALL_NOTES_OFF: u8 = 0x7B;

/// MIDI channel constants
pub const MIDI_CHANNEL_COUNT: u8 = 16;
pub const MIDI_DRUM_CHANNEL: u8 = 9;  // Channel 10 (0-indexed)

/// MIDI note constants
pub const MIDI_NOTE_MIN: u8 = 0;
pub const MIDI_NOTE_MAX: u8 = 127;
pub const MIDI_MIDDLE_C: u8 = 60;

/// MIDI velocity constants
pub const MIDI_VELOCITY_MIN: u8 = 0;
pub const MIDI_VELOCITY_MAX: u8 = 127;