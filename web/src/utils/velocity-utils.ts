/**
 * Velocity Processing Utilities
 * Part of AWE Player EMU8000 Emulator
 * 
 * Common velocity calculation patterns and utilities used across input handlers.
 */

import { VELOCITY_CONSTANTS } from '../velocity-curves.js';
import { clampToMIDIVelocityRange } from '../midi-constants.js';

// ===== COMMON VELOCITY CALCULATION PATTERNS =====

/**
 * Calculate velocity from Y position (top = loud, bottom = soft)
 * Used by virtual keyboard and touch interfaces
 */
export function calculatePositionVelocity(
    relativeY: number, 
    elementHeight: number, 
    invert: boolean = true
): number {
    const normalizedY = Math.max(0, Math.min(1, relativeY / elementHeight));
    const rawVelocity = invert ? (1 - normalizedY) : normalizedY;
    return rawVelocity;
}

/**
 * Calculate velocity from time duration (faster = louder)
 * Used by keyboard input handlers
 */
export function calculateTimingVelocity(
    durationMs: number,
    fastThresholdMs: number = 50,
    slowThresholdMs: number = 200
): number {
    // Fast press (< fastThreshold) = high velocity
    // Slow press (> slowThreshold) = low velocity
    const normalizedDuration = Math.min(
        Math.max(durationMs - fastThresholdMs, 0) / (slowThresholdMs - fastThresholdMs), 
        1
    );
    return 1 - normalizedDuration; // Invert so faster = higher velocity
}

/**
 * Calculate velocity from pressure/force (higher pressure = louder)
 * Used by touch and stylus input
 */
export function calculatePressureVelocity(
    pressure: number,
    baseVelocity: number = 0.5
): number {
    // Combine base velocity with pressure modulation
    const pressureContribution = pressure * 0.5; // Pressure contributes up to 50%
    return Math.max(0, Math.min(1, baseVelocity + pressureContribution));
}

/**
 * Calculate velocity from radius/contact area (larger contact = louder)
 * Used by touch input for finger size detection
 */
export function calculateContactVelocity(
    radiusX: number = 10,
    radiusY: number = 10,
    maxRadius: number = 50
): number {
    const averageRadius = (radiusX + radiusY) * 0.5;
    const normalizedRadius = Math.min(averageRadius / maxRadius, 1);
    return normalizedRadius * 0.3; // Contact size contributes up to 30%
}

/**
 * Combine multiple velocity factors with weighted averaging
 */
export function combineVelocityFactors(factors: Array<{value: number, weight: number}>): number {
    let totalWeightedValue = 0;
    let totalWeight = 0;
    
    for (const factor of factors) {
        totalWeightedValue += factor.value * factor.weight;
        totalWeight += factor.weight;
    }
    
    return totalWeight > 0 ? totalWeightedValue / totalWeight : 0.5;
}

// ===== VELOCITY VALIDATION AND CLAMPING =====

/**
 * Ensure velocity is in valid MIDI range and convert to integer
 */
export function finalizeVelocity(rawVelocity: number): number {
    const midiVelocity = Math.round(rawVelocity * VELOCITY_CONSTANTS.MAX);
    return clampToMIDIVelocityRange(midiVelocity);
}

/**
 * Get appropriate default velocity for input type
 */
export function getDefaultVelocityFor(inputType: 'touch' | 'mouse' | 'keyboard' | 'gamepad' | 'test'): number {
    switch (inputType) {
        case 'touch': return VELOCITY_CONSTANTS.TOUCH_DEFAULT;
        case 'mouse': return VELOCITY_CONSTANTS.MOUSE_DEFAULT;
        case 'keyboard': return VELOCITY_CONSTANTS.KEYBOARD_DEFAULT;
        case 'gamepad': return VELOCITY_CONSTANTS.FORTE;
        case 'test': return VELOCITY_CONSTANTS.TEST_NOTE;
        default: return VELOCITY_CONSTANTS.DEFAULT;
    }
}

// ===== VELOCITY ANALYSIS UTILITIES =====

/**
 * Analyze velocity distribution for debugging
 */
export function analyzeVelocityRange(velocities: number[]): {
    min: number;
    max: number;
    average: number;
    median: number;
    range: number;
    distribution: Record<string, number>; // Ranges like 'pp', 'p', 'mf', etc.
} {
    if (velocities.length === 0) {
        return {
            min: 0, max: 0, average: 0, median: 0, range: 0,
            distribution: {}
        };
    }
    
    const sorted = [...velocities].sort((a, b) => a - b);
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 127;
    const average = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const median = sorted[Math.floor(sorted.length / 2)] ?? 64;
    
    // Count distribution by dynamic levels
    const distribution: Record<string, number> = {
        'pp (0-31)': 0,
        'p (32-47)': 0,
        'mp (48-63)': 0,
        'mf (64-79)': 0,
        'f (80-95)': 0,
        'ff (96-111)': 0,
        'fff (112-127)': 0
    };
    
    for (const velocity of velocities) {
        if (velocity <= 31) distribution['pp (0-31)']++;
        else if (velocity <= 47) distribution['p (32-47)']++;
        else if (velocity <= 63) distribution['mp (48-63)']++;
        else if (velocity <= 79) distribution['mf (64-79)']++;
        else if (velocity <= 95) distribution['f (80-95)']++;
        else if (velocity <= 111) distribution['ff (96-111)']++;
        else distribution['fff (112-127)']++;
    }
    
    return {
        min, max, average, median,
        range: max - min,
        distribution
    };
}

/**
 * Create a velocity test sequence for debugging
 */
export function createVelocityTestSequence(): number[] {
    return [
        VELOCITY_CONSTANTS.PIANISSIMO,
        VELOCITY_CONSTANTS.PIANO,
        VELOCITY_CONSTANTS.MEZZO_PIANO,
        VELOCITY_CONSTANTS.MEZZO_FORTE,
        VELOCITY_CONSTANTS.FORTE,
        VELOCITY_CONSTANTS.FORTISSIMO,
        VELOCITY_CONSTANTS.FORTISSISSIMO
    ];
}