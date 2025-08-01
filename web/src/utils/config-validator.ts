/**
 * Configuration Validation System
 * Part of AWE Player EMU8000 Emulator
 * 
 * Provides comprehensive validation for JSON configuration files
 * with runtime type checking and detailed error reporting.
 */

import { DEBUG_LOGGERS } from './debug-logger.js';
import { isValidMIDIProgram, isValidMIDIValue, isValidMIDIPitchBend } from '../midi-constants.js';

// ===== VALIDATION ERROR TYPES =====

export class ConfigValidationError extends Error {
    constructor(
        message: string,
        public readonly configName: string,
        public readonly fieldPath: string,
        public readonly actualValue: unknown,
        public readonly expectedType: string
    ) {
        super(message);
        this.name = 'ConfigValidationError';
    }
}

export class ConfigSchemaError extends Error {
    constructor(
        message: string,
        public readonly configName: string,
        public readonly missingFields: string[]
    ) {
        super(message);
        this.name = 'ConfigSchemaError';
    }
}

// ===== VALIDATION INTERFACES =====

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors: ConfigValidationError[];
}

export interface FieldValidator<T = unknown> {
    (value: unknown, fieldPath: string, configName: string): T;
}

export interface ConfigSchema<T> {
    name: string;
    version: string;
    validator: (data: unknown, configName: string) => ValidationResult<T>;
    description?: string;
}

// ===== BASIC FIELD VALIDATORS =====

export const validators = {
    /**
     * Validate required string field
     */
    string: (minLength = 1): FieldValidator<string> => 
        (value: unknown, fieldPath: string, configName: string): string => {
            if (typeof value !== 'string') {
                throw new ConfigValidationError(
                    `Expected string at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    'string'
                );
            }
            if (value.length < minLength) {
                throw new ConfigValidationError(
                    `String too short at ${fieldPath}. Expected at least ${minLength} characters`,
                    configName,
                    fieldPath,
                    value,
                    `string(min:${minLength})`
                );
            }
            return value;
        },

    /**
     * Validate required number field
     */
    number: (min?: number, max?: number): FieldValidator<number> => 
        (value: unknown, fieldPath: string, configName: string): number => {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new ConfigValidationError(
                    `Expected number at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    'number'
                );
            }
            if (min !== undefined && value < min) {
                throw new ConfigValidationError(
                    `Number too small at ${fieldPath}. Expected >= ${min}`,
                    configName,
                    fieldPath,
                    value,
                    `number(min:${min})`
                );
            }
            if (max !== undefined && value > max) {
                throw new ConfigValidationError(
                    `Number too large at ${fieldPath}. Expected <= ${max}`,
                    configName,
                    fieldPath,
                    value,
                    `number(max:${max})`
                );
            }
            return value;
        },

    /**
     * Validate integer field
     */
    integer: (min?: number, max?: number): FieldValidator<number> => 
        (value: unknown, fieldPath: string, configName: string): number => {
            const num = validators.number(min, max)(value, fieldPath, configName);
            if (!Number.isInteger(num)) {
                throw new ConfigValidationError(
                    `Expected integer at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    'integer'
                );
            }
            return num;
        },

    /**
     * Validate boolean field
     */
    boolean: (): FieldValidator<boolean> => 
        (value: unknown, fieldPath: string, configName: string): boolean => {
            if (typeof value !== 'boolean') {
                throw new ConfigValidationError(
                    `Expected boolean at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    'boolean'
                );
            }
            return value;
        },

    /**
     * Validate enum/literal field
     */
    enum: <T extends string>(...allowedValues: T[]): FieldValidator<T> => 
        (value: unknown, fieldPath: string, configName: string): T => {
            if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
                throw new ConfigValidationError(
                    `Expected one of [${allowedValues.join(', ')}] at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    `enum(${allowedValues.join('|')})`
                );
            }
            return value as T;
        },

    /**
     * Validate optional field
     */
    optional: <T>(validator: FieldValidator<T>): FieldValidator<T | undefined> => 
        (value: unknown, fieldPath: string, configName: string): T | undefined => {
            if (value === undefined || value === null) {
                return undefined;
            }
            return validator(value, fieldPath, configName);
        },

    /**
     * Validate array field
     */
    array: <T>(itemValidator: FieldValidator<T>, minItems = 0): FieldValidator<T[]> => 
        (value: unknown, fieldPath: string, configName: string): T[] => {
            if (!Array.isArray(value)) {
                throw new ConfigValidationError(
                    `Expected array at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    'array'
                );
            }
            if (value.length < minItems) {
                throw new ConfigValidationError(
                    `Array too short at ${fieldPath}. Expected at least ${minItems} items`,
                    configName,
                    fieldPath,
                    value,
                    `array(min:${minItems})`
                );
            }
            return value.map((item, index) => 
                itemValidator(item, `${fieldPath}[${index}]`, configName)
            );
        },

    // ===== MIDI-SPECIFIC VALIDATORS =====

    /**
     * Validate MIDI program number (0-127)
     */
    midiProgram: (): FieldValidator<number> => 
        (value: unknown, fieldPath: string, configName: string): number => {
            const num = validators.integer(0, 127)(value, fieldPath, configName);
            if (!isValidMIDIProgram(num)) {
                throw new ConfigValidationError(
                    `Invalid MIDI program at ${fieldPath}. Must be 0-127`,
                    configName,
                    fieldPath,
                    value,
                    'midiProgram'
                );
            }
            return num;
        },

    /**
     * Validate MIDI CC value (0-127 or -8192 to 8191 for pitch bend)
     */
    midiCCValue: (allowPitchBend = false): FieldValidator<number> => 
        (value: unknown, fieldPath: string, configName: string): number => {
            if (typeof value !== 'number' || !Number.isInteger(value)) {
                throw new ConfigValidationError(
                    `Expected integer at ${fieldPath}`,
                    configName,
                    fieldPath,
                    value,
                    'integer'
                );
            }
            
            if (allowPitchBend && isValidMIDIPitchBend(value)) {
                return value;
            }
            
            if (isValidMIDIValue(value)) {
                return value;
            }
            
            const range = allowPitchBend ? '0-127 or -8192-8191' : '0-127';
            throw new ConfigValidationError(
                `Invalid MIDI CC value at ${fieldPath}. Must be ${range}`,
                configName,
                fieldPath,
                value,
                'midiCCValue'
            );
        }
};

// ===== OBJECT VALIDATOR HELPER =====

/**
 * Validate object with typed schema
 */
export function validateObject<T extends Record<string, unknown>>(
    schema: { [K in keyof T]: FieldValidator<T[K]> }
) {
    return (value: unknown, fieldPath: string, configName: string): T => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new ConfigValidationError(
                `Expected object at ${fieldPath}`,
                configName,
                fieldPath,
                value,
                'object'
            );
        }

        const obj = value as Record<string, unknown>;
        const result = {} as T;
        const errors: ConfigValidationError[] = [];

        for (const [key, validator] of Object.entries(schema)) {
            try {
                const keyPath = fieldPath ? `${fieldPath}.${key}` : key;
                result[key as keyof T] = validator(obj[key], keyPath, configName);
            } catch (error) {
                if (error instanceof ConfigValidationError) {
                    errors.push(error);
                } else {
                    errors.push(new ConfigValidationError(
                        `Validation error at ${fieldPath}.${key}: ${error}`,
                        configName,
                        `${fieldPath}.${key}`,
                        obj[key],
                        'unknown'
                    ));
                }
            }
        }

        if (errors.length > 0) {
            // Throw the first error (others will be collected by higher-level validator)
            const firstError = errors[0];
            if (firstError) {
                throw firstError;
            }
        }

        return result;
    };
}

// ===== BUILT-IN CONFIG SCHEMAS =====

// GM Instrument Schema
export interface GMInstrument {
    program: number;
    name: string;
    category: string;
    [key: string]: unknown;
}

export const gmInstrumentSchema: ConfigSchema<GMInstrument[]> = {
    name: 'GM Instruments',
    version: '1.0',
    description: 'General MIDI instrument definitions',
    validator: (data: unknown, configName: string): ValidationResult<GMInstrument[]> => {
        const errors: ConfigValidationError[] = [];
        
        try {
            const instruments = validators.array(
                validateObject<GMInstrument>({
                    program: validators.midiProgram(),
                    name: validators.string(1),
                    category: validators.string(1)
                }),
                1
            )(data, '', configName);
            
            return { success: true, data: instruments, errors: [] };
        } catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            } else {
                errors.push(new ConfigValidationError(
                    `Validation failed: ${error}`,
                    configName,
                    '',
                    data,
                    'GMInstrument[]'
                ));
            }
            return { success: false, errors };
        }
    }
};

// MIDI CC Control Schema  
export interface CCControl {
    cc: number;
    name: string;
    type: 'slider' | 'knob' | 'button';
    min: number;
    max: number;
    default: number;
    bipolar?: boolean;
    category?: string;
    [key: string]: unknown;
}

export const ccControlSchema: ConfigSchema<CCControl[]> = {
    name: 'MIDI CC Controls',
    version: '1.0',
    description: 'MIDI Control Change definitions',
    validator: (data: unknown, configName: string): ValidationResult<CCControl[]> => {
        const errors: ConfigValidationError[] = [];
        
        try {
            const controls = validators.array(
                validateObject<CCControl>({
                    cc: validators.integer(-8192, 127), // Allow pitch bend range
                    name: validators.string(1),
                    type: validators.enum('slider', 'knob', 'button'),
                    min: validators.midiCCValue(true), // Allow pitch bend range
                    max: validators.midiCCValue(true),
                    default: validators.midiCCValue(true),
                    bipolar: validators.optional(validators.boolean()),
                    category: validators.optional(validators.string(1))
                }),
                1
            )(data, '', configName);
            
            return { success: true, data: controls, errors: [] };
        } catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            } else {
                errors.push(new ConfigValidationError(
                    `Validation failed: ${error}`,
                    configName,
                    '',
                    data,
                    'CCControl[]'
                ));
            }
            return { success: false, errors };
        }
    }
};

// GM Drum Note Schema
export interface GMDrumNote {
    note: number;
    name: string;
    category: string;
    [key: string]: unknown;
}

export const gmDrumSchema: ConfigSchema<GMDrumNote[]> = {
    name: 'GM Drum Map',
    version: '1.0',
    description: 'General MIDI drum note definitions',
    validator: (data: unknown, configName: string): ValidationResult<GMDrumNote[]> => {
        const errors: ConfigValidationError[] = [];
        
        try {
            const drums = validators.array(
                validateObject<GMDrumNote>({
                    note: validators.integer(0, 127), // MIDI note range
                    name: validators.string(1),
                    category: validators.string(1)
                }),
                1
            )(data, '', configName);
            
            return { success: true, data: drums, errors: [] };
        } catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            } else {
                errors.push(new ConfigValidationError(
                    `Validation failed: ${error}`,
                    configName,
                    '',
                    data,
                    'GMDrumNote[]'
                ));
            }
            return { success: false, errors };
        }
    }
};

// GM Drum Kit Schema
export interface GMDrumKit {
    program: number;
    name: string;
    description: string;
    [key: string]: unknown;
}

export const gmDrumKitSchema: ConfigSchema<GMDrumKit[]> = {
    name: 'GM Drum Kits',
    version: '1.0',
    description: 'General MIDI drum kit definitions',
    validator: (data: unknown, configName: string): ValidationResult<GMDrumKit[]> => {
        const errors: ConfigValidationError[] = [];
        
        try {
            const drumKits = validators.array(
                validateObject<GMDrumKit>({
                    program: validators.midiProgram(),
                    name: validators.string(1),
                    description: validators.string(1)
                }),
                1
            )(data, '', configName);
            
            return { success: true, data: drumKits, errors: [] };
        } catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            } else {
                errors.push(new ConfigValidationError(
                    `Validation failed: ${error}`,
                    configName,
                    '',
                    data,
                    'GMDrumKit[]'
                ));
            }
            return { success: false, errors };
        }
    }
};

// ===== SCHEMA REGISTRY =====

export const CONFIG_SCHEMAS = new Map<string, ConfigSchema<any>>([
    ['gm-instruments', gmInstrumentSchema],
    ['gm-drums', gmDrumSchema],
    ['gm-drum-kits', gmDrumKitSchema],
    ['midi-cc-controls', ccControlSchema]
]);

/**
 * Register a new config schema
 */
export function registerConfigSchema<T>(name: string, schema: ConfigSchema<T>): void {
    CONFIG_SCHEMAS.set(name, schema);
    DEBUG_LOGGERS.configLoader.log(`Registered config schema: ${name} v${schema.version}`);
}

/**
 * Get registered config schema
 */
export function getConfigSchema<T>(name: string): ConfigSchema<T> | undefined {
    return CONFIG_SCHEMAS.get(name);
}