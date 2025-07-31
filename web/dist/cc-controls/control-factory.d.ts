/**
 * Control Factory - Creates different types of MIDI CC controls
 * Part of AWE Player EMU8000 Emulator
 */
import { CCControl } from '../midi-cc-definitions.js';
export interface ControlChangeHandler {
    (control: CCControl, value: number): void;
}
export declare class ControlFactory {
    private changeHandler;
    constructor(changeHandler: ControlChangeHandler);
    /**
     * Create control based on type
     */
    createControl(control: CCControl): HTMLElement;
    private createControlByType;
    /**
     * Create slider control
     */
    private createSlider;
    /**
     * Create knob control
     */
    private createKnob;
    /**
     * Setup knob mouse interaction
     */
    private setupKnobInteraction;
    /**
     * Update knob visual rotation
     */
    private updateKnobVisual;
    /**
     * Create button control
     */
    private createButton;
    /**
     * Format value for display
     */
    private formatValue;
    /**
     * Reset control to default value
     */
    resetControl(controlElement: HTMLElement, control: CCControl): void;
}
//# sourceMappingURL=control-factory.d.ts.map