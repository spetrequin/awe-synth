/**
 * MIDI CC Controls - Pitch bend, modulation wheel, sustain pedal, and more
 * Part of AWE Player EMU8000 Emulator
 */

import { MidiBridge } from './midi-bridge.js';

// Common MIDI CC numbers
export const MIDI_CC = {
    BANK_SELECT_MSB: 0,
    MODULATION_WHEEL: 1,
    BREATH_CONTROLLER: 2,
    FOOT_CONTROLLER: 4,
    PORTAMENTO_TIME: 5,
    DATA_ENTRY_MSB: 6,
    CHANNEL_VOLUME: 7,
    BALANCE: 8,
    PAN: 10,
    EXPRESSION: 11,
    EFFECT_CONTROL_1: 12,
    EFFECT_CONTROL_2: 13,
    SUSTAIN_PEDAL: 64,
    PORTAMENTO_ON_OFF: 65,
    SOSTENUTO_PEDAL: 66,
    SOFT_PEDAL: 67,
    LEGATO_FOOTSWITCH: 68,
    HOLD_2: 69,
    SOUND_CONTROLLER_1: 70,  // Sound Variation
    SOUND_CONTROLLER_2: 71,  // Timbre/Harmonic Content
    SOUND_CONTROLLER_3: 72,  // Release Time
    SOUND_CONTROLLER_4: 73,  // Attack Time
    SOUND_CONTROLLER_5: 74,  // Brightness
    SOUND_CONTROLLER_6: 75,  // Decay Time
    SOUND_CONTROLLER_7: 76,  // Vibrato Rate
    SOUND_CONTROLLER_8: 77,  // Vibrato Depth
    SOUND_CONTROLLER_9: 78,  // Vibrato Delay
    SOUND_CONTROLLER_10: 79, // Undefined
    GENERAL_PURPOSE_1: 80,
    GENERAL_PURPOSE_2: 81,
    GENERAL_PURPOSE_3: 82,
    GENERAL_PURPOSE_4: 83,
    PORTAMENTO_CONTROL: 84,
    REVERB_SEND: 91,
    TREMOLO_DEPTH: 92,
    CHORUS_SEND: 93,
    CELESTE_DEPTH: 94,
    PHASER_DEPTH: 95,
    DATA_INCREMENT: 96,
    DATA_DECREMENT: 97,
    NRPN_LSB: 98,
    NRPN_MSB: 99,
    RPN_LSB: 100,
    RPN_MSB: 101,
    ALL_SOUND_OFF: 120,
    RESET_ALL_CONTROLLERS: 121,
    LOCAL_CONTROL: 122,
    ALL_NOTES_OFF: 123,
    OMNI_MODE_OFF: 124,
    OMNI_MODE_ON: 125,
    MONO_MODE_ON: 126,
    POLY_MODE_ON: 127
};

interface CCControl {
    cc: number;
    name: string;
    type: 'slider' | 'knob' | 'button';
    min: number;
    max: number;
    default: number;
    bipolar?: boolean; // For pitch bend style controls
}

export class MidiCCControls {
    private midiBridge: MidiBridge;
    private currentChannel = 0;
    private controlsElement: HTMLElement | null = null;
    private ccValues: Map<number, number> = new Map();
    
    // Define the main controls we want to expose
    private controls: CCControl[] = [
        {
            cc: -1, // Special case for pitch bend
            name: 'Pitch Bend',
            type: 'slider',
            min: -8192,
            max: 8191,
            default: 0,
            bipolar: true
        },
        {
            cc: MIDI_CC.MODULATION_WHEEL,
            name: 'Modulation',
            type: 'slider',
            min: 0,
            max: 127,
            default: 0
        },
        {
            cc: MIDI_CC.SUSTAIN_PEDAL,
            name: 'Sustain Pedal',
            type: 'button',
            min: 0,
            max: 127,
            default: 0
        },
        {
            cc: MIDI_CC.CHANNEL_VOLUME,
            name: 'Volume',
            type: 'slider',
            min: 0,
            max: 127,
            default: 100
        },
        {
            cc: MIDI_CC.PAN,
            name: 'Pan',
            type: 'knob',
            min: 0,
            max: 127,
            default: 64,
            bipolar: true
        },
        {
            cc: MIDI_CC.EXPRESSION,
            name: 'Expression',
            type: 'slider',
            min: 0,
            max: 127,
            default: 127
        },
        {
            cc: MIDI_CC.REVERB_SEND,
            name: 'Reverb',
            type: 'knob',
            min: 0,
            max: 127,
            default: 40
        },
        {
            cc: MIDI_CC.CHORUS_SEND,
            name: 'Chorus',
            type: 'knob',
            min: 0,
            max: 127,
            default: 0
        },
        {
            cc: MIDI_CC.SOUND_CONTROLLER_2,
            name: 'Brightness',
            type: 'knob',
            min: 0,
            max: 127,
            default: 64
        },
        {
            cc: MIDI_CC.SOUND_CONTROLLER_3,
            name: 'Release Time',
            type: 'knob',
            min: 0,
            max: 127,
            default: 64
        },
        {
            cc: MIDI_CC.SOUND_CONTROLLER_4,
            name: 'Attack Time',
            type: 'knob',
            min: 0,
            max: 127,
            default: 64
        },
        {
            cc: MIDI_CC.PORTAMENTO_ON_OFF,
            name: 'Portamento',
            type: 'button',
            min: 0,
            max: 127,
            default: 0
        }
    ];
    
    constructor(midiBridge: MidiBridge) {
        this.midiBridge = midiBridge;
        
        // Initialize default values
        this.controls.forEach(control => {
            if (control.cc >= 0) {
                this.ccValues.set(control.cc, control.default);
            }
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
        
        // Create control groups
        const mainControls = this.createMainControls();
        const effectControls = this.createEffectControls();
        const envelopeControls = this.createEnvelopeControls();
        
        this.controlsElement.appendChild(mainControls);
        this.controlsElement.appendChild(effectControls);
        this.controlsElement.appendChild(envelopeControls);
        
        container.appendChild(this.controlsElement);
        
        // Send initial values
        this.sendInitialValues();
        
        this.addControlStyles();
    }
    
    /**
     * Create main performance controls
     */
    private createMainControls(): HTMLElement {
        const group = document.createElement('div');
        group.className = 'control-group main-controls';
        
        const title = document.createElement('h3');
        title.textContent = 'Performance Controls';
        group.appendChild(title);
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls-grid';
        
        // Pitch bend, modulation, sustain
        const mainControls = this.controls.filter(c => 
            c.name === 'Pitch Bend' || 
            c.name === 'Modulation' || 
            c.name === 'Sustain Pedal'
        );
        
        mainControls.forEach(control => {
            const element = this.createControl(control);
            controlsDiv.appendChild(element);
        });
        
        group.appendChild(controlsDiv);
        return group;
    }
    
    /**
     * Create effect controls
     */
    private createEffectControls(): HTMLElement {
        const group = document.createElement('div');
        group.className = 'control-group effect-controls';
        
        const title = document.createElement('h3');
        title.textContent = 'Effects & Mix';
        group.appendChild(title);
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls-grid';
        
        // Volume, pan, expression, reverb, chorus
        const effectControls = this.controls.filter(c => 
            c.name === 'Volume' || 
            c.name === 'Pan' || 
            c.name === 'Expression' ||
            c.name === 'Reverb' ||
            c.name === 'Chorus' ||
            c.name === 'Brightness'
        );
        
        effectControls.forEach(control => {
            const element = this.createControl(control);
            controlsDiv.appendChild(element);
        });
        
        group.appendChild(controlsDiv);
        return group;
    }
    
    /**
     * Create envelope controls
     */
    private createEnvelopeControls(): HTMLElement {
        const group = document.createElement('div');
        group.className = 'control-group envelope-controls';
        
        const title = document.createElement('h3');
        title.textContent = 'Sound Shaping';
        group.appendChild(title);
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls-grid';
        
        // Attack, release, portamento
        const envelopeControls = this.controls.filter(c => 
            c.name === 'Attack Time' || 
            c.name === 'Release Time' || 
            c.name === 'Portamento'
        );
        
        envelopeControls.forEach(control => {
            const element = this.createControl(control);
            controlsDiv.appendChild(element);
        });
        
        group.appendChild(controlsDiv);
        return group;
    }
    
    /**
     * Create individual control based on type
     */
    private createControl(control: CCControl): HTMLElement {
        const container = document.createElement('div');
        container.className = `cc-control ${control.type}-control`;
        
        const label = document.createElement('label');
        label.textContent = control.name;
        container.appendChild(label);
        
        if (control.type === 'slider') {
            const slider = this.createSlider(control);
            container.appendChild(slider);
        } else if (control.type === 'knob') {
            const knob = this.createKnob(control);
            container.appendChild(knob);
        } else if (control.type === 'button') {
            const button = this.createButton(control);
            container.appendChild(button);
        }
        
        return container;
    }
    
    /**
     * Create slider control
     */
    private createSlider(control: CCControl): HTMLElement {
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
            const value = parseInt((e.target as HTMLInputElement).value);
            valueDisplay.textContent = this.formatValue(value, control);
            this.handleControlChange(control, value);
        });
        
        // Reset on double click
        slider.addEventListener('dblclick', () => {
            slider.value = control.default.toString();
            valueDisplay.textContent = this.formatValue(control.default, control);
            this.handleControlChange(control, control.default);
        });
        
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        
        return sliderContainer;
    }
    
    /**
     * Create knob control
     */
    private createKnob(control: CCControl): HTMLElement {
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
        
        let isDragging = false;
        let startY = 0;
        let startValue = control.default;
        
        // Mouse drag handling
        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startValue = this.ccValues.get(control.cc) || control.default;
            document.body.style.cursor = 'ns-resize';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaY = startY - e.clientY;
            const range = control.max - control.min;
            const newValue = Math.round(startValue + (deltaY / 100) * range);
            const clampedValue = Math.max(control.min, Math.min(control.max, newValue));
            
            this.updateKnobVisual(knob, clampedValue, control);
            valueDisplay.textContent = this.formatValue(clampedValue, control);
            this.handleControlChange(control, clampedValue);
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        });
        
        // Double click to reset
        knob.addEventListener('dblclick', () => {
            this.updateKnobVisual(knob, control.default, control);
            valueDisplay.textContent = this.formatValue(control.default, control);
            this.handleControlChange(control, control.default);
        });
        
        // Set initial position
        this.updateKnobVisual(knob, control.default, control);
        
        knobContainer.appendChild(knob);
        knobContainer.appendChild(valueDisplay);
        
        return knobContainer;
    }
    
    /**
     * Create button control
     */
    private createButton(control: CCControl): HTMLElement {
        const button = document.createElement('button');
        button.className = 'cc-button';
        button.textContent = control.name;
        
        const updateButton = (pressed: boolean) => {
            button.classList.toggle('pressed', pressed);
            const value = pressed ? control.max : control.min;
            this.handleControlChange(control, value);
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
        
        // Keyboard support (space/enter)
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
     * Update knob visual rotation
     */
    private updateKnobVisual(knob: HTMLElement, value: number, control: CCControl): void {
        const range = control.max - control.min;
        const normalized = (value - control.min) / range;
        const rotation = -135 + (normalized * 270); // -135° to +135°
        const indicator = knob.querySelector('.knob-indicator') as HTMLElement;
        if (indicator) {
            indicator.style.transform = `rotate(${rotation}deg)`;
        }
    }
    
    /**
     * Format value for display
     */
    private formatValue(value: number, control: CCControl): string {
        if (control.cc === -1) { // Pitch bend
            return value > 0 ? `+${value}` : value.toString();
        } else if (control.bipolar && control.cc === MIDI_CC.PAN) {
            const panValue = value - 64;
            if (panValue === 0) return 'C';
            return panValue > 0 ? `R${panValue}` : `L${-panValue}`;
        }
        return value.toString();
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
        this.controls.forEach(control => {
            if (control.cc >= 0) {
                this.midiBridge.sendControlChange(this.currentChannel, control.cc, control.default);
            }
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
        this.controls.forEach(control => {
            if (control.cc >= 0) {
                this.ccValues.set(control.cc, control.default);
                this.midiBridge.sendControlChange(this.currentChannel, control.cc, control.default);
            }
        });
        
        // Update UI
        if (this.controlsElement) {
            // Update sliders
            this.controlsElement.querySelectorAll('input[type="range"]').forEach((slider) => {
                const control = this.controls.find(c => c.type === 'slider');
                if (control) {
                    (slider as HTMLInputElement).value = control.default.toString();
                }
            });
            
            // Update knobs
            this.controlsElement.querySelectorAll('.knob').forEach((knob) => {
                const control = this.controls.find(c => c.type === 'knob');
                if (control) {
                    this.updateKnobVisual(knob as HTMLElement, control.default, control);
                }
            });
        }
        
        this.logToDebug('All CC controls reset');
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