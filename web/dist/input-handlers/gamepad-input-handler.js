/**
 * Gamepad Input Handler - Velocity-sensitive pad controller support
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler } from './base-input-handler.js';
import { INPUT_TIMING, MIDI_NOTES } from '../midi-constants.js';
export class GamepadInputHandler extends BaseInputHandler {
    gamepadInterval = null;
    lastButtonStates = new Map();
    constructor(options) {
        super(options);
    }
    initialize() {
        if (!navigator.getGamepads) {
            this.log('Gamepad API not supported in this browser');
            this.enabled = false;
            return;
        }
        window.addEventListener('gamepadconnected', this.handleGamepadConnected);
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        this.log('Gamepad input handler initialized');
    }
    cleanup() {
        window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        if (this.gamepadInterval) {
            clearInterval(this.gamepadInterval);
            this.gamepadInterval = null;
        }
        this.lastButtonStates.clear();
    }
    getType() {
        return 'Gamepad Input';
    }
    handleGamepadConnected = (e) => {
        this.log(`Gamepad connected: ${e.gamepad.id}`);
        // Initialize button states
        this.lastButtonStates.set(e.gamepad.index, new Array(e.gamepad.buttons.length).fill(false));
        // Start polling if not already running
        if (!this.gamepadInterval) {
            this.startPolling();
        }
    };
    handleGamepadDisconnected = (e) => {
        this.log(`Gamepad disconnected: ${e.gamepad.id}`);
        // Clean up button states
        this.lastButtonStates.delete(e.gamepad.index);
        // Stop polling if no gamepads
        if (this.lastButtonStates.size === 0 && this.gamepadInterval) {
            clearInterval(this.gamepadInterval);
            this.gamepadInterval = null;
        }
    };
    startPolling() {
        this.gamepadInterval = window.setInterval(() => {
            if (!this.enabled)
                return;
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (!gamepad)
                    continue;
                this.processGamepadInput(gamepad);
            }
        }, INPUT_TIMING.GAMEPAD_POLL_MS);
    }
    processGamepadInput(gamepad) {
        const lastStates = this.lastButtonStates.get(gamepad.index);
        if (!lastStates)
            return;
        // Process button presses/releases
        gamepad.buttons.forEach((button, index) => {
            const wasPressed = lastStates[index];
            const isPressed = button.pressed;
            if (isPressed && !wasPressed) {
                // Button press
                this.handleGamepadButtonPress(index, button.value);
            }
            else if (!isPressed && wasPressed) {
                // Button release
                this.handleGamepadButtonRelease(index);
            }
            lastStates[index] = isPressed;
        });
        // Process analog sticks for pitch bend/modulation
        this.processAnalogInputs(gamepad);
    }
    handleGamepadButtonPress(buttonIndex, pressure) {
        // Map gamepad buttons to MIDI notes
        // This is a basic mapping - could be made configurable
        const note = this.mapButtonToNote(buttonIndex);
        if (note < MIDI_NOTES.LOWEST_PIANO || note > MIDI_NOTES.HIGHEST_PIANO)
            return;
        const velocity = this.velocityProcessor.processVelocity(pressure);
        // Create mock mouse event for compatibility
        const mockEvent = new MouseEvent('mousedown', {
            clientY: 100 - (velocity / 127) * 100
        });
        this.keyboard.handleKeyPress(note, mockEvent);
        this.log(`Gamepad button ${buttonIndex}: Note ${note}, velocity ${velocity}`);
    }
    handleGamepadButtonRelease(buttonIndex) {
        const note = this.mapButtonToNote(buttonIndex);
        if (note < MIDI_NOTES.LOWEST_PIANO || note > MIDI_NOTES.HIGHEST_PIANO)
            return;
        this.keyboard.handleKeyRelease(note);
        this.log(`Gamepad button ${buttonIndex} released: Note ${note}`);
    }
    processAnalogInputs(gamepad) {
        if (gamepad.axes.length < 2)
            return;
        // Left stick X-axis for pitch bend
        const pitchBendValue = Math.round(gamepad.axes[0] * 8191); // -8191 to +8191
        if (Math.abs(pitchBendValue) > 100) { // Dead zone
            this.keyboard.getMidiBridge().sendPitchBend(this.keyboard.getCurrentChannel(), pitchBendValue);
        }
        // Left stick Y-axis for modulation
        const modulationValue = Math.round((gamepad.axes[1] + 1) * 63.5); // 0-127
        if (modulationValue > 5) { // Dead zone
            this.keyboard.getMidiBridge().sendControlChange(this.keyboard.getCurrentChannel(), 1, // Modulation wheel
            modulationValue);
        }
    }
    /**
     * Map gamepad button index to MIDI note
     * This is a basic chromatic mapping starting from middle C
     */
    mapButtonToNote(buttonIndex) {
        // Start from middle C and go chromatically
        return MIDI_NOTES.MIDDLE_C + buttonIndex;
    }
    /**
     * Set custom button-to-note mapping
     */
    setButtonMapping(mapping) {
        // Could be implemented for customizable mappings
        this.log('Custom button mapping not yet implemented');
    }
}
//# sourceMappingURL=gamepad-input-handler.js.map