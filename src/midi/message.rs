use super::constants::*;

#[derive(Debug, Clone, Copy)]
pub enum MidiMessage {
    NoteOn { channel: u8, note: u8, velocity: u8 },
    NoteOff { channel: u8, note: u8, velocity: u8 },
    ProgramChange { channel: u8, program: u8 },
}

impl MidiMessage {
    pub fn channel(&self) -> u8 {
        match self {
            MidiMessage::NoteOn { channel, .. } => *channel,
            MidiMessage::NoteOff { channel, .. } => *channel,
            MidiMessage::ProgramChange { channel, .. } => *channel,
        }
    }
    
    pub fn from_bytes(data: &[u8]) -> Option<MidiMessage> {
        if data.len() < 3 { return None; }
        let status = data[0];
        let channel = status & 0x0F;
        
        let event_type = (status & 0xF0) >> 4;
        match event_type {
            MIDI_EVENT_NOTE_ON => Some(MidiMessage::NoteOn { channel, note: data[1], velocity: data[2] }),
            MIDI_EVENT_NOTE_OFF => Some(MidiMessage::NoteOff { channel, note: data[1], velocity: data[2] }),
            MIDI_EVENT_PROGRAM_CHANGE => Some(MidiMessage::ProgramChange { channel, program: data[1] }),
            _ => None,
        }
    }
}