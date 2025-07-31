/**
 * Unified MIDI Type System and Validation
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides centralized MIDI type definitions, branded types, and validation
 * with comprehensive error handling and type safety.
 */
export declare const MIDI_RANGES: {
    readonly NOTE: {
        readonly MIN: 0;
        readonly MAX: 127;
    };
    readonly VELOCITY: {
        readonly MIN: 0;
        readonly MAX: 127;
    };
    readonly CHANNEL: {
        readonly MIN: 0;
        readonly MAX: 15;
    };
    readonly CC_VALUE: {
        readonly MIN: 0;
        readonly MAX: 127;
    };
    readonly PITCH_BEND: {
        readonly MIN: -8192;
        readonly MAX: 8191;
        readonly CENTER: 0;
    };
    readonly PROGRAM: {
        readonly MIN: 0;
        readonly MAX: 127;
    };
    readonly PIANO_NOTE: {
        readonly MIN: 21;
        readonly MAX: 108;
    };
    readonly OCTAVE: {
        readonly MIN: -1;
        readonly MAX: 9;
    };
    readonly NOTE_IN_OCTAVE: {
        readonly MIN: 0;
        readonly MAX: 11;
    };
};
export type MIDINoteNumber = number & {
    readonly __brand: 'MIDINoteNumber';
};
export type MIDIVelocity = number & {
    readonly __brand: 'MIDIVelocity';
};
export type MIDIChannel = number & {
    readonly __brand: 'MIDIChannel';
};
export type MIDICCValue = number & {
    readonly __brand: 'MIDICCValue';
};
export type MIDIPitchBend = number & {
    readonly __brand: 'MIDIPitchBend';
};
export type MIDIProgram = number & {
    readonly __brand: 'MIDIProgram';
};
export type PianoNoteNumber = MIDINoteNumber & {
    readonly __pianoBrand: true;
};
export type OctaveNumber = number & {
    readonly __brand: 'OctaveNumber';
};
export type NoteInOctave = number & {
    readonly __brand: 'NoteInOctave';
};
/**
 * Validate MIDI note number (0-127)
 */
export declare const isValidMIDINote: (value: number) => value is MIDINoteNumber;
/**
 * Validate MIDI velocity (0-127)
 */
export declare const isValidMIDIVelocity: (value: number) => value is MIDIVelocity;
/**
 * Validate MIDI channel (0-15)
 */
export declare const isValidMIDIChannel: (value: number) => value is MIDIChannel;
/**
 * Validate MIDI CC value (0-127)
 */
export declare const isValidMIDICCValue: (value: number) => value is MIDICCValue;
/**
 * Validate MIDI pitch bend (-8192 to 8191)
 */
export declare const isValidMIDIPitchBend: (value: number) => value is MIDIPitchBend;
/**
 * Validate MIDI program number (0-127)
 */
export declare const isValidMIDIProgram: (value: number) => value is MIDIProgram;
/**
 * Validate piano note number (21-108, 88-key piano range)
 */
export declare const isValidPianoNote: (value: number) => value is PianoNoteNumber;
/**
 * Validate octave number (-1 to 9)
 */
export declare const isValidOctave: (value: number) => value is OctaveNumber;
/**
 * Validate note within octave (0-11)
 */
export declare const isValidNoteInOctave: (value: number) => value is NoteInOctave;
/**
 * Safely create a MIDI note number with validation
 */
export declare const createMIDINoteNumber: (value: number) => MIDINoteNumber;
/**
 * Safely create a MIDI velocity with validation
 */
export declare const createMIDIVelocity: (value: number) => MIDIVelocity;
/**
 * Safely create a MIDI channel with validation
 */
export declare const createMIDIChannel: (value: number) => MIDIChannel;
/**
 * Safely create a MIDI CC value with validation
 */
export declare const createMIDICCValue: (value: number) => MIDICCValue;
/**
 * Safely create a MIDI pitch bend value with validation
 */
export declare const createMIDIPitchBend: (value: number) => MIDIPitchBend;
/**
 * Safely create a MIDI program number with validation
 */
export declare const createMIDIProgram: (value: number) => MIDIProgram;
/**
 * Safely create a piano note number with validation
 */
export declare const createPianoNoteNumber: (value: number) => PianoNoteNumber;
/**
 * Clamp value to valid MIDI note range
 */
export declare const clampToMIDINoteRange: (value: number) => MIDINoteNumber;
/**
 * Clamp value to valid MIDI velocity range
 */
export declare const clampToMIDIVelocityRange: (value: number) => MIDIVelocity;
/**
 * Clamp value to valid MIDI channel range
 */
export declare const clampToMIDIChannelRange: (value: number) => MIDIChannel;
/**
 * Clamp value to valid MIDI CC range
 */
export declare const clampToMIDICCRange: (value: number) => MIDICCValue;
export declare class MIDIValidationError extends Error {
    readonly code: 'INVALID_NOTE' | 'INVALID_VELOCITY' | 'INVALID_CHANNEL' | 'INVALID_CC_VALUE' | 'INVALID_PITCH_BEND' | 'INVALID_PROGRAM' | 'INVALID_PIANO_NOTE' | 'INVALID_OCTAVE' | 'INVALID_NOTE_IN_OCTAVE';
    readonly invalidValue: number;
    constructor(message: string, code: 'INVALID_NOTE' | 'INVALID_VELOCITY' | 'INVALID_CHANNEL' | 'INVALID_CC_VALUE' | 'INVALID_PITCH_BEND' | 'INVALID_PROGRAM' | 'INVALID_PIANO_NOTE' | 'INVALID_OCTAVE' | 'INVALID_NOTE_IN_OCTAVE', invalidValue: number);
}
/**
 * Convert MIDI note to octave and note within octave
 */
export declare const midiNoteToOctaveAndNote: (midiNote: MIDINoteNumber) => {
    octave: OctaveNumber;
    noteInOctave: NoteInOctave;
};
/**
 * Convert octave and note within octave to MIDI note
 */
export declare const octaveAndNoteToMidiNote: (octave: OctaveNumber, noteInOctave: NoteInOctave) => MIDINoteNumber;
/**
 * Check if a MIDI note represents a white key on piano
 */
export declare const isWhiteKey: (noteInOctave: NoteInOctave) => boolean;
/**
 * Check if a MIDI note represents a black key on piano
 */
export declare const isBlackKey: (noteInOctave: NoteInOctave) => boolean;
export declare const isValidMIDIValue: (value: number) => value is MIDICCValue;
//# sourceMappingURL=midi-types.d.ts.map