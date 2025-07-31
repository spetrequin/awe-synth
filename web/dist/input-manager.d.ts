/**
 * Input Manager - Coordinates all input handlers
 * Part of AWE Player EMU8000 Emulator
 */
import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { BaseInputHandler } from './input-handlers/base-input-handler.js';
export interface InputManagerOptions {
    keyboard: VirtualMidiKeyboard;
    enableTouch?: boolean;
    enableComputerKeyboard?: boolean;
    enablePointer?: boolean;
    enableGamepad?: boolean;
    velocityProfile?: string;
    velocitySensitivity?: number;
}
export declare class InputManager {
    private keyboard;
    private velocityProcessor;
    private handlers;
    private settingsElement;
    constructor(options: InputManagerOptions);
    /**
     * Initialize input handlers based on options
     */
    private initializeHandlers;
    /**
     * Enable/disable specific input handler
     */
    setHandlerEnabled(handlerType: string, enabled: boolean): void;
    /**
     * Get handler by type
     */
    getHandler<T extends BaseInputHandler>(handlerType: string): T | undefined;
    /**
     * Set velocity profile for all handlers
     */
    setVelocityProfile(profileName: string): boolean;
    /**
     * Set velocity sensitivity
     */
    setVelocitySensitivity(sensitivity: number): void;
    /**
     * Get available velocity profiles
     */
    getVelocityProfiles(): string[];
    /**
     * Set touch-specific options
     */
    setTouchOptions(options: {
        aftertouch?: boolean;
        glissando?: boolean;
    }): void;
    /**
     * Set computer keyboard octave
     */
    setKeyboardOctave(octave: number): void;
    /**
     * Create settings UI
     */
    createSettingsUI(containerId: string): void;
    private createVelocitySettings;
    private createHandlerToggles;
    private createAdvancedSettings;
    private addSettingsStyles;
    /**
     * Setup debug logging coordination
     */
    private setupDebugLogging;
    /**
     * Cleanup all handlers
     */
    cleanup(): void;
}
//# sourceMappingURL=input-manager.d.ts.map