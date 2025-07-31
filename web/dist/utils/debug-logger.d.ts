/**
 * Central Debug Logger Utility
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides centralized debug logging with component prefixes.
 * All debug messages go to the debug-log textarea as per CLAUDE.md requirements.
 */
export interface DebugLoggerOptions {
    componentName: string;
    enabled?: boolean;
}
export declare class DebugLogger {
    private componentName;
    private enabled;
    private static logElement;
    constructor(options: DebugLoggerOptions);
    /**
     * Log a debug message with component prefix
     */
    log(message: string): void;
    /**
     * Log an error message with component prefix
     */
    error(message: string): void;
    /**
     * Log a warning message with component prefix
     */
    warn(message: string): void;
    /**
     * Enable/disable logging for this component
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if logging is enabled
     */
    isEnabled(): boolean;
    /**
     * Get the debug log textarea element (cached)
     */
    private static getLogElement;
    /**
     * Clear the debug log
     */
    static clearLog(): void;
    /**
     * Create a simple debug function for dependency injection
     * Used by components that need a simple callback interface
     */
    static createDebugFunction(componentName: string): (message: string) => void;
}
export declare function debugLog(componentName: string, message: string): void;
export declare const DEBUG_LOGGERS: {
    readonly inputManager: DebugLogger;
    readonly midiControls: DebugLogger;
    readonly soundLibrary: DebugLogger;
    readonly virtualKeyboard: DebugLogger;
    readonly configLoader: DebugLogger;
    readonly midiFile: DebugLogger;
    readonly synthesis: DebugLogger;
};
//# sourceMappingURL=debug-logger.d.ts.map