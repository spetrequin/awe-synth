/**
 * Enhanced Input Types - Strict TypeScript interfaces
 * Part of AWE Player EMU8000 Emulator
 */

// Enhanced Touch interface with force/pressure support
export interface EnhancedTouch extends Touch {
    readonly force?: number;           // iOS Safari force touch
    readonly radiusX?: number;         // Touch area width  
    readonly radiusY?: number;         // Touch area height
    readonly rotationAngle?: number;   // Touch rotation
    readonly altitudeAngle?: number;   // Apple Pencil altitude
    readonly azimuthAngle?: number;    // Apple Pencil azimuth
}

// Enhanced TouchEvent with typed touches
export interface EnhancedTouchEvent extends TouchEvent {
    readonly touches: TouchList & {
        [index: number]: EnhancedTouch;
        item(index: number): EnhancedTouch | null;
    };
    readonly targetTouches: TouchList & {
        [index: number]: EnhancedTouch;
        item(index: number): EnhancedTouch | null;
    };
    readonly changedTouches: TouchList & {
        [index: number]: EnhancedTouch;
        item(index: number): EnhancedTouch | null;
    };
}

// Re-export unified MIDI types and constructors
export {
    MIDINoteNumber,
    MIDIVelocity,
    MIDIChannel,
    createMIDINoteNumber,
    createMIDIVelocity,
    createMIDIChannel,
    MIDIValidationError
} from './midi-types.js';

// Piano key types
export type PianoKeyType = 'white' | 'black';
export type OctaveNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type NoteInOctave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// Event handler types
export type InputEventHandler<T = Event> = (event: T) => void;
export type VelocityCalculationMethod = 'position' | 'pressure' | 'timing' | 'acceleration';

// Configuration validation
export interface TypedConfig<T> {
    readonly data: T;
    readonly version: string;
    readonly lastModified: Date;
}

// Enhanced MIDI input error with device-specific codes
export class MIDIInputError extends Error {
    constructor(
        message: string,
        public readonly code: 'INVALID_NOTE' | 'INVALID_VELOCITY' | 'INVALID_CHANNEL' | 'DEVICE_ERROR'
    ) {
        super(message);
        this.name = 'MIDIInputError';
    }
}

export class ConfigurationError extends Error {
    constructor(
        message: string,
        public readonly configName: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'ConfigurationError';
    }
}