/* tslint:disable */
/* eslint-disable */
/**
 * Initialize global AudioWorklet bridge with specified sample rate
 * Must be called once before using other AudioWorklet functions
 */
export function init_audio_worklet(sample_rate: number): boolean;
/**
 * Process audio buffer using global AudioWorklet bridge
 * Optimized for AudioWorklet process() callback - minimal overhead
 */
export function process_audio_buffer(buffer_length: number): Float32Array;
/**
 * Get sample rate from global AudioWorklet bridge
 */
export function get_sample_rate(): number;
/**
 * Queue MIDI event through global AudioWorklet bridge
 * Optimized for real-time MIDI input from AudioWorklet
 */
export function queue_midi_event_global(timestamp: bigint, channel: number, message_type: number, data1: number, data2: number): void;
/**
 * Process stereo buffer (interleaved) using global bridge
 */
export function process_stereo_buffer_global(buffer_length: number): Float32Array;
/**
 * Set buffer size for global AudioWorklet bridge
 */
export function set_buffer_size_global(size: number): void;
/**
 * Get current buffer size from global bridge
 */
export function get_buffer_size_global(): number;
/**
 * Reset audio state in global bridge (stop all voices, clear events)
 */
export function reset_audio_state_global(): void;
/**
 * Test global AudioWorklet bridge functionality
 */
export function test_audio_worklet_global(buffer_size: number): string;
/**
 * Get debug log from global bridge
 */
export function get_debug_log_global(): string;
/**
 * Set device information for buffer optimization
 */
export function set_device_info_global(hardware_concurrency: number, device_memory_gb: number): void;
/**
 * Record processing time for buffer management
 */
export function record_processing_time_global(processing_time_ms: number, buffer_size: number): void;
/**
 * Record buffer underrun (audio glitch)
 */
export function record_underrun_global(): void;
/**
 * Get buffer performance metrics as JSON
 */
export function get_buffer_metrics_global(): string;
/**
 * Get buffer status summary as JSON
 */
export function get_buffer_status_global(): string;
/**
 * Get recommended buffer size for target latency
 */
export function get_recommended_buffer_size_global(target_latency_ms: number): number;
/**
 * Get current buffer latency in milliseconds
 */
export function get_current_latency_ms_global(): number;
/**
 * Enable or disable adaptive buffer sizing
 */
export function set_adaptive_mode_global(enabled: boolean): void;
/**
 * Get pipeline status as string
 */
export function get_pipeline_status_global(): string;
/**
 * Check if pipeline is ready for processing
 */
export function is_pipeline_ready_global(): boolean;
/**
 * Get comprehensive pipeline statistics as JSON
 */
export function get_pipeline_stats_global(): string;
/**
 * Reset pipeline state
 */
export function reset_pipeline_global(): void;
/**
 * Get combined audio and pipeline status as JSON
 */
export function get_comprehensive_status_global(): string;
/**
 * Initialize all global systems with sample rate
 */
export function init_all_systems(sample_rate: number): boolean;
/**
 * Get system status overview as JSON
 */
export function get_system_status(): string;
/**
 * Get AWE Player version and build info
 */
export function get_version_info(): string;
/**
 * Initialize SoundFont module
 */
export function init_soundfont_module(): string;
/**
 * Validate SoundFont file header
 */
export function validate_soundfont_header(data: Uint8Array): string;
/**
 * Get SoundFont module information
 */
export function get_soundfont_info(): string;
/**
 * Test SoundFont module functionality
 */
export function test_soundfont_module(): string;
/**
 * Parse complete SoundFont file (Task 9A.4)
 */
export function parse_soundfont_file(data: Uint8Array): string;
/**
 * Test SoundFont header parsing with real SF2 data
 */
export function test_soundfont_parsing(): string;
/**
 * Load SoundFont into MidiPlayer for synthesis
 */
export function load_soundfont_into_player(data: Uint8Array): string;
/**
 * Select preset by bank and program number
 */
export function select_preset_global(bank: number, program: number): string;
/**
 * Get current preset information
 */
export function get_current_preset_info_global(): string;
/**
 * Test SoundFont synthesis with MIDI events
 */
export function test_soundfont_synthesis(): string;
/**
 * Initialize global test sequence generator
 */
export function init_test_sequence_generator(sample_rate: number): void;
/**
 * Generate C major scale test sequence as JSON
 */
export function generate_c_major_scale_test(config_json?: string | null): string;
/**
 * Generate chromatic scale test sequence as JSON
 */
export function generate_chromatic_scale_test(config_json?: string | null): string;
/**
 * Generate C major arpeggio test sequence as JSON
 */
export function generate_arpeggio_test(config_json?: string | null): string;
/**
 * Generate chord test sequence as JSON
 */
export function generate_chord_test(config_json?: string | null): string;
/**
 * Generate velocity test sequence as JSON
 */
export function generate_velocity_test(config_json?: string | null): string;
/**
 * Convert MIDI note to note name
 */
export function midi_note_to_name(note: number): string;
/**
 * Convert note name to MIDI note number (returns 255 for invalid)
 */
export function note_name_to_midi(note_name: string): number;
/**
 * Execute a test sequence by queuing all its events
 * Returns number of events queued
 */
export function execute_test_sequence(sequence_json: string): number;
/**
 * Quick test function - generate and execute C major scale
 */
export function quick_c_major_test(): string;
/**
 * Utility functions for AudioWorklet integration
 * Calculate optimal buffer size based on sample rate and target latency
 */
export function calculate_optimal_buffer_size(sample_rate: number, target_latency_ms: number): number;
/**
 * Validate sample rate for EMU8000 compatibility  
 */
export function validate_sample_rate(sample_rate: number): boolean;
/**
 * Convert milliseconds to samples at given sample rate
 */
export function ms_to_samples(milliseconds: number, sample_rate: number): number;
/**
 * Convert samples to milliseconds at given sample rate
 */
export function samples_to_ms(samples: number, sample_rate: number): number;
export enum AweError {
  InvalidSoundFont = 0,
  InvalidMidiFile = 1,
  VoiceAllocationFailed = 2,
  SampleNotFound = 3,
  AudioProcessingError = 4,
}
/**
 * AudioWorklet bridge for real-time audio processing
 * Manages buffer-based audio processing between Web Audio API and WASM
 */
export class AudioWorkletBridge {
  free(): void;
  /**
   * Create new AudioWorkletBridge with specified sample rate
   */
  constructor(sample_rate: number);
  /**
   * Get the current sample rate
   */
  get_sample_rate(): number;
  /**
   * Set the buffer size for processing (128, 256, or 512 samples)
   */
  set_buffer_size(size: number): void;
  /**
   * Get the current buffer size
   */
  get_buffer_size(): number;
  /**
   * Process audio buffer - main AudioWorklet processing method
   * Takes output buffer size and fills it with synthesized audio
   * Returns number of samples processed
   */
  process_audio_buffer(buffer_length: number): Float32Array;
  /**
   * Process stereo audio buffer (interleaved L/R samples)
   * For stereo output: [L0, R0, L1, R1, L2, R2, ...]
   */
  process_stereo_buffer(buffer_length: number): Float32Array;
  /**
   * Process audio with separate left/right channel buffers
   * Used when AudioWorklet provides separate channel arrays
   */
  process_dual_mono(buffer_length: number): Array<any>;
  /**
   * Get reference to internal MidiPlayer for MIDI event handling
   * This allows the JavaScript side to queue MIDI events
   */
  get_midi_player(): number;
  /**
   * Queue MIDI event through the worklet bridge
   */
  queue_midi_event(timestamp: bigint, channel: number, message_type: number, data1: number, data2: number): void;
  /**
   * Set device information for buffer optimization
   */
  set_device_info(hardware_concurrency: number, device_memory_gb: number): void;
  /**
   * Record processing time for buffer performance monitoring
   */
  record_processing_time(processing_time_ms: number, buffer_size: number): void;
  /**
   * Record buffer underrun (audio glitch)
   */
  record_underrun(): void;
  /**
   * Record buffer overrun (processing too fast)
   */
  record_overrun(): void;
  /**
   * Get buffer performance metrics as JSON string
   */
  get_buffer_metrics(): string;
  /**
   * Get buffer status summary as JSON string
   */
  get_buffer_status(): string;
  /**
   * Get recommended buffer size for target latency
   */
  get_recommended_buffer_size(target_latency_ms: number): number;
  /**
   * Get current buffer latency in milliseconds
   */
  get_current_latency_ms(): number;
  /**
   * Set buffer size (affects buffer manager and worklet)
   */
  set_optimal_buffer_size(size: number): void;
  /**
   * Enable or disable adaptive buffer sizing
   */
  set_adaptive_mode(enabled: boolean): void;
  /**
   * Reset buffer performance metrics
   */
  reset_buffer_metrics(): void;
  /**
   * Get debug log from internal systems
   */
  get_debug_log(): string;
  /**
   * Test the worklet bridge with a simple tone
   */
  test_worklet_bridge(buffer_size: number): string;
  /**
   * Reset all audio state (stop all voices, clear events)
   */
  reset_audio_state(): void;
  /**
   * Get current audio statistics for monitoring
   */
  get_audio_stats(): string;
  /**
   * Get pipeline status as string for JavaScript
   */
  get_pipeline_status(): string;
  /**
   * Check if pipeline is ready for processing
   */
  is_pipeline_ready(): boolean;
  /**
   * Get comprehensive pipeline statistics as JSON
   */
  get_pipeline_stats(): string;
  /**
   * Force pipeline status update (for testing/debugging)
   */
  reset_pipeline(): void;
  /**
   * Get combined audio and pipeline status as JSON
   */
  get_comprehensive_status(): string;
}
export class MidiEvent {
  free(): void;
  constructor(timestamp: bigint, channel: number, message_type: number, data1: number, data2: number);
  timestamp: bigint;
  channel: number;
  message_type: number;
  data1: number;
  data2: number;
}
export class MidiPlayer {
  free(): void;
  constructor();
  queue_midi_event(event: MidiEvent): void;
  process_midi_events(current_sample_time: bigint): number;
  get_debug_log(): string;
  play_test_tone(): number;
  test_envelope_system(): string;
  load_midi_file(data: Uint8Array): boolean;
  play(): void;
  pause(): void;
  stop(): void;
  seek(position: number): void;
  set_tempo_multiplier(multiplier: number): void;
  get_playback_state(): number;
  get_position(): number;
  get_position_seconds(): number;
  get_duration_seconds(): number;
  get_current_tempo_bpm(): number;
  get_original_tempo_bpm(): number;
  advance_time(samples: number): void;
  /**
   * Process one audio sample - main audio processing method for AudioWorklet
   * Returns single audio sample (-1.0 to 1.0) combining all active voices
   */
  process(): number;
  /**
   * Test complete synthesis pipeline: MIDI → Voice → Oscillator → Envelope → Audio
   * Returns test results as JSON string for verification
   */
  test_synthesis_pipeline(): string;
  /**
   * Send MIDI message directly (for real-time input and testing)
   */
  send_midi_message(message: Uint8Array): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_midievent_free: (a: number, b: number) => void;
  readonly __wbg_get_midievent_timestamp: (a: number) => bigint;
  readonly __wbg_set_midievent_timestamp: (a: number, b: bigint) => void;
  readonly __wbg_get_midievent_channel: (a: number) => number;
  readonly __wbg_set_midievent_channel: (a: number, b: number) => void;
  readonly __wbg_get_midievent_message_type: (a: number) => number;
  readonly __wbg_set_midievent_message_type: (a: number, b: number) => void;
  readonly __wbg_get_midievent_data1: (a: number) => number;
  readonly __wbg_set_midievent_data1: (a: number, b: number) => void;
  readonly __wbg_get_midievent_data2: (a: number) => number;
  readonly __wbg_set_midievent_data2: (a: number, b: number) => void;
  readonly midievent_new: (a: bigint, b: number, c: number, d: number, e: number) => number;
  readonly __wbg_midiplayer_free: (a: number, b: number) => void;
  readonly midiplayer_new: () => number;
  readonly midiplayer_queue_midi_event: (a: number, b: number) => void;
  readonly midiplayer_process_midi_events: (a: number, b: bigint) => number;
  readonly midiplayer_get_debug_log: (a: number) => [number, number];
  readonly midiplayer_play_test_tone: (a: number) => number;
  readonly midiplayer_test_envelope_system: (a: number) => [number, number];
  readonly midiplayer_load_midi_file: (a: number, b: number, c: number) => number;
  readonly midiplayer_play: (a: number) => void;
  readonly midiplayer_pause: (a: number) => void;
  readonly midiplayer_stop: (a: number) => void;
  readonly midiplayer_seek: (a: number, b: number) => void;
  readonly midiplayer_set_tempo_multiplier: (a: number, b: number) => void;
  readonly midiplayer_get_playback_state: (a: number) => number;
  readonly midiplayer_get_position: (a: number) => number;
  readonly midiplayer_get_position_seconds: (a: number) => number;
  readonly midiplayer_get_duration_seconds: (a: number) => number;
  readonly midiplayer_get_current_tempo_bpm: (a: number) => number;
  readonly midiplayer_get_original_tempo_bpm: (a: number) => number;
  readonly midiplayer_advance_time: (a: number, b: number) => void;
  readonly midiplayer_process: (a: number) => number;
  readonly midiplayer_test_synthesis_pipeline: (a: number) => [number, number];
  readonly midiplayer_send_midi_message: (a: number, b: number, c: number) => [number, number];
  readonly init_audio_worklet: (a: number) => number;
  readonly process_audio_buffer: (a: number) => [number, number];
  readonly get_sample_rate: () => number;
  readonly queue_midi_event_global: (a: bigint, b: number, c: number, d: number, e: number) => void;
  readonly process_stereo_buffer_global: (a: number) => [number, number];
  readonly get_buffer_size_global: () => number;
  readonly test_audio_worklet_global: (a: number) => [number, number];
  readonly get_debug_log_global: () => [number, number];
  readonly get_buffer_metrics_global: () => [number, number];
  readonly get_buffer_status_global: () => [number, number];
  readonly get_recommended_buffer_size_global: (a: number) => number;
  readonly get_current_latency_ms_global: () => number;
  readonly set_adaptive_mode_global: (a: number) => void;
  readonly get_pipeline_status_global: () => [number, number];
  readonly is_pipeline_ready_global: () => number;
  readonly get_pipeline_stats_global: () => [number, number];
  readonly get_comprehensive_status_global: () => [number, number];
  readonly init_all_systems: (a: number) => number;
  readonly get_system_status: () => [number, number];
  readonly get_version_info: () => [number, number];
  readonly init_soundfont_module: () => [number, number];
  readonly validate_soundfont_header: (a: number, b: number) => [number, number];
  readonly get_soundfont_info: () => [number, number];
  readonly test_soundfont_module: () => [number, number];
  readonly parse_soundfont_file: (a: number, b: number) => [number, number];
  readonly test_soundfont_parsing: () => [number, number];
  readonly load_soundfont_into_player: (a: number, b: number) => [number, number];
  readonly select_preset_global: (a: number, b: number) => [number, number];
  readonly get_current_preset_info_global: () => [number, number];
  readonly test_soundfont_synthesis: () => [number, number];
  readonly reset_pipeline_global: () => void;
  readonly set_device_info_global: (a: number, b: number) => void;
  readonly record_processing_time_global: (a: number, b: number) => void;
  readonly reset_audio_state_global: () => void;
  readonly set_buffer_size_global: (a: number) => void;
  readonly record_underrun_global: () => void;
  readonly init_test_sequence_generator: (a: number) => void;
  readonly generate_c_major_scale_test: (a: number, b: number) => [number, number];
  readonly generate_chromatic_scale_test: (a: number, b: number) => [number, number];
  readonly generate_arpeggio_test: (a: number, b: number) => [number, number];
  readonly generate_chord_test: (a: number, b: number) => [number, number];
  readonly generate_velocity_test: (a: number, b: number) => [number, number];
  readonly midi_note_to_name: (a: number) => [number, number];
  readonly note_name_to_midi: (a: number, b: number) => number;
  readonly execute_test_sequence: (a: number, b: number) => number;
  readonly quick_c_major_test: () => [number, number];
  readonly __wbg_audioworkletbridge_free: (a: number, b: number) => void;
  readonly audioworkletbridge_new: (a: number) => number;
  readonly audioworkletbridge_get_sample_rate: (a: number) => number;
  readonly audioworkletbridge_set_buffer_size: (a: number, b: number) => void;
  readonly audioworkletbridge_get_buffer_size: (a: number) => number;
  readonly audioworkletbridge_process_audio_buffer: (a: number, b: number) => [number, number];
  readonly audioworkletbridge_process_stereo_buffer: (a: number, b: number) => [number, number];
  readonly audioworkletbridge_process_dual_mono: (a: number, b: number) => any;
  readonly audioworkletbridge_get_midi_player: (a: number) => number;
  readonly audioworkletbridge_queue_midi_event: (a: number, b: bigint, c: number, d: number, e: number, f: number) => void;
  readonly audioworkletbridge_set_device_info: (a: number, b: number, c: number) => void;
  readonly audioworkletbridge_record_processing_time: (a: number, b: number, c: number) => void;
  readonly audioworkletbridge_record_underrun: (a: number) => void;
  readonly audioworkletbridge_record_overrun: (a: number) => void;
  readonly audioworkletbridge_get_buffer_metrics: (a: number) => [number, number];
  readonly audioworkletbridge_get_buffer_status: (a: number) => [number, number];
  readonly audioworkletbridge_get_recommended_buffer_size: (a: number, b: number) => number;
  readonly audioworkletbridge_get_current_latency_ms: (a: number) => number;
  readonly audioworkletbridge_set_optimal_buffer_size: (a: number, b: number) => void;
  readonly audioworkletbridge_set_adaptive_mode: (a: number, b: number) => void;
  readonly audioworkletbridge_reset_buffer_metrics: (a: number) => void;
  readonly audioworkletbridge_get_debug_log: (a: number) => [number, number];
  readonly audioworkletbridge_test_worklet_bridge: (a: number, b: number) => [number, number];
  readonly audioworkletbridge_reset_audio_state: (a: number) => void;
  readonly audioworkletbridge_get_audio_stats: (a: number) => [number, number];
  readonly audioworkletbridge_get_pipeline_status: (a: number) => [number, number];
  readonly audioworkletbridge_is_pipeline_ready: (a: number) => number;
  readonly audioworkletbridge_get_pipeline_stats: (a: number) => [number, number];
  readonly audioworkletbridge_reset_pipeline: (a: number) => void;
  readonly audioworkletbridge_get_comprehensive_status: (a: number) => [number, number];
  readonly calculate_optimal_buffer_size: (a: number, b: number) => number;
  readonly validate_sample_rate: (a: number) => number;
  readonly ms_to_samples: (a: number, b: number) => number;
  readonly samples_to_ms: (a: number, b: number) => number;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
