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
export declare abstract class BaseInputHandler {
    protected keyboard: VirtualMidiKeyboard;
    protected velocityProcessor: VelocityCurveProcessor;
    protected debugLog: (message: string) => void;
    protected enabled: boolean;
    constructor(options: InputHandlerOptions);
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
    setEnabled(enabled: boolean): void;
    /**
     * Check if handler is enabled
     */
    isEnabled(): boolean;
    /**
     * Get handler type name
     */
    abstract getType(): string;
    /**
     * Helper to log debug messages
     */
    protected log(message: string): void;
}
//# sourceMappingURL=base-input-handler.d.ts.map