/**
 * General MIDI Instrument Selector - All 128 GM instruments
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
export { GMDrumSelector, GM_DRUM_MAP, GM_DRUM_KITS } from './gm-drums.js';

// General MIDI instrument definitions
export const GM_INSTRUMENTS = [
    // Piano (0-7)
    { program: 0, name: "Acoustic Grand Piano", category: "Piano" },
    { program: 1, name: "Bright Acoustic Piano", category: "Piano" },
    { program: 2, name: "Electric Grand Piano", category: "Piano" },
    { program: 3, name: "Honky-tonk Piano", category: "Piano" },
    { program: 4, name: "Electric Piano 1", category: "Piano" },
    { program: 5, name: "Electric Piano 2", category: "Piano" },
    { program: 6, name: "Harpsichord", category: "Piano" },
    { program: 7, name: "Clavinet", category: "Piano" },
    
    // Chromatic Percussion (8-15)
    { program: 8, name: "Celesta", category: "Chromatic Percussion" },
    { program: 9, name: "Glockenspiel", category: "Chromatic Percussion" },
    { program: 10, name: "Music Box", category: "Chromatic Percussion" },
    { program: 11, name: "Vibraphone", category: "Chromatic Percussion" },
    { program: 12, name: "Marimba", category: "Chromatic Percussion" },
    { program: 13, name: "Xylophone", category: "Chromatic Percussion" },
    { program: 14, name: "Tubular Bells", category: "Chromatic Percussion" },
    { program: 15, name: "Dulcimer", category: "Chromatic Percussion" },
    
    // Organ (16-23)
    { program: 16, name: "Drawbar Organ", category: "Organ" },
    { program: 17, name: "Percussive Organ", category: "Organ" },
    { program: 18, name: "Rock Organ", category: "Organ" },
    { program: 19, name: "Church Organ", category: "Organ" },
    { program: 20, name: "Reed Organ", category: "Organ" },
    { program: 21, name: "Accordion", category: "Organ" },
    { program: 22, name: "Harmonica", category: "Organ" },
    { program: 23, name: "Tango Accordion", category: "Organ" },
    
    // Guitar (24-31)
    { program: 24, name: "Acoustic Guitar (nylon)", category: "Guitar" },
    { program: 25, name: "Acoustic Guitar (steel)", category: "Guitar" },
    { program: 26, name: "Electric Guitar (jazz)", category: "Guitar" },
    { program: 27, name: "Electric Guitar (clean)", category: "Guitar" },
    { program: 28, name: "Electric Guitar (muted)", category: "Guitar" },
    { program: 29, name: "Overdriven Guitar", category: "Guitar" },
    { program: 30, name: "Distortion Guitar", category: "Guitar" },
    { program: 31, name: "Guitar Harmonics", category: "Guitar" },
    
    // Bass (32-39)
    { program: 32, name: "Acoustic Bass", category: "Bass" },
    { program: 33, name: "Electric Bass (finger)", category: "Bass" },
    { program: 34, name: "Electric Bass (pick)", category: "Bass" },
    { program: 35, name: "Fretless Bass", category: "Bass" },
    { program: 36, name: "Slap Bass 1", category: "Bass" },
    { program: 37, name: "Slap Bass 2", category: "Bass" },
    { program: 38, name: "Synth Bass 1", category: "Bass" },
    { program: 39, name: "Synth Bass 2", category: "Bass" },
    
    // Strings (40-47)
    { program: 40, name: "Violin", category: "Strings" },
    { program: 41, name: "Viola", category: "Strings" },
    { program: 42, name: "Cello", category: "Strings" },
    { program: 43, name: "Contrabass", category: "Strings" },
    { program: 44, name: "Tremolo Strings", category: "Strings" },
    { program: 45, name: "Pizzicato Strings", category: "Strings" },
    { program: 46, name: "Orchestral Harp", category: "Strings" },
    { program: 47, name: "Timpani", category: "Strings" },
    
    // Ensemble (48-55)
    { program: 48, name: "String Ensemble 1", category: "Ensemble" },
    { program: 49, name: "String Ensemble 2", category: "Ensemble" },
    { program: 50, name: "Synth Strings 1", category: "Ensemble" },
    { program: 51, name: "Synth Strings 2", category: "Ensemble" },
    { program: 52, name: "Choir Aahs", category: "Ensemble" },
    { program: 53, name: "Voice Oohs", category: "Ensemble" },
    { program: 54, name: "Synth Choir", category: "Ensemble" },
    { program: 55, name: "Orchestra Hit", category: "Ensemble" },
    
    // Brass (56-63)
    { program: 56, name: "Trumpet", category: "Brass" },
    { program: 57, name: "Trombone", category: "Brass" },
    { program: 58, name: "Tuba", category: "Brass" },
    { program: 59, name: "Muted Trumpet", category: "Brass" },
    { program: 60, name: "French Horn", category: "Brass" },
    { program: 61, name: "Brass Section", category: "Brass" },
    { program: 62, name: "Synth Brass 1", category: "Brass" },
    { program: 63, name: "Synth Brass 2", category: "Brass" },
    
    // Reed (64-71)
    { program: 64, name: "Soprano Sax", category: "Reed" },
    { program: 65, name: "Alto Sax", category: "Reed" },
    { program: 66, name: "Tenor Sax", category: "Reed" },
    { program: 67, name: "Baritone Sax", category: "Reed" },
    { program: 68, name: "Oboe", category: "Reed" },
    { program: 69, name: "English Horn", category: "Reed" },
    { program: 70, name: "Bassoon", category: "Reed" },
    { program: 71, name: "Clarinet", category: "Reed" },
    
    // Pipe (72-79)
    { program: 72, name: "Piccolo", category: "Pipe" },
    { program: 73, name: "Flute", category: "Pipe" },
    { program: 74, name: "Recorder", category: "Pipe" },
    { program: 75, name: "Pan Flute", category: "Pipe" },
    { program: 76, name: "Blown bottle", category: "Pipe" },
    { program: 77, name: "Shakuhachi", category: "Pipe" },
    { program: 78, name: "Whistle", category: "Pipe" },
    { program: 79, name: "Ocarina", category: "Pipe" },
    
    // Synth Lead (80-87)
    { program: 80, name: "Lead 1 (square)", category: "Synth Lead" },
    { program: 81, name: "Lead 2 (sawtooth)", category: "Synth Lead" },
    { program: 82, name: "Lead 3 (calliope)", category: "Synth Lead" },
    { program: 83, name: "Lead 4 (chiff)", category: "Synth Lead" },
    { program: 84, name: "Lead 5 (charang)", category: "Synth Lead" },
    { program: 85, name: "Lead 6 (voice)", category: "Synth Lead" },
    { program: 86, name: "Lead 7 (fifths)", category: "Synth Lead" },
    { program: 87, name: "Lead 8 (bass + lead)", category: "Synth Lead" },
    
    // Synth Pad (88-95)
    { program: 88, name: "Pad 1 (new age)", category: "Synth Pad" },
    { program: 89, name: "Pad 2 (warm)", category: "Synth Pad" },
    { program: 90, name: "Pad 3 (polysynth)", category: "Synth Pad" },
    { program: 91, name: "Pad 4 (choir)", category: "Synth Pad" },
    { program: 92, name: "Pad 5 (bowed)", category: "Synth Pad" },
    { program: 93, name: "Pad 6 (metallic)", category: "Synth Pad" },
    { program: 94, name: "Pad 7 (halo)", category: "Synth Pad" },
    { program: 95, name: "Pad 8 (sweep)", category: "Synth Pad" },
    
    // Synth Effects (96-103)
    { program: 96, name: "FX 1 (rain)", category: "Synth Effects" },
    { program: 97, name: "FX 2 (soundtrack)", category: "Synth Effects" },
    { program: 98, name: "FX 3 (crystal)", category: "Synth Effects" },
    { program: 99, name: "FX 4 (atmosphere)", category: "Synth Effects" },
    { program: 100, name: "FX 5 (brightness)", category: "Synth Effects" },
    { program: 101, name: "FX 6 (goblins)", category: "Synth Effects" },
    { program: 102, name: "FX 7 (echoes)", category: "Synth Effects" },
    { program: 103, name: "FX 8 (sci-fi)", category: "Synth Effects" },
    
    // Ethnic (104-111)
    { program: 104, name: "Sitar", category: "Ethnic" },
    { program: 105, name: "Banjo", category: "Ethnic" },
    { program: 106, name: "Shamisen", category: "Ethnic" },
    { program: 107, name: "Koto", category: "Ethnic" },
    { program: 108, name: "Kalimba", category: "Ethnic" },
    { program: 109, name: "Bagpipe", category: "Ethnic" },
    { program: 110, name: "Fiddle", category: "Ethnic" },
    { program: 111, name: "Shanai", category: "Ethnic" },
    
    // Percussive (112-119)
    { program: 112, name: "Tinkle Bell", category: "Percussive" },
    { program: 113, name: "Agogo", category: "Percussive" },
    { program: 114, name: "Steel Drums", category: "Percussive" },
    { program: 115, name: "Woodblock", category: "Percussive" },
    { program: 116, name: "Taiko Drum", category: "Percussive" },
    { program: 117, name: "Melodic Tom", category: "Percussive" },
    { program: 118, name: "Synth Drum", category: "Percussive" },
    { program: 119, name: "Reverse Cymbal", category: "Percussive" },
    
    // Sound Effects (120-127)
    { program: 120, name: "Guitar Fret Noise", category: "Sound Effects" },
    { program: 121, name: "Breath Noise", category: "Sound Effects" },
    { program: 122, name: "Seashore", category: "Sound Effects" },
    { program: 123, name: "Bird Tweet", category: "Sound Effects" },
    { program: 124, name: "Telephone Ring", category: "Sound Effects" },
    { program: 125, name: "Helicopter", category: "Sound Effects" },
    { program: 126, name: "Applause", category: "Sound Effects" },
    { program: 127, name: "Gunshot", category: "Sound Effects" }
];

export class GMInstrumentSelector {
    private keyboard: VirtualMidiKeyboard;
    private currentProgram = 0;
    private selectorElement: HTMLElement | null = null;
    
    constructor(keyboard: VirtualMidiKeyboard) {
        this.keyboard = keyboard;
    }
    
    /**
     * Create the instrument selector UI
     */
    public createSelector(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) {
            this.logToDebug(`Error: Container ${containerId} not found`);
            return;
        }
        
        // Create main selector element
        this.selectorElement = document.createElement('div');
        this.selectorElement.className = 'gm-instrument-selector';
        
        // Create category selector
        const categorySelect = this.createCategorySelector();
        
        // Create instrument list
        const instrumentList = document.createElement('div');
        instrumentList.className = 'instrument-list';
        instrumentList.id = 'instrument-list';
        
        // Create search box
        const searchBox = this.createSearchBox();
        
        // Add elements to container
        this.selectorElement.appendChild(searchBox);
        this.selectorElement.appendChild(categorySelect);
        this.selectorElement.appendChild(instrumentList);
        
        container.appendChild(this.selectorElement);
        
        // Initialize with all instruments
        this.displayInstruments();
        
        // Add styles
        this.addSelectorStyles();
    }
    
    /**
     * Create search box for instruments
     */
    private createSearchBox(): HTMLElement {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'instrument-search';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search instruments...';
        searchInput.className = 'search-input';
        
        searchInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.filterInstruments(target.value);
        });
        
        searchContainer.appendChild(searchInput);
        return searchContainer;
    }
    
    /**
     * Create category dropdown
     */
    private createCategorySelector(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'category-selector';
        
        const label = document.createElement('label');
        label.textContent = 'Category: ';
        
        const select = document.createElement('select');
        select.className = 'category-select';
        
        // Get unique categories
        const categories = ['All', ...new Set(GM_INSTRUMENTS.map(i => i.category))];
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.filterByCategory(target.value);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    /**
     * Display instruments in the list
     */
    private displayInstruments(instruments = GM_INSTRUMENTS): void {
        const list = document.getElementById('instrument-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        instruments.forEach(instrument => {
            const item = document.createElement('div');
            item.className = 'instrument-item';
            item.dataset.program = instrument.program.toString();
            
            if (instrument.program === this.currentProgram) {
                item.classList.add('selected');
            }
            
            // Program number
            const programSpan = document.createElement('span');
            programSpan.className = 'program-number';
            programSpan.textContent = instrument.program.toString().padStart(3, '0');
            
            // Instrument name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'instrument-name';
            nameSpan.textContent = instrument.name;
            
            item.appendChild(programSpan);
            item.appendChild(nameSpan);
            
            // Click handler
            item.addEventListener('click', () => {
                this.selectInstrument(instrument.program);
            });
            
            list.appendChild(item);
        });
    }
    
    /**
     * Filter instruments by search term
     */
    private filterInstruments(searchTerm: string): void {
        const term = searchTerm.toLowerCase();
        const filtered = GM_INSTRUMENTS.filter(instrument => 
            instrument.name.toLowerCase().includes(term) ||
            instrument.category.toLowerCase().includes(term) ||
            instrument.program.toString().includes(term)
        );
        
        this.displayInstruments(filtered);
    }
    
    /**
     * Filter instruments by category
     */
    private filterByCategory(category: string): void {
        if (category === 'All') {
            this.displayInstruments();
        } else {
            const filtered = GM_INSTRUMENTS.filter(i => i.category === category);
            this.displayInstruments(filtered);
        }
    }
    
    /**
     * Select an instrument
     */
    private selectInstrument(program: number): void {
        this.currentProgram = program;
        this.keyboard.setProgram(program);
        
        // Update visual selection
        const items = document.querySelectorAll('.instrument-item');
        items.forEach(item => {
            if (item.getAttribute('data-program') === program.toString()) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        const instrument = GM_INSTRUMENTS.find(i => i.program === program);
        if (instrument) {
            this.logToDebug(`Selected instrument: ${instrument.name} (Program ${program})`);
        }
    }
    
    /**
     * Quick select methods for common instruments
     */
    public selectPiano(): void { this.selectInstrument(0); }
    public selectOrgan(): void { this.selectInstrument(16); }
    public selectGuitar(): void { this.selectInstrument(24); }
    public selectBass(): void { this.selectInstrument(32); }
    public selectStrings(): void { this.selectInstrument(48); }
    public selectBrass(): void { this.selectInstrument(56); }
    public selectSax(): void { this.selectInstrument(65); }
    public selectFlute(): void { this.selectInstrument(73); }
    public selectSynth(): void { this.selectInstrument(80); }
    public selectDrums(): void { this.selectInstrument(118); }
    
    /**
     * Add CSS styles for the selector
     */
    private addSelectorStyles(): void {
        if (document.getElementById('gm-selector-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'gm-selector-styles';
        style.textContent = `
            .gm-instrument-selector {
                background: #333;
                border-radius: 5px;
                padding: 10px;
                color: white;
                max-width: 400px;
            }
            
            .instrument-search {
                margin-bottom: 10px;
            }
            
            .search-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #555;
                border-radius: 3px;
                background: #222;
                color: white;
                font-size: 14px;
            }
            
            .category-selector {
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .category-select {
                flex: 1;
                padding: 6px;
                border: 1px solid #555;
                border-radius: 3px;
                background: #222;
                color: white;
            }
            
            .instrument-list {
                max-height: 400px;
                overflow-y: auto;
                border: 1px solid #555;
                border-radius: 3px;
                background: #222;
            }
            
            .instrument-item {
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                gap: 10px;
                border-bottom: 1px solid #444;
                transition: background 0.2s;
            }
            
            .instrument-item:hover {
                background: #444;
            }
            
            .instrument-item.selected {
                background: #05a;
                color: white;
            }
            
            .program-number {
                font-family: monospace;
                color: #888;
                width: 30px;
            }
            
            .instrument-item.selected .program-number {
                color: #ccc;
            }
            
            .instrument-name {
                flex: 1;
            }
            
            /* Scrollbar styling */
            .instrument-list::-webkit-scrollbar {
                width: 8px;
            }
            
            .instrument-list::-webkit-scrollbar-track {
                background: #222;
            }
            
            .instrument-list::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 4px;
            }
            
            .instrument-list::-webkit-scrollbar-thumb:hover {
                background: #666;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Log to debug textarea (not console)
     */
    private logToDebug(message: string): void {
        const debugLog = document.getElementById('debug-log') as HTMLTextAreaElement;
        if (debugLog) {
            debugLog.value += `[GM Selector] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}