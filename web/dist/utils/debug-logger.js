/**
 * Central Debug Logger Utility
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides centralized debug logging with component prefixes.
 * All debug messages go to the debug-log textarea as per CLAUDE.md requirements.
 */
export class DebugLogger {
    componentName;
    enabled;
    static logElement = null;
    constructor(options) {
        this.componentName = options.componentName;
        this.enabled = options.enabled ?? true;
    }
    /**
     * Log a debug message with component prefix
     */
    log(message, error) {
        if (!this.enabled)
            return;
        const logElement = DebugLogger.getLogElement();
        if (logElement) {
            let logMessage = `[${this.componentName}] ${message}`;
            if (error !== undefined) {
                logMessage += `: ${error}`;
            }
            logElement.value += logMessage + '\n';
            logElement.scrollTop = logElement.scrollHeight;
        }
    }
    /**
     * Log an error message with component prefix
     */
    error(message, error) {
        if (!this.enabled)
            return;
        const logElement = DebugLogger.getLogElement();
        if (logElement) {
            let logMessage = `[${this.componentName}] ERROR: ${message}`;
            if (error !== undefined) {
                logMessage += `: ${error}`;
            }
            logElement.value += logMessage + '\n';
            logElement.scrollTop = logElement.scrollHeight;
        }
    }
    /**
     * Log a warning message with component prefix
     */
    warn(message, error) {
        if (!this.enabled)
            return;
        const logElement = DebugLogger.getLogElement();
        if (logElement) {
            let logMessage = `[${this.componentName}] WARNING: ${message}`;
            if (error !== undefined) {
                logMessage += `: ${error}`;
            }
            logElement.value += logMessage + '\n';
            logElement.scrollTop = logElement.scrollHeight;
        }
    }
    /**
     * Enable/disable logging for this component
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Check if logging is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Get the debug log textarea element (cached)
     */
    static getLogElement() {
        if (!DebugLogger.logElement) {
            DebugLogger.logElement = document.getElementById('debug-log');
        }
        return DebugLogger.logElement;
    }
    /**
     * Clear the debug log
     */
    static clearLog() {
        const logElement = DebugLogger.getLogElement();
        if (logElement) {
            logElement.value = '';
        }
    }
    /**
     * Create a simple debug function for dependency injection
     * Used by components that need a simple callback interface
     */
    static createDebugFunction(componentName) {
        const logger = new DebugLogger({ componentName });
        return (message) => logger.log(message);
    }
}
// Convenience function for quick debug logging without creating a logger instance
export function debugLog(componentName, message) {
    const logger = new DebugLogger({ componentName });
    logger.log(message);
}
// Pre-configured logger instances for common components
export const DEBUG_LOGGERS = {
    inputManager: new DebugLogger({ componentName: 'Input Manager' }),
    midiControls: new DebugLogger({ componentName: 'CC Controls' }),
    soundLibrary: new DebugLogger({ componentName: 'GM Sound Library' }),
    virtualKeyboard: new DebugLogger({ componentName: 'Virtual Keyboard' }),
    configLoader: new DebugLogger({ componentName: 'Config Loader' }),
    midiFile: new DebugLogger({ componentName: 'MIDI File' }),
    synthesis: new DebugLogger({ componentName: 'Synthesis' })
};
//# sourceMappingURL=debug-logger.js.map