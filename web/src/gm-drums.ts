/**
 * General MIDI Drum Kit Definitions
 * Part of AWE Player EMU8000 Emulator
 */

// General MIDI Drum Kit note mappings (Channel 10)
export const GM_DRUM_MAP = [
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

// Standard GM Drum Kits (Program Change on Channel 10)
export const GM_DRUM_KITS = [
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

export class GMDrumSelector {
    private currentKit = 0;
    private selectorElement: HTMLElement | null = null;
    private midiBridge: any; // Will be typed when integrated
    
    constructor(midiBridge: any) {
        this.midiBridge = midiBridge;
    }
    
    /**
     * Create the drum kit selector UI
     */
    public createSelector(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) {
            this.logToDebug(`Error: Container ${containerId} not found`);
            return;
        }
        
        this.selectorElement = document.createElement('div');
        this.selectorElement.className = 'gm-drum-selector';
        
        // Create drum kit selector
        const kitSelector = this.createKitSelector();
        
        // Create drum map display
        const drumMap = this.createDrumMapDisplay();
        
        this.selectorElement.appendChild(kitSelector);
        this.selectorElement.appendChild(drumMap);
        
        container.appendChild(this.selectorElement);
        
        this.addDrumStyles();
    }
    
    /**
     * Create drum kit dropdown
     */
    private createKitSelector(): HTMLElement {
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
            this.selectKit(parseInt(target.value));
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }
    
    /**
     * Create drum map display showing all drum sounds
     */
    private createDrumMapDisplay(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'drum-map-container';
        
        const title = document.createElement('h3');
        title.textContent = 'GM Drum Map (Channel 10)';
        container.appendChild(title);
        
        // Category filter
        const categoryFilter = this.createCategoryFilter();
        container.appendChild(categoryFilter);
        
        // Drum map grid
        const mapGrid = document.createElement('div');
        mapGrid.className = 'drum-map-grid';
        mapGrid.id = 'drum-map-grid';
        
        this.displayDrumMap();
        
        container.appendChild(mapGrid);
        
        return container;
    }
    
    /**
     * Create category filter for drum sounds
     */
    private createCategoryFilter(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'drum-category-filter';
        
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
    
    /**
     * Display drum map
     */
    private displayDrumMap(drums = GM_DRUM_MAP): void {
        const grid = document.getElementById('drum-map-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        drums.forEach(drum => {
            const item = document.createElement('div');
            item.className = 'drum-item';
            item.dataset.note = drum.note.toString();
            
            // Note number
            const noteSpan = document.createElement('span');
            noteSpan.className = 'drum-note';
            noteSpan.textContent = drum.note.toString();
            
            // Drum name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'drum-name';
            nameSpan.textContent = drum.name;
            
            // Category badge
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
            
            // Touch support
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playDrumNote(drum.note);
                item.classList.add('active');
            });
            
            item.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopDrumNote(drum.note);
                item.classList.remove('active');
            });
            
            grid.appendChild(item);
        });
    }
    
    /**
     * Filter drums by category
     */
    private filterDrumsByCategory(category: string): void {
        if (category === 'All') {
            this.displayDrumMap();
        } else {
            const filtered = GM_DRUM_MAP.filter(d => d.category === category);
            this.displayDrumMap(filtered);
        }
    }
    
    /**
     * Select a drum kit
     */
    private selectKit(program: number): void {
        this.currentKit = program;
        
        // Send program change on channel 10 (9 in 0-based)
        this.midiBridge.sendProgramChange(9, program);
        
        const kit = GM_DRUM_KITS.find(k => k.program === program);
        if (kit) {
            this.logToDebug(`Selected drum kit: ${kit.name} (Program ${program})`);
        }
    }
    
    /**
     * Play a drum note
     */
    private playDrumNote(note: number): void {
        // Channel 10 (9 in 0-based) for drums
        this.midiBridge.sendNoteOn(9, note, 100);
        
        const drum = GM_DRUM_MAP.find(d => d.note === note);
        if (drum) {
            this.logToDebug(`Drum hit: ${drum.name} (Note ${note})`);
        }
    }
    
    /**
     * Stop a drum note
     */
    private stopDrumNote(note: number): void {
        // Channel 10 (9 in 0-based) for drums
        this.midiBridge.sendNoteOff(9, note);
    }
    
    /**
     * Add CSS styles for drum selector
     */
    private addDrumStyles(): void {
        if (document.getElementById('gm-drum-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'gm-drum-styles';
        style.textContent = `
            .gm-drum-selector {
                background: #333;
                border-radius: 5px;
                padding: 10px;
                color: white;
                max-width: 600px;
            }
            
            .drum-kit-selector {
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .kit-select {
                flex: 1;
                padding: 6px;
                border: 1px solid #555;
                border-radius: 3px;
                background: #222;
                color: white;
            }
            
            .drum-map-container h3 {
                margin: 10px 0;
                color: #ccc;
            }
            
            .drum-category-filter {
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
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
            
            .drum-item {
                padding: 8px;
                border: 1px solid #444;
                border-radius: 3px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 4px;
                transition: all 0.1s;
                background: #2a2a2a;
            }
            
            .drum-item:hover {
                background: #444;
                border-color: #666;
            }
            
            .drum-item.active {
                background: #05a;
                border-color: #07c;
                transform: scale(0.98);
            }
            
            .drum-note {
                font-family: monospace;
                font-size: 14px;
                color: #888;
                font-weight: bold;
            }
            
            .drum-item.active .drum-note {
                color: #fff;
            }
            
            .drum-name {
                font-size: 13px;
                color: #ddd;
            }
            
            .drum-category {
                font-size: 11px;
                color: #666;
                background: #1a1a1a;
                padding: 2px 6px;
                border-radius: 3px;
                align-self: flex-start;
            }
            
            .drum-item.active .drum-category {
                background: #048;
                color: #ccc;
            }
            
            /* Scrollbar styling */
            .drum-map-grid::-webkit-scrollbar {
                width: 8px;
            }
            
            .drum-map-grid::-webkit-scrollbar-track {
                background: #222;
            }
            
            .drum-map-grid::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 4px;
            }
            
            .drum-map-grid::-webkit-scrollbar-thumb:hover {
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
            debugLog.value += `[GM Drums] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}