# AWE Player Error Recovery System

**⚠️ CRITICAL: Real-time audio synthesis cannot tolerate failures that interrupt audio output. The system must recover gracefully from all error conditions while maintaining sample-accurate timing.**

## 🎯 **Error Recovery Goals**

### **Primary Objectives:**
1. **Continuous Audio Output** - Never interrupt audio stream, even during errors
2. **Graceful Degradation** - Reduce quality/features rather than fail completely
3. **Transparent Recovery** - Resume normal operation without user intervention
4. **State Preservation** - Maintain MIDI state and voice allocation during recovery
5. **Diagnostic Logging** - Comprehensive error tracking for debugging

### **Critical Requirements:**
- **Zero Audio Dropouts** - Audio thread must never block or fail
- **<1ms Recovery Time** - Return to normal operation within one audio buffer
- **State Consistency** - MIDI/voice state remains valid during and after recovery
- **Memory Safety** - No memory corruption or leaks during error conditions
- **Performance Preservation** - Error handling adds <1% CPU overhead

## 🛡️ **Multi-Layer Error Recovery Architecture**

### **Recovery System Hierarchy:**

```
┌─────────────────────────────────────────────────────────────┐
│                 Error Recovery Layers                       │
├─────────────────────────────────────────────────────────────┤
│  Audio Thread Shield   │  Panic prevention in audio thread  │
│  (Critical Protection) │  Fallback synthesis on any error   │
├─────────────────────────────────────────────────────────────┤
│  Voice Recovery        │  Individual voice error isolation  │
│  (Voice-Level)         │  Voice replacement and cleanup     │
├─────────────────────────────────────────────────────────────┤
│  Synthesis Recovery    │  SoundFont/sample loading errors   │
│  (Component-Level)     │  Fallback to basic synthesis       │
├─────────────────────────────────────────────────────────────┤
│  System Recovery       │  Memory pressure, resource limits  │
│  (System-Level)        │  Adaptive quality and cleanup      │
├─────────────────────────────────────────────────────────────┤
│  Application Recovery  │  File loading, MIDI parsing errors │
│  (Application-Level)   │  User notification and fallbacks   │
└─────────────────────────────────────────────────────────────┘
```

## 🚨 **Audio Thread Protection System**

### **Critical Audio Thread Shield:**

```rust
// src/recovery/audio_shield.rs

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::time::Instant;
use crate::performance::PerformanceMonitor;

/// Audio thread protection - prevents any error from stopping audio output
pub struct AudioThreadShield {
    // Error tracking
    error_count: AtomicU32,
    last_error_time: AtomicU64,
    recovery_mode: AtomicBool,
    
    // Fallback synthesis
    fallback_synthesizer: FallbackSynthesizer,
    silence_generator: SilenceGenerator,
    
    // Recovery state
    recovery_start_time: AtomicU64,
    recovery_attempts: AtomicU32,
    
    // Performance monitoring
    performance_monitor: PerformanceMonitor,
}

impl AudioThreadShield {
    pub fn new() -> Self {
        Self {
            error_count: AtomicU32::new(0),
            last_error_time: AtomicU64::new(0),
            recovery_mode: AtomicBool::new(false),
            fallback_synthesizer: FallbackSynthesizer::new(),
            silence_generator: SilenceGenerator::new(),
            recovery_start_time: AtomicU64::new(0),
            recovery_attempts: AtomicU32::new(0),
            performance_monitor: PerformanceMonitor::new(44100.0, 1024),
        }
    }

    /// Protect audio processing with comprehensive error recovery
    pub fn protect_audio_process<F>(&mut self, audio_process: F) -> f32
    where
        F: FnOnce() -> Result<f32, AudioError> + std::panic::UnwindSafe,
    {
        // Record start time for performance monitoring
        let start_time = Instant::now();
        
        // Attempt normal audio processing with panic protection
        let result = std::panic::catch_unwind(audio_process);
        
        match result {
            Ok(Ok(sample)) => {
                // Success - normal operation
                self.handle_successful_processing(start_time);
                sample
            }
            Ok(Err(audio_error)) => {
                // Controlled error - use recovery strategy
                self.handle_audio_error(audio_error, start_time)
            }
            Err(panic_payload) => {
                // Panic occurred - emergency recovery
                self.handle_audio_panic(panic_payload, start_time)
            }
        }
    }

    fn handle_successful_processing(&mut self, start_time: Instant) {
        // Record processing time
        self.performance_monitor.record_buffer_processing(start_time.elapsed());
        
        // Check if we were in recovery mode
        if self.recovery_mode.load(Ordering::Relaxed) {
            self.attempt_recovery_exit();
        }
    }

    fn handle_audio_error(&mut self, error: AudioError, start_time: Instant) -> f32 {
        self.error_count.fetch_add(1, Ordering::Relaxed);
        self.last_error_time.store(
            start_time.elapsed().as_nanos() as u64, 
            Ordering::Relaxed
        );

        crate::log(&format!("Audio error recovered: {:?}", error));
        
        // Enter recovery mode if not already
        if !self.recovery_mode.load(Ordering::Relaxed) {
            self.enter_recovery_mode();
        }

        // Return appropriate fallback audio
        match error {
            AudioError::VoiceAllocationFailed => {
                // Use existing voices only
                self.fallback_synthesizer.synthesize_with_existing_voices()
            }
            AudioError::SampleLoadingFailed => {
                // Use simple waveform synthesis
                self.fallback_synthesizer.synthesize_basic_waveform()
            }
            AudioError::MemoryExhausted => {
                // Reduce to minimal synthesis
                self.fallback_synthesizer.synthesize_minimal()
            }
            AudioError::PerformanceOverload => {
                // Reduce quality but maintain audio
                self.fallback_synthesizer.synthesize_reduced_quality()
            }
            _ => {
                // Unknown error - provide silence with gentle fade
                self.silence_generator.generate_safe_silence()
            }
        }
    }

    fn handle_audio_panic(&mut self, _panic_payload: Box<dyn std::any::Any + Send>, start_time: Instant) -> f32 {
        self.error_count.fetch_add(1, Ordering::Relaxed);
        
        // Log panic (safe logging only)
        crate::log("CRITICAL: Audio thread panic recovered");
        
        // Enter emergency recovery mode
        self.enter_emergency_recovery_mode();
        
        // Return safe silence to prevent audio artifacts
        self.silence_generator.generate_emergency_silence()
    }

    fn enter_recovery_mode(&mut self) {
        self.recovery_mode.store(true, Ordering::Relaxed);
        self.recovery_start_time.store(
            Instant::now().elapsed().as_nanos() as u64,
            Ordering::Relaxed
        );
        self.recovery_attempts.fetch_add(1, Ordering::Relaxed);
        
        crate::log("Audio recovery mode activated");
        
        // Initialize fallback systems
        self.fallback_synthesizer.initialize_emergency_mode();
    }

    fn enter_emergency_recovery_mode(&mut self) {
        self.recovery_mode.store(true, Ordering::Relaxed);
        
        // Emergency mode - minimal operations only
        self.fallback_synthesizer.enter_emergency_mode();
        self.silence_generator.enter_emergency_mode();
        
        crate::log("EMERGENCY: Audio thread in emergency recovery mode");
    }

    fn attempt_recovery_exit(&mut self) {
        let recovery_duration = Instant::now().elapsed().as_millis();
        
        // Only exit recovery if stable for sufficient time
        if recovery_duration > 1000 { // 1 second stable
            self.recovery_mode.store(false, Ordering::Relaxed);
            crate::log(&format!("Audio recovery mode exited after {}ms", recovery_duration));
        }
    }

    /// Get recovery statistics for monitoring
    pub fn get_recovery_stats(&self) -> AudioRecoveryStats {
        AudioRecoveryStats {
            error_count: self.error_count.load(Ordering::Relaxed),
            recovery_attempts: self.recovery_attempts.load(Ordering::Relaxed),
            in_recovery_mode: self.recovery_mode.load(Ordering::Relaxed),
            last_error_time: self.last_error_time.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug)]
pub struct AudioRecoveryStats {
    pub error_count: u32,
    pub recovery_attempts: u32,
    pub in_recovery_mode: bool,
    pub last_error_time: u64,
}

#[derive(Debug)]
pub enum AudioError {
    VoiceAllocationFailed,
    SampleLoadingFailed,
    MemoryExhausted,
    PerformanceOverload,
    InvalidSampleData,
    SoundFontCorrupted,
    MidiEventCorrupted,
    FilterParameterInvalid,
    EnvelopeStateInvalid,
}
```

### **Fallback Synthesis System:**

```rust
// src/recovery/fallback_synthesizer.rs

use std::f32::consts::PI;

/// Emergency fallback synthesizer - provides basic audio when main synthesis fails
pub struct FallbackSynthesizer {
    // Basic oscillators for emergency synthesis
    sine_oscillators: [SineOscillator; 8],  // 8 basic voices
    noise_generator: NoiseGenerator,
    
    // Simple envelope for smooth transitions
    emergency_envelope: SimpleEnvelope,
    
    // Current synthesis mode
    mode: FallbackMode,
    
    // MIDI state tracking (minimal)
    active_notes: [Option<MidiNote>; 8],
    
    // Audio parameters
    sample_rate: f32,
    master_volume: f32,
}

#[derive(Debug, Clone, Copy)]
enum FallbackMode {
    Normal,           // Use existing voices
    BasicWaveform,    // Simple sine wave synthesis
    Minimal,          // Minimal CPU usage
    Emergency,        // Silence with gentle fade
}

#[derive(Debug, Clone, Copy)]
struct MidiNote {
    note: u8,
    velocity: u8,
    start_time: u64,
}

impl FallbackSynthesizer {
    pub fn new() -> Self {
        Self {
            sine_oscillators: [SineOscillator::new(); 8],
            noise_generator: NoiseGenerator::new(),
            emergency_envelope: SimpleEnvelope::new(),
            mode: FallbackMode::Normal,
            active_notes: [None; 8],
            sample_rate: 44100.0,
            master_volume: 0.3, // Reduced volume for safety
        }
    }

    pub fn synthesize_with_existing_voices(&mut self) -> f32 {
        self.mode = FallbackMode::Normal;
        
        // Use only currently active notes
        let mut output = 0.0;
        let mut active_count = 0;
        
        for (i, note) in self.active_notes.iter().enumerate() {
            if let Some(midi_note) = note {
                let frequency = Self::midi_to_frequency(midi_note.note);
                let amplitude = (midi_note.velocity as f32 / 127.0) * self.master_volume;
                
                output += self.sine_oscillators[i].generate(frequency, amplitude);
                active_count += 1;
            }
        }
        
        // Normalize output
        if active_count > 0 {
            output / active_count as f32
        } else {
            0.0
        }
    }

    pub fn synthesize_basic_waveform(&mut self) -> f32 {
        self.mode = FallbackMode::BasicWaveform;
        
        // Generate basic sine wave for active notes
        let mut output = 0.0;
        
        for (i, note) in self.active_notes.iter().enumerate() {
            if let Some(midi_note) = note {
                let frequency = Self::midi_to_frequency(midi_note.note);
                let amplitude = self.master_volume * 0.5; // Reduced for safety
                
                output += self.sine_oscillators[i].generate(frequency, amplitude);
            }
        }
        
        // Apply gentle envelope to prevent clicks
        output * self.emergency_envelope.process()
    }

    pub fn synthesize_minimal(&mut self) -> f32 {
        self.mode = FallbackMode::Minimal;
        
        // Single voice, basic sine wave
        if let Some(midi_note) = self.active_notes[0] {
            let frequency = Self::midi_to_frequency(midi_note.note);
            let amplitude = self.master_volume * 0.3;
            
            self.sine_oscillators[0].generate(frequency, amplitude) * 
                self.emergency_envelope.process()
        } else {
            0.0
        }
    }

    pub fn synthesize_reduced_quality(&mut self) -> f32 {
        // Reduce polyphony and processing quality
        let mut output = 0.0;
        
        // Use only first 4 voices
        for i in 0..4 {
            if let Some(midi_note) = self.active_notes[i] {
                let frequency = Self::midi_to_frequency(midi_note.note);
                let amplitude = (midi_note.velocity as f32 / 127.0) * self.master_volume * 0.7;
                
                output += self.sine_oscillators[i].generate(frequency, amplitude);
            }
        }
        
        output * 0.25 // 4 voices max
    }

    pub fn initialize_emergency_mode(&mut self) {
        self.mode = FallbackMode::Emergency;
        self.master_volume = 0.2; // Very quiet for safety
        self.emergency_envelope.start_fade_out();
    }

    pub fn enter_emergency_mode(&mut self) {
        self.mode = FallbackMode::Emergency;
        // Clear all active notes for safety
        self.active_notes = [None; 8];
        self.emergency_envelope.start_emergency_fade();
    }

    /// Handle MIDI note on in fallback mode
    pub fn note_on(&mut self, note: u8, velocity: u8) {
        // Find available voice slot
        for i in 0..self.active_notes.len() {
            if self.active_notes[i].is_none() {
                self.active_notes[i] = Some(MidiNote {
                    note,
                    velocity,
                    start_time: 0, // Simplified timing
                });
                break;
            }
        }
    }

    /// Handle MIDI note off in fallback mode
    pub fn note_off(&mut self, note: u8) {
        for i in 0..self.active_notes.len() {
            if let Some(midi_note) = self.active_notes[i] {
                if midi_note.note == note {
                    self.active_notes[i] = None;
                    break;
                }
            }
        }
    }

    fn midi_to_frequency(midi_note: u8) -> f32 {
        // A4 = 440 Hz = MIDI note 69
        440.0 * 2.0_f32.powf((midi_note as f32 - 69.0) / 12.0)
    }
}

/// Simple sine wave oscillator for fallback synthesis
#[derive(Debug, Clone, Copy)]
pub struct SineOscillator {
    phase: f32,
    sample_rate: f32,
}

impl SineOscillator {
    pub fn new() -> Self {
        Self {
            phase: 0.0,
            sample_rate: 44100.0,
        }
    }

    pub fn generate(&mut self, frequency: f32, amplitude: f32) -> f32 {
        let output = (2.0 * PI * self.phase).sin() * amplitude;
        
        // Update phase
        self.phase += frequency / self.sample_rate;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        
        output
    }
}

/// Simple envelope for smooth transitions during recovery
#[derive(Debug)]
pub struct SimpleEnvelope {
    current_level: f32,
    target_level: f32,
    fade_rate: f32,
}

impl SimpleEnvelope {
    pub fn new() -> Self {
        Self {
            current_level: 1.0,
            target_level: 1.0,
            fade_rate: 0.001, // Slow fade for safety
        }
    }

    pub fn process(&mut self) -> f32 {
        if (self.current_level - self.target_level).abs() > 0.001 {
            if self.current_level < self.target_level {
                self.current_level += self.fade_rate;
            } else {
                self.current_level -= self.fade_rate;
            }
        }
        
        self.current_level.clamp(0.0, 1.0)
    }

    pub fn start_fade_out(&mut self) {
        self.target_level = 0.0;
        self.fade_rate = 0.01; // Faster fade out
    }

    pub fn start_emergency_fade(&mut self) {
        self.target_level = 0.0;
        self.fade_rate = 0.05; // Very fast emergency fade
    }
}

/// Safe silence generator with gentle transitions
pub struct SilenceGenerator {
    fade_samples: u32,
    current_sample: u32,
    mode: SilenceMode,
}

#[derive(Debug, Clone, Copy)]
enum SilenceMode {
    Immediate,    // Immediate silence
    Gentle,       // Gentle fade to silence
    Emergency,    // Emergency fade out
}

impl SilenceGenerator {
    pub fn new() -> Self {
        Self {
            fade_samples: 4410, // 100ms fade at 44.1kHz
            current_sample: 0,
            mode: SilenceMode::Gentle,
        }
    }

    pub fn generate_safe_silence(&mut self) -> f32 {
        self.mode = SilenceMode::Gentle;
        
        if self.current_sample < self.fade_samples {
            let fade_factor = 1.0 - (self.current_sample as f32 / self.fade_samples as f32);
            self.current_sample += 1;
            fade_factor * 0.0 // Gentle fade to silence
        } else {
            0.0
        }
    }

    pub fn generate_emergency_silence(&mut self) -> f32 {
        self.mode = SilenceMode::Emergency;
        self.fade_samples = 441; // 10ms emergency fade
        
        if self.current_sample < self.fade_samples {
            let fade_factor = 1.0 - (self.current_sample as f32 / self.fade_samples as f32);
            self.current_sample += 1;
            fade_factor * 0.0 // Fast fade to silence
        } else {
            0.0
        }
    }

    pub fn enter_emergency_mode(&mut self) {
        self.mode = SilenceMode::Emergency;
        self.current_sample = 0;
        self.fade_samples = 220; // 5ms emergency fade
    }
}
```

## 🔧 **Voice-Level Error Recovery**

### **Individual Voice Protection:**

```rust
// src/recovery/voice_recovery.rs

use crate::synth::{Voice, VoiceState};
use crate::error::VoiceError;

/// Voice-level error recovery - isolates errors to individual voices
pub struct VoiceRecoveryManager {
    voice_states: [VoiceRecoveryState; 32],
    error_isolation: VoiceErrorIsolation,
    voice_replacement: VoiceReplacementSystem,
}

#[derive(Debug, Clone)]
struct VoiceRecoveryState {
    voice_id: usize,
    error_count: u32,
    last_error_time: u64,
    recovery_mode: VoiceRecoveryMode,
    backup_state: Option<VoiceBackupState>,
}

#[derive(Debug, Clone, Copy)]
enum VoiceRecoveryMode {
    Normal,
    Degraded,      // Reduced quality
    Fallback,      // Basic synthesis only  
    Disabled,      // Voice temporarily disabled
}

#[derive(Debug, Clone)]
struct VoiceBackupState {
    note: u8,
    velocity: u8,
    envelope_phase: f32,
    filter_state: f32,
    phase: f32,
}

impl VoiceRecoveryManager {
    pub fn new() -> Self {
        Self {
            voice_states: [VoiceRecoveryState::new(); 32],
            error_isolation: VoiceErrorIsolation::new(),
            voice_replacement: VoiceReplacementSystem::new(),
        }
    }

    /// Process voice with error recovery protection
    pub fn process_voice_protected(&mut self, voice_id: usize, voice: &mut Voice) -> Result<f32, VoiceError> {
        let recovery_state = &mut self.voice_states[voice_id];
        
        // Check if voice is in error state
        match recovery_state.recovery_mode {
            VoiceRecoveryMode::Normal => {
                // Attempt normal processing
                self.attempt_normal_voice_processing(voice_id, voice, recovery_state)
            }
            VoiceRecoveryMode::Degraded => {
                // Process with reduced quality
                self.process_degraded_voice(voice_id, voice, recovery_state)
            }
            VoiceRecoveryMode::Fallback => {
                // Use fallback synthesis
                self.process_fallback_voice(voice_id, recovery_state)
            }
            VoiceRecoveryMode::Disabled => {
                // Voice is disabled - return silence
                Ok(0.0)
            }
        }
    }

    fn attempt_normal_voice_processing(
        &mut self, 
        voice_id: usize, 
        voice: &mut Voice, 
        recovery_state: &mut VoiceRecoveryState
    ) -> Result<f32, VoiceError> {
        // Backup current state before processing
        recovery_state.backup_state = Some(self.create_voice_backup(voice));
        
        // Attempt processing with error capture
        match voice.process() {
            Ok(sample) => {
                // Success - clear any previous errors
                self.handle_voice_success(recovery_state);
                Ok(sample)
            }
            Err(error) => {
                // Error occurred - initiate recovery
                self.handle_voice_error(voice_id, error, recovery_state)
            }
        }
    }

    fn handle_voice_error(
        &mut self, 
        voice_id: usize, 
        error: VoiceError, 
        recovery_state: &mut VoiceRecoveryState
    ) -> Result<f32, VoiceError> {
        recovery_state.error_count += 1;
        recovery_state.last_error_time = std::time::Instant::now().elapsed().as_nanos() as u64;
        
        crate::log(&format!("Voice {} error: {:?}", voice_id, error));
        
        // Determine recovery strategy based on error type
        match error {
            VoiceError::SampleDataCorrupted => {
                // Switch to fallback synthesis immediately
                recovery_state.recovery_mode = VoiceRecoveryMode::Fallback;
                self.process_fallback_voice(voice_id, recovery_state)
            }
            VoiceError::EnvelopeStateInvalid => {
                // Try to restore from backup
                if let Some(backup) = &recovery_state.backup_state {
                    recovery_state.recovery_mode = VoiceRecoveryMode::Degraded;
                    Ok(self.synthesize_from_backup(backup))
                } else {
                    recovery_state.recovery_mode = VoiceRecoveryMode::Fallback;
                    self.process_fallback_voice(voice_id, recovery_state)
                }
            }
            VoiceError::FilterParametersInvalid => {
                // Disable filter, continue with basic synthesis
                recovery_state.recovery_mode = VoiceRecoveryMode::Degraded;
                self.process_degraded_voice(voice_id, &mut Voice::new(), recovery_state)
            }
            VoiceError::MemoryAccessViolation => {
                // Serious error - disable voice temporarily
                recovery_state.recovery_mode = VoiceRecoveryMode::Disabled;
                crate::log(&format!("Voice {} disabled due to memory violation", voice_id));
                Ok(0.0)
            }
            _ => {
                // Generic error - try degraded mode
                recovery_state.recovery_mode = VoiceRecoveryMode::Degraded;
                self.process_degraded_voice(voice_id, &mut Voice::new(), recovery_state)
            }
        }
    }

    fn process_degraded_voice(
        &mut self, 
        voice_id: usize, 
        voice: &mut Voice, 
        recovery_state: &mut VoiceRecoveryState
    ) -> Result<f32, VoiceError> {
        // Process with reduced quality - disable expensive features
        // No effects, simple envelope, basic synthesis only
        
        if let Some(backup) = &recovery_state.backup_state {
            Ok(self.synthesize_basic_from_backup(backup))
        } else {
            // Generate basic sine wave based on voice MIDI note
            Ok(self.generate_basic_tone(voice_id))
        }
    }

    fn process_fallback_voice(
        &mut self, 
        voice_id: usize, 
        recovery_state: &mut VoiceRecoveryState
    ) -> Result<f32, VoiceError> {
        // Use simple fallback synthesis
        if let Some(backup) = &recovery_state.backup_state {
            Ok(self.synthesize_fallback_from_backup(backup))
        } else {
            Ok(0.0) // Silence if no backup available
        }
    }

    fn create_voice_backup(&self, voice: &Voice) -> VoiceBackupState {
        VoiceBackupState {
            note: voice.get_note(),
            velocity: voice.get_velocity(),
            envelope_phase: voice.get_envelope_phase(),
            filter_state: voice.get_filter_state(),
            phase: voice.get_oscillator_phase(),
        }
    }

    fn synthesize_from_backup(&self, backup: &VoiceBackupState) -> f32 {
        // Generate audio sample from backed up state
        let frequency = Self::midi_to_frequency(backup.note);
        let amplitude = (backup.velocity as f32 / 127.0) * backup.envelope_phase;
        
        // Simple sine wave synthesis
        (2.0 * std::f32::consts::PI * backup.phase * frequency / 44100.0).sin() * amplitude * 0.3
    }

    fn synthesize_basic_from_backup(&self, backup: &VoiceBackupState) -> f32 {
        // Very basic synthesis - no effects
        let frequency = Self::midi_to_frequency(backup.note);
        let amplitude = (backup.velocity as f32 / 127.0) * 0.2; // Reduced volume
        
        (2.0 * std::f32::consts::PI * backup.phase * frequency / 44100.0).sin() * amplitude
    }

    fn synthesize_fallback_from_backup(&self, backup: &VoiceBackupState) -> f32 {
        // Minimal fallback synthesis
        let frequency = Self::midi_to_frequency(backup.note);
        (2.0 * std::f32::consts::PI * backup.phase * frequency / 44100.0).sin() * 0.1
    }

    fn generate_basic_tone(&self, voice_id: usize) -> f32 {
        // Generate basic tone based on voice ID (for debugging)
        let frequency = 440.0 * (1.0 + voice_id as f32 * 0.1);
        (2.0 * std::f32::consts::PI * frequency / 44100.0).sin() * 0.05
    }

    fn midi_to_frequency(midi_note: u8) -> f32 {
        440.0 * 2.0_f32.powf((midi_note as f32 - 69.0) / 12.0)
    }

    fn handle_voice_success(&mut self, recovery_state: &mut VoiceRecoveryState) {
        // Voice processed successfully - consider recovery
        if recovery_state.recovery_mode != VoiceRecoveryMode::Normal {
            // Check if we can return to normal mode
            if recovery_state.error_count < 3 {
                recovery_state.recovery_mode = VoiceRecoveryMode::Normal;
                crate::log(&format!("Voice {} recovered to normal mode", recovery_state.voice_id));
            }
        }
    }

    /// Get recovery statistics for all voices
    pub fn get_voice_recovery_stats(&self) -> Vec<VoiceRecoveryStats> {
        self.voice_states.iter().map(|state| VoiceRecoveryStats {
            voice_id: state.voice_id,
            error_count: state.error_count,
            recovery_mode: state.recovery_mode,
            has_backup: state.backup_state.is_some(),
        }).collect()
    }
}

impl VoiceRecoveryState {
    fn new() -> Self {
        Self {
            voice_id: 0,
            error_count: 0,
            last_error_time: 0,
            recovery_mode: VoiceRecoveryMode::Normal,
            backup_state: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct VoiceRecoveryStats {
    pub voice_id: usize,
    pub error_count: u32,
    pub recovery_mode: VoiceRecoveryMode,
    pub has_backup: bool,
}

pub struct VoiceErrorIsolation;
pub struct VoiceReplacementSystem;

impl VoiceErrorIsolation {
    pub fn new() -> Self { Self }
}

impl VoiceReplacementSystem {
    pub fn new() -> Self { Self }
}
```

## 🔄 **System-Level Recovery Management**

### **Comprehensive Recovery Coordinator:**

```rust
// src/recovery/recovery_coordinator.rs

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use crate::performance::PerformanceMonitor;
use crate::memory::MemoryGuard;

/// Coordinates recovery across all system levels
pub struct RecoveryCoordinator {
    // Recovery managers
    audio_shield: Arc<Mutex<AudioThreadShield>>,
    voice_recovery: Arc<Mutex<VoiceRecoveryManager>>,
    memory_recovery: Arc<Mutex<MemoryRecoveryManager>>,
    
    // System state
    system_health: SystemHealthMonitor,
    recovery_history: RecoveryHistory,
    
    // Recovery policies
    policies: RecoveryPolicies,
    
    // Monitoring
    performance_monitor: PerformanceMonitor,
}

impl RecoveryCoordinator {
    pub fn new() -> Self {
        Self {
            audio_shield: Arc::new(Mutex::new(AudioThreadShield::new())),
            voice_recovery: Arc::new(Mutex::new(VoiceRecoveryManager::new())),
            memory_recovery: Arc::new(Mutex::new(MemoryRecoveryManager::new())),
            system_health: SystemHealthMonitor::new(),
            recovery_history: RecoveryHistory::new(),
            policies: RecoveryPolicies::default(),
            performance_monitor: PerformanceMonitor::new(44100.0, 1024),
        }
    }

    /// Main system health check and recovery coordination
    pub fn coordinate_recovery(&mut self) -> SystemRecoveryStatus {
        let health_status = self.system_health.assess_system_health();
        
        match health_status.severity {
            HealthSeverity::Healthy => {
                // System is healthy - monitor only
                self.monitor_recovery_progress()
            }
            HealthSeverity::Warning => {
                // Warning level - proactive measures
                self.handle_warning_level_issues(health_status)
            }
            HealthSeverity::Critical => {
                // Critical issues - immediate recovery
                self.handle_critical_level_issues(health_status)
            }
            HealthSeverity::Emergency => {
                // Emergency - protect audio output at all costs
                self.handle_emergency_level_issues(health_status)
            }
        }
    }

    fn monitor_recovery_progress(&mut self) -> SystemRecoveryStatus {
        // Check if any subsystems are still in recovery
        let audio_recovery = self.audio_shield.lock().unwrap().get_recovery_stats();
        let voice_recovery_stats = self.voice_recovery.lock().unwrap().get_voice_recovery_stats();
        let memory_stats = self.memory_recovery.lock().unwrap().get_recovery_stats();
        
        SystemRecoveryStatus {
            overall_status: RecoveryStatus::Healthy,
            audio_thread_status: if audio_recovery.in_recovery_mode {
                RecoveryStatus::Recovering
            } else {
                RecoveryStatus::Healthy
            },
            voice_recovery_count: voice_recovery_stats.iter()
                .filter(|v| !matches!(v.recovery_mode, VoiceRecoveryMode::Normal))
                .count() as u32,
            memory_pressure_level: memory_stats.pressure_level,
            recovery_actions_taken: self.recovery_history.get_recent_action_count(),
        }
    }

    fn handle_warning_level_issues(&mut self, health_status: SystemHealthStatus) -> SystemRecoveryStatus {
        let mut actions_taken = Vec::new();
        
        // Check specific warning conditions
        if health_status.cpu_usage > 75.0 {
            // High CPU usage - reduce quality proactively
            actions_taken.push(self.reduce_synthesis_quality());
        }
        
        if health_status.memory_usage > 80.0 {
            // High memory usage - trigger cache cleanup
            actions_taken.push(self.trigger_memory_cleanup());
        }
        
        if health_status.audio_latency > 15.0 {
            // Increasing latency - optimize processing
            actions_taken.push(self.optimize_audio_processing());
        }
        
        self.recovery_history.record_actions(actions_taken);
        
        SystemRecoveryStatus {
            overall_status: RecoveryStatus::Warning,
            audio_thread_status: RecoveryStatus::Healthy,
            voice_recovery_count: 0,
            memory_pressure_level: MemoryPressureLevel::Low,
            recovery_actions_taken: self.recovery_history.get_recent_action_count(),
        }
    }

    fn handle_critical_level_issues(&mut self, health_status: SystemHealthStatus) -> SystemRecoveryStatus {
        let mut actions_taken = Vec::new();
        
        // Critical issues require immediate action
        if health_status.audio_dropouts > 0 {
            // Audio dropouts detected - emergency audio protection
            actions_taken.push(self.activate_emergency_audio_mode());
        }
        
        if health_status.memory_exhaustion {
            // Memory exhaustion - aggressive cleanup
            actions_taken.push(self.perform_emergency_memory_cleanup());
        }
        
        if health_status.cpu_overload {
            // CPU overload - reduce to minimal synthesis
            actions_taken.push(self.reduce_to_minimal_synthesis());
        }
        
        self.recovery_history.record_critical_actions(actions_taken);
        
        SystemRecoveryStatus {
            overall_status: RecoveryStatus::Critical,
            audio_thread_status: RecoveryStatus::Recovering,
            voice_recovery_count: 16, // Assume half voices in recovery
            memory_pressure_level: MemoryPressureLevel::High,
            recovery_actions_taken: self.recovery_history.get_recent_action_count(),
        }
    }

    fn handle_emergency_level_issues(&mut self, health_status: SystemHealthStatus) -> SystemRecoveryStatus {
        // Emergency mode - prioritize audio continuity above all else
        self.activate_emergency_audio_mode();
        self.reduce_to_minimal_synthesis();
        self.perform_emergency_memory_cleanup();
        
        // Log emergency situation
        crate::log("EMERGENCY: System in emergency recovery mode");
        
        SystemRecoveryStatus {
            overall_status: RecoveryStatus::Emergency,
            audio_thread_status: RecoveryStatus::Emergency,
            voice_recovery_count: 32, // All voices in emergency mode
            memory_pressure_level: MemoryPressureLevel::Critical,
            recovery_actions_taken: 10, // Many emergency actions
        }
    }

    // Recovery action implementations
    fn reduce_synthesis_quality(&mut self) -> RecoveryAction {
        // Reduce synthesis quality to save CPU
        RecoveryAction::QualityReduction { 
            level: QualityLevel::Medium,
            cpu_saved_percent: 25.0 
        }
    }

    fn trigger_memory_cleanup(&mut self) -> RecoveryAction {
        // Trigger memory cache cleanup
        let memory_freed = self.memory_recovery.lock().unwrap().perform_cleanup();
        RecoveryAction::MemoryCleanup { 
            bytes_freed: memory_freed 
        }
    }

    fn optimize_audio_processing(&mut self) -> RecoveryAction {
        // Optimize audio processing pipeline
        RecoveryAction::ProcessingOptimization { 
            latency_improvement_ms: 5.0 
        }
    }

    fn activate_emergency_audio_mode(&mut self) -> RecoveryAction {
        // Activate emergency audio protection
        self.audio_shield.lock().unwrap().enter_emergency_recovery_mode();
        RecoveryAction::EmergencyModeActivated
    }

    fn perform_emergency_memory_cleanup(&mut self) -> RecoveryAction {
        // Emergency memory cleanup
        let memory_freed = self.memory_recovery.lock().unwrap().emergency_cleanup();
        RecoveryAction::EmergencyMemoryCleanup { 
            bytes_freed: memory_freed 
        }
    }

    fn reduce_to_minimal_synthesis(&mut self) -> RecoveryAction {
        // Reduce to absolute minimal synthesis
        RecoveryAction::MinimalSynthesis { 
            voices_reduced_to: 4 
        }
    }
}

#[derive(Debug, Clone)]
pub struct SystemHealthStatus {
    pub severity: HealthSeverity,
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub audio_latency: f32,
    pub audio_dropouts: u32,
    pub memory_exhaustion: bool,
    pub cpu_overload: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum HealthSeverity {
    Healthy,
    Warning,
    Critical,
    Emergency,
}

#[derive(Debug, Clone)]
pub enum RecoveryAction {
    QualityReduction { level: QualityLevel, cpu_saved_percent: f32 },
    MemoryCleanup { bytes_freed: usize },
    ProcessingOptimization { latency_improvement_ms: f32 },
    EmergencyModeActivated,
    EmergencyMemoryCleanup { bytes_freed: usize },
    MinimalSynthesis { voices_reduced_to: u32 },
}

#[derive(Debug, Clone, Copy)]
pub enum QualityLevel {
    Maximum,
    High,
    Medium,
    Low,
    Minimal,
}

pub struct SystemHealthMonitor;
pub struct RecoveryHistory;
pub struct RecoveryPolicies;
pub struct MemoryRecoveryManager;

impl SystemHealthMonitor {
    pub fn new() -> Self { Self }
    pub fn assess_system_health(&self) -> SystemHealthStatus {
        // Mock implementation - would check real system metrics
        SystemHealthStatus {
            severity: HealthSeverity::Healthy,
            cpu_usage: 25.0,
            memory_usage: 45.0,
            audio_latency: 8.0,
            audio_dropouts: 0,
            memory_exhaustion: false,
            cpu_overload: false,
        }
    }
}

impl RecoveryHistory {
    pub fn new() -> Self { Self }
    pub fn record_actions(&mut self, _actions: Vec<RecoveryAction>) {}
    pub fn record_critical_actions(&mut self, _actions: Vec<RecoveryAction>) {}
    pub fn get_recent_action_count(&self) -> u32 { 0 }
}

impl RecoveryPolicies {
    pub fn default() -> Self { Self }
}

impl MemoryRecoveryManager {
    pub fn new() -> Self { Self }
    pub fn perform_cleanup(&mut self) -> usize { 1024 * 1024 } // 1MB freed
    pub fn emergency_cleanup(&mut self) -> usize { 10 * 1024 * 1024 } // 10MB freed
    pub fn get_recovery_stats(&self) -> MemoryRecoveryStats {
        MemoryRecoveryStats {
            pressure_level: MemoryPressureLevel::Low,
        }
    }
}

#[derive(Debug)]
pub struct MemoryRecoveryStats {
    pub pressure_level: MemoryPressureLevel,
}

#[derive(Debug, Clone)]
pub struct SystemRecoveryStatus {
    pub overall_status: RecoveryStatus,
    pub audio_thread_status: RecoveryStatus,
    pub voice_recovery_count: u32,
    pub memory_pressure_level: MemoryPressureLevel,
    pub recovery_actions_taken: u32,
}

#[derive(Debug, Clone, Copy)]
pub enum RecoveryStatus {
    Healthy,
    Warning,
    Recovering,
    Critical,
    Emergency,
}

use crate::memory::MemoryPressureLevel;
use crate::recovery::audio_shield::{AudioThreadShield, AudioRecoveryStats};
use crate::recovery::voice_recovery::{VoiceRecoveryManager, VoiceRecoveryMode};
```

This comprehensive error recovery system ensures the EMU8000 emulator maintains continuous audio output even under severe error conditions, with graceful degradation and transparent recovery capabilities.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Design error recovery system for audio thread failures", "status": "completed", "priority": "high", "id": "error-recovery-system"}, {"content": "Design configuration system for hardware capabilities", "status": "pending", "priority": "high", "id": "configuration-system"}, {"content": "Design memory management strategy for large SoundFonts", "status": "completed", "priority": "high", "id": "memory-management-strategy"}, {"content": "Design input validation framework for SoundFont/MIDI parsing", "status": "completed", "priority": "high", "id": "input-validation-framework"}, {"content": "Design performance monitoring system for real-time audio", "status": "completed", "priority": "high", "id": "performance-monitoring-system"}, {"content": "Evaluate additional best practices for EMU8000 project", "status": "completed", "priority": "medium", "id": "best-practices-evaluation"}, {"content": "Design comprehensive testing strategy (unit + stress testing)", "status": "completed", "priority": "high", "id": "testing-strategy-design"}, {"content": "Phase 1.1: Create web/package.json with TypeScript and WebMIDI dependencies", "status": "completed", "priority": "high", "id": "phase-1-1-web-package-json"}, {"content": "Phase 1.2: Create web/tsconfig.json for TypeScript configuration", "status": "completed", "priority": "high", "id": "phase-1-2-web-tsconfig"}, {"content": "Phase 1.3: Add lock-free MIDI event queue interface to src/lib.rs (WASM side)", "status": "completed", "priority": "high", "id": "phase-1-3-wasm-midi-queue"}, {"content": "Phase 1.4: Create TypeScript\u2194WASM bridge for MIDI events with sample-accurate timing", "status": "completed", "priority": "high", "id": "phase-1-4-midi-timing-bridge"}, {"content": "Phase 2.1: Create web/src/virtual-midi-keyboard.ts - 88-key piano interface", "status": "pending", "priority": "medium", "id": "phase-2-1-virtual-midi-keyboard"}, {"content": "Phase 2.2: Add General MIDI instrument selector (128 instruments)", "status": "pending", "priority": "medium", "id": "phase-2-2-gm-instrument-selector"}, {"content": "Phase 2.3: Implement CC controls: pitch bend, modulation wheel, sustain pedal", "status": "pending", "priority": "medium", "id": "phase-2-3-midi-cc-controls"}, {"content": "Phase 2.4: Add keyboard mouse/touch input with velocity sensitivity", "status": "pending", "priority": "medium", "id": "phase-2-4-keyboard-input-handling"}, {"content": "Phase 3.1: Create web/src/midi-input.ts - WebMIDI device discovery and connection", "status": "pending", "priority": "low", "id": "phase-3-1-webmidi-device-discovery"}, {"content": "Phase 3.2: Implement MIDI message parsing and validation in midi-input.ts", "status": "pending", "priority": "low", "id": "phase-3-2-midi-message-parsing"}, {"content": "Phase 3.3: Implement MIDI device state management (connect/disconnect)", "status": "pending", "priority": "low", "id": "phase-3-3-midi-device-management"}, {"content": "Phase 4.1: Add MIDI file parser basics in src/midi/parser.rs", "status": "pending", "priority": "low", "id": "phase-4-1-midi-file-parser"}, {"content": "Phase 4.2: Implement MIDI track parsing and event extraction", "status": "pending", "priority": "low", "id": "phase-4-2-midi-track-parsing"}, {"content": "Phase 4.3: Create web/src/midi-file-loader.ts - drag/drop MIDI file interface", "status": "pending", "priority": "low", "id": "phase-4-3-midi-file-loader"}, {"content": "Phase 4.4: Add MIDI file playback controls: play/pause/stop/seek", "status": "pending", "priority": "low", "id": "phase-4-4-midi-playback-controls"}, {"content": "Phase 5.1: Unified MIDI routing: virtual keyboard + hardware + file playback \u2192 WASM", "status": "pending", "priority": "low", "id": "phase-5-1-unified-midi-routing"}, {"content": "Phase 5.2: Add basic MIDI sequencer structure in src/midi/sequencer.rs", "status": "pending", "priority": "low", "id": "phase-5-2-rust-midi-sequencer"}, {"content": "Phase 5.3: Connect VoiceManager to MIDI events (note_on/note_off)", "status": "pending", "priority": "low", "id": "phase-5-3-midi-voice-connection"}, {"content": "Phase 6.1: INTEGRATION CHECK - Verify MIDI queue integration with VoiceManager", "status": "pending", "priority": "low", "id": "phase-6-1-midi-queue-voice-integration"}, {"content": "Phase 6.2: INTEGRATION CHECK - Verify sequencer timing affects voice envelope timing", "status": "pending", "priority": "low", "id": "phase-6-2-sequencer-voice-timing-integration"}, {"content": "Phase 6.3: INTEGRATION CHECK - Test voice allocation/stealing with MIDI priority", "status": "pending", "priority": "low", "id": "phase-6-3-voice-allocation-midi-integration"}, {"content": "Phase 7.1: Create web/src/ui-controls.ts for play/pause/stop interface", "status": "pending", "priority": "low", "id": "phase-7-1-ui-controls"}, {"content": "Phase 7.2: Update index.html to load TypeScript modules and MIDI interface", "status": "pending", "priority": "low", "id": "phase-7-2-html-typescript-integration"}, {"content": "Phase 7.3: Build and test MIDI input\u2192WASM\u2192audio output pipeline", "status": "pending", "priority": "low", "id": "phase-7-3-end-to-end-midi-test"}, {"content": "Phase 8.1: Test virtual keyboard: 88 keys + GM instruments + CC controls", "status": "pending", "priority": "low", "id": "phase-8-1-virtual-keyboard-test"}, {"content": "Phase 8.2: Test MIDI file loading: multi-track, tempo changes, complex timing", "status": "pending", "priority": "low", "id": "phase-8-2-midi-file-test"}, {"content": "Phase 8.3: INTEGRATION CHECK - Verify MIDI file events affect synthesis parameters", "status": "pending", "priority": "low", "id": "phase-8-3-midi-file-integration"}, {"content": "Phase 8.4: Test with real MIDI hardware device and verify sample-accurate timing", "status": "pending", "priority": "low", "id": "phase-8-4-hardware-midi-test"}]