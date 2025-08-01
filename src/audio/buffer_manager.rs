/**
 * AWE Player - Audio Buffer Manager (Rust Implementation)
 * Part of AWE Player EMU8000 Emulator
 * 
 * Intelligent buffer management for Web Audio API
 * Optimizes latency, handles different buffer sizes, and manages performance
 * 
 * This is the Rust implementation of buffer management logic that was
 * previously in TypeScript, providing better performance and centralization.
 */

use std::collections::VecDeque;
use serde::{Deserialize, Serialize};

/// Buffer size configuration options
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BufferConfig {
    pub size: BufferSize,
    pub latency_ms: f32,
    pub cpu_usage: CpuUsage,
    pub stability: Stability,
}

/// Supported buffer sizes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BufferSize {
    Small = 128,
    Medium = 256,
    Large = 512,
}

impl BufferSize {
    pub fn as_usize(self) -> usize {
        self as usize
    }
    
    pub fn as_u32(self) -> u32 {
        self as u32
    }
    
    pub fn from_usize(size: usize) -> Option<Self> {
        match size {
            128 => Some(BufferSize::Small),
            256 => Some(BufferSize::Medium),
            512 => Some(BufferSize::Large),
            _ => None,
        }
    }
}

/// CPU usage levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CpuUsage {
    Low,
    Medium,
    High,
}

/// Stability levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stability {
    Stable,
    Moderate,
    Unstable,
}

/// Buffer performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BufferMetrics {
    pub average_processing_time: f32,
    pub max_processing_time: f32,
    pub underruns: u32,
    pub overruns: u32,
    pub samples_processed: u64,
    pub uptime_ms: f32,
}

/// Device capability information for buffer optimization
#[derive(Debug, Clone)]
pub struct DeviceInfo {
    pub hardware_concurrency: u32,
    pub device_memory_gb: u32,
}

/// Audio Buffer Manager - handles optimal buffer sizing and performance monitoring
pub struct AudioBufferManager {
    current_buffer_size: BufferSize,
    sample_rate: f32,
    metrics: BufferMetrics,
    performance_history: VecDeque<f32>,
    underrun_count: u32,
    overrun_count: u32,
    start_time_ms: f32,
    samples_processed: u64,
    adaptive_mode: bool,
    last_adaptation_ms: f32,
    min_time_between_adaptations_ms: f32,
    max_performance_history: usize,
    device_info: Option<DeviceInfo>,
}

impl AudioBufferManager {
    /// Create a new AudioBufferManager with optional initial buffer size
    pub fn new(initial_buffer_size: Option<BufferSize>) -> Self {
        let mut manager = Self {
            current_buffer_size: BufferSize::Small, // Will be overridden
            sample_rate: 44100.0,
            metrics: BufferMetrics::default(),
            performance_history: VecDeque::with_capacity(100),
            underrun_count: 0,
            overrun_count: 0,
            start_time_ms: Self::get_current_time_ms(),
            samples_processed: 0,
            adaptive_mode: true,
            last_adaptation_ms: 0.0,
            min_time_between_adaptations_ms: 5000.0, // 5 seconds
            max_performance_history: 100,
            device_info: None,
        };
        
        manager.current_buffer_size = initial_buffer_size
            .unwrap_or_else(|| manager.detect_optimal_buffer_size());
            
        crate::log(&format!("📊 Buffer manager initialized: {} samples", 
            manager.current_buffer_size.as_usize()));
        
        manager
    }
    
    /// Set device information for better buffer size detection
    pub fn set_device_info(&mut self, hardware_concurrency: u32, device_memory_gb: u32) {
        self.device_info = Some(DeviceInfo {
            hardware_concurrency,
            device_memory_gb,
        });
        
        crate::log(&format!("🔧 Device info set: {}cores, {}GB RAM", 
            hardware_concurrency, device_memory_gb));
        
        // Recalculate optimal buffer size with new device info
        if self.adaptive_mode {
            let optimal = self.detect_optimal_buffer_size();
            if optimal != self.current_buffer_size {
                crate::log(&format!("🔄 Device info suggests buffer size: {:?}", optimal));
            }
        }
    }
    
    /// Set sample rate for buffer calculations
    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
        crate::log(&format!("🔧 Sample rate set to {}Hz", sample_rate));
        
        // Recalculate optimal buffer size for new sample rate
        if self.adaptive_mode {
            let optimal = self.calculate_optimal_buffer_size();
            if optimal != self.current_buffer_size {
                crate::log(&format!("🔄 Sample rate change suggests buffer size: {:?}", optimal));
            }
        }
    }
    
    /// Get current buffer configuration
    pub fn get_current_config(&self) -> BufferConfig {
        Self::get_buffer_config(self.current_buffer_size, self.sample_rate)
    }
    
    /// Get current buffer size
    pub fn get_current_buffer_size(&self) -> BufferSize {
        self.current_buffer_size
    }
    
    /// Set buffer size manually (disables adaptive mode temporarily)
    pub fn set_buffer_size(&mut self, size: BufferSize) {
        if size != self.current_buffer_size {
            let old_size = self.current_buffer_size;
            self.current_buffer_size = size;
            self.adaptive_mode = false; // User override
            
            let config = self.get_current_config();
            crate::log(&format!("🔧 Buffer size changed: {:?} → {:?} (adaptive disabled)", 
                old_size, size));
            crate::log(&format!("📊 New config: {:.1}ms latency, {:?} CPU", 
                config.latency_ms, config.cpu_usage));
        }
    }
    
    /// Enable or disable adaptive buffer sizing
    pub fn set_adaptive_mode(&mut self, enabled: bool) {
        self.adaptive_mode = enabled;
        crate::log(&format!("🤖 Adaptive mode: {}", 
            if enabled { "ENABLED" } else { "DISABLED" }));
        
        if enabled {
            self.last_adaptation_ms = 0.0; // Allow immediate adaptation
        }
    }
    
    /// Record processing time for a buffer
    pub fn record_processing_time(&mut self, processing_time_ms: f32, buffer_size: usize) {
        self.samples_processed += buffer_size as u64;
        
        // Add to performance history (keep last N measurements)
        self.performance_history.push_back(processing_time_ms);
        if self.performance_history.len() > self.max_performance_history {
            self.performance_history.pop_front();
        }
        
        // Check for underruns (processing took longer than available time)
        let available_time_ms = (buffer_size as f32 / self.sample_rate) * 1000.0;
        if processing_time_ms > available_time_ms * 0.8 { // 80% threshold
            self.underrun_count += 1;
            crate::log(&format!("⚠️ Near-underrun: {:.2}ms > {:.2}ms threshold", 
                processing_time_ms, available_time_ms * 0.8));
            
            // Trigger adaptive sizing if enabled
            if self.adaptive_mode {
                self.consider_buffer_size_increase();
            }
        }
        
        // Update metrics
        self.update_metrics();
        
        // Perform adaptive sizing check periodically
        if self.adaptive_mode && self.should_perform_adaptation() {
            self.perform_adaptive_buffer_sizing();
        }
    }
    
    /// Record buffer underrun (audio glitch)
    pub fn record_underrun(&mut self) {
        self.underrun_count += 1;
        crate::log(&format!("❌ Buffer underrun detected (total: {})", self.underrun_count));
        
        if self.adaptive_mode {
            self.consider_buffer_size_increase();
        }
    }
    
    /// Record buffer overrun (processing too fast)
    pub fn record_overrun(&mut self) {
        self.overrun_count += 1;
        // Overruns are less critical but still worth tracking
    }
    
    /// Get current performance metrics
    pub fn get_metrics(&mut self) -> BufferMetrics {
        self.update_metrics();
        self.metrics.clone()
    }
    
    /// Get buffer size recommendation based on target latency
    pub fn get_recommended_buffer_size(&self, target_latency_ms: f32) -> BufferSize {
        let target_samples = (target_latency_ms * self.sample_rate) / 1000.0;
        
        if target_samples <= 128.0 { BufferSize::Small }
        else if target_samples <= 256.0 { BufferSize::Medium }
        else { BufferSize::Large }
    }
    
    /// Get latency for current buffer size
    pub fn get_current_latency_ms(&self) -> f32 {
        (self.current_buffer_size.as_usize() as f32 / self.sample_rate) * 1000.0
    }
    
    /// Reset all metrics and counters
    pub fn reset_metrics(&mut self) {
        self.performance_history.clear();
        self.underrun_count = 0;
        self.overrun_count = 0;
        self.samples_processed = 0;
        self.start_time_ms = Self::get_current_time_ms();
        self.metrics = BufferMetrics::default();
        
        crate::log("📊 Metrics reset");
    }
    
    /// Get buffer management status summary as JSON string
    pub fn get_status_summary(&mut self) -> String {
        let config = self.get_current_config();
        let metrics = self.get_metrics();
        
        format!(r#"{{
  "bufferSize": {},
  "latencyMs": {:.1},
  "cpuUsage": "{:?}",
  "adaptiveMode": {},
  "avgProcessingMs": "{:.3}",
  "underruns": {},
  "uptime": "{:.1}s",
  "samplesProcessed": {}
}}"#,
            self.current_buffer_size.as_usize(),
            config.latency_ms,
            config.cpu_usage,
            self.adaptive_mode,
            metrics.average_processing_time,
            metrics.underruns,
            metrics.uptime_ms / 1000.0,
            metrics.samples_processed
        )
    }
    
    /// Get buffer configuration for a given buffer size
    pub fn get_buffer_config(buffer_size: BufferSize, sample_rate: f32) -> BufferConfig {
        let latency_ms = (buffer_size.as_usize() as f32 / sample_rate) * 1000.0;
        
        let (cpu_usage, stability) = match buffer_size {
            BufferSize::Small => (CpuUsage::High, Stability::Unstable),
            BufferSize::Medium => (CpuUsage::Medium, Stability::Moderate),
            BufferSize::Large => (CpuUsage::Low, Stability::Stable),
        };
        
        BufferConfig {
            size: buffer_size,
            latency_ms,
            cpu_usage,
            stability,
        }
    }
    
    /// Detect optimal buffer size based on device capabilities
    fn detect_optimal_buffer_size(&self) -> BufferSize {
        if let Some(device) = &self.device_info {
            // High-end devices can handle lower latency
            if device.hardware_concurrency >= 8 && device.device_memory_gb >= 8 {
                crate::log("🚀 High-end device detected, using 128 sample buffer");
                return BufferSize::Small;
            }
            
            // Mid-range devices use balanced approach
            if device.hardware_concurrency >= 4 && device.device_memory_gb >= 4 {
                crate::log("⚡ Mid-range device detected, using 256 sample buffer");
                return BufferSize::Medium;
            }
            
            // Low-end devices prioritize stability
            crate::log("🐌 Low-end device detected, using 512 sample buffer");
            BufferSize::Large
        } else {
            // Default to medium buffer size when device info is unknown
            crate::log("❓ Unknown device capabilities, using 256 sample buffer");
            BufferSize::Medium
        }
    }
    
    /// Calculate optimal buffer size based on current performance
    fn calculate_optimal_buffer_size(&self) -> BufferSize {
        if self.performance_history.len() < 10 {
            return self.current_buffer_size; // Not enough data
        }
        
        let avg_processing_time: f32 = 
            self.performance_history.iter().sum::<f32>() / self.performance_history.len() as f32;
        let current_latency = self.get_current_latency_ms();
        let utilization_ratio = avg_processing_time / current_latency;
        
        // If we're using less than 50% of available time, we can go smaller
        if utilization_ratio < 0.5 && self.underrun_count == 0 {
            match self.current_buffer_size {
                BufferSize::Large => BufferSize::Medium,
                BufferSize::Medium => BufferSize::Small,
                BufferSize::Small => BufferSize::Small,
            }
        }
        // If we're using more than 70% or having underruns, go larger
        else if utilization_ratio > 0.7 || self.underrun_count > 0 {
            match self.current_buffer_size {
                BufferSize::Small => BufferSize::Medium,
                BufferSize::Medium => BufferSize::Large,
                BufferSize::Large => BufferSize::Large,
            }
        } else {
            self.current_buffer_size
        }
    }
    
    /// Check if we should perform adaptive buffer sizing
    fn should_perform_adaptation(&self) -> bool {
        let now = Self::get_current_time_ms();
        let time_since_last_adaptation = now - self.last_adaptation_ms;
        
        time_since_last_adaptation >= self.min_time_between_adaptations_ms &&
        self.performance_history.len() >= 20 // Need sufficient data
    }
    
    /// Perform adaptive buffer sizing based on performance metrics
    fn perform_adaptive_buffer_sizing(&mut self) {
        let optimal_size = self.calculate_optimal_buffer_size();
        
        if optimal_size != self.current_buffer_size {
            let old_size = self.current_buffer_size;
            self.current_buffer_size = optimal_size;
            self.last_adaptation_ms = Self::get_current_time_ms();
            
            // Reset some metrics after adaptation
            self.performance_history.clear();
            self.underrun_count = 0;
            
            let config = self.get_current_config();
            crate::log(&format!("🤖 Adaptive sizing: {:?} → {:?} samples", old_size, optimal_size));
            crate::log(&format!("📊 New latency: {:.1}ms", config.latency_ms));
        }
    }
    
    /// Consider increasing buffer size due to performance issues
    fn consider_buffer_size_increase(&mut self) {
        let now = Self::get_current_time_ms();
        if now - self.last_adaptation_ms < 2000.0 { return; } // Wait at least 2 seconds
        
        let new_size = match self.current_buffer_size {
            BufferSize::Small => BufferSize::Medium,
            BufferSize::Medium => BufferSize::Large,
            BufferSize::Large => BufferSize::Large, // Already at max
        };
        
        if new_size != self.current_buffer_size {
            let old_size = self.current_buffer_size;
            self.current_buffer_size = new_size;
            self.last_adaptation_ms = now;
            crate::log(&format!("⬆️ Emergency buffer increase: {:?} → {:?} (underruns: {})", 
                old_size, new_size, self.underrun_count));
        }
    }
    
    /// Update internal metrics
    fn update_metrics(&mut self) {
        let now = Self::get_current_time_ms();
        let uptime = now - self.start_time_ms;
        
        let (avg_processing_time, max_processing_time) = if !self.performance_history.is_empty() {
            let sum: f32 = self.performance_history.iter().sum();
            let avg = sum / self.performance_history.len() as f32;
            let max = self.performance_history.iter().fold(0.0f32, |a, &b| a.max(b));
            (avg, max)
        } else {
            (0.0, 0.0)
        };
        
        self.metrics = BufferMetrics {
            average_processing_time: avg_processing_time,
            max_processing_time: max_processing_time,
            underruns: self.underrun_count,
            overruns: self.overrun_count,
            samples_processed: self.samples_processed,
            uptime_ms: uptime,
        };
    }
    
    /// Get current time in milliseconds (placeholder - will be replaced with proper timing)
    fn get_current_time_ms() -> f32 {
        // In a real WASM environment, this would use proper timing
        // For now, we'll use a simple counter-based approach
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        COUNTER.fetch_add(1, Ordering::Relaxed) as f32
    }
}

impl Default for BufferMetrics {
    fn default() -> Self {
        Self {
            average_processing_time: 0.0,
            max_processing_time: 0.0,
            underruns: 0,
            overruns: 0,
            samples_processed: 0,
            uptime_ms: 0.0,
        }
    }
}

/// Utility function to estimate optimal buffer size for target latency
pub fn calculate_optimal_buffer_size(sample_rate: f32, target_latency_ms: f32) -> BufferSize {
    let target_samples = (sample_rate * target_latency_ms) / 1000.0;
    
    if target_samples <= 128.0 { BufferSize::Small }
    else if target_samples <= 256.0 { BufferSize::Medium }
    else { BufferSize::Large }
}

/// Utility function to convert buffer size to latency
pub fn buffer_size_to_latency(buffer_size: BufferSize, sample_rate: f32) -> f32 {
    (buffer_size.as_usize() as f32 / sample_rate) * 1000.0
}

/// Utility function to check if a buffer size is valid
pub fn is_valid_buffer_size(size: usize) -> bool {
    matches!(size, 128 | 256 | 512)
}