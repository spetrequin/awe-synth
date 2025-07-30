/**
 * Project-wide Type Definitions - Complete typing system
 * Part of AWE Player EMU8000 Emulator
 */

// Re-export input types
export * from './input-types.js';

// ===== AUDIO & SYNTHESIS TYPES =====

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

// ===== UI & COMPONENT TYPES =====

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

// ===== EVENT TYPES =====

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

// ===== CONFIGURATION TYPES =====

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

// ===== ERROR HANDLING TYPES =====

export type ErrorCode = 
    | 'INVALID_MIDI_DATA'
    | 'AUDIO_CONTEXT_ERROR'
    | 'CONFIG_LOAD_ERROR'
    | 'INPUT_HANDLER_ERROR'
    | 'SYNTHESIS_ERROR'
    | 'RESOURCE_NOT_FOUND';

export interface ProjectError {
    readonly code: ErrorCode;
    readonly message: string;
    readonly context?: Record<string, unknown>;
    readonly timestamp: Date;
    readonly stack?: string;
}

// ===== UTILITY TYPES =====

export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type Awaitable<T> = T | Promise<T>;

// ===== TYPE GUARDS =====

export const isAudioProcessorConfig = (obj: unknown): obj is AudioProcessorConfig => {
    return typeof obj === 'object' && obj !== null &&
           'sampleRate' in obj && typeof (obj as any).sampleRate === 'number' &&
           'bufferSize' in obj && typeof (obj as any).bufferSize === 'number' &&
           'channels' in obj && typeof (obj as any).channels === 'number';
};

export const isMIDIEvent = (obj: unknown): obj is MIDIEvent => {
    return typeof obj === 'object' && obj !== null &&
           'type' in obj && typeof (obj as any).type === 'string' &&
           'channel' in obj && typeof (obj as any).channel === 'number' &&
           'data1' in obj && typeof (obj as any).data1 === 'number' &&
           'timestamp' in obj && typeof (obj as any).timestamp === 'number';
};

export const isKeyboardEvent = (obj: unknown): obj is KeyboardEvent => {
    return typeof obj === 'object' && obj !== null &&
           'type' in obj && ['keyPress', 'keyRelease'].includes((obj as any).type) &&
           'noteNumber' in obj && typeof (obj as any).noteNumber === 'number' &&
           'velocity' in obj && typeof (obj as any).velocity === 'number';
};

// ===== BRANDED TYPES FOR ADDITIONAL SAFETY =====

export type Milliseconds = number & { readonly __brand: 'Milliseconds' };
export type Seconds = number & { readonly __brand: 'Seconds' };
export type Hertz = number & { readonly __brand: 'Hertz' };
export type Decibels = number & { readonly __brand: 'Decibels' };
export type Percentage = number & { readonly __brand: 'Percentage' };

// Helper functions for branded types
export const createMilliseconds = (value: number): Milliseconds => {
    if (value < 0 || !Number.isFinite(value)) {
        throw new Error(`Invalid milliseconds value: ${value}`);
    }
    return value as Milliseconds;
};

export const createSeconds = (value: number): Seconds => {
    if (value < 0 || !Number.isFinite(value)) {
        throw new Error(`Invalid seconds value: ${value}`);
    }
    return value as Seconds;
};

export const createHertz = (value: number): Hertz => {
    if (value < 0 || !Number.isFinite(value)) {
        throw new Error(`Invalid frequency value: ${value}`);
    }
    return value as Hertz;
};

export const createPercentage = (value: number): Percentage => {
    if (value < 0 || value > 100 || !Number.isFinite(value)) {
        throw new Error(`Invalid percentage value: ${value}. Must be 0-100.`);
    }
    return value as Percentage;
};