/**
 * MIDI CC Controls - Clean, modular implementation
 * Part of AWE Player EMU8000 Emulator
 */
import { MidiBridge } from './midi-bridge.js';
export declare class MidiCCControls {
    private midiBridge;
    private currentChannel;
    private controlsElement;
    private groupBuilder;
    private ccValues;
    constructor(midiBridge: MidiBridge);
    /**
     * Initialize default CC values
     */
    private initializeDefaultValues;
    /**
     * Create the CC controls UI
     */
    createControls(containerId: string): Promise<void>;
    /**
     * Create preset section for quick instrument setups
     */
    private createPresetSection;
    /**
     * Apply a preset configuration
     */
    private applyPreset;
    /**
     * Handle control value change
     */
    private handleControlChange;
    /**
     * Send initial CC values
     */
    private sendInitialValues;
    /**
     * Set MIDI channel
     */
    setChannel(channel: number): void;
    /**
     * Reset all controllers
     */
    resetAll(): Promise<void>;
    /**
     * Reset specific control group
     */
    resetGroup(groupName: string): Promise<void>;
    /**
     * Get current value of a CC controller
     */
    getControlValue(ccNumber: number): number | undefined;
    /**
     * Set control value programmatically
     */
    setControlValue(ccNumber: number, value: number): Promise<void>;
    /**
     * Add CSS styles
     */
    private addControlStyles;
}
export { CCControl } from './midi-cc-definitions.js';
//# sourceMappingURL=midi-cc-controls.d.ts.map