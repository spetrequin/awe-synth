/**
 * Velocity Curves for Input Sensitivity
 * Part of AWE Player EMU8000 Emulator
 */
export declare const VELOCITY_CONSTANTS: {
    readonly DEFAULT: 64;
    readonly MAX: 127;
    readonly MIN: 1;
    readonly SILENT: 0;
    readonly PIANISSIMO: 16;
    readonly PIANO: 32;
    readonly MEZZO_PIANO: 48;
    readonly MEZZO_FORTE: 64;
    readonly FORTE: 80;
    readonly FORTISSIMO: 96;
    readonly FORTISSISSIMO: 112;
    readonly TOUCH_DEFAULT: 64;
    readonly MOUSE_DEFAULT: 80;
    readonly KEYBOARD_DEFAULT: 90;
    readonly DRUM_TRIGGER: 100;
    readonly TEST_NOTE: 100;
    readonly SENSITIVITY_MIN: 0.1;
    readonly SENSITIVITY_MAX: 2;
    readonly SENSITIVITY_DEFAULT: 1;
};
export type VelocityConstant = typeof VELOCITY_CONSTANTS[keyof typeof VELOCITY_CONSTANTS];
export interface VelocityProfile {
    name: string;
    description: string;
    curve: (normalized: number) => number;
}
export declare const VELOCITY_PROFILES: Map<string, VelocityProfile>;
export declare class VelocityCurveProcessor {
    private currentProfile;
    private sensitivity;
    constructor(initialProfile?: string);
    /**
     * Set the active velocity profile
     */
    setProfile(profileName: string): boolean;
    /**
     * Set velocity sensitivity multiplier
     */
    setSensitivity(sensitivity: number): void;
    /**
     * Process raw velocity input through current curve
     */
    processVelocity(rawVelocity: number): number;
    /**
     * Get current profile info
     */
    getCurrentProfile(): VelocityProfile | undefined;
    /**
     * Get all available profiles
     */
    getAvailableProfiles(): string[];
    /**
     * Get sensitivity value
     */
    getSensitivity(): number;
}
//# sourceMappingURL=velocity-curves.d.ts.map