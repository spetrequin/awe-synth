/**
 * Touch Input Handler - Advanced multi-touch support
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler, InputHandlerOptions } from './base-input-handler.js';
export declare class TouchInputHandler extends BaseInputHandler {
    private activeTouches;
    private aftertouch;
    private glissando;
    private keyboardElement;
    constructor(options: InputHandlerOptions);
    initialize(): void;
    cleanup(): void;
    getType(): string;
    /**
     * Enable/disable aftertouch
     */
    setAftertouch(enabled: boolean): void;
    /**
     * Enable/disable glissando
     */
    setGlissando(enabled: boolean): void;
    private setupTouchListeners;
    private handleTouchStart;
    private handleTouchMove;
    private handleTouchEnd;
    private handleGlissando;
    private handleAftertouch;
    private calculateTouchVelocity;
}
//# sourceMappingURL=touch-input-handler.d.ts.map