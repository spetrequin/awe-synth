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
        
        match status & 0xF0 {
            0x90 => Some(MidiMessage::NoteOn { channel, note: data[1], velocity: data[2] }),
            0x80 => Some(MidiMessage::NoteOff { channel, note: data[1], velocity: data[2] }),
            0xC0 => Some(MidiMessage::ProgramChange { channel, program: data[1] }),
            _ => None,
        }
    }
}