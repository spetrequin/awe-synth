/**
 * Enhanced Input Types - Strict TypeScript interfaces
 * Part of AWE Player EMU8000 Emulator
 */
// Re-export unified MIDI types and constructors
export { createMIDINoteNumber, createMIDIVelocity, createMIDIChannel, MIDIValidationError } from './midi-types.js';
// Enhanced MIDI input error with device-specific codes
export class MIDIInputError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'MIDIInputError';
    }
}
export class ConfigurationError extends Error {
    configName;
    originalError;
    constructor(message, configName, originalError) {
        super(message);
        this.configName = configName;
        this.originalError = originalError;
        this.name = 'ConfigurationError';
    }
}
//# sourceMappingURL=input-types.js.map