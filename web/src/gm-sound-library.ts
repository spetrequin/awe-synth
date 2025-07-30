/**
 * Complete General MIDI Sound Library - Instruments and Drums
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { MIDI_CHANNELS } from './midi-constants.js';
import { enhancedConfigLoader } from './utils/enhanced-config-loader.js';
import { GMInstrument, GMDrumNote, GMDrumKit } from './utils/config-validator.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
import { VELOCITY_CONSTANTS } from './velocity-curves.js';
import { UI_CONSTANTS, MIDI_CC } from './midi-constants.js';
import { createModeSelector, createSelect, createSection, getContainer, injectStyles } from './utils/ui-components.js';
import { generateComponentStyles } from './utils/ui-styles.js';

// ===== INTERFACE DEFINITIONS =====

// Re-export validated interfaces from config validator
export type { GMInstrument, GMDrumNote, GMDrumKit } from './utils/config-validator.js';

// ===== JSON CONFIG LOADERS =====

let gmInstrumentsCache: GMInstrument[] | null = null;
let gmDrumsCache: GMDrumNote[] | null = null;  
let gmDrumKitsCache: GMDrumKit[] | null = null;

/**
 * Get GM instruments (loads from JSON config if not cached)
 */
export const getGMInstruments = async (): Promise<GMInstrument[]> => {
    if (!gmInstrumentsCache) {
        const result = await enhancedConfigLoader.loadConfig<GMInstrument[]>('gm-instruments');
        gmInstrumentsCache = result.data;
    }
    return gmInstrumentsCache;
};

/**
 * Get GM drum map (loads from JSON config if not cached)
 */
export const getGMDrumMap = async (): Promise<GMDrumNote[]> => {
    if (!gmDrumsCache) {
        const result = await enhancedConfigLoader.loadConfig<GMDrumNote[]>('gm-drums');
        gmDrumsCache = result.data;
    }
    return gmDrumsCache;
};

/**
 * Get GM drum kits (loads from JSON config if not cached)
 */
export const getGMDrumKits = async (): Promise<GMDrumKit[]> => {
    if (!gmDrumKitsCache) {
        const result = await enhancedConfigLoader.loadConfig<GMDrumKit[]>('gm-drum-kits');
        gmDrumKitsCache = result.data;
    }
    return gmDrumKitsCache;
};

// ===== UTILITY FUNCTIONS =====

export const getInstrumentsByCategory = async (category: string): Promise<GMInstrument[]> => {
    const instruments = await getGMInstruments();
    return category === 'All' ? instruments : instruments.filter(i => i.category === category);
};

export const getDrumsByCategory = async (category: string): Promise<GMDrumNote[]> => {
    const drums = await getGMDrumMap();
    return category === 'All' ? drums : drums.filter(d => d.category === category);
};

export const getInstrumentByProgram = async (program: number): Promise<GMInstrument | undefined> => {
    const instruments = await getGMInstruments();
    return instruments.find(i => i.program === program);
};

export const getDrumByNote = async (note: number): Promise<GMDrumNote | undefined> => {
    const drums = await getGMDrumMap();
    return drums.find(d => d.note === note);
};

export const getInstrumentCategories = async (): Promise<string[]> => {
    const instruments = await getGMInstruments();
    return ['All', ...new Set(instruments.map(i => i.category))];
};

export const getDrumCategories = async (): Promise<string[]> => {
    const drums = await getGMDrumMap();
    return ['All', ...new Set(drums.map(d => d.category))];
};

// ===== UNIFIED SELECTOR CLASS =====

export class GMSoundLibrary {
    private keyboard: VirtualMidiKeyboard;
    private currentMode: 'instrument' | 'drums' = 'instrument';
    private selectorElement: HTMLElement | null = null;
    
    constructor(keyboard: VirtualMidiKeyboard) {
        this.keyboard = keyboard;
    }
    
    /**
     * Create the unified sound selector UI
     */
    public async createSelector(containerId: string): Promise<void> {
        const container = document.getElementById(containerId);
        if (!container) {
            DEBUG_LOGGERS.soundLibrary.error(`Container ${containerId} not found`);
            return;
        }
        
        this.selectorElement = document.createElement('div');
        this.selectorElement.className = 'gm-sound-library';
        
        // Mode selector
        const modeSelector = this.createModeSelector();
        
        // Content area
        const contentArea = document.createElement('div');
        contentArea.className = 'sound-content';
        contentArea.id = 'sound-content';
        
        this.selectorElement.appendChild(modeSelector);
        this.selectorElement.appendChild(contentArea);
        
        container.appendChild(this.selectorElement);
        
        // Initialize with instruments
        await this.showInstruments();
        
        this.addLibraryStyles();
    }
    
    /**
     * Create mode selector (Instruments/Drums)
     */
    private createModeSelector(): HTMLElement {
        return createModeSelector(
            [
                { id: 'instrument', label: 'Instruments' },
                { id: 'drums', label: 'Drums' }
            ],
            'instrument',
            (modeId) => this.setMode(modeId as 'instrument' | 'drums')
        );
    }
    
    /**
     * Set the current mode (instruments or drums)
     */
    public async setMode(mode: 'instrument' | 'drums'): Promise<void> {
        this.currentMode = mode;
        
        // Update button states
        const buttons = this.selectorElement?.querySelectorAll('.mode-btn');
        buttons?.forEach((btn, index) => {
            btn.classList.toggle('active', index === (mode === 'instrument' ? 0 : 1));
        });
        
        // Update content
        if (mode === 'instrument') {
            await this.showInstruments();
            this.keyboard.setChannel(0); // Regular channel
        } else {
            await this.showDrums();
            this.keyboard.setChannel(MIDI_CHANNELS.DRUM_CHANNEL); // Drum channel
        }
        
        DEBUG_LOGGERS.soundLibrary.log(`Mode changed to: ${mode}`);
    }
    
    private async showInstruments(): Promise<void> {
        const contentArea = document.getElementById('sound-content');
        if (!contentArea) return;
        
        contentArea.innerHTML = '';
        
        // Category filter
        const categoryFilter = await this.createInstrumentCategoryFilter();
        contentArea.appendChild(categoryFilter);
        
        // Instrument list
        const instrumentList = document.createElement('div');
        instrumentList.className = 'instrument-list';
        instrumentList.id = 'instrument-list';
        
        await this.displayInstruments();
        
        contentArea.appendChild(instrumentList);
    }
    
    private async showDrums(): Promise<void> {
        const contentArea = document.getElementById('sound-content');
        if (!contentArea) return;
        
        contentArea.innerHTML = '';
        
        // Drum kit selector
        const kitSelector = await this.createDrumKitSelector();
        contentArea.appendChild(kitSelector);
        
        // Category filter
        const categoryFilter = await this.createDrumCategoryFilter();
        contentArea.appendChild(categoryFilter);
        
        // Drum map
        const drumMap = document.createElement('div');
        drumMap.className = 'drum-map-grid';
        drumMap.id = 'drum-map-grid';
        
        await this.displayDrumMap();
        
        contentArea.appendChild(drumMap);
    }
    
    private async createInstrumentCategoryFilter(): Promise<HTMLElement> {
        const categories = await getInstrumentCategories();
        const categoryOptions = categories.map(category => ({
            value: category,
            text: category,
            selected: category === 'All'
        }));
        
        const select = createSelect(
            categoryOptions,
            async (category) => await this.displayInstruments(category),
            'category-select'
        );
        
        const container = createSection({
            title: '',
            className: 'category-filter',
            content: [
                document.createTextNode('Category: '),
                select
            ]
        });
        
        return container;
    }
    
    private async createDrumCategoryFilter(): Promise<HTMLElement> {
        const categories = await getDrumCategories();
        const categoryOptions = categories.map(category => ({
            value: category,
            text: category,
            selected: category === 'All'
        }));
        
        const select = createSelect(
            categoryOptions,
            async (category) => await this.displayDrumMap(category),
            'category-select'
        );
        
        const container = createSection({
            title: '',
            className: 'category-filter',
            content: [
                document.createTextNode('Category: '),
                select
            ]
        });
        
        return container;
    }
    
    private async displayInstruments(category: string = 'All'): Promise<void> {
        const instrumentList = document.getElementById('instrument-list');
        if (!instrumentList) return;
        
        instrumentList.innerHTML = '';
        
        const instruments = await getInstrumentsByCategory(category);
        
        instruments.forEach(instrument => {
            const item = document.createElement('div');
            item.className = 'instrument-item';
            item.innerHTML = `
                <span class="program-number">${instrument.program.toString().padStart(3, '0')}</span>
                <span class="instrument-name">${instrument.name}</span>
                <span class="instrument-category">${instrument.category}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectInstrument(instrument.program);
                
                // Update visual selection
                instrumentList.querySelectorAll('.instrument-item').forEach(el => 
                    el.classList.remove('selected'));
                item.classList.add('selected');
            });
            
            instrumentList.appendChild(item);
        });
    }
    
    private async displayDrumMap(category: string = 'All'): Promise<void> {
        const drumGrid = document.getElementById('drum-map-grid');
        if (!drumGrid) return;
        
        drumGrid.innerHTML = '';
        
        const drums = await getDrumsByCategory(category);
        
        drums.forEach(drum => {
            const item = document.createElement('div');
            item.className = 'drum-item';
            item.innerHTML = `
                <span class="note-number">${drum.note}</span>
                <span class="drum-name">${drum.name}</span>
                <span class="drum-category">${drum.category}</span>
            `;
            
            item.addEventListener('click', () => {
                this.triggerDrum(drum.note);
                
                // Visual feedback
                item.classList.add('triggered');
                setTimeout(() => item.classList.remove('triggered'), UI_CONSTANTS.VISUAL_FEEDBACK_DURATION_MS);
            });
            
            drumGrid.appendChild(item);
        });
    }
    
    private async createDrumKitSelector(): Promise<HTMLElement> {
        const drumKits = await getGMDrumKits();
        const kitOptions = drumKits.map(kit => ({
            value: kit.program.toString(),
            text: `${kit.name} - ${kit.description}`
        }));
        
        const select = createSelect(
            kitOptions,
            (value) => this.selectDrumKit(parseInt(value)),
            'kit-select'
        );
        
        const container = createSection({
            title: '',
            className: 'drum-kit-selector',
            content: [
                document.createTextNode('Drum Kit: '),
                select
            ]
        });
        
        return container;
    }
    
    /**
     * Select GM instrument
     */
    public selectInstrument(program: number): void {
        this.keyboard.setProgram(program);
        DEBUG_LOGGERS.soundLibrary.log(`Selected instrument: ${program}`);
    }
    
    /**
     * Select drum kit
     */
    public selectDrumKit(program: number): void {
        this.keyboard.setProgram(program);
        DEBUG_LOGGERS.soundLibrary.log(`Selected drum kit: ${program}`);
    }
    
    /**
     * Trigger drum sound
     */
    public triggerDrum(note: number): void {
        const velocity = VELOCITY_CONSTANTS.DRUM_TRIGGER;
        this.keyboard.handleKeyPress(note, new MouseEvent('click'));
        setTimeout(() => this.keyboard.handleKeyRelease(note), UI_CONSTANTS.DRUM_TRIGGER_DURATION_MS);
    }
    
    /**
     * Get current mode
     */
    public getCurrentMode(): 'instrument' | 'drums' {
        return this.currentMode;
    }
    
    /**
     * Add CSS styles for the library
     */
    private addLibraryStyles(): void {
        const customStyles = `
            .sound-content {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .category-filter {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .instrument-list, .drum-map-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(${UI_CONSTANTS.GRID_MIN_COLUMN_WIDTH_INSTRUMENTS}px, 1fr));
                gap: 8px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .instrument-item, .drum-item {
                display: grid;
                grid-template-columns: 50px 1fr 120px;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: #333;
                border: 1px solid #444;
                border-radius: 3px;
                cursor: pointer;
                transition: all 0.1s;
                font-size: 14px;
            }
            
            .instrument-item:hover, .drum-item:hover {
                background: #444;
                border-color: #555;
            }
            
            .instrument-item.selected, .drum-item.triggered {
                background: #05a;
                border-color: #07c;
            }
            
            .program-number, .note-number {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                color: #aaa;
                text-align: center;
            }
            
            .instrument-name, .drum-name {
                font-weight: bold;
                color: white;
            }
            
            .instrument-category, .drum-category {
                font-size: 12px;
                color: #888;
                text-align: right;
            }
            
            .drum-kit-selector {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
                padding: 10px;
                background: #333;
                border-radius: 5px;
            }
        `;
        
        const componentStyles = generateComponentStyles('GMSoundLibrary', customStyles);
        injectStyles('gm-sound-library-styles', componentStyles);
    }
    
}