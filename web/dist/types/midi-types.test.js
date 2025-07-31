/**
 * Basic validation tests for unified MIDI type system
 * Part of AWE Player EMU8000 Emulator
 */
import { isValidMIDINote, isValidMIDIVelocity, isValidMIDIChannel, createMIDINoteNumber, MIDIValidationError, isWhiteKey, isBlackKey } from './midi-types.js';
// Basic validation tests
console.log('Testing MIDI Type System...');
// Test valid ranges
console.assert(isValidMIDINote(60), 'C4 (60) should be valid MIDI note');
console.assert(isValidMIDINote(0), 'MIDI note 0 should be valid');
console.assert(isValidMIDINote(127), 'MIDI note 127 should be valid');
console.assert(!isValidMIDINote(-1), 'MIDI note -1 should be invalid');
console.assert(!isValidMIDINote(128), 'MIDI note 128 should be invalid');
console.assert(isValidMIDIVelocity(64), 'Velocity 64 should be valid');
console.assert(isValidMIDIVelocity(0), 'Velocity 0 should be valid');
console.assert(isValidMIDIVelocity(127), 'Velocity 127 should be valid');
console.assert(!isValidMIDIVelocity(-1), 'Velocity -1 should be invalid');
console.assert(isValidMIDIChannel(0), 'Channel 0 should be valid');
console.assert(isValidMIDIChannel(15), 'Channel 15 should be valid');
console.assert(!isValidMIDIChannel(16), 'Channel 16 should be invalid');
// Test safe constructors
try {
    const note = createMIDINoteNumber(60);
    console.assert(note === 60, 'Created note should equal input');
}
catch (e) {
    console.error('Failed to create valid MIDI note:', e);
}
try {
    createMIDINoteNumber(200);
    console.error('Should have thrown error for invalid note');
}
catch (e) {
    console.assert(e instanceof MIDIValidationError, 'Should throw MIDIValidationError');
}
// Test key type functions
console.assert(isWhiteKey(0), 'C should be white key');
console.assert(isBlackKey(1), 'C# should be black key');
console.assert(isWhiteKey(2), 'D should be white key');
console.log('MIDI Type System tests completed.');
//# sourceMappingURL=midi-types.test.js.map