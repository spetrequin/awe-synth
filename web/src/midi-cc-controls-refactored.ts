/**
 * MIDI CC Controls (Refactored) - Clean, modular implementation
 * Part of AWE Player EMU8000 Emulator
 */

import { MidiBridge } from './midi-bridge.js';
import { CCControl, getControlByCC, QUICK_SELECT_CONTROLS, CONTROL_GROUPS } from './midi-cc-definitions.js';
import { ControlGroupBuilder } from './cc-controls/control-group-builder.js';

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
        
        // Initialize default values from definitions
        this.initializeDefaultValues();
    }
    
    /**
     * Initialize default CC values
     */
    private initializeDefaultValues(): void {
        Object.values(CONTROL_GROUPS).forEach(groupDef => {
            groupDef.controls.forEach(control => {
                if (control.cc >= 0) {
                    this.ccValues.set(control.cc, control.default);
                }
            });
        });
    }
    
    /**
     * Create the CC controls UI
     */
    public createControls(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) {
            this.logToDebug(`Error: Container ${containerId} not found`);
            return;
        }
        
        this.controlsElement = document.createElement('div');
        this.controlsElement.className = 'midi-cc-controls';
        
        // Create all control groups
        const groups = this.groupBuilder.createAllGroups();
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
        const section = document.createElement('div');
        section.className = 'control-group preset-section';
        
        const title = document.createElement('h3');
        title.textContent = 'Quick Presets';
        section.appendChild(title);
        
        const presetGrid = document.createElement('div');
        presetGrid.className = 'preset-grid';
        
        Object.entries(QUICK_SELECT_CONTROLS).forEach(([name, values]) => {
            const button = document.createElement('button');
            button.className = 'preset-button';
            button.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            
            button.addEventListener('click', () => {
                this.applyPreset(values);
                this.logToDebug(`Applied ${name} preset`);
            });
            
            presetGrid.appendChild(button);
        });
        
        // Reset button
        const resetButton = document.createElement('button');
        resetButton.className = 'preset-button reset-button';
        resetButton.textContent = 'Reset All';
        resetButton.addEventListener('click', () => {
            this.resetAll();
        });
        
        presetGrid.appendChild(resetButton);
        section.appendChild(presetGrid);
        
        return section;
    }
    
    /**
     * Apply a preset configuration
     */
    private applyPreset(preset: Record<string, number>): void {
        Object.entries(preset).forEach(([controlName, value]) => {
            // Map preset names to CC numbers
            const ccMap: Record<string, number> = {
                'volume': 7,
                'pan': 10,
                'reverb': 91,
                'chorus': 93
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
            this.logToDebug(`Pitch Bend: ${value}`);
        } else {
            this.ccValues.set(control.cc, value);
            this.midiBridge.sendControlChange(this.currentChannel, control.cc, value);
            this.logToDebug(`CC${control.cc} (${control.name}): ${value}`);
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
        if (channel >= 0 && channel <= 15) {
            this.currentChannel = channel;
            this.sendInitialValues();
            this.logToDebug(`CC Controls channel changed to ${channel}`);
        }
    }
    
    /**
     * Reset all controllers
     */
    public resetAll(): void {
        this.groupBuilder.resetAllControls();
        this.logToDebug('All CC controls reset');
    }
    
    /**
     * Reset specific control group
     */
    public resetGroup(groupName: string): void {
        if (groupName in CONTROL_GROUPS) {
            this.groupBuilder.resetGroup(groupName as keyof typeof CONTROL_GROUPS);
            this.logToDebug(`Reset ${groupName} controls`);
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
    public setControlValue(ccNumber: number, value: number): void {
        const control = getControlByCC(ccNumber);
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
        if (document.getElementById('midi-cc-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'midi-cc-styles';
        style.textContent = `
            .midi-cc-controls {
                background: #333;
                border-radius: 5px;
                padding: 15px;
                color: white;
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
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
            
            input[type="range"] {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #555;
                outline: none;
                -webkit-appearance: none;
            }
            
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #05a;
                cursor: pointer;
            }
            
            input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #05a;
                cursor: pointer;
                border: none;
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
            
            /* Preset section */
            .preset-section {
                border-top: 2px solid #555;
            }
            
            .preset-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 10px;
            }
            
            .preset-button {
                padding: 8px 12px;
                border: 1px solid #555;
                border-radius: 3px;
                background: #444;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
            }
            
            .preset-button:hover {
                background: #555;
                border-color: #666;
            }
            
            .reset-button {
                background: #c50;
                border-color: #d60;
            }
            
            .reset-button:hover {
                background: #d60;
                border-color: #e70;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Log to debug textarea
     */
    private logToDebug(message: string): void {
        const debugLog = document.getElementById('debug-log') as HTMLTextAreaElement;
        if (debugLog) {
            debugLog.value += `[CC Controls] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}

// Re-export for compatibility
export { CCControl } from './midi-cc-definitions.js';