/**
 * Complete General MIDI Sound Library - Instruments and Drums
 * Part of AWE Player EMU8000 Emulator
 */
import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { GMInstrument, GMDrumNote, GMDrumKit } from './utils/config-validator.js';
export type { GMInstrument, GMDrumNote, GMDrumKit } from './utils/config-validator.js';
/**
 * Get GM instruments (loads from JSON config if not cached)
 */
export declare const getGMInstruments: () => Promise<GMInstrument[]>;
/**
 * Get GM drum map (loads from JSON config if not cached)
 */
export declare const getGMDrumMap: () => Promise<GMDrumNote[]>;
/**
 * Get GM drum kits (loads from JSON config if not cached)
 */
export declare const getGMDrumKits: () => Promise<GMDrumKit[]>;
export declare const getInstrumentsByCategory: (category: string) => Promise<GMInstrument[]>;
export declare const getDrumsByCategory: (category: string) => Promise<GMDrumNote[]>;
export declare const getInstrumentByProgram: (program: number) => Promise<GMInstrument | undefined>;
export declare const getDrumByNote: (note: number) => Promise<GMDrumNote | undefined>;
export declare const getInstrumentCategories: () => Promise<string[]>;
export declare const getDrumCategories: () => Promise<string[]>;
export declare class GMSoundLibrary {
    private keyboard;
    private currentMode;
    private selectorElement;
    constructor(keyboard: VirtualMidiKeyboard);
    /**
     * Create the unified sound selector UI
     */
    createSelector(containerId: string): Promise<void>;
    /**
     * Create mode selector (Instruments/Drums)
     */
    private createModeSelector;
    /**
     * Set the current mode (instruments or drums)
     */
    setMode(mode: 'instrument' | 'drums'): Promise<void>;
    private showInstruments;
    private showDrums;
    private createInstrumentCategoryFilter;
    private createDrumCategoryFilter;
    private displayInstruments;
    private displayDrumMap;
    private createDrumKitSelector;
    /**
     * Select GM instrument
     */
    selectInstrument(program: number): void;
    /**
     * Select drum kit
     */
    selectDrumKit(program: number): void;
    /**
     * Trigger drum sound
     */
    triggerDrum(note: number): void;
    /**
     * Get current mode
     */
    getCurrentMode(): 'instrument' | 'drums';
    /**
     * Add CSS styles for the library
     */
    private addLibraryStyles;
}
//# sourceMappingURL=gm-sound-library.d.ts.map