/**
 * Control Group Builder - Creates organized groups of MIDI CC controls
 * Part of AWE Player EMU8000 Emulator
 */
import { CCControl } from '../midi-cc-definitions.js';
import { ControlChangeHandler } from './control-factory.js';
export declare class ControlGroupBuilder {
    private controlFactory;
    private controlElements;
    constructor(changeHandler: ControlChangeHandler);
    /**
     * Create all control groups
     */
    createAllGroups(): Promise<HTMLElement[]>;
    /**
     * Create a single control group
     */
    createControlGroup(title: string, controls: CCControl[]): HTMLElement;
    /**
     * Reset all controls to default values
     */
    resetAllControls(): Promise<void>;
    /**
     * Reset controls in a specific group
     */
    resetGroup(groupName: string): Promise<void>;
    /**
     * Get control element by CC number
     */
    getControlElement(ccNumber: number): HTMLElement | undefined;
    /**
     * Set control value programmatically
     */
    setControlValue(ccNumber: number, value: number): Promise<void>;
    private formatValue;
    private updateKnobVisual;
}
//# sourceMappingURL=control-group-builder.d.ts.map