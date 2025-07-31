/**
 * Project-wide Type Definitions - Complete typing system
 * Part of AWE Player EMU8000 Emulator
 */
// Re-export input types
export * from './input-types.js';
// ===== TYPE GUARDS =====
export const isAudioProcessorConfig = (obj) => {
    return typeof obj === 'object' && obj !== null &&
        'sampleRate' in obj && typeof obj.sampleRate === 'number' &&
        'bufferSize' in obj && typeof obj.bufferSize === 'number' &&
        'channels' in obj && typeof obj.channels === 'number';
};
export const isMIDIEvent = (obj) => {
    return typeof obj === 'object' && obj !== null &&
        'type' in obj && typeof obj.type === 'string' &&
        'channel' in obj && typeof obj.channel === 'number' &&
        'data1' in obj && typeof obj.data1 === 'number' &&
        'timestamp' in obj && typeof obj.timestamp === 'number';
};
export const isKeyboardEvent = (obj) => {
    return typeof obj === 'object' && obj !== null &&
        'type' in obj && ['keyPress', 'keyRelease'].includes(obj.type) &&
        'noteNumber' in obj && typeof obj.noteNumber === 'number' &&
        'velocity' in obj && typeof obj.velocity === 'number';
};
// Helper functions for branded types
export const createMilliseconds = (value) => {
    if (value < 0 || !Number.isFinite(value)) {
        throw new Error(`Invalid milliseconds value: ${value}`);
    }
    return value;
};
export const createSeconds = (value) => {
    if (value < 0 || !Number.isFinite(value)) {
        throw new Error(`Invalid seconds value: ${value}`);
    }
    return value;
};
export const createHertz = (value) => {
    if (value < 0 || !Number.isFinite(value)) {
        throw new Error(`Invalid frequency value: ${value}`);
    }
    return value;
};
export const createPercentage = (value) => {
    if (value < 0 || value > 100 || !Number.isFinite(value)) {
        throw new Error(`Invalid percentage value: ${value}. Must be 0-100.`);
    }
    return value;
};
//# sourceMappingURL=project-types.js.map