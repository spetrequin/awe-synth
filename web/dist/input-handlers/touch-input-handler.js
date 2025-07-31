/**
 * Touch Input Handler - Advanced multi-touch support
 * Part of AWE Player EMU8000 Emulator
 */
import { BaseInputHandler } from './base-input-handler.js';
import { INPUT_TIMING } from '../midi-constants.js';
export class TouchInputHandler extends BaseInputHandler {
    activeTouches = new Map();
    aftertouch = false;
    glissando = false;
    keyboardElement = null;
    constructor(options) {
        super(options);
    }
    initialize() {
        this.keyboardElement = document.querySelector('.virtual-keyboard');
        if (!this.keyboardElement) {
            this.log('Virtual keyboard element not found');
            return;
        }
        this.setupTouchListeners();
        this.log('Touch input handler initialized');
    }
    cleanup() {
        if (this.keyboardElement) {
            this.keyboardElement.removeEventListener('touchstart', this.handleTouchStart);
            this.keyboardElement.removeEventListener('touchmove', this.handleTouchMove);
            this.keyboardElement.removeEventListener('touchend', this.handleTouchEnd);
        }
        this.activeTouches.clear();
    }
    getType() {
        return 'Touch Input';
    }
    /**
     * Enable/disable aftertouch
     */
    setAftertouch(enabled) {
        this.aftertouch = enabled;
        this.log(`Aftertouch: ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Enable/disable glissando
     */
    setGlissando(enabled) {
        this.glissando = enabled;
        this.log(`Glissando: ${enabled ? 'enabled' : 'disabled'}`);
    }
    setupTouchListeners() {
        if (!this.keyboardElement)
            return;
        this.keyboardElement.addEventListener('touchstart', this.handleTouchStart);
        this.keyboardElement.addEventListener('touchmove', this.handleTouchMove);
        this.keyboardElement.addEventListener('touchend', this.handleTouchEnd);
    }
    handleTouchStart = ((e) => {
        if (!this.enabled)
            return;
        e.preventDefault();
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch)
                continue;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.classList.contains('piano-key')) {
                const note = parseInt(target.dataset.note || '0');
                const velocity = this.calculateTouchVelocity(touch, target);
                this.activeTouches.set(touch.identifier, {
                    identifier: touch.identifier,
                    note: note,
                    startTime: performance.now(),
                    startY: touch.clientY,
                    pressure: touch.force || 0
                });
                this.keyboard.handleKeyPress(note, touch);
                this.log(`Touch start: Note ${note}, velocity ${velocity}`);
            }
        }
    });
    handleTouchMove = ((e) => {
        if (!this.enabled)
            return;
        e.preventDefault();
        if (this.glissando) {
            this.handleGlissando(e);
        }
        if (this.aftertouch) {
            this.handleAftertouch(e);
        }
    });
    handleTouchEnd = ((e) => {
        if (!this.enabled)
            return;
        e.preventDefault();
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch)
                continue;
            const touchInfo = this.activeTouches.get(touch.identifier);
            if (touchInfo) {
                this.keyboard.handleKeyRelease(touchInfo.note);
                this.activeTouches.delete(touch.identifier);
                this.log(`Touch end: Note ${touchInfo.note}`);
            }
        }
    });
    handleGlissando(event) {
        const touches = event.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch)
                continue;
            const touchInfo = this.activeTouches.get(touch.identifier);
            if (touchInfo) {
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('piano-key')) {
                    const newNote = parseInt(target.dataset.note || '0');
                    if (newNote !== touchInfo.note) {
                        // Release old note
                        this.keyboard.handleKeyRelease(touchInfo.note);
                        // Play new note
                        this.keyboard.handleKeyPress(newNote, touch);
                        // Update touch info
                        touchInfo.note = newNote;
                        this.log(`Glissando: ${touchInfo.note} → ${newNote}`);
                    }
                }
            }
        }
    }
    handleAftertouch(event) {
        const touches = event.touches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch)
                continue;
            const touchInfo = this.activeTouches.get(touch.identifier);
            if (touchInfo && touch.force !== undefined) {
                const pressure = Math.round((touch.force || 0) * 127);
                if (pressure !== touchInfo.pressure) {
                    // Send channel pressure (aftertouch)
                    this.keyboard.getMidiBridge().sendMidiEvent(this.keyboard.getCurrentChannel(), 0xD0, // Channel pressure
                    pressure, 0);
                    touchInfo.pressure = pressure;
                    this.log(`Aftertouch: ${pressure}`);
                }
            }
        }
    }
    calculateTouchVelocity(touch, target) {
        const rect = target.getBoundingClientRect();
        const relativeY = touch.clientY - rect.top;
        const normalizedY = relativeY / rect.height;
        // Consider touch radius if available
        const radius = touch.radiusX || 10;
        const radiusBonus = Math.min(radius / INPUT_TIMING.TOUCH_RADIUS_MAX, 0.2);
        // Consider pressure if available
        const pressure = touch.force || 0.5;
        // Combine factors
        let rawVelocity = (1 - normalizedY) * 0.7 + radiusBonus + pressure * 0.3;
        rawVelocity = Math.max(0, Math.min(1, rawVelocity));
        return this.velocityProcessor.processVelocity(rawVelocity);
    }
}
//# sourceMappingURL=touch-input-handler.js.map