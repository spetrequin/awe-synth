/**
 * Keyboard Layout Helper - Handles piano key layout generation
 * Part of AWE Player EMU8000 Emulator
 */

import { MIDI_NOTES, PIANO_LAYOUT, UI_CONSTANTS, noteToFullName } from '../midi-constants.js';

export interface KeyLayout {
    noteNumber: number;
    keyType: 'white' | 'black';
    octave: number;
    noteName: string;
    position: number; // Position within octave
}

export class KeyboardLayoutGenerator {
    
    /**
     * Generate layout for all piano keys
     */
    public generateFullKeyboard(): KeyLayout[] {
        const keys: KeyLayout[] = [];
        
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
    public generateKeyLayout(noteNumber: number): KeyLayout | null {
        if (noteNumber < MIDI_NOTES.LOWEST_PIANO || noteNumber > MIDI_NOTES.HIGHEST_PIANO) {
            return null;
        }
        
        const octave = Math.floor((noteNumber - 12) / MIDI_NOTES.OCTAVE_SIZE);
        const noteInOctave = noteNumber % MIDI_NOTES.OCTAVE_SIZE;
        const isBlack = PIANO_LAYOUT.BLACK_KEY_PATTERN.includes(noteInOctave as any);
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
    public generateOctaveKeys(octave: number): KeyLayout[] {
        const keys: KeyLayout[] = [];
        let startNote = 0;
        let endNote = 11;
        
        // Handle partial octaves (A0 starts at note 9, C8 ends at note 0)
        if (octave === 0) {
            startNote = 9; // Start at A0
        } else if (octave === 8) {
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
    public getWhiteKeys(octave: number): KeyLayout[] {
        return this.generateOctaveKeys(octave).filter(key => key.keyType === 'white');
    }
    
    /**
     * Get black keys for an octave
     */
    public getBlackKeys(octave: number): KeyLayout[] {
        return this.generateOctaveKeys(octave).filter(key => key.keyType === 'black');
    }
    
    /**
     * Calculate black key position within octave
     */
    public calculateBlackKeyPosition(noteInOctave: number): number {
        // Black key positions relative to white keys
        const blackKeyPositions: Record<number, number> = {
            1: 30,   // C#
            3: 70,   // D#
            6: 150,  // F#
            8: 190,  // G#
            10: 230  // A#
        };
        
        return blackKeyPositions[noteInOctave] || 0;
    }
    
    /**
     * Check if a note is a white key
     */
    public isWhiteKey(noteNumber: number): boolean {
        const noteInOctave = noteNumber % MIDI_NOTES.OCTAVE_SIZE;
        return PIANO_LAYOUT.WHITE_KEY_PATTERN.includes(noteInOctave as any);
    }
    
    /**
     * Check if a note is a black key
     */
    public isBlackKey(noteNumber: number): boolean {
        const noteInOctave = noteNumber % MIDI_NOTES.OCTAVE_SIZE;
        return PIANO_LAYOUT.BLACK_KEY_PATTERN.includes(noteInOctave as any);
    }
    
    /**
     * Get the next white key after a given note
     */
    public getNextWhiteKey(noteNumber: number): number | null {
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
    public getPreviousWhiteKey(noteNumber: number): number | null {
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
    public countWhiteKeysInRange(startNote: number, endNote: number): number {
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
    public countBlackKeysInRange(startNote: number, endNote: number): number {
        let count = 0;
        for (let note = startNote; note <= endNote; note++) {
            if (this.isBlackKey(note)) {
                count++;
            }
        }
        return count;
    }
}