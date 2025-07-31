/**
 * Computer Keyboard Input Handler - Timing-based velocity
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler, InputHandlerOptions } from './base-input-handler.js';
export declare class ComputerKeyboardInputHandler extends BaseInputHandler {
    private keyPressTimers;
    private currentOctave;
    private keyMapping;
    constructor(options: InputHandlerOptions);
    initialize(): void;
    cleanup(): void;
    getType(): string;
    /**
     * Set current octave
     */
    setOctave(octave: number): void;
    /**
     * Get current octave
     */
    getOctave(): number;
    private handleKeyDown;
    private handleKeyUp;
    /**
     * Calculate velocity from key press duration
     */
    private calculateKeyVelocity;
}
//# sourceMappingURL=keyboard-input-handler.d.ts.map