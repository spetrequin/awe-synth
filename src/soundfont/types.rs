#[derive(Debug, Clone)]
pub struct SoundFontHeader {
    pub version: u16,
    pub name: String,
    pub preset_count: usize,
    pub instrument_count: usize,
    pub sample_count: usize,
}

impl SoundFontHeader {
    pub fn new() -> Self {
        SoundFontHeader {
            version: 0,
            name: String::new(),
            preset_count: 0,
            instrument_count: 0,
            sample_count: 0,
        }
    }
}