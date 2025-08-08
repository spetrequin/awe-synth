# MultiZoneSampleVoice Complete Design Specification

**Purpose**: Complete specification for the NEW MultiZoneSampleVoice system built from scratch with all EMU8000 effects integrated from the start.

**Phase 20.1.4**: Design document for complete voice system rebuild  
**Status**: This is a fresh implementation, NOT a consolidation of existing broken code

## 🎯 Design Goals

### **1. EMU8000 Authenticity**
- **Multi-zone sample layering**: Multiple samples per note with velocity/key splitting
- **Complete effects chain**: All EMU8000 effects processing per voice
- **Authentic parameter ranges**: Filter 100Hz-8kHz, LFO 0.1-20Hz, etc.
- **Proper voice stealing**: EMU8000 priority algorithm

### **2. SoundFont 2.0 Compliance**
- **All 58 generators**: Complete implementation without filtering
- **Velocity crossfading**: Smooth transitions between layers
- **Key range splitting**: Proper zone selection
- **Sample loop support**: Seamless looping with proper boundaries

### **3. Performance Requirements**
- **32-voice polyphony**: Real-time processing at 44.1kHz
- **Zero allocations**: Pre-allocated buffers in audio processing
- **SIMD optimization**: Where applicable for multiple layers
- **Memory efficiency**: Minimal per-voice footprint

## 🏗️ MultiZoneSampleVoice Structure

```rust
/// EMU8000-authentic multi-zone voice with complete effects processing
#[derive(Debug, Clone)]
pub struct MultiZoneSampleVoice {
    // === BASIC VOICE STATE ===
    /// MIDI note number (0-127)
    pub note: u8,
    /// MIDI velocity (0-127)
    pub velocity: u8,
    /// Voice allocation state (true = allocated for note, false = available)
    pub is_active: bool,
    /// Audio processing state (true = generating audio, false = silent)
    pub is_processing: bool,
    /// MIDI channel (0-15) for effects control
    pub midi_channel: u8,

    // === MULTI-ZONE SAMPLE SYSTEM ===
    /// Multiple sample layers with crossfading weights
    pub sample_layers: Vec<SampleLayer>,
    /// Current crossfading weights for velocity layers
    pub layer_weights: Vec<f32>,

    // === EMU8000 ENVELOPE SYSTEM ===
    /// 6-stage DAHDSR volume envelope (exponential curves)
    pub volume_envelope: DAHDSREnvelope,
    /// 6-stage DAHDSR modulation envelope for filter/pitch control
    pub modulation_envelope: ModulationEnvelope,

    // === EMU8000 LFO SYSTEM ===
    /// LFO1: Tremolo (amplitude) and filter modulation
    pub lfo1: LFO,
    /// LFO2: Vibrato (pitch) modulation only
    pub lfo2: LFO,

    // === EMU8000 FILTER SYSTEM ===
    /// 2-pole resonant low-pass filter (100Hz-8kHz range)
    pub low_pass_filter: LowPassFilter,

    // === EMU8000 MODULATION SYSTEM ===
    /// Complex modulation routing matrix
    pub modulation_router: ModulationRouter,

    // === EMU8000 SEND/RETURN EFFECTS ===
    /// Per-voice reverb send level (0.0-1.0)
    pub reverb_send_level: f32,
    /// Per-voice chorus send level (0.0-1.0)
    pub chorus_send_level: f32,

    // === SOUNDFONT GENERATOR SYSTEM ===
    /// All 58 SoundFont generator values (applied exactly as specified)
    pub generators: SoundFontGenerators,
    
    // === PERFORMANCE OPTIMIZATION ===
    /// Pre-allocated audio buffer for layer mixing
    audio_buffer: Vec<f32>,
}

/// Individual sample layer within multi-zone voice
#[derive(Debug, Clone)]
pub struct SampleLayer {
    /// High-performance sample playback engine
    pub sample_player: SamplePlayer,
    /// SoundFont sample data and metadata
    pub soundfont_sample: SoundFontSample,
    /// Crossfading weight for this layer (0.0-1.0)
    pub weight: f32,
    /// Velocity range for this layer (min, max)
    pub velocity_range: (u8, u8),
    /// Key range for this layer (min, max)
    pub key_range: (u8, u8),
    /// Source preset and instrument names (for debugging)
    pub preset_name: String,
    pub instrument_name: String,
}
```

## 🎵 EMU8000 Effects Processing Chain

### **Signal Flow Architecture**
```
Multi-Zone Sample Selection → Sample Layer Mixing → Crossfading →
    ↓
Pitch Modulation (LFO2 + Mod Envelope) →
    ↓
Low-Pass Filter (LFO1 + Mod Envelope) →
    ↓
Volume Envelope (6-stage DAHDSR) →
    ↓
LFO1 Tremolo Modulation →
    ↓
Reverb/Chorus Send Processing →
    ↓
Stereo Panning → Final Output
```

### **1. Multi-Zone Sample Processing**
```rust
/// Process all sample layers and mix with crossfading
fn process_sample_layers(&mut self) -> f32 {
    let mut mixed_audio = 0.0;
    let mut total_weight = 0.0;
    
    for layer in &mut self.sample_layers {
        if layer.weight > 0.001 { // Skip negligible layers
            let layer_audio = layer.sample_player.generate_sample(&layer.soundfont_sample);
            mixed_audio += layer_audio * layer.weight;
            total_weight += layer.weight;
        }
    }
    
    // Normalize to prevent volume buildup
    if total_weight > 0.001 {
        mixed_audio / total_weight
    } else {
        0.0
    }
}
```

### **2. EMU8000 Modulation Processing**
```rust
/// Process all modulation sources and update routing
fn process_modulation(&mut self) -> ModulationState {
    // Process modulation envelope
    let mod_envelope_level = self.modulation_envelope.process();
    
    // Process dual LFO system
    let lfo1_level = self.lfo1.process(); // Tremolo + Filter
    let lfo2_level = self.lfo2.process(); // Vibrato only
    
    // Update modulation router
    self.modulation_router.set_source_value(ModulationSource::ModulationEnvelope, mod_envelope_level);
    self.modulation_router.set_source_value(ModulationSource::Lfo1, lfo1_level);
    self.modulation_router.set_source_value(ModulationSource::Lfo2, lfo2_level);
    
    ModulationState {
        filter_modulation: self.modulation_router.get_modulated_value(ModulationDestination::FilterCutoff, 0.0),
        pitch_modulation: self.modulation_router.get_modulated_value(ModulationDestination::Pitch, 0.0),
        amplitude_modulation: self.modulation_router.get_modulated_value(ModulationDestination::Amplitude, 1.0),
    }
}
```

### **3. EMU8000 Filter Processing**
```rust
/// Apply low-pass filter with modulation
fn process_filter(&mut self, input: f32, modulation: &ModulationState) -> f32 {
    // Apply filter cutoff modulation
    if modulation.filter_modulation.abs() > 10.0 { // Significant change threshold
        let base_cutoff = self.generators.get_filter_cutoff_hz();
        let modulated_cutoff = (base_cutoff + modulation.filter_modulation).clamp(100.0, 8000.0);
        self.low_pass_filter.set_cutoff(modulated_cutoff);
    }
    
    // Process audio through filter
    self.low_pass_filter.process(input)
}
```

### **4. EMU8000 Envelope Processing**
```rust
/// Process volume envelope with exponential curves
fn process_volume_envelope(&mut self) -> f32 {
    let envelope_level = self.volume_envelope.process();
    
    // Voice stops processing when envelope reaches Off state
    if self.volume_envelope.state == EnvelopeState::Off {
        self.is_processing = false;
    }
    
    envelope_level
}
```

## 🧪 Testing Strategy

### **Unit Tests Required**

**1. Multi-Zone Sample Processing**
```rust
#[cfg(test)]
mod multi_zone_tests {
    #[test]
    fn test_velocity_layer_crossfading() {
        // Test smooth crossfading between velocity layers
    }
    
    #[test]
    fn test_key_range_splitting() {
        // Test proper sample selection based on key ranges
    }
    
    #[test]
    fn test_sample_layer_normalization() {
        // Test that layer mixing doesn't cause volume buildup
    }
}
```

**2. Effects Processing**
```rust
#[cfg(test)]
mod effects_tests {
    #[test]
    fn test_filter_modulation_range() {
        // Test filter cutoff stays within 100Hz-8kHz EMU8000 range
    }
    
    #[test]
    fn test_lfo_frequency_range() {
        // Test LFO frequencies stay within 0.1-20Hz EMU8000 range
    }
    
    #[test]
    fn test_exponential_envelope_curves() {
        // Test envelope uses exponential not linear curves
    }
}
```

**3. SoundFont Generator Compliance**
```rust
#[cfg(test)]
mod generator_tests {
    #[test]
    fn test_all_58_generators_applied() {
        // Test that no generator values are filtered or ignored
    }
    
    #[test]
    fn test_fine_tuning_precision() {
        // Test -48 cent fine tuning from Creative Labs SoundFonts
    }
}
```

### **Integration Tests Required**

**1. Audio Pipeline Validation**
```rust
#[test]
fn test_complete_audio_pipeline() {
    // Test: MIDI note → zone selection → effects → audio output
}

#[test]
fn test_audio_comparison_reference() {
    // Test: Compare against known-good reference audio
}
```

**2. Performance Validation**
```rust
#[test]
fn test_32_voice_polyphony() {
    // Test: 32 simultaneous voices at 44.1kHz real-time
}

#[test]
fn test_zero_allocation_audio_path() {
    // Test: No allocations in generate_sample() call
}
```

## 🔧 Implementation Plan

### **Phase 20.2: Core Implementation**
1. **MultiZoneSampleVoice struct** - Complete structure with all EMU8000 components
   - All fields defined from the start (no incremental additions)
   - Proper initialization with sensible defaults
   - Clean public interface methods
   
2. **Sample layer processing** - Multi-zone mixing and crossfading
   - Zone selection based on velocity and key ranges
   - Smooth crossfading between overlapping zones
   - Proper amplitude normalization
   
3. **Effects chain integration** - All EMU8000 effects per voice
   - Volume and modulation envelopes (6-stage DAHDSR)
   - Dual LFO system (LFO1 for tremolo/filter, LFO2 for vibrato)
   - Low-pass filter with resonance (100Hz-8kHz range)
   - Modulation routing matrix
   - Reverb/chorus send levels
   
4. **SoundFont generator system** - Complete 58-generator compliance
   - Apply ALL generators without filtering
   - Proper parameter conversion (timecents, centibels, cents)
   - Instrument vs preset generator priority

### **Phase 20.3: Testing Implementation**
1. **Comprehensive unit tests** - Every component tested in isolation
   - Each envelope stage and transition
   - LFO frequency and waveform accuracy
   - Filter frequency response
   - Modulation routing calculations
   
2. **Effects processing tests** - EMU8000 parameter ranges and modulation
   - Filter stays within 100Hz-8kHz range
   - LFO stays within 0.1Hz-20Hz range
   - Exponential envelope curves (not linear)
   
3. **Integration tests** - Complete audio pipeline validation
   - MIDI note → zone selection → effects → audio output
   - Compare against reference audio
   - Voice stealing priorities
   
4. **Performance tests** - Real-time requirements and memory usage
   - 32-voice polyphony at 44.1kHz
   - Zero allocations in audio path
   - CPU usage profiling

### **Phase 20.4: System Integration**
1. **VoiceManager updates** - Use only MultiZoneSampleVoice
   - Update allocate_voice() to create new voice type
   - Update process() to use new interface
   - Remove old voice type handling
   
2. **Legacy system removal** - Delete ALL old implementations
   - Delete Voice struct and implementation
   - Delete SampleVoice struct and implementation  
   - Delete old broken MultiZoneSampleVoice
   - Clean up unused imports and modules
   
3. **Audio comparison validation** - Ensure tests pass with new system
   - Run all existing audio tests
   - Verify output matches expected quality
   - Performance benchmarks

## ⚠️ Critical Implementation Rules

### **What NOT to Do**
1. **DO NOT** copy code from existing Voice/SampleVoice/MultiZoneSampleVoice
2. **DO NOT** implement effects as optional or add them later
3. **DO NOT** create multiple voice types "for flexibility"
4. **DO NOT** skip writing tests first
5. **DO NOT** use unwrap() or expect() in audio processing
6. **DO NOT** allocate memory in the audio processing loop

### **What TO Do**
1. **DO** write the complete struct with all fields from the start
2. **DO** implement all effects as core functionality
3. **DO** write tests before implementation (TDD)
4. **DO** use Result<> and handle all errors properly
5. **DO** pre-allocate all buffers during initialization
6. **DO** profile performance continuously

## ✅ Success Criteria

1. **✅ Single Voice System**: Only MultiZoneSampleVoice exists in codebase
2. **✅ Complete Effects**: All EMU8000 effects processing per voice
3. **✅ Multi-Zone Authentic**: Proper velocity/key layering and crossfading
4. **✅ Audio Tests Pass**: All audio comparison tests pass
5. **✅ Performance**: 32-voice polyphony at 44.1kHz real-time
6. **✅ SoundFont Compliance**: All 58 generators applied exactly
7. **✅ Test Coverage**: Comprehensive unit and integration tests

This design provides the foundation for a clean, EMU8000-authentic voice system that eliminates the architectural issues discovered in Phase 19.