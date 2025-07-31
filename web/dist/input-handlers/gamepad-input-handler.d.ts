/**
 * Gamepad Input Handler - Velocity-sensitive pad controller support
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler, InputHandlerOptions } from './base-input-handler.js';
export declare class GamepadInputHandler extends BaseInputHandler {
    private gamepadInterval;
    private lastButtonStates;
    constructor(options: InputHandlerOptions);
    initialize(): void;
    cleanup(): void;
    getType(): string;
    private handleGamepadConnected;
    private handleGamepadDisconnected;
    private startPolling;
    private processGamepadInput;
    private handleGamepadButtonPress;
    private handleGamepadButtonRelease;
    private processAnalogInputs;
    /**
     * Map gamepad button index to MIDI note
     * This is a basic chromatic mapping starting from middle C
     */
    private mapButtonToNote;
    /**
     * Set custom button-to-note mapping
     */
    setButtonMapping(mapping: Map<number, number>): void;
}
//# sourceMappingURL=gamepad-input-handler.d.ts.map