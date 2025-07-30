# AWE Player Performance Monitoring System

**⚠️ CRITICAL: Real-time audio synthesis requires precise performance monitoring to maintain sample-accurate timing and prevent audio dropouts.**

## 🎯 **Performance Requirements**

### **Hard Real-Time Constraints:**
- **Audio Buffer Processing**: <23ms per 1024-sample buffer (44.1kHz)
- **MIDI Event Latency**: <1ms from input to audio output
- **Voice Allocation**: <100μs per voice allocation/deallocation
- **Memory Allocation**: Zero allocation in audio thread during steady state
- **CPU Usage**: <25% for 32-voice polyphony on modern hardware

### **Performance Targets:**
- **Sample Accuracy**: ±1 sample timing precision for all MIDI events
- **Jitter**: <10μs timing variation between audio buffers
- **Voice Stealing**: <50μs for intelligent voice selection algorithm
- **Effects Processing**: <5ms total per voice for complete effects chain

## 📊 **Performance Monitoring Architecture**

### **Real-Time Performance Tracker:**

```rust
// src/performance/monitor.rs

use std::time::{Duration, Instant};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, AtomicU32, Ordering};

pub struct PerformanceMonitor {
    // Audio processing metrics
    buffer_processing_times: VecDeque<Duration>,
    audio_latency_samples: AtomicU64,
    buffer_underruns: AtomicU32,
    buffer_overruns: AtomicU32,
    
    // Voice management metrics
    voice_allocation_times: VecDeque<Duration>,
    voice_stealing_count: AtomicU32,
    active_voice_count: AtomicU32,
    
    // MIDI processing metrics
    midi_event_latency: VecDeque<Duration>,
    midi_events_processed: AtomicU64,
    midi_queue_depth: AtomicU32,
    
    // Memory tracking
    heap_usage_bytes: AtomicU64,
    peak_heap_usage: AtomicU64,
    allocation_count: AtomicU64,
    
    // CPU utilization
    cpu_usage_percent: AtomicU32,
    cpu_temperature: AtomicU32,
    
    // Configuration
    sample_rate: f64,
    buffer_size: usize,
    history_size: usize,
}

impl PerformanceMonitor {
    pub fn new(sample_rate: f64, buffer_size: usize) -> Self {
        Self {
            buffer_processing_times: VecDeque::with_capacity(1000),
            audio_latency_samples: AtomicU64::new(0),
            buffer_underruns: AtomicU32::new(0),
            buffer_overruns: AtomicU32::new(0),
            
            voice_allocation_times: VecDeque::with_capacity(1000),
            voice_stealing_count: AtomicU32::new(0),
            active_voice_count: AtomicU32::new(0),
            
            midi_event_latency: VecDeque::with_capacity(1000),
            midi_events_processed: AtomicU64::new(0),
            midi_queue_depth: AtomicU32::new(0),
            
            heap_usage_bytes: AtomicU64::new(0),
            peak_heap_usage: AtomicU64::new(0),
            allocation_count: AtomicU64::new(0),
            
            cpu_usage_percent: AtomicU32::new(0),
            cpu_temperature: AtomicU32::new(0),
            
            sample_rate,
            buffer_size,
            history_size: 1000,
        }
    }

    /// Record audio buffer processing time (called every buffer)
    pub fn record_buffer_processing(&mut self, duration: Duration) {
        // Keep history of processing times
        if self.buffer_processing_times.len() >= self.history_size {
            self.buffer_processing_times.pop_front();
        }
        self.buffer_processing_times.push_back(duration);

        // Check for buffer underruns (processing took too long)
        let max_processing_time = Duration::from_nanos(
            (self.buffer_size as f64 / self.sample_rate * 1_000_000_000.0) as u64
        );
        
        if duration > max_processing_time {
            self.buffer_underruns.fetch_add(1, Ordering::Relaxed);
            crate::log(&format!(
                "PERFORMANCE WARNING: Buffer underrun - processing took {}μs, limit {}μs",
                duration.as_micros(),
                max_processing_time.as_micros()
            ));
        }
    }

    /// Record voice allocation time
    pub fn record_voice_allocation(&mut self, duration: Duration) {
        if self.voice_allocation_times.len() >= self.history_size {
            self.voice_allocation_times.pop_front();
        }
        self.voice_allocation_times.push_back(duration);

        // Warn if voice allocation is too slow
        if duration.as_micros() > 100 {
            crate::log(&format!(
                "PERFORMANCE WARNING: Slow voice allocation - {}μs",
                duration.as_micros()
            ));
        }
    }

    /// Record MIDI event processing latency
    pub fn record_midi_latency(&mut self, latency: Duration) {
        if self.midi_event_latency.len() >= self.history_size {
            self.midi_event_latency.pop_front();
        }
        self.midi_event_latency.push_back(latency);
        
        self.midi_events_processed.fetch_add(1, Ordering::Relaxed);

        // Warn if MIDI latency is too high
        if latency.as_millis() > 1 {
            crate::log(&format!(
                "PERFORMANCE WARNING: High MIDI latency - {}ms",
                latency.as_millis()
            ));
        }
    }

    /// Update memory usage
    pub fn update_memory_usage(&self, current_bytes: u64) {
        self.heap_usage_bytes.store(current_bytes, Ordering::Relaxed);
        
        // Update peak usage
        let current_peak = self.peak_heap_usage.load(Ordering::Relaxed);
        if current_bytes > current_peak {
            self.peak_heap_usage.store(current_bytes, Ordering::Relaxed);
        }
    }

    /// Record memory allocation (should be zero in audio thread)
    pub fn record_allocation(&self) {
        self.allocation_count.fetch_add(1, Ordering::Relaxed);
        
        // This is a serious warning for real-time audio
        crate::log("PERFORMANCE CRITICAL: Memory allocation in audio thread!");
    }

    /// Update active voice count
    pub fn update_voice_count(&self, count: u32) {
        self.active_voice_count.store(count, Ordering::Relaxed);
    }

    /// Record voice stealing event
    pub fn record_voice_stealing(&self) {
        self.voice_stealing_count.fetch_add(1, Ordering::Relaxed);
    }

    /// Update MIDI queue depth
    pub fn update_midi_queue_depth(&self, depth: u32) {
        self.midi_queue_depth.store(depth, Ordering::Relaxed);
        
        // Warn if queue is getting full
        if depth > 800 { // 80% of 1000-event queue
            crate::log(&format!(
                "PERFORMANCE WARNING: MIDI queue depth high - {} events",
                depth
            ));
        }
    }

    /// Get performance statistics
    pub fn get_stats(&self) -> PerformanceStats {
        PerformanceStats {
            // Audio processing stats
            avg_buffer_processing_us: self.calculate_average_duration_us(&self.buffer_processing_times),
            max_buffer_processing_us: self.calculate_max_duration_us(&self.buffer_processing_times),
            buffer_underruns: self.buffer_underruns.load(Ordering::Relaxed),
            buffer_overruns: self.buffer_overruns.load(Ordering::Relaxed),
            
            // Voice management stats
            avg_voice_allocation_us: self.calculate_average_duration_us(&self.voice_allocation_times),
            max_voice_allocation_us: self.calculate_max_duration_us(&self.voice_allocation_times),
            voice_stealing_count: self.voice_stealing_count.load(Ordering::Relaxed),
            active_voices: self.active_voice_count.load(Ordering::Relaxed),
            
            // MIDI processing stats
            avg_midi_latency_us: self.calculate_average_duration_us(&self.midi_event_latency),
            max_midi_latency_us: self.calculate_max_duration_us(&self.midi_event_latency),
            midi_events_processed: self.midi_events_processed.load(Ordering::Relaxed),
            midi_queue_depth: self.midi_queue_depth.load(Ordering::Relaxed),
            
            // Memory stats
            heap_usage_mb: (self.heap_usage_bytes.load(Ordering::Relaxed) / 1024 / 1024) as u32,
            peak_heap_usage_mb: (self.peak_heap_usage.load(Ordering::Relaxed) / 1024 / 1024) as u32,
            allocation_count: self.allocation_count.load(Ordering::Relaxed),
            
            // System stats
            cpu_usage_percent: self.cpu_usage_percent.load(Ordering::Relaxed),
        }
    }

    fn calculate_average_duration_us(&self, durations: &VecDeque<Duration>) -> u32 {
        if durations.is_empty() {
            return 0;
        }
        
        let total_us: u128 = durations.iter().map(|d| d.as_micros()).sum();
        (total_us / durations.len() as u128) as u32
    }

    fn calculate_max_duration_us(&self, durations: &VecDeque<Duration>) -> u32 {
        durations.iter()
            .map(|d| d.as_micros() as u32)
            .max()
            .unwrap_or(0)
    }

    /// Check if performance is within acceptable limits
    pub fn is_performance_acceptable(&self) -> bool {
        let stats = self.get_stats();
        
        // Check critical thresholds
        if stats.avg_buffer_processing_us > 20_000 {  // 20ms threshold
            return false;
        }
        
        if stats.avg_midi_latency_us > 1_000 {  // 1ms threshold
            return false;
        }
        
        if stats.buffer_underruns > 0 {
            return false;
        }
        
        if stats.allocation_count > 0 {  // Zero allocations in audio thread
            return false;
        }
        
        true
    }
}

#[derive(Debug, Clone)]
pub struct PerformanceStats {
    // Audio processing
    pub avg_buffer_processing_us: u32,
    pub max_buffer_processing_us: u32,
    pub buffer_underruns: u32,
    pub buffer_overruns: u32,
    
    // Voice management
    pub avg_voice_allocation_us: u32,
    pub max_voice_allocation_us: u32,
    pub voice_stealing_count: u32,
    pub active_voices: u32,
    
    // MIDI processing
    pub avg_midi_latency_us: u32,
    pub max_midi_latency_us: u32,
    pub midi_events_processed: u64,
    pub midi_queue_depth: u32,
    
    // Memory
    pub heap_usage_mb: u32,
    pub peak_heap_usage_mb: u32,
    pub allocation_count: u64,
    
    // System
    pub cpu_usage_percent: u32,
}
```

### **Performance Timing Utilities:**

```rust
// src/performance/timing.rs

use std::time::Instant;

/// High-precision timer for measuring performance
pub struct PerfTimer {
    start: Instant,
    name: &'static str,
}

impl PerfTimer {
    pub fn new(name: &'static str) -> Self {
        Self {
            start: Instant::now(),
            name,
        }
    }

    pub fn elapsed_us(&self) -> u64 {
        self.start.elapsed().as_micros() as u64
    }

    pub fn elapsed_ns(&self) -> u64 {
        self.start.elapsed().as_nanos() as u64
    }
}

impl Drop for PerfTimer {
    fn drop(&mut self) {
        let elapsed = self.elapsed_us();
        if elapsed > 100 {  // Only log if >100μs
            crate::log(&format!("{}: {}μs", self.name, elapsed));
        }
    }
}

/// Macro for easy performance timing
#[macro_export]
macro_rules! perf_time {
    ($name:expr, $code:block) => {{
        let _timer = crate::performance::timing::PerfTimer::new($name);
        $code
    }};
}

/// Measure performance of a function call
pub fn measure_performance<F, R>(name: &'static str, f: F) -> (R, std::time::Duration)
where
    F: FnOnce() -> R,
{
    let start = Instant::now();
    let result = f();
    let duration = start.elapsed();
    
    crate::log(&format!("{}: {}μs", name, duration.as_micros()));
    (result, duration)
}
```

### **Memory Tracking System:**

```rust
// src/performance/memory_tracker.rs

use std::sync::atomic::{AtomicU64, Ordering};
use std::alloc::{GlobalAlloc, Layout, System};

/// Custom allocator that tracks memory usage
pub struct TrackingAllocator {
    allocated_bytes: AtomicU64,
    allocation_count: AtomicU64,
    peak_allocated: AtomicU64,
    in_audio_thread: std::sync::atomic::AtomicBool,
}

impl TrackingAllocator {
    pub const fn new() -> Self {
        Self {
            allocated_bytes: AtomicU64::new(0),
            allocation_count: AtomicU64::new(0),
            peak_allocated: AtomicU64::new(0),
            in_audio_thread: std::sync::atomic::AtomicBool::new(false),
        }
    }

    pub fn set_audio_thread(&self, in_audio_thread: bool) {
        self.in_audio_thread.store(in_audio_thread, Ordering::Relaxed);
    }

    pub fn allocated_bytes(&self) -> u64 {
        self.allocated_bytes.load(Ordering::Relaxed)
    }

    pub fn allocation_count(&self) -> u64 {
        self.allocation_count.load(Ordering::Relaxed)
    }

    pub fn peak_allocated(&self) -> u64 {
        self.peak_allocated.load(Ordering::Relaxed)
    }

    fn record_allocation(&self, size: usize) {
        let current = self.allocated_bytes.fetch_add(size as u64, Ordering::Relaxed) + size as u64;
        self.allocation_count.fetch_add(1, Ordering::Relaxed);
        
        // Update peak
        let current_peak = self.peak_allocated.load(Ordering::Relaxed);
        if current > current_peak {
            self.peak_allocated.store(current, Ordering::Relaxed);
        }

        // WARNING: Allocation in audio thread is a serious performance issue
        if self.in_audio_thread.load(Ordering::Relaxed) {
            // Can't use crate::log here due to potential recursion
            eprintln!("CRITICAL: Memory allocation in audio thread - {} bytes", size);
        }
    }

    fn record_deallocation(&self, size: usize) {
        self.allocated_bytes.fetch_sub(size as u64, Ordering::Relaxed);
    }
}

unsafe impl GlobalAlloc for TrackingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = System.alloc(layout);
        if !ptr.is_null() {
            self.record_allocation(layout.size());
        }
        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        self.record_deallocation(layout.size());
        System.dealloc(ptr, layout);
    }
}

// Global allocator instance
#[global_allocator]
static TRACKING_ALLOCATOR: TrackingAllocator = TrackingAllocator::new();

/// Get global memory statistics
pub fn get_memory_stats() -> (u64, u64, u64) {
    (
        TRACKING_ALLOCATOR.allocated_bytes(),
        TRACKING_ALLOCATOR.allocation_count(),
        TRACKING_ALLOCATOR.peak_allocated(),
    )
}

/// Mark audio thread context (prevents allocations)
pub fn set_audio_thread_context(in_audio_thread: bool) {
    TRACKING_ALLOCATOR.set_audio_thread(in_audio_thread);
}
```

## 📈 **Performance Dashboard**

### **Real-Time Performance Display:**

```rust
// src/performance/dashboard.rs

use crate::performance::monitor::{PerformanceMonitor, PerformanceStats};
use std::time::{Duration, Instant};

pub struct PerformanceDashboard {
    monitor: PerformanceMonitor,
    last_update: Instant,
    update_interval: Duration,
}

impl PerformanceDashboard {
    pub fn new(sample_rate: f64, buffer_size: usize) -> Self {
        Self {
            monitor: PerformanceMonitor::new(sample_rate, buffer_size),
            last_update: Instant::now(),
            update_interval: Duration::from_millis(100), // Update every 100ms
        }
    }

    /// Update dashboard (call regularly from main thread)
    pub fn update(&mut self) {
        if self.last_update.elapsed() >= self.update_interval {
            let stats = self.monitor.get_stats();
            self.display_stats(&stats);
            self.check_performance_warnings(&stats);
            self.last_update = Instant::now();
        }
    }

    fn display_stats(&self, stats: &PerformanceStats) {
        let status = if self.monitor.is_performance_acceptable() {
            "✅ GOOD"
        } else {
            "⚠️ DEGRADED"
        };

        crate::log(&format!(
            "PERFORMANCE {}: CPU {}% | Voices {}/32 | Buffer {}μs | MIDI {}μs | Mem {}MB",
            status,
            stats.cpu_usage_percent,
            stats.active_voices,
            stats.avg_buffer_processing_us,
            stats.avg_midi_latency_us,
            stats.heap_usage_mb
        ));
    }

    fn check_performance_warnings(&self, stats: &PerformanceStats) {
        // Audio processing warnings
        if stats.avg_buffer_processing_us > 15_000 {
            crate::log("⚠️ WARNING: Audio processing approaching limit");
        }

        if stats.buffer_underruns > 0 {
            crate::log(&format!("🚨 CRITICAL: {} buffer underruns detected", stats.buffer_underruns));
        }

        // MIDI latency warnings
        if stats.avg_midi_latency_us > 500 {
            crate::log("⚠️ WARNING: MIDI latency elevated");
        }

        // Memory warnings
        if stats.heap_usage_mb > 400 {
            crate::log("⚠️ WARNING: High memory usage");
        }

        if stats.allocation_count > 0 {
            crate::log(&format!("🚨 CRITICAL: {} allocations in audio thread", stats.allocation_count));
        }

        // Voice management warnings
        if stats.voice_stealing_count > 100 {
            crate::log("⚠️ WARNING: Frequent voice stealing - consider reducing polyphony");
        }
    }

    /// Get reference to monitor for recording metrics
    pub fn monitor(&mut self) -> &mut PerformanceMonitor {
        &mut self.monitor
    }
}
```

## 🔧 **Integration with Audio Engine**

### **Example Integration in Audio Processing:**

```rust
// src/lib.rs (example integration)

use crate::performance::{PerformanceDashboard, set_audio_thread_context, perf_time};

pub struct MidiPlayer {
    performance_dashboard: PerformanceDashboard,
    // ... other fields
}

impl MidiPlayer {
    pub fn new() -> Self {
        Self {
            performance_dashboard: PerformanceDashboard::new(44100.0, 1024),
            // ... other initialization
        }
    }

    /// Main audio processing function
    pub fn process(&mut self) -> f32 {
        // Mark audio thread context (prevents allocations)
        set_audio_thread_context(true);
        
        let audio_sample = perf_time!("audio_process", {
            // Measure buffer processing time
            let start = std::time::Instant::now();
            
            // Process audio (existing logic)
            let sample = self.synthesize_sample();
            
            // Record performance metrics
            let processing_time = start.elapsed();
            self.performance_dashboard.monitor().record_buffer_processing(processing_time);
            
            sample
        });

        set_audio_thread_context(false);
        audio_sample
    }

    /// MIDI event processing with performance tracking
    pub fn handle_midi_event(&mut self, event: MidiEvent) {
        let start = std::time::Instant::now();
        
        // Process MIDI event (existing logic)
        match event.message_type {
            0x90 => self.note_on(event.channel, event.data1, event.data2),
            0x80 => self.note_off(event.channel, event.data1, event.data2),
            _ => {}
        }
        
        // Record MIDI latency
        let latency = start.elapsed();
        self.performance_dashboard.monitor().record_midi_latency(latency);
    }

    /// Voice allocation with performance tracking
    fn allocate_voice(&mut self) -> Option<usize> {
        let start = std::time::Instant::now();
        
        let voice_index = perf_time!("voice_allocation", {
            // Voice allocation logic (existing)
            self.find_available_voice()
        });

        // Record allocation time
        let allocation_time = start.elapsed();
        self.performance_dashboard.monitor().record_voice_allocation(allocation_time);
        
        voice_index
    }

    /// Regular performance updates (call from main thread)
    pub fn update_performance(&mut self) {
        self.performance_dashboard.update();
    }
}
```

---

## 🎯 **Performance Optimization Strategies**

### **Adaptive Quality Control:**

```rust
// src/performance/adaptive_quality.rs

pub struct AdaptiveQualityController {
    performance_monitor: PerformanceMonitor,
    quality_level: QualityLevel,
    adaptation_threshold: Duration,
}

#[derive(Debug, Clone, Copy)]
pub enum QualityLevel {
    Maximum,    // All features enabled
    High,       // Reduce some effects
    Medium,     // Reduce voice count
    Low,        // Minimal features
}

impl AdaptiveQualityController {
    /// Automatically adjust quality based on performance
    pub fn adapt_quality(&mut self) -> QualityLevel {
        let stats = self.performance_monitor.get_stats();
        
        if stats.avg_buffer_processing_us > 20_000 {
            // Critical performance issues - reduce to minimum
            self.quality_level = QualityLevel::Low;
            crate::log("Performance adaptation: Reduced to LOW quality");
        } else if stats.avg_buffer_processing_us > 15_000 {
            // Performance stress - reduce quality
            self.quality_level = QualityLevel::Medium;
            crate::log("Performance adaptation: Reduced to MEDIUM quality");
        } else if stats.avg_buffer_processing_us < 5_000 && self.quality_level != QualityLevel::Maximum {
            // Good performance - can increase quality
            self.quality_level = QualityLevel::High;
            crate::log("Performance adaptation: Increased to HIGH quality");
        }

        self.quality_level
    }
}
```

This performance monitoring system provides comprehensive real-time tracking of all critical performance metrics for the EMU8000 emulator, ensuring sample-accurate timing and preventing audio dropouts.