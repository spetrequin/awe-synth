/**
 * AWE Player - SoundFont File Loading Interface (Phase 17.5)
 *
 * Provides drag-and-drop and file picker interface for SoundFont 2.0 files
 * Prepares for complete EMU8000 SoundFont synthesis
 */
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
export declare class SoundFontLoader {
    private logger;
    private wasmModule;
    private dropZone;
    private fileInput;
    private infoDisplay;
    private clearButton;
    private currentSoundFont;
    constructor(wasmModule: any);
    /**
     * Initialize the SoundFont loader interface
     */
    initialize(): void;
    /**
     * Set up drag and drop handlers
     */
    private setupDragAndDrop;
    /**
     * Set up file input handler
     */
    private setupFileInput;
    /**
     * Set up clear button handler
     */
    private setupClearButton;
    /**
     * Prevent default drag and drop behavior
     */
    private preventDefaults;
    /**
     * Highlight drop zone
     */
    private highlight;
    /**
     * Remove highlight from drop zone
     */
    private unhighlight;
    /**
     * Handle dropped files
     */
    private handleDrop;
    /**
     * Handle file selection
     */
    private handleFiles;
    /**
     * Load a SoundFont file
     */
    private loadSoundFont;
    /**
     * Parse basic SF2 header information
     */
    private parseSF2Header;
    /**
     * Handle successful SoundFont load
     */
    private handleLoadSuccess;
    /**
     * Update info display
     */
    private updateInfo;
    /**
     * Format file size for display
     */
    private formatFileSize;
    /**
     * Get current SoundFont info
     */
    getCurrentSoundFont(): SoundFontInfo | null;
    /**
     * Clear current SoundFont
     */
    clearSoundFont(): void;
}
//# sourceMappingURL=soundfont-loader.d.ts.map