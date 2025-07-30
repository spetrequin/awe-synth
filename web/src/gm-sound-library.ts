/**
 * Complete General MIDI Sound Library - Instruments and Drums
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { MIDI_CHANNELS } from './midi-constants.js';

// ===== INSTRUMENT DEFINITIONS =====

export interface GMInstrument {
    program: number;
    name: string;
    category: string;
}

export const GM_INSTRUMENTS: GMInstrument[] = [
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

// ===== DRUM DEFINITIONS =====

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

export const GM_DRUM_MAP: GMDrumNote[] = [
    // Bass Drums (35-36)
    { note: 35, name: "Acoustic Bass Drum", category: "Bass Drum" },
    { note: 36, name: "Bass Drum 1", category: "Bass Drum" },
    
    // Snare (37-40)
    { note: 37, name: "Side Stick", category: "Snare" },
    { note: 38, name: "Acoustic Snare", category: "Snare" },
    { note: 39, name: "Hand Clap", category: "Snare" },
    { note: 40, name: "Electric Snare", category: "Snare" },
    
    // Toms (41-50)
    { note: 41, name: "Low Floor Tom", category: "Tom" },
    { note: 42, name: "Closed Hi-Hat", category: "Hi-Hat" },
    { note: 43, name: "High Floor Tom", category: "Tom" },
    { note: 44, name: "Pedal Hi-Hat", category: "Hi-Hat" },
    { note: 45, name: "Low Tom", category: "Tom" },
    { note: 46, name: "Open Hi-Hat", category: "Hi-Hat" },
    { note: 47, name: "Low-Mid Tom", category: "Tom" },
    { note: 48, name: "Hi-Mid Tom", category: "Tom" },
    { note: 49, name: "Crash Cymbal 1", category: "Cymbal" },
    { note: 50, name: "High Tom", category: "Tom" },
    
    // Cymbals (51-59)
    { note: 51, name: "Ride Cymbal 1", category: "Cymbal" },
    { note: 52, name: "Chinese Cymbal", category: "Cymbal" },
    { note: 53, name: "Ride Bell", category: "Cymbal" },
    { note: 54, name: "Tambourine", category: "Percussion" },
    { note: 55, name: "Splash Cymbal", category: "Cymbal" },
    { note: 56, name: "Cowbell", category: "Percussion" },
    { note: 57, name: "Crash Cymbal 2", category: "Cymbal" },
    { note: 58, name: "Vibraslap", category: "Percussion" },
    { note: 59, name: "Ride Cymbal 2", category: "Cymbal" },
    
    // Latin Percussion (60-69)
    { note: 60, name: "Hi Bongo", category: "Latin" },
    { note: 61, name: "Low Bongo", category: "Latin" },
    { note: 62, name: "Mute Hi Conga", category: "Latin" },
    { note: 63, name: "Open Hi Conga", category: "Latin" },
    { note: 64, name: "Low Conga", category: "Latin" },
    { note: 65, name: "High Timbale", category: "Latin" },
    { note: 66, name: "Low Timbale", category: "Latin" },
    { note: 67, name: "High Agogo", category: "Latin" },
    { note: 68, name: "Low Agogo", category: "Latin" },
    { note: 69, name: "Cabasa", category: "Latin" },
    
    // Misc Percussion (70-81)
    { note: 70, name: "Maracas", category: "Percussion" },
    { note: 71, name: "Short Whistle", category: "Effects" },
    { note: 72, name: "Long Whistle", category: "Effects" },
    { note: 73, name: "Short Guiro", category: "Percussion" },
    { note: 74, name: "Long Guiro", category: "Percussion" },
    { note: 75, name: "Claves", category: "Percussion" },
    { note: 76, name: "Hi Wood Block", category: "Percussion" },
    { note: 77, name: "Low Wood Block", category: "Percussion" },
    { note: 78, name: "Mute Cuica", category: "Effects" },
    { note: 79, name: "Open Cuica", category: "Effects" },
    { note: 80, name: "Mute Triangle", category: "Percussion" },
    { note: 81, name: "Open Triangle", category: "Percussion" }
];

export const GM_DRUM_KITS: GMDrumKit[] = [
    { program: 0, name: "Standard Kit", description: "Default GM drum kit" },
    { program: 8, name: "Room Kit", description: "Drums with room ambience" },
    { program: 16, name: "Power Kit", description: "Punchy, powerful drums" },
    { program: 24, name: "Electronic Kit", description: "Electronic/synthetic drums" },
    { program: 25, name: "TR-808 Kit", description: "Classic 808 sounds" },
    { program: 32, name: "Jazz Kit", description: "Brush and jazz drums" },
    { program: 40, name: "Brush Kit", description: "Soft brush drums" },
    { program: 48, name: "Orchestra Kit", description: "Orchestral percussion" },
    { program: 56, name: "SFX Kit", description: "Sound effects kit" }
];

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
    public createSelector(containerId: string): void {
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
        this.showInstruments();
        
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
    public setMode(mode: 'instrument' | 'drums'): void {
        this.currentMode = mode;
        
        // Update button states
        const buttons = this.selectorElement?.querySelectorAll('.mode-btn');
        buttons?.forEach((btn, index) => {
            btn.classList.toggle('active', index === (mode === 'instrument' ? 0 : 1));
        });
        
        // Update content
        if (mode === 'instrument') {
            this.showInstruments();
            this.keyboard.setChannel(0); // Regular channel
        } else {
            this.showDrums();
            this.keyboard.setChannel(MIDI_CHANNELS.DRUM_CHANNEL); // Drum channel
        }
        
        this.logToDebug(`Mode changed to: ${mode}`);
    }
    
    private showInstruments(): void {
        const contentArea = document.getElementById('sound-content');
        if (!contentArea) return;
        
        contentArea.innerHTML = '';
        
        // Category filter
        const categoryFilter = this.createInstrumentCategoryFilter();
        contentArea.appendChild(categoryFilter);
        
        // Search box
        const searchBox = this.createSearchBox((term) => this.filterInstruments(term));
        contentArea.appendChild(searchBox);
        
        // Instrument list
        const instrumentList = document.createElement('div');
        instrumentList.className = 'instrument-list';
        instrumentList.id = 'instrument-list';
        
        this.displayInstruments();
        
        contentArea.appendChild(instrumentList);
    }
    
    private showDrums(): void {
        const contentArea = document.getElementById('sound-content');
        if (!contentArea) return;
        
        contentArea.innerHTML = '';
        
        // Drum kit selector
        const kitSelector = this.createDrumKitSelector();
        contentArea.appendChild(kitSelector);
        
        // Category filter
        const categoryFilter = this.createDrumCategoryFilter();
        contentArea.appendChild(categoryFilter);
        
        // Drum map
        const drumMap = document.createElement('div');
        drumMap.className = 'drum-map-grid';
        drumMap.id = 'drum-map-grid';
        
        this.displayDrumMap();
        
        contentArea.appendChild(drumMap);
    }
    
    private createInstrumentCategoryFilter(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'category-filter';
        
        const label = document.createElement('label');
        label.textContent = 'Category: ';
        
        const select = document.createElement('select');
        select.className = 'category-select';
        
        const categories = ['All', ...new Set(GM_INSTRUMENTS.map(i => i.category))];
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.filterInstrumentsByCategory(target.value);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    private createDrumKitSelector(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'drum-kit-selector';
        
        const label = document.createElement('label');
        label.textContent = 'Drum Kit: ';
        
        const select = document.createElement('select');
        select.className = 'kit-select';
        
        GM_DRUM_KITS.forEach(kit => {
            const option = document.createElement('option');
            option.value = kit.program.toString();
            option.textContent = `${kit.name} - ${kit.description}`;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.selectDrumKit(parseInt(target.value));
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    private createDrumCategoryFilter(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'category-filter';
        
        const label = document.createElement('label');
        label.textContent = 'Filter: ';
        
        const select = document.createElement('select');
        select.className = 'category-select';
        
        const categories = ['All', ...new Set(GM_DRUM_MAP.map(d => d.category))];
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.filterDrumsByCategory(target.value);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    private createSearchBox(onSearch: (term: string) => void): HTMLElement {
        const container = document.createElement('div');
        container.className = 'search-box';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Search...';
        input.className = 'search-input';
        
        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            onSearch(target.value);
        });
        
        container.appendChild(input);
        return container;
    }
    
    private displayInstruments(instruments = GM_INSTRUMENTS): void {
        const list = document.getElementById('instrument-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        instruments.forEach(instrument => {
            const item = this.createInstrumentItem(instrument);
            list.appendChild(item);
        });
    }
    
    private displayDrumMap(drums = GM_DRUM_MAP): void {
        const grid = document.getElementById('drum-map-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        drums.forEach(drum => {
            const item = this.createDrumItem(drum);
            grid.appendChild(item);
        });
    }
    
    private createInstrumentItem(instrument: GMInstrument): HTMLElement {
        const item = document.createElement('div');
        item.className = 'instrument-item';
        item.dataset.program = instrument.program.toString();
        
        const programSpan = document.createElement('span');
        programSpan.className = 'program-number';
        programSpan.textContent = instrument.program.toString().padStart(3, '0');
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'instrument-name';
        nameSpan.textContent = instrument.name;
        
        item.appendChild(programSpan);
        item.appendChild(nameSpan);
        
        item.addEventListener('click', () => {
            this.selectInstrument(instrument.program);
        });
        
        return item;
    }
    
    private createDrumItem(drum: GMDrumNote): HTMLElement {
        const item = document.createElement('div');
        item.className = 'drum-item';
        item.dataset.note = drum.note.toString();
        
        const noteSpan = document.createElement('span');
        noteSpan.className = 'drum-note';
        noteSpan.textContent = drum.note.toString();
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'drum-name';
        nameSpan.textContent = drum.name;
        
        const categorySpan = document.createElement('span');
        categorySpan.className = 'drum-category';
        categorySpan.textContent = drum.category;
        
        item.appendChild(noteSpan);
        item.appendChild(nameSpan);
        item.appendChild(categorySpan);
        
        // Click to play drum sound
        item.addEventListener('mousedown', () => {
            this.playDrumNote(drum.note);
            item.classList.add('active');
        });
        
        item.addEventListener('mouseup', () => {
            this.stopDrumNote(drum.note);
            item.classList.remove('active');
        });
        
        item.addEventListener('mouseleave', () => {
            this.stopDrumNote(drum.note);
            item.classList.remove('active');
        });
        
        return item;
    }
    
    private selectInstrument(program: number): void {
        this.keyboard.setProgram(program);
        
        // Update visual selection
        const items = document.querySelectorAll('.instrument-item');
        items.forEach(item => {
            item.classList.toggle('selected', 
                item.getAttribute('data-program') === program.toString());
        });
        
        const instrument = GM_INSTRUMENTS.find(i => i.program === program);
        if (instrument) {
            this.logToDebug(`Selected instrument: ${instrument.name} (Program ${program})`);
        }
    }
    
    private selectDrumKit(program: number): void {
        this.keyboard.setProgram(program);
        
        const kit = GM_DRUM_KITS.find(k => k.program === program);
        if (kit) {
            this.logToDebug(`Selected drum kit: ${kit.name} (Program ${program})`);
        }
    }
    
    private playDrumNote(note: number): void {
        this.keyboard.getMidiBridge().sendNoteOn(MIDI_CHANNELS.DRUM_CHANNEL, note, 100);
        
        const drum = GM_DRUM_MAP.find(d => d.note === note);
        if (drum) {
            this.logToDebug(`Drum hit: ${drum.name} (Note ${note})`);
        }
    }
    
    private stopDrumNote(note: number): void {
        this.keyboard.getMidiBridge().sendNoteOff(MIDI_CHANNELS.DRUM_CHANNEL, note);
    }
    
    private filterInstruments(searchTerm: string): void {
        const term = searchTerm.toLowerCase();
        const filtered = GM_INSTRUMENTS.filter(instrument => 
            instrument.name.toLowerCase().includes(term) ||
            instrument.category.toLowerCase().includes(term) ||
            instrument.program.toString().includes(term)
        );
        
        this.displayInstruments(filtered);
    }
    
    private filterInstrumentsByCategory(category: string): void {
        if (category === 'All') {
            this.displayInstruments();
        } else {
            const filtered = GM_INSTRUMENTS.filter(i => i.category === category);
            this.displayInstruments(filtered);
        }
    }
    
    private filterDrumsByCategory(category: string): void {
        if (category === 'All') {
            this.displayDrumMap();
        } else {
            const filtered = GM_DRUM_MAP.filter(d => d.category === category);
            this.displayDrumMap(filtered);
        }
    }
    
    private addLibraryStyles(): void {
        if (document.getElementById('gm-sound-library-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'gm-sound-library-styles';
        style.textContent = `
            .gm-sound-library {
                background: #333;
                border-radius: 5px;
                padding: 15px;
                color: white;
                max-width: 600px;
            }
            
            .mode-selector {
                display: flex;
                gap: 5px;
                margin-bottom: 15px;
            }
            
            .mode-btn {
                flex: 1;
                padding: 8px 16px;
                border: 2px solid #555;
                border-radius: 5px;
                background: #444;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .mode-btn:hover {
                background: #555;
                border-color: #666;
            }
            
            .mode-btn.active {
                background: #05a;
                border-color: #07c;
            }
            
            .category-filter, .drum-kit-selector, .search-box {
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .category-select, .kit-select, .search-input {
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
            
            .drum-map-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 5px;
                max-height: 400px;
                overflow-y: auto;
                border: 1px solid #555;
                border-radius: 3px;
                padding: 10px;
                background: #222;
            }
            
            .instrument-item, .drum-item {
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                gap: 10px;
                border-bottom: 1px solid #444;
                transition: all 0.1s;
                align-items: center;
            }
            
            .instrument-item:hover, .drum-item:hover {
                background: #444;
            }
            
            .instrument-item.selected {
                background: #05a;
                color: white;
            }
            
            .drum-item.active {
                background: #05a;
                border-color: #07c;
                transform: scale(0.98);
            }
            
            .program-number, .drum-note {
                font-family: monospace;
                color: #888;
                width: 30px;
                font-weight: bold;
            }
            
            .instrument-item.selected .program-number,
            .drum-item.active .drum-note {
                color: #ccc;
            }
            
            .instrument-name, .drum-name {
                flex: 1;
            }
            
            .drum-category {
                font-size: 11px;
                color: #666;
                background: #1a1a1a;
                padding: 2px 6px;
                border-radius: 3px;
            }
            
            .drum-item.active .drum-category {
                background: #048;
                color: #ccc;
            }
            
            /* Scrollbar styling */
            .instrument-list::-webkit-scrollbar,
            .drum-map-grid::-webkit-scrollbar {
                width: 8px;
            }
            
            .instrument-list::-webkit-scrollbar-track,
            .drum-map-grid::-webkit-scrollbar-track {
                background: #222;
            }
            
            .instrument-list::-webkit-scrollbar-thumb,
            .drum-map-grid::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 4px;
            }
            
            .instrument-list::-webkit-scrollbar-thumb:hover,
            .drum-map-grid::-webkit-scrollbar-thumb:hover {
                background: #666;
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

// ===== CONVENIENCE EXPORTS =====

// Quick access methods
export const getInstrumentByProgram = (program: number): GMInstrument | undefined => 
    GM_INSTRUMENTS.find(instrument => instrument.program === program);

export const getDrumByNote = (note: number): GMDrumNote | undefined => 
    GM_DRUM_MAP.find(drum => drum.note === note);

export const getInstrumentsByCategory = (category: string): GMInstrument[] => 
    GM_INSTRUMENTS.filter(instrument => instrument.category === category);

export const getDrumsByCategory = (category: string): GMDrumNote[] => 
    GM_DRUM_MAP.filter(drum => drum.category === category);

// Quick select presets
export const INSTRUMENT_PRESETS = {
    piano: () => getInstrumentByProgram(0),
    organ: () => getInstrumentByProgram(16),
    guitar: () => getInstrumentByProgram(24),
    bass: () => getInstrumentByProgram(32),
    strings: () => getInstrumentByProgram(48),
    brass: () => getInstrumentByProgram(56),
    sax: () => getInstrumentByProgram(65),
    flute: () => getInstrumentByProgram(73),
    synth: () => getInstrumentByProgram(80),
    pad: () => getInstrumentByProgram(88)
} as const;