# AWE Player Architecture Documentation

**⚠️ CRITICAL: When working on this project, ALWAYS read CLAUDE.md, PROJECT_TODO.md, EMU8000_REFERENCE.md AND this ARCHITECTURE.md file first to understand the complete system design and constraints.**

**📝 ARCHITECTURE MAINTENANCE: This document must be updated as the project progresses. When adding new components, changing designs, or discovering architectural insights, update this file immediately and maintain the organized top-down structure (Overview → Principles → Architecture → Details).**

## 🎯 Project Overview

AWE Player is a WebAssembly-based EMU8000 chip emulator that provides authentic SoundFont 2.0 synthesis in the browser. The project recreates the exact sound and behavior of Creative Sound Blaster AWE32/64 sound cards with modern audio quality improvements.

**Primary Goal:** Create a faithful EMU8000 chip emulation for authentic SoundFont 2.0 playback in the browser.

**Key Design Decisions:**
- **Rust + WASM**: Zero garbage collection for real-time audio (no audio dropouts)
- **EMU8000 Authenticity**: Per-voice effects, 32-voice polyphony, authentic parameter ranges
- **Complete MIDI System**: Full MIDI recording and playback capabilities in Rust
- **Minimal JavaScript**: UI only, all audio processing in WASM

## 🏗️ Core Architecture Principles

### 1. **EMU8000 Compatibility First**
- All technical decisions prioritize EMU8000 compatibility over modern audio conveniences
- Sound better than original EMU8000 while maintaining full compatibility
- Per-voice effects processing (not modern send/return buses)
- 32-voice polyphonic synthesis with proper voice stealing

### 2. **Real-Time Audio Requirements**
- **Zero Garbage Collection**: Rust ensures no GC pauses that cause audio dropouts
- **Deterministic Memory Management**: Predictable allocation/deallocation
- **44.1kHz Sample Rate**: Precise timing with zero tolerance for interruptions
- **Memory Efficiency**: Minimal footprint for 32-voice polyphonic synthesis

### 3. **Clean Audio Architecture (WASM-Only Processing)**
- **TypeScript**: UI interaction, file loading, and WebMIDI input handling
- **WASM**: ALL audio processing, synthesis, and effects
- **No JavaScript audio loops**: Single WASM call per audio buffer
- **AudioWorklet**: Modern audio processing architecture
- **WebMIDI Exception**: TypeScript handles real-time MIDI input coordination (encapsulated)

### 4. **Debug Architecture (MANDATORY)**
- **ABSOLUTELY NO browser console logging** (`console.log`, `console.error`, etc.)
- **ALL debug output**: Must go to in-page debug textarea via `crate::log()`
- **Performance**: Console logging interferes with audio processing
- **Visibility**: All debugging contained within application

## 🎵 System Architecture Overview

### High-Level Component Flow
```
JavaScript (UI) → AudioWorklet → WASM Audio Engine → Audio Output
     ↓                ↓              ↓
File Loading     Buffer Management  Real-time Synthesis
UI Controls      WASM Bridge        32-Voice Polyphony  
Debug Display    Audio Routing      EMU8000 Effects
```

### EMU8000 Authentic Signal Flow
```
MIDI Events → Voice Allocation → Sample Playback → Pitch Modulation → 
Low-Pass Filter → ADSR Envelope → Effects Chain → Stereo Pan → Audio Output
```

### Detailed System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     JavaScript (UI Layer)                      │
│  - File loading (SF2/MIDI)                                     │
│  - UI controls (play/pause/stop)                               │
│  - Display updates                                             │
│  - Debug log display                                           │
└─────────────────┬───────────────────────────────────────────────┘
                  │ AudioWorklet Bridge
                  │ (Single process() call per buffer)
┌─────────────────▼───────────────────────────────────────────────┐
│                   WASM Audio Engine                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AudioWorkletProcessor                      │   │
│  │  - Audio buffer management                              │   │
│  │  - Bridge to MidiPlayer                                 │   │
│  │  - Mode switching (Track/MIDI)                          │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │                MidiPlayer                               │   │
│  │  - MIDI file parsing and sequencing                    │   │
│  │  - SoundFont loading and management                    │   │
│  │  - Playback state management                           │   │
│  │  - Debug logging system                                │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │             MidiSequencer                               │   │
│  │  - Real-time MIDI event processing                     │   │
│  │  - Timing and tempo management                         │   │
│  │  - Channel state management                            │   │
│  │  - Note on/off handling                                │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │              VoiceManager                               │   │
│  │  - 32-voice polyphonic synthesis                       │   │
│  │  - Voice allocation and stealing                       │   │
│  │  - Velocity layering and crossfading                   │   │
│  │  - Sample management integration                       │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │                Voice (×32)                              │   │
│  │  - Individual voice synthesis                          │   │
│  │  - ADSR envelope processing                            │   │
│  │  - Per-voice effects chain                             │   │
│  │  - Sample playback with interpolation                  │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │             EffectsChain                                │   │
│  │  - LFO modulation (tremolo/vibrato)                    │   │
│  │  - Low-pass filter with resonance                      │   │
│  │  - Per-voice reverb and chorus                         │   │
│  │  - Stereo panning                                      │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │            SoundFont Engine                             │   │
│  │  - Complete SF2 parser (RIFF chunks)                   │   │
│  │  - Preset/Instrument/Sample hierarchy                  │   │
│  │  - All 58 SoundFont generators                         │   │
│  │  - Sample data management                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🎛️ EMU8000 Hardware Requirements

The EMU8000 was the sound synthesis chip used in Creative Sound Blaster AWE32/64 cards:

### Key EMU8000 Features to Emulate:
1. **32-voice polyphonic synthesis**
2. **Sample-based synthesis with SoundFont loading**
3. **Per-voice effects processing:**
   - Low-pass filter (100Hz - 8kHz range)
   - LFO modulation (tremolo/vibrato)
   - ADSR envelope generators
   - Pitch shifting and sample interpolation
4. **Global effects processors:**
   - Reverb (multi-tap delay algorithm)
   - Chorus (modulated delay)
5. **SoundFont 2.0 generator compliance:**
   - All 58 SoundFont generators
   - Proper parameter scaling and ranges
   - Preset/instrument/sample hierarchy

### EMU8000 Authentic Signal Flow:
```
SoundFont Sample → Pitch Modulation → Low-Pass Filter → ADSR Envelope → Effects → Stereo Pan → Output
```

## 🎹 WebMIDI Integration Architecture

### **TypeScript WebMIDI Handler**
**Purpose**: The ONLY complex JavaScript/TypeScript component - handles real-time MIDI device coordination

**Why TypeScript Here:**
- **WebMIDI API complexity**: Requires sophisticated device management and event handling
- **Type safety**: Critical for reliable MIDI message parsing and routing
- **Encapsulation**: Contains all web browser MIDI complexity in one well-defined module
- **Real-time coordination**: Must handle multiple MIDI devices with precise timing

**Responsibilities:**
- **MIDI device discovery** and connection management
- **Real-time MIDI event capture** from hardware devices
- **Event sanitization** and validation before sending to WASM
- **Device state management** (connect/disconnect handling)
- **MIDI message parsing** and formatting for WASM interface

**Interface with WASM:**
```typescript
// Clean, typed interface between TypeScript and WASM
interface MidiInputHandler {
    sendMidiMessage(channel: number, message: number, data1: number, data2: number): void;
    setDeviceConnected(deviceId: string, connected: boolean): void;
}
```

### **Critical Timing Architecture**

**Problem**: WebMIDI events arrive asynchronously and must not disrupt audio thread timing.

**Solution**: Event queue with sample-accurate scheduling in WASM.

```
WebMIDI Event → TypeScript Handler → Event Queue → WASM Audio Thread → Sample-Accurate Processing
     ↓              ↓                    ↓            ↓                   ↓
Real-time       Validation &         Lock-free     Audio buffer        Precise timing
Hardware        Timestamping         Queue         processing          (44.1kHz)
```

**Key Design Principles:**
- **No direct audio thread access** from TypeScript
- **Lock-free event queue** for MIDI events with timestamps
- **Sample-accurate scheduling** entirely in WASM
- **Timestamp conversion** from WebMIDI time to audio sample time
- **Zero audio thread blocking** - queue is always non-blocking

**Timing Coordination:**
```typescript
// TypeScript: Timestamp and queue events (non-blocking)
handleMidiMessage(event: MIDIMessageEvent): void {
    const audioContextTime = audioContext.currentTime;
    const sampleTime = Math.round(audioContextTime * SAMPLE_RATE);
    
    // Queue event with sample-accurate timestamp
    wasmInterface.queueMidiEvent(sampleTime, channel, message, data1, data2);
}
```

```rust
// WASM: Process queued events at exact sample timing
fn process_audio_buffer(&mut self, samples: &mut [f32]) {
    for sample_index in 0..samples.len() {
        let current_sample_time = self.total_samples + sample_index;
        
        // Process any MIDI events scheduled for this exact sample
        while let Some(event) = self.midi_queue.peek() {
            if event.sample_time <= current_sample_time {
                self.handle_midi_event(self.midi_queue.pop().unwrap());
            } else {
                break; // Future events
            }
        }
        
        // Generate audio sample
        samples[sample_index] = self.synthesize_sample();
    }
}
```

### **Advanced Performance Optimizations**

**1. MIDI Event Batching:**
```rust
// Process multiple MIDI events per audio buffer for efficiency
fn process_midi_batch(&mut self, events: &[MidiEvent]) {
    // Sort by timestamp, batch by type for optimal processing
    events.iter().for_each(|event| self.handle_midi_event(event));
}
```

**2. Event Pre-filtering (TypeScript):**
```typescript
// Filter redundant events before queuing to WASM
private shouldQueueEvent(event: MidiMessage): boolean {
    // Skip duplicate CC values, out-of-range notes, etc.
    if (event.type === 'controlchange' && 
        this.lastCCValue[event.channel][event.controller] === event.value) {
        return false;
    }
    return true;
}
```

**3. Voice Allocation Prediction:**
```rust
// Pre-calculate voice requirements to reduce allocation latency
fn predict_voice_allocation(&mut self, note_on_events: &[NoteOnEvent]) {
    for event in note_on_events {
        if let Some(voice_id) = self.find_available_voice() {
            self.reserve_voice(voice_id, event.timestamp);
        }
    }
}
```

**4. MIDI CC Smoothing:**
```rust
// Smooth control changes over multiple samples (avoid zipper noise)
struct SmoothedController {
    current_value: f32,
    target_value: f32,
    smoothing_factor: f32,
}

impl SmoothedController {
    fn update(&mut self) -> f32 {
        self.current_value += (self.target_value - self.current_value) * self.smoothing_factor;
        self.current_value
    }
}
```

**5. Memory Pool for Events:**
```rust
// Pre-allocated event pool (no runtime allocation)
struct MidiEventPool {
    events: Vec<MidiEvent>,
    free_indices: Vec<usize>,
}

impl MidiEventPool {
    fn get_event(&mut self) -> Option<&mut MidiEvent> {
        self.free_indices.pop().map(|i| &mut self.events[i])
    }
}
```

**6. Hardware Buffer Alignment:**
```rust
// Align MIDI event processing with audio buffer boundaries
fn process_aligned_events(&mut self, buffer_start_sample: u64, buffer_size: usize) {
    let buffer_end_sample = buffer_start_sample + buffer_size as u64;
    
    // Process all events within this buffer's time range
    while let Some(event) = self.midi_queue.peek() {
        if event.sample_time >= buffer_start_sample && 
           event.sample_time < buffer_end_sample {
            // Process event at exact offset within buffer
            let buffer_offset = (event.sample_time - buffer_start_sample) as usize;
            self.schedule_event_at_offset(event, buffer_offset);
            self.midi_queue.pop();
        } else {
            break;
        }
    }
}
```

**7. Event Prioritization:**
```rust
// Prioritize critical events if queue approaches capacity
#[derive(PartialOrd, Ord, PartialEq, Eq)]
enum MidiEventPriority {
    NoteOff = 0,    // Highest priority (prevent stuck notes)
    NoteOn = 1,     // High priority (musical events)
    ProgramChange = 2, // Medium priority
    ControlChange = 3, // Lower priority
}
```

**8. SIMD Voice Processing:**
```rust
// Process multiple voices simultaneously using SIMD
#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

fn process_voices_simd(&mut self, voices: &mut [Voice; 32]) {
    // Process 4 voices at once using SIMD instructions
    for chunk in voices.chunks_mut(4) {
        // SIMD processing for envelope, filter, effects
    }
}
```

**Performance Guarantees:**
- **< 1ms MIDI latency** from hardware to audio output
- **Zero allocation** in audio thread during steady state
- **Batch processing efficiency** for multiple simultaneous events
- **Sample-accurate timing** maintained under all load conditions
- **Graceful degradation** when event rate exceeds capacity

**Architecture Principle**: All MIDI complexity stays in TypeScript, WASM receives clean, validated MIDI events with sample-accurate timing and optimal performance characteristics.

## 🎹 Virtual MIDI Keyboard Architecture  

### **Complete 88-Key Interface (No Hardware Required)**

**Purpose**: Full MIDI testing capability without requiring hardware MIDI devices.

**Key Features:**
- **88-key piano interface** (A0 to C8, matching standard piano range)
- **General MIDI instrument selector** (all 128 GM instruments)
- **MIDI CC controls**: Pitch bend wheel, modulation wheel, sustain pedal
- **Velocity sensitivity** via mouse/touch pressure simulation
- **Visual feedback** for active notes and control positions
- **Unified MIDI routing** with hardware devices (same event queue)

### **Virtual Keyboard Components**

**1. Piano Key Interface (`virtual-midi-keyboard.ts`):**
```typescript
interface VirtualKey {
    noteNumber: number;     // MIDI note (21-108 for 88 keys)
    isPressed: boolean;     // Visual and logical state
    velocity: number;       // 0-127 based on mouse/touch input
    keyType: 'white' | 'black';
}

class VirtualMidiKeyboard {
    // 88 keys: A0(21) to C8(108)
    private keys: VirtualKey[];
    private sustainPedal: boolean;
    private pitchBend: number;      // -8192 to +8191
    private modWheel: number;       // 0-127
}
```

**2. General MIDI Instrument Selector:**
- **128 GM instruments** organized by families
- **Bank 0**: Melodic instruments (0-127)  
- **Bank 128**: Percussion sets (channel 10)
- **Real-time program change** messages to WASM

**3. MIDI CC Controls:**
```typescript
interface MidiControllers {
    pitchBend: number;      // -8192 to +8191 (14-bit)
    modWheel: number;       // CC1: 0-127 (7-bit)
    sustainPedal: boolean;  // CC64: 0/127 (on/off)
    volume: number;         // CC7: 0-127 (channel volume)
    expression: number;     // CC11: 0-127 (expression)
}
```

**4. Input Handling:**
- **Mouse events**: Click/drag for velocity and pitch bend
- **Touch events**: Multi-touch support for chords
- **Computer keyboard mapping**: QWERTY → piano keys
- **Velocity simulation**: Mouse speed → MIDI velocity (0-127)

### **Unified MIDI Event Routing**

**Single Event Queue Architecture:**
```
Virtual Keyboard Events  \
                          → Unified MIDI Router → Event Queue → WASM
Hardware MIDI Devices    /
```

**Event Priority:**
1. **Real hardware devices** (if available) take priority
2. **Virtual keyboard** events when no hardware conflict
3. **Graceful fallback** between virtual and hardware input

**TypeScript MIDI Event Interface:**
```typescript
interface MidiEvent {
    timestamp: number;      // Sample-accurate timing
    channel: number;        // 0-15
    type: 'noteOn' | 'noteOff' | 'controlChange' | 'programChange';
    data1: number;          // Note number or CC number
    data2: number;          // Velocity or CC value
    source: 'virtual' | 'hardware';
}
```

### **Development and Testing Benefits**

**✅ Complete MIDI Testing:**
- Test all 32 voices without hardware
- Verify velocity layering across full velocity range
- Test General MIDI compatibility (all 128 instruments)
- Validate MIDI CC modulation (pitch, mod wheel, sustain)

**✅ Development Efficiency:**
- No dependency on hardware for basic development
- Consistent testing environment across developers
- Visual feedback for debugging MIDI events
- Rapid iteration on MIDI→synthesis integration

**✅ User Experience:**
- Immediate playability without setup
- Visual learning tool for MIDI concepts
- Backup input method when hardware fails
- Touch device compatibility (tablets/phones)

## 🎼 MIDI File Loading and Playback Architecture

### **Complete Standard MIDI File Support**

**Purpose**: Load and play complex MIDI compositions to test EMU8000 synthesis under realistic musical scenarios.

**MIDI File Format Support:**
- **Format 0**: Single track with all events
- **Format 1**: Multi-track with separate channel tracks (most common)
- **Format 2**: Multi-sequence (less common, but supported)
- **Timing**: Both ticks-per-quarter-note and SMPTE time formats

### **MIDI File Components**

**1. File Loading Interface (`midi-file-loader.ts`):**
```typescript
interface MidiFileInfo {
    name: string;
    format: 0 | 1 | 2;          // SMF format type
    trackCount: number;         // Number of tracks
    division: number;           // Ticks per quarter note or SMPTE
    duration: number;           // Total duration in seconds
    eventCount: number;         // Total MIDI events
    channels: number[];         // Active MIDI channels (0-15)
}

class MidiFileLoader {
    // Drag & drop interface
    loadFromFile(file: File): Promise<MidiFileInfo>;
    
    // Playback controls
    play(): void;
    pause(): void;
    stop(): void;
    seek(position: number): void; // Position in seconds
    
    // Current playback state
    getCurrentPosition(): number;
    getTotalDuration(): number;
    isPlaying(): boolean;
}
```

**2. MIDI File Parser (Rust: `src/midi/parser.rs`):**
```rust
pub struct MidiFile {
    pub format: u16,              // 0, 1, or 2
    pub track_count: u16,         // Number of tracks
    pub division: u16,            // Ticks per quarter note
    pub tracks: Vec<MidiTrack>,   // All tracks with events
}

pub struct MidiTrack {
    pub events: Vec<MidiEvent>,   // Time-sorted events
    pub name: Option<String>,     // Track name (meta event)
    pub channel: Option<u8>,      // Primary channel (if single-channel)
}

pub struct MidiEvent {
    pub delta_time: u32,          // Ticks since last event
    pub absolute_time: u64,       // Absolute time in ticks
    pub event_type: MidiEventType,
}
```

**3. MIDI Event Types:**
```rust
pub enum MidiEventType {
    // Channel Voice Messages
    NoteOff { channel: u8, note: u8, velocity: u8 },
    NoteOn { channel: u8, note: u8, velocity: u8 },
    ControlChange { channel: u8, controller: u8, value: u8 },
    ProgramChange { channel: u8, program: u8 },
    PitchBend { channel: u8, value: i16 }, // -8192 to +8191
    
    // Meta Events
    SetTempo { microseconds_per_quarter: u32 },
    TimeSignature { numerator: u8, denominator: u8 },
    KeySignature { key: i8, mode: u8 },
    TrackName { name: String },
    EndOfTrack,
    
    // System Exclusive
    SysEx { data: Vec<u8> },
}
```

### **Advanced MIDI File Features**

**4. Tempo and Timing Management:**
```typescript
class MidiTimingEngine {
    private currentTempo: number = 500000;    // Microseconds per quarter note (120 BPM default)
    private ticksPerQuarter: number;
    private sampleRate: number = 44100;
    
    // Convert MIDI ticks to audio samples
    ticksToSamples(ticks: number): number {
        const quarterNoteDuration = this.currentTempo / 1000000; // seconds
        const tickDuration = quarterNoteDuration / this.ticksPerQuarter;
        return Math.round(tickDuration * this.sampleRate);
    }
    
    // Handle tempo changes during playback
    updateTempo(newTempo: number): void {
        this.currentTempo = newTempo;
        // Recalculate timing for remaining events
    }
}
```

**5. Multi-Track Synchronization:**
- **Event merging**: All tracks merged into single time-sorted event stream  
- **Channel separation**: Events routed to appropriate MIDI channels (0-15)
- **Tempo map**: Dynamic tempo changes applied in real-time
- **Time signature**: Musical timing context for accurate playback

### **MIDI File Testing Scenarios**

**✅ EMU8000 Compatibility Testing:**
- **General MIDI files**: Test all 128 GM instrument assignments
- **Multi-channel compositions**: Verify 16-channel polyphony  
- **Complex timing**: Triplets, syncopation, tempo changes
- **Voice allocation stress**: Dense passages testing 32-voice limit
- **Controller sweeps**: Pitch bend, modulation, volume automation

**✅ SoundFont Integration Testing:**
- **Bank select messages**: Test instrument switching
- **Velocity layers**: Verify velocity-sensitive sample selection
- **Sustain pedal**: Test note sustain and release behavior
- **Effects automation**: CC modulation of filter, reverb, chorus

### **Unified MIDI Event Architecture**

**Triple Input Source Design:**
```
Virtual Keyboard Events  \
Hardware MIDI Devices     → Unified MIDI Router → Event Queue → WASM → Audio
MIDI File Playback       /
```

**Event Priority and Mixing:**
1. **Real-time inputs** (keyboard/hardware) take immediate priority
2. **File playback** continues in background
3. **Graceful mixing** of multiple sources  
4. **Same event queue** ensures consistent timing for all sources

**TypeScript Coordination Layer:**
```typescript
class UnifiedMidiRouter {
    private virtualKeyboard: VirtualMidiKeyboard;
    private hardwareInput: WebMidiInput;
    private filePlayer: MidiFileLoader;
    private wasmEventQueue: WasmMidiQueue;
    
    // Route events from any source to WASM
    routeEvent(event: MidiEvent, source: 'virtual' | 'hardware' | 'file'): void {
        // Add sample-accurate timestamp
        const sampleTime = this.audioContext.currentTime * 44100;
        event.timestamp = sampleTime;
        
        // Queue to WASM with source identification
        this.wasmEventQueue.push(event);
    }
}
```

### **Development and Testing Benefits**

**✅ Comprehensive EMU8000 Testing:**
- **Real musical content** tests synthesis under authentic conditions
- **Multi-instrument compositions** verify General MIDI compatibility  
- **Complex timing** tests sample-accurate sequencing
- **Extended compositions** test voice management and memory efficiency

**✅ Musical Accuracy Validation:**
- **Compare with reference implementations** (FluidSynth, hardware AWE32)
- **Timing precision verification** with metronome and tempo-critical pieces
- **Expression and dynamics** testing with classical and jazz compositions
- **Genre-specific testing** (orchestral, rock, electronic, etc.)

## 📁 Project File Structure

```
src/                          # Rust/WASM Core
├── lib.rs                    # Main WASM interface (MidiPlayer)
├── worklet.rs               # AudioWorklet bridge
├── midi/
│   ├── mod.rs               # MIDI module exports
│   ├── sequencer.rs         # Real-time MIDI processing
│   ├── parser.rs            # MIDI file parsing
│   └── types.rs             # MIDI data structures
├── synth/
│   ├── mod.rs               # Synthesis module exports
│   ├── voice_manager.rs     # 32-voice polyphony
│   ├── voice.rs             # Individual voice synthesis
│   └── envelope.rs          # ADSR envelope generators
├── effects/
│   ├── mod.rs               # Effects module exports
│   ├── chain.rs             # Per-voice effects processing
│   ├── filter.rs            # Low-pass filter with resonance
│   ├── reverb.rs            # Multi-tap reverb
│   └── chorus.rs            # Pitch-modulated chorus
└── soundfont/
    ├── mod.rs               # SoundFont module exports
    ├── parser.rs            # SF2 file parsing
    └── sample_manager.rs    # Sample data management

web/                          # TypeScript Web Interface
├── src/
│   ├── virtual-midi-keyboard.ts  # 88-key virtual piano interface
│   ├── midi-file-loader.ts  # MIDI file drag/drop and playback controls
│   ├── midi-input.ts        # WebMIDI device handling (ONLY complex TS)
│   ├── ui-controls.ts       # Simple UI management
│   ├── file-loader.ts       # File drag & drop handling
│   └── debug-display.ts     # Debug log display
├── index.html               # Main application interface
├── package.json             # TypeScript dependencies
└── tsconfig.json            # TypeScript configuration
```

---

# 🔧 DETAILED COMPONENT SPECIFICATIONS

## Audio Processing Flow

### Current AudioWorklet Architecture
```
JavaScript UI → AudioWorkletProcessor.process() → MidiPlayer.process() → Audio Output
             ↑                                 ↑
             │                                 │
             Single call per buffer            WASM synthesis engine
             (1024 samples)                    (32-voice polyphony)
```

### Previous Architecture (DEPRECATED)
```
JavaScript UI → ScriptProcessorNode.onaudioprocess() → Loop: midiPlayer.process() × 1024 → Audio Output
             ↑                                        ↑
             │                                        │
             Audio callback                           1024 JavaScript↔WASM calls
             (performance bottleneck)                 (major performance issue)
```

## Component Details

### 1. **AudioWorkletProcessor** (`src/worklet.rs`)
**Purpose**: Bridge between Web Audio API and WASM synthesis engine

**Key Features:**
- **Dual Mode**: Track playback OR MIDI synthesis
- **Buffer Management**: Handles Web Audio API buffers
- **WASM Integration**: Single MidiPlayer instance for synthesis
- **Performance**: One WASM call per audio buffer (not per sample)

**Methods:**
- `set_midi_player()`: Initialize MIDI synthesis mode
- `process()`: Main audio processing (called by Web Audio API)
- `play()/pause()/stop()`: Playback control
- `load_soundfont()/load_midi_file()`: File loading bridge

### 2. **MidiPlayer** (`src/lib.rs`)
**Purpose**: Main WASM interface and coordination

**Key Features:**
- **File Management**: SoundFont and MIDI loading
- **State Management**: Playback control and status
- **Debug System**: Centralized logging via `add_debug_log()`
- **Audio Processing**: Coordinates sequencer and voice manager
- **Real-time MIDI Queue**: Lock-free event queue for WebMIDI input

**Critical Methods:**
- `process()`: Single sample synthesis (called 1024x per buffer)
- `queueMidiEvent()`: Non-blocking MIDI event queuing from TypeScript
- `loadSoundFont()`/`loadMidiFile()`: File parsing and setup
- `getDebugLog()`: Returns debug trace for UI display

**Timing Architecture:**
- **Sample-accurate MIDI processing**: Events scheduled to exact sample timing
- **Lock-free queue**: No audio thread blocking from TypeScript events
- **Timestamp conversion**: WebMIDI time → audio sample time

### 3. **MidiSequencer** (`src/midi/sequencer.rs`)
**Purpose**: Real-time MIDI event processing and timing

**Key Features:**
- **Timing**: High-precision playback using `performance.now()`
- **Event Processing**: Handles all MIDI message types
- **Channel State**: 16 MIDI channels with individual settings
- **Track Management**: Multi-track MIDI file support

**EMU8000 Compatibility:**
- Channel 10 (index 9): Percussion (bank 128)
- Sustain pedal support
- Program change and bank select
- Proper note on/off handling

### 4. **VoiceManager** (`src/synth/voice_manager.rs`)
**Purpose**: 32-voice polyphonic synthesis management

**Key Features:**
- **Voice Allocation**: Intelligent voice stealing (releasing voices first, then low velocity)
- **Velocity Layering**: Multiple samples per note based on velocity ranges
- **Crossfading**: Smooth transitions between velocity layers
- **EMU8000 Voices**: Exactly 32 voices matching original hardware

**Voice Stealing Algorithm:**
1. Find idle voice
2. If none, find releasing voice
3. If none, steal lowest velocity voice

### 5. **Voice** (`src/synth/voice.rs`)
**Purpose**: Individual voice synthesis and effects

**Key Features:**
- **Sample Playback**: High-quality interpolation (better than EMU8000)
- **ADSR Envelopes**: Volume and modulation envelopes
- **Effects Chain**: Per-voice filter, LFO, reverb, chorus
- **Pitch Control**: Real-time pitch shifting

**EMU8000 Signal Flow:**
```
Sample → Pitch Mod → Filter → Amplifier → Effects → Pan → Output
```

### 6. **EffectsChain** (`src/effects/chain.rs`)
**Purpose**: Authentic EMU8000 effects processing

**Key Features:**
- **LFO System**: Dual LFOs (modulation + vibrato)
- **Filter**: Low-pass 100Hz-8kHz with resonance
- **Reverb**: Multi-tap delay with room scaling
- **Chorus**: Pitch-modulated delay
- **Per-Voice**: Each voice has complete effects chain

### 7. **SoundFont Engine** (`src/soundfont/`)
**Purpose**: Complete SoundFont 2.0 implementation

**Key Components:**
- **Parser**: RIFF chunk parsing for .sf2 files
- **Sample Manager**: Sample data and layer management
- **Generator System**: All 58 SoundFont generators
- **Hierarchy**: Preset → Instrument → Sample structure

## Debug System Architecture

### Debug Logging Flow
```
Rust Code → crate::log() → VecDeque Buffer → getDebugLog() → JavaScript → UI Textarea
```

### Debug Rules (MANDATORY)
1. **NEVER use browser console methods** (`console.log`, `console.error`, etc.)
2. **ALWAYS use `crate::log()`** for debug output
3. **Buffer Management**: 200 entry limit to prevent memory issues
4. **Performance**: No cycle-by-cycle logging in audio processing
5. **Visibility**: All debug info goes to in-page textarea

### Debug Trace Points
- File loading (SoundFont/MIDI)
- Playback state changes
- MIDI event processing
- Voice allocation and sample lookup
- Audio buffer processing
- Error conditions

## Performance Considerations

### Audio Thread Performance
- **Sample Rate**: 44.1kHz (44,100 samples/second)
- **Buffer Size**: 1024 samples per callback
- **Processing Time**: ~23ms per buffer (must complete in <23ms)
- **Voice Count**: 32 simultaneous voices maximum

### Memory Management
- **SoundFont Samples**: Loaded once, shared across voices
- **Voice State**: Minimal per-voice memory footprint
- **Debug Buffer**: Limited to 200 entries
- **Audio Buffers**: Reused, not allocated per callback

### JavaScript↔WASM Boundary
- **OLD**: 1024 calls per buffer (major bottleneck)
- **NEW**: 1 call per buffer (optimal performance)
- **Data Transfer**: Minimal - only control messages
- **Audio Data**: Processed entirely in WASM

## EMU8000 Authenticity Features

### Hardware Matching
- **Voice Count**: 32 voices (exact match)
- **Effects**: Per-voice processing (not global buses)
- **Parameters**: EMU8000 ranges and scaling
- **Signal Flow**: Authentic audio path

### SoundFont 2.0 Compliance
- **All 58 Generators**: Complete implementation
- **Modulators**: Default velocity modulators
- **Hierarchy**: Preset/Instrument/Sample structure
- **Loop Points**: Sample loop support

### Modern Improvements
- **Interpolation**: High-quality (better than linear)
- **Bit Depth**: 32-bit float processing
- **Effects Quality**: Modern algorithms with authentic behavior
- **Timing**: High-precision MIDI timing

## Development Commands

```bash
# Initialize git repository (first time only)
git init
git add .
git commit -m "Initial commit"

# Build WASM module
wasm-pack build --target web

# Run tests (when implemented)
wasm-pack test --headless --firefox

# Serve for local testing
npx serve . -p 3000
# or alternatively
npx http-server -p 3000

# Git workflow for each completed task
git add .
git commit -m "Complete task: [task-description]"
```

## 📝 Architecture Evolution Protocol

### **When to Update This Document:**
- **New component added** - Add to system architecture diagram and component details
- **Design decision changed** - Update principles and rationale sections
- **Performance insights discovered** - Update performance considerations
- **Interface changes** - Update component specifications and method signatures
- **Debug/testing findings** - Update debug architecture and trace points

### **How to Maintain Organization:**
1. **Keep the top-down flow** - Overview → Principles → Architecture → Details
2. **Update diagrams** - Modify ASCII diagrams to reflect current architecture
3. **Maintain consistency** - Use same formatting and emoji conventions
4. **Cross-reference** - Update related sections when making changes
5. **Document decisions** - Include rationale for architectural changes

### **Mandatory Updates:**
- **After each major component implementation** - Add detailed specifications
- **When interfaces change** - Update component method signatures
- **Performance optimizations** - Update performance considerations section
- **New architectural patterns discovered** - Add to principles section

**This architecture document is a living document that must evolve with the codebase.**

---

## 🎹 **TypeScript Web Interface Architecture (Refactored December 2024)**

Following comprehensive refactoring in December 2024, the TypeScript codebase now implements a **highly modular, type-safe, and maintainable architecture** with centralized utilities and shared patterns.

### **📂 Directory Structure**
```
web/src/
├── types/                          # Centralized Type System
│   ├── midi-types.ts              # Branded MIDI types & validation
│   ├── input-types.ts             # Input handler interfaces
│   └── project-types.ts           # Global project types
├── utils/                          # Shared Utilities (NEW)
│   ├── debug-logger.ts            # Centralized debug logging
│   ├── config-validator.ts        # Runtime type validation
│   ├── enhanced-config-loader.ts  # Config loading with validation
│   ├── ui-components.ts           # Reusable UI component factories
│   ├── ui-styles.ts               # Centralized CSS style management
│   └── velocity-utils.ts          # Velocity analysis utilities
├── input-handlers/                # Input Processing
│   ├── base-input-handler.ts      # Base handler interface
│   ├── touch-input-handler.ts     # Touch/gesture input
│   ├── keyboard-input-handler.ts  # Computer keyboard MIDI
│   ├── pointer-input-handler.ts   # Stylus/pen input
│   └── gamepad-input-handler.ts   # Controller input
├── cc-controls/                   # MIDI CC Management
│   ├── control-factory.ts         # UI control creation
│   └── control-group-builder.ts   # Control group management
├── virtual-keyboard/              # Piano Interface
│   └── keyboard-layout.ts         # 88-key layout generation
├── configs/                       # JSON Configuration Files
│   ├── gm-instruments.json        # General MIDI instrument definitions
│   ├── gm-drums.json             # GM drum map
│   ├── gm-drum-kits.json         # Drum kit variations
│   └── midi-cc-controls.json     # MIDI CC definitions
├── input-manager.ts               # Unified input coordination
├── virtual-midi-keyboard.ts       # Virtual piano implementation
├── gm-sound-library.ts           # GM instrument/drum selector
├── midi-cc-controls.ts           # MIDI CC control interface
├── midi-cc-definitions.ts        # CC control definitions
├── midi-constants.ts             # MIDI constants & utilities
├── velocity-curves.ts            # Velocity processing
├── midi-bridge.ts                # WASM interface bridge
└── config-loader.ts              # Basic config loading
```

### **🔧 Architectural Patterns Implemented**

#### **1. Centralized Utility Systems**
```typescript
// Debug logging - component-specific loggers
export const DEBUG_LOGGERS = {
    inputManager: new DebugLogger('InputManager'),
    virtualKeyboard: new DebugLogger('VirtualKeyboard'),
    midiControls: new DebugLogger('MidiControls')
};

// UI component factories - reusable patterns
export function createButton(config: ButtonConfig): HTMLButtonElement
export function createSelect(options: SelectOption[], onChange: Function): HTMLSelectElement
export function createSlider(config: SliderConfig): HTMLElement

// Centralized style management
export function injectStyles(styleId: string, css: string): void
export function generateComponentStyles(componentName: string): string
```

#### **2. Type-Safe Configuration System**
```typescript
// Runtime validation with branded types
export type MIDINoteNumber = number & { readonly __brand: 'MIDINoteNumber' };
export type MIDIVelocity = number & { readonly __brand: 'MIDIVelocity' };

// Enhanced config loading with validation
export interface ValidatedConfig<T> {
    data: T;
    metadata: ConfigMetadata;
    errors: ConfigValidationError[];
}

// Async configuration loading with caching
export const enhancedConfigLoader = new EnhancedConfigLoader();
const config = await enhancedConfigLoader.loadConfig<GMInstrument[]>('gm-instruments');
```

#### **3. Unified Input Management**
```typescript
// Single coordinator for all input methods
export class InputManager {
    private handlers: Map<string, BaseInputHandler> = new Map();
    private velocityProcessor: VelocityCurveProcessor;
    
    // Unified velocity processing across all input types
    public setVelocityProfile(profileName: string): boolean
    public setVelocitySensitivity(sensitivity: number): void
}

// Standardized input handler interface
export abstract class BaseInputHandler {
    abstract initialize(): void;
    abstract setEnabled(enabled: boolean): void;
    abstract cleanup(): void;
}
```

### **🎯 Key Architecture Benefits**

#### **Type Safety & Validation**
- **Branded Types**: Prevent mixing MIDI note numbers with velocities
- **Runtime Validation**: Catch configuration errors early with detailed messages
- **Type Guards**: Safe type checking throughout the codebase

#### **Code Reusability**
- **UI Component Factories**: Eliminate ~300 lines of duplicate DOM creation
- **Shared Style Management**: Consistent theming across all components
- **Centralized Constants**: Single source of truth for MIDI values, UI dimensions

#### **Maintainability**
- **Modular Architecture**: Clear separation of concerns
- **Debug System**: Component-specific logging with performance optimizations
- **Configuration System**: JSON-based configs with hot reloading capability

#### **Performance Optimizations**
- **Efficient DOM Updates**: Reusable components reduce creation overhead
- **Style Injection**: Prevents duplicate CSS with ID-based deduplication
- **Memory Management**: Proper cleanup patterns in all components

### **🔗 Component Integration Flow**
```
JSON Configs → Enhanced Config Loader → Runtime Validation → Component Initialization
     ↓                    ↓                    ↓                      ↓
Type Safety      Caching & Metadata    Error Reporting      Validated Data
```

```
Input Events → Input Manager → Velocity Processing → MIDI Bridge → WASM
     ↓              ↓               ↓                  ↓           ↓
Multi-source    Unified API    Curve Processing   Type-safe    Audio Engine
(Touch/KB/      Coordination   & Sensitivity      Interface    Processing
 Mouse/Pad)
```

```
UI Components → Shared Factories → Style Management → DOM Integration
     ↓               ↓                   ↓               ↓
Consistent     Reusable Patterns   Theme Support   Performance
Interface      & Type Safety       & Deduplication Optimized
```

### **🎼 MIDI System Integration**

#### **Type-Safe MIDI Processing**
```typescript
// Branded types prevent common MIDI errors
const note: MIDINoteNumber = createMIDINoteNumber(60); // Middle C
const velocity: MIDIVelocity = createMIDIVelocity(100);
const channel: MIDIChannel = createMIDIChannel(0);

// Validated ranges with helpful error messages
if (!isValidMIDINote(note)) {
    throw new MIDIValidationError(`Invalid note: ${note}`);
}
```

#### **Unified Constants System**
```typescript
// Centralized MIDI constants
export const MIDI_CC = {
    SUSTAIN_PEDAL: 64,
    CHANNEL_VOLUME: 7,
    PAN: 10,
    REVERB_SEND: 91,
    CHORUS_SEND: 93
};

// UI timing constants
export const UI_CONSTANTS = {
    VISUAL_FEEDBACK_DURATION_MS: 200,
    DRUM_TRIGGER_DURATION_MS: 150,
    GRID_MIN_COLUMN_WIDTH_STANDARD: 200
};
```

### **🔧 Universal Refactoring Methodology: Dependency-Based Approach**

**CRITICAL PRINCIPLE**: **ALL future refactoring** (Rust, TypeScript, or any language) should follow **dependency-based analysis** rather than priority-based approaches.

#### **Why Dependency-Based Refactoring**
- **Minimize file revisits**: Each component typically touched only once
- **Clean change propagation**: Foundation changes flow naturally to dependents
- **Reduced risk**: No need to revisit "completed" components when dependencies change
- **Predictable impact**: Each phase has clearly defined scope and effects

#### **Universal Dependency Analysis Framework**

**Applies to Rust WASM Core AND TypeScript Web Interface:**

```
Phase 1: FOUNDATIONAL (Impact ALL components across languages)
├── Core data structures and types (Rust: structs/enums, TS: interfaces/types)
├── Shared utilities and base abstractions (logging, validation, error handling)
├── Constants and configuration systems (MIDI specs, audio parameters)
└── Memory management and resource allocation patterns

Phase 2: INTERMEDIATE (Impact SOME components within language boundaries)
├── Processing pipelines and algorithms (audio synthesis, UI rendering)
├── Coordinating systems (voice managers, input coordinators)
├── Shared business logic (velocity processing, effects chains)
└── Inter-language communication interfaces (WASM ↔ TypeScript)

Phase 3: ISOLATED (Impact MINIMAL components, language-specific)
├── Constants extraction and magic number elimination
├── Method decomposition and internal optimizations
├── Language-specific type safety improvements
└── Performance micro-optimizations
```

**Universal Implementation Rule**: Always analyze component dependencies BEFORE starting refactoring work across **both Rust and TypeScript codebases** to determine the optimal order that minimizes having to go back and include refactoring changes among linked files.

### **🚀 Future Architecture Considerations**

#### **Scalability Patterns**
- **Plugin Architecture**: Easy to add new input handlers or UI components
- **Configuration Schema**: Runtime validation supports complex nested configs
- **Theme System**: Centralized styling supports multiple visual themes

#### **Performance Monitoring**
- **Debug System**: Performance-aware logging that doesn't impact audio thread
- **Memory Tracking**: Proper cleanup patterns prevent memory leaks
- **Component Lifecycle**: Standardized initialization/cleanup across all components

This refactored architecture provides a **solid foundation** for future EMU8000 emulator enhancements while maintaining **type safety**, **performance**, and **code maintainability**.

---

**Remember: When returning to this project, read both CLAUDE.md and this ARCHITECTURE.md file completely to understand the system design, constraints, and current implementation status.**