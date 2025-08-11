# CLAUDE.md - AWE Synth Project Guide

This file provides essential guidance to Claude Code when working with this repository.

## 🛑 MANDATORY SESSION INITIALIZATION

### Required Reading (In Order)
1. **CLAUDE.md** (this file) - Project overview and critical rules
2. **docs/ARCHITECTURE.md** - System design and components
3. **docs/PROJECT_TODO.md** - Current development status
4. **docs/MULTIZONE_VOICE_DESIGN.md** - Voice system architecture (Phase 20)
5. **docs/UNIFIED_DEBUG_SYSTEM.md** - Debug approach (NO console.log)

### Project Reality Check
- **Status**: Has NEVER produced audio - all infrastructure exists but outputs silence
- **Current Phase**: 20 - Complete MultiZoneSampleVoice rebuild from scratch
- **Primary Blocker**: Sample interpolation returns silence
- **Test SoundFont**: `/web/public/sf2/instruments/middle_c_sine.sf2`

## 🎯 PROJECT INTENT

**Goal**: Faithful EMU8000 chip emulation for authentic SoundFont 2.0 playback in browser via WebAssembly.

**Core Requirements**:
- 32-voice polyphonic synthesis at 44.1kHz
- Complete SoundFont 2.0 support (all 58 generators)
- Per-voice effects processing (EMU8000 architecture)
- All MIDI/audio logic in Rust, minimal JavaScript

## ⚠️ CRITICAL RULES

### FORBIDDEN Actions
- ❌ **NO console.log or crate::log** - Use unified debug system only
- ❌ **NO test code in src/** - Tests go in tests/ directory only
- ❌ **NO new features** until basic audio works
- ❌ **NO unwrap() or expect()** - Handle all errors gracefully

### REQUIRED Actions
- ✅ Use unified debug system (see docs/UNIFIED_DEBUG_SYSTEM.md)
- ✅ Focus on Phase 20: MultiZoneSampleVoice rebuild
- ✅ Test with middle_c_sine.sf2 before complex SoundFonts
- ✅ Update docs/PROJECT_TODO.md after every task
- ✅ Document session progress in docs/TESTING_PROGRESSION.md

## 🏗️ ARCHITECTURE PRINCIPLES

### EMU8000 Signal Flow
```
Sample → Pitch Mod → Filter → ADSR → Effects → Pan → Output
```

### Key Constraints
- 32-voice maximum (hardware limit)
- Filter range: 100Hz-8kHz
- Per-voice effects (not modern bus architecture)
- Sample-accurate 44.1kHz processing

### MIDI↔Synth Integration
Every MIDI change affects synthesis and vice versa:
- MIDI events → voice allocation → envelope triggers → effects
- Real-time CC → synthesis parameters → voice updates
- Timing critical: sample-accurate scheduling required

## 🚨 DEBUG SYSTEM

### TypeScript/JavaScript
```typescript
import { debugManager } from '../utils/DebugManager'
debugManager.logUserAction('Action', { data })  // Auto-captures WASM state
debugManager.logSystemEvent('Event')
debugManager.logError('Error', { context })
```

### Rust/WASM
```rust
// Return structured diagnostics, NO text logging in audio loops
#[wasm_bindgen]
pub fn diagnose_audio_pipeline() -> String {
    // Return JSON diagnostics
}
```

## 🌐 BROWSER CONSTRAINTS

### Critical Limitations
1. **AudioContext requires user gesture** - Cannot auto-start
2. **ScriptProcessorNode deprecated** - Using despite issues
3. **WASM memory limits** - Large SoundFonts may fail
4. **Single-threaded JS** - Heavy UI affects audio

### Web Audio Pattern
```javascript
// AudioContext resume on user interaction
const events = ['click', 'keydown', 'touchstart']
events.forEach(event => {
  document.addEventListener(event, resumeAudio, { once: true })
})
```

## 🧪 TESTING ARCHITECTURE

### Directory Structure
```
tests/          # All test code here
├── unit/       # Component tests
├── integration/# Interface tests
└── mocks/      # External mocks

src/            # Production only - NO test code
├── synth/      # Clean implementation
├── effects/    # No #[cfg(test)]
└── midi/       # No mocks
```

## 🛠️ DEVELOPMENT WORKFLOW

### Build Commands
```bash
# Build WASM
wasm-pack build --target web

# Run dev server
npm run dev  # or pnpm dev

# Test at
http://localhost:3000/tests/wasm-diagnostics
```

### Development Phases
1. **Foundation** - Core structures, error handling, debug system
2. **Core Features** - MIDI, synthesis, effects, SoundFont parsing
3. **Advanced** - Optimization, additional effects, WebMIDI

## 🎯 TOKEN-EFFICIENT STRATEGY

### Micro-Task Rules
- Each task: ≤30 lines of code
- Clear file path and line estimate
- Single concept per task
- Use Task tool for >50 line implementations

### Session Protocol
1. Check TodoWrite tool (restore from PROJECT_TODO.md if empty)
2. Pick 1-2 micro-tasks
3. Mark in_progress → complete immediately when done
4. Update docs/PROJECT_TODO.md
5. Document progress in TESTING_PROGRESSION.md

### Complexity Gates
Before starting any task, ask:
- Can this be done in <30 lines? (If no → break down)
- Does this need >1 concept? (If yes → split)
- Will this touch >2 components? (If yes → interfaces first)

## 📋 TODO LIST MANAGEMENT

### Critical Rule
**Always use TodoWrite tool** - It's the single source of truth

### Update Protocol
- Mark tasks in_progress when starting
- Mark completed immediately when done
- Break down any task >30 lines
- Update PROJECT_TODO.md after changes

### Good Todo Examples
- "Add NoteOn to MidiMessage enum in src/midi/message.rs (5 lines)"
- "Create Voice::new() with validation in src/synth/voice.rs (15 lines)"

### Bad Todo Examples
- "Implement MIDI system" (too broad)
- "Fix audio" (unclear scope)

## 📚 KEY DOCUMENTATION

Essential references for detailed information:
- **docs/ARCHITECTURE.md** - Complete system design
- **docs/EMU8000_REFERENCE.md** - Hardware specifications
- **docs/TESTING_ARCHITECTURE.md** - Testing approach
- **docs/UNIFIED_DEBUG_SYSTEM.md** - Debug system details
- **docs/MULTIZONE_VOICE_DESIGN.md** - Current voice architecture
- **docs/DEVELOPMENT_SEQUENCE.md** - Implementation strategy
- **docs/WASM_EXPORTS.md** - Available WASM functions

## 🚀 QUICK START

1. Read this file and required docs
2. Check/restore TodoWrite tool from PROJECT_TODO.md
3. Run dev server: `npm run dev`
4. Test at: http://localhost:3000/tests/wasm-diagnostics
5. Focus on Phase 20: Make ONE NOTE audible first

**Remember**: The project has NEVER produced audio. All work should focus on getting the first audible note from middle_c_sine.sf2 before adding any new features.