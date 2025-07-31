/**
 * Configuration Validation System Tests
 * Part of AWE Player EMU8000 Emulator
 */
import { validators, validateObject, gmInstrumentSchema, ccControlSchema, ConfigValidationError } from './config-validator.js';
console.log('Testing Configuration Validation System...');
// Test basic validators
console.assert(validators.string()('test', 'field', 'config') === 'test', 'String validator should pass valid string');
try {
    validators.string(5)('', 'field', 'config');
    console.error('Should have thrown error for short string');
}
catch (e) {
    console.assert(e instanceof ConfigValidationError, 'Should throw ConfigValidationError');
}
// Test number validators
console.assert(validators.number(0, 127)(64, 'field', 'config') === 64, 'Number validator should pass valid number');
console.assert(validators.integer(0, 127)(100, 'field', 'config') === 100, 'Integer validator should pass valid integer');
// Test MIDI validators
console.assert(validators.midiProgram()(0, 'field', 'config') === 0, 'MIDI program 0 should be valid');
console.assert(validators.midiProgram()(127, 'field', 'config') === 127, 'MIDI program 127 should be valid');
try {
    validators.midiProgram()(128, 'field', 'config');
    console.error('Should have thrown error for invalid MIDI program');
}
catch (e) {
    console.assert(e instanceof ConfigValidationError, 'Should throw ConfigValidationError');
}
// Test object validation
const testInstrument = {
    program: 0,
    name: 'Test Piano',
    category: 'Piano'
};
const instrumentValidator = validateObject({
    program: validators.midiProgram(),
    name: validators.string(1),
    category: validators.string(1)
});
const validatedInstrument = instrumentValidator(testInstrument, '', 'test-config');
console.assert(validatedInstrument.program === 0, 'Object validation should preserve program');
console.assert(validatedInstrument.name === 'Test Piano', 'Object validation should preserve name');
// Test array validation
const testInstruments = [testInstrument];
const arrayValidator = validators.array(instrumentValidator, 1);
const validatedArray = arrayValidator(testInstruments, '', 'test-config');
console.assert(validatedArray.length === 1, 'Array validation should preserve length');
// Test schema validation
const instrumentResult = gmInstrumentSchema.validator([testInstrument], 'test-config');
console.assert(instrumentResult.success, 'GM Instrument schema should validate test data');
console.assert(instrumentResult.data?.length === 1, 'Schema should return validated data');
// Test CC control schema
const testCCControl = {
    cc: 1,
    name: 'Modulation',
    type: 'slider',
    min: 0,
    max: 127,
    default: 0,
    category: 'performance'
};
const ccResult = ccControlSchema.validator([testCCControl], 'test-config');
console.assert(ccResult.success, 'CC Control schema should validate test data');
console.assert(ccResult.data?.length === 1, 'CC schema should return validated data');
// Test pitch bend special case
const pitchBendControl = {
    cc: -1,
    name: 'Pitch Bend',
    type: 'slider',
    min: -8192,
    max: 8191,
    default: 0,
    bipolar: true,
    category: 'performance'
};
const pitchBendResult = ccControlSchema.validator([pitchBendControl], 'test-config');
console.assert(pitchBendResult.success, 'Pitch bend control should validate');
console.log('Configuration Validation System tests completed.');
//# sourceMappingURL=config-validation.test.js.map