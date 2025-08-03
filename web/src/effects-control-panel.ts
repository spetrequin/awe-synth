/**
 * AWE Player - Enhanced Effects Control Panel (Phase 17.4)
 * 
 * Provides comprehensive effects parameter control with real-time feedback
 * Integrates Phase 16 send/return effects system with modern UI
 */

import { DebugLogger } from './utils/debug-logger.js';

export interface EffectsStatus {
    reverbSend: number;      // 0-127 MIDI CC value
    chorusSend: number;      // 0-127 MIDI CC value
    reverbReturn: number;    // 0.0-1.0 normalized
    chorusReturn: number;    // 0.0-1.0 normalized
    masterReverb: number;    // 0.0-1.0 normalized
    masterChorus: number;    // 0.0-1.0 normalized
}

/**
 * Enhanced Effects Control Panel Manager
 * Handles all effects parameter controls and visual feedback
 */
export class EffectsControlPanel {
    private logger: DebugLogger;
    private wasmModule: any;
    
    // Current effects status
    private effectsStatus: EffectsStatus = {
        reverbSend: 51,    // Default 40% (51/127)
        chorusSend: 25,    // Default 20% (25/127)
        reverbReturn: 0.3, // Default 30%
        chorusReturn: 0.2, // Default 20%
        masterReverb: 1.0, // Default 100%
        masterChorus: 1.0  // Default 100%
    };
    
    // UI Elements
    private presetButtons: HTMLButtonElement[] = [];
    
    constructor(wasmModule: any) {
        this.logger = new DebugLogger({ componentName: 'EffectsControl', enabled: true });
        this.wasmModule = wasmModule;
    }
    
    /**
     * Initialize enhanced effects controls with presets and status display
     */
    public initialize(): void {
        this.logger.log('🎛️ Initializing enhanced effects control panel...');
        
        // Create effects status display
        this.createStatusDisplay();
        
        // Add preset buttons for common effect settings
        this.createPresetButtons();
        
        // Initialize default effects values
        this.applyDefaultEffects();
        
        // Set up periodic status updates
        this.startStatusUpdates();
        
        this.logger.log('✅ Effects control panel initialized');
    }
    
    /**
     * Create real-time effects status display
     */
    private createStatusDisplay(): void {
        const effectsPanel = document.querySelector('.effects-panel');
        if (!effectsPanel) return;
        
        // Create status display element
        const statusDiv = document.createElement('div');
        statusDiv.className = 'effects-status';
        statusDiv.innerHTML = `
            <h4>📊 Effects Status</h4>
            <div id="effects-status-content">
                <div class="status-row">
                    <span>Reverb Path:</span>
                    <span id="reverb-path-status">Send: 40% → Return: 30% → Master: 100%</span>
                </div>
                <div class="status-row">
                    <span>Chorus Path:</span>
                    <span id="chorus-path-status">Send: 20% → Return: 20% → Master: 100%</span>
                </div>
                <div class="status-row">
                    <span>Active Voices:</span>
                    <span id="effects-voice-count">0 voices with effects</span>
                </div>
            </div>
        `;
        
        effectsPanel.appendChild(statusDiv);
    }
    
    /**
     * Create preset effect buttons for quick settings
     */
    private createPresetButtons(): void {
        const effectsPanel = document.querySelector('.effects-panel');
        if (!effectsPanel) return;
        
        const presetsDiv = document.createElement('div');
        presetsDiv.className = 'effects-presets';
        presetsDiv.innerHTML = `
            <h4>🎵 Effect Presets</h4>
            <div class="preset-buttons">
                <button data-preset="dry" title="No effects">Dry</button>
                <button data-preset="subtle" title="Light reverb/chorus">Subtle</button>
                <button data-preset="concert" title="Concert hall">Concert</button>
                <button data-preset="cathedral" title="Large reverb">Cathedral</button>
                <button data-preset="vintage" title="Classic EMU8000">Vintage</button>
            </div>
        `;
        
        effectsPanel.appendChild(presetsDiv);
        
        // Set up preset button handlers
        const presetButtons = presetsDiv.querySelectorAll('button[data-preset]');
        presetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const preset = (e.target as HTMLButtonElement).dataset.preset;
                if (preset) this.applyPreset(preset);
            });
            this.presetButtons.push(button as HTMLButtonElement);
        });
    }
    
    /**
     * Apply effect preset
     */
    private applyPreset(preset: string): void {
        this.logger.log(`🎵 Applying effect preset: ${preset}`);
        
        const presets: Record<string, Partial<EffectsStatus>> = {
            dry: { reverbSend: 0, chorusSend: 0 },
            subtle: { reverbSend: 25, chorusSend: 13 },
            concert: { reverbSend: 76, chorusSend: 32 },
            cathedral: { reverbSend: 102, chorusSend: 51 },
            vintage: { reverbSend: 51, chorusSend: 25 } // EMU8000 defaults
        };
        
        const settings = presets[preset];
        if (!settings) return;
        
        // Apply reverb send if changed
        if (settings.reverbSend !== undefined) {
            this.updateReverbSend(settings.reverbSend);
            this.updateSlider('reverb-send', settings.reverbSend / 127);
        }
        
        // Apply chorus send if changed
        if (settings.chorusSend !== undefined) {
            this.updateChorusSend(settings.chorusSend);
            this.updateSlider('chorus-send', settings.chorusSend / 127);
        }
        
        // Highlight active preset button
        this.presetButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === preset);
        });
    }
    
    /**
     * Update reverb send level via MIDI CC 91
     */
    public updateReverbSend(midiValue: number): void {
        this.effectsStatus.reverbSend = midiValue;
        if (this.wasmModule.queue_midi_event_global) {
            this.wasmModule.queue_midi_event_global(0n, 0, 0xB0, 91, midiValue);
            this.logger.log(`🎛️ Reverb Send: ${Math.round(midiValue / 127 * 100)}% (CC91=${midiValue})`);
        }
        this.updateStatusDisplay();
    }
    
    /**
     * Update chorus send level via MIDI CC 93
     */
    public updateChorusSend(midiValue: number): void {
        this.effectsStatus.chorusSend = midiValue;
        if (this.wasmModule.queue_midi_event_global) {
            this.wasmModule.queue_midi_event_global(0n, 0, 0xB0, 93, midiValue);
            this.logger.log(`🎛️ Chorus Send: ${Math.round(midiValue / 127 * 100)}% (CC93=${midiValue})`);
        }
        this.updateStatusDisplay();
    }
    
    /**
     * Update return/master levels (for display only)
     */
    public updateReturnLevels(type: 'reverb' | 'chorus', returnLevel: number, masterLevel: number): void {
        if (type === 'reverb') {
            this.effectsStatus.reverbReturn = returnLevel;
            this.effectsStatus.masterReverb = masterLevel;
        } else {
            this.effectsStatus.chorusReturn = returnLevel;
            this.effectsStatus.masterChorus = masterLevel;
        }
        this.updateStatusDisplay();
    }
    
    /**
     * Update the status display with current values
     */
    private updateStatusDisplay(): void {
        const reverbPath = document.getElementById('reverb-path-status');
        const chorusPath = document.getElementById('chorus-path-status');
        
        if (reverbPath) {
            const sendPct = Math.round(this.effectsStatus.reverbSend / 127 * 100);
            const returnPct = Math.round(this.effectsStatus.reverbReturn * 100);
            const masterPct = Math.round(this.effectsStatus.masterReverb * 100);
            reverbPath.textContent = `Send: ${sendPct}% → Return: ${returnPct}% → Master: ${masterPct}%`;
        }
        
        if (chorusPath) {
            const sendPct = Math.round(this.effectsStatus.chorusSend / 127 * 100);
            const returnPct = Math.round(this.effectsStatus.chorusReturn * 100);
            const masterPct = Math.round(this.effectsStatus.masterChorus * 100);
            chorusPath.textContent = `Send: ${sendPct}% → Return: ${returnPct}% → Master: ${masterPct}%`;
        }
    }
    
    /**
     * Update a slider's visual position
     */
    private updateSlider(sliderId: string, value: number): void {
        const slider = document.getElementById(sliderId) as HTMLInputElement;
        if (slider) {
            slider.value = value.toString();
            // Trigger input event to update display
            slider.dispatchEvent(new Event('input'));
        }
    }
    
    /**
     * Apply default EMU8000 effects settings
     */
    private applyDefaultEffects(): void {
        this.logger.log('🎛️ Applying default EMU8000 effects settings');
        
        // Apply default send levels
        this.updateReverbSend(this.effectsStatus.reverbSend);
        this.updateChorusSend(this.effectsStatus.chorusSend);
        
        // Update UI to match
        this.updateSlider('reverb-send', this.effectsStatus.reverbSend / 127);
        this.updateSlider('chorus-send', this.effectsStatus.chorusSend / 127);
        this.updateSlider('reverb-return', this.effectsStatus.reverbReturn);
        this.updateSlider('chorus-return', this.effectsStatus.chorusReturn);
        this.updateSlider('master-reverb', this.effectsStatus.masterReverb);
        this.updateSlider('master-chorus', this.effectsStatus.masterChorus);
    }
    
    /**
     * Start periodic status updates
     */
    private startStatusUpdates(): void {
        // Update voice count periodically
        setInterval(() => {
            const voiceCount = document.getElementById('effects-voice-count');
            if (voiceCount && this.wasmModule.get_debug_log_global) {
                // Parse debug log to find active voice count
                const debugLog = this.wasmModule.get_debug_log_global();
                const match = debugLog.match(/Active voices: (\d+)/);
                if (match) {
                    const count = parseInt(match[1]);
                    const withEffects = count > 0 ? `${count} voices with effects` : 'No active voices';
                    voiceCount.textContent = withEffects;
                }
            }
        }, 250); // Update 4 times per second
    }
    
    /**
     * Get current effects status
     */
    public getStatus(): EffectsStatus {
        return { ...this.effectsStatus };
    }
    
    /**
     * Cleanup
     */
    public cleanup(): void {
        this.logger.log('🧹 Cleaning up effects control panel');
        this.presetButtons = [];
    }
}