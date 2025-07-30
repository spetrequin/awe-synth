# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**⚠️ CRITICAL INSTRUCTION: Always read BOTH this file (CLAUDE.md) AND the ARCHITECTURE.md file completely before starting any work on this project.**

## 🎯 **PROJECT INTENT**

### **PRIMARY GOAL: EMU8000 Emulation with SoundFont Support**

**CORE OBJECTIVE:** Create a faithful EMU8000 chip emulation for authentic SoundFont 2.0 playback in the browser.

⚠️ **IMPORTANT:** Every technical decision must prioritize EMU8000 compatibility over modern audio conveniences.

### **What We're Building**

AWE Player is a WebAssembly-based EMU8000 emulator written in Rust that provides authentic SoundFont 2.0 synthesis. The project aims to recreate the exact sound and behavior of the original Creative Sound Blaster AWE32/64 sound cards.

**Why Rust for Real-Time Audio Synthesis:**
- **Zero Garbage Collection** - No GC pauses that would cause audio dropouts or timing jitter
- **Deterministic Memory Management** - Predictable allocation/deallocation without runtime overhead
- **Memory Efficiency** - Minimal memory footprint for 32-voice polyphonic synthesis
- **Performance Predictability** - No unexpected pauses or latency spikes during audio processing
- **WASM Optimization** - Rust compiles to highly efficient WebAssembly with minimal runtime

**Key Components:**
- **EMU8000 Synthesis Engine** - Authentic 32-voice polyphonic synthesis (Rust/WASM)
- **SoundFont 2.0 Engine** - Complete .sf2 file support with all generators (Rust/WASM)
- **MIDI Recording & Playback System** - Full MIDI implementation in Rust (Rust/WASM)
- **Web Interface** - Minimal JavaScript layer for UI only (JavaScript)

### **Success Criteria**

1. **100% SoundFont 2.0 compatibility** - All 58 generators properly implemented
2. **32-voice polyphonic synthesis** - Matching EMU8000 hardware specifications
3. **Authentic sound reproduction** - Indistinguishable from hardware AWE32/64
4. **Per-voice effects processing** - EMU8000 architecture, not modern bus systems
5. **Complete MIDI implementation** - Full MIDI recording and playbook capabilities in Rust
6. **Robust error handling** - Graceful failure with detailed diagnostics

## 🏗️ **ARCHITECTURE PRINCIPLES**

### **EMU8000 Hardware Requirements**

The EMU8000 was the sound synthesis chip used in Creative Sound Blaster AWE32/64 cards:

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

### **Authentic EMU8000 Signal Flow**
```
SoundFont Sample → Pitch Modulation → Low-Pass Filter → ADSR Envelope → Effects → Stereo Pan → Output
```

### **Architecture Constraints**

1. **Per-voice effects** - Each voice has its own complete effects chain
2. **No modern audio buses** - Avoid send/return architecture during development
3. **EMU8000 parameter ranges** - Respect hardware limitations (filter 100Hz-8kHz, etc.)
4. **Sample-accurate processing** - 44.1kHz audio processing
5. **32-voice maximum** - Hard limit matching hardware
6. **Rust-centric design** - All audio processing, MIDI handling, and business logic in Rust
7. **Minimal JavaScript interface** - JavaScript only for UI interactions and file I/O

## 🔧 **DEVELOPMENT PRINCIPLES**

### **Debug-First Development**

**CRITICAL RULE: Every component must handle failure gracefully and provide detailed diagnostics.**

1. **Comprehensive error handling** - Every function returns Result<T, Error> with context
2. **State validation** - Validate inputs and state at component boundaries  
3. **Detailed logging** - Capture ALL edge cases, not just happy paths
4. **Incremental complexity** - Build one component at a time, test thoroughly
5. **Test-driven edge cases** - Test null inputs, boundary conditions, malformed data

### **Quality Standards**

- **No unwrap() or expect()** - All error conditions must be handled gracefully
- **Bounds checking** - All array/vector access must be checked
- **Resource management** - Proper cleanup of voices, samples, and memory (no memory leaks in real-time audio)
- **Performance monitoring** - Built-in timing and resource usage tracking
- **State consistency** - Components must maintain valid state under all conditions
- **Memory allocation discipline** - Minimize allocations in audio processing loops (pre-allocate buffers)
- **Zero-copy operations** - Avoid unnecessary data copying in hot audio paths

## 🚨 **CRITICAL DEBUG ARCHITECTURE**

### **ABSOLUTELY NO BROWSER CONSOLE LOGGING**

**NEVER use `console.log()`, `console.error()`, `console.warn()`, or ANY browser console methods.**

**✅ CORRECT DEBUG APPROACH:**
- **Rust code**: Use `crate::log()` function which routes to the debug textarea
- **JavaScript code**: Append directly to `document.getElementById('debug-log').value`
- **All debug information**: Must appear in the in-page debug log textarea ONLY

**❌ FORBIDDEN:**
- `console.log()` - NEVER
- `console.error()` - NEVER  
- `console.warn()` - NEVER
- `console.debug()` - NEVER
- ANY browser console methods - NEVER

**Why this rule exists:**
- **Real-time audio synthesis requirement**: Console logging causes interruptions and jank in WASM audio processing
- **Performance-critical timing**: EMU8000 emulation requires precise 44.1kHz sample-rate processing without interruptions
- **Browser console interference**: Console methods can cause garbage collection pauses and thread blocking
- **Dedicated in-app debug system**: Our `crate::log()` → textarea system doesn't interfere with audio thread timing
- **Audio synthesis priority**: Debug output must never interrupt real-time synthesis or cause audio dropouts

**This rule is MANDATORY and must NEVER be violated.**

### **Debug System Requirements**

1. **Comprehensive logging** - Log all state changes, errors, and decisions
2. **Context preservation** - Include relevant state information in all log messages
3. **Performance awareness** - No logging in tight audio processing loops
4. **Buffer management** - Prevent log buffer overflow with proper rotation
5. **Structured output** - Consistent log format for easy parsing

### **Error Handling Strategy**

```rust
// ✅ CORRECT - Comprehensive error handling
fn load_soundfont(data: &[u8]) -> Result<SoundFont, SoundFontError> {
    if data.is_empty() {
        return Err(SoundFontError::EmptyData);
    }
    
    let header = parse_header(data)
        .map_err(|e| SoundFontError::InvalidHeader(e))?;
    
    crate::log(&format!("SoundFont loaded: {} samples, {} presets", 
        header.sample_count, header.preset_count));
    
    // ... rest of implementation
}

// ❌ WRONG - Panic on error
fn load_soundfont(data: &[u8]) -> SoundFont {
    let header = parse_header(data).unwrap(); // NEVER DO THIS
    // ...
}
```

## 🛠️ **DEVELOPMENT WORKFLOW**

### **Build Commands**

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

### **Testing Strategy**

1. **Unit tests** - Test each component in isolation
2. **Integration tests** - Test component interactions
3. **Edge case tests** - Test failure modes and boundary conditions
4. **Performance tests** - Verify 32-voice polyphony at 44.1kHz
5. **Compatibility tests** - Compare output with reference EMU8000

### **Development Phases**

**Phase 1: Foundation (HIGH PRIORITY)**
1. Project setup with proper error handling
2. SoundFont 2.0 parser with comprehensive validation
3. MIDI file parser and data structures
4. Basic synthesis engine (single voice)
5. Voice management system (32 voices)
6. Debug and logging infrastructure

**Phase 2: Core Features (MEDIUM PRIORITY)**
1. MIDI playback engine with precise timing
2. MIDI recording system for testing
3. ADSR envelope generators
4. Low-pass filter implementation
5. LFO system (tremolo/vibrato)
6. Sample interpolation and pitch shifting
7. Basic effects chain

**Phase 3: Advanced Features (LOW PRIORITY)**
1. Reverb and chorus effects
2. Real-time MIDI input and WebMIDI integration
3. Performance optimization
4. Advanced MIDI features (CC control, SysEx)
5. Web interface and minimal JavaScript bridge

## 🔍 **CODE MODIFICATION GUIDELINES**

### **Before Changing Any Code:**

1. **Understand the current behavior** - Read debug logs first
2. **Add comprehensive logging** - Trace all paths through your changes
3. **Test incrementally** - Make small changes and verify each step
4. **Handle all error cases** - What happens when inputs are invalid?
5. **Validate assumptions** - If something "should work", verify it actually does

### **Common Pitfalls to Avoid:**

- **Happy path only** - Always test error conditions and edge cases
- **Silent failures** - Every error must be logged and handled appropriately
- **Resource leaks** - Ensure proper cleanup of voices, samples, and memory
- **Performance assumptions** - Profile before optimizing
- **Incomplete error handling** - Every Result<> must be handled appropriately

## 🎵 **EMU8000 AUTHENTICITY REQUIREMENTS**

### **Critical Implementation Details**

1. **Apply ALL SoundFont generator values exactly** - No filtering or "sanitization"
2. **Use exponential envelope curves** - Not linear (FluidSynth-compatible)
3. **Respect EMU8000 parameter ranges** - Filter 100Hz-8kHz, LFO 0.1Hz-20Hz
4. **Per-voice effects processing** - Each voice gets its own effects chain
5. **32-voice polyphony maximum** - Hard limit matching hardware
6. **Intelligent voice stealing** - Prioritize releasing voices, then lowest velocity

### **SoundFont 2.0 Compliance**

- **All 58 generators supported** - Complete implementation required
- **Proper parameter conversion** - Timecents, centibels, cents all correctly handled
- **Velocity layering** - Multiple samples per note with smooth crossfading
- **Loop points** - Seamless sample looping with proper boundaries
- **Preset hierarchy** - Bank/Program/Instrument/Sample structure

**Philosophy:** Sound better than EMU8000 while maintaining full compatibility.

## 🎼 **MIDI IMPLEMENTATION REQUIREMENTS**

### **Complete MIDI System in Rust**

**CRITICAL DESIGN PRINCIPLE:** All MIDI functionality must be implemented in Rust, not JavaScript.

### **Core MIDI Components**

1. **MIDI File Parser**
   - Complete .mid/.midi file format support
   - Multi-track parsing with tempo and time signature handling
   - Robust error handling for malformed MIDI files
   - Support for all MIDI message types (Note On/Off, CC, Program Change, etc.)

2. **MIDI Playback Engine**
   - Precise timing with sample-accurate scheduling
   - Real-time tempo changes and time signature handling
   - Multiple track playback with proper channel routing
   - Playback controls (play, pause, stop, seek, loop)

3. **MIDI Recording System**
   - Real-time MIDI event capture for testing
   - Event timestamping with high precision
   - Multi-track recording capabilities  
   - Export to standard MIDI file format

4. **MIDI Event Processing**
   - Real-time MIDI message interpretation
   - Channel-based state management (16 MIDI channels)
   - Program change and bank select handling
   - Controller (CC) message processing
   - System messages (SysEx, timing, etc.)

### **JavaScript Interface Requirements**

**Keep JavaScript Minimal:** JavaScript should only handle:
- File loading (drag & drop, file picker)
- UI state management (buttons, sliders)
- Display updates (progress bars, visualizations)
- Browser API integration (WebMIDI, File API)

**JavaScript MUST NOT handle:**
- MIDI parsing or interpretation
- Audio processing or synthesis
- Timing-critical operations
- Business logic or state management

### **WASM/Rust API Design**

```rust
// ✅ CORRECT - All MIDI logic in Rust
#[wasm_bindgen]
pub struct MidiPlayer {
    // Internal implementation
}

#[wasm_bindgen]
impl MidiPlayer {
    // File operations
    pub fn load_midi_file(&mut self, data: &[u8]) -> Result<(), String>;
    pub fn get_midi_info(&self) -> String; // JSON metadata
    
    // Playback control
    pub fn play(&mut self) -> Result<(), String>;
    pub fn pause(&mut self);
    pub fn stop(&mut self);
    pub fn seek(&mut self, position_ms: u32) -> Result<(), String>;
    
    // Recording
    pub fn start_recording(&mut self) -> Result<(), String>;
    pub fn stop_recording(&mut self) -> Result<(), String>;
    pub fn export_recording(&self) -> Vec<u8>; // Standard MIDI file
    
    // Real-time MIDI input
    pub fn send_midi_message(&mut self, message: &[u8]) -> Result<(), String>;
    
    // State queries
    pub fn is_playing(&self) -> bool;
    pub fn get_position_ms(&self) -> u32;
    pub fn get_duration_ms(&self) -> u32;
}
```

### **Testing Benefits**

Having complete MIDI implementation in Rust provides:

1. **Deterministic testing** - MIDI playback behavior is consistent
2. **Easy test case creation** - Record MIDI events for regression testing  
3. **Precise timing control** - Sample-accurate event scheduling
4. **Cross-platform consistency** - Same behavior across all browsers
5. **Performance** - No JavaScript/WASM boundary crossings for audio-critical code

### **MIDI Implementation Priority**

**High Priority:**
- Complete MIDI file parsing (.mid format) with robust error handling
- Multi-track support for complex compositions
- Tempo and time signature handling (including tempo changes mid-song)
- Note On/Off message handling with velocity and timing precision
- Program change and bank select for instrument switching
- Playback engine with play/pause/stop/seek controls
- MIDI recording system for test case generation and debugging
- Integration with synthesis engine

**Medium Priority:**
- Controller (CC) message processing for real-time modulation
- Advanced timing features (swing, quantization)
- MIDI export capabilities for recorded sessions
- Challenging MIDI edge cases (overlapping notes, rapid sequences)

**Low Priority:**
- Advanced MIDI features (SysEx, NRPN, MTC)
- Real-time WebMIDI input integration
- MIDI visualization and editing interfaces
- MIDI effects and processing

**Philosophy:** Sound better than EMU8000 while maintaining full compatibility.

## 📚 **REFERENCE DOCUMENTATION**

For detailed technical specifications, see:
- **ARCHITECTURE.md** - Complete system design and component details
- **EMU8000_REFERENCE.md** - Hardware specifications and SoundFont 2.0 details
- **PROJECT_TODO.md** - Current development status and next steps

## 🚀 **GETTING STARTED**

1. **Read all documentation** - CLAUDE.md, ARCHITECTURE.md, EMU8000_REFERENCE.md
2. **Set up development environment** - Rust, wasm-pack, web server
3. **Start with tests** - Implement comprehensive test framework first
4. **Build incrementally** - One component at a time with full error handling
5. **Debug thoroughly** - Use crate::log() for all diagnostic output

Remember: **Debug-first development with comprehensive error handling is not optional.**

## 🎯 **TOKEN-EFFICIENT DEVELOPMENT STRATEGY**

### **CRITICAL RULE: Prevent Token Exhaustion**

**PROBLEM:** Complex tasks consume excessive tokens, causing development interruptions.
**SOLUTION:** Micro-task architecture with agent-assisted development.

### **Micro-Task Architecture**

**Every todo must be completable in 15-20 tokens maximum.**

```
❌ BAD: "Implement complete MIDI system"
✅ GOOD: "Create MIDI message enum with 3 basic types (NoteOn, NoteOff, ProgramChange)"
```

### **Agent-Assisted Development Protocol**

**USE TASK TOOL FOR:**
- Any implementation requiring >50 lines of code
- Repetitive implementations (error enums, basic structs)
- Test writing and boilerplate code
- Documentation generation

**HANDLE DIRECTLY:**
- Architecture decisions (<10 tokens)
- Code reviews and integration (<20 tokens)
- Design discussions
- Complex debugging requiring context

**Example Agent Usage:**
```
Task(description="Create basic MIDI types", 
     prompt="Create a basic Rust module with MIDI message enums for NoteOn, NoteOff, and ProgramChange. Include proper error handling and basic tests.",
     subagent_type="general-purpose")
```

### **Complexity Recognition - RED FLAGS**

**STOP and break down further if ANY of these appear:**
- Function signatures with >3 parameters
- Match statements with >5 arms  
- Nested Result<> handling more than 2 levels deep
- Any single function >30 lines
- Implementation requiring >100 lines of code in one session
- Task needs >1 new concept simultaneously
- Requires >3 new dependencies

### **Session Structure (Token-Efficient)**

**Per Development Session:**
1. **Pick 1-2 micro-tasks** from todo list
2. **Use agents for implementation** when task >50 lines
3. **Review/integrate results** (minimal tokens)
4. **Mark tasks complete** and add new micro-tasks
5. **Update PROJECT_TODO.md** with progress

### **Session Recovery Protocol**

**If approaching token limits:**
1. **IMMEDIATELY STOP** implementation
2. **Document current state** in PROJECT_TODO.md
3. **Mark current task status** in todo list
4. **Create specific resumption instructions**
5. **Save all work-in-progress**

### **Complexity Gates - Ask Before Starting**

1. **Can this be done in <30 lines?** If no → break down further
2. **Does this need >1 new concept?** If yes → split concepts  
3. **Will this require >3 dependencies?** If yes → separate dependency management
4. **Does this interact with >2 other components?** If yes → create interfaces first

### **Todo Structure Requirements**

**Each todo item must:**
- Be completable in one 15-20 token session
- Have clear success criteria
- Not depend on more than 1 other incomplete task
- Include specific file names and line count estimates

**Example Good Todos:**
- "Create MidiError enum with 5 basic error cases (20 lines, src/midi/mod.rs)"
- "Add wasm-bindgen to Cargo.toml and verify build (5 lines, root/Cargo.toml)"
- "Define Voice struct with note, velocity, phase fields (15 lines, src/synth/voice.rs)"

### **Anti-Rabbit-Hole Enforcement**

**If ANY session exceeds 30 tokens on a single task:**
1. **STOP immediately**
2. **Break current task into 3+ smaller tasks**
3. **Update todo list with micro-tasks**
4. **Complete smallest task first**
5. **Use agents for larger sub-tasks**

**This strategy is MANDATORY to maintain development momentum.**

## 📋 **PROJECT TODO LIST MANAGEMENT**

### **CRITICAL RULE: Always Use TodoWrite Tool**

**The todo list is the single source of truth for project progress.**

### **Todo List Requirements**

**EVERY session must:**
1. **Read current todo list** before starting any work
2. **Update todo status** as tasks are completed
3. **Add new micro-tasks** when complexity is discovered
4. **Break down tasks** that exceed 30-line estimates
5. **Mark dependencies** clearly

### **Current Active Todo List**

The project todo list is maintained using the TodoWrite tool and must always reflect:

**Foundation Phase (HIGH PRIORITY):**
- Initialize git repository and create .gitignore for Rust/WASM project
- Create new Cargo.toml with basic wasm-pack dependencies (10 lines max)
- Create src/lib.rs with wasm-bindgen imports and basic module structure (15 lines)
- Implement crate::log() function with VecDeque buffer in src/lib.rs (20 lines)
- Create empty module directories: src/midi/, src/synth/, src/soundfont/, src/effects/
- Create src/error.rs with AweError enum covering 5 basic error cases (25 lines)
- Create src/midi/message.rs with MidiMessage enum: NoteOn, NoteOff, ProgramChange (20 lines)
- Create src/synth/voice.rs with Voice struct containing note, velocity, phase fields (15 lines)
- Create src/synth/voice_manager.rs with VoiceManager struct and 32-voice array (20 lines)
- Create src/soundfont/types.rs with basic SoundFontHeader struct (15 lines)
- Add 3 basic WASM exports to lib.rs: new(), get_debug_log(), play_test_tone() (25 lines)
- Run 'wasm-pack build --target web' and verify successful compilation
- Create minimal index.html that loads WASM and calls get_debug_log() (30 lines)
- Initial git commit with all foundation files

### **Todo List Update Protocol**

**When starting a session:**
1. **Check TodoWrite tool status** - Review all pending/in-progress tasks
2. **If TodoWrite tool is empty** - IMMEDIATELY restore from PROJECT_TODO.md using TodoWrite tool
3. **Mark current task as in_progress** before beginning work
4. **Estimate actual complexity** - If >30 lines, break down immediately

**During implementation:**
1. **Update status to completed** immediately when task is finished
2. **Add new micro-tasks** if additional work is discovered
3. **Mark blockers** if dependencies are discovered

**When ending a session:**
1. **Document any in_progress tasks** with specific resumption notes
2. **Add follow-up tasks** for the next session
3. **Update PROJECT_TODO.md** with current status summary
4. **Commit all changes to git** with descriptive commit message

### **Task Breakdown Rules**

**If any task requires:**
- **>30 lines of code** → Break into 2-3 smaller tasks
- **>1 new concept** → Separate concept introduction from implementation
- **>3 function signatures** → Create interfaces first, then implementations
- **Cross-module dependencies** → Create module stubs first

### **Todo List Quality Standards**

**Each todo item MUST include:**
- **Specific file path** (e.g., "src/midi/message.rs")
- **Line count estimate** (e.g., "20 lines max")
- **Clear success criteria** (e.g., "compiles without errors")
- **Single responsibility** (one concept per task)

**Examples of GOOD todos:**
- "Add NoteOn variant to MidiMessage enum in src/midi/message.rs (5 lines)"
- "Create Voice::new() constructor with validation in src/synth/voice.rs (15 lines)"
- "Implement basic error handling for invalid MIDI data (10 lines)"

**Examples of BAD todos:**
- "Implement MIDI system" (too broad)
- "Fix audio issues" (unclear scope)
- "Add features" (no specificity)

### **Integration with Development Workflow**

**The todo list drives ALL development activities:**
- **No code changes** without corresponding todo items
- **No completed tasks** without marking them complete in TodoWrite
- **No session ends** without updating PROJECT_TODO.md
- **No complex tasks** without breaking them down first
- **No new sessions** without restoring TodoWrite from PROJECT_TODO.md if empty

### **CRITICAL SESSION START PROTOCOL**

**MANDATORY first action in any new session:**
```
1. Read CLAUDE.md (this file) completely
2. Check TodoWrite tool - if empty, restore immediately:
   - Copy all tasks from PROJECT_TODO.md 
   - Use TodoWrite tool to recreate the exact todo list
   - Verify all task IDs, priorities, and statuses match
3. Only then proceed with development work
```

**This todo list restoration is MANDATORY for project continuity.**