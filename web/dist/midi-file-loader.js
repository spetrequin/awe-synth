/**
 * MIDI File Loader
 * Basic file input handling for .mid/.midi files
 */
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
const log = (message) => DEBUG_LOGGERS.midiFile.log(message);
export class MidiFileLoader {
    fileInput;
    dropZone;
    progressIndicator;
    onFileLoadedCallback;
    onErrorCallback;
    onProgressCallback;
    constructor() {
        this.fileInput = this.createFileInput();
    }
    /**
     * Create the file input element
     */
    createFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mid,.midi';
        input.style.display = 'none';
        input.addEventListener('change', this.handleFileSelect.bind(this));
        document.body.appendChild(input);
        return input;
    }
    /**
     * Set callback for successful file loading
     */
    onFileLoaded(callback) {
        this.onFileLoadedCallback = callback;
    }
    /**
     * Set callback for error handling
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }
    /**
     * Set callback for progress updates
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }
    /**
     * Open file picker dialog
     */
    openFilePicker() {
        this.fileInput.click();
    }
    /**
     * Handle file selection from input element
     */
    async handleFileSelect(event) {
        const target = event.target;
        const file = target.files?.[0];
        if (!file) {
            log('No file selected');
            return;
        }
        await this.loadFile(file);
    }
    /**
     * Load a MIDI file from a File object with enhanced validation and progress tracking
     */
    async loadFile(file) {
        try {
            log(`Loading MIDI file: ${file.name} (${file.size} bytes)`);
            // Phase 1: Validation
            this.updateProgress({
                phase: 'validation',
                progress: 0,
                message: 'Validating file...'
            });
            const validation = await this.validateMidiFile(file);
            if (!validation.valid) {
                log(`Validation failed: ${validation.error}`);
                this.onErrorCallback?.(validation.error || 'File validation failed');
                return;
            }
            this.updateProgress({
                phase: 'validation',
                progress: 25,
                message: 'File validation passed'
            });
            log('File validation passed');
            // Phase 2: Reading
            this.updateProgress({
                phase: 'reading',
                progress: 25,
                message: 'Reading file data...'
            });
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const data = new Uint8Array(arrayBuffer);
            this.updateProgress({
                phase: 'reading',
                progress: 60,
                message: 'File data loaded'
            });
            // Phase 3: Parsing
            this.updateProgress({
                phase: 'parsing',
                progress: 60,
                message: 'Parsing MIDI structure...'
            });
            const info = this.parseMidiFileInfo(file.name, data);
            this.updateProgress({
                phase: 'parsing',
                progress: 90,
                message: `Parsed ${info.trackCount} tracks`
            });
            log(`MIDI file loaded successfully: Format ${info.format}, ${info.trackCount} tracks, division: ${info.division}`);
            // Phase 4: Complete
            this.updateProgress({
                phase: 'complete',
                progress: 100,
                message: 'MIDI file loaded successfully'
            });
            // Call success callback
            this.onFileLoadedCallback?.(data, info);
        }
        catch (error) {
            const errorMessage = `Failed to load MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`;
            log(errorMessage);
            this.onErrorCallback?.(errorMessage);
        }
    }
    /**
     * Update progress and notify callback
     */
    updateProgress(progress) {
        log(`Loading progress: ${progress.phase} - ${progress.progress}% - ${progress.message}`);
        this.onProgressCallback?.(progress);
        this.updateProgressIndicator(progress);
    }
    /**
     * Enhanced file validation - checks extension, size, and MIDI header
     */
    async validateMidiFile(file) {
        // Check file extension
        if (!this.isValidMidiFile(file)) {
            return {
                valid: false,
                error: `Invalid file extension. Expected .mid or .midi, got: ${file.name}`
            };
        }
        // Check file size (minimum 14 bytes for header, max 50MB for practical purposes)
        if (file.size < 14) {
            return {
                valid: false,
                error: `File too small (${file.size} bytes). MIDI files must be at least 14 bytes.`
            };
        }
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            return {
                valid: false,
                error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum supported size is 50MB.`
            };
        }
        // Read first 14 bytes to validate MIDI header
        try {
            const headerBuffer = await this.readFileChunk(file, 0, 14);
            const headerData = new Uint8Array(headerBuffer);
            // Check MThd header
            const headerString = new TextDecoder().decode(headerData.slice(0, 4));
            if (headerString !== 'MThd') {
                return {
                    valid: false,
                    error: `Invalid MIDI header. Expected 'MThd', found: '${headerString}'`
                };
            }
            // Check header length
            const headerLength = this.readUint32BE(headerData, 4);
            if (headerLength !== 6) {
                return {
                    valid: false,
                    error: `Invalid MIDI header length: ${headerLength} (expected 6)`
                };
            }
            // Check format type
            const format = this.readUint16BE(headerData, 8);
            if (format > 2) {
                return {
                    valid: false,
                    error: `Unsupported MIDI format: ${format} (supported: 0, 1, 2)`
                };
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: `Failed to validate MIDI header: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Simple file extension validation
     */
    isValidMidiFile(file) {
        const name = file.name.toLowerCase();
        return name.endsWith('.mid') || name.endsWith('.midi');
    }
    /**
     * Read a specific chunk of a file
     */
    readFileChunk(file, start, length) {
        return new Promise((resolve, reject) => {
            const chunk = file.slice(start, start + length);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file chunk'));
            reader.readAsArrayBuffer(chunk);
        });
    }
    /**
     * Read file as ArrayBuffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
    /**
     * Parse basic MIDI file information from header
     */
    parseMidiFileInfo(filename, data) {
        if (data.length < 14) {
            throw new Error('File too short to be a valid MIDI file');
        }
        // Check MThd header
        const header = new TextDecoder().decode(data.slice(0, 4));
        if (header !== 'MThd') {
            throw new Error('Invalid MIDI file: Missing MThd header');
        }
        // Parse header data (big-endian)
        const headerLength = this.readUint32BE(data, 4);
        if (headerLength !== 6) {
            throw new Error(`Invalid MIDI header length: ${headerLength} (expected 6)`);
        }
        const format = this.readUint16BE(data, 8);
        const trackCount = this.readUint16BE(data, 10);
        const division = this.readUint16BE(data, 12);
        if (format > 2) {
            throw new Error(`Unsupported MIDI format: ${format}`);
        }
        return {
            name: filename,
            size: data.length,
            format,
            trackCount,
            division
        };
    }
    /**
     * Read 32-bit big-endian unsigned integer
     */
    readUint32BE(data, offset) {
        if (offset + 3 >= data.length) {
            throw new Error(`Cannot read 32-bit value at offset ${offset}: insufficient data`);
        }
        return (data[offset] << 24) |
            (data[offset + 1] << 16) |
            (data[offset + 2] << 8) |
            data[offset + 3];
    }
    /**
     * Read 16-bit big-endian unsigned integer
     */
    readUint16BE(data, offset) {
        if (offset + 1 >= data.length) {
            throw new Error(`Cannot read 16-bit value at offset ${offset}: insufficient data`);
        }
        return (data[offset] << 8) | data[offset + 1];
    }
    /**
     * Create drag-and-drop zone UI for MIDI files
     */
    createDropZone(container) {
        const dropZone = document.createElement('div');
        dropZone.className = 'midi-drop-zone';
        dropZone.innerHTML = `
            <div class="drop-zone-content">
                <div class="drop-zone-icon">🎵</div>
                <div class="drop-zone-text">
                    <div class="drop-zone-primary">Drop MIDI files here</div>
                    <div class="drop-zone-secondary">or <button class="drop-zone-button">browse files</button></div>
                </div>
            </div>
        `;
        // Add CSS styles
        this.addDropZoneStyles();
        // Set up drag and drop handlers
        this.setupDragAndDrop(dropZone);
        // Set up browse button
        const browseButton = dropZone.querySelector('.drop-zone-button');
        browseButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.openFilePicker();
        });
        container.appendChild(dropZone);
        this.dropZone = dropZone;
        return dropZone;
    }
    /**
     * Add CSS styles for the drop zone
     */
    addDropZoneStyles() {
        if (document.getElementById('midi-drop-zone-styles')) {
            return; // Styles already added
        }
        const style = document.createElement('style');
        style.id = 'midi-drop-zone-styles';
        style.textContent = `
            .midi-drop-zone {
                border: 2px dashed #4a90e2;
                border-radius: 8px;
                padding: 40px 20px;
                text-align: center;
                background-color: #f8f9fa;
                transition: all 0.3s ease;
                cursor: pointer;
                min-height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .midi-drop-zone:hover {
                border-color: #357abd;
                background-color: #e8f4fd;
            }

            .midi-drop-zone.drag-over {
                border-color: #28a745;
                background-color: #d4edda;
                border-style: solid;
            }

            .drop-zone-content {
                pointer-events: none;
            }

            .drop-zone-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.6;
            }

            .drop-zone-primary {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }

            .drop-zone-secondary {
                font-size: 14px;
                color: #666;
            }

            .drop-zone-button {
                background: none;
                border: none;
                color: #4a90e2;
                text-decoration: underline;
                cursor: pointer;
                font-size: 14px;
                pointer-events: auto;
                padding: 0;
            }

            .drop-zone-button:hover {
                color: #357abd;
            }
        `;
        document.head.appendChild(style);
    }
    /**
     * Set up drag and drop event handlers
     */
    setupDragAndDrop(dropZone) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults.bind(this), false);
            document.body.addEventListener(eventName, this.preventDefaults.bind(this), false);
        });
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });
        // Handle dropped files
        dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
    }
    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    /**
     * Handle dropped files
     */
    async handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (!files || files.length === 0) {
            log('No files dropped');
            return;
        }
        // Process first MIDI file found
        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file && this.isValidMidiFile(file)) {
                await this.loadFile(file);
                return;
            }
        }
        const error = 'No valid MIDI files found in dropped files';
        log(error);
        this.onErrorCallback?.(error);
    }
    /**
     * Create progress indicator UI
     */
    createProgressIndicator(container) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'midi-progress-container';
        progressContainer.style.display = 'none';
        progressContainer.innerHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Ready to load MIDI file</div>
            </div>
        `;
        // Add progress indicator styles
        this.addProgressIndicatorStyles();
        container.appendChild(progressContainer);
        this.progressIndicator = progressContainer;
        return progressContainer;
    }
    /**
     * Add CSS styles for the progress indicator
     */
    addProgressIndicatorStyles() {
        if (document.getElementById('midi-progress-styles')) {
            return; // Styles already added
        }
        const style = document.createElement('style');
        style.id = 'midi-progress-styles';
        style.textContent = `
            .midi-progress-container {
                margin: 16px 0;
                padding: 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f9f9f9;
            }

            .progress-bar-container {
                width: 100%;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background-color: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-fill {
                height: 100%;
                background-color: #4a90e2;
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 4px;
            }

            .progress-text {
                font-size: 14px;
                color: #666;
                text-align: center;
            }

            .progress-text.error {
                color: #d32f2f;
            }

            .progress-text.success {
                color: #28a745;
            }
        `;
        document.head.appendChild(style);
    }
    /**
     * Update the visual progress indicator
     */
    updateProgressIndicator(progress) {
        if (!this.progressIndicator)
            return;
        const progressFill = this.progressIndicator.querySelector('.progress-fill');
        const progressText = this.progressIndicator.querySelector('.progress-text');
        if (progressFill) {
            progressFill.style.width = `${progress.progress}%`;
        }
        if (progressText) {
            progressText.textContent = progress.message;
            progressText.className = 'progress-text';
            if (progress.phase === 'complete') {
                progressText.classList.add('success');
            }
        }
        // Show/hide progress indicator
        if (progress.progress > 0 && progress.progress < 100) {
            this.progressIndicator.style.display = 'block';
        }
        else if (progress.progress === 100) {
            // Hide after a delay
            setTimeout(() => {
                if (this.progressIndicator) {
                    this.progressIndicator.style.display = 'none';
                }
            }, 2000);
        }
    }
    /**
     * Show error in progress indicator
     */
    showError(error) {
        if (!this.progressIndicator)
            return;
        const progressFill = this.progressIndicator.querySelector('.progress-fill');
        const progressText = this.progressIndicator.querySelector('.progress-text');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = error;
            progressText.className = 'progress-text error';
        }
        this.progressIndicator.style.display = 'block';
        // Hide after a delay
        setTimeout(() => {
            if (this.progressIndicator) {
                this.progressIndicator.style.display = 'none';
            }
        }, 5000);
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.fileInput && this.fileInput.parentNode) {
            this.fileInput.parentNode.removeChild(this.fileInput);
        }
        if (this.dropZone && this.dropZone.parentNode) {
            this.dropZone.parentNode.removeChild(this.dropZone);
        }
        if (this.progressIndicator && this.progressIndicator.parentNode) {
            this.progressIndicator.parentNode.removeChild(this.progressIndicator);
        }
    }
}
//# sourceMappingURL=midi-file-loader.js.map