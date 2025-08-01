/**
 * SoundFont 2.0 Data Types for AWE Player
 * 
 * Complete SF2 data structures for EMU8000 compatible synthesis
 * Supports all SoundFont 2.0 specifications including:
 * - Preset/Instrument/Sample hierarchy 
 * - All 58 generators for authentic EMU8000 synthesis
 * - 16-bit PCM sample data with loop points
 */

use super::{SoundFontResult, SoundFontError};
use crate::log;

/// SoundFont file header information
#[derive(Debug, Clone)]
pub struct SoundFontHeader {
    pub version: SoundFontVersion,
    pub name: String,
    pub engine: String,           // Target sound engine (e.g., "EMU8000")
    pub tools: String,           // Creation tools info
    pub creation_date: String,   // Creation date
    pub author: String,          // Author/creator
    pub product: String,         // Product name
    pub copyright: String,       // Copyright info
    pub comments: String,        // Additional comments
    pub preset_count: usize,
    pub instrument_count: usize,
    pub sample_count: usize,
}

/// SoundFont version information
#[derive(Debug, Clone, PartialEq)]
pub struct SoundFontVersion {
    pub major: u16,
    pub minor: u16,
}

/// Complete SoundFont data structure
#[derive(Debug)]
pub struct SoundFont {
    pub header: SoundFontHeader,
    pub presets: Vec<SoundFontPreset>,
    pub instruments: Vec<SoundFontInstrument>, 
    pub samples: Vec<SoundFontSample>,
}

/// SoundFont Preset (Bank/Program combination)
#[derive(Debug, Clone)]
pub struct SoundFontPreset {
    pub name: String,
    pub program: u8,             // MIDI program number (0-127)
    pub bank: u16,               // MIDI bank number (0-16383)
    pub preset_bag_index: u16,   // Index into preset bag array
    pub library: u32,            // Reserved (always 0)
    pub genre: u32,              // Reserved (always 0)
    pub morphology: u32,         // Reserved (always 0)
    pub preset_zones: Vec<PresetZone>,
}

/// Preset Zone (links presets to instruments)
#[derive(Debug, Clone)]
pub struct PresetZone {
    pub generators: Vec<Generator>,
    pub modulators: Vec<Modulator>,
    pub instrument_id: Option<u16>, // Some zones are global (no instrument)
    pub key_range: Option<KeyRange>,
    pub velocity_range: Option<VelocityRange>,
}

/// SoundFont Instrument definition
#[derive(Debug, Clone)]
pub struct SoundFontInstrument {
    pub name: String,
    pub instrument_bag_index: u16, // Index into instrument bag array
    pub instrument_zones: Vec<InstrumentZone>,
}

/// Instrument Zone (links instruments to samples)
#[derive(Debug, Clone)]
pub struct InstrumentZone {
    pub generators: Vec<Generator>,
    pub modulators: Vec<Modulator>,
    pub sample_id: Option<u16>,    // Some zones are global (no sample)
    pub key_range: Option<KeyRange>,
    pub velocity_range: Option<VelocityRange>,
}

/// SoundFont Sample data
#[derive(Debug, Clone)]
pub struct SoundFontSample {
    pub name: String,
    pub start_offset: u32,         // Sample start in sample data chunk
    pub end_offset: u32,           // Sample end offset
    pub loop_start: u32,           // Loop start offset
    pub loop_end: u32,             // Loop end offset
    pub sample_rate: u32,          // Original sample rate
    pub original_pitch: u8,        // MIDI note number (0-127)
    pub pitch_correction: i8,      // Pitch correction in cents (-50 to +50)
    pub sample_link: u16,          // Link to stereo partner sample
    pub sample_type: SampleType,   // Sample type (mono, stereo, etc.)
    pub sample_data: Vec<i16>,     // 16-bit PCM sample data
}

/// Sample type enumeration
#[derive(Debug, Clone, PartialEq)]
pub enum SampleType {
    MonoSample = 1,
    RightSample = 2,
    LeftSample = 4,
    LinkedSample = 8,
    RomMonoSample = 0x8001,
    RomRightSample = 0x8002,
    RomLeftSample = 0x8004,
    RomLinkedSample = 0x8008,
}

/// Generator (synthesis parameter)
#[derive(Debug, Clone)]
pub struct Generator {
    pub generator_type: GeneratorType,
    pub amount: GeneratorAmount,
}

/// All 58 SoundFont 2.0 generators for EMU8000 compatibility
#[derive(Debug, Clone, PartialEq)]
#[repr(u16)]
pub enum GeneratorType {
    StartAddrsOffset = 0,          // Sample start address offset
    EndAddrsOffset = 1,            // Sample end address offset
    StartloopAddrsOffset = 2,      // Loop start address offset
    EndloopAddrsOffset = 3,        // Loop end address offset
    StartAddrsCoarseOffset = 4,    // Sample start coarse offset
    ModLfoToPitch = 5,             // Modulation LFO to pitch
    VibLfoToPitch = 6,             // Vibrato LFO to pitch
    ModEnvToPitch = 7,             // Modulation envelope to pitch
    InitialFilterFc = 8,           // Initial filter cutoff frequency
    InitialFilterQ = 9,            // Initial filter Q
    ModLfoToFilterFc = 10,         // Mod LFO to filter cutoff
    ModEnvToFilterFc = 11,         // Mod envelope to filter cutoff
    EndAddrsCoarseOffset = 12,     // Sample end coarse offset
    ModLfoToVolume = 13,           // Modulation LFO to volume
    ChorusEffectsSend = 15,        // Chorus effects send
    ReverbEffectsSend = 16,        // Reverb effects send
    Pan = 17,                      // Stereo pan
    DelayModLfo = 21,              // Delay modulation LFO
    FreqModLfo = 22,               // Frequency modulation LFO
    DelayVibLfo = 23,              // Delay vibrato LFO
    FreqVibLfo = 24,               // Frequency vibrato LFO
    DelayModEnv = 25,              // Delay modulation envelope
    AttackModEnv = 26,             // Attack modulation envelope
    HoldModEnv = 27,               // Hold modulation envelope
    DecayModEnv = 28,              // Decay modulation envelope
    SustainModEnv = 29,            // Sustain modulation envelope
    ReleaseModEnv = 30,            // Release modulation envelope
    KeynumToModEnvHold = 31,       // Key number to mod env hold
    KeynumToModEnvDecay = 32,      // Key number to mod env decay
    DelayVolEnv = 33,              // Delay volume envelope
    AttackVolEnv = 34,             // Attack volume envelope
    HoldVolEnv = 35,               // Hold volume envelope
    DecayVolEnv = 36,              // Decay volume envelope
    SustainVolEnv = 37,            // Sustain volume envelope
    ReleaseVolEnv = 38,            // Release volume envelope
    KeynumToVolEnvHold = 39,       // Key number to vol env hold
    KeynumToVolEnvDecay = 40,      // Key number to vol env decay
    Instrument = 41,               // Instrument (terminal generator)
    KeyRange = 43,                 // Key range
    VelRange = 44,                 // Velocity range
    StartloopAddrsCoarseOffset = 45, // Loop start coarse offset
    Keynum = 46,                   // Key number
    Velocity = 47,                 // Velocity
    InitialAttenuation = 48,       // Initial attenuation
    EndloopAddrsCoarseOffset = 50, // Loop end coarse offset
    CoarseTune = 51,               // Coarse tune
    FineTune = 52,                 // Fine tune
    SampleID = 53,                 // Sample ID (terminal generator)
    SampleModes = 54,              // Sample modes
    ScaleTuning = 56,              // Scale tuning
    ExclusiveClass = 57,           // Exclusive class
    OverridingRootKey = 58,        // Overriding root key
}

/// Generator amount (union-like structure for different value types)
#[derive(Debug, Clone)]
pub enum GeneratorAmount {
    Short(i16),                    // Most generators use signed 16-bit
    UShort(u16),                   // Some use unsigned 16-bit
    Range { low: u8, high: u8 },   // Key/velocity ranges
}

/// Modulator (real-time parameter control)
#[derive(Debug, Clone)]
pub struct Modulator {
    pub source_enum: u16,          // Source of modulation
    pub dest_enum: GeneratorType,  // Destination generator
    pub amount: i16,               // Modulation amount
    pub amount_source_enum: u16,   // Amount source
    pub trans_enum: u16,           // Transform type
}

/// Key range for mapping samples to MIDI keys
#[derive(Debug, Clone)]
pub struct KeyRange {
    pub low: u8,                   // Lowest MIDI key (0-127)
    pub high: u8,                  // Highest MIDI key (0-127)
}

/// Velocity range for velocity layering
#[derive(Debug, Clone)]
pub struct VelocityRange {
    pub low: u8,                   // Lowest velocity (0-127)
    pub high: u8,                  // Highest velocity (0-127)
}

// Implementations

impl SoundFontHeader {
    /// Create new empty SoundFont header
    pub fn new() -> Self {
        SoundFontHeader {
            version: SoundFontVersion { major: 2, minor: 0 },
            name: String::new(),
            engine: "EMU8000".to_string(),
            tools: "AWE Player".to_string(),
            creation_date: String::new(),
            author: String::new(),
            product: String::new(),
            copyright: String::new(),
            comments: String::new(),
            preset_count: 0,
            instrument_count: 0,
            sample_count: 0,
        }
    }
    
    /// Validate header information
    pub fn validate(&self) -> SoundFontResult<()> {
        if self.name.is_empty() {
            return Err(SoundFontError::InvalidFormat {
                message: "SoundFont name cannot be empty".to_string(),
                position: None,
            });
        }
        
        if self.version.major != 2 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Unsupported SoundFont version: {}.{} (only 2.x supported)", 
                               self.version.major, self.version.minor),
                position: None,
            });
        }
        
        log(&format!("SoundFont header validated: '{}' v{}.{}", 
                   self.name, self.version.major, self.version.minor));
        Ok(())
    }
}

impl SoundFontVersion {
    /// Create version from major.minor
    pub fn new(major: u16, minor: u16) -> Self {
        Self { major, minor }
    }
    
    /// Parse version from string
    pub fn from_string(version_str: &str) -> SoundFontResult<Self> {
        let parts: Vec<&str> = version_str.split('.').collect();
        if parts.len() != 2 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid version format: '{}'", version_str),
                position: None,
            });
        }
        
        let major = parts[0].parse::<u16>().map_err(|_| {
            SoundFontError::InvalidFormat {
                message: format!("Invalid major version: '{}'", parts[0]),
                position: None,
            }
        })?;
        
        let minor = parts[1].parse::<u16>().map_err(|_| {
            SoundFontError::InvalidFormat {
                message: format!("Invalid minor version: '{}'", parts[1]),
                position: None,
            }
        })?;
        
        Ok(Self::new(major, minor))
    }
}

impl std::fmt::Display for SoundFontVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}.{}", self.major, self.minor)
    }
}

impl SampleType {
    /// Parse sample type from raw value
    pub fn from_raw(value: u16) -> SoundFontResult<Self> {
        match value {
            1 => Ok(SampleType::MonoSample),
            2 => Ok(SampleType::RightSample),
            4 => Ok(SampleType::LeftSample),
            8 => Ok(SampleType::LinkedSample),
            0x8001 => Ok(SampleType::RomMonoSample),
            0x8002 => Ok(SampleType::RomRightSample),
            0x8004 => Ok(SampleType::RomLeftSample),
            0x8008 => Ok(SampleType::RomLinkedSample),
            _ => Err(SoundFontError::InvalidFormat {
                message: format!("Invalid sample type: 0x{:04X}", value),
                position: None,
            }),
        }
    }
    
    /// Convert to raw value
    pub fn to_raw(&self) -> u16 {
        match self {
            SampleType::MonoSample => 1,
            SampleType::RightSample => 2,
            SampleType::LeftSample => 4,
            SampleType::LinkedSample => 8,
            SampleType::RomMonoSample => 0x8001,
            SampleType::RomRightSample => 0x8002,
            SampleType::RomLeftSample => 0x8004,
            SampleType::RomLinkedSample => 0x8008,
        }
    }
}

impl GeneratorType {
    /// Parse generator type from raw value
    pub fn from_raw(value: u16) -> SoundFontResult<Self> {
        match value {
            0 => Ok(GeneratorType::StartAddrsOffset),
            1 => Ok(GeneratorType::EndAddrsOffset),
            2 => Ok(GeneratorType::StartloopAddrsOffset),
            3 => Ok(GeneratorType::EndloopAddrsOffset),
            4 => Ok(GeneratorType::StartAddrsCoarseOffset),
            5 => Ok(GeneratorType::ModLfoToPitch),
            6 => Ok(GeneratorType::VibLfoToPitch),
            7 => Ok(GeneratorType::ModEnvToPitch),
            8 => Ok(GeneratorType::InitialFilterFc),
            9 => Ok(GeneratorType::InitialFilterQ),
            10 => Ok(GeneratorType::ModLfoToFilterFc),
            11 => Ok(GeneratorType::ModEnvToFilterFc),
            12 => Ok(GeneratorType::EndAddrsCoarseOffset),
            13 => Ok(GeneratorType::ModLfoToVolume),
            15 => Ok(GeneratorType::ChorusEffectsSend),
            16 => Ok(GeneratorType::ReverbEffectsSend),
            17 => Ok(GeneratorType::Pan),
            21 => Ok(GeneratorType::DelayModLfo),
            22 => Ok(GeneratorType::FreqModLfo),
            23 => Ok(GeneratorType::DelayVibLfo),
            24 => Ok(GeneratorType::FreqVibLfo),
            25 => Ok(GeneratorType::DelayModEnv),
            26 => Ok(GeneratorType::AttackModEnv),
            27 => Ok(GeneratorType::HoldModEnv),
            28 => Ok(GeneratorType::DecayModEnv),
            29 => Ok(GeneratorType::SustainModEnv),
            30 => Ok(GeneratorType::ReleaseModEnv),
            31 => Ok(GeneratorType::KeynumToModEnvHold),
            32 => Ok(GeneratorType::KeynumToModEnvDecay),
            33 => Ok(GeneratorType::DelayVolEnv),
            34 => Ok(GeneratorType::AttackVolEnv),
            35 => Ok(GeneratorType::HoldVolEnv),
            36 => Ok(GeneratorType::DecayVolEnv),
            37 => Ok(GeneratorType::SustainVolEnv),
            38 => Ok(GeneratorType::ReleaseVolEnv),
            39 => Ok(GeneratorType::KeynumToVolEnvHold),
            40 => Ok(GeneratorType::KeynumToVolEnvDecay),
            41 => Ok(GeneratorType::Instrument),
            43 => Ok(GeneratorType::KeyRange),
            44 => Ok(GeneratorType::VelRange),
            45 => Ok(GeneratorType::StartloopAddrsCoarseOffset),
            46 => Ok(GeneratorType::Keynum),
            47 => Ok(GeneratorType::Velocity),
            48 => Ok(GeneratorType::InitialAttenuation),
            50 => Ok(GeneratorType::EndloopAddrsCoarseOffset),
            51 => Ok(GeneratorType::CoarseTune),
            52 => Ok(GeneratorType::FineTune),
            53 => Ok(GeneratorType::SampleID),
            54 => Ok(GeneratorType::SampleModes),
            56 => Ok(GeneratorType::ScaleTuning),
            57 => Ok(GeneratorType::ExclusiveClass),
            58 => Ok(GeneratorType::OverridingRootKey),
            _ => Err(SoundFontError::GeneratorError {
                generator_type: value,
                value: 0,
                expected_range: (0, 58),
                message: format!("Unknown generator type: {}", value),
            }),
        }
    }
    
    /// Get generator name for debugging
    pub fn name(&self) -> &'static str {
        match self {
            GeneratorType::StartAddrsOffset => "startAddrsOffset",
            GeneratorType::EndAddrsOffset => "endAddrsOffset",
            GeneratorType::StartloopAddrsOffset => "startloopAddrsOffset",
            GeneratorType::EndloopAddrsOffset => "endloopAddrsOffset",
            GeneratorType::StartAddrsCoarseOffset => "startAddrsCoarseOffset",
            GeneratorType::ModLfoToPitch => "modLfoToPitch",
            GeneratorType::VibLfoToPitch => "vibLfoToPitch",
            GeneratorType::ModEnvToPitch => "modEnvToPitch",
            GeneratorType::InitialFilterFc => "initialFilterFc",
            GeneratorType::InitialFilterQ => "initialFilterQ",
            GeneratorType::ModLfoToFilterFc => "modLfoToFilterFc",
            GeneratorType::ModEnvToFilterFc => "modEnvToFilterFc",
            GeneratorType::EndAddrsCoarseOffset => "endAddrsCoarseOffset",
            GeneratorType::ModLfoToVolume => "modLfoToVolume",
            GeneratorType::ChorusEffectsSend => "chorusEffectsSend",
            GeneratorType::ReverbEffectsSend => "reverbEffectsSend",
            GeneratorType::Pan => "pan",
            GeneratorType::DelayModLfo => "delayModLfo",
            GeneratorType::FreqModLfo => "freqModLfo",
            GeneratorType::DelayVibLfo => "delayVibLfo",
            GeneratorType::FreqVibLfo => "freqVibLfo",
            GeneratorType::DelayModEnv => "delayModEnv",
            GeneratorType::AttackModEnv => "attackModEnv",
            GeneratorType::HoldModEnv => "holdModEnv",
            GeneratorType::DecayModEnv => "decayModEnv",
            GeneratorType::SustainModEnv => "sustainModEnv",
            GeneratorType::ReleaseModEnv => "releaseModEnv",
            GeneratorType::KeynumToModEnvHold => "keynumToModEnvHold",
            GeneratorType::KeynumToModEnvDecay => "keynumToModEnvDecay",
            GeneratorType::DelayVolEnv => "delayVolEnv",
            GeneratorType::AttackVolEnv => "attackVolEnv",
            GeneratorType::HoldVolEnv => "holdVolEnv",
            GeneratorType::DecayVolEnv => "decayVolEnv",
            GeneratorType::SustainVolEnv => "sustainVolEnv",
            GeneratorType::ReleaseVolEnv => "releaseVolEnv",
            GeneratorType::KeynumToVolEnvHold => "keynumToVolEnvHold",
            GeneratorType::KeynumToVolEnvDecay => "keynumToVolEnvDecay",
            GeneratorType::Instrument => "instrument",
            GeneratorType::KeyRange => "keyRange",
            GeneratorType::VelRange => "velRange",
            GeneratorType::StartloopAddrsCoarseOffset => "startloopAddrsCoarseOffset",
            GeneratorType::Keynum => "keynum",
            GeneratorType::Velocity => "velocity",
            GeneratorType::InitialAttenuation => "initialAttenuation",
            GeneratorType::EndloopAddrsCoarseOffset => "endloopAddrsCoarseOffset",
            GeneratorType::CoarseTune => "coarseTune",
            GeneratorType::FineTune => "fineTune",
            GeneratorType::SampleID => "sampleID",
            GeneratorType::SampleModes => "sampleModes",
            GeneratorType::ScaleTuning => "scaleTuning",
            GeneratorType::ExclusiveClass => "exclusiveClass",
            GeneratorType::OverridingRootKey => "overridingRootKey",
        }
    }
}

impl KeyRange {
    /// Create new key range
    pub fn new(low: u8, high: u8) -> SoundFontResult<Self> {
        if low > 127 || high > 127 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid key range: {}-{} (must be 0-127)", low, high),
                position: None,
            });
        }
        
        if low > high {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid key range: {} > {} (low must be <= high)", low, high),
                position: None,
            });
        }
        
        Ok(Self { low, high })
    }
    
    /// Check if key is in range
    pub fn contains(&self, key: u8) -> bool {
        key >= self.low && key <= self.high
    }
}

impl VelocityRange {
    /// Create new velocity range
    pub fn new(low: u8, high: u8) -> SoundFontResult<Self> {
        if low > 127 || high > 127 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid velocity range: {}-{} (must be 0-127)", low, high),
                position: None,
            });
        }
        
        if low > high {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid velocity range: {} > {} (low must be <= high)", low, high),
                position: None,
            });
        }
        
        Ok(Self { low, high })
    }
    
    /// Check if velocity is in range
    pub fn contains(&self, velocity: u8) -> bool {
        velocity >= self.low && velocity <= self.high
    }
}