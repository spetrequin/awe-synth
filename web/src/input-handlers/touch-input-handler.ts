/**
 * Touch Input Handler - Advanced multi-touch support
 * Part of AWE Player EMU8000 Emulator
 */

import { BaseInputHandler, InputHandlerOptions } from './base-input-handler.js';
import { EnhancedTouch, EnhancedTouchEvent } from '../types/input-types.js';
import { INPUT_TIMING } from '../midi-constants.js';

interface TouchInfo {
    identifier: number;
    note: number;
    startTime: number;
    startY: number;
    pressure?: number;
}

export class TouchInputHandler extends BaseInputHandler {
    private activeTouches = new Map<number, TouchInfo>();
    private aftertouch = false;
    private glissando = false;
    private keyboardElement: Element | null = null;
    
    constructor(options: InputHandlerOptions) {
        super(options);
    }
    
    public initialize(): void {
        this.keyboardElement = document.querySelector('.virtual-keyboard');
        if (!this.keyboardElement) {
            this.log('Virtual keyboard element not found');
            return;
        }
        
        this.setupTouchListeners();
        this.log('Touch input handler initialized');
    }
    
    public cleanup(): void {
        if (this.keyboardElement) {
            this.keyboardElement.removeEventListener('touchstart', this.handleTouchStart);
            this.keyboardElement.removeEventListener('touchmove', this.handleTouchMove);
            this.keyboardElement.removeEventListener('touchend', this.handleTouchEnd);
        }
        this.activeTouches.clear();
    }
    
    public getType(): string {
        return 'Touch Input';
    }
    
    /**
     * Enable/disable aftertouch
     */
    public setAftertouch(enabled: boolean): void {
        this.aftertouch = enabled;
        this.log(`Aftertouch: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable/disable glissando
     */
    public setGlissando(enabled: boolean): void {
        this.glissando = enabled;
        this.log(`Glissando: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    private setupTouchListeners(): void {
        if (!this.keyboardElement) return;
        
        this.keyboardElement.addEventListener('touchstart', this.handleTouchStart);
        this.keyboardElement.addEventListener('touchmove', this.handleTouchMove);
        this.keyboardElement.addEventListener('touchend', this.handleTouchEnd);
    }
    
    private handleTouchStart = ((e: TouchEvent) => {
        if (!this.enabled) return;
        
        e.preventDefault();
        const touches = e.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch) continue;
            
            const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
            
            if (target && target.classList.contains('piano-key')) {
                const note = parseInt(target.dataset.note || '0');
                const velocity = this.calculateTouchVelocity(touch, target);
                
                this.activeTouches.set(touch.identifier, {
                    identifier: touch.identifier,
                    note: note,
                    startTime: performance.now(),
                    startY: touch.clientY,
                    pressure: (touch as EnhancedTouch).force || 0
                });
                
                this.keyboard.handleKeyPress(note, touch as unknown as MouseEvent);
                this.log(`Touch start: Note ${note}, velocity ${velocity}`);
            }
        }
    }) as EventListener;
    
    private handleTouchMove = ((e: TouchEvent) => {
        if (!this.enabled) return;
        
        e.preventDefault();
        
        if (this.glissando) {
            this.handleGlissando(e);
        }
        
        if (this.aftertouch) {
            this.handleAftertouch(e);
        }
    }) as EventListener;
    
    private handleTouchEnd = ((e: TouchEvent) => {
        if (!this.enabled) return;
        
        e.preventDefault();
        const touches = e.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch) continue;
            
            const touchInfo = this.activeTouches.get(touch.identifier);
            if (touchInfo) {
                this.keyboard.handleKeyRelease(touchInfo.note);
                this.activeTouches.delete(touch.identifier);
                this.log(`Touch end: Note ${touchInfo.note}`);
            }
        }
    }) as EventListener;
    
    private handleGlissando(event: TouchEvent): void {
        const touches = event.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch) continue;
            
            const touchInfo = this.activeTouches.get(touch.identifier);
            if (touchInfo) {
                const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                
                if (target && target.classList.contains('piano-key')) {
                    const newNote = parseInt(target.dataset.note || '0');
                    
                    if (newNote !== touchInfo.note) {
                        // Release old note
                        this.keyboard.handleKeyRelease(touchInfo.note);
                        
                        // Play new note
                        this.keyboard.handleKeyPress(newNote, touch as unknown as MouseEvent);
                        
                        // Update touch info
                        touchInfo.note = newNote;
                        this.log(`Glissando: ${touchInfo.note} → ${newNote}`);
                    }
                }
            }
        }
    }
    
    private handleAftertouch(event: TouchEvent): void {
        const touches = event.touches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (!touch) continue;
            
            const touchInfo = this.activeTouches.get(touch.identifier);
            
            if (touchInfo && (touch as EnhancedTouch).force !== undefined) {
                const pressure = Math.round(((touch as EnhancedTouch).force || 0) * 127);
                
                if (pressure !== touchInfo.pressure) {
                    // Send channel pressure (aftertouch)
                    this.keyboard.getMidiBridge().sendMidiEvent(
                        this.keyboard.getCurrentChannel(),
                        0xD0, // Channel pressure
                        pressure,
                        0
                    );
                    
                    touchInfo.pressure = pressure;
                    this.log(`Aftertouch: ${pressure}`);
                }
            }
        }
    }
    
    private calculateTouchVelocity(touch: Touch, target: HTMLElement): number {
        const rect = target.getBoundingClientRect();
        const relativeY = touch.clientY - rect.top;
        const normalizedY = relativeY / rect.height;
        
        // Consider touch radius if available
        const radius = (touch as EnhancedTouch).radiusX || 10;
        const radiusBonus = Math.min(radius / INPUT_TIMING.TOUCH_RADIUS_MAX, 0.2);
        
        // Consider pressure if available
        const pressure = (touch as EnhancedTouch).force || 0.5;
        
        // Combine factors
        let rawVelocity = (1 - normalizedY) * 0.7 + radiusBonus + pressure * 0.3;
        rawVelocity = Math.max(0, Math.min(1, rawVelocity));
        
        return this.velocityProcessor.processVelocity(rawVelocity);
    }
}