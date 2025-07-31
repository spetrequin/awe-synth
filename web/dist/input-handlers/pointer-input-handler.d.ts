/**
 * Pointer Input Handler - Pressure-sensitive stylus/pen support
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler, InputHandlerOptions } from './base-input-handler.js';
export declare class PointerInputHandler extends BaseInputHandler {
    private keyboardElement;
    constructor(options: InputHandlerOptions);
    initialize(): void;
    cleanup(): void;
    getType(): string;
    private setupPointerListeners;
    private handlePointerDown;
    private handlePointerUp;
    private handlePointerLeave;
    /**
     * Calculate velocity from pointer event (includes pressure)
     */
    private calculatePointerVelocity;
}
//# sourceMappingURL=pointer-input-handler.d.ts.map