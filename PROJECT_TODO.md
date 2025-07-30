# AWE Player Project TODO - Fresh Start

**Last Updated:** July 30, 2025
**Status:** Foundation Phase - COMPLETE ✅

## 🎯 Current Development Phase: Foundation (COMPLETE)

All foundation tasks completed successfully using micro-task architecture (15-30 lines max, single concept, token-efficient).

### **Foundation Tasks (All High Priority) - COMPLETE ✅**

1. **[COMPLETED] init-git-repo** - Initialize git repository and create .gitignore for Rust/WASM project
2. **[COMPLETED] init-cargo-project** - Create new Cargo.toml with basic wasm-pack dependencies (16 lines)
3. **[COMPLETED] create-lib-rs-skeleton** - Create src/lib.rs with wasm-bindgen imports and basic module structure (37 lines)
4. **[COMPLETED] debug-log-function** - Implement crate::log() function with VecDeque buffer in src/lib.rs (200-entry buffer)
5. **[COMPLETED] project-structure-dirs** - Create empty module directories: src/midi/, src/synth/, src/soundfont/, src/effects/
6. **[COMPLETED] basic-error-types** - Create src/error.rs with AweError enum covering 5 basic error cases (27 lines)
7. **[COMPLETED] midi-message-enum** - Create src/midi/message.rs with MidiMessage enum: NoteOn, NoteOff, ProgramChange (26 lines)
8. **[COMPLETED] voice-state-struct** - Create src/synth/voice.rs with Voice struct containing note, velocity, phase fields (23 lines)
9. **[COMPLETED] voice-manager-array** - Create src/synth/voice_manager.rs with VoiceManager struct and 32-voice array (29 lines)
10. **[COMPLETED] soundfont-header-struct** - Create src/soundfont/types.rs with basic SoundFontHeader struct (18 lines)
11. **[COMPLETED] wasm-interface-skeleton** - Add 3 basic WASM exports to lib.rs: new(), get_debug_log(), play_test_tone() (25 lines)
12. **[COMPLETED] first-build-test** - Run 'wasm-pack build --target web' and verify successful compilation ✅
13. **[COMPLETED] basic-html-interface** - Create minimal index.html that loads WASM and calls get_debug_log() (48 lines)
14. **[COMPLETED] initial-git-commit** - Initial git commit with all foundation files + GitHub repository created

## 📋 Session Management Protocol

### **For New Sessions:**
1. **Check TodoWrite tool status** first
2. **If todo list is empty**, restore from this PROJECT_TODO.md file
3. **Sync any differences** between TodoWrite and this file
4. **Always update both** TodoWrite tool AND this file during development

### **Task Status Tracking:**
- **PENDING** - Not started
- **IN_PROGRESS** - Currently being worked on
- **COMPLETED** - Task finished and verified
- **BLOCKED** - Waiting on dependency

### **Next Phase Preview (After Foundation Complete):**
After completing all 12 foundation tasks, next micro-tasks will be:
- Add MIDI file header parsing (single chunk type)
- Implement basic sine wave audio generation
- Add simple SoundFont sample loading (no generators)
- Create basic voice synthesis (single voice, no effects)

## 🎯 Token-Efficient Development Rules

**Each task must:**
- Be completable in 15-20 tokens maximum
- Have clear success criteria (specific files, line counts)
- Not depend on more than 1 other incomplete task
- Include specific file names and line count estimates

**Complexity Gates:**
- If >30 lines needed → Break into smaller tasks
- If >1 new concept → Separate concepts
- If >3 dependencies → Create interfaces first

## 📊 Progress Tracking

**Foundation Phase:** 14/14 tasks completed (100%) ✅
**Milestone Achieved:** Working WASM build with debug system ✅
**GitHub Repository:** https://github.com/spetrequin/awe-synth ✅
**Next Phase:** MIDI System Implementation (High Priority)

## 🎹 Current Development Phase: TypeScript MIDI Integration

**Branch:** `typescript-midi-integration`  
**Strategy:** Develop MIDI and synth together to prevent integration issues

### **MIDI Integration Tasks (28 High Priority Micro-Tasks)**

**🚨 INTEGRATION REQUIREMENT:** Every MIDI task includes corresponding synthesis verification  
**🎹 VIRTUAL MIDI KEYBOARD:** Complete 88-key interface for testing without hardware  
**🎼 MIDI FILE SUPPORT:** Full .mid file loading, parsing, and playback

**📋 LOGICAL IMPLEMENTATION ORDER:**

### **Phase 1: Foundation Setup (Tasks 1-4)**
1. **[PENDING] web-package-json** - Create web/package.json with TypeScript and WebMIDI dependencies
2. **[PENDING] web-tsconfig** - Create web/tsconfig.json for TypeScript configuration
3. **[PENDING] wasm-midi-queue** - Add lock-free MIDI event queue interface to src/lib.rs (WASM side)
4. **[PENDING] midi-timing-bridge** - Create TypeScript↔WASM bridge for MIDI events with sample-accurate timing

### **Phase 2: Virtual MIDI Keyboard (Tasks 5-8)**
5. **[PENDING] virtual-midi-keyboard** - Create web/src/virtual-midi-keyboard.ts - 88-key piano interface
6. **[PENDING] gm-instrument-selector** - Add General MIDI instrument selector (128 instruments)
7. **[PENDING] midi-cc-controls** - Implement CC controls: pitch bend, modulation wheel, sustain pedal
8. **[PENDING] keyboard-input-handling** - Add keyboard mouse/touch input with velocity sensitivity

### **Phase 3: Hardware MIDI Support (Tasks 9-11)**
9. **[PENDING] webmidi-device-discovery** - Create web/src/midi-input.ts - WebMIDI device discovery and connection
10. **[PENDING] midi-message-parsing** - Implement MIDI message parsing and validation in midi-input.ts
11. **[PENDING] midi-device-management** - Implement MIDI device state management (connect/disconnect)

### **Phase 4: MIDI File Support (Tasks 12-15)**
12. **[PENDING] midi-file-parser** - Add MIDI file parser basics in src/midi/parser.rs
13. **[PENDING] midi-track-parsing** - Implement MIDI track parsing and event extraction
14. **[PENDING] midi-file-loader** - Create web/src/midi-file-loader.ts - drag/drop MIDI file interface
15. **[PENDING] midi-playback-controls** - Add MIDI file playback controls: play/pause/stop/seek

### **Phase 5: MIDI Integration (Tasks 16-18)**
16. **[PENDING] unified-midi-routing** - Unified MIDI routing: virtual keyboard + hardware + file playback → WASM
17. **[PENDING] rust-midi-sequencer** - Add basic MIDI sequencer structure in src/midi/sequencer.rs
18. **[PENDING] midi-voice-connection** - Connect VoiceManager to MIDI events (note_on/note_off)

### **Phase 6: Integration Verification (Tasks 19-21)**
19. **[PENDING] midi-queue-voice-integration** - 🔄 INTEGRATION CHECK: Verify MIDI queue integration with VoiceManager
20. **[PENDING] sequencer-voice-timing-integration** - 🔄 INTEGRATION CHECK: Verify sequencer timing affects voice envelope timing
21. **[PENDING] voice-allocation-midi-integration** - 🔄 INTEGRATION CHECK: Test voice allocation/stealing with MIDI priority

### **Phase 7: UI and Complete Integration (Tasks 22-24)**
22. **[PENDING] ui-controls** - Create web/src/ui-controls.ts for play/pause/stop interface
23. **[PENDING] html-typescript-integration** - Update index.html to load TypeScript modules and MIDI interface
24. **[PENDING] end-to-end-midi-test** - Build and test MIDI input→WASM→audio output pipeline

### **Phase 8: Comprehensive Testing (Tasks 25-28)**
25. **[PENDING] virtual-keyboard-test** - Test virtual keyboard: 88 keys + GM instruments + CC controls
26. **[PENDING] midi-file-test** - Test MIDI file loading: multi-track, tempo changes, complex timing
27. **[PENDING] midi-file-synth-integration** - 🔄 INTEGRATION CHECK: Verify MIDI file events affect synthesis parameters
28. **[PENDING] hardware-midi-test** - Test with real MIDI hardware device and verify sample-accurate timing (MEDIUM priority)

### **Integration Philosophy**
- **TypeScript handles only WebMIDI coordination** (device management, event capture)
- **WASM handles all audio processing** (sequencing, synthesis, effects)
- **Sample-accurate timing** via lock-free event queues
- **Zero audio thread blocking** from TypeScript events
- **Complete MIDI↔Synth integration** prevents development sync issues

---
**Remember:** This file serves as backup/sync for the TodoWrite tool. Always update both during development.