/**
 * Enhanced Keyboard Input Handler with Advanced Velocity Sensitivity
 * Part of AWE Player EMU8000 Emulator
 */

import { VirtualMidiKeyboard } from './virtual-midi-keyboard.js';
import { EnhancedTouch } from './types/input-types.js';

interface VelocityProfile {
    name: string;
    curve: (normalized: number) => number;
}

interface TouchInfo {
    identifier: number;
    note: number;
    startTime: number;
    startY: number;
    pressure?: number;
}

export class KeyboardInputHandler {
    private keyboard: VirtualMidiKeyboard;
    private activeTouches: Map<number, TouchInfo> = new Map();
    private velocityProfiles: Map<string, VelocityProfile>;
    private currentProfile = 'natural';
    private velocitySensitivity = 1.0;
    private aftertouch = false;
    private glissando = false;
    
    // Computer keyboard velocity simulation
    private keyPressVelocities: Map<string, number> = new Map();
    private keyPressTimers: Map<string, number> = new Map();
    
    constructor(keyboard: VirtualMidiKeyboard) {
        this.keyboard = keyboard;
        
        // Define velocity curves
        this.velocityProfiles = new Map([
            ['linear', {
                name: 'Linear',
                curve: (n: number) => n
            }],
            ['natural', {
                name: 'Natural (Square Root)',
                curve: (n: number) => Math.sqrt(n)
            }],
            ['exponential', {
                name: 'Exponential',
                curve: (n: number) => n * n
            }],
            ['logarithmic', {
                name: 'Logarithmic',
                curve: (n: number) => Math.log(n * 9 + 1) / Math.log(10)
            }],
            ['soft', {
                name: 'Soft Touch',
                curve: (n: number) => Math.pow(n, 1.5)
            }],
            ['hard', {
                name: 'Hard Touch',
                curve: (n: number) => Math.pow(n, 0.7)
            }]
        ]);
        
        this.setupEnhancedListeners();
    }
    
    /**
     * Setup enhanced input listeners
     */
    private setupEnhancedListeners(): void {
        // Enhanced keyboard velocity detection
        this.setupKeyboardVelocity();
        
        // Enhanced touch handling
        this.setupAdvancedTouch();
        
        // Pointer events for pressure sensitivity
        this.setupPointerEvents();
        
        // Gamepad support for velocity-sensitive pads
        this.setupGamepadSupport();
    }
    
    /**
     * Enhanced keyboard velocity based on key press speed
     */
    private setupKeyboardVelocity(): void {
        // Track key press timing for velocity calculation
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            
            const key = e.key.toLowerCase();
            
            // Start velocity timer
            if (!this.keyPressTimers.has(key)) {
                this.keyPressTimers.set(key, performance.now());
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const startTime = this.keyPressTimers.get(key);
            
            if (startTime) {
                // Calculate velocity based on key press duration
                const duration = performance.now() - startTime;
                const velocity = this.calculateKeyVelocity(duration);
                this.keyPressVelocities.set(key, velocity);
                this.keyPressTimers.delete(key);
                
                this.logToDebug(`Key ${key} velocity: ${velocity} (${duration.toFixed(1)}ms)`);
            }
        });
    }
    
    /**
     * Calculate velocity from key press duration
     */
    private calculateKeyVelocity(duration: number): number {
        // Fast press (< 50ms) = high velocity
        // Slow press (> 200ms) = low velocity
        const normalized = 1 - Math.min(Math.max(duration - 50, 0) / 150, 1);
        const curved = this.applyVelocityCurve(normalized);
        return Math.round(curved * 127 * this.velocitySensitivity);
    }
    
    /**
     * Advanced touch handling with multi-touch and pressure
     */
    private setupAdvancedTouch(): void {
        const keyboardElement = document.querySelector('.virtual-keyboard');
        if (!keyboardElement) return;
        
        keyboardElement.addEventListener('touchstart', ((e: TouchEvent) => {
            e.preventDefault();
            const touches = e.changedTouches;
            
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                if (!touch) continue;
                const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                
                if (target && target.classList.contains('piano-key')) {
                    const note = parseInt(target.dataset.note || '0');
                    
                    this.activeTouches.set(touch.identifier, {
                        identifier: touch.identifier,
                        note: note,
                        startTime: performance.now(),
                        startY: touch.clientY,
                        pressure: (touch as EnhancedTouch).force || 0
                    });
                    
                    this.keyboard.handleKeyPress(note, touch as unknown as MouseEvent);
                }
            }
        }) as EventListener);
        
        keyboardElement.addEventListener('touchmove', ((e: TouchEvent) => {
            e.preventDefault();
            
            if (this.glissando) {
                // Handle glissando (sliding between notes)
                const touches = e.changedTouches;
                
                for (let i = 0; i < touches.length; i++) {
                    const touch = touches[i];
                    if (!touch) continue;
                    const touchInfo = this.activeTouches.get(touch.identifier);
                    
                    if (touchInfo) {
                        const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                        
                        if (target && target.classList.contains('piano-key')) {
                            const newNote = parseInt(target.dataset.note || '0');
                            
                            if (newNote !== touchInfo.note) {
                                // Release old note
                                this.keyboard.handleKeyRelease(touchInfo.note);
                                
                                // Play new note
                                this.keyboard.handleKeyPress(newNote, touch as unknown as MouseEvent);
                                
                                // Update touch info
                                touchInfo.note = newNote;
                            }
                        }
                    }
                }
            }
            
            if (this.aftertouch) {
                // Handle aftertouch (pressure changes)
                this.handleAftertouch(e);
            }
        }) as EventListener);
        
        keyboardElement.addEventListener('touchend', ((e: TouchEvent) => {
            e.preventDefault();
            const touches = e.changedTouches;
            
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                if (!touch) continue;
                const touchInfo = this.activeTouches.get(touch.identifier);
                
                if (touchInfo) {
                    this.keyboard.handleKeyRelease(touchInfo.note);
                    this.activeTouches.delete(touch.identifier);
                }
            }
        }) as EventListener);
    }
    
    
    /**
     * Setup pointer events for pressure-sensitive devices
     */
    private setupPointerEvents(): void {
        const keyboardElement = document.querySelector('.virtual-keyboard');
        if (!keyboardElement || !window.PointerEvent) return;
        
        keyboardElement.addEventListener('pointerdown', ((e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('piano-key')) return;
            
            const velocity = this.calculatePointerVelocity(e);
            
            this.logToDebug(`Pointer velocity: ${velocity} (pressure: ${e.pressure})`);
        }) as EventListener);
    }
    
    /**
     * Calculate velocity from pointer event (includes pressure)
     */
    private calculatePointerVelocity(event: PointerEvent): number {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const relativeY = event.clientY - rect.top;
        const normalizedY = relativeY / rect.height;
        
        // Use actual pressure if available, otherwise estimate from Y position
        const pressure = event.pressure || (1 - normalizedY);
        
        const curved = this.applyVelocityCurve(pressure);
        return Math.round(curved * 127 * this.velocitySensitivity);
    }
    
    /**
     * Handle aftertouch (channel pressure)
     */
    private handleAftertouch(event: TouchEvent): void {
        const touches = event.touches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch) continue;
            const touchInfo = this.activeTouches.get(touch.identifier);
            
            if (touchInfo && (touch as EnhancedTouch).force !== undefined) {
                const pressure = Math.round(((touch as EnhancedTouch).force || 0) * 127);
                
                if (pressure !== touchInfo.pressure) {
                    // Send channel pressure (aftertouch)
                    this.keyboard.getMidiBridge().sendMidiEvent(
                        this.keyboard.getCurrentChannel(),
                        0xD0, // Channel pressure
                        pressure,
                        0
                    );
                    
                    touchInfo.pressure = pressure;
                    this.logToDebug(`Aftertouch: ${pressure}`);
                }
            }
        }
    }
    
    /**
     * Setup gamepad support for velocity-sensitive pad controllers
     */
    private setupGamepadSupport(): void {
        if (!navigator.getGamepads) return;
        
        let gamepadInterval: number;
        
        window.addEventListener('gamepadconnected', (e) => {
            this.logToDebug(`Gamepad connected: ${(e as GamepadEvent).gamepad.id}`);
            
            // Poll gamepad state
            gamepadInterval = window.setInterval(() => {
                const gamepads = navigator.getGamepads();
                
                for (let i = 0; i < gamepads.length; i++) {
                    const gamepad = gamepads[i];
                    if (!gamepad) continue;
                    
                    // Map gamepad buttons to notes (example mapping)
                    gamepad.buttons.forEach((button, index) => {
                        if (button.pressed) {
                            const velocity = Math.round(button.value * 127);
                            
                            // Trigger note with gamepad velocity
                            this.logToDebug(`Gamepad button ${index}: velocity ${velocity}`);
                        }
                    });
                }
            }, 16); // ~60fps polling
        });
        
        window.addEventListener('gamepaddisconnected', () => {
            if (gamepadInterval) {
                clearInterval(gamepadInterval);
            }
            this.logToDebug('Gamepad disconnected');
        });
    }
    
    /**
     * Apply velocity curve
     */
    private applyVelocityCurve(normalized: number): number {
        const profile = this.velocityProfiles.get(this.currentProfile);
        if (!profile) return normalized;
        
        return profile.curve(normalized);
    }
    
    /**
     * Set velocity curve profile
     */
    public setVelocityProfile(profileName: string): void {
        if (this.velocityProfiles.has(profileName)) {
            this.currentProfile = profileName;
            this.logToDebug(`Velocity profile changed to: ${profileName}`);
        }
    }
    
    /**
     * Set velocity sensitivity (0.1 to 2.0)
     */
    public setVelocitySensitivity(sensitivity: number): void {
        this.velocitySensitivity = Math.max(0.1, Math.min(2.0, sensitivity));
        this.logToDebug(`Velocity sensitivity: ${this.velocitySensitivity}`);
    }
    
    /**
     * Enable/disable aftertouch
     */
    public setAftertouch(enabled: boolean): void {
        this.aftertouch = enabled;
        this.logToDebug(`Aftertouch: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable/disable glissando
     */
    public setGlissando(enabled: boolean): void {
        this.glissando = enabled;
        this.logToDebug(`Glissando: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get available velocity profiles
     */
    public getVelocityProfiles(): string[] {
        return Array.from(this.velocityProfiles.keys());
    }
    
    /**
     * Create settings UI
     */
    public createSettingsUI(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const settings = document.createElement('div');
        settings.className = 'input-settings';
        
        // Velocity profile selector
        const profileSelect = document.createElement('select');
        profileSelect.className = 'velocity-profile-select';
        
        this.velocityProfiles.forEach((profile, key) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name;
            option.selected = key === this.currentProfile;
            profileSelect.appendChild(option);
        });
        
        profileSelect.addEventListener('change', (e) => {
            this.setVelocityProfile((e.target as HTMLSelectElement).value);
        });
        
        // Sensitivity slider
        const sensitivitySlider = document.createElement('input');
        sensitivitySlider.type = 'range';
        sensitivitySlider.min = '0.1';
        sensitivitySlider.max = '2.0';
        sensitivitySlider.step = '0.1';
        sensitivitySlider.value = this.velocitySensitivity.toString();
        
        sensitivitySlider.addEventListener('input', (e) => {
            this.setVelocitySensitivity(parseFloat((e.target as HTMLInputElement).value));
        });
        
        // Feature toggles
        const aftertouchCheckbox = this.createCheckbox('Aftertouch', this.aftertouch, (checked) => {
            this.setAftertouch(checked);
        });
        
        const glissandoCheckbox = this.createCheckbox('Glissando', this.glissando, (checked) => {
            this.setGlissando(checked);
        });
        
        // Add elements
        settings.innerHTML = '<h4>Input Settings</h4>';
        settings.appendChild(profileSelect);
        settings.appendChild(sensitivitySlider);
        settings.appendChild(aftertouchCheckbox);
        settings.appendChild(glissandoCheckbox);
        
        container.appendChild(settings);
        
        this.addSettingsStyles();
    }
    
    /**
     * Create checkbox control
     */
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
    
    /**
     * Add settings styles
     */
    private addSettingsStyles(): void {
        if (document.getElementById('input-settings-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'input-settings-styles';
        style.textContent = `
            .input-settings {
                background: #333;
                border-radius: 5px;
                padding: 15px;
                color: white;
                margin-top: 10px;
            }
            
            .input-settings h4 {
                margin: 0 0 10px 0;
                color: #ccc;
            }
            
            .velocity-profile-select {
                width: 100%;
                padding: 5px;
                margin-bottom: 10px;
                background: #222;
                color: white;
                border: 1px solid #555;
                border-radius: 3px;
            }
            
            .checkbox-container {
                display: block;
                margin: 5px 0;
                cursor: pointer;
            }
            
            .checkbox-container input {
                margin-right: 5px;
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
            debugLog.value += `[Input Handler] ${message}\n`;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }
}