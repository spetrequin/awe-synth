/**
 * Keyboard Layout Helper - Handles piano key layout generation
 * Part of AWE Player EMU8000 Emulator
 */
import { MIDI_NOTES, noteToFullName } from '../midi-constants.js';
import { isBlackKey as isBlackKeyNote } from '../types/midi-types.js';
export class KeyboardLayoutGenerator {
    /**
     * Generate layout for all piano keys
     */
    generateFullKeyboard() {
        const keys = [];
        for (let note = MIDI_NOTES.LOWEST_PIANO; note <= MIDI_NOTES.HIGHEST_PIANO; note++) {
            const layout = this.generateKeyLayout(note);
            if (layout) {
                keys.push(layout);
            }
        }
        return keys;
    }
    /**
     * Generate layout for a specific note
     */
    generateKeyLayout(noteNumber) {
        if (noteNumber < MIDI_NOTES.LOWEST_PIANO || noteNumber > MIDI_NOTES.HIGHEST_PIANO) {
            return null;
        }
        const octave = Math.floor((noteNumber - 12) / MIDI_NOTES.OCTAVE_SIZE);
        const noteInOctave = noteNumber % MIDI_NOTES.OCTAVE_SIZE;
        const isBlack = isBlackKeyNote(noteInOctave); // Cast to satisfy branded type
        const noteName = noteToFullName(noteNumber);
        return {
            noteNumber,
            keyType: isBlack ? 'black' : 'white',
            octave,
            noteName,
            position: noteInOctave
        };
    }
    /**
     * Generate keys for a specific octave
     */
    generateOctaveKeys(octave) {
        const keys = [];
        let startNote = 0;
        let endNote = 11;
        // Handle partial octaves (A0 starts at note 9, C8 ends at note 0)
        if (octave === 0) {
            startNote = 9; // Start at A0
        }
        else if (octave === 8) {
            endNote = 0; // End at C8
        }
        for (let i = startNote; i <= endNote; i++) {
            const noteNumber = octave * MIDI_NOTES.OCTAVE_SIZE + i + 12;
            if (noteNumber >= MIDI_NOTES.LOWEST_PIANO && noteNumber <= MIDI_NOTES.HIGHEST_PIANO) {
                const layout = this.generateKeyLayout(noteNumber);
                if (layout) {
                    keys.push(layout);
                }
            }
        }
        return keys;
    }
    /**
     * Get white keys for an octave
     */
    getWhiteKeys(octave) {
        return this.generateOctaveKeys(octave).filter(key => key.keyType === 'white');
    }
    /**
     * Get black keys for an octave
     */
    getBlackKeys(octave) {
        return this.generateOctaveKeys(octave).filter(key => key.keyType === 'black');
    }
    /**
     * Calculate black key position within octave
     */
    calculateBlackKeyPosition(noteInOctave) {
        // Black key positions relative to white keys
        const blackKeyPositions = {
            1: 30, // C#
            3: 70, // D#
            6: 150, // F#
            8: 190, // G#
            10: 230 // A#
        };
        return blackKeyPositions[noteInOctave] || 0;
    }
    /**
     * Check if a note is a white key (convenience method)
     */
    isWhiteKey(noteNumber) {
        const noteInOctave = noteNumber % MIDI_NOTES.OCTAVE_SIZE;
        return !isBlackKeyNote(noteInOctave);
    }
    /**
     * Check if a note is a black key (convenience method)
     */
    isBlackKey(noteNumber) {
        const noteInOctave = noteNumber % MIDI_NOTES.OCTAVE_SIZE;
        return isBlackKeyNote(noteInOctave);
    }
    /**
     * Get the next white key after a given note
     */
    getNextWhiteKey(noteNumber) {
        for (let note = noteNumber + 1; note <= MIDI_NOTES.HIGHEST_PIANO; note++) {
            if (this.isWhiteKey(note)) {
                return note;
            }
        }
        return null;
    }
    /**
     * Get the previous white key before a given note
     */
    getPreviousWhiteKey(noteNumber) {
        for (let note = noteNumber - 1; note >= MIDI_NOTES.LOWEST_PIANO; note--) {
            if (this.isWhiteKey(note)) {
                return note;
            }
        }
        return null;
    }
    /**
     * Count white keys in a range
     */
    countWhiteKeysInRange(startNote, endNote) {
        let count = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (this.isWhiteKey(note)) {
                count++;
            }
        }
        return count;
    }
    /**
     * Count black keys in a range
     */
    countBlackKeysInRange(startNote, endNote) {
        let count = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (this.isBlackKey(note)) {
                count++;
            }
        }
        return count;
    }
}
//# sourceMappingURL=keyboard-layout.js.map