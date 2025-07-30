/**
 * Input Manager - Coordinates all input handlers
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { VelocityCurveProcessor } from './velocity-curves.js';
import { BaseInputHandler } from './input-handlers/base-input-handler.js';
import { TouchInputHandler } from './input-handlers/touch-input-handler.js';
import { ComputerKeyboardInputHandler } from './input-handlers/keyboard-input-handler.js';
import { PointerInputHandler } from './input-handlers/pointer-input-handler.js';
import { GamepadInputHandler } from './input-handlers/gamepad-input-handler.js';

export interface InputManagerOptions {
    keyboard: VirtualMidiKeyboard;
    enableTouch?: boolean;
    enableComputerKeyboard?: boolean;
    enablePointer?: boolean;
    enableGamepad?: boolean;
    velocityProfile?: string;
    velocitySensitivity?: number;
}

export class InputManager {
    private keyboard: VirtualMidiKeyboard;
    private velocityProcessor: VelocityCurveProcessor;
    private handlers: Map<string, BaseInputHandler> = new Map();
    private settingsElement: HTMLElement | null = null;
    
    constructor(options: InputManagerOptions) {
        this.keyboard = options.keyboard;
        this.velocityProcessor = new VelocityCurveProcessor(options.velocityProfile);
        
        if (options.velocitySensitivity !== undefined) {
            this.velocityProcessor.setSensitivity(options.velocitySensitivity);
        }
        
        this.initializeHandlers(options);
        this.setupDebugLogging();
    }
    
    /**
     * Initialize input handlers based on options
     */
    private initializeHandlers(options: InputManagerOptions): void {
        const handlerOptions = {
            velocityProcessor: this.velocityProcessor,
            keyboard: this.keyboard,
            debugLog: this.logToDebug.bind(this)
        };
        
        // Touch input
        if (options.enableTouch !== false) {
            const touchHandler = new TouchInputHandler(handlerOptions);
            this.handlers.set('touch', touchHandler);
        }
        
        // Computer keyboard input
        if (options.enableComputerKeyboard !== false) {
            const keyboardHandler = new ComputerKeyboardInputHandler(handlerOptions);
            this.handlers.set('keyboard', keyboardHandler);
        }
        
        // Pointer input (stylus/pen)
        if (options.enablePointer !== false) {
            const pointerHandler = new PointerInputHandler(handlerOptions);
            this.handlers.set('pointer', pointerHandler);
        }
        
        // Gamepad input
        if (options.enableGamepad !== false) {
            const gamepadHandler = new GamepadInputHandler(handlerOptions);
            this.handlers.set('gamepad', gamepadHandler);
        }
        
        // Initialize all handlers
        this.handlers.forEach(handler => handler.initialize());
        
        this.logToDebug(`Input Manager initialized with ${this.handlers.size} handlers`);
    }
    
    /**
     * Enable/disable specific input handler
     */
    public setHandlerEnabled(handlerType: string, enabled: boolean): void {
        const handler = this.handlers.get(handlerType);
        if (handler) {
            handler.setEnabled(enabled);
            this.logToDebug(`${handlerType} input ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    
    /**
     * Get handler by type
     */
    public getHandler<T extends BaseInputHandler>(handlerType: string): T | undefined {
        return this.handlers.get(handlerType) as T;
    }
    
    /**
     * Set velocity profile for all handlers
     */
    public setVelocityProfile(profileName: string): boolean {
        const success = this.velocityProcessor.setProfile(profileName);
        if (success) {
            this.logToDebug(`Velocity profile changed to: ${profileName}`);
        }
        return success;
    }
    
    /**
     * Set velocity sensitivity
     */
    public setVelocitySensitivity(sensitivity: number): void {
        this.velocityProcessor.setSensitivity(sensitivity);
        this.logToDebug(`Velocity sensitivity: ${sensitivity}`);
    }
    
    /**
     * Get available velocity profiles
     */
    public getVelocityProfiles(): string[] {
        return this.velocityProcessor.getAvailableProfiles();
    }
    
    /**
     * Set touch-specific options
     */
    public setTouchOptions(options: { aftertouch?: boolean; glissando?: boolean }): void {
        const touchHandler = this.getHandler<TouchInputHandler>('touch');
        if (touchHandler) {
            if (options.aftertouch !== undefined) {
                touchHandler.setAftertouch(options.aftertouch);
            }
            if (options.glissando !== undefined) {
                touchHandler.setGlissando(options.glissando);
            }
        }
    }
    
    /**
     * Set computer keyboard octave
     */
    public setKeyboardOctave(octave: number): void {
        const keyboardHandler = this.getHandler<ComputerKeyboardInputHandler>('keyboard');
        if (keyboardHandler) {
            keyboardHandler.setOctave(octave);
        }
    }
    
    /**
     * Create settings UI
     */
    public createSettingsUI(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) {
            this.logToDebug(`Settings container ${containerId} not found`);
            return;
        }
        
        this.settingsElement = document.createElement('div');
        this.settingsElement.className = 'input-manager-settings';
        
        // Velocity settings
        const velocitySection = this.createVelocitySettings();
        
        // Handler toggles
        const handlerSection = this.createHandlerToggles();
        
        // Advanced settings
        const advancedSection = this.createAdvancedSettings();
        
        this.settingsElement.appendChild(velocitySection);
        this.settingsElement.appendChild(handlerSection);
        this.settingsElement.appendChild(advancedSection);
        
        container.appendChild(this.settingsElement);
        
        this.addSettingsStyles();
    }
    
    private createVelocitySettings(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'settings-section';
        
        const title = document.createElement('h4');
        title.textContent = 'Velocity Settings';
        section.appendChild(title);
        
        // Velocity profile selector
        const profileLabel = document.createElement('label');
        profileLabel.textContent = 'Velocity Curve: ';
        
        const profileSelect = document.createElement('select');
        profileSelect.className = 'velocity-profile-select';
        
        this.getVelocityProfiles().forEach(profileName => {
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName.charAt(0).toUpperCase() + profileName.slice(1);
            profileSelect.appendChild(option);
        });
        
        profileSelect.addEventListener('change', (e) => {
            this.setVelocityProfile((e.target as HTMLSelectElement).value);
        });
        
        // Sensitivity slider
        const sensitivityLabel = document.createElement('label');
        sensitivityLabel.textContent = 'Sensitivity: ';
        
        const sensitivitySlider = document.createElement('input');
        sensitivitySlider.type = 'range';
        sensitivitySlider.min = '0.1';
        sensitivitySlider.max = '2.0';
        sensitivitySlider.step = '0.1';
        sensitivitySlider.value = this.velocityProcessor.getSensitivity().toString();
        
        const sensitivityValue = document.createElement('span');
        sensitivityValue.textContent = this.velocityProcessor.getSensitivity().toString();
        
        sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            this.setVelocitySensitivity(value);
            sensitivityValue.textContent = value.toString();
        });
        
        section.appendChild(profileLabel);
        section.appendChild(profileSelect);
        section.appendChild(document.createElement('br'));
        section.appendChild(sensitivityLabel);
        section.appendChild(sensitivitySlider);
        section.appendChild(sensitivityValue);
        
        return section;
    }
    
    private createHandlerToggles(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'settings-section';
        
        const title = document.createElement('h4');
        title.textContent = 'Input Methods';
        section.appendChild(title);
        
        this.handlers.forEach((handler, type) => {
            const checkbox = this.createCheckbox(
                handler.getType(),
                handler.isEnabled(),
                (checked) => this.setHandlerEnabled(type, checked)
            );
            section.appendChild(checkbox);
        });
        
        return section;
    }
    
    private createAdvancedSettings(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'settings-section';
        
        const title = document.createElement('h4');
        title.textContent = 'Advanced Settings';
        section.appendChild(title);
        
        // Touch-specific settings
        const aftertouchCheckbox = this.createCheckbox('Aftertouch', false, (checked) => {
            this.setTouchOptions({ aftertouch: checked });
        });
        
        const glissandoCheckbox = this.createCheckbox('Glissando', false, (checked) => {
            this.setTouchOptions({ glissando: checked });
        });
        
        // Keyboard octave
        const octaveLabel = document.createElement('label');
        octaveLabel.textContent = 'Keyboard Octave: ';
        
        const octaveSelect = document.createElement('select');
        for (let i = 0; i <= 8; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = `Octave ${i}`;
            option.selected = i === 4; // Default to C4
            octaveSelect.appendChild(option);
        }
        
        octaveSelect.addEventListener('change', (e) => {
            this.setKeyboardOctave(parseInt((e.target as HTMLSelectElement).value));
        });
        
        section.appendChild(aftertouchCheckbox);
        section.appendChild(glissandoCheckbox);
        section.appendChild(octaveLabel);
        section.appendChild(octaveSelect);
        
        return section;
    }
    
    private createCheckbox(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
        const container = document.createElement('label');
        container.className = 'checkbox-container';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        
        checkbox.addEventListener('change', (e) => {
            onChange((e.target as HTMLInputElement).checked);
        });
        
        container.appendChild(checkbox);
        container.appendChild(document.createTextNode(' ' + label));
        
        return container;
    }
    
    private addSettingsStyles(): void {
        if (document.getElementById('input-manager-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'input-manager-styles';
        style.textContent = `
            .input-manager-settings {
                background: #333;
                border-radius: 5px;
                padding: 15px;
                color: white;
                margin-top: 10px;
            }
            
            .settings-section {
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #555;
            }
            
            .settings-section:last-child {
                border-bottom: none;
            }
            
            .settings-section h4 {
                margin: 0 0 10px 0;
                color: #ccc;
                font-size: 14px;
            }
            
            .velocity-profile-select {
                width: 150px;
                padding: 3px;
                margin: 5px;
                background: #222;
                color: white;
                border: 1px solid #555;
                border-radius: 3px;
            }
            
            .checkbox-container {
                display: block;
                margin: 5px 0;
                cursor: pointer;
                font-size: 13px;
            }
            
            .checkbox-container input {
                margin-right: 5px;
            }
            
            input[type="range"] {
                width: 100px;
                margin: 0 5px;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Setup debug logging coordination
     */
    private setupDebugLogging(): void {
        // All handlers will use the main debug log
    }
    
    /**
     * Cleanup all handlers
     */
    public cleanup(): void {
        this.handlers.forEach(handler => handler.cleanup());
        this.handlers.clear();
        
        if (this.settingsElement) {
            this.settingsElement.remove();
            this.settingsElement = null;
        }
        
        this.logToDebug('Input Manager cleaned up');
    }
    
    /**
     * Log to debug textarea
     */
    private logToDebug(message: string): void {
        const debugLog = document.getElementById('debug-log') as HTMLTextAreaElement;
        if (debugLog) {
            debugLog.value += `[Input Manager] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}