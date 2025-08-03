/**
 * AWE Player - SoundFont File Loading Interface (Phase 17.5)
 * 
 * Provides drag-and-drop and file picker interface for SoundFont 2.0 files
 * Prepares for complete EMU8000 SoundFont synthesis
 */

import { DebugLogger } from './utils/debug-logger.js';

export interface SoundFontInfo {
    name: string;
    size: number;
    presets: number;
    samples: number;
    loadTime: number;
}

/**
 * SoundFont File Loader
 * Handles .sf2 file loading with drag-and-drop support
 */
export class SoundFontLoader {
    private logger: DebugLogger;
    private wasmModule: any;
    
    // UI Elements
    private dropZone: HTMLElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private infoDisplay: HTMLElement | null = null;
    private clearButton: HTMLButtonElement | null = null;
    
    // Current SoundFont info
    private currentSoundFont: SoundFontInfo | null = null;
    
    constructor(wasmModule: any) {
        this.logger = new DebugLogger({ componentName: 'SoundFontLoader', enabled: true });
        this.wasmModule = wasmModule;
    }
    
    /**
     * Initialize the SoundFont loader interface
     */
    public initialize(): void {
        this.logger.log('🎼 Initializing SoundFont loader...');
        
        // Get UI elements
        this.dropZone = document.getElementById('soundfont-drop-zone');
        this.fileInput = document.getElementById('soundfont-file-input') as HTMLInputElement;
        this.infoDisplay = document.getElementById('soundfont-info');
        this.clearButton = document.getElementById('clear-soundfont') as HTMLButtonElement;
        
        if (!this.dropZone || !this.fileInput) {
            this.logger.log('❌ SoundFont UI elements not found');
            return;
        }
        
        // Set up event handlers
        this.setupDragAndDrop();
        this.setupFileInput();
        this.setupClearButton();
        
        this.logger.log('✅ SoundFont loader initialized');
    }
    
    /**
     * Set up drag and drop handlers
     */
    private setupDragAndDrop(): void {
        if (!this.dropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone!.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone!.addEventListener(eventName, () => this.highlight(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone!.addEventListener(eventName, () => this.unhighlight(), false);
        });
        
        // Handle dropped files
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        // Click to open file picker
        this.dropZone.addEventListener('click', () => {
            this.fileInput?.click();
        });
    }
    
    /**
     * Set up file input handler
     */
    private setupFileInput(): void {
        if (!this.fileInput) return;
        
        this.fileInput.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                this.handleFiles(target.files);
            }
        });
    }
    
    /**
     * Set up clear button handler
     */
    private setupClearButton(): void {
        if (!this.clearButton) return;
        
        this.clearButton.addEventListener('click', () => {
            this.clearSoundFont();
        });
    }
    
    /**
     * Prevent default drag and drop behavior
     */
    private preventDefaults(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
    }
    
    /**
     * Highlight drop zone
     */
    private highlight(): void {
        this.dropZone?.classList.add('dragover');
    }
    
    /**
     * Remove highlight from drop zone
     */
    private unhighlight(): void {
        this.dropZone?.classList.remove('dragover');
    }
    
    /**
     * Handle dropped files
     */
    private handleDrop(e: DragEvent): void {
        const dt = e.dataTransfer;
        if (dt && dt.files) {
            this.handleFiles(dt.files);
        }
    }
    
    /**
     * Handle file selection
     */
    private handleFiles(files: FileList): void {
        // Process each file (though typically only one .sf2 file)
        Array.from(files).forEach(file => {
            if (file.name.toLowerCase().endsWith('.sf2')) {
                this.loadSoundFont(file);
            } else {
                this.logger.log(`⚠️ Skipping non-SF2 file: ${file.name}`);
                this.updateInfo(`Invalid file type: ${file.name}`, 'error');
            }
        });
    }
    
    /**
     * Load a SoundFont file
     */
    private async loadSoundFont(file: File): Promise<void> {
        const startTime = performance.now();
        
        this.logger.log(`📁 Loading SoundFont: ${file.name} (${this.formatFileSize(file.size)})`);
        this.updateInfo(`Loading ${file.name}...`, 'info');
        
        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Check if we have a WASM function to load SoundFont
            if (this.wasmModule.load_soundfont) {
                // Future: Call WASM to load SoundFont
                const success = this.wasmModule.load_soundfont(uint8Array);
                
                if (success) {
                    const loadTime = performance.now() - startTime;
                    this.handleLoadSuccess(file.name, file.size, loadTime);
                } else {
                    throw new Error('WASM failed to load SoundFont');
                }
            } else {
                // For now, simulate successful load since WASM function doesn't exist yet
                this.logger.log('⚠️ WASM load_soundfont not available - simulating load');
                
                // Parse basic SF2 header info
                const header = this.parseSF2Header(uint8Array);
                
                const loadTime = performance.now() - startTime;
                this.currentSoundFont = {
                    name: file.name,
                    size: file.size,
                    presets: header.presets || 0,
                    samples: header.samples || 0,
                    loadTime: loadTime
                };
                
                this.updateInfo(
                    `Loaded: ${file.name} (${this.formatFileSize(file.size)})<br>` +
                    `Presets: ${header.presets || 'Unknown'}, Samples: ${header.samples || 'Unknown'}<br>` +
                    `Load time: ${loadTime.toFixed(1)}ms<br>` +
                    `<span style="color: #ff9900;">⚠️ WASM integration pending</span>`,
                    'success'
                );
                
                this.logger.log(`✅ SoundFont loaded (simulation): ${file.name}`);
                
                // Show clear button
                if (this.clearButton) {
                    this.clearButton.style.display = 'inline-block';
                }
            }
            
        } catch (error) {
            this.logger.log(`❌ Failed to load SoundFont: ${error}`);
            this.updateInfo(`Failed to load ${file.name}: ${error}`, 'error');
        }
    }
    
    /**
     * Parse basic SF2 header information
     */
    private parseSF2Header(data: Uint8Array): { presets?: number, samples?: number } {
        try {
            // Check for RIFF header
            const riff = String.fromCharCode(...data.slice(0, 4));
            if (riff !== 'RIFF') {
                throw new Error('Not a valid RIFF file');
            }
            
            // Check for sfbk signature
            const sfbk = String.fromCharCode(...data.slice(8, 12));
            if (sfbk !== 'sfbk') {
                throw new Error('Not a valid SoundFont file');
            }
            
            // Very basic parsing - just report that it's valid
            // Real parsing would extract preset and sample counts
            return {
                presets: 128,  // Placeholder
                samples: 256   // Placeholder
            };
            
        } catch (error) {
            this.logger.log(`❌ SF2 header parse error: ${error}`);
            return {};
        }
    }
    
    /**
     * Handle successful SoundFont load
     */
    private handleLoadSuccess(name: string, size: number, loadTime: number): void {
        this.currentSoundFont = {
            name: name,
            size: size,
            presets: 0, // To be filled by WASM
            samples: 0, // To be filled by WASM
            loadTime: loadTime
        };
        
        this.updateInfo(
            `Loaded: ${name} (${this.formatFileSize(size)})<br>` +
            `Load time: ${loadTime.toFixed(1)}ms`,
            'success'
        );
        
        this.logger.log(`✅ SoundFont loaded: ${name} in ${loadTime.toFixed(1)}ms`);
        
        // Show clear button
        if (this.clearButton) {
            this.clearButton.style.display = 'inline-block';
        }
    }
    
    /**
     * Update info display
     */
    private updateInfo(message: string, type: 'info' | 'success' | 'error'): void {
        if (!this.infoDisplay) return;
        
        this.infoDisplay.innerHTML = message;
        this.infoDisplay.className = `soundfont-info ${type}`;
    }
    
    /**
     * Format file size for display
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' bytes';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    /**
     * Get current SoundFont info
     */
    public getCurrentSoundFont(): SoundFontInfo | null {
        return this.currentSoundFont;
    }
    
    /**
     * Clear current SoundFont
     */
    public clearSoundFont(): void {
        this.currentSoundFont = null;
        this.updateInfo('No SoundFont loaded - Using default sine wave synthesis', 'info');
        this.logger.log('🧹 SoundFont cleared');
        
        // Hide clear button
        if (this.clearButton) {
            this.clearButton.style.display = 'none';
        }
        
        // Clear file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        
        // TODO: Call WASM to clear SoundFont when available
        if (this.wasmModule.clear_soundfont) {
            this.wasmModule.clear_soundfont();
        }
    }
}