/**
 * Virtual MIDI Keyboard - 88-key piano interface for testing without hardware
 * Part of AWE Player EMU8000 Emulator
 */
import { MidiBridge } from './midi-bridge.js';
import { VelocityCurveProcessor } from './velocity-curves.js';
export interface VirtualKeyboardOptions {
    velocityProfile?: string;
    velocitySensitivity?: number;
}
export declare class VirtualMidiKeyboard {
    private keys;
    private currentOctave;
    private midiBridge;
    private keyboardElement;
    private sustainPedal;
    private currentChannel;
    private layoutGenerator;
    private velocityProcessor;
    private keyMapping;
    constructor(midiBridge: MidiBridge, options?: VirtualKeyboardOptions);
    /**
     * Initialize all 88 piano keys using layout generator
     */
    private initializeKeys;
    /**
     * Create visual keyboard interface
     */
    createVisualKeyboard(containerId: string): void;
    /**
     * Create visual representation of one octave using layout generator
     */
    private createOctaveElement;
    /**
     * Create individual key element using layout information
     */
    private createKeyElement;
    /**
     * Handle key press (mouse/touch)
     */
    handleKeyPress(noteNumber: number, event: MouseEvent | TouchEvent): void;
    /**
     * Handle key release
     */
    handleKeyRelease(noteNumber: number): void;
    /**
     * Calculate velocity from mouse/touch position using centralized velocity processing
     */
    private calculateVelocity;
    /**
     * Update visual state of key
     */
    private updateKeyVisual;
    /**
     * Setup computer keyboard listeners
     */
    private setupKeyboardListeners;
    /**
     * Set sustain pedal state
     */
    setSustainPedal(isPressed: boolean): void;
    /**
     * Change GM program
     */
    setProgram(program: number): void;
    /**
     * Set MIDI channel
     */
    setChannel(channel: number): void;
    /**
     * Set velocity profile
     */
    setVelocityProfile(profileName: string): boolean;
    /**
     * Set velocity sensitivity
     */
    setVelocitySensitivity(sensitivity: number): void;
    /**
     * Get current velocity processor
     */
    getVelocityProcessor(): VelocityCurveProcessor;
    /**
     * Get current MIDI channel
     */
    getCurrentChannel(): number;
    /**
     * Get MIDI bridge instance
     */
    getMidiBridge(): MidiBridge;
    /**
     * Add CSS styles for keyboard
     */
    private addKeyboardStyles;
}
//# sourceMappingURL=virtual-midi-keyboard.d.ts.map