# AWE Player Developer Guide

## Overview

This guide provides comprehensive information for developers working with AWE Player, including API documentation, integration examples, and development best practices.

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────┐
│                 Web Interface                   │
│            (HTML5 + JavaScript)                │
├─────────────────────────────────────────────────┤
│                  WASM Layer                     │
│              (Rust + wasm-pack)                 │
├─────────────────────────────────────────────────┤
│               EMU8000 Engine                    │
│         ┌─────────┬─────────┬─────────┐         │
│         │  MIDI   │ SoundF  │ Synth   │         │
│         │ System  │ Engine  │ Engine  │         │
│         └─────────┴─────────┴─────────┘         │
├─────────────────────────────────────────────────┤
│              Audio Processing                   │
│           (WebAudio + AudioWorklet)             │
└─────────────────────────────────────────────────┘
```

### Core Technologies

- **Rust**: Core synthesis engine and MIDI processing
- **WebAssembly**: High-performance audio processing
- **Web Audio API**: Audio context and routing
- **AudioWorklet**: Real-time audio processing
- **WebMIDI API**: MIDI device integration
- **TypeScript**: Type-safe JavaScript interfaces

## 🚀 Getting Started

### Development Setup

#### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install Node.js dependencies
cd web && npm install
```

#### Build Commands
```bash
# Development build (debug symbols)
wasm-pack build --target web --dev

# Production build (optimized)
wasm-pack build --target web --release

# Build with specific features
wasm-pack build --target web --features "debug,profiling"

# Serve for development
cd web && npx serve . -p 3000
```

### Project Structure

```
awe-synth/
├── src/                    # Rust source code
│   ├── lib.rs             # Main WASM interface
│   ├── midi/              # MIDI processing
│   ├── soundfont/         # SoundFont parsing
│   ├── synth/             # Synthesis engine
│   └── effects/           # Audio effects
├── web/                   # Web interface
│   ├── index.html         # Main HTML page
│   ├── js/                # JavaScript modules
│   ├── css/               # Stylesheets
│   └── assets/            # Static assets
├── tests/                 # Test suite
├── docs/                  # Documentation
└── pkg/                   # WASM build output
```

## 🎹 Core API Reference

### AWEPlayer Class

The main interface for interacting with the AWE Player engine.

```typescript
class AWEPlayer {
    constructor(audioContext: AudioContext);
    
    // Initialization
    async init(): Promise<void>;
    static async create(audioContext?: AudioContext): Promise<AWEPlayer>;
    
    // SoundFont management
    async loadSoundFont(data: ArrayBuffer): Promise<void>;
    unloadSoundFont(): void;
    getSoundFontInfo(): SoundFontInfo | null;
    
    // MIDI file operations
    async loadMidiFile(data: ArrayBuffer): Promise<void>;
    play(): void;
    pause(): void;
    stop(): void;
    seek(positionMs: number): void;
    
    // Real-time MIDI
    sendMidiMessage(message: Uint8Array): void;
    noteOn(channel: number, note: number, velocity: number): void;
    noteOff(channel: number, note: number): void;
    programChange(channel: number, program: number): void;
    controlChange(channel: number, controller: number, value: number): void;
    
    // Audio routing
    connect(destination: AudioNode): void;
    disconnect(): void;
    
    // Configuration
    setMasterVolume(volume: number): void;
    setReverbSend(level: number): void;
    setChorusSend(level: number): void;
    
    // State queries
    isPlaying(): boolean;
    getCurrentPosition(): number;
    getDuration(): number;
    getActiveVoices(): number;
    
    // Resource management
    destroy(): void;
}
```

### SoundFont Interface

```typescript
interface SoundFontInfo {
    name: string;
    version: string;
    instruments: InstrumentInfo[];
    samples: SampleInfo[];
    presets: PresetInfo[];
    fileSize: number;
    memoryUsage: number;
}

interface InstrumentInfo {
    id: number;
    name: string;
    bank: number;
    program: number;
    sampleCount: number;
}

interface PresetInfo {
    bank: number;
    program: number;
    name: string;
    instrumentId: number;
}
```

### MIDI Interface

```typescript
interface MidiFileInfo {
    name: string;
    duration: number;
    trackCount: number;
    ticksPerQuarter: number;
    tempo: number;
    timeSignature: [number, number];
}

interface MidiEvent {
    timestamp: number;
    channel: number;
    type: 'note_on' | 'note_off' | 'program_change' | 'control_change';
    data: number[];
}
```

### Audio Configuration

```typescript
interface AudioConfig {
    sampleRate: number;          // 44100, 48000, etc.
    bufferSize: number;          // 128, 256, 512, 1024
    polyphony: number;           // Max 32 (EMU8000 limit)
    reverbEnabled: boolean;
    chorusEnabled: boolean;
    filterEnabled: boolean;
}

interface PerformanceMetrics {
    cpuUsage: number;            // 0.0 - 1.0
    memoryUsage: number;         // Bytes
    activeVoices: number;        // 0 - 32
    audioLatency: number;        // Milliseconds
    renderTime: number;          // Microseconds per buffer
}
```

## 🔧 Integration Examples

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>AWE Player Integration</title>
</head>
<body>
    <button id="load-soundfont">Load SoundFont</button>
    <button id="play-note">Play Note</button>
    <input type="file" id="soundfont-input" accept=".sf2" style="display:none">
    
    <script type="module">
        import init, { AWEPlayer } from './awe_synth.js';
        
        let player;
        
        async function initialize() {
            // Initialize WASM module
            await init();
            
            // Create audio context
            const audioContext = new AudioContext();
            
            // Create AWE Player instance
            player = await AWEPlayer.create(audioContext);
            
            // Connect to audio output
            player.connect(audioContext.destination);
            
            console.log('AWE Player initialized');
        }
        
        async function loadSoundFont(file) {
            const arrayBuffer = await file.arrayBuffer();
            await player.loadSoundFont(arrayBuffer);
            
            const info = player.getSoundFontInfo();
            console.log(`Loaded: ${info.name} (${info.instruments.length} instruments)`);
        }
        
        function playNote() {
            // Play middle C with velocity 100
            player.noteOn(0, 60, 100);
            
            // Release after 1 second
            setTimeout(() => {
                player.noteOff(0, 60);
            }, 1000);
        }
        
        // Event listeners
        document.getElementById('load-soundfont').onclick = () => {
            document.getElementById('soundfont-input').click();
        };
        
        document.getElementById('soundfont-input').onchange = (e) => {
            if (e.target.files[0]) {
                loadSoundFont(e.target.files[0]);
            }
        };
        
        document.getElementById('play-note').onclick = playNote;
        
        // Initialize when page loads
        initialize();
    </script>
</body>
</html>
```

### Advanced Integration with MIDI

```typescript
class MIDIAWEIntegration {
    private player: AWEPlayer;
    private midiAccess: MIDIAccess | null = null;
    
    constructor(player: AWEPlayer) {
        this.player = player;
    }
    
    async initializeMIDI(): Promise<void> {
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            
            // Listen for MIDI device changes
            this.midiAccess.onstatechange = this.onMIDIStateChange.bind(this);
            
            // Set up initial devices
            this.setupMIDIDevices();
            
        } catch (error) {
            console.warn('MIDI not available:', error);
        }
    }
    
    private setupMIDIDevices(): void {
        if (!this.midiAccess) return;
        
        // Set up input devices
        for (const input of this.midiAccess.inputs.values()) {
            input.onmidimessage = this.onMIDIMessage.bind(this);
            console.log(`Connected MIDI input: ${input.name}`);
        }
    }
    
    private onMIDIMessage(event: MIDIMessageEvent): void {
        const [status, data1, data2] = event.data;
        const channel = status & 0x0F;
        const messageType = status & 0xF0;
        
        switch (messageType) {
            case 0x90: // Note On
                if (data2 > 0) {
                    this.player.noteOn(channel, data1, data2);
                } else {
                    this.player.noteOff(channel, data1);
                }
                break;
                
            case 0x80: // Note Off
                this.player.noteOff(channel, data1);
                break;
                
            case 0xC0: // Program Change
                this.player.programChange(channel, data1);
                break;
                
            case 0xB0: // Control Change
                this.player.controlChange(channel, data1, data2);
                break;
        }
    }
    
    private onMIDIStateChange(event: MIDIConnectionEvent): void {
        if (event.port.type === 'input') {
            if (event.port.state === 'connected') {
                event.port.onmidimessage = this.onMIDIMessage.bind(this);
                console.log(`MIDI device connected: ${event.port.name}`);
            } else {
                console.log(`MIDI device disconnected: ${event.port.name}`);
            }
        }
    }
}
```

### Custom Audio Processing

```typescript
class CustomAudioProcessor extends AudioWorkletProcessor {
    private player: AWEPlayer;
    private sampleRate: number;
    
    constructor() {
        super();
        this.sampleRate = sampleRate || 44100;
    }
    
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
        const output = outputs[0];
        const outputChannelData = output[0];
        
        if (this.player) {
            // Get audio from AWE Player
            const audioData = this.player.renderAudio(outputChannelData.length);
            
            // Copy to output buffer
            for (let i = 0; i < outputChannelData.length; i++) {
                outputChannelData[i] = audioData[i];
            }
            
            // Apply custom processing
            this.applyCustomEffects(outputChannelData);
        }
        
        return true;
    }
    
    private applyCustomEffects(buffer: Float32Array): void {
        // Example: Simple distortion
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.tanh(buffer[i] * 2.0) * 0.5;
        }
    }
}

// Register the processor
registerProcessor('custom-awe-processor', CustomAudioProcessor);
```

## 🎛️ Configuration Options

### Build-time Configuration

```toml
# Cargo.toml
[features]
default = ["web"]
web = ["wasm-bindgen", "web-sys"]
debug = ["console_error_panic_hook"]
profiling = ["web-sys/Performance"]
simd = ["packed_simd"]
threads = ["wasm-bindgen-rayon"]

[dependencies]
wasm-bindgen = { version = "0.2", features = ["serde-serialize"] }
web-sys = { version = "0.3", features = [
    "AudioContext",
    "AudioWorkletNode",
    "MidiAccess",
    "Performance"
]}
```

### Runtime Configuration

```typescript
const config: AudioConfig = {
    sampleRate: 44100,
    bufferSize: 512,
    polyphony: 32,
    reverbEnabled: true,
    chorusEnabled: true,
    filterEnabled: true
};

await player.configure(config);
```

### Environment Variables

```javascript
// Deployment configuration
const deploymentConfig = {
    WASM_OPTIMIZATION: process.env.NODE_ENV === 'production' ? 'size' : 'debug',
    ENABLE_PROFILING: process.env.ENABLE_PROFILING === 'true',
    MAX_POLYPHONY: parseInt(process.env.MAX_POLYPHONY) || 32,
    AUDIO_BUFFER_SIZE: parseInt(process.env.AUDIO_BUFFER_SIZE) || 512
};
```

## 🧪 Testing and Debugging

### Unit Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_midi_note_on() {
        let mut player = AWEPlayer::new();
        player.note_on(0, 60, 100);
        
        assert_eq!(player.get_active_voices(), 1);
    }
    
    #[test]
    fn test_soundfont_loading() {
        let mut player = AWEPlayer::new();
        let sf_data = load_test_soundfont();
        
        let result = player.load_soundfont(&sf_data);
        assert!(result.is_ok());
    }
}
```

### Integration Testing

```typescript
describe('AWE Player Integration', () => {
    let player: AWEPlayer;
    let audioContext: AudioContext;
    
    beforeEach(async () => {
        audioContext = new AudioContext();
        player = await AWEPlayer.create(audioContext);
    });
    
    afterEach(() => {
        player.destroy();
        audioContext.close();
    });
    
    test('should load SoundFont', async () => {
        const sfData = await loadTestSoundFont();
        await player.loadSoundFont(sfData);
        
        const info = player.getSoundFontInfo();
        expect(info).toBeTruthy();
        expect(info.instruments.length).toBeGreaterThan(0);
    });
    
    test('should play MIDI notes', () => {
        player.noteOn(0, 60, 100);
        expect(player.getActiveVoices()).toBe(1);
        
        player.noteOff(0, 60);
        expect(player.getActiveVoices()).toBe(0);
    });
});
```

### Performance Testing

```typescript
class PerformanceTester {
    private player: AWEPlayer;
    private metrics: PerformanceMetrics[] = [];
    
    constructor(player: AWEPlayer) {
        this.player = player;
    }
    
    async runLatencyTest(): Promise<number> {
        const iterations = 100;
        const latencies: number[] = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            this.player.noteOn(0, 60, 100);
            const end = performance.now();
            
            latencies.push(end - start);
            
            this.player.noteOff(0, 60);
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return latencies.reduce((a, b) => a + b) / latencies.length;
    }
    
    async runPolyphonyTest(): Promise<number> {
        let maxVoices = 0;
        
        // Play notes until we hit the limit
        for (let i = 0; i < 64; i++) {
            this.player.noteOn(0, 60 + (i % 12), 100);
            const voices = this.player.getActiveVoices();
            maxVoices = Math.max(maxVoices, voices);
            
            if (voices < i + 1) {
                // Hit voice limit
                break;
            }
        }
        
        // Clean up
        for (let i = 0; i < 64; i++) {
            this.player.noteOff(0, 60 + (i % 12));
        }
        
        return maxVoices;
    }
    
    collectMetrics(): PerformanceMetrics {
        return this.player.getPerformanceMetrics();
    }
}
```

### Debug Tools

```typescript
class AWEDebugger {
    private player: AWEPlayer;
    private debugPanel: HTMLElement;
    
    constructor(player: AWEPlayer) {
        this.player = player;
        this.createDebugPanel();
        this.startMetricsCollection();
    }
    
    private createDebugPanel(): void {
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            font-family: monospace;
            z-index: 9999;
        `;
        document.body.appendChild(this.debugPanel);
    }
    
    private startMetricsCollection(): void {
        setInterval(() => {
            const metrics = this.player.getPerformanceMetrics();
            this.updateDebugPanel(metrics);
        }, 100);
    }
    
    private updateDebugPanel(metrics: PerformanceMetrics): void {
        this.debugPanel.innerHTML = `
            <div>CPU: ${(metrics.cpuUsage * 100).toFixed(1)}%</div>
            <div>Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB</div>
            <div>Voices: ${metrics.activeVoices}/32</div>
            <div>Latency: ${metrics.audioLatency.toFixed(1)} ms</div>
            <div>Render: ${metrics.renderTime.toFixed(0)} μs</div>
        `;
    }
}
```

## 🔒 Security Considerations

### Content Security Policy

```http
Content-Security-Policy: 
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    worker-src 'self' blob:;
    connect-src 'self' https:;
    img-src 'self' data: blob:;
```

### Input Validation

```rust
pub fn load_soundfont(&mut self, data: &[u8]) -> Result<(), Error> {
    // Validate file size
    if data.len() > MAX_SOUNDFONT_SIZE {
        return Err(Error::FileTooLarge);
    }
    
    // Validate RIFF header
    if data.len() < 12 || &data[0..4] != b"RIFF" {
        return Err(Error::InvalidFormat);
    }
    
    // Validate soundfont signature
    if &data[8..12] != b"sfbk" {
        return Err(Error::InvalidFormat);
    }
    
    // Parse and validate structure
    self.parse_soundfont(data)
}
```

### Memory Safety

```rust
// Use safe indexing and bounds checking
fn read_sample(&self, index: usize) -> Option<f32> {
    self.samples.get(index).copied()
}

// Validate all user inputs
fn note_on(&mut self, channel: u8, note: u8, velocity: u8) -> Result<(), Error> {
    if channel >= 16 {
        return Err(Error::InvalidChannel);
    }
    if note > 127 {
        return Err(Error::InvalidNote);
    }
    if velocity > 127 {
        return Err(Error::InvalidVelocity);
    }
    
    self.voice_manager.allocate_voice(channel, note, velocity)
}
```

## 🚀 Performance Optimization

### WASM Optimization

```bash
# Size optimization
wasm-pack build --release -- --features size_opt

# Speed optimization
wasm-pack build --release -- --features speed_opt

# Custom optimization flags
RUSTFLAGS="-C target-cpu=native" wasm-pack build --release
```

### Memory Management

```rust
// Pre-allocate buffers
pub struct AudioBuffer {
    left: Vec<f32>,
    right: Vec<f32>,
}

impl AudioBuffer {
    pub fn new(size: usize) -> Self {
        Self {
            left: vec![0.0; size],
            right: vec![0.0; size],
        }
    }
    
    pub fn clear(&mut self) {
        self.left.fill(0.0);
        self.right.fill(0.0);
    }
}

// Object pooling for voices
pub struct VoicePool {
    available: Vec<Voice>,
    active: Vec<Voice>,
}

impl VoicePool {
    pub fn allocate(&mut self) -> Option<Voice> {
        self.available.pop()
    }
    
    pub fn deallocate(&mut self, voice: Voice) {
        voice.reset();
        self.available.push(voice);
    }
}
```

### JavaScript Optimization

```typescript
// Minimize garbage collection
class AudioRenderer {
    private audioBuffer: Float32Array;
    private tempBuffer: Float32Array;
    
    constructor(bufferSize: number) {
        // Pre-allocate buffers
        this.audioBuffer = new Float32Array(bufferSize);
        this.tempBuffer = new Float32Array(bufferSize);
    }
    
    render(): Float32Array {
        // Reuse existing buffers
        this.audioBuffer.fill(0);
        
        // Process audio
        this.player.fillBuffer(this.audioBuffer);
        
        return this.audioBuffer;
    }
}

// Use efficient data structures
const activeNotes = new Map<number, Voice>();
const pendingEvents = new Array<MidiEvent>(1000); // Pre-sized
```

## 📊 Monitoring and Analytics

### Performance Monitoring

```typescript
class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    
    recordMetric(name: string, value: number): void {
        const values = this.metrics.get(name) || [];
        values.push(value);
        
        // Keep last 100 samples
        if (values.length > 100) {
            values.shift();
        }
        
        this.metrics.set(name, values);
    }
    
    getAverage(name: string): number {
        const values = this.metrics.get(name) || [];
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    getPercentile(name: string, percentile: number): number {
        const values = [...(this.metrics.get(name) || [])].sort();
        const index = Math.floor(values.length * percentile / 100);
        return values[index] || 0;
    }
}

// Usage
const monitor = new PerformanceMonitor();

setInterval(() => {
    const metrics = player.getPerformanceMetrics();
    monitor.recordMetric('cpu_usage', metrics.cpuUsage);
    monitor.recordMetric('memory_usage', metrics.memoryUsage);
    monitor.recordMetric('audio_latency', metrics.audioLatency);
}, 1000);
```

### Error Tracking

```typescript
class ErrorTracker {
    private errors: Array<{
        timestamp: number;
        type: string;
        message: string;
        stack?: string;
    }> = [];
    
    trackError(error: Error, context?: string): void {
        this.errors.push({
            timestamp: Date.now(),
            type: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Send to monitoring service
        this.reportError(error, context);
    }
    
    private reportError(error: Error, context?: string): void {
        // Integration with error tracking service
        console.error('AWE Player Error:', {
            error: error.message,
            context,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        });
    }
}

// Global error handling
window.addEventListener('error', (event) => {
    errorTracker.trackError(event.error, 'Global');
});

window.addEventListener('unhandledrejection', (event) => {
    errorTracker.trackError(event.reason, 'Promise');
});
```

## 📚 API Reference

### Complete Type Definitions

```typescript
// Available in awe_synth.d.ts
declare module 'awe-synth' {
    export function init(): Promise<void>;
    
    export class AWEPlayer {
        constructor(audioContext: AudioContext);
        static create(audioContext?: AudioContext): Promise<AWEPlayer>;
        
        // Core methods
        init(): Promise<void>;
        destroy(): void;
        
        // SoundFont operations
        loadSoundFont(data: ArrayBuffer): Promise<void>;
        unloadSoundFont(): void;
        getSoundFontInfo(): SoundFontInfo | null;
        
        // MIDI file operations
        loadMidiFile(data: ArrayBuffer): Promise<void>;
        play(): void;
        pause(): void;
        stop(): void;
        seek(positionMs: number): void;
        setLoop(enabled: boolean): void;
        
        // Real-time MIDI
        sendMidiMessage(message: Uint8Array): void;
        noteOn(channel: number, note: number, velocity: number): void;
        noteOff(channel: number, note: number): void;
        programChange(channel: number, program: number): void;
        controlChange(channel: number, controller: number, value: number): void;
        pitchBend(channel: number, value: number): void;
        allNotesOff(channel?: number): void;
        resetAllControllers(channel?: number): void;
        
        // Audio configuration
        setMasterVolume(volume: number): void;
        getMasterVolume(): number;
        setReverbSend(level: number): void;
        getReverbSend(): number;
        setChorusSend(level: number): void;
        getChorusSend(): number;
        setFilterCutoff(frequency: number): void;
        getFilterCutoff(): number;
        setFilterResonance(resonance: number): void;
        getFilterResonance(): number;
        
        // Audio routing
        connect(destination: AudioNode): void;
        disconnect(): void;
        
        // State queries
        isPlaying(): boolean;
        getCurrentPosition(): number;
        getDuration(): number;
        getActiveVoices(): number;
        getMaxPolyphony(): number;
        
        // Performance monitoring
        getPerformanceMetrics(): PerformanceMetrics;
        getCpuUsage(): number;
        getMemoryUsage(): number;
        getAudioLatency(): number;
        
        // Configuration
        configure(config: AudioConfig): void;
        getConfiguration(): AudioConfig;
        
        // Events
        addEventListener(type: string, listener: EventListener): void;
        removeEventListener(type: string, listener: EventListener): void;
    }
    
    // Interfaces
    export interface SoundFontInfo {
        name: string;
        version: string;
        instruments: InstrumentInfo[];
        samples: SampleInfo[];
        presets: PresetInfo[];
        fileSize: number;
        memoryUsage: number;
        loadTime: number;
    }
    
    export interface InstrumentInfo {
        id: number;
        name: string;
        bank: number;
        program: number;
        sampleCount: number;
        keyRange: [number, number];
        velocityRange: [number, number];
    }
    
    export interface SampleInfo {
        id: number;
        name: string;
        sampleRate: number;
        length: number;
        loopStart: number;
        loopEnd: number;
        rootKey: number;
    }
    
    export interface PresetInfo {
        bank: number;
        program: number;
        name: string;
        instrumentIds: number[];
    }
    
    export interface MidiFileInfo {
        name: string;
        duration: number;
        trackCount: number;
        eventCount: number;
        ticksPerQuarter: number;
        tempo: number;
        timeSignature: [number, number];
        keySignature: number;
    }
    
    export interface AudioConfig {
        sampleRate: number;
        bufferSize: number;
        polyphony: number;
        reverbEnabled: boolean;
        chorusEnabled: boolean;
        filterEnabled: boolean;
        interpolation: 'linear' | 'cubic';
        oversampling: number;
    }
    
    export interface PerformanceMetrics {
        cpuUsage: number;
        memoryUsage: number;
        activeVoices: number;
        audioLatency: number;
        renderTime: number;
        bufferUnderruns: number;
        sampleRate: number;
        bufferSize: number;
    }
    
    // Events
    export interface AWEPlayerEvent extends Event {
        detail: any;
    }
    
    // Error types
    export class AWEPlayerError extends Error {
        constructor(message: string, code?: string);
        code?: string;
    }
    
    export class SoundFontError extends AWEPlayerError {}
    export class MidiError extends AWEPlayerError {}
    export class AudioError extends AWEPlayerError {}
}
```

---

This developer guide provides comprehensive information for integrating and extending AWE Player. For additional technical details, see the API documentation and source code examples.

**Happy coding!** 🎵

*Last Updated: August 2025 | Version 1.0 | Developer Guide v1.0*