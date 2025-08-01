/**
 * MIDI CC Controls - Clean, modular implementation
 * Part of AWE Player EMU8000 Emulator
 */

import { MidiBridge } from './midi-bridge.js';
import { CCControl, getControlByCC, QUICK_SELECT_CONTROLS, getControlGroups, getCCControlDefinitions } from './midi-cc-definitions.js';
import { ControlGroupBuilder } from './cc-controls/control-group-builder.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
import { isValidMIDIChannel, MIDI_CC, UI_CONSTANTS } from './midi-constants.js';
import { createPresetSection } from './utils/ui-components.js';
import { generateComponentStyles, injectStyles } from './utils/ui-styles.js';

export class MidiCCControls {
    private midiBridge: MidiBridge;
    private currentChannel = 0;
    private controlsElement: HTMLElement | null = null;
    private groupBuilder: ControlGroupBuilder;
    private ccValues: Map<number, number> = new Map();
    
    constructor(midiBridge: MidiBridge) {
        this.midiBridge = midiBridge;
        
        // Initialize group builder with change handler
        this.groupBuilder = new ControlGroupBuilder((control, value) => {
            this.handleControlChange(control, value);
        });
    }
    
    /**
     * Initialize default CC values
     */
    private async initializeDefaultValues(): Promise<void> {
        const controls = await getCCControlDefinitions();
        controls.forEach(control => {
            if (control.cc >= 0) {
                this.ccValues.set(control.cc, control.default);
            }
        });
    }
    
    /**
     * Create the CC controls UI
     */
    public async createControls(containerId: string): Promise<void> {
        const container = document.getElementById(containerId);
        if (!container) {
            DEBUG_LOGGERS.midiControls.error(`Container ${containerId} not found`);
            return;
        }
        
        this.controlsElement = document.createElement('div');
        this.controlsElement.className = 'midi-cc-controls';
        
        // Initialize default values and create control groups
        await this.initializeDefaultValues();
        const groups = await this.groupBuilder.createAllGroups();
        groups.forEach(group => {
            this.controlsElement!.appendChild(group);
        });
        
        // Create preset section
        const presetSection = this.createPresetSection();
        this.controlsElement.appendChild(presetSection);
        
        container.appendChild(this.controlsElement);
        
        // Send initial values
        this.sendInitialValues();
        
        this.addControlStyles();
    }
    
    /**
     * Create preset section for quick instrument setups
     */
    private createPresetSection(): HTMLElement {
        return createPresetSection(
            'Quick Presets',
            QUICK_SELECT_CONTROLS,
            (name, values) => {
                this.applyPreset(values);
                DEBUG_LOGGERS.midiControls.log(`Applied ${name} preset`);
            },
            () => this.resetAll()
        );
    }
    
    /**
     * Apply a preset configuration
     */
    private applyPreset(preset: Record<string, number>): void {
        Object.entries(preset).forEach(([controlName, value]) => {
            // Map preset names to CC numbers
            const ccMap: Record<string, number> = {
                'volume': MIDI_CC.CHANNEL_VOLUME,
                'pan': MIDI_CC.PAN,
                'reverb': MIDI_CC.REVERB_SEND,
                'chorus': MIDI_CC.CHORUS_SEND
            };
            
            const ccNumber = ccMap[controlName];
            if (ccNumber !== undefined) {
                this.ccValues.set(ccNumber, value);
                this.midiBridge.sendControlChange(this.currentChannel, ccNumber, value);
                this.groupBuilder.setControlValue(ccNumber, value);
            }
        });
    }
    
    /**
     * Handle control value change
     */
    private handleControlChange(control: CCControl, value: number): void {
        if (control.cc === -1) { // Pitch bend
            this.midiBridge.sendPitchBend(this.currentChannel, value);
            DEBUG_LOGGERS.midiControls.log(`Pitch Bend: ${value}`);
        } else {
            this.ccValues.set(control.cc, value);
            this.midiBridge.sendControlChange(this.currentChannel, control.cc, value);
            DEBUG_LOGGERS.midiControls.log(`CC${control.cc} (${control.name}): ${value}`);
        }
    }
    
    /**
     * Send initial CC values
     */
    private sendInitialValues(): void {
        this.ccValues.forEach((value, ccNumber) => {
            this.midiBridge.sendControlChange(this.currentChannel, ccNumber, value);
        });
    }
    
    /**
     * Set MIDI channel
     */
    public setChannel(channel: number): void {
        if (isValidMIDIChannel(channel)) {
            this.currentChannel = channel;
            this.sendInitialValues();
            DEBUG_LOGGERS.midiControls.log(`CC Controls channel changed to ${channel}`);
        }
    }
    
    /**
     * Reset all controllers
     */
    public async resetAll(): Promise<void> {
        await this.groupBuilder.resetAllControls();
        DEBUG_LOGGERS.midiControls.log('All CC controls reset');
    }
    
    /**
     * Reset specific control group
     */
    public async resetGroup(groupName: string): Promise<void> {
        const controlGroups = await getControlGroups();
        if (groupName in controlGroups) {
            this.groupBuilder.resetGroup(groupName);
            DEBUG_LOGGERS.midiControls.log(`Reset ${groupName} controls`);
        }
    }
    
    /**
     * Get current value of a CC controller
     */
    public getControlValue(ccNumber: number): number | undefined {
        return this.ccValues.get(ccNumber);
    }
    
    /**
     * Set control value programmatically
     */
    public async setControlValue(ccNumber: number, value: number): Promise<void> {
        const control = await getControlByCC(ccNumber);
        if (control) {
            const clampedValue = Math.max(control.min, Math.min(control.max, value));
            this.handleControlChange(control, clampedValue);
            this.groupBuilder.setControlValue(ccNumber, clampedValue);
        }
    }
    
    /**
     * Add CSS styles
     */
    private addControlStyles(): void {
        const customStyles = `
            .midi-cc-controls {
                background: #333;
            }
            
            .control-group {
                margin-bottom: 20px;
                padding: 15px;
                background: #2a2a2a;
                border-radius: 5px;
            }
            
            .control-group h3 {
                margin: 0 0 15px 0;
                color: #ccc;
                font-size: 16px;
            }
            
            .controls-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(${UI_CONSTANTS.GRID_MIN_COLUMN_WIDTH_CONTROLS}px, 1fr));
                gap: 20px;
            }
            
            .cc-control {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            
            .cc-control label {
                font-size: 12px;
                color: #aaa;
                text-align: center;
            }
            
            /* Slider styles */
            .slider-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                width: 100%;
            }
            
            .bipolar-slider {
                background: linear-gradient(to right, #555 0%, #555 50%, #555 100%);
            }
            
            /* Knob styles */
            .knob-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            }
            
            .knob {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, #666, #333);
                border: 2px solid #222;
                cursor: ns-resize;
                position: relative;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .knob-indicator {
                position: absolute;
                width: 2px;
                height: 15px;
                background: #05a;
                top: 5px;
                left: 50%;
                transform-origin: center 15px;
                margin-left: -1px;
            }
            
            /* Button styles */
            .cc-button {
                padding: 10px 20px;
                border: 2px solid #555;
                border-radius: 5px;
                background: #333;
                color: white;
                cursor: pointer;
                transition: all 0.1s;
                font-size: 14px;
            }
            
            .cc-button:hover {
                background: #444;
                border-color: #666;
            }
            
            .cc-button.pressed {
                background: #05a;
                border-color: #07c;
                transform: scale(0.95);
            }
            
            .value-display {
                font-size: 11px;
                color: #888;
                font-family: monospace;
                min-width: 40px;
                text-align: center;
            }
        `;
        
        const componentStyles = generateComponentStyles('MidiCCControls', customStyles);
        injectStyles('midi-cc-styles', componentStyles);
    }
    
}

// Re-export for compatibility
export { CCControl } from './midi-cc-definitions.js';