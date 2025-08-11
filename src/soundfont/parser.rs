/**
 * SoundFont Parser - Main SF2 File Parser
 * 
 * Complete SoundFont 2.0 file parsing including header, samples, and presets
 * Task 9A.4: SF2 header parsing implementation
 */

use super::{
    SoundFontResult, SoundFontError, SampleErrorType,
    types::*,
    riff_parser::{RiffParser, RiffChunk, SoundFontRiff},
};
use crate::log;
use std::collections::HashMap;

/// Main SoundFont Parser with SF2 header parsing capability
pub struct SoundFontParser {
    /// Parsed RIFF structure
    riff_data: Option<SoundFontRiff>,
    /// INFO chunk data for header information
    info_chunks: HashMap<String, String>,
}

impl SoundFontParser {
    /// Create new SoundFont parser
    pub fn new() -> Self {
        Self {
            riff_data: None,
            info_chunks: HashMap::new(),
        }
    }
    
    /// Parse complete SF2 file - Tasks 9A.4 and 9A.5 implementation
    pub fn parse_soundfont(data: &[u8]) -> SoundFontResult<SoundFont> {
        let mut parser = Self::new();
        
        // SoundFont parsing - reduced logging to prevent flooding
        
        // Step 1: Parse RIFF container structure
        let riff = RiffParser::parse_soundfont_riff(data)?;
        
        // Step 2: Parse INFO chunk for header information
        let header = parser.parse_info_chunk(&riff.chunks)?;
        
        // Step 3: Parse sample data (sdta chunk) - Task 9A.5
        let raw_samples = Self::parse_sample_data(&riff.chunks)?;
        
        // Step 4: Parse individual sample headers and extract actual samples
        let samples = if !raw_samples.is_empty() {
            // Find pdta chunk for sample headers
            let list_chunks = RiffParser::find_chunks(&riff.chunks, b"LIST");
            let mut pdta_chunk = None;
            
            for list_chunk in list_chunks {
                if list_chunk.data.len() >= 4 && &list_chunk.data[0..4] == b"pdta" {
                    pdta_chunk = Some(list_chunk);
                    break;
                }
            }
            
            if let Some(pdta_chunk) = pdta_chunk {
                // Parse sample headers using pdta data
                let raw_sample_data = &raw_samples[0].sample_data;
                let pdta_data = &pdta_chunk.data[4..]; // Skip "pdta" identifier
                Self::parse_sample_headers(pdta_data, raw_sample_data)?
            } else {
                // No preset data debug removed
                raw_samples
            }
        } else {
            Vec::new()
        };
        
        // Step 5: Parse presets and instruments (pdta chunk) - Task 9A.6
        let (presets, instruments) = Self::parse_preset_data(&riff.chunks)?;
        
        // Store RIFF data for future use
        parser.riff_data = Some(riff);
        
        // Step 6: Create complete SoundFont structure
        let mut soundfont = SoundFont {
            header,
            presets,
            instruments,
            samples,
        };
        
        // Update header with actual counts
        soundfont.header.sample_count = soundfont.samples.len();
        soundfont.header.instrument_count = soundfont.instruments.len();
        soundfont.header.preset_count = soundfont.presets.len();
        
        // SoundFont parsing completion debug removed
        
        Ok(soundfont)
    }
    
    /// Parse INFO chunk to extract header information
    fn parse_info_chunk(&mut self, chunks: &[RiffChunk]) -> SoundFontResult<SoundFontHeader> {
        // INFO chunk parsing debug removed
        
        // Find LIST chunk containing INFO
        let list_chunks = RiffParser::find_chunks(chunks, b"LIST");
        let mut info_chunk = None;
        
        for list_chunk in list_chunks {
            if list_chunk.data.len() >= 4 && &list_chunk.data[0..4] == b"INFO" {
                info_chunk = Some(list_chunk);
                break;
            }
        }
        
        let info_chunk = info_chunk.ok_or_else(|| {
            SoundFontError::InvalidFormat {
                message: "Missing required INFO chunk in SoundFont file".to_string(),
                position: None,
            }
        })?;
        
        // INFO chunk found debug removed
        
        // Parse INFO sub-chunks (skip first 4 bytes which contain "INFO")
        let info_data = &info_chunk.data[4..];
        let info_subchunks = RiffParser::parse_chunks(info_data)?;
        
        // Extract information from sub-chunks
        for subchunk in &info_subchunks {
            let chunk_id = String::from_utf8_lossy(&subchunk.header.chunk_id).to_string();
            let chunk_data = String::from_utf8_lossy(&subchunk.data).trim_end_matches('\0').to_string();
            
            self.info_chunks.insert(chunk_id.clone(), chunk_data.clone());
            // INFO sub-chunk debug removed
        }
        
        // Build SoundFont header from INFO chunks
        self.build_soundfont_header()
    }
    
    /// Build SoundFont header from parsed INFO chunks
    fn build_soundfont_header(&self) -> SoundFontResult<SoundFontHeader> {
        let mut header = SoundFontHeader::new();
        
        // Required fields
        
        // ifil - SoundFont version (required)
        if let Some(version_data) = self.info_chunks.get("ifil") {
            // ifil chunk contains 4 bytes: major (2 bytes) + minor (2 bytes)
            if version_data.len() >= 4 {
                let version_bytes = version_data.as_bytes();
                let major = u16::from_le_bytes([version_bytes[0], version_bytes[1]]);
                let minor = u16::from_le_bytes([version_bytes[2], version_bytes[3]]);
                header.version = SoundFontVersion::new(major, minor);
                // Version debug removed
            }
        } else {
            return Err(SoundFontError::InvalidFormat {
                message: "Missing required 'ifil' (version) chunk in INFO section".to_string(),
                position: None,
            });
        }
        
        // isng - Target sound engine (required)
        if let Some(engine) = self.info_chunks.get("isng") {
            header.engine = engine.clone();
            // Engine debug removed
        } else {
            return Err(SoundFontError::InvalidFormat {
                message: "Missing required 'isng' (sound engine) chunk in INFO section".to_string(),
                position: None,
            });
        }
        
        // INAM - SoundFont name (required)
        if let Some(name) = self.info_chunks.get("INAM") {
            header.name = name.clone();
            // Name debug removed
        } else {
            return Err(SoundFontError::InvalidFormat {
                message: "Missing required 'INAM' (name) chunk in INFO section".to_string(),
                position: None,
            });
        }
        
        // Optional fields
        
        // irom - ROM version
        if let Some(rom_version) = self.info_chunks.get("irom") {
            // ROM version debug removed
        }
        
        // iver - ROM revision
        if let Some(rom_revision) = self.info_chunks.get("iver") {
            // ROM revision debug removed
        }
        
        // ICRD - Creation date
        if let Some(creation_date) = self.info_chunks.get("ICRD") {
            header.creation_date = creation_date.clone();
            // Creation date debug removed
        }
        
        // IENG - Sound engine
        if let Some(tools) = self.info_chunks.get("IENG") {
            header.tools = tools.clone();
            // Creation tools debug removed
        }
        
        // IPRD - Product
        if let Some(product) = self.info_chunks.get("IPRD") {
            header.product = product.clone();
            // Product debug removed
        }
        
        // ICOP - Copyright
        if let Some(copyright) = self.info_chunks.get("ICOP") {
            header.copyright = copyright.clone();
            // Copyright debug removed
        }
        
        // ICMT - Comments
        if let Some(comments) = self.info_chunks.get("ICMT") {
            header.comments = comments.clone();
            // Comments debug removed
        }
        
        // ISFT - Software
        if let Some(software) = self.info_chunks.get("ISFT") {
            // Creation software debug removed
        }
        
        // Validate header
        header.validate()?;
        
        // Header creation success debug removed
        
        Ok(header)
    }
    
    /// Parse sample data chunk (sdta) - Task 9A.5 implementation
    pub fn parse_sample_data(chunks: &[RiffChunk]) -> SoundFontResult<Vec<SoundFontSample>> {
        // Sample data extraction debug removed
        
        // Find LIST chunk containing sdta (sample data)
        let list_chunks = RiffParser::find_chunks(chunks, b"LIST");
        let mut sdta_chunk = None;
        
        for list_chunk in list_chunks {
            if list_chunk.data.len() >= 4 && &list_chunk.data[0..4] == b"sdta" {
                sdta_chunk = Some(list_chunk);
                break;
            }
        }
        
        let sdta_chunk = match sdta_chunk {
            Some(chunk) => chunk,
            None => {
                // No sample data debug removed
                return Ok(Vec::new());
            }
        };
        
        // Sample data chunk found debug removed
        
        // Parse sdta sub-chunks (skip first 4 bytes which contain "sdta")
        let sdta_data = &sdta_chunk.data[4..];
        let sdta_subchunks = RiffParser::parse_chunks(sdta_data)?;
        
        let mut sample_data = Vec::new();
        let mut _sample_24_data = Vec::new();
        
        // Extract sample data from sub-chunks
        for subchunk in &sdta_subchunks {
            let chunk_id = String::from_utf8_lossy(&subchunk.header.chunk_id);
            
            match &subchunk.header.chunk_id {
                b"smpl" => {
                    // 16-bit sample data (main samples)
                    // 16-bit sample data found debug removed
                    
                    // Convert bytes to 16-bit samples (little-endian)
                    if subchunk.data.len() % 2 != 0 {
                        return Err(SoundFontError::SampleError {
                            sample_name: "smpl_chunk".to_string(),
                            sample_index: None,
                            error_type: SampleErrorType::InvalidFormat,
                            message: "Sample data size not aligned to 16-bit boundaries".to_string(),
                        });
                    }
                    
                    let sample_count = subchunk.data.len() / 2;
                    for i in 0..sample_count {
                        let byte_offset = i * 2;
                        let sample_value = i16::from_le_bytes([
                            subchunk.data[byte_offset],
                            subchunk.data[byte_offset + 1]
                        ]);
                        sample_data.push(sample_value);
                    }
                    
                    // Sample extraction debug removed
                },
                b"sm24" => {
                    // 24-bit sample data (high-resolution extension)
                    // 24-bit sample extension debug removed
                    _sample_24_data = subchunk.data.clone();
                },
                _ => {
                    // Unknown sdta sub-chunk debug removed
                }
            }
        }
        
        if sample_data.is_empty() {
            // No sample data found debug removed
            return Ok(Vec::new());
        }
        
        // For now, create a single sample containing all the raw data
        // Individual sample boundaries will be determined by pdta chunk parsing in 9A.6
        let master_sample = SoundFontSample {
            name: "RAW_SAMPLE_DATA".to_string(),
            start_offset: 0,
            end_offset: sample_data.len() as u32,
            loop_start: 0,
            loop_end: sample_data.len() as u32,
            sample_rate: 44100, // Default sample rate, will be overridden by individual sample headers
            original_pitch: 60, // Middle C default
            pitch_correction: 0,
            sample_link: 0,
            sample_type: SampleType::MonoSample,
            sample_data,
        };
        
        // Sample data extraction completion debug removed
        
        Ok(vec![master_sample])
    }
    
    /// Parse individual sample headers from pdta chunk
    /// This will be called from parse_preset_data in Task 9A.6
    pub fn parse_sample_headers(pdta_data: &[u8], raw_sample_data: &[i16]) -> SoundFontResult<Vec<SoundFontSample>> {
        // Sample headers parsing debug removed
        
        // Parse pdta sub-chunks to find shdr (sample headers)
        let pdta_subchunks = RiffParser::parse_chunks(pdta_data)?;
        
        let shdr_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"shdr")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing sample header (shdr) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Sample header chunk found debug removed
        
        // Each sample header is 46 bytes
        const SAMPLE_HEADER_SIZE: usize = 46;
        if shdr_chunk.data.len() % SAMPLE_HEADER_SIZE != 0 {
            return Err(SoundFontError::SampleError {
                sample_name: "shdr_chunk".to_string(),
                sample_index: None,
                error_type: SampleErrorType::InvalidFormat,
                message: format!("Invalid sample header chunk size: {} (must be multiple of {})", 
                               shdr_chunk.data.len(), SAMPLE_HEADER_SIZE),
            });
        }
        
        let sample_count = shdr_chunk.data.len() / SAMPLE_HEADER_SIZE;
        let mut samples = Vec::new();
        let mut loop_stats = (0usize, 0usize, 0usize); // (valid_loops, invalid_loops, no_loops)
        
        for i in 0..sample_count {
            let header_offset = i * SAMPLE_HEADER_SIZE;
            let header_data = &shdr_chunk.data[header_offset..header_offset + SAMPLE_HEADER_SIZE];
            
            // Parse sample header structure
            let sample = Self::parse_single_sample_header(header_data, raw_sample_data, i)?;
            
            // Track loop statistics
            if !sample.name.is_empty() {
                if sample.loop_end > 0 {
                    loop_stats.0 += 1; // Has valid loop
                } else {
                    // Check if original had loop data that was invalid
                    let original_loop_start = u32::from_le_bytes([header_data[28], header_data[29], header_data[30], header_data[31]]);
                    let original_loop_end = u32::from_le_bytes([header_data[32], header_data[33], header_data[34], header_data[35]]);
                    
                    if original_loop_start != 0 || original_loop_end != 0 {
                        loop_stats.1 += 1; // Had invalid loop
                    } else {
                        loop_stats.2 += 1; // No loop defined
                    }
                }
                
                samples.push(sample);
            }
        }
        
        // Store loop validation info to be returned (not logged here)
        // The JavaScript layer should handle logging to the unified debug system
        
        Ok(samples)
    }
    
    /// Parse a single sample header (46 bytes)
    fn parse_single_sample_header(header_data: &[u8], raw_sample_data: &[i16], sample_index: usize) -> SoundFontResult<SoundFontSample> {
        if header_data.len() < 46 {
            return Err(SoundFontError::SampleError {
                sample_name: format!("sample_{}", sample_index),
                sample_index: Some(sample_index as u32),
                error_type: SampleErrorType::TruncatedData,
                message: "Sample header truncated".to_string(),
            });
        }
        
        // Extract sample name (20 bytes, null-terminated)
        let name_bytes = &header_data[0..20];
        let name_end = name_bytes.iter().position(|&b| b == 0).unwrap_or(20);
        let sample_name = String::from_utf8_lossy(&name_bytes[0..name_end]).to_string();
        
        // Extract sample parameters
        let start_offset = u32::from_le_bytes([header_data[20], header_data[21], header_data[22], header_data[23]]);
        let end_offset = u32::from_le_bytes([header_data[24], header_data[25], header_data[26], header_data[27]]);
        let loop_start = u32::from_le_bytes([header_data[28], header_data[29], header_data[30], header_data[31]]);
        let loop_end = u32::from_le_bytes([header_data[32], header_data[33], header_data[34], header_data[35]]);
        let sample_rate = u32::from_le_bytes([header_data[36], header_data[37], header_data[38], header_data[39]]);
        let original_pitch = header_data[40];
        let pitch_correction = header_data[41] as i8;
        let sample_link = u16::from_le_bytes([header_data[42], header_data[43]]);
        let sample_type_raw = u16::from_le_bytes([header_data[44], header_data[45]]);
        
        // Validate sample bounds
        if start_offset > end_offset {
            return Err(SoundFontError::SampleError {
                sample_name: sample_name.clone(),
                sample_index: Some(sample_index as u32),
                error_type: SampleErrorType::InvalidFormat,
                message: format!("Invalid sample bounds: start {} > end {}", start_offset, end_offset),
            });
        }
        
        if end_offset as usize > raw_sample_data.len() {
            return Err(SoundFontError::SampleError {
                sample_name: sample_name.clone(),
                sample_index: Some(sample_index as u32),
                error_type: SampleErrorType::TruncatedData,
                message: format!("Sample extends beyond data: end {} > data len {}", 
                               end_offset, raw_sample_data.len()),
            });
        }
        
        // Extract sample data slice
        let sample_data = raw_sample_data[start_offset as usize..end_offset as usize].to_vec();
        
        // Convert absolute loop positions to relative positions within the sample data
        // SF2 stores loop points as absolute positions in the global sample chunk,
        // but we need them relative to the individual sample data for playback
        
        // Check if loop points are valid and within this sample's boundaries
        let has_valid_loop = loop_start >= start_offset && 
                            loop_end > loop_start && 
                            loop_end <= end_offset;
        
        // Check if this sample has loop data defined in the SF2
        let has_loop_data = loop_start != 0 || loop_end != 0;
        
        let relative_loop_start = if has_valid_loop {
            loop_start - start_offset
        } else {
            0  // No loop or invalid loop
        };
        
        let relative_loop_end = if has_valid_loop {
            loop_end - start_offset
        } else {
            0  // No loop or invalid loop
        };
        
        // Parse sample type
        let sample_type = SampleType::from_raw(sample_type_raw)?;
        
        Ok(SoundFontSample {
            name: sample_name,
            start_offset,
            end_offset,
            loop_start: relative_loop_start,
            loop_end: relative_loop_end,
            sample_rate,
            original_pitch,
            pitch_correction,
            sample_link,
            sample_type,
            sample_data,
        })
    }
    
    /// Parse preset data chunk (pdta) - Task 9A.6 implementation
    pub fn parse_preset_data(chunks: &[RiffChunk]) -> SoundFontResult<(Vec<SoundFontPreset>, Vec<SoundFontInstrument>)> {
        // Preset data parsing debug removed
        
        // Find LIST chunk containing pdta (preset data)
        let list_chunks = RiffParser::find_chunks(chunks, b"LIST");
        let mut pdta_chunk = None;
        
        for list_chunk in list_chunks {
            if list_chunk.data.len() >= 4 && &list_chunk.data[0..4] == b"pdta" {
                pdta_chunk = Some(list_chunk);
                break;
            }
        }
        
        let pdta_chunk = match pdta_chunk {
            Some(chunk) => chunk,
            None => {
                // No preset data debug removed
                return Ok((Vec::new(), Vec::new()));
            }
        };
        
        // Preset data chunk found debug removed
        
        // Parse pdta sub-chunks (skip first 4 bytes which contain "pdta")
        let pdta_data = &pdta_chunk.data[4..];
        let pdta_subchunks = RiffParser::parse_chunks(pdta_data)?;
        
        // Parse instruments first (needed for preset zones)
        let instruments = Self::parse_instruments(&pdta_subchunks)?;
        
        // Parse presets (which reference instruments)
        let presets = Self::parse_presets(&pdta_subchunks, &instruments)?;
        
        // Preset data parsing completion debug removed
        
        Ok((presets, instruments))
    }
    
    /// Parse instrument data from pdta sub-chunks
    fn parse_instruments(pdta_subchunks: &[RiffChunk]) -> SoundFontResult<Vec<SoundFontInstrument>> {
        // Instruments parsing debug removed
        
        // Find instrument header chunk (inst)
        let inst_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"inst")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing instrument header (inst) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Find instrument bag chunk (ibag)
        let ibag_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"ibag")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing instrument bag (ibag) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Find instrument generator chunk (igen)
        let igen_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"igen")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing instrument generator (igen) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Find instrument modulator chunk (imod) - optional
        let imod_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"imod");
        
        // Instrument chunks found debug removed
        
        // Parse instrument headers (22 bytes each)
        const INST_HEADER_SIZE: usize = 22;
        if inst_chunk.data.len() % INST_HEADER_SIZE != 0 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid instrument header chunk size: {} (must be multiple of {})", 
                               inst_chunk.data.len(), INST_HEADER_SIZE),
                position: None,
            });
        }
        
        let instrument_count = inst_chunk.data.len() / INST_HEADER_SIZE;
        let mut instruments = Vec::new();
        
        // Parse instrument bag data (4 bytes each: generator_index, modulator_index)
        let bag_data = Self::parse_bag_data(&ibag_chunk.data)?;
        
        // Parse generators
        let generators = Self::parse_generators(&igen_chunk.data)?;
        
        // Parse modulators (if present)
        let modulators = if let Some(imod_chunk) = imod_chunk {
            Self::parse_modulators(&imod_chunk.data)?
        } else {
            Vec::new()
        };
        
        for i in 0..instrument_count {
            let header_offset = i * INST_HEADER_SIZE;
            let header_data = &inst_chunk.data[header_offset..header_offset + INST_HEADER_SIZE];
            
            // Parse instrument header
            let instrument = Self::parse_single_instrument_header(header_data, i, &bag_data, &generators, &modulators)?;
            
            // Skip terminal instrument (empty name)
            if !instrument.name.is_empty() {
                // Individual instrument debug removed
                instruments.push(instrument);
            }
        }
        
        // Instrument parsing completion debug removed
        Ok(instruments)
    }
    
    /// Parse preset data from pdta sub-chunks
    fn parse_presets(pdta_subchunks: &[RiffChunk], instruments: &[SoundFontInstrument]) -> SoundFontResult<Vec<SoundFontPreset>> {
        // Presets parsing debug removed
        
        // Find preset header chunk (phdr)
        let phdr_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"phdr")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing preset header (phdr) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Find preset bag chunk (pbag)
        let pbag_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"pbag")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing preset bag (pbag) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Find preset generator chunk (pgen)
        let pgen_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"pgen")
            .ok_or_else(|| SoundFontError::InvalidFormat {
                message: "Missing preset generator (pgen) chunk in pdta section".to_string(),
                position: None,
            })?;
        
        // Find preset modulator chunk (pmod) - optional
        let pmod_chunk = pdta_subchunks.iter()
            .find(|chunk| &chunk.header.chunk_id == b"pmod");
        
        // Preset chunks found debug removed
        
        // Parse preset headers (38 bytes each)
        const PRESET_HEADER_SIZE: usize = 38;
        if phdr_chunk.data.len() % PRESET_HEADER_SIZE != 0 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid preset header chunk size: {} (must be multiple of {})", 
                               phdr_chunk.data.len(), PRESET_HEADER_SIZE),
                position: None,
            });
        }
        
        let preset_count = phdr_chunk.data.len() / PRESET_HEADER_SIZE;
        let mut presets = Vec::new();
        
        // Parse preset bag data
        let bag_data = Self::parse_bag_data(&pbag_chunk.data)?;
        
        // Parse generators
        let generators = Self::parse_generators(&pgen_chunk.data)?;
        
        // Parse modulators (if present)
        let modulators = if let Some(pmod_chunk) = pmod_chunk {
            Self::parse_modulators(&pmod_chunk.data)?
        } else {
            Vec::new()
        };
        
        for i in 0..preset_count {
            let header_offset = i * PRESET_HEADER_SIZE;
            let header_data = &phdr_chunk.data[header_offset..header_offset + PRESET_HEADER_SIZE];
            
            // Parse preset header
            let preset = Self::parse_single_preset_header(header_data, i, &bag_data, &generators, &modulators, instruments)?;
            
            // Skip terminal preset (empty name)
            if !preset.name.is_empty() {
                // Individual preset debug removed
                presets.push(preset);
            }
        }
        
        // Preset parsing completion debug removed
        Ok(presets)
    }
    
    /// Parse bag data (4 bytes each: generator_index, modulator_index)
    fn parse_bag_data(bag_data: &[u8]) -> SoundFontResult<Vec<(u16, u16)>> {
        const BAG_SIZE: usize = 4;
        if bag_data.len() % BAG_SIZE != 0 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid bag chunk size: {} (must be multiple of {})", 
                               bag_data.len(), BAG_SIZE),
                position: None,
            });
        }
        
        let bag_count = bag_data.len() / BAG_SIZE;
        let mut bags = Vec::new();
        
        for i in 0..bag_count {
            let offset = i * BAG_SIZE;
            let gen_index = u16::from_le_bytes([bag_data[offset], bag_data[offset + 1]]);
            let mod_index = u16::from_le_bytes([bag_data[offset + 2], bag_data[offset + 3]]);
            bags.push((gen_index, mod_index));
        }
        
        Ok(bags)
    }
    
    /// Parse generator data (4 bytes each: type, amount)
    fn parse_generators(gen_data: &[u8]) -> SoundFontResult<Vec<Generator>> {
        const GEN_SIZE: usize = 4;
        if gen_data.len() % GEN_SIZE != 0 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid generator chunk size: {} (must be multiple of {})", 
                               gen_data.len(), GEN_SIZE),
                position: None,
            });
        }
        
        let gen_count = gen_data.len() / GEN_SIZE;
        let mut generators = Vec::new();
        
        for i in 0..gen_count {
            let offset = i * GEN_SIZE;
            let gen_type_raw = u16::from_le_bytes([gen_data[offset], gen_data[offset + 1]]);
            let gen_amount_raw = i16::from_le_bytes([gen_data[offset + 2], gen_data[offset + 3]]);
            
            // Parse generator type
            let generator_type = GeneratorType::from_raw(gen_type_raw)?;
            
            // Parse generator amount based on type
            let amount = match generator_type {
                GeneratorType::KeyRange | GeneratorType::VelRange => {
                    let low = (gen_amount_raw & 0xFF) as u8;
                    let high = ((gen_amount_raw >> 8) & 0xFF) as u8;
                    GeneratorAmount::Range { low, high }
                },
                _ => GeneratorAmount::Short(gen_amount_raw),
            };
            
            generators.push(Generator {
                generator_type,
                amount,
            });
        }
        
        Ok(generators)
    }
    
    /// Parse modulator data (10 bytes each)
    fn parse_modulators(mod_data: &[u8]) -> SoundFontResult<Vec<Modulator>> {
        const MOD_SIZE: usize = 10;
        if mod_data.len() % MOD_SIZE != 0 {
            return Err(SoundFontError::InvalidFormat {
                message: format!("Invalid modulator chunk size: {} (must be multiple of {})", 
                               mod_data.len(), MOD_SIZE),
                position: None,
            });
        }
        
        let mod_count = mod_data.len() / MOD_SIZE;
        let mut modulators = Vec::new();
        
        for i in 0..mod_count {
            let offset = i * MOD_SIZE;
            let source_enum = u16::from_le_bytes([mod_data[offset], mod_data[offset + 1]]);
            let dest_enum_raw = u16::from_le_bytes([mod_data[offset + 2], mod_data[offset + 3]]);
            let amount = i16::from_le_bytes([mod_data[offset + 4], mod_data[offset + 5]]);
            let amount_source_enum = u16::from_le_bytes([mod_data[offset + 6], mod_data[offset + 7]]);
            let trans_enum = u16::from_le_bytes([mod_data[offset + 8], mod_data[offset + 9]]);
            
            let dest_enum = GeneratorType::from_raw(dest_enum_raw)?;
            
            modulators.push(Modulator {
                source_enum,
                dest_enum,
                amount,
                amount_source_enum,
                trans_enum,
            });
        }
        
        Ok(modulators)
    }
    
    /// Parse single instrument header (22 bytes)
    fn parse_single_instrument_header(
        header_data: &[u8],
        instrument_index: usize,
        bag_data: &[(u16, u16)],
        generators: &[Generator],
        modulators: &[Modulator]
    ) -> SoundFontResult<SoundFontInstrument> {
        if header_data.len() < 22 {
            return Err(SoundFontError::InvalidFormat {
                message: "Instrument header truncated".to_string(),
                position: None,
            });
        }
        
        // Extract instrument name (20 bytes, null-terminated)
        let name_bytes = &header_data[0..20];
        let name_end = name_bytes.iter().position(|&b| b == 0).unwrap_or(20);
        let instrument_name = String::from_utf8_lossy(&name_bytes[0..name_end]).to_string();
        
        // Extract bag index
        let bag_index = u16::from_le_bytes([header_data[20], header_data[21]]) as usize;
        
        // Determine bag range for this instrument
        let next_bag_index = if instrument_index + 1 < bag_data.len() {
            // Use next instrument's bag index (from next header)
            if header_data.len() >= 44 { // Check if we have next header data
                let next_bag_idx = u16::from_le_bytes([header_data[42], header_data[43]]) as usize;
                next_bag_idx
            } else {
                bag_data.len() // Use end of bag data
            }
        } else {
            bag_data.len() // Last instrument uses all remaining bags
        };
        
        // Parse instrument zones
        let mut instrument_zones = Vec::new();
        
        for bag_idx in bag_index..next_bag_index {
            if bag_idx >= bag_data.len() {
                break;
            }
            
            let (gen_start, mod_start) = bag_data[bag_idx];
            
            // Determine generator and modulator ranges
            let gen_end = if bag_idx + 1 < bag_data.len() {
                bag_data[bag_idx + 1].0
            } else {
                generators.len() as u16
            };
            
            let mod_end = if bag_idx + 1 < bag_data.len() {
                bag_data[bag_idx + 1].1
            } else {
                modulators.len() as u16
            };
            
            // Extract generators and modulators for this zone
            let zone_generators = generators[gen_start as usize..gen_end as usize].to_vec();
            let zone_modulators = modulators[mod_start as usize..mod_end as usize].to_vec();
            
            // Extract zone parameters
            let (sample_id, key_range, velocity_range) = Self::extract_zone_parameters(&zone_generators);
            
            let zone = InstrumentZone {
                generators: zone_generators,
                modulators: zone_modulators,
                sample_id,
                key_range,
                velocity_range,
            };
            
            instrument_zones.push(zone);
        }
        
        Ok(SoundFontInstrument {
            name: instrument_name,
            instrument_bag_index: bag_index as u16,
            instrument_zones,
        })
    }
    
    /// Parse single preset header (38 bytes)
    fn parse_single_preset_header(
        header_data: &[u8],
        preset_index: usize,
        bag_data: &[(u16, u16)],
        generators: &[Generator],
        modulators: &[Modulator],
        _instruments: &[SoundFontInstrument]
    ) -> SoundFontResult<SoundFontPreset> {
        if header_data.len() < 38 {
            return Err(SoundFontError::PresetError {
                preset_name: format!("preset_{}", preset_index),
                bank: None,
                program: None,
                message: "Preset header truncated".to_string(),
            });
        }
        
        // Extract preset name (20 bytes, null-terminated)
        let name_bytes = &header_data[0..20];
        let name_end = name_bytes.iter().position(|&b| b == 0).unwrap_or(20);
        let preset_name = String::from_utf8_lossy(&name_bytes[0..name_end]).to_string();
        
        // Extract preset parameters
        let program = u16::from_le_bytes([header_data[20], header_data[21]]) as u8;
        let bank = u16::from_le_bytes([header_data[22], header_data[23]]);
        let bag_index = u16::from_le_bytes([header_data[24], header_data[25]]) as usize;
        let library = u32::from_le_bytes([header_data[26], header_data[27], header_data[28], header_data[29]]);
        let genre = u32::from_le_bytes([header_data[30], header_data[31], header_data[32], header_data[33]]);
        let morphology = u32::from_le_bytes([header_data[34], header_data[35], header_data[36], header_data[37]]);
        
        // Determine bag range for this preset (similar to instrument parsing)
        let next_bag_index = if preset_index + 1 < bag_data.len() {
            bag_data.len() // Simplified - use all remaining for now
        } else {
            bag_data.len()
        };
        
        // Parse preset zones
        let mut preset_zones = Vec::new();
        
        for bag_idx in bag_index..next_bag_index {
            if bag_idx >= bag_data.len() {
                break;
            }
            
            let (gen_start, mod_start) = bag_data[bag_idx];
            
            // Determine ranges
            let gen_end = if bag_idx + 1 < bag_data.len() {
                bag_data[bag_idx + 1].0
            } else {
                generators.len() as u16
            };
            
            let mod_end = if bag_idx + 1 < bag_data.len() {
                bag_data[bag_idx + 1].1
            } else {
                modulators.len() as u16
            };
            
            // Extract generators and modulators for this zone
            let zone_generators = generators[gen_start as usize..gen_end as usize].to_vec();
            let zone_modulators = modulators[mod_start as usize..mod_end as usize].to_vec();
            
            // Extract zone parameters
            let (instrument_id, key_range, velocity_range) = Self::extract_preset_zone_parameters(&zone_generators);
            
            let zone = PresetZone {
                generators: zone_generators,
                modulators: zone_modulators,
                instrument_id,
                key_range,
                velocity_range,
            };
            
            preset_zones.push(zone);
        }
        
        Ok(SoundFontPreset {
            name: preset_name,
            program,
            bank,
            preset_bag_index: bag_index as u16,
            library,
            genre,
            morphology,
            preset_zones,
        })
    }
    
    /// Extract zone parameters from generators (instrument zones)
    fn extract_zone_parameters(generators: &[Generator]) -> (Option<u16>, Option<KeyRange>, Option<VelocityRange>) {
        let mut sample_id = None;
        let mut key_range = None;
        let mut velocity_range = None;
        
        for generator in generators {
            match generator.generator_type {
                GeneratorType::SampleID => {
                    if let GeneratorAmount::Short(id) = generator.amount {
                        sample_id = Some(id as u16);
                    }
                },
                GeneratorType::KeyRange => {
                    if let GeneratorAmount::Range { low, high } = generator.amount {
                        key_range = KeyRange::new(low, high).ok();
                    }
                },
                GeneratorType::VelRange => {
                    if let GeneratorAmount::Range { low, high } = generator.amount {
                        velocity_range = VelocityRange::new(low, high).ok();
                    }
                },
                _ => {}
            }
        }
        
        (sample_id, key_range, velocity_range)
    }
    
    /// Extract zone parameters from generators (preset zones)
    fn extract_preset_zone_parameters(generators: &[Generator]) -> (Option<u16>, Option<KeyRange>, Option<VelocityRange>) {
        let mut instrument_id = None;
        let mut key_range = None;
        let mut velocity_range = None;
        
        for generator in generators {
            match generator.generator_type {
                GeneratorType::Instrument => {
                    if let GeneratorAmount::Short(id) = generator.amount {
                        instrument_id = Some(id as u16);
                    }
                },
                GeneratorType::KeyRange => {
                    if let GeneratorAmount::Range { low, high } = generator.amount {
                        key_range = KeyRange::new(low, high).ok();
                    }
                },
                GeneratorType::VelRange => {
                    if let GeneratorAmount::Range { low, high } = generator.amount {
                        velocity_range = VelocityRange::new(low, high).ok();
                    }
                },
                _ => {}
            }
        }
        
        (instrument_id, key_range, velocity_range)
    }
    
    /// Get parsed RIFF structure for debugging
    pub fn get_riff_info(&self) -> Option<String> {
        self.riff_data.as_ref().map(|riff| {
            format!("RIFF file size: {} bytes, format: {}, chunks: {}",
                   riff.file_size,
                   String::from_utf8_lossy(&riff.format_type),
                   riff.chunks.len())
        })
    }
    
    /// Get INFO chunk data for debugging
    pub fn get_info_chunks(&self) -> &HashMap<String, String> {
        &self.info_chunks
    }
    
    /// Validate SoundFont structure requirements
    pub fn validate_soundfont_structure(chunks: &[RiffChunk]) -> SoundFontResult<()> {
        RiffParser::validate_soundfont_structure(chunks)?;
        
        // Additional SF2-specific validation
        let list_chunks = RiffParser::find_chunks(chunks, b"LIST");
        let mut has_info = false;
        
        for list_chunk in list_chunks {
            if list_chunk.data.len() >= 4 {
                match &list_chunk.data[0..4] {
                    b"INFO" => has_info = true,
                    b"sdta" => { /* Sample data LIST chunk debug removed */ },
                    b"pdta" => { /* Preset data LIST chunk debug removed */ },
                    _ => {}
                }
            }
        }
        
        if !has_info {
            return Err(SoundFontError::InvalidFormat {
                message: "Missing required INFO LIST chunk".to_string(),
                position: None,
            });
        }
        
        // Structure validation debug removed
        Ok(())
    }
}