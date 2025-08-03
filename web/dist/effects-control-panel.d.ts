/**
 * AWE Player - Enhanced Effects Control Panel (Phase 17.4)
 *
 * Provides comprehensive effects parameter control with real-time feedback
 * Integrates Phase 16 send/return effects system with modern UI
 */
export interface EffectsStatus {
    reverbSend: number;
    chorusSend: number;
    reverbReturn: number;
    chorusReturn: number;
    masterReverb: number;
    masterChorus: number;
}
/**
 * Enhanced Effects Control Panel Manager
 * Handles all effects parameter controls and visual feedback
 */
export declare class EffectsControlPanel {
    private logger;
    private wasmModule;
    private effectsStatus;
    private presetButtons;
    constructor(wasmModule: any);
    /**
     * Initialize enhanced effects controls with presets and status display
     */
    initialize(): void;
    /**
     * Create real-time effects status display
     */
    private createStatusDisplay;
    /**
     * Create preset effect buttons for quick settings
     */
    private createPresetButtons;
    /**
     * Apply effect preset
     */
    private applyPreset;
    /**
     * Update reverb send level via MIDI CC 91
     */
    updateReverbSend(midiValue: number): void;
    /**
     * Update chorus send level via MIDI CC 93
     */
    updateChorusSend(midiValue: number): void;
    /**
     * Update return/master levels (for display only)
     */
    updateReturnLevels(type: 'reverb' | 'chorus', returnLevel: number, masterLevel: number): void;
    /**
     * Update the status display with current values
     */
    private updateStatusDisplay;
    /**
     * Update a slider's visual position
     */
    private updateSlider;
    /**
     * Apply default EMU8000 effects settings
     */
    private applyDefaultEffects;
    /**
     * Start periodic status updates
     */
    private startStatusUpdates;
    /**
     * Get current effects status
     */
    getStatus(): EffectsStatus;
    /**
     * Cleanup
     */
    cleanup(): void;
}
//# sourceMappingURL=effects-control-panel.d.ts.map