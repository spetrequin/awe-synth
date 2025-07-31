/**
 * MIDI Constants and Definitions
 * Part of AWE Player EMU8000 Emulator
 */
export declare const MIDI_NOTES: {
    readonly LOWEST_PIANO: 21;
    readonly HIGHEST_PIANO: 108;
    readonly MIDDLE_C: 60;
    readonly OCTAVE_SIZE: 12;
};
export declare const MIDI_CHANNELS: {
    readonly MIN: 0;
    readonly MAX: 15;
    readonly DRUM_CHANNEL: 9;
};
export declare const MIDI_VALUES: {
    readonly MIN: 0;
    readonly MAX: 127;
    readonly VELOCITY_DEFAULT: 64;
    readonly PITCH_BEND_MIN: -8192;
    readonly PITCH_BEND_MAX: 8191;
    readonly PITCH_BEND_CENTER: 0;
};
export declare const MIDI_MESSAGES: {
    readonly NOTE_OFF: 128;
    readonly NOTE_ON: 144;
    readonly AFTERTOUCH: 160;
    readonly CONTROL_CHANGE: 176;
    readonly PROGRAM_CHANGE: 192;
    readonly CHANNEL_PRESSURE: 208;
    readonly PITCH_BEND: 224;
    readonly SYSTEM_EXCLUSIVE: 240;
};
export declare const MIDI_CC: {
    readonly BANK_SELECT_MSB: 0;
    readonly MODULATION_WHEEL: 1;
    readonly BREATH_CONTROLLER: 2;
    readonly FOOT_CONTROLLER: 4;
    readonly PORTAMENTO_TIME: 5;
    readonly DATA_ENTRY_MSB: 6;
    readonly CHANNEL_VOLUME: 7;
    readonly BALANCE: 8;
    readonly PAN: 10;
    readonly EXPRESSION: 11;
    readonly EFFECT_CONTROL_1: 12;
    readonly EFFECT_CONTROL_2: 13;
    readonly SUSTAIN_PEDAL: 64;
    readonly PORTAMENTO_ON_OFF: 65;
    readonly SOSTENUTO_PEDAL: 66;
    readonly SOFT_PEDAL: 67;
    readonly LEGATO_FOOTSWITCH: 68;
    readonly HOLD_2: 69;
    readonly SOUND_CONTROLLER_1: 70;
    readonly SOUND_CONTROLLER_2: 71;
    readonly SOUND_CONTROLLER_3: 72;
    readonly SOUND_CONTROLLER_4: 73;
    readonly SOUND_CONTROLLER_5: 74;
    readonly SOUND_CONTROLLER_6: 75;
    readonly SOUND_CONTROLLER_7: 76;
    readonly SOUND_CONTROLLER_8: 77;
    readonly SOUND_CONTROLLER_9: 78;
    readonly SOUND_CONTROLLER_10: 79;
    readonly GENERAL_PURPOSE_1: 80;
    readonly GENERAL_PURPOSE_2: 81;
    readonly GENERAL_PURPOSE_3: 82;
    readonly GENERAL_PURPOSE_4: 83;
    readonly PORTAMENTO_CONTROL: 84;
    readonly REVERB_SEND: 91;
    readonly TREMOLO_DEPTH: 92;
    readonly CHORUS_SEND: 93;
    readonly CELESTE_DEPTH: 94;
    readonly PHASER_DEPTH: 95;
    readonly DATA_INCREMENT: 96;
    readonly DATA_DECREMENT: 97;
    readonly NRPN_LSB: 98;
    readonly NRPN_MSB: 99;
    readonly RPN_LSB: 100;
    readonly RPN_MSB: 101;
    readonly ALL_SOUND_OFF: 120;
    readonly RESET_ALL_CONTROLLERS: 121;
    readonly LOCAL_CONTROL: 122;
    readonly ALL_NOTES_OFF: 123;
    readonly OMNI_MODE_OFF: 124;
    readonly OMNI_MODE_ON: 125;
    readonly MONO_MODE_ON: 126;
    readonly POLY_MODE_ON: 127;
};
export declare const PIANO_LAYOUT: {
    readonly WHITE_KEYS_PER_OCTAVE: 7;
    readonly BLACK_KEYS_PER_OCTAVE: 5;
    readonly TOTAL_KEYS_PER_OCTAVE: 12;
    readonly NOTE_NAMES: readonly ["C", "D", "E", "F", "G", "A", "B"];
    readonly WHITE_KEY_PATTERN: readonly [0, 2, 4, 5, 7, 9, 11];
    readonly BLACK_KEY_PATTERN: readonly [1, 3, 6, 8, 10];
};
export declare const INPUT_TIMING: {
    readonly FAST_KEYPRESS_MS: 50;
    readonly SLOW_KEYPRESS_MS: 200;
    readonly GAMEPAD_POLL_MS: 16;
    readonly TOUCH_RADIUS_MAX: 30;
};
export declare const AUDIO_CONSTANTS: {
    readonly SAMPLE_RATE_DEFAULT: 44100;
    readonly BUFFER_SIZE_DEFAULT: 256;
    readonly MAX_POLYPHONY: 32;
};
export declare const UI_CONSTANTS: {
    readonly KEYBOARD_WHITE_KEY_WIDTH: 40;
    readonly KEYBOARD_WHITE_KEY_HEIGHT: 150;
    readonly KEYBOARD_BLACK_KEY_WIDTH: 25;
    readonly KEYBOARD_BLACK_KEY_HEIGHT: 100;
    readonly KNOB_SIZE: 40;
    readonly KNOB_ROTATION_RANGE: 270;
    readonly KNOB_MIN_ANGLE: -135;
    readonly KNOB_MAX_ANGLE: 135;
    readonly VISUAL_FEEDBACK_DURATION_MS: 200;
    readonly DRUM_TRIGGER_DURATION_MS: 150;
    readonly KEY_VISUAL_PRESSED_DURATION_MS: 100;
    readonly GRID_MIN_COLUMN_WIDTH_STANDARD: 200;
    readonly GRID_MIN_COLUMN_WIDTH_CONTROLS: 120;
    readonly GRID_MIN_COLUMN_WIDTH_PRESETS: 100;
    readonly GRID_MIN_COLUMN_WIDTH_INSTRUMENTS: 280;
};
export declare const isValidMidiNote: (note: number) => boolean;
export declare const isValidMidiValue: (value: number) => boolean;
export declare const isValidMidiChannel: (channel: number) => boolean;
export declare const isDrumChannel: (channel: number) => boolean;
export declare const noteToOctave: (note: number) => number;
export declare const noteToNoteName: (note: number) => string;
export declare const noteToFullName: (note: number) => string;
export { isValidMIDICCValue as isValidMIDIValue, isValidMIDINote, isValidMIDIChannel, isValidMIDIVelocity, isValidMIDIPitchBend, isValidMIDIProgram, createMIDINoteNumber, createMIDIVelocity, createMIDIChannel, createMIDICCValue, createMIDIPitchBend, createMIDIProgram, clampToMIDINoteRange, clampToMIDIVelocityRange, clampToMIDIChannelRange, clampToMIDICCRange, MIDIValidationError, MIDI_RANGES } from './types/midi-types.js';
export { isWhiteKey, isBlackKey } from './types/midi-types.js';
//# sourceMappingURL=midi-constants.d.ts.map