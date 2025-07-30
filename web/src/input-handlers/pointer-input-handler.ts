/**
 * Pointer Input Handler - Pressure-sensitive stylus/pen support
 * Part of AWE Player EMU8000 Emulator
 */

import { BaseInputHandler, InputHandlerOptions } from './base-input-handler.js';

export class PointerInputHandler extends BaseInputHandler {
    private keyboardElement: Element | null = null;
    
    constructor(options: InputHandlerOptions) {
        super(options);
    }
    
    public initialize(): void {
        // Check if PointerEvent is supported
        if (!window.PointerEvent) {
            this.log('PointerEvent not supported in this browser');
            this.enabled = false;
            return;
        }
        
        this.keyboardElement = document.querySelector('.virtual-keyboard');
        if (!this.keyboardElement) {
            this.log('Virtual keyboard element not found');
            return;
        }
        
        this.setupPointerListeners();
        this.log('Pointer input handler initialized');
    }
    
    public cleanup(): void {
        if (this.keyboardElement) {
            this.keyboardElement.removeEventListener('pointerdown', this.handlePointerDown);
            this.keyboardElement.removeEventListener('pointerup', this.handlePointerUp);
            this.keyboardElement.removeEventListener('pointerleave', this.handlePointerLeave);
        }
    }
    
    public getType(): string {
        return 'Pointer Input';
    }
    
    private setupPointerListeners(): void {
        if (!this.keyboardElement) return;
        
        this.keyboardElement.addEventListener('pointerdown', this.handlePointerDown);
        this.keyboardElement.addEventListener('pointerup', this.handlePointerUp);
        this.keyboardElement.addEventListener('pointerleave', this.handlePointerLeave);
    }
    
    private handlePointerDown = ((e: PointerEvent) => {
        if (!this.enabled) return;
        
        const target = e.target as HTMLElement;
        if (!target.classList.contains('piano-key')) return;
        
        const note = parseInt(target.dataset.note || '0');
        const velocity = this.calculatePointerVelocity(e);
        
        this.keyboard.handleKeyPress(note, e as unknown as MouseEvent);
        this.log(`Pointer down: Note ${note}, velocity ${velocity}, pressure: ${e.pressure}`);
    }) as EventListener;
    
    private handlePointerUp = ((e: PointerEvent) => {
        if (!this.enabled) return;
        
        const target = e.target as HTMLElement;
        if (!target.classList.contains('piano-key')) return;
        
        const note = parseInt(target.dataset.note || '0');
        this.keyboard.handleKeyRelease(note);
        this.log(`Pointer up: Note ${note}`);
    }) as EventListener;
    
    private handlePointerLeave = ((e: PointerEvent) => {
        if (!this.enabled) return;
        
        const target = e.target as HTMLElement;
        if (!target.classList.contains('piano-key')) return;
        
        const note = parseInt(target.dataset.note || '0');
        this.keyboard.handleKeyRelease(note);
        this.log(`Pointer leave: Note ${note}`);
    }) as EventListener;
    
    /**
     * Calculate velocity from pointer event (includes pressure)
     */
    private calculatePointerVelocity(event: PointerEvent): number {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const relativeY = event.clientY - rect.top;
        const normalizedY = relativeY / rect.height;
        
        // Use actual pressure if available, otherwise estimate from Y position
        const pressure = event.pressure || (1 - normalizedY);
        
        return this.velocityProcessor.processVelocity(pressure);
    }
}