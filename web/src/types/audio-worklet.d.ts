/**
 * AudioWorklet Type Declarations
 * Provides TypeScript definitions for AudioWorkletProcessor and related APIs
 */

declare global {
    /**
     * AudioWorkletProcessor base class
     */
    abstract class AudioWorkletProcessor {
        readonly port: MessagePort;
        
        constructor();
        
        abstract process(
            inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>
        ): boolean;
        
        static get parameterDescriptors(): AudioParamDescriptor[];
    }

    /**
     * AudioParam descriptor interface
     */
    interface AudioParamDescriptor {
        name: string;
        defaultValue?: number;
        minValue?: number;
        maxValue?: number;
        automationRate?: AutomationRate;
    }

    /**
     * AudioWorklet registration function
     */
    function registerProcessor(
        name: string,
        processorConstructor: new () => AudioWorkletProcessor
    ): void;

    /**
     * Global sample rate in AudioWorklet context
     */
    const sampleRate: number;

    /**
     * Global current frame in AudioWorklet context
     */
    const currentFrame: number;

    /**
     * Global current time in AudioWorklet context
     */
    const currentTime: number;
}

export {}; // Make this a module