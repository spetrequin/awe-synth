/**
 * Control Factory - Creates different types of MIDI CC controls
 * Part of AWE Player EMU8000 Emulator
 */
import { UI_CONSTANTS } from '../midi-constants.js';
export class ControlFactory {
    changeHandler;
    constructor(changeHandler) {
        this.changeHandler = changeHandler;
    }
    /**
     * Create control based on type
     */
    createControl(control) {
        const container = document.createElement('div');
        container.className = `cc-control ${control.type}-control`;
        const label = document.createElement('label');
        label.textContent = control.name;
        container.appendChild(label);
        const controlElement = this.createControlByType(control);
        container.appendChild(controlElement);
        return container;
    }
    createControlByType(control) {
        switch (control.type) {
            case 'slider':
                return this.createSlider(control);
            case 'knob':
                return this.createKnob(control);
            case 'button':
                return this.createButton(control);
            default:
                throw new Error(`Unknown control type: ${control.type}`);
        }
    }
    /**
     * Create slider control
     */
    createSlider(control) {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = control.min.toString();
        slider.max = control.max.toString();
        slider.value = control.default.toString();
        slider.className = control.bipolar ? 'bipolar-slider' : 'unipolar-slider';
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = this.formatValue(control.default, control);
        // Handle changes
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            valueDisplay.textContent = this.formatValue(value, control);
            this.changeHandler(control, value);
        });
        // Reset on double click
        slider.addEventListener('dblclick', () => {
            slider.value = control.default.toString();
            valueDisplay.textContent = this.formatValue(control.default, control);
            this.changeHandler(control, control.default);
        });
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        return sliderContainer;
    }
    /**
     * Create knob control
     */
    createKnob(control) {
        const knobContainer = document.createElement('div');
        knobContainer.className = 'knob-container';
        const knob = document.createElement('div');
        knob.className = 'knob';
        const indicator = document.createElement('div');
        indicator.className = 'knob-indicator';
        knob.appendChild(indicator);
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = this.formatValue(control.default, control);
        // Set up knob interaction
        this.setupKnobInteraction(knob, control, valueDisplay);
        // Set initial position
        this.updateKnobVisual(knob, control.default, control);
        knobContainer.appendChild(knob);
        knobContainer.appendChild(valueDisplay);
        return knobContainer;
    }
    /**
     * Setup knob mouse interaction
     */
    setupKnobInteraction(knob, control, valueDisplay) {
        let isDragging = false;
        let startY = 0;
        let startValue = control.default;
        // Mouse drag handling
        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startValue = control.default; // Should track current value
            document.body.style.cursor = 'ns-resize';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging)
                return;
            const deltaY = startY - e.clientY;
            const range = control.max - control.min;
            const newValue = Math.round(startValue + (deltaY / 100) * range);
            const clampedValue = Math.max(control.min, Math.min(control.max, newValue));
            this.updateKnobVisual(knob, clampedValue, control);
            valueDisplay.textContent = this.formatValue(clampedValue, control);
            this.changeHandler(control, clampedValue);
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        });
        // Double click to reset
        knob.addEventListener('dblclick', () => {
            this.updateKnobVisual(knob, control.default, control);
            valueDisplay.textContent = this.formatValue(control.default, control);
            this.changeHandler(control, control.default);
        });
    }
    /**
     * Update knob visual rotation
     */
    updateKnobVisual(knob, value, control) {
        const range = control.max - control.min;
        const normalized = (value - control.min) / range;
        const rotation = UI_CONSTANTS.KNOB_MIN_ANGLE + (normalized * UI_CONSTANTS.KNOB_ROTATION_RANGE);
        const indicator = knob.querySelector('.knob-indicator');
        if (indicator) {
            indicator.style.transform = `rotate(${rotation}deg)`;
        }
    }
    /**
     * Create button control
     */
    createButton(control) {
        const button = document.createElement('button');
        button.className = 'cc-button';
        button.textContent = control.name;
        const updateButton = (pressed) => {
            button.classList.toggle('pressed', pressed);
            const value = pressed ? control.max : control.min;
            this.changeHandler(control, value);
        };
        // Mouse events
        button.addEventListener('mousedown', () => updateButton(true));
        button.addEventListener('mouseup', () => updateButton(false));
        button.addEventListener('mouseleave', () => updateButton(false));
        // Touch events
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            updateButton(true);
        });
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            updateButton(false);
        });
        // Keyboard support
        button.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                updateButton(true);
            }
        });
        button.addEventListener('keyup', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                updateButton(false);
            }
        });
        return button;
    }
    /**
     * Format value for display
     */
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
    /**
     * Reset control to default value
     */
    resetControl(controlElement, control) {
        const slider = controlElement.querySelector('input[type="range"]');
        if (slider) {
            slider.value = control.default.toString();
            const valueDisplay = controlElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(control.default, control);
            }
        }
        const knob = controlElement.querySelector('.knob');
        if (knob) {
            this.updateKnobVisual(knob, control.default, control);
            const valueDisplay = controlElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(control.default, control);
            }
        }
        // Trigger change handler
        this.changeHandler(control, control.default);
    }
}
//# sourceMappingURL=control-factory.js.map