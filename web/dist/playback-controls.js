/**
 * MIDI Playback Controls
 * Play/pause/stop buttons with state management
 */
import { DEBUG_LOGGERS } from './utils/debug-logger.js';
const log = (message) => DEBUG_LOGGERS.midiFile.log(message);
export class PlaybackControls {
    container;
    playButton;
    pauseButton;
    stopButton;
    state = 'stopped';
    events = {};
    isEnabled = false;
    constructor() {
        this.addControlStyles();
    }
    /**
     * Set event callbacks for playback actions
     */
    setEvents(events) {
        this.events = events;
    }
    /**
     * Create playback controls UI
     */
    createControls(container) {
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
            <div class="playback-status">
                <span class="status-text">No MIDI file loaded</span>
            </div>
        `;
        // Get button references
        this.playButton = controlsContainer.querySelector('.play-button');
        this.pauseButton = controlsContainer.querySelector('.pause-button');
        this.stopButton = controlsContainer.querySelector('.stop-button');
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
    setupEventListeners() {
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
    }
    /**
     * Handle play button click
     */
    handlePlay() {
        if (!this.isEnabled)
            return;
        log('Play button clicked');
        this.setState('playing');
        this.events.onPlay?.();
    }
    /**
     * Handle pause button click
     */
    handlePause() {
        if (!this.isEnabled)
            return;
        log('Pause button clicked');
        this.setState('paused');
        this.events.onPause?.();
    }
    /**
     * Handle stop button click
     */
    handleStop() {
        if (!this.isEnabled)
            return;
        log('Stop button clicked');
        this.setState('stopped');
        this.events.onStop?.();
    }
    /**
     * Set the current playback state
     */
    setState(state) {
        if (this.state === state)
            return;
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
    getState() {
        return this.state;
    }
    /**
     * Enable or disable the controls
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.updateButtonStates();
        this.updateStatusText();
        log(`Playback controls ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Check if controls are enabled
     */
    isControlsEnabled() {
        return this.isEnabled;
    }
    /**
     * Update button states based on current playback state
     */
    updateButtonStates() {
        if (!this.playButton || !this.pauseButton || !this.stopButton)
            return;
        // Reset all button states
        this.playButton.classList.remove('active');
        this.pauseButton.classList.remove('active');
        this.stopButton.classList.remove('active');
        // Disable all buttons if not enabled
        if (!this.isEnabled) {
            this.playButton.disabled = true;
            this.pauseButton.disabled = true;
            this.stopButton.disabled = true;
            return;
        }
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
    updateStatusText() {
        if (!this.container)
            return;
        const statusText = this.container.querySelector('.status-text');
        if (!statusText)
            return;
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
     * Add CSS styles for playback controls
     */
    addControlStyles() {
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
            }
        `;
        document.head.appendChild(style);
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        delete this.container;
        delete this.playButton;
        delete this.pauseButton;
        delete this.stopButton;
        this.events = {};
    }
}
//# sourceMappingURL=playback-controls.js.map