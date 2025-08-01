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
    configName;
    fieldPath;
    actualValue;
    expectedType;
    constructor(message, configName, fieldPath, actualValue, expectedType) {
        super(message);
        this.configName = configName;
        this.fieldPath = fieldPath;
        this.actualValue = actualValue;
        this.expectedType = expectedType;
        this.name = 'ConfigValidationError';
    }
}
export class ConfigSchemaError extends Error {
    configName;
    missingFields;
    constructor(message, configName, missingFields) {
        super(message);
        this.configName = configName;
        this.missingFields = missingFields;
        this.name = 'ConfigSchemaError';
    }
}
// ===== BASIC FIELD VALIDATORS =====
export const validators = {
    /**
     * Validate required string field
     */
    string: (minLength = 1) => (value, fieldPath, configName) => {
        if (typeof value !== 'string') {
            throw new ConfigValidationError(`Expected string at ${fieldPath}`, configName, fieldPath, value, 'string');
        }
        if (value.length < minLength) {
            throw new ConfigValidationError(`String too short at ${fieldPath}. Expected at least ${minLength} characters`, configName, fieldPath, value, `string(min:${minLength})`);
        }
        return value;
    },
    /**
     * Validate required number field
     */
    number: (min, max) => (value, fieldPath, configName) => {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new ConfigValidationError(`Expected number at ${fieldPath}`, configName, fieldPath, value, 'number');
        }
        if (min !== undefined && value < min) {
            throw new ConfigValidationError(`Number too small at ${fieldPath}. Expected >= ${min}`, configName, fieldPath, value, `number(min:${min})`);
        }
        if (max !== undefined && value > max) {
            throw new ConfigValidationError(`Number too large at ${fieldPath}. Expected <= ${max}`, configName, fieldPath, value, `number(max:${max})`);
        }
        return value;
    },
    /**
     * Validate integer field
     */
    integer: (min, max) => (value, fieldPath, configName) => {
        const num = validators.number(min, max)(value, fieldPath, configName);
        if (!Number.isInteger(num)) {
            throw new ConfigValidationError(`Expected integer at ${fieldPath}`, configName, fieldPath, value, 'integer');
        }
        return num;
    },
    /**
     * Validate boolean field
     */
    boolean: () => (value, fieldPath, configName) => {
        if (typeof value !== 'boolean') {
            throw new ConfigValidationError(`Expected boolean at ${fieldPath}`, configName, fieldPath, value, 'boolean');
        }
        return value;
    },
    /**
     * Validate enum/literal field
     */
    enum: (...allowedValues) => (value, fieldPath, configName) => {
        if (typeof value !== 'string' || !allowedValues.includes(value)) {
            throw new ConfigValidationError(`Expected one of [${allowedValues.join(', ')}] at ${fieldPath}`, configName, fieldPath, value, `enum(${allowedValues.join('|')})`);
        }
        return value;
    },
    /**
     * Validate optional field
     */
    optional: (validator) => (value, fieldPath, configName) => {
        if (value === undefined || value === null) {
            return undefined;
        }
        return validator(value, fieldPath, configName);
    },
    /**
     * Validate array field
     */
    array: (itemValidator, minItems = 0) => (value, fieldPath, configName) => {
        if (!Array.isArray(value)) {
            throw new ConfigValidationError(`Expected array at ${fieldPath}`, configName, fieldPath, value, 'array');
        }
        if (value.length < minItems) {
            throw new ConfigValidationError(`Array too short at ${fieldPath}. Expected at least ${minItems} items`, configName, fieldPath, value, `array(min:${minItems})`);
        }
        return value.map((item, index) => itemValidator(item, `${fieldPath}[${index}]`, configName));
    },
    // ===== MIDI-SPECIFIC VALIDATORS =====
    /**
     * Validate MIDI program number (0-127)
     */
    midiProgram: () => (value, fieldPath, configName) => {
        const num = validators.integer(0, 127)(value, fieldPath, configName);
        if (!isValidMIDIProgram(num)) {
            throw new ConfigValidationError(`Invalid MIDI program at ${fieldPath}. Must be 0-127`, configName, fieldPath, value, 'midiProgram');
        }
        return num;
    },
    /**
     * Validate MIDI CC value (0-127 or -8192 to 8191 for pitch bend)
     */
    midiCCValue: (allowPitchBend = false) => (value, fieldPath, configName) => {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            throw new ConfigValidationError(`Expected integer at ${fieldPath}`, configName, fieldPath, value, 'integer');
        }
        if (allowPitchBend && isValidMIDIPitchBend(value)) {
            return value;
        }
        if (isValidMIDIValue(value)) {
            return value;
        }
        const range = allowPitchBend ? '0-127 or -8192-8191' : '0-127';
        throw new ConfigValidationError(`Invalid MIDI CC value at ${fieldPath}. Must be ${range}`, configName, fieldPath, value, 'midiCCValue');
    }
};
// ===== OBJECT VALIDATOR HELPER =====
/**
 * Validate object with typed schema
 */
export function validateObject(schema) {
    return (value, fieldPath, configName) => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new ConfigValidationError(`Expected object at ${fieldPath}`, configName, fieldPath, value, 'object');
        }
        const obj = value;
        const result = {};
        const errors = [];
        for (const [key, validator] of Object.entries(schema)) {
            try {
                const keyPath = fieldPath ? `${fieldPath}.${key}` : key;
                result[key] = validator(obj[key], keyPath, configName);
            }
            catch (error) {
                if (error instanceof ConfigValidationError) {
                    errors.push(error);
                }
                else {
                    errors.push(new ConfigValidationError(`Validation error at ${fieldPath}.${key}: ${error}`, configName, `${fieldPath}.${key}`, obj[key], 'unknown'));
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
export const gmInstrumentSchema = {
    name: 'GM Instruments',
    version: '1.0',
    description: 'General MIDI instrument definitions',
    validator: (data, configName) => {
        const errors = [];
        try {
            const instruments = validators.array(validateObject({
                program: validators.midiProgram(),
                name: validators.string(1),
                category: validators.string(1)
            }), 1)(data, '', configName);
            return { success: true, data: instruments, errors: [] };
        }
        catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            }
            else {
                errors.push(new ConfigValidationError(`Validation failed: ${error}`, configName, '', data, 'GMInstrument[]'));
            }
            return { success: false, errors };
        }
    }
};
export const ccControlSchema = {
    name: 'MIDI CC Controls',
    version: '1.0',
    description: 'MIDI Control Change definitions',
    validator: (data, configName) => {
        const errors = [];
        try {
            const controls = validators.array(validateObject({
                cc: validators.integer(-8192, 127), // Allow pitch bend range
                name: validators.string(1),
                type: validators.enum('slider', 'knob', 'button'),
                min: validators.midiCCValue(true), // Allow pitch bend range
                max: validators.midiCCValue(true),
                default: validators.midiCCValue(true),
                bipolar: validators.optional(validators.boolean()),
                category: validators.optional(validators.string(1))
            }), 1)(data, '', configName);
            return { success: true, data: controls, errors: [] };
        }
        catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            }
            else {
                errors.push(new ConfigValidationError(`Validation failed: ${error}`, configName, '', data, 'CCControl[]'));
            }
            return { success: false, errors };
        }
    }
};
export const gmDrumSchema = {
    name: 'GM Drum Map',
    version: '1.0',
    description: 'General MIDI drum note definitions',
    validator: (data, configName) => {
        const errors = [];
        try {
            const drums = validators.array(validateObject({
                note: validators.integer(0, 127), // MIDI note range
                name: validators.string(1),
                category: validators.string(1)
            }), 1)(data, '', configName);
            return { success: true, data: drums, errors: [] };
        }
        catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            }
            else {
                errors.push(new ConfigValidationError(`Validation failed: ${error}`, configName, '', data, 'GMDrumNote[]'));
            }
            return { success: false, errors };
        }
    }
};
export const gmDrumKitSchema = {
    name: 'GM Drum Kits',
    version: '1.0',
    description: 'General MIDI drum kit definitions',
    validator: (data, configName) => {
        const errors = [];
        try {
            const drumKits = validators.array(validateObject({
                program: validators.midiProgram(),
                name: validators.string(1),
                description: validators.string(1)
            }), 1)(data, '', configName);
            return { success: true, data: drumKits, errors: [] };
        }
        catch (error) {
            if (error instanceof ConfigValidationError) {
                errors.push(error);
            }
            else {
                errors.push(new ConfigValidationError(`Validation failed: ${error}`, configName, '', data, 'GMDrumKit[]'));
            }
            return { success: false, errors };
        }
    }
};
// ===== SCHEMA REGISTRY =====
export const CONFIG_SCHEMAS = new Map([
    ['gm-instruments', gmInstrumentSchema],
    ['gm-drums', gmDrumSchema],
    ['gm-drum-kits', gmDrumKitSchema],
    ['midi-cc-controls', ccControlSchema]
]);
/**
 * Register a new config schema
 */
export function registerConfigSchema(name, schema) {
    CONFIG_SCHEMAS.set(name, schema);
    DEBUG_LOGGERS.configLoader.log(`Registered config schema: ${name} v${schema.version}`);
}
/**
 * Get registered config schema
 */
export function getConfigSchema(name) {
    return CONFIG_SCHEMAS.get(name);
}
//# sourceMappingURL=config-validator.js.map