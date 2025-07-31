/**
 * Computer Keyboard Input Handler - Timing-based velocity
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler } from './base-input-handler.js';
import { INPUT_TIMING, MIDI_NOTES } from '../midi-constants.js';
export class ComputerKeyboardInputHandler extends BaseInputHandler {
    keyPressTimers = new Map();
    currentOctave = 4; // C4 = Middle C
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
    constructor(options) {
        super(options);
    }
    initialize() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.log('Computer keyboard input handler initialized');
    }
    cleanup() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.keyPressTimers.clear();
    }
    getType() {
        return 'Computer Keyboard';
    }
    /**
     * Set current octave
     */
    setOctave(octave) {
        this.currentOctave = Math.max(0, Math.min(8, octave));
        this.log(`Octave changed to ${this.currentOctave}`);
    }
    /**
     * Get current octave
     */
    getOctave() {
        return this.currentOctave;
    }
    handleKeyDown = (e) => {
        if (!this.enabled || e.repeat)
            return;
        const key = e.key.toLowerCase();
        // Handle note keys
        const noteOffset = this.keyMapping.get(key);
        if (noteOffset !== undefined) {
            const noteNumber = (this.currentOctave * MIDI_NOTES.OCTAVE_SIZE) + noteOffset + 12;
            if (noteNumber >= MIDI_NOTES.LOWEST_PIANO && noteNumber <= MIDI_NOTES.HIGHEST_PIANO) {
                // Start velocity timer
                this.keyPressTimers.set(key, performance.now());
                this.log(`Key press started: ${key} → Note ${noteNumber}`);
            }
            return;
        }
        // Handle octave controls
        if (key === 'arrowleft' && this.currentOctave > 0) {
            this.currentOctave--;
            this.log(`Octave changed to ${this.currentOctave}`);
        }
        else if (key === 'arrowright' && this.currentOctave < 7) {
            this.currentOctave++;
            this.log(`Octave changed to ${this.currentOctave}`);
        }
        // Handle sustain pedal (spacebar)
        if (key === ' ') {
            e.preventDefault();
            this.keyboard.setSustainPedal(true);
        }
    };
    handleKeyUp = (e) => {
        if (!this.enabled)
            return;
        const key = e.key.toLowerCase();
        // Handle note keys
        const noteOffset = this.keyMapping.get(key);
        if (noteOffset !== undefined) {
            const noteNumber = (this.currentOctave * MIDI_NOTES.OCTAVE_SIZE) + noteOffset + 12;
            if (noteNumber >= MIDI_NOTES.LOWEST_PIANO && noteNumber <= MIDI_NOTES.HIGHEST_PIANO) {
                const startTime = this.keyPressTimers.get(key);
                if (startTime) {
                    // Calculate velocity based on key press duration
                    const duration = performance.now() - startTime;
                    const velocity = this.calculateKeyVelocity(duration);
                    // Create mock mouse event for compatibility
                    const mockEvent = new MouseEvent('mousedown', {
                        clientY: 100 - (velocity / 127) * 100 // Convert velocity to Y position
                    });
                    this.keyboard.handleKeyPress(noteNumber, mockEvent);
                    this.keyboard.handleKeyRelease(noteNumber);
                    this.keyPressTimers.delete(key);
                    this.log(`Key ${key} velocity: ${velocity} (${duration.toFixed(1)}ms)`);
                }
            }
            return;
        }
        // Release sustain pedal
        if (key === ' ') {
            e.preventDefault();
            this.keyboard.setSustainPedal(false);
        }
    };
    /**
     * Calculate velocity from key press duration
     */
    calculateKeyVelocity(duration) {
        // Fast press (< 50ms) = high velocity
        // Slow press (> 200ms) = low velocity
        const normalized = 1 - Math.min(Math.max(duration - INPUT_TIMING.FAST_KEYPRESS_MS, 0) /
            (INPUT_TIMING.SLOW_KEYPRESS_MS - INPUT_TIMING.FAST_KEYPRESS_MS), 1);
        return this.velocityProcessor.processVelocity(normalized);
    }
}
//# sourceMappingURL=keyboard-input-handler.js.map