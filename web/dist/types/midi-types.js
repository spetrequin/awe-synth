/**
 * Unified MIDI Type System and Validation
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides centralized MIDI type definitions, branded types, and validation
 * with comprehensive error handling and type safety.
 */
// ===== MIDI VALUE RANGES =====
export const MIDI_RANGES = {
    NOTE: { MIN: 0, MAX: 127 },
    VELOCITY: { MIN: 0, MAX: 127 },
    CHANNEL: { MIN: 0, MAX: 15 },
    CC_VALUE: { MIN: 0, MAX: 127 },
    PITCH_BEND: { MIN: -8192, MAX: 8191, CENTER: 0 },
    PROGRAM: { MIN: 0, MAX: 127 },
    // Piano-specific ranges (88-key piano)
    PIANO_NOTE: { MIN: 21, MAX: 108 }, // A0 to C8
    // Common MIDI ranges
    OCTAVE: { MIN: -1, MAX: 9 },
    NOTE_IN_OCTAVE: { MIN: 0, MAX: 11 }
};
// ===== VALIDATION FUNCTIONS (TYPE GUARDS) =====
/**
 * Validate MIDI note number (0-127)
 */
export const isValidMIDINote = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.NOTE.MIN &&
        value <= MIDI_RANGES.NOTE.MAX;
};
/**
 * Validate MIDI velocity (0-127)
 */
export const isValidMIDIVelocity = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.VELOCITY.MIN &&
        value <= MIDI_RANGES.VELOCITY.MAX;
};
/**
 * Validate MIDI channel (0-15)
 */
export const isValidMIDIChannel = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.CHANNEL.MIN &&
        value <= MIDI_RANGES.CHANNEL.MAX;
};
/**
 * Validate MIDI CC value (0-127)
 */
export const isValidMIDICCValue = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.CC_VALUE.MIN &&
        value <= MIDI_RANGES.CC_VALUE.MAX;
};
/**
 * Validate MIDI pitch bend (-8192 to 8191)
 */
export const isValidMIDIPitchBend = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.PITCH_BEND.MIN &&
        value <= MIDI_RANGES.PITCH_BEND.MAX;
};
/**
 * Validate MIDI program number (0-127)
 */
export const isValidMIDIProgram = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.PROGRAM.MIN &&
        value <= MIDI_RANGES.PROGRAM.MAX;
};
/**
 * Validate piano note number (21-108, 88-key piano range)
 */
export const isValidPianoNote = (value) => {
    return isValidMIDINote(value) &&
        value >= MIDI_RANGES.PIANO_NOTE.MIN &&
        value <= MIDI_RANGES.PIANO_NOTE.MAX;
};
/**
 * Validate octave number (-1 to 9)
 */
export const isValidOctave = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.OCTAVE.MIN &&
        value <= MIDI_RANGES.OCTAVE.MAX;
};
/**
 * Validate note within octave (0-11)
 */
export const isValidNoteInOctave = (value) => {
    return Number.isInteger(value) &&
        value >= MIDI_RANGES.NOTE_IN_OCTAVE.MIN &&
        value <= MIDI_RANGES.NOTE_IN_OCTAVE.MAX;
};
// ===== SAFE CONSTRUCTORS =====
/**
 * Safely create a MIDI note number with validation
 */
export const createMIDINoteNumber = (value) => {
    if (!isValidMIDINote(value)) {
        throw new MIDIValidationError(`Invalid MIDI note number: ${value}. Must be ${MIDI_RANGES.NOTE.MIN}-${MIDI_RANGES.NOTE.MAX}.`, 'INVALID_NOTE', value);
    }
    return value;
};
/**
 * Safely create a MIDI velocity with validation
 */
export const createMIDIVelocity = (value) => {
    if (!isValidMIDIVelocity(value)) {
        throw new MIDIValidationError(`Invalid MIDI velocity: ${value}. Must be ${MIDI_RANGES.VELOCITY.MIN}-${MIDI_RANGES.VELOCITY.MAX}.`, 'INVALID_VELOCITY', value);
    }
    return value;
};
/**
 * Safely create a MIDI channel with validation
 */
export const createMIDIChannel = (value) => {
    if (!isValidMIDIChannel(value)) {
        throw new MIDIValidationError(`Invalid MIDI channel: ${value}. Must be ${MIDI_RANGES.CHANNEL.MIN}-${MIDI_RANGES.CHANNEL.MAX}.`, 'INVALID_CHANNEL', value);
    }
    return value;
};
/**
 * Safely create a MIDI CC value with validation
 */
export const createMIDICCValue = (value) => {
    if (!isValidMIDICCValue(value)) {
        throw new MIDIValidationError(`Invalid MIDI CC value: ${value}. Must be ${MIDI_RANGES.CC_VALUE.MIN}-${MIDI_RANGES.CC_VALUE.MAX}.`, 'INVALID_CC_VALUE', value);
    }
    return value;
};
/**
 * Safely create a MIDI pitch bend value with validation
 */
export const createMIDIPitchBend = (value) => {
    if (!isValidMIDIPitchBend(value)) {
        throw new MIDIValidationError(`Invalid MIDI pitch bend: ${value}. Must be ${MIDI_RANGES.PITCH_BEND.MIN}-${MIDI_RANGES.PITCH_BEND.MAX}.`, 'INVALID_PITCH_BEND', value);
    }
    return value;
};
/**
 * Safely create a MIDI program number with validation
 */
export const createMIDIProgram = (value) => {
    if (!isValidMIDIProgram(value)) {
        throw new MIDIValidationError(`Invalid MIDI program: ${value}. Must be ${MIDI_RANGES.PROGRAM.MIN}-${MIDI_RANGES.PROGRAM.MAX}.`, 'INVALID_PROGRAM', value);
    }
    return value;
};
/**
 * Safely create a piano note number with validation
 */
export const createPianoNoteNumber = (value) => {
    if (!isValidPianoNote(value)) {
        throw new MIDIValidationError(`Invalid piano note: ${value}. Must be ${MIDI_RANGES.PIANO_NOTE.MIN}-${MIDI_RANGES.PIANO_NOTE.MAX} (88-key piano range).`, 'INVALID_PIANO_NOTE', value);
    }
    return value;
};
// ===== CLAMPING FUNCTIONS =====
/**
 * Clamp value to valid MIDI note range
 */
export const clampToMIDINoteRange = (value) => {
    const clamped = Math.max(MIDI_RANGES.NOTE.MIN, Math.min(MIDI_RANGES.NOTE.MAX, Math.round(value)));
    return clamped;
};
/**
 * Clamp value to valid MIDI velocity range
 */
export const clampToMIDIVelocityRange = (value) => {
    const clamped = Math.max(MIDI_RANGES.VELOCITY.MIN, Math.min(MIDI_RANGES.VELOCITY.MAX, Math.round(value)));
    return clamped;
};
/**
 * Clamp value to valid MIDI channel range
 */
export const clampToMIDIChannelRange = (value) => {
    const clamped = Math.max(MIDI_RANGES.CHANNEL.MIN, Math.min(MIDI_RANGES.CHANNEL.MAX, Math.round(value)));
    return clamped;
};
/**
 * Clamp value to valid MIDI CC range
 */
export const clampToMIDICCRange = (value) => {
    const clamped = Math.max(MIDI_RANGES.CC_VALUE.MIN, Math.min(MIDI_RANGES.CC_VALUE.MAX, Math.round(value)));
    return clamped;
};
// ===== ERROR TYPES =====
export class MIDIValidationError extends Error {
    code;
    invalidValue;
    constructor(message, code, invalidValue) {
        super(message);
        this.code = code;
        this.invalidValue = invalidValue;
        this.name = 'MIDIValidationError';
    }
}
// ===== UTILITY FUNCTIONS =====
/**
 * Convert MIDI note to octave and note within octave
 */
export const midiNoteToOctaveAndNote = (midiNote) => {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteInOctave = midiNote % 12;
    if (!isValidOctave(octave) || !isValidNoteInOctave(noteInOctave)) {
        throw new MIDIValidationError(`Invalid MIDI note conversion: ${midiNote} -> octave ${octave}, note ${noteInOctave}`, 'INVALID_NOTE', midiNote);
    }
    return {
        octave: octave,
        noteInOctave: noteInOctave
    };
};
/**
 * Convert octave and note within octave to MIDI note
 */
export const octaveAndNoteToMidiNote = (octave, noteInOctave) => {
    const midiNote = (octave + 1) * 12 + noteInOctave;
    return createMIDINoteNumber(midiNote);
};
/**
 * Check if a MIDI note represents a white key on piano
 */
export const isWhiteKey = (noteInOctave) => {
    const whiteKeyPattern = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
    return whiteKeyPattern.includes(noteInOctave);
};
/**
 * Check if a MIDI note represents a black key on piano
 */
export const isBlackKey = (noteInOctave) => {
    const blackKeyPattern = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
    return blackKeyPattern.includes(noteInOctave);
};
// ===== LEGACY COMPATIBILITY =====
// Maintain compatibility with existing code
export const isValidMIDIValue = isValidMIDICCValue; // Alias for CC values
//# sourceMappingURL=midi-types.js.map