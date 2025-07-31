/**
 * MIDI File Loader
 * Basic file input handling for .mid/.midi files
 */
export interface MidiFileInfo {
    name: string;
    size: number;
    format: number;
    trackCount: number;
    division: number;
    duration?: number;
}
export interface LoadProgress {
    phase: 'validation' | 'reading' | 'parsing' | 'complete';
    progress: number;
    message: string;
}
export declare class MidiFileLoader {
    private fileInput;
    private dropZone?;
    private progressIndicator?;
    private onFileLoadedCallback?;
    private onErrorCallback?;
    private onProgressCallback?;
    constructor();
    /**
     * Create the file input element
     */
    private createFileInput;
    /**
     * Set callback for successful file loading
     */
    onFileLoaded(callback: (data: Uint8Array, info: MidiFileInfo) => void): void;
    /**
     * Set callback for error handling
     */
    onError(callback: (error: string) => void): void;
    /**
     * Set callback for progress updates
     */
    onProgress(callback: (progress: LoadProgress) => void): void;
    /**
     * Open file picker dialog
     */
    openFilePicker(): void;
    /**
     * Handle file selection from input element
     */
    private handleFileSelect;
    /**
     * Load a MIDI file from a File object with enhanced validation and progress tracking
     */
    loadFile(file: File): Promise<void>;
    /**
     * Update progress and notify callback
     */
    private updateProgress;
    /**
     * Enhanced file validation - checks extension, size, and MIDI header
     */
    validateMidiFile(file: File): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Simple file extension validation
     */
    private isValidMidiFile;
    /**
     * Read a specific chunk of a file
     */
    private readFileChunk;
    /**
     * Read file as ArrayBuffer
     */
    private readFileAsArrayBuffer;
    /**
     * Parse basic MIDI file information from header
     */
    private parseMidiFileInfo;
    /**
     * Read 32-bit big-endian unsigned integer
     */
    private readUint32BE;
    /**
     * Read 16-bit big-endian unsigned integer
     */
    private readUint16BE;
    /**
     * Create drag-and-drop zone UI for MIDI files
     */
    createDropZone(container: HTMLElement): HTMLElement;
    /**
     * Add CSS styles for the drop zone
     */
    private addDropZoneStyles;
    /**
     * Set up drag and drop event handlers
     */
    private setupDragAndDrop;
    /**
     * Prevent default drag behaviors
     */
    private preventDefaults;
    /**
     * Handle dropped files
     */
    private handleDrop;
    /**
     * Create progress indicator UI
     */
    createProgressIndicator(container: HTMLElement): HTMLElement;
    /**
     * Add CSS styles for the progress indicator
     */
    private addProgressIndicatorStyles;
    /**
     * Update the visual progress indicator
     */
    private updateProgressIndicator;
    /**
     * Show error in progress indicator
     */
    showError(error: string): void;
    /**
     * Clean up resources
     */
    destroy(): void;
}
//# sourceMappingURL=midi-file-loader.d.ts.map