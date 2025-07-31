/**
 * Velocity Processing Utilities
 * Part of AWE Player EMU8000 Emulator
 *
 * Common velocity calculation patterns and utilities used across input handlers.
 */
/**
 * Calculate velocity from Y position (top = loud, bottom = soft)
 * Used by virtual keyboard and touch interfaces
 */
export declare function calculatePositionVelocity(relativeY: number, elementHeight: number, invert?: boolean): number;
/**
 * Calculate velocity from time duration (faster = louder)
 * Used by keyboard input handlers
 */
export declare function calculateTimingVelocity(durationMs: number, fastThresholdMs?: number, slowThresholdMs?: number): number;
/**
 * Calculate velocity from pressure/force (higher pressure = louder)
 * Used by touch and stylus input
 */
export declare function calculatePressureVelocity(pressure: number, baseVelocity?: number): number;
/**
 * Calculate velocity from radius/contact area (larger contact = louder)
 * Used by touch input for finger size detection
 */
export declare function calculateContactVelocity(radiusX?: number, radiusY?: number, maxRadius?: number): number;
/**
 * Combine multiple velocity factors with weighted averaging
 */
export declare function combineVelocityFactors(factors: Array<{
    value: number;
    weight: number;
}>): number;
/**
 * Ensure velocity is in valid MIDI range and convert to integer
 */
export declare function finalizeVelocity(rawVelocity: number): number;
/**
 * Get appropriate default velocity for input type
 */
export declare function getDefaultVelocityFor(inputType: 'touch' | 'mouse' | 'keyboard' | 'gamepad' | 'test'): number;
/**
 * Analyze velocity distribution for debugging
 */
export declare function analyzeVelocityRange(velocities: number[]): {
    min: number;
    max: number;
    average: number;
    median: number;
    range: number;
    distribution: Record<string, number>;
};
/**
 * Create a velocity test sequence for debugging
 */
export declare function createVelocityTestSequence(): number[];
//# sourceMappingURL=velocity-utils.d.ts.map