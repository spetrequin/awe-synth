/**
 * MIDI CC Control Definitions - JSON Config Version
 * Part of AWE Player EMU8000 Emulator
 */

import { enhancedConfigLoader } from './utils/enhanced-config-loader.js';
import { CCControl as ValidatedCCControl } from './utils/config-validator.js';

// Use validated interface from config validator
export type CCControl = ValidatedCCControl;

// Cache for loaded CC controls
let ccControlsCache: CCControl[] | null = null;

/**
 * Get CC control definitions (loads from JSON config if not cached)
 */
export const getCCControlDefinitions = async (): Promise<CCControl[]> => {
    if (!ccControlsCache) {
        const result = await enhancedConfigLoader.loadConfig<CCControl[]>('midi-cc-controls');
        ccControlsCache = result.data;
    }
    return ccControlsCache;
};

/**
 * Get control by CC number
 */
export const getControlByCC = async (ccNumber: number): Promise<CCControl | undefined> => {
    const controls = await getCCControlDefinitions();
    return controls.find(control => control.cc === ccNumber);
};

/**
 * Get controls by type
 */
export const getControlsByType = async (type: CCControl['type']): Promise<CCControl[]> => {
    const controls = await getCCControlDefinitions();
    return controls.filter(control => control.type === type);
};

/**
 * Get controls by category
 */
export const getControlsByCategory = async (category: string): Promise<CCControl[]> => {
    const controls = await getCCControlDefinitions();
    return controls.filter(control => control.category === category);
};

/**
 * Get all unique categories
 */
export const getControlCategories = async (): Promise<string[]> => {
    const controls = await getCCControlDefinitions();
    const categories = controls
        .map(c => c.category)
        .filter((cat): cat is string => cat !== undefined);
    return [...new Set(categories)];
};

// Control groupings - organized by category from JSON data
export const getControlGroups = async () => {
    const controls = await getCCControlDefinitions();
    const categories = await getControlCategories();
    
    const groups: Record<string, { title: string; controls: CCControl[] }> = {};
    
    categories.forEach(category => {
        const categoryControls = controls.filter(c => c.category === category);
        groups[category] = {
            title: category.charAt(0).toUpperCase() + category.slice(1),
            controls: categoryControls
        };
    });
    
    return groups;
};

// Quick select presets for common instrument setups
export const QUICK_SELECT_CONTROLS = {
    piano: { volume: 100, pan: 64, reverb: 20, chorus: 0 },
    organ: { volume: 110, pan: 64, reverb: 30, chorus: 20 },
    strings: { volume: 90, pan: 64, reverb: 50, chorus: 10 },
    brass: { volume: 105, pan: 64, reverb: 25, chorus: 5 },
    percussion: { volume: 120, pan: 64, reverb: 40, chorus: 0 }
} as const;