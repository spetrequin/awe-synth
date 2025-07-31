/**
 * Base Input Handler Interface
 * Part of AWE Player EMU8000 Emulator
 */
export class BaseInputHandler {
    keyboard;
    velocityProcessor;
    debugLog;
    enabled = true;
    constructor(options) {
        this.keyboard = options.keyboard;
        this.velocityProcessor = options.velocityProcessor;
        this.debugLog = options.debugLog || (() => { });
    }
    /**
     * Enable/disable this input handler
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Check if handler is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Helper to log debug messages
     */
    log(message) {
        this.debugLog(`[${this.getType()}] ${message}`);
    }
}
//# sourceMappingURL=base-input-handler.js.map