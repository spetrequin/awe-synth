/**
 * Complete General MIDI Sound Library - JSON Config Version
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { MIDI_CHANNELS } from './midi-constants.js';
import { configLoader } from './config-loader.js';

// ===== INTERFACE DEFINITIONS =====

export interface GMInstrument {
    program: number;
    name: string;
    category: string;
}

export interface GMDrumNote {
    note: number;
    name: string;
    category: string;
}

export interface GMDrumKit {
    program: number;
    name: string;
    description: string;
}

// ===== JSON CONFIG LOADERS =====

let gmInstrumentsCache: GMInstrument[] | null = null;
let gmDrumsCache: GMDrumNote[] | null = null;  
let gmDrumKitsCache: GMDrumKit[] | null = null;

/**
 * Get GM instruments (loads from JSON config if not cached)
 */
export const getGMInstruments = async (): Promise<GMInstrument[]> => {
    if (!gmInstrumentsCache) {
        gmInstrumentsCache = await configLoader.loadConfig<GMInstrument[]>('gm-instruments');
    }
    return gmInstrumentsCache;
};

/**
 * Get GM drum map (loads from JSON config if not cached)
 */
export const getGMDrumMap = async (): Promise<GMDrumNote[]> => {
    if (!gmDrumsCache) {
        gmDrumsCache = await configLoader.loadConfig<GMDrumNote[]>('gm-drums');
    }
    return gmDrumsCache;
};

/**
 * Get GM drum kits (loads from JSON config if not cached)
 */
export const getGMDrumKits = async (): Promise<GMDrumKit[]> => {
    if (!gmDrumKitsCache) {
        gmDrumKitsCache = await configLoader.loadConfig<GMDrumKit[]>('gm-drum-kits');
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
            this.logToDebug(`Error: Container ${containerId} not found`);
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
        const container = document.createElement('div');
        container.className = 'mode-selector';
        
        const instrumentBtn = document.createElement('button');
        instrumentBtn.className = 'mode-btn active';
        instrumentBtn.textContent = 'Instruments';
        instrumentBtn.addEventListener('click', () => this.setMode('instrument'));
        
        const drumBtn = document.createElement('button');
        drumBtn.className = 'mode-btn';
        drumBtn.textContent = 'Drums';
        drumBtn.addEventListener('click', () => this.setMode('drums'));
        
        container.appendChild(instrumentBtn);
        container.appendChild(drumBtn);
        
        return container;
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
        
        this.logToDebug(`Mode changed to: ${mode}`);
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
        const container = document.createElement('div');
        container.className = 'category-filter';
        
        const label = document.createElement('label');
        label.textContent = 'Category: ';
        
        const select = document.createElement('select');
        select.className = 'category-select';
        
        const categories = await getInstrumentCategories();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.addEventListener('change', async (e) => {
            const category = (e.target as HTMLSelectElement).value;
            await this.displayInstruments(category);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    private async createDrumCategoryFilter(): Promise<HTMLElement> {
        const container = document.createElement('div');
        container.className = 'category-filter';
        
        const label = document.createElement('label');
        label.textContent = 'Category: ';
        
        const select = document.createElement('select');
        select.className = 'category-select';
        
        const categories = await getDrumCategories();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.addEventListener('change', async (e) => {
            const category = (e.target as HTMLSelectElement).value;
            await this.displayDrumMap(category);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
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
                setTimeout(() => item.classList.remove('triggered'), 200);
            });
            
            drumGrid.appendChild(item);
        });
    }
    
    private async createDrumKitSelector(): Promise<HTMLElement> {
        const container = document.createElement('div');
        container.className = 'drum-kit-selector';
        
        const label = document.createElement('label');
        label.textContent = 'Drum Kit: ';
        
        const select = document.createElement('select');
        select.className = 'kit-select';
        
        const drumKits = await getGMDrumKits();
        drumKits.forEach(kit => {
            const option = document.createElement('option');
            option.value = kit.program.toString();
            option.textContent = `${kit.name} - ${kit.description}`;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const program = parseInt((e.target as HTMLSelectElement).value);
            this.selectDrumKit(program);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    /**
     * Select GM instrument
     */
    public selectInstrument(program: number): void {
        this.keyboard.setProgram(program);
        this.logToDebug(`Selected instrument: ${program}`);
    }
    
    /**
     * Select drum kit
     */
    public selectDrumKit(program: number): void {
        this.keyboard.setProgram(program);
        this.logToDebug(`Selected drum kit: ${program}`);
    }
    
    /**
     * Trigger drum sound
     */
    public triggerDrum(note: number): void {
        const velocity = 100;
        this.keyboard.handleKeyPress(note, new MouseEvent('click'));
        setTimeout(() => this.keyboard.handleKeyRelease(note), 150);
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
        if (document.getElementById('gm-sound-library-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'gm-sound-library-styles';
        style.textContent = `
            .gm-sound-library {
                background: #2a2a2a;
                border-radius: 5px;
                padding: 15px;
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
            }
            
            .mode-selector {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid #444;
                padding-bottom: 15px;
            }
            
            .mode-btn {
                padding: 10px 20px;
                border: 2px solid #555;
                border-radius: 5px;
                background: #333;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 16px;
                font-weight: bold;
            }
            
            .mode-btn:hover {
                background: #444;
                border-color: #666;
            }
            
            .mode-btn.active {
                background: #05a;
                border-color: #07c;
            }
            
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
            
            .category-filter label {
                font-weight: bold;
                color: #ccc;
            }
            
            .category-select, .kit-select {
                padding: 8px 12px;
                border: 1px solid #555;
                border-radius: 3px;
                background: #333;
                color: white;
                font-size: 14px;
            }
            
            .instrument-list, .drum-map-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
            
            .drum-kit-selector label {
                font-weight: bold;
                color: #ccc;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Log to debug textarea
     */
    private logToDebug(message: string): void {
        const debugLog = document.getElementById('debug-log') as HTMLTextAreaElement;
        if (debugLog) {
            debugLog.value += `[GM Sound Library] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}