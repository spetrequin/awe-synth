/**
 * MIDI Constants and Definitions
 * Part of AWE Player EMU8000 Emulator
 */

// MIDI Note Range (Standard Piano)
export const MIDI_NOTES = {
    LOWEST_PIANO: 21,  // A0
    HIGHEST_PIANO: 108, // C8
    MIDDLE_C: 60,      // C4
    OCTAVE_SIZE: 12
} as const;

// MIDI Channels
export const MIDI_CHANNELS = {
    MIN: 0,
    MAX: 15,
    DRUM_CHANNEL: 9  // Channel 10 in 1-based (9 in 0-based)
} as const;

// MIDI Value Ranges
export const MIDI_VALUES = {
    MIN: 0,
    MAX: 127,
    VELOCITY_DEFAULT: 64,
    PITCH_BEND_MIN: -8192,
    PITCH_BEND_MAX: 8191,
    PITCH_BEND_CENTER: 0
} as const;

// MIDI Message Types
export const MIDI_MESSAGES = {
    NOTE_OFF: 0x80,
    NOTE_ON: 0x90,
    AFTERTOUCH: 0xA0,
    CONTROL_CHANGE: 0xB0,
    PROGRAM_CHANGE: 0xC0,
    CHANNEL_PRESSURE: 0xD0,
    PITCH_BEND: 0xE0,
    SYSTEM_EXCLUSIVE: 0xF0
} as const;

// Common MIDI CC Numbers
export const MIDI_CC = {
    BANK_SELECT_MSB: 0,
    MODULATION_WHEEL: 1,
    BREATH_CONTROLLER: 2,
    FOOT_CONTROLLER: 4,
    PORTAMENTO_TIME: 5,
    DATA_ENTRY_MSB: 6,
    CHANNEL_VOLUME: 7,
    BALANCE: 8,
    PAN: 10,
    EXPRESSION: 11,
    EFFECT_CONTROL_1: 12,
    EFFECT_CONTROL_2: 13,
    SUSTAIN_PEDAL: 64,
    PORTAMENTO_ON_OFF: 65,
    SOSTENUTO_PEDAL: 66,
    SOFT_PEDAL: 67,
    LEGATO_FOOTSWITCH: 68,
    HOLD_2: 69,
    SOUND_CONTROLLER_1: 70,  // Sound Variation
    SOUND_CONTROLLER_2: 71,  // Timbre/Harmonic Content
    SOUND_CONTROLLER_3: 72,  // Release Time
    SOUND_CONTROLLER_4: 73,  // Attack Time
    SOUND_CONTROLLER_5: 74,  // Brightness
    SOUND_CONTROLLER_6: 75,  // Decay Time
    SOUND_CONTROLLER_7: 76,  // Vibrato Rate
    SOUND_CONTROLLER_8: 77,  // Vibrato Depth
    SOUND_CONTROLLER_9: 78,  // Vibrato Delay
    SOUND_CONTROLLER_10: 79, // Undefined
    GENERAL_PURPOSE_1: 80,
    GENERAL_PURPOSE_2: 81,
    GENERAL_PURPOSE_3: 82,
    GENERAL_PURPOSE_4: 83,
    PORTAMENTO_CONTROL: 84,
    REVERB_SEND: 91,
    TREMOLO_DEPTH: 92,
    CHORUS_SEND: 93,
    CELESTE_DEPTH: 94,
    PHASER_DEPTH: 95,
    DATA_INCREMENT: 96,
    DATA_DECREMENT: 97,
    NRPN_LSB: 98,
    NRPN_MSB: 99,
    RPN_LSB: 100,
    RPN_MSB: 101,
    ALL_SOUND_OFF: 120,
    RESET_ALL_CONTROLLERS: 121,
    LOCAL_CONTROL: 122,
    ALL_NOTES_OFF: 123,
    OMNI_MODE_OFF: 124,
    OMNI_MODE_ON: 125,
    MONO_MODE_ON: 126,
    POLY_MODE_ON: 127
} as const;

// Piano Key Layout
export const PIANO_LAYOUT = {
    WHITE_KEYS_PER_OCTAVE: 7,
    BLACK_KEYS_PER_OCTAVE: 5,
    TOTAL_KEYS_PER_OCTAVE: 12,
    NOTE_NAMES: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const,
    WHITE_KEY_PATTERN: [0, 2, 4, 5, 7, 9, 11] as const,
    BLACK_KEY_PATTERN: [1, 3, 6, 8, 10] as const
} as const;

// Input Timing Constants
export const INPUT_TIMING = {
    FAST_KEYPRESS_MS: 50,
    SLOW_KEYPRESS_MS: 200,
    GAMEPAD_POLL_MS: 16,  // ~60fps
    TOUCH_RADIUS_MAX: 30
} as const;

// Audio Constants
export const AUDIO_CONSTANTS = {
    SAMPLE_RATE_DEFAULT: 44100,
    BUFFER_SIZE_DEFAULT: 256,
    MAX_POLYPHONY: 32
} as const;

// UI Constants
export const UI_CONSTANTS = {
    KEYBOARD_WHITE_KEY_WIDTH: 40,
    KEYBOARD_WHITE_KEY_HEIGHT: 150,
    KEYBOARD_BLACK_KEY_WIDTH: 25,
    KEYBOARD_BLACK_KEY_HEIGHT: 100,
    KNOB_SIZE: 40,
    KNOB_ROTATION_RANGE: 270,  // degrees
    KNOB_MIN_ANGLE: -135,
    KNOB_MAX_ANGLE: 135
} as const;

// Type Guards
export const isValidMidiNote = (note: number): boolean => 
    note >= MIDI_NOTES.LOWEST_PIANO && note <= MIDI_NOTES.HIGHEST_PIANO;

export const isValidMidiValue = (value: number): boolean => 
    value >= MIDI_VALUES.MIN && value <= MIDI_VALUES.MAX;

export const isValidMidiChannel = (channel: number): boolean => 
    channel >= MIDI_CHANNELS.MIN && channel <= MIDI_CHANNELS.MAX;

export const isDrumChannel = (channel: number): boolean => 
    channel === MIDI_CHANNELS.DRUM_CHANNEL;

// Helper Functions
export const noteToOctave = (note: number): number => 
    Math.floor((note - 12) / MIDI_NOTES.OCTAVE_SIZE);

export const noteToNoteName = (note: number): string => {
    const noteIndex = note % MIDI_NOTES.OCTAVE_SIZE;
    
    // Type-safe check for white keys
    const whiteKeyPattern = PIANO_LAYOUT.WHITE_KEY_PATTERN as readonly number[];
    const whiteKeyIndex = whiteKeyPattern.indexOf(noteIndex);
    if (whiteKeyIndex >= 0) {
        const noteName = PIANO_LAYOUT.NOTE_NAMES[whiteKeyIndex];
        if (noteName) {
            return noteName;
        }
    }
    
    // Type-safe check for black keys
    const blackKeyPattern = PIANO_LAYOUT.BLACK_KEY_PATTERN as readonly number[];
    const blackKeyNames = ['C#', 'D#', 'F#', 'G#', 'A#'] as const;
    const blackKeyIndex = blackKeyPattern.indexOf(noteIndex);
    return (blackKeyIndex >= 0 && blackKeyNames[blackKeyIndex]) ? blackKeyNames[blackKeyIndex] : '?';
};

export const noteToFullName = (note: number): string => {
    const noteName = noteToNoteName(note);
    const octave = noteToOctave(note);
    return `${noteName}${octave}`;
};

// Type guards for MIDI validation
export const isValidMIDIValue = (value: number): value is number =>
    Number.isInteger(value) && value >= MIDI_VALUES.MIN && value <= MIDI_VALUES.MAX;

export const isValidMIDINote = (note: number): note is number =>
    Number.isInteger(note) && note >= MIDI_NOTES.LOWEST && note <= MIDI_NOTES.HIGHEST;

export const isValidMIDIChannel = (channel: number): channel is number =>
    Number.isInteger(channel) && channel >= 0 && channel <= 15;

export const isWhiteKey = (noteInOctave: number): boolean => {
    const whiteKeyPattern = PIANO_LAYOUT.WHITE_KEY_PATTERN as readonly number[];
    return whiteKeyPattern.includes(noteInOctave);
};

export const isBlackKey = (noteInOctave: number): boolean => {
    const blackKeyPattern = PIANO_LAYOUT.BLACK_KEY_PATTERN as readonly number[];
    return blackKeyPattern.includes(noteInOctave);
};

// Velocity Curve Functions
export const velocityCurves = {
    linear: (n: number): number => n,
    natural: (n: number): number => Math.sqrt(n),
    exponential: (n: number): number => n * n,
    logarithmic: (n: number): number => Math.log(n * 9 + 1) / Math.log(10),
    soft: (n: number): number => Math.pow(n, 1.5),
    hard: (n: number): number => Math.pow(n, 0.7)
} as const;

export type VelocityCurveName = keyof typeof velocityCurves;