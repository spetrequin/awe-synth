/**
 * Unified MIDI Type System and Validation
 * Part of AWE Player EMU8000 Emulator
 * 
 * Provides centralized MIDI type definitions, branded types, and validation
 * with comprehensive error handling and type safety.
 */

// ===== MIDI VALUE RANGES =====

export const MIDI_RANGES = {
    NOTE: { MIN: 0, MAX: 127 } as const,
    VELOCITY: { MIN: 0, MAX: 127 } as const,
    CHANNEL: { MIN: 0, MAX: 15 } as const,
    CC_VALUE: { MIN: 0, MAX: 127 } as const,
    PITCH_BEND: { MIN: -8192, MAX: 8191, CENTER: 0 } as const,
    PROGRAM: { MIN: 0, MAX: 127 } as const,
    
    // Piano-specific ranges (88-key piano)
    PIANO_NOTE: { MIN: 21, MAX: 108 } as const, // A0 to C8
    
    // Common MIDI ranges
    OCTAVE: { MIN: -1, MAX: 9 } as const,
    NOTE_IN_OCTAVE: { MIN: 0, MAX: 11 } as const
} as const;

// ===== BRANDED TYPES =====

export type MIDINoteNumber = number & { readonly __brand: 'MIDINoteNumber' };
export type MIDIVelocity = number & { readonly __brand: 'MIDIVelocity' };
export type MIDIChannel = number & { readonly __brand: 'MIDIChannel' };
export type MIDICCValue = number & { readonly __brand: 'MIDICCValue' };
export type MIDIPitchBend = number & { readonly __brand: 'MIDIPitchBend' };
export type MIDIProgram = number & { readonly __brand: 'MIDIProgram' };

// Piano-specific types
export type PianoNoteNumber = MIDINoteNumber & { readonly __pianoBrand: true };
export type OctaveNumber = number & { readonly __brand: 'OctaveNumber' };
export type NoteInOctave = number & { readonly __brand: 'NoteInOctave' };

// ===== VALIDATION FUNCTIONS (TYPE GUARDS) =====

/**
 * Validate MIDI note number (0-127)
 */
export const isValidMIDINote = (value: number): value is MIDINoteNumber => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.NOTE.MIN && 
           value <= MIDI_RANGES.NOTE.MAX;
};

/**
 * Validate MIDI velocity (0-127)
 */
export const isValidMIDIVelocity = (value: number): value is MIDIVelocity => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.VELOCITY.MIN && 
           value <= MIDI_RANGES.VELOCITY.MAX;
};

/**
 * Validate MIDI channel (0-15)
 */
export const isValidMIDIChannel = (value: number): value is MIDIChannel => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.CHANNEL.MIN && 
           value <= MIDI_RANGES.CHANNEL.MAX;
};

/**
 * Validate MIDI CC value (0-127)
 */
export const isValidMIDICCValue = (value: number): value is MIDICCValue => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.CC_VALUE.MIN && 
           value <= MIDI_RANGES.CC_VALUE.MAX;
};

/**
 * Validate MIDI pitch bend (-8192 to 8191)
 */
export const isValidMIDIPitchBend = (value: number): value is MIDIPitchBend => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.PITCH_BEND.MIN && 
           value <= MIDI_RANGES.PITCH_BEND.MAX;
};

/**
 * Validate MIDI program number (0-127)
 */
export const isValidMIDIProgram = (value: number): value is MIDIProgram => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.PROGRAM.MIN && 
           value <= MIDI_RANGES.PROGRAM.MAX;
};

/**
 * Validate piano note number (21-108, 88-key piano range)
 */
export const isValidPianoNote = (value: number): value is PianoNoteNumber => {
    return isValidMIDINote(value) && 
           value >= MIDI_RANGES.PIANO_NOTE.MIN && 
           value <= MIDI_RANGES.PIANO_NOTE.MAX;
};

/**
 * Validate octave number (-1 to 9)
 */
export const isValidOctave = (value: number): value is OctaveNumber => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.OCTAVE.MIN && 
           value <= MIDI_RANGES.OCTAVE.MAX;
};

/**
 * Validate note within octave (0-11)
 */
export const isValidNoteInOctave = (value: number): value is NoteInOctave => {
    return Number.isInteger(value) && 
           value >= MIDI_RANGES.NOTE_IN_OCTAVE.MIN && 
           value <= MIDI_RANGES.NOTE_IN_OCTAVE.MAX;
};

// ===== SAFE CONSTRUCTORS =====

/**
 * Safely create a MIDI note number with validation
 */
export const createMIDINoteNumber = (value: number): MIDINoteNumber => {
    if (!isValidMIDINote(value)) {
        throw new MIDIValidationError(
            `Invalid MIDI note number: ${value}. Must be ${MIDI_RANGES.NOTE.MIN}-${MIDI_RANGES.NOTE.MAX}.`,
            'INVALID_NOTE',
            value
        );
    }
    return value as MIDINoteNumber;
};

/**
 * Safely create a MIDI velocity with validation
 */
export const createMIDIVelocity = (value: number): MIDIVelocity => {
    if (!isValidMIDIVelocity(value)) {
        throw new MIDIValidationError(
            `Invalid MIDI velocity: ${value}. Must be ${MIDI_RANGES.VELOCITY.MIN}-${MIDI_RANGES.VELOCITY.MAX}.`,
            'INVALID_VELOCITY',
            value
        );
    }
    return value as MIDIVelocity;
};

/**
 * Safely create a MIDI channel with validation
 */
export const createMIDIChannel = (value: number): MIDIChannel => {
    if (!isValidMIDIChannel(value)) {
        throw new MIDIValidationError(
            `Invalid MIDI channel: ${value}. Must be ${MIDI_RANGES.CHANNEL.MIN}-${MIDI_RANGES.CHANNEL.MAX}.`,
            'INVALID_CHANNEL',
            value
        );
    }
    return value as MIDIChannel;
};

/**
 * Safely create a MIDI CC value with validation
 */
export const createMIDICCValue = (value: number): MIDICCValue => {
    if (!isValidMIDICCValue(value)) {
        throw new MIDIValidationError(
            `Invalid MIDI CC value: ${value}. Must be ${MIDI_RANGES.CC_VALUE.MIN}-${MIDI_RANGES.CC_VALUE.MAX}.`,
            'INVALID_CC_VALUE',
            value
        );
    }
    return value as MIDICCValue;
};

/**
 * Safely create a MIDI pitch bend value with validation
 */
export const createMIDIPitchBend = (value: number): MIDIPitchBend => {
    if (!isValidMIDIPitchBend(value)) {
        throw new MIDIValidationError(
            `Invalid MIDI pitch bend: ${value}. Must be ${MIDI_RANGES.PITCH_BEND.MIN}-${MIDI_RANGES.PITCH_BEND.MAX}.`,
            'INVALID_PITCH_BEND',
            value
        );
    }
    return value as MIDIPitchBend;
};

/**
 * Safely create a MIDI program number with validation
 */
export const createMIDIProgram = (value: number): MIDIProgram => {
    if (!isValidMIDIProgram(value)) {
        throw new MIDIValidationError(
            `Invalid MIDI program: ${value}. Must be ${MIDI_RANGES.PROGRAM.MIN}-${MIDI_RANGES.PROGRAM.MAX}.`,
            'INVALID_PROGRAM',
            value
        );
    }
    return value as MIDIProgram;
};

/**
 * Safely create a piano note number with validation
 */
export const createPianoNoteNumber = (value: number): PianoNoteNumber => {
    if (!isValidPianoNote(value)) {
        throw new MIDIValidationError(
            `Invalid piano note: ${value}. Must be ${MIDI_RANGES.PIANO_NOTE.MIN}-${MIDI_RANGES.PIANO_NOTE.MAX} (88-key piano range).`,
            'INVALID_PIANO_NOTE',
            value
        );
    }
    return value as PianoNoteNumber;
};

// ===== CLAMPING FUNCTIONS =====

/**
 * Clamp value to valid MIDI note range
 */
export const clampToMIDINoteRange = (value: number): MIDINoteNumber => {
    const clamped = Math.max(MIDI_RANGES.NOTE.MIN, Math.min(MIDI_RANGES.NOTE.MAX, Math.round(value)));
    return clamped as MIDINoteNumber;
};

/**
 * Clamp value to valid MIDI velocity range
 */
export const clampToMIDIVelocityRange = (value: number): MIDIVelocity => {
    const clamped = Math.max(MIDI_RANGES.VELOCITY.MIN, Math.min(MIDI_RANGES.VELOCITY.MAX, Math.round(value)));
    return clamped as MIDIVelocity;
};

/**
 * Clamp value to valid MIDI channel range
 */
export const clampToMIDIChannelRange = (value: number): MIDIChannel => {
    const clamped = Math.max(MIDI_RANGES.CHANNEL.MIN, Math.min(MIDI_RANGES.CHANNEL.MAX, Math.round(value)));
    return clamped as MIDIChannel;
};

/**
 * Clamp value to valid MIDI CC range
 */
export const clampToMIDICCRange = (value: number): MIDICCValue => {
    const clamped = Math.max(MIDI_RANGES.CC_VALUE.MIN, Math.min(MIDI_RANGES.CC_VALUE.MAX, Math.round(value)));
    return clamped as MIDICCValue;
};

// ===== ERROR TYPES =====

export class MIDIValidationError extends Error {
    constructor(
        message: string,
        public readonly code: 'INVALID_NOTE' | 'INVALID_VELOCITY' | 'INVALID_CHANNEL' | 
                              'INVALID_CC_VALUE' | 'INVALID_PITCH_BEND' | 'INVALID_PROGRAM' | 
                              'INVALID_PIANO_NOTE' | 'INVALID_OCTAVE' | 'INVALID_NOTE_IN_OCTAVE',
        public readonly invalidValue: number
    ) {
        super(message);
        this.name = 'MIDIValidationError';
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Convert MIDI note to octave and note within octave
 */
export const midiNoteToOctaveAndNote = (midiNote: MIDINoteNumber): { octave: OctaveNumber; noteInOctave: NoteInOctave } => {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteInOctave = midiNote % 12;
    
    if (!isValidOctave(octave) || !isValidNoteInOctave(noteInOctave)) {
        throw new MIDIValidationError(
            `Invalid MIDI note conversion: ${midiNote} -> octave ${octave}, note ${noteInOctave}`,
            'INVALID_NOTE',
            midiNote
        );
    }
    
    return { 
        octave: octave as OctaveNumber, 
        noteInOctave: noteInOctave as NoteInOctave 
    };
};

/**
 * Convert octave and note within octave to MIDI note
 */
export const octaveAndNoteToMidiNote = (octave: OctaveNumber, noteInOctave: NoteInOctave): MIDINoteNumber => {
    const midiNote = (octave + 1) * 12 + noteInOctave;
    return createMIDINoteNumber(midiNote);
};

/**
 * Check if a MIDI note represents a white key on piano
 */
export const isWhiteKey = (noteInOctave: NoteInOctave): boolean => {
    const whiteKeyPattern = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
    return whiteKeyPattern.includes(noteInOctave);
};

/**
 * Check if a MIDI note represents a black key on piano
 */
export const isBlackKey = (noteInOctave: NoteInOctave): boolean => {
    const blackKeyPattern = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
    return blackKeyPattern.includes(noteInOctave);
};

// ===== LEGACY COMPATIBILITY =====

// Maintain compatibility with existing code
export const isValidMIDIValue = isValidMIDICCValue;  // Alias for CC values