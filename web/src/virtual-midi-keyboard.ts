/**
 * Virtual MIDI Keyboard - 88-key piano interface for testing without hardware
 * Part of AWE Player EMU8000 Emulator
 */

import { MidiBridge } from './midi-bridge.js';
import { KeyboardLayoutGenerator, KeyLayout } from './virtual-keyboard/keyboard-layout.js';
import { noteToFullName } from './midi-constants.js';

interface VirtualKey {
    noteNumber: number;     // MIDI note (21-108 for 88 keys)
    isPressed: boolean;     // Visual and logical state
    velocity: number;       // 0-127 based on mouse/touch input
    keyType: 'white' | 'black';
}

export class VirtualMidiKeyboard {
    private keys: Map<number, VirtualKey> = new Map();
    private currentOctave = 4; // C4 = Middle C
    private midiBridge: MidiBridge;
    private keyboardElement: HTMLElement | null = null;
    private sustainPedal = false;
    private currentChannel = 0;
    private layoutGenerator: KeyboardLayoutGenerator;
    
    // Key layout mapping (computer keyboard to piano keys)
    private keyMapping: Map<string, number> = new Map([
        // White keys (bottom row)
        ['z', 0],  // C
        ['x', 2],  // D
        ['c', 4],  // E
        ['v', 5],  // F
        ['b', 7],  // G
        ['n', 9],  // A
        ['m', 11], // B
        [',', 12], // C (next octave)
        
        // Black keys (top row)
        ['s', 1],  // C#
        ['d', 3],  // D#
        ['g', 6],  // F#
        ['h', 8],  // G#
        ['j', 10], // A#
    ]);
    
    constructor(midiBridge: MidiBridge) {
        this.midiBridge = midiBridge;
        this.layoutGenerator = new KeyboardLayoutGenerator();
        this.initializeKeys();
        this.setupKeyboardListeners();
    }
    
    /**
     * Initialize all 88 piano keys using layout generator
     */
    private initializeKeys(): void {
        const fullKeyboard = this.layoutGenerator.generateFullKeyboard();
        
        fullKeyboard.forEach(keyLayout => {
            this.keys.set(keyLayout.noteNumber, {
                noteNumber: keyLayout.noteNumber,
                isPressed: false,
                velocity: 0,
                keyType: keyLayout.keyType
            });
        });
    }
    
    /**
     * Create visual keyboard interface
     */
    public createVisualKeyboard(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) {
            this.logToDebug(`Error: Container ${containerId} not found`);
            return;
        }
        
        this.keyboardElement = document.createElement('div');
        this.keyboardElement.className = 'virtual-keyboard';
        
        // Create octaves using layout generator
        for (let octave = 0; octave <= 8; octave++) {
            const octaveKeys = this.layoutGenerator.generateOctaveKeys(octave);
            if (octaveKeys.length > 0) {
                const octaveElement = this.createOctaveElement(octave, octaveKeys);
                this.keyboardElement.appendChild(octaveElement);
            }
        }
        
        container.appendChild(this.keyboardElement);
        this.addKeyboardStyles();
    }
    
    /**
     * Create visual representation of one octave using layout generator
     */
    private createOctaveElement(_octave: number, octaveKeys: KeyLayout[]): HTMLElement {
        const octaveDiv = document.createElement('div');
        octaveDiv.className = 'keyboard-octave';
        
        // Create white keys first (for proper layering)
        const whiteKeys = octaveKeys.filter(key => key.keyType === 'white');
        whiteKeys.forEach(keyLayout => {
            const key = this.createKeyElement(keyLayout.noteNumber, keyLayout.keyType, keyLayout);
            octaveDiv.appendChild(key);
        });
        
        // Create black keys (layered on top)
        const blackKeys = octaveKeys.filter(key => key.keyType === 'black');
        blackKeys.forEach(keyLayout => {
            const key = this.createKeyElement(keyLayout.noteNumber, keyLayout.keyType, keyLayout);
            octaveDiv.appendChild(key);
        });
        
        return octaveDiv;
    }
    
    /**
     * Create individual key element using layout information
     */
    private createKeyElement(noteNumber: number, keyType: 'white' | 'black', keyLayout?: KeyLayout): HTMLElement {
        const key = document.createElement('div');
        key.className = `piano-key ${keyType}-key`;
        key.dataset.note = noteNumber.toString();
        
        // Add note label for white keys using layout generator or fallback
        if (keyType === 'white') {
            const noteName = keyLayout ? keyLayout.noteName : noteToFullName(noteNumber);
            key.textContent = noteName;
        }
        
        // Mouse events
        key.addEventListener('mousedown', (e) => this.handleKeyPress(noteNumber, e));
        key.addEventListener('mouseup', () => this.handleKeyRelease(noteNumber));
        key.addEventListener('mouseleave', () => this.handleKeyRelease(noteNumber));
        
        // Touch events
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleKeyPress(noteNumber, e);
        });
        key.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleKeyRelease(noteNumber);
        });
        
        return key;
    }
    
    /**
     * Handle key press (mouse/touch)
     */
    public handleKeyPress(noteNumber: number, event: MouseEvent | TouchEvent): void {
        const key = this.keys.get(noteNumber);
        if (!key || key.isPressed) return;
        
        // Calculate velocity based on Y position (higher = softer)
        const velocity = this.calculateVelocity(event);
        
        key.isPressed = true;
        key.velocity = velocity;
        
        // Send MIDI note on
        this.midiBridge.sendNoteOn(this.currentChannel, noteNumber, velocity);
        
        // Update visual state
        this.updateKeyVisual(noteNumber, true);
        
        this.logToDebug(`Virtual keyboard: Note ON - ${noteNumber}, velocity: ${velocity}`);
    }
    
    /**
     * Handle key release
     */
    public handleKeyRelease(noteNumber: number): void {
        const key = this.keys.get(noteNumber);
        if (!key || !key.isPressed) return;
        
        key.isPressed = false;
        
        // Send MIDI note off (unless sustain pedal is pressed)
        if (!this.sustainPedal) {
            this.midiBridge.sendNoteOff(this.currentChannel, noteNumber);
        }
        
        // Update visual state
        this.updateKeyVisual(noteNumber, false);
        
        this.logToDebug(`Virtual keyboard: Note OFF - ${noteNumber}`);
    }
    
    /**
     * Calculate velocity from mouse/touch position
     */
    private calculateVelocity(event: MouseEvent | TouchEvent): number {
        let clientY: number;
        
        if (event instanceof MouseEvent) {
            clientY = event.clientY;
        } else if (event.touches && event.touches[0]) {
            clientY = event.touches[0].clientY;
        } else {
            return 64; // Default velocity if no touch data
        }
        
        const target = event.target as HTMLElement;
        if (!target) return 64; // Default velocity if no target
        const rect = target.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const normalizedY = relativeY / rect.height;
        
        // Invert and scale to MIDI velocity (top = loud, bottom = soft)
        const velocity = Math.round((1 - normalizedY) * 127);
        return Math.max(1, Math.min(127, velocity));
    }
    
    /**
     * Update visual state of key
     */
    private updateKeyVisual(noteNumber: number, isPressed: boolean): void {
        const keyElement = this.keyboardElement?.querySelector(`[data-note="${noteNumber}"]`);
        if (keyElement) {
            if (isPressed) {
                keyElement.classList.add('pressed');
            } else {
                keyElement.classList.remove('pressed');
            }
        }
    }
    
    /**
     * Setup computer keyboard listeners
     */
    private setupKeyboardListeners(): void {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Ignore key repeat
            
            const noteOffset = this.keyMapping.get(e.key.toLowerCase());
            if (noteOffset !== undefined) {
                const noteNumber = (this.currentOctave * 12) + noteOffset + 12;
                if (noteNumber >= 21 && noteNumber <= 108) {
                    this.handleKeyPress(noteNumber, new MouseEvent('mousedown'));
                }
            }
            
            // Octave controls
            if (e.key === 'ArrowLeft' && this.currentOctave > 0) {
                this.currentOctave--;
                this.logToDebug(`Octave changed to ${this.currentOctave}`);
            } else if (e.key === 'ArrowRight' && this.currentOctave < 7) {
                this.currentOctave++;
                this.logToDebug(`Octave changed to ${this.currentOctave}`);
            }
            
            // Sustain pedal (spacebar)
            if (e.key === ' ') {
                e.preventDefault();
                this.setSustainPedal(true);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const noteOffset = this.keyMapping.get(e.key.toLowerCase());
            if (noteOffset !== undefined) {
                const noteNumber = (this.currentOctave * 12) + noteOffset + 12;
                if (noteNumber >= 21 && noteNumber <= 108) {
                    this.handleKeyRelease(noteNumber);
                }
            }
            
            // Release sustain pedal
            if (e.key === ' ') {
                e.preventDefault();
                this.setSustainPedal(false);
            }
        });
    }
    
    /**
     * Set sustain pedal state
     */
    public setSustainPedal(isPressed: boolean): void {
        this.sustainPedal = isPressed;
        
        // Send MIDI CC 64 (sustain pedal)
        const value = isPressed ? 127 : 0;
        this.midiBridge.sendControlChange(this.currentChannel, 64, value);
        
        // If releasing pedal, send note off for all sustained notes
        if (!isPressed) {
            this.keys.forEach((key, noteNumber) => {
                if (key.isPressed) {
                    this.midiBridge.sendNoteOff(this.currentChannel, noteNumber);
                }
            });
        }
        
        this.logToDebug(`Sustain pedal: ${isPressed ? 'ON' : 'OFF'}`);
    }
    
    /**
     * Change GM program
     */
    public setProgram(program: number): void {
        if (program < 0 || program > 127) return;
        
        this.midiBridge.sendProgramChange(this.currentChannel, program);
        
        this.logToDebug(`Program changed to ${program}`);
    }
    
    /**
     * Set MIDI channel
     */
    public setChannel(channel: number): void {
        if (channel < 0 || channel > 15) return;
        
        this.currentChannel = channel;
        this.logToDebug(`Channel changed to ${channel}`);
    }
    
    /**
     * Get current MIDI channel
     */
    public getCurrentChannel(): number {
        return this.currentChannel;
    }
    
    /**
     * Get MIDI bridge instance
     */
    public getMidiBridge(): MidiBridge {
        return this.midiBridge;
    }
    
    /**
     * Add CSS styles for keyboard
     */
    private addKeyboardStyles(): void {
        if (document.getElementById('virtual-keyboard-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'virtual-keyboard-styles';
        style.textContent = `
            .virtual-keyboard {
                display: flex;
                background: #222;
                padding: 10px;
                border-radius: 5px;
                overflow-x: auto;
                user-select: none;
            }
            
            .keyboard-octave {
                position: relative;
                display: flex;
            }
            
            .piano-key {
                cursor: pointer;
                border: 1px solid #000;
                border-radius: 0 0 5px 5px;
                transition: all 0.1s;
            }
            
            .white-key {
                width: 40px;
                height: 150px;
                background: white;
                z-index: 1;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding-bottom: 10px;
                font-size: 12px;
                color: #666;
            }
            
            .black-key {
                width: 25px;
                height: 100px;
                background: #333;
                position: absolute;
                z-index: 2;
                margin-left: -12.5px;
            }
            
            .white-key:hover {
                background: #f0f0f0;
            }
            
            .black-key:hover {
                background: #555;
            }
            
            .white-key.pressed {
                background: #ccc;
                transform: translateY(2px);
            }
            
            .black-key.pressed {
                background: #111;
                transform: translateY(2px);
            }
            
            /* Black key positions within octave - calculated dynamically */
            .keyboard-octave .black-key {
                left: calc(var(--black-key-position, 30) * 1px);
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
            debugLog.value += `[VirtualKeyboard] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}