# AWE Player - Fresh Start 

A WebAssembly-based EMU8000 emulator written in Rust that provides authentic SoundFont 2.0 synthesis in the browser.

## 🎯 Project Vision

AWE Player is a faithful EMU8000 chip emulation that recreates the exact sound and behavior of the original Creative Sound Blaster AWE32/64 sound cards. This fresh start applies lessons learned from previous development to create a robust, token-efficient implementation with comprehensive MIDI support.

**Core Objectives:**
- **Authentic EMU8000 Emulation**: Per-voice effects, 32-voice polyphony, exact parameter ranges
- **Complete SoundFont 2.0 Support**: All 58 generators with FluidSynth-compatible accuracy  
- **Full MIDI System**: Recording, playback, and real-time input (high priority for testing)
- **Zero-GC Real-Time Audio**: Rust/WASM for deterministic performance
- **Token-Efficient Development**: Micro-task architecture preventing development bottlenecks

## 🏗️ Planned Architecture

### **Technical Stack**
- **Rust + WebAssembly**: Zero garbage collection for real-time audio performance
- **TypeScript**: WebMIDI coordination only (minimal JavaScript)
- **AudioWorklet**: Modern audio processing (replacing ScriptProcessorNode)
- **Node.js Development Server**: Port 3000 for familiar web development

### **EMU8000 Authentic Features (Planned)**
🎵 **Complete SoundFont 2.0 Support**
- Full .sf2 file parsing with RIFF chunk structure
- Preset/Instrument/Sample hierarchy
- All 58 SoundFont generators (exact FluidSynth compatibility)
- Authentic parameter scaling and ranges

🎹 **32-Voice Polyphonic Synthesis**
- Sample-based synthesis with 4-point EMU8000 interpolation
- Intelligent voice allocation and stealing algorithms
- Pitch shifting and sample rate conversion
- Loop point support with seamless playback

🎛️ **Per-Voice Effects Processing**
- Low-pass filter with resonance (100Hz-8kHz EMU8000 range)
- Dual LFO system (tremolo + vibrato, 0.1Hz-20Hz range)
- 6-stage ADSR envelopes (exponential curves, not linear)
- Multi-tap reverb with EMU8000-style room scaling
- Pitch-modulated chorus with authentic signal flow

🎼 **Complete MIDI System** (High Priority)
- Real-time MIDI input via WebMIDI API (TypeScript coordination)
- MIDI file recording and playback (Rust implementation)
- Sample-accurate timing with lock-free event queues
- Full General MIDI compatibility

## 🎵 EMU8000 Authentic Signal Flow

```
SoundFont Sample → Pitch Modulation → Low-Pass Filter → Volume Envelope → Effects → Stereo Pan → Output
```

**Per-Voice Processing Chain:**
1. **Sample Playback** - 4-point interpolation with loop support
2. **Pitch Modulation** - Vibrato LFO + modulation envelope
3. **Low-Pass Filter** - Resonant filter with LFO + envelope modulation (100Hz-8kHz)
4. **Volume Control** - ADSR envelope + tremolo LFO
5. **Effects Sends** - Reverb and chorus with per-voice send levels
6. **Stereo Panning** - Per-voice stereo positioning

**Architecture Principles:**
- **32 voices maximum** (EMU8000 hardware limit)
- **Per-voice effects** (not modern send/return buses)
- **Zero garbage collection** (Rust ensures real-time performance)
- **Sample-accurate MIDI timing** (lock-free event queues)

## 🛠️ Development Setup

### Prerequisites

- **Rust toolchain** with wasm32-unknown-unknown target
- **wasm-pack** for WebAssembly compilation
- **Node.js** for development server (port 3000)

### Quick Start

```bash
# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Initialize project (first task)
git init
git add .
git commit -m "Initial commit"

# Build WebAssembly module (when ready)
wasm-pack build --target web

# Development server
npx serve . -p 3000
# or
npx http-server -p 3000
```

### 🎯 Token-Efficient Development Strategy

This project uses **micro-task architecture** to prevent token exhaustion:

- **Each task**: 15-30 lines maximum, single concept
- **Foundation phase**: 14 micro-tasks to working WASM build
- **Incremental progress**: One task per development session
- **Git workflow**: Commit after each completed task

**Current Status**: Foundation Phase (0/14 tasks completed)

## 📁 Planned Project Structure

```
src/                          # Rust/WASM Core
├── lib.rs                    # Main WASM interface (MidiPlayer)
├── error.rs                  # AweError enum (5 basic error cases)
├── midi/                     # MIDI system (HIGH PRIORITY)
│   ├── mod.rs               # MIDI module exports
│   ├── message.rs           # MidiMessage enum (NoteOn, NoteOff, ProgramChange)
│   ├── sequencer.rs         # Real-time MIDI processing
│   └── parser.rs            # MIDI file parsing
├── synth/                    # Synthesis engine
│   ├── mod.rs               # Synthesis module exports
│   ├── voice.rs             # Voice struct (note, velocity, phase)
│   ├── voice_manager.rs     # VoiceManager with 32-voice array
│   └── envelope.rs          # ADSR envelope generators
├── effects/                  # EMU8000-authentic effects
│   ├── mod.rs               # Effects module exports
│   ├── chain.rs             # Per-voice effects processing
│   ├── filter.rs            # Low-pass filter (100Hz-8kHz)
│   ├── lfo.rs               # Dual LFO system (0.1Hz-20Hz)
│   ├── reverb.rs            # Multi-tap reverb
│   └── chorus.rs            # Pitch-modulated chorus
└── soundfont/                # SoundFont 2.0 system
    ├── mod.rs               # SoundFont module exports
    ├── types.rs             # SoundFontHeader struct
    ├── parser.rs            # RIFF-based .sf2 parser
    └── sample_manager.rs    # Sample management

web/                          # TypeScript Web Interface
├── src/
│   ├── midi-input.ts        # WebMIDI device handling (ONLY complex TS)
│   ├── ui-controls.ts       # Simple UI management
│   └── file-loader.ts       # File drag & drop handling
├── index.html               # Main application interface
├── package.json             # TypeScript dependencies
└── tsconfig.json            # TypeScript configuration

docs/                         # Project Documentation
├── CLAUDE.md                # Development guidelines (TOKEN-EFFICIENT)
├── ARCHITECTURE.md          # Complete system design
├── EMU8000_REFERENCE.md     # Technical reference (668 lines)
├── PROJECT_TODO.md          # Foundation tasks backup
└── README.md                # This file
```

## 🚀 Current Development Status

**🎯 PROJECT PHASE: Foundation (Planning Complete)**

This is a **fresh start** applying lessons learned from previous development. All documentation and architecture planning is complete.

### ✅ **Completed Documentation:**
- **CLAUDE.md**: Token-efficient development guidelines with micro-task architecture
- **ARCHITECTURE.md**: Complete system design with TypeScript/WASM coordination  
- **EMU8000_REFERENCE.md**: Comprehensive technical reference (668 lines, reorganized)
- **PROJECT_TODO.md**: 14 foundation micro-tasks with session recovery protocol

### 🔄 **Next Phase: Foundation Implementation**
**Foundation Tasks (0/14 completed):**
1. Initialize git repository + .gitignore
2. Create Cargo.toml (10 lines max)  
3. Create src/lib.rs skeleton (15 lines)
4. Implement crate::log() debug system (20 lines)
5. Create module directories
6. Basic error types (25 lines)
7. MIDI message enum (20 lines)
8. Voice struct (15 lines)
9. VoiceManager struct (20 lines)
10. SoundFont header struct (15 lines)
11. WASM interface exports (25 lines)
12. First successful WASM build
13. Basic HTML interface (30 lines)
14. Initial git commit

### 🎯 **Success Criteria**
- **Working WASM build** with debug logging
- **Basic HTML test interface** loading and calling WASM
- **Foundation for next phase** (MIDI implementation)

## 📚 Documentation Reference

- **CLAUDE.md**: Start here for development guidelines
- **ARCHITECTURE.md**: Complete system design and component details
- **EMU8000_REFERENCE.md**: Technical specifications and implementation details
- **PROJECT_TODO.md**: Task backup and session recovery protocol

**Development Approach**: Micro-tasks (15-30 lines each) to prevent token exhaustion and ensure steady progress.