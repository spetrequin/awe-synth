/**
 * Control Group Builder - Creates organized groups of MIDI CC controls
 * Part of AWE Player EMU8000 Emulator
 */
import { getControlGroups, getCCControlDefinitions } from '../midi-cc-definitions.js';
import { ControlFactory } from './control-factory.js';
export class ControlGroupBuilder {
    controlFactory;
    controlElements = new Map();
    constructor(changeHandler) {
        this.controlFactory = new ControlFactory(changeHandler);
    }
    /**
     * Create all control groups
     */
    async createAllGroups() {
        const groups = [];
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
    createControlGroup(title, controls) {
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
    async resetAllControls() {
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
    async resetGroup(groupName) {
        const controlGroups = await getControlGroups();
        const groupDef = controlGroups[groupName];
        if (!groupDef)
            return;
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
    getControlElement(ccNumber) {
        return this.controlElements.get(ccNumber);
    }
    /**
     * Set control value programmatically
     */
    async setControlValue(ccNumber, value) {
        const controlElement = this.controlElements.get(ccNumber);
        if (!controlElement)
            return;
        // Find the control definition
        const controls = await getCCControlDefinitions();
        const targetControl = controls.find(c => c.cc === ccNumber);
        if (!targetControl)
            return;
        // Update the visual element
        const slider = controlElement.querySelector('input[type="range"]');
        if (slider) {
            slider.value = value.toString();
            const valueDisplay = controlElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(value, targetControl);
            }
        }
        const knob = controlElement.querySelector('.knob');
        if (knob) {
            this.updateKnobVisual(knob, value, targetControl);
            const valueDisplay = controlElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(value, targetControl);
            }
        }
    }
    formatValue(value, control) {
        if (control.cc === -1) { // Pitch bend
            return value > 0 ? `+${value}` : value.toString();
        }
        else if (control.bipolar && control.name === 'Pan') {
            const panValue = value - 64;
            if (panValue === 0)
                return 'C';
            return panValue > 0 ? `R${panValue}` : `L${-panValue}`;
        }
        return value.toString();
    }
    updateKnobVisual(knob, value, control) {
        const range = control.max - control.min;
        const normalized = (value - control.min) / range;
        const rotation = -135 + (normalized * 270); // -135° to +135°
        const indicator = knob.querySelector('.knob-indicator');
        if (indicator) {
            indicator.style.transform = `rotate(${rotation}deg)`;
        }
    }
}
//# sourceMappingURL=control-group-builder.js.map