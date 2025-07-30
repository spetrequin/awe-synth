/**
 * Base Input Handler Interface
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from '../virtual-midi-keyboard.js';
import { VelocityCurveProcessor } from '../velocity-curves.js';

export interface InputHandlerOptions {
    velocityProcessor: VelocityCurveProcessor;
    keyboard: VirtualMidiKeyboard;
    debugLog?: (message: string) => void;
}

export abstract class BaseInputHandler {
    protected keyboard: VirtualMidiKeyboard;
    protected velocityProcessor: VelocityCurveProcessor;
    protected debugLog: (message: string) => void;
    protected enabled: boolean = true;
    
    constructor(options: InputHandlerOptions) {
        this.keyboard = options.keyboard;
        this.velocityProcessor = options.velocityProcessor;
        this.debugLog = options.debugLog || (() => {});
    }
    
    /**
     * Initialize the input handler
     */
    abstract initialize(): void;
    
    /**
     * Cleanup resources
     */
    abstract cleanup(): void;
    
    /**
     * Enable/disable this input handler
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    /**
     * Check if handler is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Get handler type name
     */
    abstract getType(): string;
    
    /**
     * Helper to log debug messages
     */
    protected log(message: string): void {
        this.debugLog(`[${this.getType()}] ${message}`);
    }
}