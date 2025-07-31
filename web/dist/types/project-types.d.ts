/**
 * Project-wide Type Definitions - Complete typing system
 * Part of AWE Player EMU8000 Emulator
 */
export * from './input-types.js';
export interface AudioProcessorConfig {
    readonly sampleRate: number;
    readonly bufferSize: number;
    readonly channels: number;
}
export interface VoiceState {
    readonly isActive: boolean;
    readonly noteNumber: number;
    readonly velocity: number;
    readonly channel: number;
    readonly timestamp: number;
}
export interface SynthParameters {
    readonly attack: number;
    readonly decay: number;
    readonly sustain: number;
    readonly release: number;
    readonly cutoff: number;
    readonly resonance: number;
    readonly volume: number;
    readonly pan: number;
}
export interface ComponentConfig {
    readonly containerId: string;
    readonly className?: string;
    readonly initialValues?: Record<string, unknown>;
}
export interface KeyboardKey {
    readonly noteNumber: number;
    readonly keyType: 'white' | 'black';
    readonly isPressed: boolean;
    readonly element?: HTMLElement;
}
export interface MIDIEvent {
    readonly type: 'noteOn' | 'noteOff' | 'controlChange' | 'programChange' | 'pitchBend';
    readonly channel: number;
    readonly data1: number;
    readonly data2?: number;
    readonly timestamp: number;
}
export interface KeyboardEvent {
    readonly type: 'keyPress' | 'keyRelease';
    readonly noteNumber: number;
    readonly velocity: number;
    readonly source: 'mouse' | 'touch' | 'keyboard' | 'gamepad';
    readonly timestamp: number;
}
export interface ConfigMetadata {
    readonly name: string;
    readonly version: string;
    readonly description?: string;
    readonly author?: string;
    readonly lastModified: Date;
}
export interface ValidatedConfig<T> {
    readonly data: T;
    readonly metadata: ConfigMetadata;
    readonly isValid: boolean;
    readonly errors?: string[];
}
export type ErrorCode = 'INVALID_MIDI_DATA' | 'AUDIO_CONTEXT_ERROR' | 'CONFIG_LOAD_ERROR' | 'INPUT_HANDLER_ERROR' | 'SYNTHESIS_ERROR' | 'RESOURCE_NOT_FOUND';
export interface ProjectError {
    readonly code: ErrorCode;
    readonly message: string;
    readonly context?: Record<string, unknown>;
    readonly timestamp: Date;
    readonly stack?: string;
}
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
export type NonEmptyArray<T> = [T, ...T[]];
export type Awaitable<T> = T | Promise<T>;
export declare const isAudioProcessorConfig: (obj: unknown) => obj is AudioProcessorConfig;
export declare const isMIDIEvent: (obj: unknown) => obj is MIDIEvent;
export declare const isKeyboardEvent: (obj: unknown) => obj is KeyboardEvent;
export type Milliseconds = number & {
    readonly __brand: 'Milliseconds';
};
export type Seconds = number & {
    readonly __brand: 'Seconds';
};
export type Hertz = number & {
    readonly __brand: 'Hertz';
};
export type Decibels = number & {
    readonly __brand: 'Decibels';
};
export type Percentage = number & {
    readonly __brand: 'Percentage';
};
export declare const createMilliseconds: (value: number) => Milliseconds;
export declare const createSeconds: (value: number) => Seconds;
export declare const createHertz: (value: number) => Hertz;
export declare const createPercentage: (value: number) => Percentage;
//# sourceMappingURL=project-types.d.ts.map