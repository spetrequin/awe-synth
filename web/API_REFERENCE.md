# AWE Player API Reference

## Overview

Complete API reference for AWE Player EMU8000 emulator. This document covers all public interfaces, methods, properties, and events available to developers.

## 📋 Table of Contents

- [Core Classes](#core-classes)
- [Interfaces](#interfaces)
- [Events](#events)
- [Error Types](#error-types)
- [Constants](#constants)
- [Utilities](#utilities)

## 🎹 Core Classes

### AWEPlayer

The main class for AWE Player functionality.

```typescript
class AWEPlayer extends EventTarget
```

#### Constructor

```typescript
constructor(audioContext: AudioContext)
```

Creates a new AWE Player instance.

**Parameters:**
- `audioContext: AudioContext` - Web Audio API context

**Example:**
```typescript
const audioContext = new AudioContext();
const player = new AWEPlayer(audioContext);
```

#### Static Methods

##### create()

```typescript
static async create(audioContext?: AudioContext): Promise<AWEPlayer>
```

Creates and initializes an AWE Player instance.

**Parameters:**
- `audioContext?: AudioContext` - Optional audio context (creates new if not provided)

**Returns:** `Promise<AWEPlayer>` - Initialized player instance

**Throws:** `AWEPlayerError` - If initialization fails

**Example:**
```typescript
const player = await AWEPlayer.create();
```

#### Instance Methods

##### Initialization

###### init()

```typescript
async init(): Promise<void>
```

Initializes the AWE Player WASM module and audio system.

**Throws:** `AWEPlayerError` - If initialization fails

**Example:**
```typescript
await player.init();
```

###### destroy()

```typescript
destroy(): void
```

Destroys the player instance and frees all resources.

**Example:**
```typescript
player.destroy();
```

##### SoundFont Management

###### loadSoundFont()

```typescript
async loadSoundFont(data: ArrayBuffer): Promise<void>
```

Loads a SoundFont 2.0 file into the player.

**Parameters:**
- `data: ArrayBuffer` - SoundFont file data

**Throws:** 
- `SoundFontError` - If file is invalid or corrupt
- `AWEPlayerError` - If loading fails

**Events:** Fires `soundfontloaded` event on success

**Example:**
```typescript
const response = await fetch('soundfont.sf2');
const data = await response.arrayBuffer();
await player.loadSoundFont(data);
```

###### unloadSoundFont()

```typescript
unloadSoundFont(): void
```

Unloads the current SoundFont and frees memory.

**Events:** Fires `soundfontunloaded` event

**Example:**
```typescript
player.unloadSoundFont();
```

###### getSoundFontInfo()

```typescript
getSoundFontInfo(): SoundFontInfo | null
```

Returns information about the loaded SoundFont.

**Returns:** `SoundFontInfo | null` - SoundFont metadata or null if none loaded

**Example:**
```typescript
const info = player.getSoundFontInfo();
if (info) {
    console.log(`Loaded: ${info.name} (${info.instruments.length} instruments)`);
}
```

##### MIDI File Operations

###### loadMidiFile()

```typescript
async loadMidiFile(data: ArrayBuffer): Promise<void>
```

Loads a MIDI file for playback.

**Parameters:**
- `data: ArrayBuffer` - MIDI file data

**Throws:** `MidiError` - If file is invalid

**Events:** Fires `midifileloaded` event on success

**Example:**
```typescript
const response = await fetch('song.mid');
const data = await response.arrayBuffer();
await player.loadMidiFile(data);
```

###### play()

```typescript
play(): void
```

Starts MIDI file playback.

**Events:** Fires `play` event

**Example:**
```typescript
player.play();
```

###### pause()

```typescript
pause(): void
```

Pauses MIDI file playback.

**Events:** Fires `pause` event

**Example:**
```typescript
player.pause();
```

###### stop()

```typescript
stop(): void
```

Stops MIDI file playback and resets position.

**Events:** Fires `stop` event

**Example:**
```typescript
player.stop();
```

###### seek()

```typescript
seek(positionMs: number): void
```

Seeks to a specific position in the MIDI file.

**Parameters:**
- `positionMs: number` - Position in milliseconds

**Events:** Fires `seek` event

**Example:**
```typescript
player.seek(30000); // Seek to 30 seconds
```

###### setLoop()

```typescript
setLoop(enabled: boolean): void
```

Enables or disables MIDI file looping.

**Parameters:**
- `enabled: boolean` - Whether to loop

**Example:**
```typescript
player.setLoop(true);
```

##### Real-time MIDI

###### sendMidiMessage()

```typescript
sendMidiMessage(message: Uint8Array): void
```

Sends a raw MIDI message to the synthesizer.

**Parameters:**
- `message: Uint8Array` - MIDI message bytes

**Example:**
```typescript
// Note On: Channel 0, Note 60, Velocity 100
player.sendMidiMessage(new Uint8Array([0x90, 60, 100]));
```

###### noteOn()

```typescript
noteOn(channel: number, note: number, velocity: number): void
```

Triggers a note on the specified channel.

**Parameters:**
- `channel: number` - MIDI channel (0-15)
- `note: number` - MIDI note number (0-127)
- `velocity: number` - Note velocity (0-127)

**Events:** Fires `noteon` event

**Example:**
```typescript
// Play middle C with medium velocity
player.noteOn(0, 60, 100);
```

###### noteOff()

```typescript
noteOff(channel: number, note: number): void
```

Releases a note on the specified channel.

**Parameters:**
- `channel: number` - MIDI channel (0-15)
- `note: number` - MIDI note number (0-127)

**Events:** Fires `noteoff` event

**Example:**
```typescript
player.noteOff(0, 60);
```

###### programChange()

```typescript
programChange(channel: number, program: number): void
```

Changes the instrument on the specified channel.

**Parameters:**
- `channel: number` - MIDI channel (0-15)
- `program: number` - Program number (0-127)

**Events:** Fires `programchange` event

**Example:**
```typescript
// Change to electric piano
player.programChange(0, 4);
```

###### controlChange()

```typescript
controlChange(channel: number, controller: number, value: number): void
```

Sends a control change message.

**Parameters:**
- `channel: number` - MIDI channel (0-15)
- `controller: number` - Controller number (0-127)
- `value: number` - Controller value (0-127)

**Events:** Fires `controlchange` event

**Example:**
```typescript
// Set volume to maximum
player.controlChange(0, 7, 127);
```

###### pitchBend()

```typescript
pitchBend(channel: number, value: number): void
```

Applies pitch bend to the specified channel.

**Parameters:**
- `channel: number` - MIDI channel (0-15)
- `value: number` - Pitch bend value (-8192 to 8191)

**Events:** Fires `pitchbend` event

**Example:**
```typescript
// Bend pitch up by a semitone
player.pitchBend(0, 4096);
```

###### allNotesOff()

```typescript
allNotesOff(channel?: number): void
```

Releases all active notes.

**Parameters:**
- `channel?: number` - Optional channel (releases all channels if not specified)

**Events:** Fires `allnotesoff` event

**Example:**
```typescript
// Release all notes on all channels
player.allNotesOff();

// Release notes on channel 0 only
player.allNotesOff(0);
```

###### resetAllControllers()

```typescript
resetAllControllers(channel?: number): void
```

Resets all MIDI controllers to default values.

**Parameters:**
- `channel?: number` - Optional channel (resets all channels if not specified)

**Events:** Fires `resetcontrollers` event

**Example:**
```typescript
player.resetAllControllers();
```

##### Audio Configuration

###### setMasterVolume()

```typescript
setMasterVolume(volume: number): void
```

Sets the master volume level.

**Parameters:**
- `volume: number` - Volume level (0.0-1.0)

**Example:**
```typescript
player.setMasterVolume(0.8);
```

###### getMasterVolume()

```typescript
getMasterVolume(): number
```

Gets the current master volume level.

**Returns:** `number` - Volume level (0.0-1.0)

**Example:**
```typescript
const volume = player.getMasterVolume();
```

###### setReverbSend()

```typescript
setReverbSend(level: number): void
```

Sets the global reverb send level.

**Parameters:**
- `level: number` - Reverb level (0.0-1.0)

**Example:**
```typescript
player.setReverbSend(0.3);
```

###### getReverbSend()

```typescript
getReverbSend(): number
```

Gets the current reverb send level.

**Returns:** `number` - Reverb level (0.0-1.0)

###### setChorusSend()

```typescript
setChorusSend(level: number): void
```

Sets the global chorus send level.

**Parameters:**
- `level: number` - Chorus level (0.0-1.0)

**Example:**
```typescript
player.setChorusSend(0.2);
```

###### getChorusSend()

```typescript
getChorusSend(): number
```

Gets the current chorus send level.

**Returns:** `number` - Chorus level (0.0-1.0)

###### setFilterCutoff()

```typescript
setFilterCutoff(frequency: number): void
```

Sets the global low-pass filter cutoff frequency.

**Parameters:**
- `frequency: number` - Cutoff frequency in Hz (100-8000)

**Example:**
```typescript
player.setFilterCutoff(2000);
```

###### getFilterCutoff()

```typescript
getFilterCutoff(): number
```

Gets the current filter cutoff frequency.

**Returns:** `number` - Cutoff frequency in Hz

###### setFilterResonance()

```typescript
setFilterResonance(resonance: number): void
```

Sets the global filter resonance.

**Parameters:**
- `resonance: number` - Resonance amount (0.0-1.0)

**Example:**
```typescript
player.setFilterResonance(0.5);
```

###### getFilterResonance()

```typescript
getFilterResonance(): number
```

Gets the current filter resonance.

**Returns:** `number` - Resonance amount (0.0-1.0)

##### Audio Routing

###### connect()

```typescript
connect(destination: AudioNode): void
```

Connects the player output to an audio destination.

**Parameters:**
- `destination: AudioNode` - Web Audio API destination node

**Example:**
```typescript
// Connect to audio output
player.connect(audioContext.destination);

// Connect to effects chain
const reverb = audioContext.createConvolver();
player.connect(reverb);
reverb.connect(audioContext.destination);
```

###### disconnect()

```typescript
disconnect(): void
```

Disconnects the player from all audio destinations.

**Example:**
```typescript
player.disconnect();
```

##### State Queries

###### isPlaying()

```typescript
isPlaying(): boolean
```

Returns whether MIDI file playback is active.

**Returns:** `boolean` - True if playing

**Example:**
```typescript
if (player.isPlaying()) {
    console.log('Playback is active');
}
```

###### getCurrentPosition()

```typescript
getCurrentPosition(): number
```

Gets the current playback position in milliseconds.

**Returns:** `number` - Position in milliseconds

**Example:**
```typescript
const position = player.getCurrentPosition();
console.log(`Position: ${position}ms`);
```

###### getDuration()

```typescript
getDuration(): number
```

Gets the total duration of the loaded MIDI file.

**Returns:** `number` - Duration in milliseconds

**Example:**
```typescript
const duration = player.getDuration();
console.log(`Duration: ${duration}ms`);
```

###### getActiveVoices()

```typescript
getActiveVoices(): number
```

Gets the number of currently active synthesis voices.

**Returns:** `number` - Active voice count (0-32)

**Example:**
```typescript
const voices = player.getActiveVoices();
console.log(`Active voices: ${voices}/32`);
```

###### getMaxPolyphony()

```typescript
getMaxPolyphony(): number
```

Gets the maximum polyphony (always 32 for EMU8000).

**Returns:** `number` - Maximum voices (32)

##### Performance Monitoring

###### getPerformanceMetrics()

```typescript
getPerformanceMetrics(): PerformanceMetrics
```

Gets comprehensive performance metrics.

**Returns:** `PerformanceMetrics` - Performance data

**Example:**
```typescript
const metrics = player.getPerformanceMetrics();
console.log(`CPU: ${(metrics.cpuUsage * 100).toFixed(1)}%`);
console.log(`Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB`);
```

###### getCpuUsage()

```typescript
getCpuUsage(): number
```

Gets the current CPU usage percentage.

**Returns:** `number` - CPU usage (0.0-1.0)

###### getMemoryUsage()

```typescript
getMemoryUsage(): number
```

Gets the current memory usage in bytes.

**Returns:** `number` - Memory usage in bytes

###### getAudioLatency()

```typescript
getAudioLatency(): number
```

Gets the current audio processing latency.

**Returns:** `number` - Latency in milliseconds

##### Configuration

###### configure()

```typescript
configure(config: Partial<AudioConfig>): void
```

Updates the audio configuration.

**Parameters:**
- `config: Partial<AudioConfig>` - Configuration options

**Example:**
```typescript
player.configure({
    polyphony: 16,
    reverbEnabled: true,
    chorusEnabled: false
});
```

###### getConfiguration()

```typescript
getConfiguration(): AudioConfig
```

Gets the current audio configuration.

**Returns:** `AudioConfig` - Current configuration

## 📚 Interfaces

### SoundFontInfo

Information about a loaded SoundFont.

```typescript
interface SoundFontInfo {
    name: string;              // SoundFont name
    version: string;           // SoundFont version
    instruments: InstrumentInfo[];  // Available instruments
    samples: SampleInfo[];     // Audio samples
    presets: PresetInfo[];     // MIDI presets
    fileSize: number;          // Original file size in bytes
    memoryUsage: number;       // Current memory usage in bytes
    loadTime: number;          // Load time in milliseconds
}
```

### InstrumentInfo

Information about a SoundFont instrument.

```typescript
interface InstrumentInfo {
    id: number;                // Unique instrument ID
    name: string;              // Instrument name
    bank: number;              // MIDI bank number
    program: number;           // MIDI program number
    sampleCount: number;       // Number of samples used
    keyRange: [number, number]; // [low, high] key range
    velocityRange: [number, number]; // [low, high] velocity range
}
```

### SampleInfo

Information about a SoundFont sample.

```typescript
interface SampleInfo {
    id: number;                // Unique sample ID
    name: string;              // Sample name
    sampleRate: number;        // Sample rate in Hz
    length: number;            // Length in samples
    loopStart: number;         // Loop start point
    loopEnd: number;           // Loop end point
    rootKey: number;           // Root MIDI key
}
```

### PresetInfo

Information about a MIDI preset.

```typescript
interface PresetInfo {
    bank: number;              // MIDI bank number
    program: number;           // MIDI program number
    name: string;              // Preset name
    instrumentIds: number[];   // Referenced instrument IDs
}
```

### MidiFileInfo

Information about a loaded MIDI file.

```typescript
interface MidiFileInfo {
    name: string;              // File name
    duration: number;          // Duration in milliseconds
    trackCount: number;        // Number of tracks
    eventCount: number;        // Total MIDI events
    ticksPerQuarter: number;   // MIDI timing resolution
    tempo: number;             // Initial tempo (BPM)
    timeSignature: [number, number]; // [numerator, denominator]
    keySignature: number;      // Key signature
}
```

### AudioConfig

Audio system configuration.

```typescript
interface AudioConfig {
    sampleRate: number;        // Audio sample rate (Hz)
    bufferSize: number;        // Audio buffer size (samples)
    polyphony: number;         // Maximum voices (1-32)
    reverbEnabled: boolean;    // Enable reverb effect
    chorusEnabled: boolean;    // Enable chorus effect
    filterEnabled: boolean;    // Enable low-pass filter
    interpolation: 'linear' | 'cubic'; // Sample interpolation
    oversampling: number;      // Oversampling factor (1-4)
}
```

### PerformanceMetrics

Real-time performance metrics.

```typescript
interface PerformanceMetrics {
    cpuUsage: number;          // CPU usage (0.0-1.0)
    memoryUsage: number;       // Memory usage in bytes
    activeVoices: number;      // Currently active voices
    audioLatency: number;      // Audio latency in ms
    renderTime: number;        // Render time in microseconds
    bufferUnderruns: number;   // Audio buffer underruns
    sampleRate: number;        // Current sample rate
    bufferSize: number;        // Current buffer size
}
```

## 🎯 Events

AWE Player extends EventTarget and emits the following events:

### Audio Events

#### `play`
Fired when MIDI playback starts.

```typescript
player.addEventListener('play', () => {
    console.log('Playback started');
});
```

#### `pause`
Fired when MIDI playback is paused.

```typescript
player.addEventListener('pause', () => {
    console.log('Playback paused');
});
```

#### `stop`
Fired when MIDI playback stops.

```typescript
player.addEventListener('stop', () => {
    console.log('Playback stopped');
});
```

#### `seek`
Fired when playback position changes.

```typescript
player.addEventListener('seek', (event: CustomEvent) => {
    console.log(`Seeked to: ${event.detail.position}ms`);
});
```

### MIDI Events

#### `noteon`
Fired when a MIDI note is triggered.

```typescript
player.addEventListener('noteon', (event: CustomEvent) => {
    const { channel, note, velocity } = event.detail;
    console.log(`Note On: Ch${channel} Note${note} Vel${velocity}`);
});
```

#### `noteoff`
Fired when a MIDI note is released.

```typescript
player.addEventListener('noteoff', (event: CustomEvent) => {
    const { channel, note } = event.detail;
    console.log(`Note Off: Ch${channel} Note${note}`);
});
```

#### `programchange`
Fired when a program change occurs.

```typescript
player.addEventListener('programchange', (event: CustomEvent) => {
    const { channel, program } = event.detail;
    console.log(`Program Change: Ch${channel} Program${program}`);
});
```

#### `controlchange`
Fired when a control change occurs.

```typescript
player.addEventListener('controlchange', (event: CustomEvent) => {
    const { channel, controller, value } = event.detail;
    console.log(`CC: Ch${channel} Controller${controller} Value${value}`);
});
```

### Resource Events

#### `soundfontloaded`
Fired when a SoundFont is successfully loaded.

```typescript
player.addEventListener('soundfontloaded', (event: CustomEvent) => {
    const info = event.detail;
    console.log(`SoundFont loaded: ${info.name}`);
});
```

#### `soundfontunloaded`
Fired when a SoundFont is unloaded.

```typescript
player.addEventListener('soundfontunloaded', () => {
    console.log('SoundFont unloaded');
});
```

#### `midifileloaded`
Fired when a MIDI file is successfully loaded.

```typescript
player.addEventListener('midifileloaded', (event: CustomEvent) => {
    const info = event.detail;
    console.log(`MIDI file loaded: ${info.name}`);
});
```

### Error Events

#### `error`
Fired when an error occurs.

```typescript
player.addEventListener('error', (event: CustomEvent) => {
    const error = event.detail;
    console.error(`AWE Player Error: ${error.message}`);
});
```

## ❌ Error Types

### AWEPlayerError

Base error class for AWE Player.

```typescript
class AWEPlayerError extends Error {
    constructor(message: string, code?: string);
    code?: string;
}
```

### SoundFontError

Errors related to SoundFont operations.

```typescript
class SoundFontError extends AWEPlayerError {
    // Error codes:
    // 'INVALID_FORMAT' - Not a valid SoundFont file
    // 'CORRUPTED_DATA' - File data is corrupted
    // 'UNSUPPORTED_VERSION' - Unsupported SoundFont version
    // 'MEMORY_ERROR' - Insufficient memory
}
```

### MidiError

Errors related to MIDI operations.

```typescript
class MidiError extends AWEPlayerError {
    // Error codes:
    // 'INVALID_FORMAT' - Not a valid MIDI file
    // 'UNSUPPORTED_FORMAT' - Unsupported MIDI format
    // 'PARSE_ERROR' - Error parsing MIDI data
}
```

### AudioError

Errors related to audio processing.

```typescript
class AudioError extends AWEPlayerError {
    // Error codes:
    // 'CONTEXT_ERROR' - Audio context error
    // 'BUFFER_ERROR' - Audio buffer error
    // 'DEVICE_ERROR' - Audio device error
}
```

## 📊 Constants

### MIDI Constants

```typescript
const MIDI = {
    // Channels
    MIN_CHANNEL: 0,
    MAX_CHANNEL: 15,
    DRUM_CHANNEL: 9,
    
    // Notes
    MIN_NOTE: 0,
    MAX_NOTE: 127,
    MIDDLE_C: 60,
    
    // Velocity
    MIN_VELOCITY: 0,
    MAX_VELOCITY: 127,
    
    // Controllers
    BANK_SELECT_MSB: 0,
    MODULATION: 1,
    BREATH_CONTROLLER: 2,
    FOOT_CONTROLLER: 4,
    PORTAMENTO_TIME: 5,
    DATA_ENTRY_MSB: 6,
    VOLUME: 7,
    BALANCE: 8,
    PAN: 10,
    EXPRESSION: 11,
    EFFECT_1: 12,
    EFFECT_2: 13,
    SUSTAIN_PEDAL: 64,
    PORTAMENTO_SWITCH: 65,
    SOSTENUTO_PEDAL: 66,
    SOFT_PEDAL: 67,
    LEGATO_PEDAL: 68,
    HOLD_2_PEDAL: 69,
    SOUND_VARIATION: 70,
    SOUND_TIMBRE: 71,
    SOUND_RELEASE_TIME: 72,
    SOUND_ATTACK_TIME: 73,
    SOUND_BRIGHTNESS: 74,
    REVERB_SEND: 91,
    CHORUS_SEND: 93,
    ALL_SOUND_OFF: 120,
    RESET_ALL_CONTROLLERS: 121,
    LOCAL_CONTROL: 122,
    ALL_NOTES_OFF: 123,
    OMNI_MODE_OFF: 124,
    OMNI_MODE_ON: 125,
    MONO_MODE_ON: 126,
    POLY_MODE_ON: 127
};
```

### General MIDI Program Numbers

```typescript
const GM_PROGRAMS = {
    // Piano
    ACOUSTIC_GRAND_PIANO: 0,
    BRIGHT_ACOUSTIC_PIANO: 1,
    ELECTRIC_GRAND_PIANO: 2,
    HONKY_TONK_PIANO: 3,
    ELECTRIC_PIANO_1: 4,
    ELECTRIC_PIANO_2: 5,
    HARPSICHORD: 6,
    CLAVINET: 7,
    
    // Chromatic Percussion
    CELESTA: 8,
    GLOCKENSPIEL: 9,
    MUSIC_BOX: 10,
    VIBRAPHONE: 11,
    MARIMBA: 12,
    XYLOPHONE: 13,
    TUBULAR_BELLS: 14,
    DULCIMER: 15,
    
    // Organ
    DRAWBAR_ORGAN: 16,
    PERCUSSIVE_ORGAN: 17,
    ROCK_ORGAN: 18,
    CHURCH_ORGAN: 19,
    REED_ORGAN: 20,
    ACCORDION: 21,
    HARMONICA: 22,
    TANGO_ACCORDION: 23,
    
    // Guitar
    ACOUSTIC_GUITAR_NYLON: 24,
    ACOUSTIC_GUITAR_STEEL: 25,
    ELECTRIC_GUITAR_JAZZ: 26,
    ELECTRIC_GUITAR_CLEAN: 27,
    ELECTRIC_GUITAR_MUTED: 28,
    OVERDRIVEN_GUITAR: 29,
    DISTORTION_GUITAR: 30,
    GUITAR_HARMONICS: 31,
    
    // Bass
    ACOUSTIC_BASS: 32,
    ELECTRIC_BASS_FINGER: 33,
    ELECTRIC_BASS_PICK: 34,
    FRETLESS_BASS: 35,
    SLAP_BASS_1: 36,
    SLAP_BASS_2: 37,
    SYNTH_BASS_1: 38,
    SYNTH_BASS_2: 39,
    
    // Continue for all 128 programs...
};
```

### EMU8000 Specifications

```typescript
const EMU8000 = {
    MAX_POLYPHONY: 32,
    SAMPLE_RATE: 44100,
    FILTER_MIN_FREQ: 100,
    FILTER_MAX_FREQ: 8000,
    MAX_SAMPLE_MEMORY: 32 * 1024 * 1024, // 32MB
    REVERB_TAPS: 8,
    CHORUS_VOICES: 4
};
```

## 🛠️ Utilities

### MIDI Utilities

```typescript
class MIDIUtils {
    /**
     * Convert MIDI note number to frequency
     */
    static noteToFrequency(note: number): number {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
    
    /**
     * Convert frequency to MIDI note number
     */
    static frequencyToNote(frequency: number): number {
        return Math.round(69 + 12 * Math.log2(frequency / 440));
    }
    
    /**
     * Get note name from MIDI number
     */
    static noteToName(note: number): string {
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(note / 12) - 1;
        return names[note % 12] + octave;
    }
    
    /**
     * Parse MIDI message
     */
    static parseMessage(data: Uint8Array): MIDIMessage {
        const status = data[0];
        const channel = status & 0x0F;
        const type = status & 0xF0;
        
        return {
            channel,
            type,
            data: Array.from(data.slice(1))
        };
    }
}
```

### Audio Utilities

```typescript
class AudioUtils {
    /**
     * Convert linear gain to decibels
     */
    static linearToDb(linear: number): number {
        return 20 * Math.log10(Math.max(linear, 1e-10));
    }
    
    /**
     * Convert decibels to linear gain
     */
    static dbToLinear(db: number): number {
        return Math.pow(10, db / 20);
    }
    
    /**
     * Convert centibels to linear
     */
    static centibelToLinear(cb: number): number {
        return Math.pow(10, cb / 200);
    }
    
    /**
     * Convert cents to frequency ratio
     */
    static centsToRatio(cents: number): number {
        return Math.pow(2, cents / 1200);
    }
}
```

### Performance Utilities

```typescript
class PerformanceUtils {
    /**
     * Measure function execution time
     */
    static async measure<T>(fn: () => Promise<T>): Promise<{result: T, time: number}> {
        const start = performance.now();
        const result = await fn();
        const time = performance.now() - start;
        return { result, time };
    }
    
    /**
     * Throttle function calls
     */
    static throttle<T extends (...args: any[]) => any>(
        fn: T, 
        delay: number
    ): T {
        let lastCall = 0;
        return ((...args: any[]) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return fn(...args);
            }
        }) as T;
    }
    
    /**
     * Debounce function calls
     */
    static debounce<T extends (...args: any[]) => any>(
        fn: T, 
        delay: number
    ): T {
        let timeoutId: number;
        return ((...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        }) as T;
    }
}
```

---

This API reference provides complete documentation for all AWE Player functionality. For implementation examples and integration guides, see the [Developer Guide](DEVELOPER_GUIDE.md).

*Last Updated: August 2025 | Version 1.0 | API Reference v1.0*