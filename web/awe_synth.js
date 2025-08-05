let wasm;

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error(`expected a number argument, found ${typeof(n)}`);
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
/**
 * Initialize global test sequence generator
 * @param {number} sample_rate
 */
export function init_test_sequence_generator(sample_rate) {
    wasm.init_test_sequence_generator(sample_rate);
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error(`expected a string argument, found ${typeof(arg)}`);

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}
/**
 * Generate C major scale test sequence as JSON
 * @param {string | null} [config_json]
 * @returns {string}
 */
export function generate_c_major_scale_test(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        var ptr0 = isLikeNone(config_json) ? 0 : passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_c_major_scale_test(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate chromatic scale test sequence as JSON
 * @param {string | null} [config_json]
 * @returns {string}
 */
export function generate_chromatic_scale_test(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        var ptr0 = isLikeNone(config_json) ? 0 : passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_chromatic_scale_test(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate C major arpeggio test sequence as JSON
 * @param {string | null} [config_json]
 * @returns {string}
 */
export function generate_arpeggio_test(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        var ptr0 = isLikeNone(config_json) ? 0 : passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_arpeggio_test(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate chord test sequence as JSON
 * @param {string | null} [config_json]
 * @returns {string}
 */
export function generate_chord_test(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        var ptr0 = isLikeNone(config_json) ? 0 : passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_chord_test(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate velocity test sequence as JSON
 * @param {string | null} [config_json]
 * @returns {string}
 */
export function generate_velocity_test(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        var ptr0 = isLikeNone(config_json) ? 0 : passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_velocity_test(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Convert MIDI note to note name
 * @param {number} note
 * @returns {string}
 */
export function midi_note_to_name(note) {
    let deferred1_0;
    let deferred1_1;
    try {
        _assertNum(note);
        const ret = wasm.midi_note_to_name(note);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Convert note name to MIDI note number (returns 255 for invalid)
 * @param {string} note_name
 * @returns {number}
 */
export function note_name_to_midi(note_name) {
    const ptr0 = passStringToWasm0(note_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.note_name_to_midi(ptr0, len0);
    return ret;
}

/**
 * Execute a test sequence by queuing all its events
 * Returns number of events queued
 * @param {string} sequence_json
 * @returns {number}
 */
export function execute_test_sequence(sequence_json) {
    const ptr0 = passStringToWasm0(sequence_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.execute_test_sequence(ptr0, len0);
    return ret >>> 0;
}

/**
 * Quick test function - generate and execute C major scale
 * @returns {string}
 */
export function quick_c_major_test() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.quick_c_major_test();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

let cachedFloat32ArrayMemory0 = null;

function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function _assertBigInt(n) {
    if (typeof(n) !== 'bigint') throw new Error(`expected a bigint argument, found ${typeof(n)}`);
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error(`expected a boolean argument, found ${typeof(n)}`);
    }
}
/**
 * Utility functions for AudioWorklet integration
 * Calculate optimal buffer size based on sample rate and target latency
 * @param {number} sample_rate
 * @param {number} target_latency_ms
 * @returns {number}
 */
export function calculate_optimal_buffer_size(sample_rate, target_latency_ms) {
    const ret = wasm.calculate_optimal_buffer_size(sample_rate, target_latency_ms);
    return ret >>> 0;
}

/**
 * Validate sample rate for EMU8000 compatibility
 * @param {number} sample_rate
 * @returns {boolean}
 */
export function validate_sample_rate(sample_rate) {
    const ret = wasm.validate_sample_rate(sample_rate);
    return ret !== 0;
}

/**
 * Convert milliseconds to samples at given sample rate
 * @param {number} milliseconds
 * @param {number} sample_rate
 * @returns {number}
 */
export function ms_to_samples(milliseconds, sample_rate) {
    const ret = wasm.ms_to_samples(milliseconds, sample_rate);
    return ret >>> 0;
}

/**
 * Convert samples to milliseconds at given sample rate
 * @param {number} samples
 * @param {number} sample_rate
 * @returns {number}
 */
export function samples_to_ms(samples, sample_rate) {
    _assertNum(samples);
    const ret = wasm.samples_to_ms(samples, sample_rate);
    return ret;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Initialize global AudioWorklet bridge with specified sample rate
 * Must be called once before using other AudioWorklet functions
 * @param {number} sample_rate
 * @returns {boolean}
 */
export function init_audio_worklet(sample_rate) {
    const ret = wasm.init_audio_worklet(sample_rate);
    return ret !== 0;
}

/**
 * Process audio buffer using global AudioWorklet bridge
 * Optimized for AudioWorklet process() callback - minimal overhead
 * @param {number} buffer_length
 * @returns {Float32Array}
 */
export function process_audio_buffer(buffer_length) {
    _assertNum(buffer_length);
    const ret = wasm.process_audio_buffer(buffer_length);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Get sample rate from global AudioWorklet bridge
 * @returns {number}
 */
export function get_sample_rate() {
    const ret = wasm.get_sample_rate();
    return ret;
}

/**
 * Queue MIDI event through global AudioWorklet bridge
 * Optimized for real-time MIDI input from AudioWorklet
 * @param {bigint} timestamp
 * @param {number} channel
 * @param {number} message_type
 * @param {number} data1
 * @param {number} data2
 */
export function queue_midi_event_global(timestamp, channel, message_type, data1, data2) {
    _assertBigInt(timestamp);
    _assertNum(channel);
    _assertNum(message_type);
    _assertNum(data1);
    _assertNum(data2);
    wasm.queue_midi_event_global(timestamp, channel, message_type, data1, data2);
}

/**
 * Process stereo buffer (interleaved) using global bridge
 * @param {number} buffer_length
 * @returns {Float32Array}
 */
export function process_stereo_buffer_global(buffer_length) {
    _assertNum(buffer_length);
    const ret = wasm.process_stereo_buffer_global(buffer_length);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Set buffer size for global AudioWorklet bridge
 * @param {number} size
 */
export function set_buffer_size_global(size) {
    _assertNum(size);
    wasm.set_buffer_size_global(size);
}

/**
 * Get current buffer size from global bridge
 * @returns {number}
 */
export function get_buffer_size_global() {
    const ret = wasm.get_buffer_size_global();
    return ret >>> 0;
}

/**
 * Reset audio state in global bridge (stop all voices, clear events)
 */
export function reset_audio_state_global() {
    wasm.reset_audio_state_global();
}

/**
 * Test global AudioWorklet bridge functionality
 * @param {number} buffer_size
 * @returns {string}
 */
export function test_audio_worklet_global(buffer_size) {
    let deferred1_0;
    let deferred1_1;
    try {
        _assertNum(buffer_size);
        const ret = wasm.test_audio_worklet_global(buffer_size);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get debug log from global bridge
 * @returns {string}
 */
export function get_debug_log_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_debug_log_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Set device information for buffer optimization
 * @param {number} hardware_concurrency
 * @param {number} device_memory_gb
 */
export function set_device_info_global(hardware_concurrency, device_memory_gb) {
    _assertNum(hardware_concurrency);
    _assertNum(device_memory_gb);
    wasm.set_device_info_global(hardware_concurrency, device_memory_gb);
}

/**
 * Record processing time for buffer management
 * @param {number} processing_time_ms
 * @param {number} buffer_size
 */
export function record_processing_time_global(processing_time_ms, buffer_size) {
    _assertNum(buffer_size);
    wasm.record_processing_time_global(processing_time_ms, buffer_size);
}

/**
 * Record buffer underrun (audio glitch)
 */
export function record_underrun_global() {
    wasm.record_underrun_global();
}

/**
 * Get buffer performance metrics as JSON
 * @returns {string}
 */
export function get_buffer_metrics_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_buffer_metrics_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get buffer status summary as JSON
 * @returns {string}
 */
export function get_buffer_status_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_buffer_status_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get recommended buffer size for target latency
 * @param {number} target_latency_ms
 * @returns {number}
 */
export function get_recommended_buffer_size_global(target_latency_ms) {
    const ret = wasm.get_recommended_buffer_size_global(target_latency_ms);
    return ret >>> 0;
}

/**
 * Get current buffer latency in milliseconds
 * @returns {number}
 */
export function get_current_latency_ms_global() {
    const ret = wasm.get_current_latency_ms_global();
    return ret;
}

/**
 * Enable or disable adaptive buffer sizing
 * @param {boolean} enabled
 */
export function set_adaptive_mode_global(enabled) {
    _assertBoolean(enabled);
    wasm.set_adaptive_mode_global(enabled);
}

/**
 * Get pipeline status as string
 * @returns {string}
 */
export function get_pipeline_status_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_pipeline_status_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Check if pipeline is ready for processing
 * @returns {boolean}
 */
export function is_pipeline_ready_global() {
    const ret = wasm.is_pipeline_ready_global();
    return ret !== 0;
}

/**
 * Get comprehensive pipeline statistics as JSON
 * @returns {string}
 */
export function get_pipeline_stats_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_pipeline_stats_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Reset pipeline state
 */
export function reset_pipeline_global() {
    wasm.reset_pipeline_global();
}

/**
 * Get combined audio and pipeline status as JSON
 * @returns {string}
 */
export function get_comprehensive_status_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_comprehensive_status_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Initialize all global systems with sample rate
 * @param {number} sample_rate
 * @returns {boolean}
 */
export function init_all_systems(sample_rate) {
    const ret = wasm.init_all_systems(sample_rate);
    return ret !== 0;
}

/**
 * Get system status overview as JSON
 * @returns {string}
 */
export function get_system_status() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_system_status();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get AWE Player version and build info
 * @returns {string}
 */
export function get_version_info() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_version_info();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Initialize SoundFont module
 * @returns {string}
 */
export function init_soundfont_module() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.init_soundfont_module();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Validate SoundFont file header
 * @param {Uint8Array} data
 * @returns {string}
 */
export function validate_soundfont_header(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.validate_soundfont_header(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get SoundFont module information
 * @returns {string}
 */
export function get_soundfont_info() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_soundfont_info();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Test SoundFont module functionality
 * @returns {string}
 */
export function test_soundfont_module() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.test_soundfont_module();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Parse complete SoundFont file (Task 9A.4)
 * @param {Uint8Array} data
 * @returns {string}
 */
export function parse_soundfont_file(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parse_soundfont_file(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Test SoundFont header parsing with real SF2 data
 * @returns {string}
 */
export function test_soundfont_parsing() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.test_soundfont_parsing();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Load SoundFont into MidiPlayer for synthesis
 * @param {Uint8Array} data
 * @returns {string}
 */
export function load_soundfont_into_player(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.load_soundfont_into_player(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Select preset by bank and program number
 * @param {number} bank
 * @param {number} program
 * @returns {string}
 */
export function select_preset_global(bank, program) {
    let deferred1_0;
    let deferred1_1;
    try {
        _assertNum(bank);
        _assertNum(program);
        const ret = wasm.select_preset_global(bank, program);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get current preset information
 * @returns {string}
 */
export function get_current_preset_info_global() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_current_preset_info_global();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Test SoundFont synthesis with MIDI events
 * @returns {string}
 */
export function test_soundfont_synthesis() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.test_soundfont_synthesis();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const AweError = Object.freeze({
    InvalidSoundFont: 0, "0": "InvalidSoundFont",
    InvalidMidiFile: 1, "1": "InvalidMidiFile",
    VoiceAllocationFailed: 2, "2": "VoiceAllocationFailed",
    SampleNotFound: 3, "3": "SampleNotFound",
    AudioProcessingError: 4, "4": "AudioProcessingError",
});

const AudioWorkletBridgeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_audioworkletbridge_free(ptr >>> 0, 1));
/**
 * AudioWorklet bridge for real-time audio processing
 * Manages buffer-based audio processing between Web Audio API and WASM
 */
export class AudioWorkletBridge {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AudioWorkletBridgeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_audioworkletbridge_free(ptr, 0);
    }
    /**
     * Create new AudioWorkletBridge with specified sample rate
     * @param {number} sample_rate
     */
    constructor(sample_rate) {
        const ret = wasm.audioworkletbridge_new(sample_rate);
        this.__wbg_ptr = ret >>> 0;
        AudioWorkletBridgeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get the current sample rate
     * @returns {number}
     */
    get_sample_rate() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.audioworkletbridge_get_sample_rate(this.__wbg_ptr);
        return ret;
    }
    /**
     * Set the buffer size for processing (128, 256, or 512 samples)
     * @param {number} size
     */
    set_buffer_size(size) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(size);
        wasm.audioworkletbridge_set_buffer_size(this.__wbg_ptr, size);
    }
    /**
     * Get the current buffer size
     * @returns {number}
     */
    get_buffer_size() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.audioworkletbridge_get_buffer_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Process audio buffer - main AudioWorklet processing method
     * Takes output buffer size and fills it with synthesized audio
     * Returns number of samples processed
     * @param {number} buffer_length
     * @returns {Float32Array}
     */
    process_audio_buffer(buffer_length) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(buffer_length);
        const ret = wasm.audioworkletbridge_process_audio_buffer(this.__wbg_ptr, buffer_length);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Process stereo audio buffer (interleaved L/R samples)
     * For stereo output: [L0, R0, L1, R1, L2, R2, ...]
     * @param {number} buffer_length
     * @returns {Float32Array}
     */
    process_stereo_buffer(buffer_length) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(buffer_length);
        const ret = wasm.audioworkletbridge_process_stereo_buffer(this.__wbg_ptr, buffer_length);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Process audio with separate left/right channel buffers
     * Used when AudioWorklet provides separate channel arrays
     * @param {number} buffer_length
     * @returns {Array<any>}
     */
    process_dual_mono(buffer_length) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(buffer_length);
        const ret = wasm.audioworkletbridge_process_dual_mono(this.__wbg_ptr, buffer_length);
        return ret;
    }
    /**
     * Get reference to internal MidiPlayer for MIDI event handling
     * This allows the JavaScript side to queue MIDI events
     * @returns {number}
     */
    get_midi_player() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.audioworkletbridge_get_midi_player(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Queue MIDI event through the worklet bridge
     * @param {bigint} timestamp
     * @param {number} channel
     * @param {number} message_type
     * @param {number} data1
     * @param {number} data2
     */
    queue_midi_event(timestamp, channel, message_type, data1, data2) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertBigInt(timestamp);
        _assertNum(channel);
        _assertNum(message_type);
        _assertNum(data1);
        _assertNum(data2);
        wasm.audioworkletbridge_queue_midi_event(this.__wbg_ptr, timestamp, channel, message_type, data1, data2);
    }
    /**
     * Set device information for buffer optimization
     * @param {number} hardware_concurrency
     * @param {number} device_memory_gb
     */
    set_device_info(hardware_concurrency, device_memory_gb) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(hardware_concurrency);
        _assertNum(device_memory_gb);
        wasm.audioworkletbridge_set_device_info(this.__wbg_ptr, hardware_concurrency, device_memory_gb);
    }
    /**
     * Record processing time for buffer performance monitoring
     * @param {number} processing_time_ms
     * @param {number} buffer_size
     */
    record_processing_time(processing_time_ms, buffer_size) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(buffer_size);
        wasm.audioworkletbridge_record_processing_time(this.__wbg_ptr, processing_time_ms, buffer_size);
    }
    /**
     * Record buffer underrun (audio glitch)
     */
    record_underrun() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.audioworkletbridge_record_underrun(this.__wbg_ptr);
    }
    /**
     * Record buffer overrun (processing too fast)
     */
    record_overrun() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.audioworkletbridge_record_overrun(this.__wbg_ptr);
    }
    /**
     * Get buffer performance metrics as JSON string
     * @returns {string}
     */
    get_buffer_metrics() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_buffer_metrics(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get buffer status summary as JSON string
     * @returns {string}
     */
    get_buffer_status() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_buffer_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get recommended buffer size for target latency
     * @param {number} target_latency_ms
     * @returns {number}
     */
    get_recommended_buffer_size(target_latency_ms) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.audioworkletbridge_get_recommended_buffer_size(this.__wbg_ptr, target_latency_ms);
        return ret >>> 0;
    }
    /**
     * Get current buffer latency in milliseconds
     * @returns {number}
     */
    get_current_latency_ms() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.audioworkletbridge_get_current_latency_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * Set buffer size (affects buffer manager and worklet)
     * @param {number} size
     */
    set_optimal_buffer_size(size) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(size);
        wasm.audioworkletbridge_set_optimal_buffer_size(this.__wbg_ptr, size);
    }
    /**
     * Enable or disable adaptive buffer sizing
     * @param {boolean} enabled
     */
    set_adaptive_mode(enabled) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertBoolean(enabled);
        wasm.audioworkletbridge_set_adaptive_mode(this.__wbg_ptr, enabled);
    }
    /**
     * Reset buffer performance metrics
     */
    reset_buffer_metrics() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.audioworkletbridge_reset_buffer_metrics(this.__wbg_ptr);
    }
    /**
     * Get debug log from internal systems
     * @returns {string}
     */
    get_debug_log() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_debug_log(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Test the worklet bridge with a simple tone
     * @param {number} buffer_size
     * @returns {string}
     */
    test_worklet_bridge(buffer_size) {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            _assertNum(buffer_size);
            const ret = wasm.audioworkletbridge_test_worklet_bridge(this.__wbg_ptr, buffer_size);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Reset all audio state (stop all voices, clear events)
     */
    reset_audio_state() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.audioworkletbridge_reset_audio_state(this.__wbg_ptr);
    }
    /**
     * Get current audio statistics for monitoring
     * @returns {string}
     */
    get_audio_stats() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_audio_stats(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get pipeline status as string for JavaScript
     * @returns {string}
     */
    get_pipeline_status() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_pipeline_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Check if pipeline is ready for processing
     * @returns {boolean}
     */
    is_pipeline_ready() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.audioworkletbridge_is_pipeline_ready(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get comprehensive pipeline statistics as JSON
     * @returns {string}
     */
    get_pipeline_stats() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_pipeline_stats(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Force pipeline status update (for testing/debugging)
     */
    reset_pipeline() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.audioworkletbridge_reset_pipeline(this.__wbg_ptr);
    }
    /**
     * Get combined audio and pipeline status as JSON
     * @returns {string}
     */
    get_comprehensive_status() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.audioworkletbridge_get_comprehensive_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const MidiEventFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_midievent_free(ptr >>> 0, 1));

export class MidiEvent {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MidiEventFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_midievent_free(ptr, 0);
    }
    /**
     * @returns {bigint}
     */
    get timestamp() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_midievent_timestamp(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set timestamp(arg0) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertBigInt(arg0);
        wasm.__wbg_set_midievent_timestamp(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get channel() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_midievent_channel(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set channel(arg0) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(arg0);
        wasm.__wbg_set_midievent_channel(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get message_type() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_midievent_message_type(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set message_type(arg0) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(arg0);
        wasm.__wbg_set_midievent_message_type(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get data1() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_midievent_data1(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set data1(arg0) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(arg0);
        wasm.__wbg_set_midievent_data1(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get data2() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.__wbg_get_midievent_data2(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set data2(arg0) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(arg0);
        wasm.__wbg_set_midievent_data2(this.__wbg_ptr, arg0);
    }
    /**
     * @param {bigint} timestamp
     * @param {number} channel
     * @param {number} message_type
     * @param {number} data1
     * @param {number} data2
     */
    constructor(timestamp, channel, message_type, data1, data2) {
        _assertBigInt(timestamp);
        _assertNum(channel);
        _assertNum(message_type);
        _assertNum(data1);
        _assertNum(data2);
        const ret = wasm.midievent_new(timestamp, channel, message_type, data1, data2);
        this.__wbg_ptr = ret >>> 0;
        MidiEventFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const MidiPlayerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_midiplayer_free(ptr >>> 0, 1));

export class MidiPlayer {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MidiPlayerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_midiplayer_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.midiplayer_new();
        this.__wbg_ptr = ret >>> 0;
        MidiPlayerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {MidiEvent} event
     */
    queue_midi_event(event) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertClass(event, MidiEvent);
        if (event.__wbg_ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        var ptr0 = event.__destroy_into_raw();
        wasm.midiplayer_queue_midi_event(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {bigint} current_sample_time
     * @returns {number}
     */
    process_midi_events(current_sample_time) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertBigInt(current_sample_time);
        const ret = wasm.midiplayer_process_midi_events(this.__wbg_ptr, current_sample_time);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get_debug_log() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.midiplayer_get_debug_log(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    play_test_tone() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_play_test_tone(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    test_envelope_system() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.midiplayer_test_envelope_system(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {Uint8Array} data
     * @returns {boolean}
     */
    load_midi_file(data) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.midiplayer_load_midi_file(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    play() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.midiplayer_play(this.__wbg_ptr);
    }
    pause() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.midiplayer_pause(this.__wbg_ptr);
    }
    stop() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.midiplayer_stop(this.__wbg_ptr);
    }
    /**
     * @param {number} position
     */
    seek(position) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.midiplayer_seek(this.__wbg_ptr, position);
    }
    /**
     * @param {number} multiplier
     */
    set_tempo_multiplier(multiplier) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        wasm.midiplayer_set_tempo_multiplier(this.__wbg_ptr, multiplier);
    }
    /**
     * @returns {number}
     */
    get_playback_state() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_get_playback_state(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_position() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_get_position(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_position_seconds() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_get_position_seconds(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_duration_seconds() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_get_duration_seconds(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_current_tempo_bpm() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_get_current_tempo_bpm(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_original_tempo_bpm() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_get_original_tempo_bpm(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} samples
     */
    advance_time(samples) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        _assertNum(samples);
        wasm.midiplayer_advance_time(this.__wbg_ptr, samples);
    }
    /**
     * Process one audio sample - main audio processing method for AudioWorklet
     * Returns single audio sample (-1.0 to 1.0) combining all active voices
     * @returns {number}
     */
    process() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.midiplayer_process(this.__wbg_ptr);
        return ret;
    }
    /**
     * Test complete synthesis pipeline: MIDI → Voice → Oscillator → Envelope → Audio
     * Returns test results as JSON string for verification
     * @returns {string}
     */
    test_synthesis_pipeline() {
        let deferred1_0;
        let deferred1_1;
        try {
            if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.__wbg_ptr);
            const ret = wasm.midiplayer_test_synthesis_pipeline(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_buffer_609cc3eee51ed158 = function() { return logError(function (arg0) {
        const ret = arg0.buffer;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_780abee5c1739fd7 = function() { return logError(function (arg0) {
        const ret = new Float32Array(arg0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_78feb108b6472713 = function() { return logError(function () {
        const ret = new Array();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_newwithbyteoffsetandlength_e6b7e69acd4c7354 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = new Float32Array(arg0, arg1 >>> 0, arg2 >>> 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_push_737cfc8c1432c2c6 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.push(arg1);
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_export_0;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return ret;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('awe_synth_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
