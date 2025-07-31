/**
 * Velocity Curves for Input Sensitivity
 * Part of AWE Player EMU8000 Emulator
 */
// ===== VELOCITY CONSTANTS =====
export const VELOCITY_CONSTANTS = {
    // Common MIDI velocity values
    DEFAULT: 64, // Standard default velocity
    MAX: 127, // Maximum MIDI velocity
    MIN: 1, // Minimum audible velocity (0 = note off)
    SILENT: 0, // Note off velocity
    // Musical dynamics (approximate MIDI values)
    PIANISSIMO: 16, // pp - very soft
    PIANO: 32, // p - soft  
    MEZZO_PIANO: 48, // mp - moderately soft
    MEZZO_FORTE: 64, // mf - moderately loud
    FORTE: 80, // f - loud
    FORTISSIMO: 96, // ff - very loud
    FORTISSISSIMO: 112, // fff - extremely loud
    // Input-specific defaults
    TOUCH_DEFAULT: 64, // Default for touch input
    MOUSE_DEFAULT: 80, // Default for mouse input
    KEYBOARD_DEFAULT: 90, // Default for computer keyboard
    DRUM_TRIGGER: 100, // Default for drum triggers
    TEST_NOTE: 100, // Default for test/demo notes
    // Sensitivity ranges
    SENSITIVITY_MIN: 0.1,
    SENSITIVITY_MAX: 2.0,
    SENSITIVITY_DEFAULT: 1.0
};
export const VELOCITY_PROFILES = new Map([
    ['linear', {
            name: 'Linear',
            description: 'Direct 1:1 velocity response',
            curve: (n) => n
        }],
    ['natural', {
            name: 'Natural (Square Root)',
            description: 'Smooth, natural feeling response',
            curve: (n) => Math.sqrt(n)
        }],
    ['exponential', {
            name: 'Exponential',
            description: 'More pronounced velocity differences',
            curve: (n) => n * n
        }],
    ['logarithmic', {
            name: 'Logarithmic',
            description: 'Compressed velocity range',
            curve: (n) => Math.log(n * 9 + 1) / Math.log(10)
        }],
    ['soft', {
            name: 'Soft Touch',
            description: 'Easier to get high velocities',
            curve: (n) => Math.pow(n, 1.5)
        }],
    ['hard', {
            name: 'Hard Touch',
            description: 'Requires more force for high velocities',
            curve: (n) => Math.pow(n, 0.7)
        }],
    ['pianist', {
            name: 'Pianist',
            description: 'Optimized for piano playing',
            curve: (n) => {
                // S-curve for more nuanced control in mid-range
                return 0.5 * (Math.tanh(4 * (n - 0.5)) + 1);
            }
        }],
    ['organist', {
            name: 'Organist',
            description: 'More binary response for organ-style playing',
            curve: (n) => n < 0.3 ? n * 1.5 : 0.45 + (n - 0.3) * 0.78
        }]
]);
export class VelocityCurveProcessor {
    currentProfile = 'natural';
    sensitivity = 1.0;
    constructor(initialProfile = 'natural') {
        this.setProfile(initialProfile);
    }
    /**
     * Set the active velocity profile
     */
    setProfile(profileName) {
        if (VELOCITY_PROFILES.has(profileName)) {
            this.currentProfile = profileName;
            return true;
        }
        return false;
    }
    /**
     * Set velocity sensitivity multiplier
     */
    setSensitivity(sensitivity) {
        this.sensitivity = Math.max(0.1, Math.min(2.0, sensitivity));
    }
    /**
     * Process raw velocity input through current curve
     */
    processVelocity(rawVelocity) {
        // Normalize input to 0-1 range
        const normalized = Math.max(0, Math.min(1, rawVelocity));
        // Apply velocity curve
        const profile = VELOCITY_PROFILES.get(this.currentProfile);
        if (!profile)
            return Math.round(normalized * 127);
        const curved = profile.curve(normalized);
        // Apply sensitivity and convert to MIDI range
        const result = curved * this.sensitivity;
        return Math.round(Math.max(VELOCITY_CONSTANTS.MIN, Math.min(VELOCITY_CONSTANTS.MAX, result * VELOCITY_CONSTANTS.MAX)));
    }
    /**
     * Get current profile info
     */
    getCurrentProfile() {
        return VELOCITY_PROFILES.get(this.currentProfile);
    }
    /**
     * Get all available profiles
     */
    getAvailableProfiles() {
        return Array.from(VELOCITY_PROFILES.keys());
    }
    /**
     * Get sensitivity value
     */
    getSensitivity() {
        return this.sensitivity;
    }
}
//# sourceMappingURL=velocity-curves.js.map