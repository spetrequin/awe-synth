# AWE Player Project TODO - Fresh Start

**Last Updated:** July 30, 2025
**Status:** Foundation Phase - All tasks pending

## 🎯 Current Development Phase: Foundation (HIGH PRIORITY)

All tasks follow micro-task architecture (15-30 lines max, single concept, token-efficient).

### **Foundation Tasks (All High Priority)**

1. **[PENDING] init-git-repo** - Initialize git repository and create .gitignore for Rust/WASM project
2. **[PENDING] init-cargo-project** - Create new Cargo.toml with basic wasm-pack dependencies (10 lines max)
3. **[PENDING] create-lib-rs-skeleton** - Create src/lib.rs with wasm-bindgen imports and basic module structure (15 lines)
4. **[PENDING] debug-log-function** - Implement crate::log() function with VecDeque buffer in src/lib.rs (20 lines)
5. **[PENDING] project-structure-dirs** - Create empty module directories: src/midi/, src/synth/, src/soundfont/, src/effects/
6. **[PENDING] basic-error-types** - Create src/error.rs with AweError enum covering 5 basic error cases (25 lines)
7. **[PENDING] midi-message-enum** - Create src/midi/message.rs with MidiMessage enum: NoteOn, NoteOff, ProgramChange (20 lines)
8. **[PENDING] voice-state-struct** - Create src/synth/voice.rs with Voice struct containing note, velocity, phase fields (15 lines)
9. **[PENDING] voice-manager-array** - Create src/synth/voice_manager.rs with VoiceManager struct and 32-voice array (20 lines)
10. **[PENDING] soundfont-header-struct** - Create src/soundfont/types.rs with basic SoundFontHeader struct (15 lines)
11. **[PENDING] wasm-interface-skeleton** - Add 3 basic WASM exports to lib.rs: new(), get_debug_log(), play_test_tone() (25 lines)
12. **[PENDING] first-build-test** - Run 'wasm-pack build --target web' and verify successful compilation
13. **[PENDING] basic-html-interface** - Create minimal index.html that loads WASM and calls get_debug_log() (30 lines)
14. **[PENDING] initial-git-commit** - Initial git commit with all foundation files

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

**Foundation Phase:** 0/14 tasks completed (0%)
**Next Milestone:** First successful WASM build
**Estimated Completion:** 14 development sessions (1 task per session)

---
**Remember:** This file serves as backup/sync for the TodoWrite tool. Always update both during development.