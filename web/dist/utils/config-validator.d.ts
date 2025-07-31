/**
 * Configuration Validation System
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides comprehensive validation for JSON configuration files
 * with runtime type checking and detailed error reporting.
 */
export declare class ConfigValidationError extends Error {
    readonly configName: string;
    readonly fieldPath: string;
    readonly actualValue: unknown;
    readonly expectedType: string;
    constructor(message: string, configName: string, fieldPath: string, actualValue: unknown, expectedType: string);
}
export declare class ConfigSchemaError extends Error {
    readonly configName: string;
    readonly missingFields: string[];
    constructor(message: string, configName: string, missingFields: string[]);
}
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
export declare const validators: {
    /**
     * Validate required string field
     */
    string: (minLength?: number) => FieldValidator<string>;
    /**
     * Validate required number field
     */
    number: (min?: number, max?: number) => FieldValidator<number>;
    /**
     * Validate integer field
     */
    integer: (min?: number, max?: number) => FieldValidator<number>;
    /**
     * Validate boolean field
     */
    boolean: () => FieldValidator<boolean>;
    /**
     * Validate enum/literal field
     */
    enum: <T extends string>(...allowedValues: T[]) => FieldValidator<T>;
    /**
     * Validate optional field
     */
    optional: <T>(validator: FieldValidator<T>) => FieldValidator<T | undefined>;
    /**
     * Validate array field
     */
    array: <T>(itemValidator: FieldValidator<T>, minItems?: number) => FieldValidator<T[]>;
    /**
     * Validate MIDI program number (0-127)
     */
    midiProgram: () => FieldValidator<number>;
    /**
     * Validate MIDI CC value (0-127 or -8192 to 8191 for pitch bend)
     */
    midiCCValue: (allowPitchBend?: boolean) => FieldValidator<number>;
};
/**
 * Validate object with typed schema
 */
export declare function validateObject<T extends Record<string, unknown>>(schema: {
    [K in keyof T]: FieldValidator<T[K]>;
}): (value: unknown, fieldPath: string, configName: string) => T;
export interface GMInstrument {
    program: number;
    name: string;
    category: string;
}
export declare const gmInstrumentSchema: ConfigSchema<GMInstrument[]>;
export interface CCControl {
    cc: number;
    name: string;
    type: 'slider' | 'knob' | 'button';
    min: number;
    max: number;
    default: number;
    bipolar?: boolean;
    category?: string;
}
export declare const ccControlSchema: ConfigSchema<CCControl[]>;
export interface GMDrumNote {
    note: number;
    name: string;
    category: string;
}
export declare const gmDrumSchema: ConfigSchema<GMDrumNote[]>;
export interface GMDrumKit {
    program: number;
    name: string;
    description: string;
}
export declare const gmDrumKitSchema: ConfigSchema<GMDrumKit[]>;
export declare const CONFIG_SCHEMAS: Map<string, ConfigSchema<any>>;
/**
 * Register a new config schema
 */
export declare function registerConfigSchema<T>(name: string, schema: ConfigSchema<T>): void;
/**
 * Get registered config schema
 */
export declare function getConfigSchema<T>(name: string): ConfigSchema<T> | undefined;
//# sourceMappingURL=config-validator.d.ts.map