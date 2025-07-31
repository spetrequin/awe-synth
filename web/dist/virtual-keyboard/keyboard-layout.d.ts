/**
 * Keyboard Layout Helper - Handles piano key layout generation
 * Part of AWE Player EMU8000 Emulator
 */
export interface KeyLayout {
    noteNumber: number;
    keyType: 'white' | 'black';
    octave: number;
    noteName: string;
    position: number;
}
export declare class KeyboardLayoutGenerator {
    /**
     * Generate layout for all piano keys
     */
    generateFullKeyboard(): KeyLayout[];
    /**
     * Generate layout for a specific note
     */
    generateKeyLayout(noteNumber: number): KeyLayout | null;
    /**
     * Generate keys for a specific octave
     */
    generateOctaveKeys(octave: number): KeyLayout[];
    /**
     * Get white keys for an octave
     */
    getWhiteKeys(octave: number): KeyLayout[];
    /**
     * Get black keys for an octave
     */
    getBlackKeys(octave: number): KeyLayout[];
    /**
     * Calculate black key position within octave
     */
    calculateBlackKeyPosition(noteInOctave: number): number;
    /**
     * Check if a note is a white key (convenience method)
     */
    isWhiteKey(noteNumber: number): boolean;
    /**
     * Check if a note is a black key (convenience method)
     */
    isBlackKey(noteNumber: number): boolean;
    /**
     * Get the next white key after a given note
     */
    getNextWhiteKey(noteNumber: number): number | null;
    /**
     * Get the previous white key before a given note
     */
    getPreviousWhiteKey(noteNumber: number): number | null;
    /**
     * Count white keys in a range
     */
    countWhiteKeysInRange(startNote: number, endNote: number): number;
    /**
     * Count black keys in a range
     */
    countBlackKeysInRange(startNote: number, endNote: number): number;
}
//# sourceMappingURL=keyboard-layout.d.ts.map