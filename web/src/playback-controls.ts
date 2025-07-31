/**
 * MIDI Playback Controls
 * Play/pause/stop buttons with state management
 */

import { DEBUG_LOGGERS } from './utils/debug-logger.js';

const log = (message: string) => DEBUG_LOGGERS.midiFile.log(message);

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export interface PlaybackEvents {
    onPlay?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onSeek?: (position: number) => void;
    onTempoChange?: (tempo: number) => void;
    onStateChange?: (state: PlaybackState) => void;
}

export class PlaybackControls {
    private container?: HTMLElement;
    private playButton?: HTMLButtonElement;
    private pauseButton?: HTMLButtonElement;
    private stopButton?: HTMLButtonElement;
    private seekSlider?: HTMLInputElement;
    private positionDisplay?: HTMLElement;
    private durationDisplay?: HTMLElement;
    private tempoSlider?: HTMLInputElement;
    private tempoDisplay?: HTMLElement;
    private tempoResetButton?: HTMLButtonElement;
    private state: PlaybackState = 'stopped';
    private events: PlaybackEvents = {};
    private isEnabled = false;
    private currentPosition = 0; // Current position in seconds
    private totalDuration = 0;   // Total duration in seconds
    private isDragging = false;  // Track if user is dragging the seek slider
    private originalTempo = 120; // Original MIDI file tempo (BPM)
    private currentTempo = 120;  // Current adjusted tempo (BPM)
    private isTempoAdjusting = false; // Track if user is adjusting tempo

    constructor() {
        this.addControlStyles();
    }

    /**
     * Set event callbacks for playback actions
     */
    public setEvents(events: PlaybackEvents): void {
        this.events = events;
    }

    /**
     * Create playback controls UI
     */
    public createControls(container: HTMLElement): HTMLElement {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'playback-controls';
        controlsContainer.innerHTML = `
            <div class="playback-buttons">
                <button class="playback-button play-button" title="Play" disabled>
                    <span class="button-icon">▶</span>
                    <span class="button-text">Play</span>
                </button>
                <button class="playback-button pause-button" title="Pause" disabled>
                    <span class="button-icon">⏸</span>
                    <span class="button-text">Pause</span>
                </button>
                <button class="playback-button stop-button" title="Stop" disabled>
                    <span class="button-icon">⏹</span>
                    <span class="button-text">Stop</span>
                </button>
            </div>
            <div class="seek-container">
                <div class="time-display position-time">0:00</div>
                <div class="seek-bar-container">
                    <input type="range" class="seek-slider" min="0" max="100" value="0" step="0.1" disabled>
                    <div class="seek-progress"></div>
                </div>
                <div class="time-display duration-time">0:00</div>
            </div>
            <div class="tempo-container">
                <div class="tempo-label">Tempo</div>
                <div class="tempo-controls">
                    <div class="tempo-display">120 BPM</div>
                    <div class="tempo-slider-container">
                        <input type="range" class="tempo-slider" min="50" max="200" value="120" step="1" disabled>
                    </div>
                    <button class="tempo-reset-button" title="Reset to original tempo" disabled>Reset</button>
                </div>
            </div>
            <div class="playback-status">
                <span class="status-text">No MIDI file loaded</span>
            </div>
        `;

        // Get element references
        this.playButton = controlsContainer.querySelector('.play-button') as HTMLButtonElement;
        this.pauseButton = controlsContainer.querySelector('.pause-button') as HTMLButtonElement;
        this.stopButton = controlsContainer.querySelector('.stop-button') as HTMLButtonElement;
        this.seekSlider = controlsContainer.querySelector('.seek-slider') as HTMLInputElement;
        this.positionDisplay = controlsContainer.querySelector('.position-time') as HTMLElement;
        this.durationDisplay = controlsContainer.querySelector('.duration-time') as HTMLElement;
        this.tempoSlider = controlsContainer.querySelector('.tempo-slider') as HTMLInputElement;
        this.tempoDisplay = controlsContainer.querySelector('.tempo-display') as HTMLElement;
        this.tempoResetButton = controlsContainer.querySelector('.tempo-reset-button') as HTMLButtonElement;

        // Set up event listeners
        this.setupEventListeners();

        // Update initial button states
        this.updateButtonStates();

        container.appendChild(controlsContainer);
        this.container = controlsContainer;
        return controlsContainer;
    }

    /**
     * Set up button event listeners
     */
    private setupEventListeners(): void {
        this.playButton?.addEventListener('click', () => {
            if (this.state === 'stopped' || this.state === 'paused') {
                this.handlePlay();
            }
        });

        this.pauseButton?.addEventListener('click', () => {
            if (this.state === 'playing') {
                this.handlePause();
            }
        });

        this.stopButton?.addEventListener('click', () => {
            if (this.state === 'playing' || this.state === 'paused') {
                this.handleStop();
            }
        });

        // Seek slider event listeners
        this.seekSlider?.addEventListener('mousedown', () => {
            this.isDragging = true;
        });

        this.seekSlider?.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.seekSlider?.addEventListener('input', () => {
            if (this.isDragging && this.seekSlider) {
                const position = parseFloat(this.seekSlider.value);
                this.handleSeek(position);
            }
        });

        this.seekSlider?.addEventListener('change', () => {
            if (this.seekSlider) {
                const position = parseFloat(this.seekSlider.value);
                this.handleSeek(position);
            }
        });

        // Tempo slider event listeners
        this.tempoSlider?.addEventListener('mousedown', () => {
            this.isTempoAdjusting = true;
        });

        this.tempoSlider?.addEventListener('mouseup', () => {
            this.isTempoAdjusting = false;
        });

        this.tempoSlider?.addEventListener('input', () => {
            if (this.tempoSlider) {
                const tempo = parseInt(this.tempoSlider.value);
                this.handleTempoChange(tempo);
            }
        });

        this.tempoSlider?.addEventListener('change', () => {
            if (this.tempoSlider) {
                const tempo = parseInt(this.tempoSlider.value);
                this.handleTempoChange(tempo);
            }
        });

        // Tempo reset button
        this.tempoResetButton?.addEventListener('click', () => {
            this.resetTempo();
        });
    }

    /**
     * Handle play button click
     */
    private handlePlay(): void {
        if (!this.isEnabled) return;

        log('Play button clicked');
        this.setState('playing');
        this.events.onPlay?.();
    }

    /**
     * Handle pause button click
     */
    private handlePause(): void {
        if (!this.isEnabled) return;

        log('Pause button clicked');
        this.setState('paused');
        this.events.onPause?.();
    }

    /**
     * Handle stop button click
     */
    private handleStop(): void {
        if (!this.isEnabled) return;

        log('Stop button clicked');
        this.setState('stopped');
        this.events.onStop?.();
    }

    /**
     * Handle seek slider change
     */
    private handleSeek(position: number): void {
        if (!this.isEnabled) return;

        // Convert position from 0-100 range to seconds
        const seekTime = (position / 100) * this.totalDuration;
        
        log(`Seek to position: ${position}% (${seekTime.toFixed(1)}s)`);
        
        this.setPosition(seekTime);
        this.events.onSeek?.(seekTime);
    }

    /**
     * Handle tempo slider change
     */
    private handleTempoChange(tempo: number): void {
        if (!this.isEnabled) return;

        // Clamp tempo to valid range
        const clampedTempo = Math.max(50, Math.min(200, tempo));
        this.currentTempo = clampedTempo;
        
        log(`Tempo changed to: ${clampedTempo} BPM`);
        
        this.updateTempoDisplay();
        this.events.onTempoChange?.(clampedTempo);
    }

    /**
     * Reset tempo to original value
     */
    private resetTempo(): void {
        if (!this.isEnabled) return;

        log(`Tempo reset to original: ${this.originalTempo} BPM`);
        
        this.currentTempo = this.originalTempo;
        this.updateTempoControls();
        this.events.onTempoChange?.(this.originalTempo);
    }

    /**
     * Set the current playback state
     */
    public setState(state: PlaybackState): void {
        if (this.state === state) return;

        const previousState = this.state;
        this.state = state;
        
        log(`Playback state changed: ${previousState} → ${state}`);
        
        this.updateButtonStates();
        this.updateStatusText();
        this.events.onStateChange?.(state);
    }

    /**
     * Get the current playback state
     */
    public getState(): PlaybackState {
        return this.state;
    }

    /**
     * Enable or disable the controls
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        this.updateButtonStates();
        this.updateStatusText();
        
        log(`Playback controls ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set the total duration of the MIDI file
     */
    public setDuration(durationSeconds: number): void {
        this.totalDuration = Math.max(0, durationSeconds);
        this.updateTimeDisplays();
        this.updateSeekSlider();
        
        log(`Duration set to ${this.totalDuration.toFixed(1)}s`);
    }

    /**
     * Get the total duration
     */
    public getDuration(): number {
        return this.totalDuration;
    }

    /**
     * Set the current playback position
     */
    public setPosition(positionSeconds: number): void {
        this.currentPosition = Math.max(0, Math.min(positionSeconds, this.totalDuration));
        
        // Only update UI if user is not currently dragging
        if (!this.isDragging) {
            this.updateTimeDisplays();
            this.updateSeekSlider();
        }
    }

    /**
     * Get the current playback position
     */
    public getPosition(): number {
        return this.currentPosition;
    }

    /**
     * Set the original tempo from the MIDI file
     */
    public setOriginalTempo(tempoBPM: number): void {
        this.originalTempo = Math.max(50, Math.min(200, tempoBPM));
        this.currentTempo = this.originalTempo;
        this.updateTempoControls();
        
        log(`Original tempo set to ${this.originalTempo} BPM`);
    }

    /**
     * Get the original tempo
     */
    public getOriginalTempo(): number {
        return this.originalTempo;
    }

    /**
     * Set the current tempo (for external updates)
     */
    public setCurrentTempo(tempoBPM: number): void {
        const clampedTempo = Math.max(50, Math.min(200, tempoBPM));
        this.currentTempo = clampedTempo;
        
        // Only update UI if user is not currently adjusting tempo
        if (!this.isTempoAdjusting) {
            this.updateTempoControls();
        }
    }

    /**
     * Get the current tempo
     */
    public getCurrentTempo(): number {
        return this.currentTempo;
    }

    /**
     * Get the tempo multiplier (current/original)
     */
    public getTempoMultiplier(): number {
        return this.currentTempo / this.originalTempo;
    }

    /**
     * Check if controls are enabled
     */
    public isControlsEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Update button states based on current playback state
     */
    private updateButtonStates(): void {
        if (!this.playButton || !this.pauseButton || !this.stopButton) return;

        // Reset all button states
        this.playButton.classList.remove('active');
        this.pauseButton.classList.remove('active');
        this.stopButton.classList.remove('active');

        // Disable all buttons if not enabled
        if (!this.isEnabled) {
            this.playButton.disabled = true;
            this.pauseButton.disabled = true;
            this.stopButton.disabled = true;
            if (this.seekSlider) this.seekSlider.disabled = true;
            if (this.tempoSlider) this.tempoSlider.disabled = true;
            if (this.tempoResetButton) this.tempoResetButton.disabled = true;
            return;
        }

        // Enable controls when enabled
        if (this.seekSlider) this.seekSlider.disabled = false;
        if (this.tempoSlider) this.tempoSlider.disabled = false;
        if (this.tempoResetButton) this.tempoResetButton.disabled = false;

        // Update button states based on current state
        switch (this.state) {
            case 'stopped':
                this.playButton.disabled = false;
                this.pauseButton.disabled = true;
                this.stopButton.disabled = true;
                this.stopButton.classList.add('active');
                break;

            case 'playing':
                this.playButton.disabled = true;
                this.pauseButton.disabled = false;
                this.stopButton.disabled = false;
                this.playButton.classList.add('active');
                break;

            case 'paused':
                this.playButton.disabled = false;
                this.pauseButton.disabled = true;
                this.stopButton.disabled = false;
                this.pauseButton.classList.add('active');
                break;
        }
    }

    /**
     * Update status text based on current state
     */
    private updateStatusText(): void {
        if (!this.container) return;

        const statusText = this.container.querySelector('.status-text') as HTMLElement;
        if (!statusText) return;

        if (!this.isEnabled) {
            statusText.textContent = 'No MIDI file loaded';
            statusText.className = 'status-text';
            return;
        }

        switch (this.state) {
            case 'stopped':
                statusText.textContent = 'Ready to play';
                statusText.className = 'status-text status-stopped';
                break;

            case 'playing':
                statusText.textContent = 'Playing';
                statusText.className = 'status-text status-playing';
                break;

            case 'paused':
                statusText.textContent = 'Paused';
                statusText.className = 'status-text status-paused';
                break;
        }
    }

    /**
     * Update time displays (position and duration)
     */
    private updateTimeDisplays(): void {
        if (this.positionDisplay) {
            this.positionDisplay.textContent = this.formatTime(this.currentPosition);
        }
        if (this.durationDisplay) {
            this.durationDisplay.textContent = this.formatTime(this.totalDuration);
        }
    }

    /**
     * Update seek slider position
     */
    private updateSeekSlider(): void {
        if (!this.seekSlider) return;

        if (this.totalDuration > 0) {
            const percentage = (this.currentPosition / this.totalDuration) * 100;
            this.seekSlider.value = percentage.toString();
        } else {
            this.seekSlider.value = '0';
        }
    }

    /**
     * Format time in seconds to MM:SS format
     */
    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Update tempo display
     */
    private updateTempoDisplay(): void {
        if (this.tempoDisplay) {
            this.tempoDisplay.textContent = `${this.currentTempo} BPM`;
            
            // Add visual indication if tempo has changed
            if (this.currentTempo !== this.originalTempo) {
                this.tempoDisplay.classList.add('tempo-modified');
            } else {
                this.tempoDisplay.classList.remove('tempo-modified');
            }
        }
    }

    /**
     * Update tempo controls (slider and display)
     */
    private updateTempoControls(): void {
        if (this.tempoSlider) {
            this.tempoSlider.value = this.currentTempo.toString();
        }
        this.updateTempoDisplay();
    }

    /**
     * Add CSS styles for playback controls
     */
    private addControlStyles(): void {
        if (document.getElementById('playback-control-styles')) {
            return; // Styles already added
        }

        const style = document.createElement('style');
        style.id = 'playback-control-styles';
        style.textContent = `
            .playback-controls {
                display: flex;
                flex-direction: column;
                gap: 16px;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background-color: #f9f9f9;
                max-width: 400px;
            }

            .playback-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .playback-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 12px 16px;
                border: 2px solid #ccc;
                border-radius: 8px;
                background-color: #fff;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 80px;
                font-family: inherit;
            }

            .playback-button:not(:disabled):hover {
                border-color: #4a90e2;
                background-color: #f0f7ff;
                transform: translateY(-1px);
            }

            .playback-button:not(:disabled):active {
                transform: translateY(0);
                background-color: #e8f4fd;
            }

            .playback-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background-color: #f5f5f5;
            }

            .playback-button.active {
                border-color: #4a90e2;
                background-color: #e8f4fd;
                box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
            }

            .button-icon {
                font-size: 20px;
                line-height: 1;
            }

            .button-text {
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .play-button .button-icon {
                color: #28a745;
            }

            .pause-button .button-icon {
                color: #ffc107;
            }

            .stop-button .button-icon {
                color: #dc3545;
            }

            .seek-container {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
            }

            .time-display {
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: 600;
                color: #333;
                min-width: 40px;
                text-align: center;
            }

            .seek-bar-container {
                flex: 1;
                position: relative;
                height: 24px;
                display: flex;
                align-items: center;
            }

            .seek-slider {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                appearance: none;
                background: linear-gradient(to right, #4a90e2 0%, #4a90e2 0%, #ddd 0%, #ddd 100%);
                border-radius: 3px;
                outline: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .seek-slider:disabled {
                background: #f0f0f0;
                cursor: not-allowed;
            }

            .seek-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #4a90e2;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.2s ease;
            }

            .seek-slider:not(:disabled)::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            }

            .seek-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #4a90e2;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.2s ease;
            }

            .seek-slider:not(:disabled)::-moz-range-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            }

            .tempo-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 12px 0;
            }

            .tempo-label {
                font-size: 14px;
                font-weight: 600;
                color: #333;
                text-align: center;
            }

            .tempo-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .tempo-display {
                font-family: 'Courier New', monospace;
                font-size: 16px;
                font-weight: 700;
                color: #333;
                min-width: 70px;
                text-align: center;
                padding: 4px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f9f9f9;
                transition: all 0.2s ease;
            }

            .tempo-display.tempo-modified {
                color: #4a90e2;
                border-color: #4a90e2;
                background-color: #f0f7ff;
            }

            .tempo-slider-container {
                flex: 1;
                position: relative;
                height: 24px;
                display: flex;
                align-items: center;
            }

            .tempo-slider {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                appearance: none;
                background: linear-gradient(to right, #28a745 0%, #ffc107 50%, #dc3545 100%);
                border-radius: 3px;
                outline: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .tempo-slider:disabled {
                background: #f0f0f0;
                cursor: not-allowed;
            }

            .tempo-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #4a90e2;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.2s ease;
            }

            .tempo-slider:not(:disabled)::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            }

            .tempo-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #4a90e2;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.2s ease;
            }

            .tempo-slider:not(:disabled)::-moz-range-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            }

            .tempo-reset-button {
                padding: 6px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background-color: #fff;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 12px;
                font-weight: 500;
                color: #666;
            }

            .tempo-reset-button:not(:disabled):hover {
                border-color: #4a90e2;
                background-color: #f0f7ff;
                color: #4a90e2;
            }

            .tempo-reset-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background-color: #f5f5f5;
            }

            .playback-status {
                text-align: center;
                padding: 8px 0;
            }

            .status-text {
                font-size: 14px;
                font-weight: 500;
                color: #666;
            }

            .status-text.status-playing {
                color: #28a745;
            }

            .status-text.status-paused {
                color: #ffc107;
            }

            .status-text.status-stopped {
                color: #6c757d;
            }

            /* Responsive design */
            @media (max-width: 480px) {
                .playback-controls {
                    padding: 16px;
                }

                .playback-buttons {
                    flex-direction: column;
                    align-items: center;
                }

                .playback-button {
                    flex-direction: row;
                    gap: 8px;
                    width: 100%;
                    max-width: 200px;
                    justify-content: center;
                }

                .button-icon {
                    font-size: 16px;
                }

                .button-text {
                    font-size: 14px;
                }

                .seek-container {
                    gap: 8px;
                }

                .time-display {
                    font-size: 12px;
                    min-width: 35px;
                }

                .tempo-controls {
                    flex-direction: column;
                    gap: 8px;
                    align-items: center;
                }

                .tempo-display {
                    min-width: 60px;
                    font-size: 14px;
                }

                .tempo-slider-container {
                    width: 100%;
                    max-width: 200px;
                }

                .tempo-reset-button {
                    font-size: 11px;
                    padding: 4px 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        delete (this as any).container;
        delete (this as any).playButton;
        delete (this as any).pauseButton;
        delete (this as any).stopButton;
        delete (this as any).seekSlider;
        delete (this as any).positionDisplay;
        delete (this as any).durationDisplay;
        delete (this as any).tempoSlider;
        delete (this as any).tempoDisplay;
        delete (this as any).tempoResetButton;
        this.events = {};
    }
}