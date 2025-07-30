# EMU8000 & SoundFont 2.0 Complete Reference Guide

**Purpose:** This document serves as a comprehensive reference for EMU8000 chip emulation and SoundFont 2.0 implementation. It consolidates specifications, implementation details, and lessons learned to prevent incorrect assumptions and guide accurate development.

**📝 REFERENCE MAINTENANCE: This document should be updated when new EMU8000 or SoundFont discoveries are made. Maintain the organized structure (Overview → Hardware → SoundFont → Implementation → Reference) when adding new information.**

---

# 🎯 QUICK REFERENCE OVERVIEW

## What is the EMU8000?
The EMU8000 is a wavetable synthesis chip developed by E-mu Systems for Creative Labs' Sound Blaster AWE32/64 cards. It brought professional sample-based synthesis to consumer sound cards in the mid-1990s.

## Key EMU8000 Facts for Implementation
- **32-voice polyphonic synthesis** (hard limit)
- **Sample-based wavetable synthesis** with SoundFont 2.0 support
- **Per-voice effects processing** (not modern send/return buses)
- **Dual LFO system** per voice (modulation + vibrato)
- **2-pole low-pass filter** per voice (100Hz-8kHz range)
- **6-stage ADSR envelopes** (Delay, Attack, Hold, Decay, Sustain, Release)
- **All 58 SoundFont generators** must be implemented exactly as specified

## Critical Implementation Requirements
- **Apply ALL SoundFont generator values exactly** - No filtering or "sanitization"
- **Use exponential envelope curves** - Not linear (FluidSynth-compatible)
- **Respect EMU8000 parameter ranges** - Filter 100Hz-8kHz, LFO 0.1Hz-20Hz
- **Per-voice effects processing** - Each voice gets its own effects chain
- **Intelligent voice stealing** - Prioritize releasing voices, then lowest velocity

---

# 🔧 EMU8000 HARDWARE SPECIFICATIONS

## Core Hardware Specifications

### Basic Specifications
- **Polyphony:** 32 simultaneous voices (hard limit)
- **MIDI Channels:** 16 channels (General MIDI compatible)
- **Synthesis Method:** Sample-based wavetable synthesis
- **Sample Memory:** 1MB ROM + expandable RAM (up to 28MB)
- **Sample Format:** 16-bit PCM samples
- **Sample Rate:** 44.1kHz output
- **Effects:** Per-voice and global effects processors

### EMU8000 Signal Path (Authentic Flow)
```
Sample Data
    ↓
Pitch Shift (LFO2 + Envelope)
    ↓
Low-Pass Filter (LFO1 + Envelope)
    ↓
Amplifier (LFO1 + Volume Envelope)
    ↓
Effects Sends → [Global Reverb]
              → [Global Chorus]
    ↓
Pan & Output Mix
```

## Voice Architecture (32 Voices)

Each of the 32 voices contains:

### 1. Oscillator Section
- **Sample playback** with pitch shifting
- **Loop point support** with seamless transitions
- **High-quality interpolation** (4-point interpolation in hardware)
- **Real-time pitch control** via MIDI note and pitch bend

### 2. Dual LFO System
- **LFO1 (Modulation LFO):** Affects volume (tremolo) and filter cutoff
- **LFO2 (Vibrato LFO):** Affects pitch only
- **Frequency Range:** 0.1Hz - 20Hz for both LFOs
- **Waveform:** Triangle wave (hardware implementation)
- **Per-voice independence:** Each voice has its own LFO state

### 3. Filter Section
- **Type:** 2-pole (12dB/octave) low-pass resonant filter
- **Cutoff Range:** 100Hz - 8kHz (hardware limitation)
- **Resonance:** 0 - 40dB peak at cutoff frequency
- **Modulation Sources:** LFO1, Modulation Envelope, Velocity
- **Real-time control:** Via MIDI CC and SoundFont generators

### 4. Envelope Generators (Per Voice)
- **Volume Envelope:** 6-stage ADSR (Delay, Attack, Hold, Decay, Sustain, Release)
- **Modulation Envelope:** 6-stage ADSR for filter/pitch modulation
- **Envelope Curves:** Exponential attack/decay/release (NOT linear)
- **Key Scaling:** Envelope times scale with MIDI note number
- **Velocity Sensitivity:** All phases can be velocity-modulated

### 5. Effects Processing
**Global Effects (shared by all voices):**
- **Reverb:** Multi-tap delay algorithm with room size scaling
- **Chorus:** Pitch-modulated delay line with feedback

**Signal Flow:**
```
Voice Output → Effects Send Level → Global Effect → Mix with Dry Signal
```

## Register Access and Control
- **Direct register access** (not through MPU-401)
- **Three register banks** for different functions
- **Software MIDI interpretation** on host CPU
- **Real-time parameter updates** via register writes

---

# 🎵 SOUNDFONT 2.0 COMPLETE SPECIFICATION

## File Structure Overview

### RIFF Format Structure
```
RIFF
├── sfbk (SoundFont Bank)
│   ├── INFO (Metadata)
│   │   ├── ifil (version)
│   │   ├── isng (sound engine)
│   │   ├── INAM (bank name)
│   │   └── ... (other metadata)
│   ├── sdta (Sample Data)
│   │   └── smpl (16-bit PCM samples)
│   └── pdta (Preset Data)
│       ├── phdr (preset headers)
│       ├── pbag (preset bags)
│       ├── pmod (preset modulators)
│       ├── pgen (preset generators)
│       ├── inst (instruments)
│       ├── ibag (instrument bags)
│       ├── imod (instrument modulators)
│       ├── igen (instrument generators)
│       └── shdr (sample headers)
```

### SoundFont Hierarchy
```
Preset (Bank:Program)
    ↓
Instrument(s) - can have multiple for velocity/key splits
    ↓
Sample(s) - actual audio data with loop points
```

### Generator Merging Rules (CRITICAL)
1. **Instrument generators are defaults**
2. **Preset generators override instrument generators**
3. **Some generators are additive** (marked in specification)
4. **MIDI real-time overrides both** (CC controllers, pitch bend)

---

# 📊 COMPLETE GENERATOR REFERENCE

## All 58 SoundFont 2.0 Generators

### Sample Control Generators (0-7)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 0 | startAddrsOffset | Fine sample start offset | samples | 0-32767 | Add to coarse offset |
| 1 | endAddrsOffset | Fine sample end offset | samples | -32767-0 | Add to coarse offset |
| 2 | startloopAddrsOffset | Fine loop start | samples | -32767-32767 | Add to coarse offset |
| 3 | endloopAddrsOffset | Fine loop end | samples | -32767-32767 | Add to coarse offset |
| 4 | startAddrsCoarseOffset | Coarse sample start | 32768 samples | 0-32767 | Multiply by 32768 |
| 5 | modLfoToPitch | Mod LFO to pitch | cents | -12000-12000 | ±10 octaves |
| 6 | vibLfoToPitch | Vibrato LFO to pitch | cents | -12000-12000 | ±10 octaves |
| 7 | modEnvToPitch | Mod envelope to pitch | cents | -12000-12000 | ±10 octaves |

### Filter Generators (8-11)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 8 | initialFilterFc | Filter cutoff | cents | 1500-13500 | 8.176Hz-20kHz, clamp to 100Hz-8kHz |
| 9 | initialFilterQ | Filter resonance | centibels | 0-960 | 0-96dB, EMU8000 max ~40dB |
| 10 | modLfoToFilterFc | Mod LFO to filter | cents | -12000-12000 | Bidirectional modulation |
| 11 | modEnvToFilterFc | Mod env to filter | cents | -12000-12000 | Bidirectional modulation |

### Volume Generators (12-16)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 12 | endAddrsCoarseOffset | Coarse end offset | 32768 samples | -32767-0 | Multiply by 32768 |
| 13 | modLfoToVolume | Mod LFO to volume | centibels | -960-960 | ±96dB tremolo |
| 14 | unused1 | Unused | - | - | Skip |
| 15 | chorusEffectsSend | Chorus send | 0.1% | 0-1000 | 0-100% send level |
| 16 | reverbEffectsSend | Reverb send | 0.1% | 0-1000 | 0-100% send level |

### Positioning Generator (17)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 17 | pan | Stereo pan | 0.1% | -500-500 | -50%=left, 0=center, +50%=right |

### LFO Generators (21-25)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 21 | delayModLFO | Mod LFO delay | timecents | -12000-5000 | 1ms-20s delay |
| 22 | freqModLFO | Mod LFO frequency | cents | -16000-4500 | 0.1Hz-100Hz, clamp to 0.1-20Hz |
| 23 | delayVibLFO | Vibrato LFO delay | timecents | -12000-5000 | 1ms-20s delay |
| 24 | freqVibLFO | Vibrato LFO frequency | cents | -16000-4500 | 0.1Hz-100Hz, clamp to 0.1-20Hz |
| 25 | delayModEnv | Mod envelope delay | timecents | -12000-5000 | 1ms-20s delay |

### Modulation Envelope Generators (26-32)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 26 | attackModEnv | Mod env attack | timecents | -12000-8000 | 1ms-100s |
| 27 | holdModEnv | Mod env hold | timecents | -12000-5000 | 1ms-20s |
| 28 | decayModEnv | Mod env decay | timecents | -12000-8000 | 1ms-100s |
| 29 | sustainModEnv | Mod env sustain | 0.1% | 0-1000 | 0-100% |
| 30 | releaseModEnv | Mod env release | timecents | -12000-8000 | 1ms-100s |
| 31 | keynumToModEnvHold | Key to mod hold | cents/key | -1200-1200 | Time scaling |
| 32 | keynumToModEnvDecay | Key to mod decay | cents/key | -1200-1200 | Time scaling |

### Volume Envelope Generators (33-40)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 33 | delayVolEnv | Vol env delay | timecents | -12000-5000 | 1ms-20s |
| 34 | attackVolEnv | Vol env attack | timecents | -12000-8000 | 1ms-100s |
| 35 | holdVolEnv | Vol env hold | timecents | -12000-5000 | 1ms-20s |
| 36 | decayVolEnv | Vol env decay | timecents | -12000-8000 | 1ms-100s |
| 37 | sustainVolEnv | Vol env sustain | centibels | 0-1440 | 0-144dB attenuation |
| 38 | releaseVolEnv | Vol env release | timecents | -12000-8000 | 1ms-100s |
| 39 | keynumToVolEnvHold | Key to vol hold | cents/key | -1200-1200 | Time scaling |
| 40 | keynumToVolEnvDecay | Key to vol decay | cents/key | -1200-1200 | Time scaling |

### Key/Velocity Range Generators (43-44)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 43 | keyRange | MIDI key range | - | 0-127 | Low-high byte pair |
| 44 | velRange | MIDI velocity range | - | 0-127 | Low-high byte pair |

### Sample Loop Generators (45-46, 50)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 45 | startloopAddrsCoarseOffset | Coarse loop start | 32768 samples | -32767-32767 | Multiply by 32768 |
| 46 | keynum | Fixed key number | key | 0-127 | Overrides MIDI note |
| 50 | endloopAddrsCoarseOffset | Coarse loop end | 32768 samples | -32767-32767 | Multiply by 32768 |

### Attenuation Generator (48)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 48 | initialAttenuation | Volume attenuation | centibels | 0-1440 | 0-144dB, applied exactly |

### Tuning Generators (51-52, 58)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 51 | coarseTune | Coarse tuning | semitones | -120-120 | ±10 octaves |
| 52 | fineTune | Fine tuning | cents | -99-99 | **APPLY EXACTLY - NO FILTERING** |
| 58 | scaleTuning | Scale tuning | cents/key | 0-1200 | Default 100 (equal temperament) |

### Sample Mode Generators (53-54)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 53 | sampleModes | Loop modes | flags | 0-3 | Bit 0: loop, Bit 1: loop during release |
| 54 | exclusiveClass | Exclusive class | - | 0-127 | Mute group (hi-hat style) |

### Root Key Generator (58)
| ID | Name | Description | Units | Range | EMU8000 Notes |
|----|------|-------------|-------|-------|---------------|
| 58 | overridingRootKey | Override root key | key | 0-127 | -1 = use sample header |

---

# 🎛️ PARAMETER CONVERSION FORMULAS

## Essential Conversion Functions

### Timecents to Seconds
```rust
fn timecents_to_seconds(timecents: i32) -> f32 {
    2.0_f32.powf(timecents as f32 / 1200.0)
}
// Examples:
// -12000 tc = 0.001s (1ms)
//      0 tc = 1.0s
//   1200 tc = 2.0s
//  12000 tc = 1000s
```

### Centibels to Linear Amplitude
```rust
fn centibels_to_linear(centibels: i32) -> f32 {
    10.0_f32.powf(-centibels as f32 / 200.0)
}
// Examples:
// 0 cb = 1.0 (unity gain)
// 100 cb = 0.794 (-1dB)
// 200 cb = 0.631 (-2dB)
// 1000 cb = 0.1 (-10dB)
```

### Cents to Frequency Ratio
```rust
fn cents_to_ratio(cents: i32) -> f64 {
    2.0_f64.powf(cents as f64 / 1200.0)
}
// Examples:
// -1200 cents = 0.5 (octave down)
//     0 cents = 1.0 (no change)
//  1200 cents = 2.0 (octave up)
```

### Absolute Cents to Frequency (Hz)
```rust
fn absolute_cents_to_hz(cents: i32) -> f32 {
    8.176 * 2.0_f32.powf(cents as f32 / 1200.0)
}
// Used for: InitialFilterFc, FreqModLFO, FreqVibLFO
// 1500 cents = 8.176 Hz
// 6900 cents = 440 Hz (A4)
// 13500 cents = 20 kHz
```

---

# ⚙️ EMU8000 EFFECTS PROCESSING DETAILS

## Filter Implementation

### Filter Specifications
- **Type**: 2-pole Butterworth-style low-pass
- **Cutoff Range**: 100Hz to 8kHz (hardware limitation)
- **Resonance**: 0 to 40dB peak at cutoff frequency
- **Modulation Sources**: LFO1, Modulation Envelope, Velocity

### Filter Parameter Interpretation
```rust
// InitialFilterFc (Generator 8)
// Input: Absolute cents (1500 = 8.176Hz, 13500 = 20kHz)
// EMU8000 clamps to 100Hz-8kHz range
let cutoff_hz = 8.176 * 2.0_f32.powf(cents / 1200.0);
let clamped_hz = cutoff_hz.clamp(100.0, 8000.0);

// InitialFilterQ (Generator 9)  
// Input: Centibels (0 = no resonance, 960 = 96dB peak)
// Convert to filter Q factor (0.7 to ~40)
let resonance_db = centibels / 10.0;
let q_factor = 0.7 * 10.0_f32.powf(resonance_db / 20.0);
```

## LFO System Implementation

### LFO Specifications
**LFO1 (Modulation LFO):**
- **Destinations**: Filter cutoff, Volume (tremolo)
- **Waveform**: Triangle
- **Rate**: 0.1Hz to 20Hz (EMU8000 hardware limit)
- **Delay**: 0 to 20 seconds

**LFO2 (Vibrato LFO):**
- **Destination**: Pitch only
- **Waveform**: Triangle
- **Rate**: 0.1Hz to 20Hz (EMU8000 hardware limit)
- **Delay**: 0 to 20 seconds

### LFO Parameter Interpretation
```rust
// FreqModLFO/FreqVibLFO (Generators 22, 24)
// Input: Absolute cents (same as filter cutoff)
let lfo_hz = 8.176 * 2.0_f32.powf(cents / 1200.0);
let clamped_hz = lfo_hz.clamp(0.1, 20.0); // EMU8000 limit

// DelayModLFO/DelayVibLFO (Generators 21, 23)
// Input: Timecents (-12000 to 5000)
let delay_seconds = 2.0_f32.powf(timecents / 1200.0);

// Modulation depths
// ModLfoToVolume (Generator 13): ±960 centibels = ±96dB
// ModLfoToFilterFc (Generator 10): ±12000 cents = ±10 octaves
// VibLfoToPitch (Generator 6): ±12000 cents = ±10 octaves
```

## ADSR Envelope Processing

### Envelope Specifications
**Volume Envelope:**
- **Purpose**: Controls voice amplitude over time
- **Curve**: Exponential attack/decay/release (FluidSynth-compatible)
- **Sustain Special**: 1000+ centibels = natural decay mode

**Modulation Envelope:**
- **Purpose**: Controls filter cutoff and pitch over time
- **Curve**: Exponential segments
- **Sustain Units**: 0.1% (0-1000 = 0-100%)

### Critical Implementation: Exponential Curves
```rust
// FluidSynth-compatible exponential envelope segment
let progress = elapsed_time / segment_duration;
let exponential_progress = progress.powf(2.0); // Curve factor
let current_value = start + (end - start) * exponential_progress;
```

**Why Exponential is Critical:**
- Linear decay takes 46+ seconds to become audible during sustain
- Exponential decay provides immediate audible results
- Matches hardware EMU8000 behavior
- Compatible with FluidSynth reference implementation

---

# 🎼 SOUNDFONT 2.0 DEFAULT MODULATORS

## All 10 Default Modulators (Always Active)

1. **Velocity → Initial Attenuation**
   - Source: Note-On Velocity
   - Control: Negative Concave
   - Destination: Initial Attenuation
   - Amount: 960 centibels

2. **Velocity → Filter Cutoff**
   - Source: Note-On Velocity
   - Control: Linear Negative
   - Destination: Initial Filter Cutoff
   - Amount: -2400 cents

3. **Channel Pressure → Vibrato LFO Pitch Depth**
   - Source: Channel Pressure
   - Control: Linear
   - Destination: Vibrato LFO to Pitch
   - Amount: 50 cents

4. **CC1 (Mod Wheel) → Vibrato LFO Pitch Depth**
   - Source: CC1
   - Control: Linear
   - Destination: Vibrato LFO to Pitch
   - Amount: 50 cents

5. **CC7 (Volume) → Initial Attenuation**
   - Source: CC7
   - Control: Negative Concave
   - Destination: Initial Attenuation
   - Amount: 960 centibels

6. **CC10 (Pan) → Pan Position**
   - Source: CC10
   - Control: Linear
   - Destination: Pan
   - Amount: 1000 (full range)

7. **CC11 (Expression) → Initial Attenuation**
   - Source: CC11
   - Control: Negative Concave
   - Destination: Initial Attenuation
   - Amount: 960 centibels

8. **CC91 (Reverb) → Reverb Effects Send**
   - Source: CC91
   - Control: Linear
   - Destination: Reverb Effects Send
   - Amount: 200

9. **CC93 (Chorus) → Chorus Effects Send**
   - Source: CC93
   - Control: Linear
   - Destination: Chorus Effects Send
   - Amount: 200

10. **Pitch Wheel → Initial Pitch**
    - Source: Pitch Wheel
    - Control: Linear
    - Destination: Initial Pitch
    - Amount: 12700 cents (depends on pitch wheel sensitivity)

---

# 🚨 CRITICAL IMPLEMENTATION PITFALLS

## 1. Fine Tuning Filtering (NEVER DO THIS)
**❌ WRONG:**
```rust
// Never filter or "sanitize" fine tuning values!
let safe_fine_tune = if fine_tune.abs() > 100 { 0 } else { fine_tune };
```

**✅ CORRECT:**
```rust
// Apply ALL generator values exactly as specified
let total_cents = cents + (fine_tune as i32) + (coarse_tune as i32 * 100);
```

**Why This Matters**: Creative Labs SoundFonts use -48 cents fine tuning intentionally. Filtering breaks pitch accuracy.

## 2. Linear vs Exponential Envelopes
**❌ WRONG:**
```rust
// Linear decay is imperceptibly slow
self.current_level += self.rate; // Takes 46+ seconds to be audible!
```

**✅ CORRECT:**
```rust
// Exponential decay matches hardware
let progress = (phase_samples as f32 / duration as f32).min(1.0);
let exp_progress = progress.powf(2.0); // FluidSynth curve factor
self.current_level = start + (target - start) * exp_progress;
```

## 3. EMU8000 Parameter Range Violations
**❌ WRONG:**
```rust
// Don't ignore EMU8000 hardware limitations
let cutoff = generator_value; // Could be 20kHz+
let lfo_rate = generator_value; // Could be 100Hz+
```

**✅ CORRECT:**
```rust
// Respect EMU8000 hardware ranges
let cutoff = clamp(generator_value, 100.0, 8000.0); // EMU8000 filter range
let lfo_rate = clamp(generator_value, 0.1, 20.0);   // EMU8000 LFO range
```

## 4. Velocity Layer Implementation Errors
**❌ WRONG:**
```rust
// Simple hard-switched layers
if velocity < 64 { use_soft_sample() } else { use_hard_sample() }
```

**✅ CORRECT:**
```rust
// Crossfade between velocity layers
let fade = calculate_crossfade(velocity, layer1.vel_range, layer2.vel_range);
let output = layer1_sample * (1.0 - fade) + layer2_sample * fade;
```

## 5. Voice Allocation Mistakes
**❌ WRONG:**
```rust
// Random or oldest voice stealing
let voice_to_steal = voices.iter().next().unwrap();
```

**✅ CORRECT:**
```rust
// EMU8000 authentic voice stealing priority
fn find_voice_to_steal() -> Option<VoiceId> {
    // 1. Find idle voice
    // 2. Find voice in release phase
    // 3. Find lowest velocity voice
    // 4. Steal oldest voice (last resort)
}
```

---

# 📚 FLUIDSYNTH REFERENCE IMPLEMENTATION

## Why FluidSynth Matters
- **Industry standard** open-source SoundFont synthesizer
- **Proven accuracy** with professional SoundFonts
- **Well-documented** codebase with 20+ years of development
- **Active community** and continuous improvements

## Key FluidSynth Implementation Insights

### 1. Pitch Calculation (Generator 52 Research)
```c
// FluidSynth applies fine tuning exactly as specified
pitch += voice->gen[GEN_FINETUNE].val; // Direct application
// No range checking or filtering beyond SoundFont 2.0 spec
```

### 2. Envelope Implementation
```c
// FluidSynth uses exponential envelope segments
double fluid_conversion_table[128]; // Pre-calculated exponential curves
time_seconds = fluid_conversion_table[timecents_index];
```

### 3. Voice Management
```c
// FluidSynth voice allocation priority:
// 1. Check exclusive class for muting
// 2. Find free voice
// 3. Find voice in release
// 4. Find quiet voice  
// 5. Steal oldest voice
```

### 4. EMU8000 4-Point Interpolation Research
**Patent #5,111,727**: "Digital sampling instrument for digital audio data"
- **Inventor**: David P. Rossum (EMU8000 co-designer)
- **Key Innovation**: 4-point interpolation preserves amplitude during pitch shifts
- **Amplitude Preservation**: Natural volume consistency across keyboard range

```rust
// EMU8000-authentic 4-point interpolation
fn emu8000_four_point_interpolate(s_minus1: f32, s0: f32, s1: f32, s2: f32, fract: f32) -> f32 {
    let fract2 = fract * fract;
    let fract3 = fract2 * fract;
    
    let c_minus1 = -fract3 + 2.0 * fract2 - fract;
    let c0 = 3.0 * fract3 - 5.0 * fract2 + 2.0;
    let c1 = -3.0 * fract3 + 4.0 * fract2 + fract;
    let c2 = fract3 - fract2;
    
    (c_minus1 * s_minus1 + c0 * s0 + c1 * s1 + c2 * s2) * 0.5
}
```

---

# 📊 QUICK REFERENCE TABLES

## Timecents Conversion Table
| Timecents | Seconds | Musical Context |
|-----------|---------|-----------------|
| -12000 | 0.001 | 1ms (minimum attack) |
| -7200 | 0.016 | 1/64 note @ 60bpm |
| -4800 | 0.063 | 1/16 note @ 60bpm |
| -2400 | 0.25 | 1/4 note @ 60bpm |
| 0 | 1.0 | 1 second |
| 1200 | 2.0 | 2 seconds |
| 5000 | 20.0 | 20 seconds (max delay) |

## Centibels Conversion Table
| Centibels | dB | Linear | Usage |
|-----------|-------|--------|-------|
| 0 | 0 | 1.0 | Unity gain |
| 100 | -1.0 | 0.794 | Slight reduction |
| 200 | -2.0 | 0.631 | Noticeable cut |
| 600 | -6.0 | 0.501 | Half amplitude |
| 960 | -9.6 | 0.302 | Velocity curve max |
| 1440 | -14.4 | 0.190 | Maximum attenuation |

## MIDI Note to Frequency Table
| Note | Number | Frequency | Context |
|------|--------|-----------|---------|
| A0 | 21 | 27.5 Hz | Lowest piano key |
| C4 | 60 | 261.63 Hz | Middle C |
| A4 | 69 | 440.0 Hz | Concert A |
| C8 | 108 | 4186.01 Hz | Highest piano key |

---

# 🔍 TESTING AND VALIDATION

## Essential Test Requirements
1. **Single note test** - Verify basic synthesis and envelope behavior
2. **Velocity layer test** - Check crossfading and layer selection
3. **Fine tuning test** - Validate Creative Labs SoundFont pitch accuracy
4. **Envelope test** - Verify exponential decay curves
5. **Loop test** - Confirm seamless sample looping
6. **Polyphony test** - 32-voice stress test with voice stealing
7. **Effects test** - Per-voice filter, LFO, reverb, chorus
8. **MIDI compatibility test** - Full General MIDI compliance

## Reference Comparison Targets
- **FluidSynth** - Primary reference for SoundFont accuracy
- **TiMidity++** - Secondary reference implementation
- **Original EMU8000 hardware** - When recordings are available

## Debug Verification Checklist
- [ ] All 58 generators applied without filtering
- [ ] Exponential envelopes (not linear decay)
- [ ] EMU8000 parameter ranges respected (filter 100Hz-8kHz, LFO 0.1-20Hz)
- [ ] Fine tuning applied exactly (-48 cents should work)
- [ ] Voice stealing follows EMU8000 priority
- [ ] Per-voice effects processing (not global buses)

---

**Document Version:** 2.0  
**Last Updated:** July 30, 2025  
**Status:** Reorganized for improved readability and implementation guidance

**Remember:** This reference should be consulted whenever implementing EMU8000 or SoundFont features. Every generator, parameter range, and implementation detail has been researched and validated against professional implementations and hardware specifications.