/**
 * Enhanced Input Types - Strict TypeScript interfaces
 * Part of AWE Player EMU8000 Emulator
 */
export interface EnhancedTouch extends Touch {
    readonly force: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly rotationAngle: number;
    readonly altitudeAngle?: number;
    readonly azimuthAngle?: number;
}
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
export { MIDINoteNumber, MIDIVelocity, MIDIChannel, createMIDINoteNumber, createMIDIVelocity, createMIDIChannel, MIDIValidationError } from './midi-types.js';
export type PianoKeyType = 'white' | 'black';
export type OctaveNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type NoteInOctave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type InputEventHandler<T = Event> = (event: T) => void;
export type VelocityCalculationMethod = 'position' | 'pressure' | 'timing' | 'acceleration';
export interface TypedConfig<T> {
    readonly data: T;
    readonly version: string;
    readonly lastModified: Date;
}
export declare class MIDIInputError extends Error {
    readonly code: 'INVALID_NOTE' | 'INVALID_VELOCITY' | 'INVALID_CHANNEL' | 'DEVICE_ERROR';
    constructor(message: string, code: 'INVALID_NOTE' | 'INVALID_VELOCITY' | 'INVALID_CHANNEL' | 'DEVICE_ERROR');
}
export declare class ConfigurationError extends Error {
    readonly configName: string;
    readonly originalError?: Error | undefined;
    constructor(message: string, configName: string, originalError?: Error | undefined);
}
//# sourceMappingURL=input-types.d.ts.map