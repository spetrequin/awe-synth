use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub enum AweError {
    InvalidSoundFont,
    InvalidMidiFile,
    VoiceAllocationFailed,
    SampleNotFound,
    AudioProcessingError,
}

impl std::fmt::Display for AweError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AweError::InvalidSoundFont => write!(f, "Invalid SoundFont file format"),
            AweError::InvalidMidiFile => write!(f, "Invalid MIDI file format"),
            AweError::VoiceAllocationFailed => write!(f, "Failed to allocate voice"),
            AweError::SampleNotFound => write!(f, "Sample not found in SoundFont"),
            AweError::AudioProcessingError => write!(f, "Audio processing error"),
        }
    }
}

impl std::error::Error for AweError {}

pub type AweResult<T> = Result<T, AweError>;