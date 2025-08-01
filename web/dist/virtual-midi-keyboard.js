/**
 * Virtual MIDI Keyboard - 88-key piano interface for testing without hardware
 * Part of AWE Player EMU8000 Emulator
 */
import { KeyboardLayoutGenerator } from './virtual-keyboard/keyboard-layout.js';
import { noteToFullName } from './midi-constants.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
import { injectStyles, generateComponentStyles } from './utils/ui-styles.js';
import { isValidMIDIProgram, isValidMIDIChannel, MIDI_CC, UI_CONSTANTS } from './midi-constants.js';
import { VelocityCurveProcessor, VELOCITY_CONSTANTS } from './velocity-curves.js';
// Default options for backward compatibility (currently unused but kept for future use)
// const DEFAULT_VELOCITY_OPTIONS: VirtualKeyboardOptions = {
//     velocityProfile: 'natural',
//     velocitySensitivity: 1.0
// };
export class VirtualMidiKeyboard {
    keys = new Map();
    currentOctave = 4; // C4 = Middle C
    midiBridge;
    keyboardElement = null;
    sustainPedal = false;
    currentChannel = 0;
    layoutGenerator;
    velocityProcessor;
    // Key layout mapping (computer keyboard to piano keys)
    keyMapping = new Map([
        // White keys (bottom row)
        ['z', 0], // C
        ['x', 2], // D
        ['c', 4], // E
        ['v', 5], // F
        ['b', 7], // G
        ['n', 9], // A
        ['m', 11], // B
        [',', 12], // C (next octave)
        // Black keys (top row)
        ['s', 1], // C#
        ['d', 3], // D#
        ['g', 6], // F#
        ['h', 8], // G#
        ['j', 10], // A#
    ]);
    constructor(midiBridge, options = {}) {
        this.midiBridge = midiBridge;
        this.layoutGenerator = new KeyboardLayoutGenerator();
        // Initialize velocity processor with options
        this.velocityProcessor = new VelocityCurveProcessor(options.velocityProfile);
        if (options.velocitySensitivity !== undefined) {
            this.velocityProcessor.setSensitivity(options.velocitySensitivity);
        }
        this.initializeKeys();
        this.setupKeyboardListeners();
    }
    /**
     * Initialize all 88 piano keys using layout generator
     */
    initializeKeys() {
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
    createVisualKeyboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            DEBUG_LOGGERS.virtualKeyboard.error(`Container ${containerId} not found`);
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
    createOctaveElement(_octave, octaveKeys) {
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
    createKeyElement(noteNumber, keyType, keyLayout) {
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
    handleKeyPress(noteNumber, event) {
        const key = this.keys.get(noteNumber);
        if (!key || key.isPressed)
            return;
        // Calculate velocity based on Y position (higher = softer)
        const velocity = this.calculateVelocity(event);
        key.isPressed = true;
        key.velocity = velocity;
        // Send MIDI note on
        this.midiBridge.sendNoteOn(this.currentChannel, noteNumber, velocity);
        // Update visual state
        this.updateKeyVisual(noteNumber, true);
        DEBUG_LOGGERS.virtualKeyboard.log(`Note ON - ${noteNumber}, velocity: ${velocity}`);
    }
    /**
     * Handle key release
     */
    handleKeyRelease(noteNumber) {
        const key = this.keys.get(noteNumber);
        if (!key || !key.isPressed)
            return;
        key.isPressed = false;
        // Send MIDI note off (unless sustain pedal is pressed)
        if (!this.sustainPedal) {
            this.midiBridge.sendNoteOff(this.currentChannel, noteNumber);
        }
        // Update visual state
        this.updateKeyVisual(noteNumber, false);
        DEBUG_LOGGERS.virtualKeyboard.log(`Note OFF - ${noteNumber}`);
    }
    /**
     * Calculate velocity from mouse/touch position using centralized velocity processing
     */
    calculateVelocity(event) {
        let clientY;
        if (event instanceof MouseEvent) {
            clientY = event.clientY;
        }
        else if (event.touches && event.touches[0]) {
            clientY = event.touches[0].clientY;
        }
        else {
            return VELOCITY_CONSTANTS.TOUCH_DEFAULT; // Default velocity if no touch data
        }
        const target = event.target;
        if (!target)
            return VELOCITY_CONSTANTS.TOUCH_DEFAULT; // Default velocity if no target
        const rect = target.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const normalizedY = relativeY / rect.height;
        // Invert position (top = loud, bottom = soft) and normalize to 0-1
        const rawVelocity = 1 - normalizedY;
        // Use centralized velocity processing with curves and sensitivity
        return this.velocityProcessor.processVelocity(rawVelocity);
    }
    /**
     * Update visual state of key
     */
    updateKeyVisual(noteNumber, isPressed) {
        const keyElement = this.keyboardElement?.querySelector(`[data-note="${noteNumber}"]`);
        if (keyElement) {
            if (isPressed) {
                keyElement.classList.add('pressed');
            }
            else {
                keyElement.classList.remove('pressed');
            }
        }
    }
    /**
     * Setup computer keyboard listeners
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat)
                return; // Ignore key repeat
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
                DEBUG_LOGGERS.virtualKeyboard.log(`Octave changed to ${this.currentOctave}`);
            }
            else if (e.key === 'ArrowRight' && this.currentOctave < 7) {
                this.currentOctave++;
                DEBUG_LOGGERS.virtualKeyboard.log(`Octave changed to ${this.currentOctave}`);
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
    setSustainPedal(isPressed) {
        this.sustainPedal = isPressed;
        // Send MIDI CC 64 (sustain pedal)
        const value = isPressed ? 127 : 0;
        this.midiBridge.sendControlChange(this.currentChannel, MIDI_CC.SUSTAIN_PEDAL, value);
        // If releasing pedal, send note off for all sustained notes
        if (!isPressed) {
            this.keys.forEach((key, noteNumber) => {
                if (key.isPressed) {
                    this.midiBridge.sendNoteOff(this.currentChannel, noteNumber);
                }
            });
        }
        DEBUG_LOGGERS.virtualKeyboard.log(`Sustain pedal: ${isPressed ? 'ON' : 'OFF'}`);
    }
    /**
     * Change GM program
     */
    setProgram(program) {
        if (!isValidMIDIProgram(program))
            return;
        this.midiBridge.sendProgramChange(this.currentChannel, program);
        DEBUG_LOGGERS.virtualKeyboard.log(`Program changed to ${program}`);
    }
    /**
     * Set MIDI channel
     */
    setChannel(channel) {
        if (!isValidMIDIChannel(channel))
            return;
        this.currentChannel = channel;
        DEBUG_LOGGERS.virtualKeyboard.log(`Channel changed to ${channel}`);
    }
    /**
     * Set velocity profile
     */
    setVelocityProfile(profileName) {
        const success = this.velocityProcessor.setProfile(profileName);
        if (success) {
            DEBUG_LOGGERS.virtualKeyboard.log(`Velocity profile changed to: ${profileName}`);
        }
        else {
            DEBUG_LOGGERS.virtualKeyboard.error(`Invalid velocity profile: ${profileName}`);
        }
        return success;
    }
    /**
     * Set velocity sensitivity
     */
    setVelocitySensitivity(sensitivity) {
        this.velocityProcessor.setSensitivity(sensitivity);
        DEBUG_LOGGERS.virtualKeyboard.log(`Velocity sensitivity set to: ${sensitivity}`);
    }
    /**
     * Get current velocity processor
     */
    getVelocityProcessor() {
        return this.velocityProcessor;
    }
    /**
     * Get current MIDI channel
     */
    getCurrentChannel() {
        return this.currentChannel;
    }
    /**
     * Get MIDI bridge instance
     */
    getMidiBridge() {
        return this.midiBridge;
    }
    /**
     * Add CSS styles for keyboard
     */
    addKeyboardStyles() {
        const customStyles = `
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
                width: ${UI_CONSTANTS.KEYBOARD_WHITE_KEY_WIDTH}px;
                height: ${UI_CONSTANTS.KEYBOARD_WHITE_KEY_HEIGHT}px;
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
                width: ${UI_CONSTANTS.KEYBOARD_BLACK_KEY_WIDTH}px;
                height: ${UI_CONSTANTS.KEYBOARD_BLACK_KEY_HEIGHT}px;
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
        const componentStyles = generateComponentStyles('VirtualMidiKeyboard', customStyles);
        injectStyles('virtual-keyboard-styles', componentStyles);
    }
}
//# sourceMappingURL=virtual-midi-keyboard.js.map