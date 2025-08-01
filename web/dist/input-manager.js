/**
 * Input Manager - Coordinates all input handlers
 * Part of AWE Player EMU8000 Emulator
 */
import { VelocityCurveProcessor } from './velocity-curves.js';
import { TouchInputHandler } from './input-handlers/touch-input-handler.js';
import { ComputerKeyboardInputHandler } from './input-handlers/keyboard-input-handler.js';
import { PointerInputHandler } from './input-handlers/pointer-input-handler.js';
import { GamepadInputHandler } from './input-handlers/gamepad-input-handler.js';
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
import { createSection, createSelect, createSlider, createCheckbox, createLabeledField, createNumberRange } from './utils/ui-components.js';
import { generateComponentStyles, injectStyles } from './utils/ui-styles.js';
export class InputManager {
    keyboard;
    velocityProcessor;
    handlers = new Map();
    settingsElement = null;
    constructor(options) {
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
    initializeHandlers(options) {
        const handlerOptions = {
            velocityProcessor: this.velocityProcessor,
            keyboard: this.keyboard,
            debugLog: (message) => DEBUG_LOGGERS.inputManager.log(message)
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
        DEBUG_LOGGERS.inputManager.log(`Input Manager initialized with ${this.handlers.size} handlers`);
    }
    /**
     * Enable/disable specific input handler
     */
    setHandlerEnabled(handlerType, enabled) {
        const handler = this.handlers.get(handlerType);
        if (handler) {
            handler.setEnabled(enabled);
            DEBUG_LOGGERS.inputManager.log(`${handlerType} input ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    /**
     * Get handler by type
     */
    getHandler(handlerType) {
        const handler = this.handlers.get(handlerType);
        return handler ? handler : undefined;
    }
    /**
     * Set velocity profile for all handlers
     */
    setVelocityProfile(profileName) {
        const success = this.velocityProcessor.setProfile(profileName);
        if (success) {
            DEBUG_LOGGERS.inputManager.log(`Velocity profile changed to: ${profileName}`);
        }
        return success;
    }
    /**
     * Set velocity sensitivity
     */
    setVelocitySensitivity(sensitivity) {
        this.velocityProcessor.setSensitivity(sensitivity);
        DEBUG_LOGGERS.inputManager.log(`Velocity sensitivity: ${sensitivity}`);
    }
    /**
     * Get available velocity profiles
     */
    getVelocityProfiles() {
        return this.velocityProcessor.getAvailableProfiles();
    }
    /**
     * Set touch-specific options
     */
    setTouchOptions(options) {
        const touchHandler = this.getHandler('touch');
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
    setKeyboardOctave(octave) {
        const keyboardHandler = this.getHandler('keyboard');
        if (keyboardHandler) {
            keyboardHandler.setOctave(octave);
        }
    }
    /**
     * Create settings UI
     */
    createSettingsUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            DEBUG_LOGGERS.inputManager.error(`Settings container ${containerId} not found`);
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
    createVelocitySettings() {
        // Create profile selector
        const profileOptions = this.getVelocityProfiles().map(profile => ({
            value: profile,
            text: profile.charAt(0).toUpperCase() + profile.slice(1)
        }));
        const profileSelect = createSelect(profileOptions, (value) => this.setVelocityProfile(value), 'velocity-profile-select');
        // Create sensitivity slider
        const sensitivitySlider = createSlider({
            min: 0.1,
            max: 2.0,
            value: this.velocityProcessor.getSensitivity(),
            step: 0.1,
            onChange: (value) => this.setVelocitySensitivity(value)
        });
        const section = createSection({
            title: 'Velocity Settings',
            className: 'settings-section',
            content: [
                createLabeledField('Velocity Curve:', profileSelect),
                createLabeledField('Sensitivity:', sensitivitySlider)
            ]
        });
        return section;
    }
    createHandlerToggles() {
        const checkboxes = [];
        this.handlers.forEach((handler, type) => {
            const checkbox = createCheckbox({
                label: handler.getType(),
                checked: handler.isEnabled(),
                onChange: (checked) => this.setHandlerEnabled(type, checked)
            });
            checkboxes.push(checkbox);
        });
        const section = createSection({
            title: 'Input Methods',
            className: 'settings-section',
            content: checkboxes
        });
        return section;
    }
    createAdvancedSettings() {
        // Touch-specific settings
        const aftertouchCheckbox = createCheckbox({
            label: 'Aftertouch',
            checked: false,
            onChange: (checked) => this.setTouchOptions({ aftertouch: checked })
        });
        const glissandoCheckbox = createCheckbox({
            label: 'Glissando',
            checked: false,
            onChange: (checked) => this.setTouchOptions({ glissando: checked })
        });
        // Keyboard octave selector
        const octaveOptions = createNumberRange(0, 8, 'Octave ');
        const defaultOctaveOption = octaveOptions[4];
        if (defaultOctaveOption) {
            defaultOctaveOption.selected = true; // Default to C4
        }
        const octaveSelect = createSelect(octaveOptions, (value) => this.setKeyboardOctave(parseInt(value)));
        const section = createSection({
            title: 'Advanced Settings',
            className: 'settings-section',
            content: [
                aftertouchCheckbox,
                glissandoCheckbox,
                createLabeledField('Keyboard Octave:', octaveSelect)
            ]
        });
        return section;
    }
    addSettingsStyles() {
        const customStyles = `
            .input-manager-settings {
                margin-top: 10px;
            }
            
            .velocity-profile-select {
                width: 150px;
                padding: 3px;
                margin: 5px;
            }
        `;
        const componentStyles = generateComponentStyles('InputManager', customStyles);
        injectStyles('input-manager-styles', componentStyles);
    }
    /**
     * Setup debug logging coordination
     */
    setupDebugLogging() {
        // All handlers will use the main debug log
    }
    /**
     * Cleanup all handlers
     */
    cleanup() {
        this.handlers.forEach(handler => handler.cleanup());
        this.handlers.clear();
        if (this.settingsElement) {
            this.settingsElement.remove();
            this.settingsElement = null;
        }
        DEBUG_LOGGERS.inputManager.log('Input Manager cleaned up');
    }
}
//# sourceMappingURL=input-manager.js.map