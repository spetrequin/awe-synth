/**
 * Control Group Builder - Creates organized groups of MIDI CC controls
 * Part of AWE Player EMU8000 Emulator
 */

import { CCControl, getControlGroups, getCCControlDefinitions } from '../midi-cc-definitions.js';
import { ControlFactory, ControlChangeHandler } from './control-factory.js';

export class ControlGroupBuilder {
    private controlFactory: ControlFactory;
    private controlElements: Map<number, HTMLElement> = new Map();
    
    constructor(changeHandler: ControlChangeHandler) {
        this.controlFactory = new ControlFactory(changeHandler);
    }
    
    /**
     * Create all control groups
     */
    public async createAllGroups(): Promise<HTMLElement[]> {
        const groups: HTMLElement[] = [];
        const controlGroups = await getControlGroups();
        
        Object.entries(controlGroups).forEach(([, groupDef]) => {
            const groupElement = this.createControlGroup(groupDef.title, groupDef.controls);
            groups.push(groupElement);
        });
        
        return groups;
    }
    
    /**
     * Create a single control group
     */
    public createControlGroup(title: string, controls: CCControl[]): HTMLElement {
        const group = document.createElement('div');
        group.className = 'control-group';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        group.appendChild(titleElement);
        
        const controlsGrid = document.createElement('div');
        controlsGrid.className = 'controls-grid';
        
        controls.forEach(control => {
            const controlElement = this.controlFactory.createControl(control);
            this.controlElements.set(control.cc, controlElement);
            controlsGrid.appendChild(controlElement);
        });
        
        group.appendChild(controlsGrid);
        return group;
    }
    
    /**
     * Reset all controls to default values
     */
    public async resetAllControls(): Promise<void> {
        const controlGroups = await getControlGroups();
        Object.values(controlGroups).forEach(groupDef => {
            groupDef.controls.forEach(control => {
                const controlElement = this.controlElements.get(control.cc);
                if (controlElement) {
                    this.controlFactory.resetControl(controlElement, control);
                }
            });
        });
    }
    
    /**
     * Reset controls in a specific group
     */
    public async resetGroup(groupName: string): Promise<void> {
        const controlGroups = await getControlGroups();
        const groupDef = controlGroups[groupName];
        if (!groupDef) return;
        
        groupDef.controls.forEach(control => {
            const controlElement = this.controlElements.get(control.cc);
            if (controlElement) {
                this.controlFactory.resetControl(controlElement, control);
            }
        });
    }
    
    /**
     * Get control element by CC number
     */
    public getControlElement(ccNumber: number): HTMLElement | undefined {
        return this.controlElements.get(ccNumber);
    }
    
    /**
     * Set control value programmatically
     */
    public async setControlValue(ccNumber: number, value: number): Promise<void> {
        const controlElement = this.controlElements.get(ccNumber);
        if (!controlElement) return;
        
        // Find the control definition
        const controls = await getCCControlDefinitions();
        const targetControl = controls.find(c => c.cc === ccNumber);
        if (!targetControl) return;
        
        // Update the visual element
        const slider = controlElement.querySelector('input[type="range"]') as HTMLInputElement;
        if (slider) {
            slider.value = value.toString();
            const valueDisplay = controlElement.querySelector('.value-display') as HTMLElement;
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(value, targetControl);
            }
        }
        
        const knob = controlElement.querySelector('.knob') as HTMLElement;
        if (knob) {
            this.updateKnobVisual(knob, value, targetControl);
            const valueDisplay = controlElement.querySelector('.value-display') as HTMLElement;
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(value, targetControl);
            }
        }
    }
    
    private formatValue(value: number, control: CCControl): string {
        if (control.cc === -1) { // Pitch bend
            return value > 0 ? `+${value}` : value.toString();
        } else if (control.bipolar && control.name === 'Pan') {
            const panValue = value - 64;
            if (panValue === 0) return 'C';
            return panValue > 0 ? `R${panValue}` : `L${-panValue}`;
        }
        return value.toString();
    }
    
    private updateKnobVisual(knob: HTMLElement, value: number, control: CCControl): void {
        const range = control.max - control.min;
        const normalized = (value - control.min) / range;
        const rotation = -135 + (normalized * 270); // -135° to +135°
        const indicator = knob.querySelector('.knob-indicator') as HTMLElement;
        if (indicator) {
            indicator.style.transform = `rotate(${rotation}deg)`;
        }
    }
}