# AWE Player WASM Exports Reference

This document lists all available WASM exports for the Rust-centric AWE Player architecture.

## Core Audio Processing

### AudioWorklet Bridge
- `init_audio_worklet(sample_rate: number): boolean` - Initialize the global audio bridge
- `process_audio_buffer(buffer_length: number): Float32Array` - Process mono audio buffer
- `process_stereo_buffer_global(buffer_length: number): Float32Array` - Process stereo buffer
- `get_sample_rate(): number` - Get current sample rate
- `reset_audio_state_global(): void` - Reset all audio state
- `test_audio_worklet_global(buffer_size: number): string` - Test audio functionality

### MIDI Events
- `queue_midi_event_global(timestamp: bigint, channel: number, message_type: number, data1: number, data2: number): void` - Queue MIDI event

## Buffer Management

### Buffer Configuration
- `set_buffer_size_global(size: number): void` - Set buffer size (128/256/512)
- `get_buffer_size_global(): number` - Get current buffer size
- `get_recommended_buffer_size_global(target_latency_ms: number): number` - Get optimal buffer size
- `get_current_latency_ms_global(): number` - Get current buffer latency
- `set_adaptive_mode_global(enabled: boolean): void` - Enable/disable adaptive sizing

### Performance Monitoring
- `set_device_info_global(hardware_concurrency: number, device_memory_gb: number): void` - Set device info
- `record_processing_time_global(processing_time_ms: number, buffer_size: number): void` - Record performance
- `record_underrun_global(): void` - Record audio underrun
- `get_buffer_metrics_global(): string` - Get buffer performance metrics (JSON)
- `get_buffer_status_global(): string` - Get buffer status summary (JSON)

## Pipeline Management

### Pipeline Status
- `get_pipeline_status_global(): string` - Get pipeline status
- `is_pipeline_ready_global(): boolean` - Check if pipeline is ready
- `get_pipeline_stats_global(): string` - Get pipeline statistics (JSON)
- `reset_pipeline_global(): void` - Reset pipeline state
- `get_comprehensive_status_global(): string` - Get combined status (JSON)

## MIDI Test Sequences

### Test Generation
- `init_test_sequence_generator(sample_rate: number): void` - Initialize test generator
- `generate_c_major_scale_test(config_json?: string): string` - Generate C major scale test
- `generate_chromatic_scale_test(config_json?: string): string` - Generate chromatic scale test
- `generate_arpeggio_test(config_json?: string): string` - Generate arpeggio test
- `generate_chord_test(config_json?: string): string` - Generate chord test
- `generate_velocity_test(config_json?: string): string` - Generate velocity test

### Test Execution
- `execute_test_sequence(sequence_json: string): number` - Execute test sequence
- `quick_c_major_test(): string` - Quick C major scale test

### Utilities
- `midi_note_to_name(note: number): string` - Convert MIDI note to name (60 → "C4")
- `note_name_to_midi(note_name: string): number` - Convert name to MIDI note ("C4" → 60)

## System Management

### Initialization
- `init_all_systems(sample_rate: number): boolean` - Initialize all systems at once

### Diagnostics
- `get_debug_log_global(): string` - Get debug log from Rust
- `get_system_status(): string` - Get system overview (JSON)
- `get_version_info(): string` - Get version and build info (JSON)

## Legacy Exports (MidiPlayer Class)

These are still available but the global equivalents are preferred:

### MidiPlayer Instance Methods
- `MidiPlayer.new(): MidiPlayer` - Create new MIDI player
- `MidiPlayer.queue_midi_event(event: MidiEvent): void` - Queue MIDI event
- `MidiPlayer.get_debug_log(): string` - Get debug log
- `MidiPlayer.play_test_tone(): number` - Play test tone
- Plus sequencer controls (play, pause, stop, seek, etc.)

## Usage Examples

### Basic Initialization
```javascript
// Initialize all systems
const success = wasmModule.init_all_systems(44100);

// Check system status  
const status = JSON.parse(wasmModule.get_system_status());
console.log('Pipeline ready:', status.pipelineReady);
```

### MIDI Testing
```javascript
// Quick C major scale test
const result = JSON.parse(wasmModule.quick_c_major_test());
console.log('Events queued:', result.events_queued);

// Custom test sequence
const config = JSON.stringify({
    channel: 0,
    velocity: 100,
    note_duration_ms: 500,
    note_gap_ms: 100
});
const sequence = wasmModule.generate_c_major_scale_test(config);
const eventsQueued = wasmModule.execute_test_sequence(sequence);
```

### Buffer Management
```javascript
// Set device info for optimization
wasmModule.set_device_info_global(8, 16); // 8 cores, 16GB RAM

// Enable adaptive buffer sizing
wasmModule.set_adaptive_mode_global(true);

// Get buffer metrics
const metrics = JSON.parse(wasmModule.get_buffer_metrics_global());
console.log('Average processing time:', metrics.averageProcessingTime);
```

### Real-time MIDI
```javascript
// Queue Note On event
wasmModule.queue_midi_event_global(0, 0, 0x90, 60, 100);

// Queue Note Off event after 500ms
setTimeout(() => {
    wasmModule.queue_midi_event_global(0, 0, 0x80, 60, 0);
}, 500);
```