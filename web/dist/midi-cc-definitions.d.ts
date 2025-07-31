/**
 * MIDI CC Control Definitions - JSON Config Version
 * Part of AWE Player EMU8000 Emulator
 */
import { CCControl as ValidatedCCControl } from './utils/config-validator.js';
export type CCControl = ValidatedCCControl;
/**
 * Get CC control definitions (loads from JSON config if not cached)
 */
export declare const getCCControlDefinitions: () => Promise<CCControl[]>;
/**
 * Get control by CC number
 */
export declare const getControlByCC: (ccNumber: number) => Promise<CCControl | undefined>;
/**
 * Get controls by type
 */
export declare const getControlsByType: (type: CCControl["type"]) => Promise<CCControl[]>;
/**
 * Get controls by category
 */
export declare const getControlsByCategory: (category: string) => Promise<CCControl[]>;
/**
 * Get all unique categories
 */
export declare const getControlCategories: () => Promise<string[]>;
export declare const getControlGroups: () => Promise<Record<string, {
    title: string;
    controls: CCControl[];
}>>;
export declare const QUICK_SELECT_CONTROLS: {
    readonly piano: {
        readonly volume: 100;
        readonly pan: 64;
        readonly reverb: 20;
        readonly chorus: 0;
    };
    readonly organ: {
        readonly volume: 110;
        readonly pan: 64;
        readonly reverb: 30;
        readonly chorus: 20;
    };
    readonly strings: {
        readonly volume: 90;
        readonly pan: 64;
        readonly reverb: 50;
        readonly chorus: 10;
    };
    readonly brass: {
        readonly volume: 105;
        readonly pan: 64;
        readonly reverb: 25;
        readonly chorus: 5;
    };
    readonly percussion: {
        readonly volume: 120;
        readonly pan: 64;
        readonly reverb: 40;
        readonly chorus: 0;
    };
};
//# sourceMappingURL=midi-cc-definitions.d.ts.map