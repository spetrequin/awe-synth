/**
 * MIDI Playback Controls
 * Play/pause/stop buttons with state management
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';
export interface PlaybackEvents {
    onPlay?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onSeek?: (position: number) => void;
    onStateChange?: (state: PlaybackState) => void;
}
export declare class PlaybackControls {
    private container?;
    private playButton?;
    private pauseButton?;
    private stopButton?;
    private seekSlider?;
    private positionDisplay?;
    private durationDisplay?;
    private state;
    private events;
    private isEnabled;
    private currentPosition;
    private totalDuration;
    private isDragging;
    constructor();
    /**
     * Set event callbacks for playback actions
     */
    setEvents(events: PlaybackEvents): void;
    /**
     * Create playback controls UI
     */
    createControls(container: HTMLElement): HTMLElement;
    /**
     * Set up button event listeners
     */
    private setupEventListeners;
    /**
     * Handle play button click
     */
    private handlePlay;
    /**
     * Handle pause button click
     */
    private handlePause;
    /**
     * Handle stop button click
     */
    private handleStop;
    /**
     * Handle seek slider change
     */
    private handleSeek;
    /**
     * Set the current playback state
     */
    setState(state: PlaybackState): void;
    /**
     * Get the current playback state
     */
    getState(): PlaybackState;
    /**
     * Enable or disable the controls
     */
    setEnabled(enabled: boolean): void;
    /**
     * Set the total duration of the MIDI file
     */
    setDuration(durationSeconds: number): void;
    /**
     * Get the total duration
     */
    getDuration(): number;
    /**
     * Set the current playback position
     */
    setPosition(positionSeconds: number): void;
    /**
     * Get the current playback position
     */
    getPosition(): number;
    /**
     * Check if controls are enabled
     */
    isControlsEnabled(): boolean;
    /**
     * Update button states based on current playback state
     */
    private updateButtonStates;
    /**
     * Update status text based on current state
     */
    private updateStatusText;
    /**
     * Update time displays (position and duration)
     */
    private updateTimeDisplays;
    /**
     * Update seek slider position
     */
    private updateSeekSlider;
    /**
     * Format time in seconds to MM:SS format
     */
    private formatTime;
    /**
     * Add CSS styles for playback controls
     */
    private addControlStyles;
    /**
     * Clean up resources
     */
    destroy(): void;
}
//# sourceMappingURL=playback-controls.d.ts.map