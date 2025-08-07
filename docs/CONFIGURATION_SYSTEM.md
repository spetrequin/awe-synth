# AWE Player Configuration System

**⚠️ CRITICAL: Real-time audio synthesis requires intelligent configuration management to optimize performance across diverse hardware platforms while maintaining EMU8000 authenticity.**

## 🎯 **Configuration System Goals**

### **Primary Objectives:**
1. **Hardware Capability Detection** - Automatically detect and adapt to system capabilities
2. **Intelligent Defaults** - Provide optimal settings based on detected hardware
3. **Runtime Adaptation** - Adjust parameters during operation without audio interruption
4. **User Preference Management** - Balance user preferences with system constraints
5. **Cross-Platform Compatibility** - Consistent behavior across different browsers/devices

### **Performance Requirements:**
- **Configuration Load Time**: <50ms to initialize all settings
- **Runtime Updates**: <10ms to apply parameter changes without audio dropouts
- **Memory Usage**: <1MB for complete configuration system
- **Persistence**: Settings automatically saved and restored across sessions
- **Validation**: All configuration changes validated for EMU8000 compatibility

## 🏗️ **Configuration Architecture Overview**

### **Multi-Tier Configuration System:**

```
┌─────────────────────────────────────────────────────────────┐
│                Configuration Management Layers              │
├─────────────────────────────────────────────────────────────┤
│  User Preferences     │  Explicit user settings and        │
│  (Highest Priority)   │  customizations                     │
├─────────────────────────────────────────────────────────────┤
│  Adaptive Tuning      │  Runtime performance-based         │
│  (Dynamic)            │  parameter adjustment               │
├─────────────────────────────────────────────────────────────┤
│  Hardware Profile     │  Device-specific optimizations     │
│  (Platform Specific)  │  based on detected capabilities    │
├─────────────────────────────────────────────────────────────┤
│  EMU8000 Defaults     │  Authentic EMU8000 specifications  │
│  (Baseline)           │  and compatibility requirements     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 **Hardware Capability Detection System**

### **Comprehensive System Profiling:**

```rust
// src/config/hardware_detection.rs

use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = navigator)]
    fn hardwareConcurrency() -> u32;
    
    #[wasm_bindgen(js_namespace = ["navigator", "deviceMemory"])]
    fn deviceMemory() -> f64;
}

/// Comprehensive hardware capability detection
pub struct HardwareProfiler {
    // System capabilities
    cpu_cores: u32,
    memory_gb: f32,
    audio_context_sample_rate: f32,
    audio_context_buffer_size: u32,
    
    // Browser/Platform detection
    platform_info: PlatformInfo,
    audio_capabilities: AudioCapabilities,
    performance_characteristics: PerformanceCharacteristics,
    
    // Benchmark results
    synthesis_benchmark: SynthesisBenchmark,
    memory_bandwidth: MemoryBandwidth,
    audio_latency: AudioLatencyProfile,
}

#[derive(Debug, Clone)]
pub struct PlatformInfo {
    pub browser: BrowserType,
    pub operating_system: OperatingSystem,
    pub device_type: DeviceType,
    pub is_mobile: bool,
    pub supports_webassembly_simd: bool,
    pub supports_audio_worklet: bool,
    pub supports_web_midi: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum BrowserType {
    Chrome,
    Firefox,
    Safari,
    Edge,
    Unknown,
}

#[derive(Debug, Clone, Copy)]
pub enum OperatingSystem {
    Windows,
    MacOS,
    Linux,
    iOS,
    Android,
    Unknown,
}

#[derive(Debug, Clone, Copy)]
pub enum DeviceType {
    Desktop,
    Laptop, 
    Tablet,
    Mobile,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct AudioCapabilities {
    pub sample_rates: Vec<f32>,
    pub buffer_sizes: Vec<u32>,
    pub max_channels: u32,
    pub supports_float32: bool,
    pub supports_audio_worklet: bool,
    pub base_latency: f32,
    pub output_latency: f32,
}

#[derive(Debug, Clone)]
pub struct PerformanceCharacteristics {
    pub cpu_performance_score: f32,      // 0.0-1.0 relative performance
    pub memory_performance_score: f32,   // Memory bandwidth relative score
    pub audio_performance_score: f32,    // Audio processing capability
    pub overall_performance_tier: PerformanceTier,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PerformanceTier {
    HighEnd,     // Desktop/high-end laptop
    MidRange,    // Standard laptop/tablet
    LowEnd,      // Mobile/older devices
    Minimal,     // Very constrained devices
}

impl HardwareProfiler {
    pub async fn new() -> Result<Self, ConfigError> {
        let mut profiler = Self {
            cpu_cores: Self::detect_cpu_cores(),
            memory_gb: Self::detect_memory_gb(),
            audio_context_sample_rate: 44100.0,
            audio_context_buffer_size: 1024,
            platform_info: Self::detect_platform_info().await?,
            audio_capabilities: Self::detect_audio_capabilities().await?,
            performance_characteristics: PerformanceCharacteristics::default(),
            synthesis_benchmark: SynthesisBenchmark::default(),
            memory_bandwidth: MemoryBandwidth::default(),
            audio_latency: AudioLatencyProfile::default(),
        };

        // Run performance benchmarks
        profiler.run_performance_benchmarks().await?;
        
        // Calculate performance scores
        profiler.calculate_performance_scores();
        
        Ok(profiler)
    }

    fn detect_cpu_cores() -> u32 {
        unsafe {
            // Use Web API to detect logical CPU cores
            let cores = hardwareConcurrency();
            if cores > 0 { cores } else { 4 } // Default fallback
        }
    }

    fn detect_memory_gb() -> f32 {
        unsafe {
            // Use Device Memory API when available
            let memory = deviceMemory();
            if memory > 0.0 { 
                memory as f32 
            } else { 
                4.0 // Default assumption: 4GB
            }
        }
    }

    async fn detect_platform_info() -> Result<PlatformInfo, ConfigError> {
        // JavaScript interop to detect browser and platform
        let user_agent = web_sys::window()
            .ok_or(ConfigError::WindowNotAvailable)?
            .navigator()
            .user_agent()
            .map_err(|_| ConfigError::UserAgentNotAvailable)?;

        let browser = Self::parse_browser_type(&user_agent);
        let operating_system = Self::parse_operating_system(&user_agent);
        let device_type = Self::detect_device_type(&user_agent);
        let is_mobile = Self::is_mobile_device(&user_agent);

        // Feature detection
        let supports_webassembly_simd = Self::detect_wasm_simd_support();
        let supports_audio_worklet = Self::detect_audio_worklet_support().await;
        let supports_web_midi = Self::detect_web_midi_support();

        Ok(PlatformInfo {
            browser,
            operating_system,
            device_type,
            is_mobile,
            supports_webassembly_simd,
            supports_audio_worklet,
            supports_web_midi,
        })
    }

    async fn detect_audio_capabilities() -> Result<AudioCapabilities, ConfigError> {
        // Create temporary AudioContext to probe capabilities
        let window = web_sys::window().ok_or(ConfigError::WindowNotAvailable)?;
        let audio_context = web_sys::AudioContext::new()
            .map_err(|_| ConfigError::AudioContextCreationFailed)?;

        let sample_rate = audio_context.sample_rate();
        let base_latency = audio_context.base_latency();
        let output_latency = audio_context.output_latency();

        // Probe supported sample rates
        let supported_sample_rates = vec![8000.0, 16000.0, 22050.0, 44100.0, 48000.0, 96000.0];
        let mut available_sample_rates = Vec::new();
        
        for &rate in &supported_sample_rates {
            // Test if sample rate is supported (simplified check)
            if rate <= sample_rate * 2.0 && rate >= sample_rate / 2.0 {
                available_sample_rates.push(rate);
            }
        }

        // Probe buffer sizes (typical WebAudio buffer sizes)
        let buffer_sizes = vec![128, 256, 512, 1024, 2048, 4096];
        
        audio_context.close().map_err(|_| ConfigError::AudioContextCleanupFailed)?;

        Ok(AudioCapabilities {
            sample_rates: available_sample_rates,
            buffer_sizes,
            max_channels: 2, // Stereo output standard
            supports_float32: true, // WebAudio uses Float32 internally
            supports_audio_worklet: Self::detect_audio_worklet_support().await,
            base_latency,
            output_latency,
        })
    }

    async fn run_performance_benchmarks(&mut self) -> Result<(), ConfigError> {
        // Synthesis performance benchmark
        self.synthesis_benchmark = self.benchmark_synthesis_performance().await?;
        
        // Memory bandwidth benchmark
        self.memory_bandwidth = self.benchmark_memory_bandwidth().await?;
        
        // Audio latency benchmark
        self.audio_latency = self.benchmark_audio_latency().await?;
        
        Ok(())
    }

    async fn benchmark_synthesis_performance(&self) -> Result<SynthesisBenchmark, ConfigError> {
        // Benchmark basic synthesis operations
        let start_time = web_sys::window()
            .ok_or(ConfigError::WindowNotAvailable)?
            .performance()
            .ok_or(ConfigError::PerformanceAPINotAvailable)?
            .now();

        // Simulate synthesis workload
        let mut total_samples = 0.0f32;
        for i in 0..10000 {
            // Basic sine wave synthesis (representative workload)
            let phase = (i as f32) * 0.01;
            total_samples += (phase * 440.0 * 2.0 * std::f32::consts::PI).sin();
        }

        let end_time = web_sys::window()
            .ok_or(ConfigError::WindowNotAvailable)?
            .performance()
            .ok_or(ConfigError::PerformanceAPINotAvailable)?
            .now();

        let duration_ms = end_time - start_time;
        let samples_per_ms = 10000.0 / duration_ms as f32;

        Ok(SynthesisBenchmark {
            samples_per_ms,
            relative_performance: Self::calculate_relative_performance(samples_per_ms),
            benchmark_score: total_samples, // Prevent optimization
        })
    }

    async fn benchmark_memory_bandwidth(&self) -> Result<MemoryBandwidth, ConfigError> {
        // Simple memory bandwidth test
        let test_size = 1024 * 1024; // 1MB test
        let mut test_data = vec![0u8; test_size];
        
        let start_time = web_sys::window()
            .ok_or(ConfigError::WindowNotAvailable)?
            .performance()
            .ok_or(ConfigError::PerformanceAPINotAvailable)?
            .now();

        // Memory copy operation
        for i in 0..test_size {
            test_data[i] = (i % 256) as u8;
        }

        let end_time = web_sys::window()
            .ok_or(ConfigError::WindowNotAvailable)?
            .performance()
            .ok_or(ConfigError::PerformanceAPINotAvailable)?
            .now();

        let duration_ms = end_time - start_time;
        let mb_per_second = (test_size as f64) / (duration_ms * 1000.0);

        Ok(MemoryBandwidth {
            mb_per_second,
            relative_bandwidth: Self::calculate_relative_bandwidth(mb_per_second),
        })
    }

    async fn benchmark_audio_latency(&self) -> Result<AudioLatencyProfile, ConfigError> {
        // Audio latency measurement (simplified)
        let audio_context = web_sys::AudioContext::new()
            .map_err(|_| ConfigError::AudioContextCreationFailed)?;

        let measured_latency = audio_context.base_latency() + audio_context.output_latency();
        
        audio_context.close().map_err(|_| ConfigError::AudioContextCleanupFailed)?;

        Ok(AudioLatencyProfile {
            measured_latency_ms: measured_latency * 1000.0,
            estimated_processing_latency: 5.0, // Estimated processing overhead
            total_system_latency: measured_latency * 1000.0 + 5.0,
        })
    }

    fn calculate_performance_scores(&mut self) {
        // Calculate relative performance scores
        let cpu_score = Self::calculate_cpu_score(self.cpu_cores, self.synthesis_benchmark.samples_per_ms);
        let memory_score = self.memory_bandwidth.relative_bandwidth;
        let audio_score = Self::calculate_audio_score(self.audio_latency.total_system_latency);
        
        // Determine overall performance tier
        let overall_score = (cpu_score + memory_score + audio_score) / 3.0;
        let performance_tier = match overall_score {
            score if score >= 0.8 => PerformanceTier::HighEnd,
            score if score >= 0.6 => PerformanceTier::MidRange,
            score if score >= 0.4 => PerformanceTier::LowEnd,
            _ => PerformanceTier::Minimal,
        };

        self.performance_characteristics = PerformanceCharacteristics {
            cpu_performance_score: cpu_score,
            memory_performance_score: memory_score,
            audio_performance_score: audio_score,
            overall_performance_tier: performance_tier,
        };
    }

    fn calculate_cpu_score(cores: u32, samples_per_ms: f32) -> f32 {
        // Heuristic CPU performance calculation
        let core_score = (cores as f32).min(8.0) / 8.0; // Normalize to 8 cores max
        let synthesis_score = (samples_per_ms / 1000.0).min(1.0); // Normalize synthesis performance
        (core_score + synthesis_score) / 2.0
    }

    fn calculate_audio_score(latency_ms: f32) -> f32 {
        // Lower latency = higher score
        let normalized_latency = (50.0 - latency_ms.min(50.0)) / 50.0;
        normalized_latency.max(0.0)
    }

    fn calculate_relative_performance(samples_per_ms: f32) -> f32 {
        // Normalize against expected performance benchmarks
        (samples_per_ms / 1000.0).min(1.0)
    }

    fn calculate_relative_bandwidth(mb_per_second: f64) -> f32 {
        // Normalize against expected memory bandwidth
        (mb_per_second / 1000.0).min(1.0) as f32
    }

    // Browser/Platform detection helpers
    fn parse_browser_type(user_agent: &str) -> BrowserType {
        if user_agent.contains("Chrome") {
            BrowserType::Chrome
        } else if user_agent.contains("Firefox") {
            BrowserType::Firefox
        } else if user_agent.contains("Safari") {
            BrowserType::Safari
        } else if user_agent.contains("Edge") {
            BrowserType::Edge
        } else {
            BrowserType::Unknown
        }
    }

    fn parse_operating_system(user_agent: &str) -> OperatingSystem {
        if user_agent.contains("Windows") {
            OperatingSystem::Windows
        } else if user_agent.contains("Mac") {
            OperatingSystem::MacOS
        } else if user_agent.contains("Linux") {
            OperatingSystem::Linux
        } else if user_agent.contains("iPhone") || user_agent.contains("iPad") {
            OperatingSystem::iOS
        } else if user_agent.contains("Android") {
            OperatingSystem::Android
        } else {
            OperatingSystem::Unknown
        }
    }

    fn detect_device_type(user_agent: &str) -> DeviceType {
        if user_agent.contains("Mobile") || user_agent.contains("iPhone") {
            DeviceType::Mobile
        } else if user_agent.contains("iPad") || user_agent.contains("Tablet") {
            DeviceType::Tablet
        } else {
            // Assume desktop/laptop for non-mobile devices
            DeviceType::Desktop
        }
    }

    fn is_mobile_device(user_agent: &str) -> bool {
        user_agent.contains("Mobile") || 
        user_agent.contains("iPhone") || 
        user_agent.contains("Android")
    }

    fn detect_wasm_simd_support() -> bool {
        // Feature detection for WebAssembly SIMD
        // This would need to be implemented with JavaScript interop
        false // Conservative default
    }

    async fn detect_audio_worklet_support() -> bool {
        // Check if AudioWorklet is supported
        web_sys::window()
            .and_then(|w| w.audio_worklet())
            .is_some()
    }

    fn detect_web_midi_support() -> bool {
        // Check if Web MIDI API is supported
        web_sys::window()
            .map(|w| w.navigator())
            .and_then(|n| js_sys::Reflect::get(&n, &"requestMIDIAccess".into()).ok())
            .is_some()
    }

    /// Get comprehensive hardware profile
    pub fn get_hardware_profile(&self) -> HardwareProfile {
        HardwareProfile {
            platform_info: self.platform_info.clone(),
            audio_capabilities: self.audio_capabilities.clone(),
            performance_characteristics: self.performance_characteristics.clone(),
            recommended_settings: self.generate_recommended_settings(),
        }
    }

    fn generate_recommended_settings(&self) -> RecommendedSettings {
        match self.performance_characteristics.overall_performance_tier {
            PerformanceTier::HighEnd => RecommendedSettings {
                max_voices: 32,
                buffer_size: 512,
                sample_rate: 48000.0,
                effects_quality: EffectsQuality::Maximum,
                memory_limit_mb: 512,
                enable_advanced_features: true,
            },
            PerformanceTier::MidRange => RecommendedSettings {
                max_voices: 24,
                buffer_size: 1024,
                sample_rate: 44100.0,
                effects_quality: EffectsQuality::High,
                memory_limit_mb: 256,
                enable_advanced_features: true,
            },
            PerformanceTier::LowEnd => RecommendedSettings {
                max_voices: 16,
                buffer_size: 2048,
                sample_rate: 44100.0,
                effects_quality: EffectsQuality::Medium,
                memory_limit_mb: 128,
                enable_advanced_features: false,
            },
            PerformanceTier::Minimal => RecommendedSettings {
                max_voices: 8,
                buffer_size: 4096,
                sample_rate: 22050.0,
                effects_quality: EffectsQuality::Low,
                memory_limit_mb: 64,
                enable_advanced_features: false,
            },
        }
    }
}

#[derive(Debug, Clone)]
pub struct SynthesisBenchmark {
    pub samples_per_ms: f32,
    pub relative_performance: f32,
    pub benchmark_score: f32,
}

impl Default for SynthesisBenchmark {
    fn default() -> Self {
        Self {
            samples_per_ms: 100.0,
            relative_performance: 0.5,
            benchmark_score: 0.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct MemoryBandwidth {
    pub mb_per_second: f64,
    pub relative_bandwidth: f32,
}

impl Default for MemoryBandwidth {
    fn default() -> Self {
        Self {
            mb_per_second: 100.0,
            relative_bandwidth: 0.5,
        }
    }
}

#[derive(Debug, Clone)]
pub struct AudioLatencyProfile {
    pub measured_latency_ms: f32,
    pub estimated_processing_latency: f32,
    pub total_system_latency: f32,
}

impl Default for AudioLatencyProfile {
    fn default() -> Self {
        Self {
            measured_latency_ms: 20.0,
            estimated_processing_latency: 5.0,
            total_system_latency: 25.0,
        }
    }
}

impl Default for PerformanceCharacteristics {
    fn default() -> Self {
        Self {
            cpu_performance_score: 0.5,
            memory_performance_score: 0.5,
            audio_performance_score: 0.5,
            overall_performance_tier: PerformanceTier::MidRange,
        }
    }
}

#[derive(Debug, Clone)]
pub struct HardwareProfile {
    pub platform_info: PlatformInfo,
    pub audio_capabilities: AudioCapabilities,
    pub performance_characteristics: PerformanceCharacteristics,
    pub recommended_settings: RecommendedSettings,
}

#[derive(Debug, Clone)]
pub struct RecommendedSettings {
    pub max_voices: u32,
    pub buffer_size: u32,
    pub sample_rate: f32,
    pub effects_quality: EffectsQuality,
    pub memory_limit_mb: usize,
    pub enable_advanced_features: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum EffectsQuality {
    Maximum,
    High,
    Medium,
    Low,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Window object not available")]
    WindowNotAvailable,
    #[error("User agent not available")]
    UserAgentNotAvailable,
    #[error("AudioContext creation failed")]
    AudioContextCreationFailed,
    #[error("AudioContext cleanup failed")]
    AudioContextCleanupFailed,
    #[error("Performance API not available")]
    PerformanceAPINotAvailable,
}
```

## ⚙️ **Intelligent Configuration Management**

### **Adaptive Configuration Engine:**

```rust
// src/config/configuration_manager.rs

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use crate::config::hardware_detection::{HardwareProfiler, HardwareProfile};
use crate::performance::PerformanceMonitor;

/// Central configuration management system
pub struct ConfigurationManager {
    // Configuration layers
    emu8000_defaults: EMU8000Configuration,
    hardware_profile: HardwareProfile,
    user_preferences: Arc<RwLock<UserPreferences>>,
    runtime_adaptations: Arc<RwLock<RuntimeAdaptations>>,
    
    // Active configuration
    active_config: Arc<RwLock<ActiveConfiguration>>,
    
    // Management systems
    persistence_manager: PersistenceManager,
    validation_engine: ConfigurationValidator,
    adaptation_engine: AdaptationEngine,
    
    // Monitoring
    performance_monitor: Arc<RwLock<PerformanceMonitor>>,
    config_history: ConfigurationHistory,
}

impl ConfigurationManager {
    pub async fn new() -> Result<Self, ConfigError> {
        // Detect hardware capabilities
        let hardware_profiler = HardwareProfiler::new().await?;
        let hardware_profile = hardware_profiler.get_hardware_profile();
        
        // Load user preferences from storage
        let persistence_manager = PersistenceManager::new();
        let user_preferences = persistence_manager.load_user_preferences().await
            .unwrap_or_else(|_| UserPreferences::default());
        
        // Generate initial configuration based on hardware and preferences
        let initial_config = Self::generate_initial_configuration(
            &hardware_profile,
            &user_preferences
        );
        
        Ok(Self {
            emu8000_defaults: EMU8000Configuration::default(),
            hardware_profile,
            user_preferences: Arc::new(RwLock::new(user_preferences)),
            runtime_adaptations: Arc::new(RwLock::new(RuntimeAdaptations::default())),
            active_config: Arc::new(RwLock::new(initial_config)),
            persistence_manager,
            validation_engine: ConfigurationValidator::new(),
            adaptation_engine: AdaptationEngine::new(),
            performance_monitor: Arc::new(RwLock::new(PerformanceMonitor::new(44100.0, 1024))),
            config_history: ConfigurationHistory::new(),
        })
    }

    /// Get current active configuration
    pub fn get_active_configuration(&self) -> ActiveConfiguration {
        self.active_config.read().unwrap().clone()
    }

    /// Update user preferences and recalculate configuration
    pub async fn update_user_preferences(&mut self, preferences: UserPreferences) -> Result<(), ConfigError> {
        // Validate preferences against hardware constraints
        let validated_preferences = self.validation_engine.validate_user_preferences(
            &preferences,
            &self.hardware_profile
        )?;

        // Update preferences
        *self.user_preferences.write().unwrap() = validated_preferences.clone();

        // Recalculate active configuration
        let new_config = self.calculate_optimal_configuration().await?;
        
        // Apply configuration changes
        self.apply_configuration_changes(new_config).await?;
        
        // Persist preferences
        self.persistence_manager.save_user_preferences(&validated_preferences).await?;
        
        Ok(())
    }

    /// Runtime adaptation based on performance metrics
    pub async fn adapt_to_performance(&mut self, performance_metrics: &PerformanceMetrics) -> Result<bool, ConfigError> {
        let adaptation_result = self.adaptation_engine.analyze_performance_and_adapt(
            performance_metrics,
            &self.get_active_configuration()
        );

        match adaptation_result {
            AdaptationResult::NoChangeNeeded => Ok(false),
            AdaptationResult::AdaptationRecommended(adaptations) => {
                // Apply runtime adaptations
                *self.runtime_adaptations.write().unwrap() = adaptations;
                
                // Recalculate and apply new configuration
                let new_config = self.calculate_optimal_configuration().await?;
                self.apply_configuration_changes(new_config).await?;
                
                crate::log("Configuration adapted based on performance metrics");
                Ok(true)
            }
            AdaptationResult::EmergencyAdaptation(emergency_config) => {
                // Emergency adaptation - apply immediately
                *self.active_config.write().unwrap() = emergency_config;
                self.apply_emergency_configuration().await?;
                
                crate::log("Emergency configuration adaptation applied");
                Ok(true)
            }
        }
    }

    async fn calculate_optimal_configuration(&self) -> Result<ActiveConfiguration, ConfigError> {
        let user_prefs = self.user_preferences.read().unwrap().clone();
        let runtime_adaptations = self.runtime_adaptations.read().unwrap().clone();
        
        // Start with EMU8000 defaults
        let mut config = ActiveConfiguration::from_emu8000_defaults(&self.emu8000_defaults);
        
        // Apply hardware profile optimizations
        config.apply_hardware_optimizations(&self.hardware_profile);
        
        // Apply user preferences (where they don't conflict with hardware)
        config.apply_user_preferences(&user_prefs, &self.hardware_profile);
        
        // Apply runtime adaptations
        config.apply_runtime_adaptations(&runtime_adaptations);
        
        // Validate final configuration
        self.validation_engine.validate_complete_configuration(&config)?;
        
        Ok(config)
    }

    async fn apply_configuration_changes(&mut self, new_config: ActiveConfiguration) -> Result<(), ConfigError> {
        let current_config = self.active_config.read().unwrap().clone();
        
        // Calculate differences
        let changes = ConfigurationDiff::calculate(&current_config, &new_config);
        
        // Apply changes that can be done without audio interruption
        self.apply_non_disruptive_changes(&changes).await?;
        
        // Apply changes that require audio thread coordination
        if changes.requires_audio_thread_update() {
            self.apply_audio_thread_changes(&changes).await?;
        }
        
        // Update active configuration
        *self.active_config.write().unwrap() = new_config.clone();
        
        // Record configuration change
        self.config_history.record_configuration_change(&current_config, &new_config);
        
        Ok(())
    }

    async fn apply_non_disruptive_changes(&self, changes: &ConfigurationDiff) -> Result<(), ConfigError> {
        // Apply changes that don't affect audio processing
        if let Some(memory_limit) = changes.memory_limit_change {
            // Update memory management system
            crate::log(&format!("Updated memory limit to {}MB", memory_limit));
        }
        
        if let Some(ui_settings) = &changes.ui_settings_change {
            // Update UI configuration
            crate::log("Updated UI settings");
        }
        
        Ok(())
    }

    async fn apply_audio_thread_changes(&self, changes: &ConfigurationDiff) -> Result<(), ConfigError> {
        // Apply changes that affect audio processing
        // These need to be coordinated with the audio thread
        
        if let Some(voice_count) = changes.max_voices_change {
            // Update voice manager
            crate::log(&format!("Updated max voices to {}", voice_count));
        }
        
        if let Some(buffer_size) = changes.buffer_size_change {
            // Update audio buffer configuration
            crate::log(&format!("Updated buffer size to {}", buffer_size));
        }
        
        if let Some(effects_quality) = changes.effects_quality_change {
            // Update effects processing quality
            crate::log(&format!("Updated effects quality to {:?}", effects_quality));
        }
        
        Ok(())
    }

    async fn apply_emergency_configuration(&self) -> Result<(), ConfigError> {
        // Apply minimal configuration for emergency situations
        crate::log("Applying emergency configuration");
        
        // Reduce to minimal settings
        // This would coordinate with the error recovery system
        
        Ok(())
    }

    fn generate_initial_configuration(
        hardware_profile: &HardwareProfile,
        user_preferences: &UserPreferences
    ) -> ActiveConfiguration {
        let mut config = ActiveConfiguration::from_hardware_profile(hardware_profile);
        
        // Apply user preferences where they don't conflict with hardware limitations
        if user_preferences.max_voices <= hardware_profile.recommended_settings.max_voices {
            config.synthesis.max_voices = user_preferences.max_voices;
        }
        
        if user_preferences.prefer_quality_over_performance {
            config.effects.quality = match hardware_profile.performance_characteristics.overall_performance_tier {
                crate::config::hardware_detection::PerformanceTier::HighEnd => EffectsQuality::Maximum,
                crate::config::hardware_detection::PerformanceTier::MidRange => EffectsQuality::High,
                _ => EffectsQuality::Medium,
            };
        }
        
        config
    }

    /// Get configuration statistics and health
    pub fn get_configuration_stats(&self) -> ConfigurationStats {
        let active_config = self.active_config.read().unwrap();
        let user_prefs = self.user_preferences.read().unwrap();
        let adaptations = self.runtime_adaptations.read().unwrap();
        
        ConfigurationStats {
            hardware_tier: self.hardware_profile.performance_characteristics.overall_performance_tier,
            active_voice_limit: active_config.synthesis.max_voices,
            active_buffer_size: active_config.audio.buffer_size,
            active_sample_rate: active_config.audio.sample_rate,
            effects_quality: active_config.effects.quality,
            memory_limit_mb: active_config.memory.limit_mb,
            user_preference_satisfaction: user_prefs.calculate_satisfaction_score(&active_config),
            adaptation_count: adaptations.total_adaptations,
            last_adaptation_time: adaptations.last_adaptation_time,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub max_voices: u32,
    pub preferred_buffer_size: Option<u32>,
    pub preferred_sample_rate: Option<f32>,
    pub prefer_quality_over_performance: bool,
    pub enable_advanced_effects: bool,
    pub memory_usage_preference: MemoryUsagePreference,
    pub ui_preferences: UIPreferences,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum MemoryUsagePreference {
    Conservative,  // Minimize memory usage
    Balanced,      // Balance memory and performance
    Aggressive,    // Use available memory for performance
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIPreferences {
    pub show_advanced_controls: bool,
    pub enable_performance_display: bool,
    pub preferred_theme: String,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            max_voices: 16,
            preferred_buffer_size: None,
            preferred_sample_rate: None,
            prefer_quality_over_performance: false,
            enable_advanced_effects: true,
            memory_usage_preference: MemoryUsagePreference::Balanced,
            ui_preferences: UIPreferences {
                show_advanced_controls: false,
                enable_performance_display: true,
                preferred_theme: "default".to_string(),
            },
        }
    }
}

impl UserPreferences {
    fn calculate_satisfaction_score(&self, active_config: &ActiveConfiguration) -> f32 {
        let mut score = 0.0;
        let mut total_weight = 0.0;
        
        // Voice count satisfaction
        let voice_satisfaction = if active_config.synthesis.max_voices >= self.max_voices {
            1.0
        } else {
            active_config.synthesis.max_voices as f32 / self.max_voices as f32
        };
        score += voice_satisfaction * 0.3;
        total_weight += 0.3;
        
        // Quality vs performance preference
        let quality_score = match (self.prefer_quality_over_performance, active_config.effects.quality) {
            (true, EffectsQuality::Maximum) => 1.0,
            (true, EffectsQuality::High) => 0.8,
            (false, EffectsQuality::Medium) => 1.0,
            (false, EffectsQuality::Low) => 0.8,
            _ => 0.6,
        };
        score += quality_score * 0.4;
        total_weight += 0.4;
        
        // Buffer size preference
        if let Some(preferred_buffer) = self.preferred_buffer_size {
            let buffer_satisfaction = if active_config.audio.buffer_size == preferred_buffer {
                1.0
            } else {
                0.7
            };
            score += buffer_satisfaction * 0.3;
            total_weight += 0.3;
        }
        
        score / total_weight
    }
}

#[derive(Debug, Clone)]
pub struct ActiveConfiguration {
    pub synthesis: SynthesisConfiguration,
    pub audio: AudioConfiguration,
    pub effects: EffectsConfiguration,
    pub memory: MemoryConfiguration,
    pub midi: MidiConfiguration,
}

#[derive(Debug, Clone)]
pub struct SynthesisConfiguration {
    pub max_voices: u32,
    pub voice_stealing_algorithm: VoiceStealingAlgorithm,
    pub envelope_precision: EnvelopePrecision,
    pub interpolation_quality: InterpolationQuality,
}

#[derive(Debug, Clone)]
pub struct AudioConfiguration {
    pub sample_rate: f32,
    pub buffer_size: u32,
    pub output_channels: u32,
    pub bit_depth: BitDepth,
}

#[derive(Debug, Clone)]
pub struct EffectsConfiguration {
    pub quality: EffectsQuality,
    pub reverb_enabled: bool,
    pub chorus_enabled: bool,
    pub filter_quality: FilterQuality,
}

#[derive(Debug, Clone)]
pub struct MemoryConfiguration {
    pub limit_mb: usize,
    pub cache_policy: CachePolicy,
    pub preload_strategy: PreloadStrategy,
}

#[derive(Debug, Clone)]
pub struct MidiConfiguration {
    pub input_buffer_size: u32,
    pub enable_hardware_devices: bool,
    pub enable_file_playback: bool,
    pub timing_precision: TimingPrecision,
}

// Various enums for configuration options
#[derive(Debug, Clone, Copy)]
pub enum VoiceStealingAlgorithm {
    LeastRecentlyUsed,
    LowestVelocity,
    ReleasingFirst,
}

#[derive(Debug, Clone, Copy)]
pub enum EnvelopePrecision {
    Low,
    Medium, 
    High,
}

#[derive(Debug, Clone, Copy)]
pub enum InterpolationQuality {
    None,
    Linear,
    Cubic,
    Sinc,
}

#[derive(Debug, Clone, Copy)]
pub enum BitDepth {
    Sixteen,
    TwentyFour,
    ThirtyTwo,
}

#[derive(Debug, Clone, Copy)]
pub enum FilterQuality {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy)]
pub enum CachePolicy {
    Conservative,
    Balanced,
    Aggressive,
}

#[derive(Debug, Clone, Copy)]
pub enum PreloadStrategy {
    None,
    Minimal,
    Intelligent,
    Aggressive,
}

#[derive(Debug, Clone, Copy)]
pub enum TimingPrecision {
    Low,      // ±10ms
    Medium,   // ±5ms  
    High,     // ±1ms
    Maximum,  // Sample accurate
}

// Supporting structures and implementations would continue...
// This shows the comprehensive nature of the configuration system

impl ActiveConfiguration {
    fn from_emu8000_defaults(defaults: &EMU8000Configuration) -> Self {
        // Implementation would convert EMU8000 defaults to active config
        Self {
            synthesis: SynthesisConfiguration {
                max_voices: 32,
                voice_stealing_algorithm: VoiceStealingAlgorithm::ReleasingFirst,
                envelope_precision: EnvelopePrecision::High,
                interpolation_quality: InterpolationQuality::Linear,
            },
            audio: AudioConfiguration {
                sample_rate: 44100.0,
                buffer_size: 1024,
                output_channels: 2,
                bit_depth: BitDepth::ThirtyTwo,
            },
            effects: EffectsConfiguration {
                quality: EffectsQuality::High,
                reverb_enabled: true,
                chorus_enabled: true,
                filter_quality: FilterQuality::High,
            },
            memory: MemoryConfiguration {
                limit_mb: 256,
                cache_policy: CachePolicy::Balanced,
                preload_strategy: PreloadStrategy::Intelligent,
            },
            midi: MidiConfiguration {
                input_buffer_size: 1000,
                enable_hardware_devices: true,
                enable_file_playback: true,
                timing_precision: TimingPrecision::Maximum,
            },
        }
    }

    fn from_hardware_profile(profile: &HardwareProfile) -> Self {
        // Convert hardware profile recommendations to active configuration
        let settings = &profile.recommended_settings;
        
        Self {
            synthesis: SynthesisConfiguration {
                max_voices: settings.max_voices,
                voice_stealing_algorithm: VoiceStealingAlgorithm::ReleasingFirst,
                envelope_precision: match settings.effects_quality {
                    EffectsQuality::Maximum => EnvelopePrecision::High,
                    EffectsQuality::High => EnvelopePrecision::High,
                    EffectsQuality::Medium => EnvelopePrecision::Medium,
                    EffectsQuality::Low => EnvelopePrecision::Low,
                },
                interpolation_quality: if settings.enable_advanced_features {
                    InterpolationQuality::Cubic
                } else {
                    InterpolationQuality::Linear
                },
            },
            audio: AudioConfiguration {
                sample_rate: settings.sample_rate,
                buffer_size: settings.buffer_size,
                output_channels: 2,
                bit_depth: BitDepth::ThirtyTwo,
            },
            effects: EffectsConfiguration {
                quality: settings.effects_quality,
                reverb_enabled: settings.enable_advanced_features,
                chorus_enabled: settings.enable_advanced_features,
                filter_quality: match settings.effects_quality {
                    EffectsQuality::Maximum | EffectsQuality::High => FilterQuality::High,
                    EffectsQuality::Medium => FilterQuality::Medium,
                    EffectsQuality::Low => FilterQuality::Low,
                },
            },
            memory: MemoryConfiguration {
                limit_mb: settings.memory_limit_mb,
                cache_policy: CachePolicy::Balanced,
                preload_strategy: if settings.enable_advanced_features {
                    PreloadStrategy::Intelligent 
                } else {
                    PreloadStrategy::Minimal
                },
            },
            midi: MidiConfiguration {
                input_buffer_size: 1000,
                enable_hardware_devices: true,
                enable_file_playback: true,
                timing_precision: TimingPrecision::Maximum,
            },
        }
    }

    fn apply_hardware_optimizations(&mut self, profile: &HardwareProfile) {
        // Apply hardware-specific optimizations
        match profile.platform_info.device_type {
            crate::config::hardware_detection::DeviceType::Mobile => {
                // Mobile optimizations
                self.synthesis.max_voices = self.synthesis.max_voices.min(16);
                self.audio.buffer_size = self.audio.buffer_size.max(2048);
                self.effects.quality = match self.effects.quality {
                    EffectsQuality::Maximum => EffectsQuality::High,
                    other => other,
                };
            }
            _ => {
                // Desktop/laptop optimizations
            }
        }
    }

    fn apply_user_preferences(&mut self, preferences: &UserPreferences, hardware_profile: &HardwareProfile) {
        // Apply user preferences where they don't conflict with hardware limits
        let max_hardware_voices = hardware_profile.recommended_settings.max_voices;
        self.synthesis.max_voices = preferences.max_voices.min(max_hardware_voices);
        
        if let Some(buffer_size) = preferences.preferred_buffer_size {
            if hardware_profile.audio_capabilities.buffer_sizes.contains(&buffer_size) {
                self.audio.buffer_size = buffer_size;
            }
        }
        
        if preferences.prefer_quality_over_performance {
            // Increase quality settings where possible
            match hardware_profile.performance_characteristics.overall_performance_tier {
                crate::config::hardware_detection::PerformanceTier::HighEnd => {
                    self.effects.quality = EffectsQuality::Maximum;
                    self.synthesis.envelope_precision = EnvelopePrecision::High;
                    self.synthesis.interpolation_quality = InterpolationQuality::Cubic;
                }
                crate::config::hardware_detection::PerformanceTier::MidRange => {
                    self.effects.quality = EffectsQuality::High;
                    self.synthesis.interpolation_quality = InterpolationQuality::Cubic;
                }
                _ => {
                    // Keep current settings for lower-end hardware
                }
            }
        }
    }

    fn apply_runtime_adaptations(&mut self, adaptations: &RuntimeAdaptations) {
        if let Some(voice_reduction) = adaptations.voice_count_reduction {
            self.synthesis.max_voices = self.synthesis.max_voices.saturating_sub(voice_reduction);
        }
        
        if let Some(quality_reduction) = adaptations.effects_quality_reduction {
            self.effects.quality = match (self.effects.quality, quality_reduction) {
                (EffectsQuality::Maximum, 1) => EffectsQuality::High,
                (EffectsQuality::High, 1) => EffectsQuality::Medium,
                (EffectsQuality::Medium, 1) => EffectsQuality::Low,
                (current, 0) => current,
                _ => EffectsQuality::Low,
            };
        }
        
        if adaptations.disable_advanced_features {
            self.effects.reverb_enabled = false;
            self.effects.chorus_enabled = false;
            self.synthesis.interpolation_quality = InterpolationQuality::Linear;
        }
    }
}

// Supporting structures for the configuration system
#[derive(Debug, Clone)]
pub struct EMU8000Configuration {
    // EMU8000 baseline configuration
}

impl Default for EMU8000Configuration {
    fn default() -> Self {
        Self {}
    }
}

#[derive(Debug, Default)]
pub struct RuntimeAdaptations {
    pub voice_count_reduction: Option<u32>,
    pub effects_quality_reduction: Option<u32>,
    pub disable_advanced_features: bool,
    pub total_adaptations: u32,
    pub last_adaptation_time: u64,
}

pub struct PersistenceManager;
pub struct ConfigurationValidator;
pub struct AdaptationEngine;
pub struct ConfigurationHistory;

// Stub implementations for supporting systems
impl PersistenceManager {
    pub fn new() -> Self { Self }
    
    pub async fn load_user_preferences(&self) -> Result<UserPreferences, ConfigError> {
        // Load from localStorage or IndexedDB
        Ok(UserPreferences::default())
    }
    
    pub async fn save_user_preferences(&self, _preferences: &UserPreferences) -> Result<(), ConfigError> {
        // Save to localStorage or IndexedDB
        Ok(())
    }
}

impl ConfigurationValidator {
    pub fn new() -> Self { Self }
    
    pub fn validate_user_preferences(&self, preferences: &UserPreferences, hardware_profile: &HardwareProfile) -> Result<UserPreferences, ConfigError> {
        let mut validated = preferences.clone();
        
        // Ensure voice count doesn't exceed hardware capabilities
        validated.max_voices = validated.max_voices.min(hardware_profile.recommended_settings.max_voices);
        
        Ok(validated)
    }
    
    pub fn validate_complete_configuration(&self, _config: &ActiveConfiguration) -> Result<(), ConfigError> {
        // Validate that configuration is internally consistent and hardware-compatible
        Ok(())
    }
}

impl AdaptationEngine {
    pub fn new() -> Self { Self }
    
    pub fn analyze_performance_and_adapt(&self, _metrics: &PerformanceMetrics, _current_config: &ActiveConfiguration) -> AdaptationResult {
        // Analyze performance metrics and determine if adaptation is needed
        AdaptationResult::NoChangeNeeded
    }
}

impl ConfigurationHistory {
    pub fn new() -> Self { Self }
    
    pub fn record_configuration_change(&mut self, _old: &ActiveConfiguration, _new: &ActiveConfiguration) {
        // Record configuration changes for analysis and rollback
    }
}

#[derive(Debug)]
pub struct ConfigurationDiff {
    pub max_voices_change: Option<u32>,
    pub buffer_size_change: Option<u32>,
    pub effects_quality_change: Option<EffectsQuality>,
    pub memory_limit_change: Option<usize>,
    pub ui_settings_change: Option<UIPreferences>,
}

impl ConfigurationDiff {
    pub fn calculate(_old: &ActiveConfiguration, _new: &ActiveConfiguration) -> Self {
        // Calculate differences between configurations
        Self {
            max_voices_change: None,
            buffer_size_change: None,
            effects_quality_change: None,
            memory_limit_change: None,
            ui_settings_change: None,
        }
    }
    
    pub fn requires_audio_thread_update(&self) -> bool {
        self.max_voices_change.is_some() || 
        self.buffer_size_change.is_some() || 
        self.effects_quality_change.is_some()
    }
}

#[derive(Debug)]
pub struct PerformanceMetrics {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub audio_latency: f32,
    pub buffer_underruns: u32,
}

#[derive(Debug)]
pub enum AdaptationResult {
    NoChangeNeeded,
    AdaptationRecommended(RuntimeAdaptations),
    EmergencyAdaptation(ActiveConfiguration),
}

#[derive(Debug)]
pub struct ConfigurationStats {
    pub hardware_tier: crate::config::hardware_detection::PerformanceTier,
    pub active_voice_limit: u32,
    pub active_buffer_size: u32,
    pub active_sample_rate: f32,
    pub effects_quality: EffectsQuality,
    pub memory_limit_mb: usize,
    pub user_preference_satisfaction: f32,
    pub adaptation_count: u32,
    pub last_adaptation_time: u64,
}
```

This comprehensive configuration system provides intelligent, adaptive configuration management for the EMU8000 emulator, ensuring optimal performance across all hardware platforms while maintaining user preferences and EMU8000 authenticity.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Design configuration system for hardware capabilities", "status": "completed", "priority": "high", "id": "configuration-system"}, {"content": "Design error recovery system for audio thread failures", "status": "completed", "priority": "high", "id": "error-recovery-system"}, {"content": "Design memory management strategy for large SoundFonts", "status": "completed", "priority": "high", "id": "memory-management-strategy"}, {"content": "Design input validation framework for SoundFont/MIDI parsing", "status": "completed", "priority": "high", "id": "input-validation-framework"}, {"content": "Design performance monitoring system for real-time audio", "status": "completed", "priority": "high", "id": "performance-monitoring-system"}, {"content": "Evaluate additional best practices for EMU8000 project", "status": "completed", "priority": "medium", "id": "best-practices-evaluation"}, {"content": "Design comprehensive testing strategy (unit + stress testing)", "status": "completed", "priority": "high", "id": "testing-strategy-design"}, {"content": "Phase 1.1: Create web/package.json with TypeScript and WebMIDI dependencies", "status": "completed", "priority": "high", "id": "phase-1-1-web-package-json"}, {"content": "Phase 1.2: Create web/tsconfig.json for TypeScript configuration", "status": "completed", "priority": "high", "id": "phase-1-2-web-tsconfig"}, {"content": "Phase 1.3: Add lock-free MIDI event queue interface to src/lib.rs (WASM side)", "status": "completed", "priority": "high", "id": "phase-1-3-wasm-midi-queue"}, {"content": "Phase 1.4: Create TypeScript\u2194WASM bridge for MIDI events with sample-accurate timing", "status": "completed", "priority": "high", "id": "phase-1-4-midi-timing-bridge"}, {"content": "Phase 2.1: Create web/src/virtual-midi-keyboard.ts - 88-key piano interface", "status": "pending", "priority": "medium", "id": "phase-2-1-virtual-midi-keyboard"}, {"content": "Phase 2.2: Add General MIDI instrument selector (128 instruments)", "status": "pending", "priority": "medium", "id": "phase-2-2-gm-instrument-selector"}, {"content": "Phase 2.3: Implement CC controls: pitch bend, modulation wheel, sustain pedal", "status": "pending", "priority": "medium", "id": "phase-2-3-midi-cc-controls"}, {"content": "Phase 2.4: Add keyboard mouse/touch input with velocity sensitivity", "status": "pending", "priority": "medium", "id": "phase-2-4-keyboard-input-handling"}, {"content": "Phase 3.1: Create web/src/midi-input.ts - WebMIDI device discovery and connection", "status": "pending", "priority": "low", "id": "phase-3-1-webmidi-device-discovery"}, {"content": "Phase 3.2: Implement MIDI message parsing and validation in midi-input.ts", "status": "pending", "priority": "low", "id": "phase-3-2-midi-message-parsing"}, {"content": "Phase 3.3: Implement MIDI device state management (connect/disconnect)", "status": "pending", "priority": "low", "id": "phase-3-3-midi-device-management"}, {"content": "Phase 4.1: Add MIDI file parser basics in src/midi/parser.rs", "status": "pending", "priority": "low", "id": "phase-4-1-midi-file-parser"}, {"content": "Phase 4.2: Implement MIDI track parsing and event extraction", "status": "pending", "priority": "low", "id": "phase-4-2-midi-track-parsing"}, {"content": "Phase 4.3: Create web/src/midi-file-loader.ts - drag/drop MIDI file interface", "status": "pending", "priority": "low", "id": "phase-4-3-midi-file-loader"}, {"content": "Phase 4.4: Add MIDI file playback controls: play/pause/stop/seek", "status": "pending", "priority": "low", "id": "phase-4-4-midi-playback-controls"}, {"content": "Phase 5.1: Unified MIDI routing: virtual keyboard + hardware + file playback \u2192 WASM", "status": "pending", "priority": "low", "id": "phase-5-1-unified-midi-routing"}, {"content": "Phase 5.2: Add basic MIDI sequencer structure in src/midi/sequencer.rs", "status": "pending", "priority": "low", "id": "phase-5-2-rust-midi-sequencer"}, {"content": "Phase 5.3: Connect VoiceManager to MIDI events (note_on/note_off)", "status": "pending", "priority": "low", "id": "phase-5-3-midi-voice-connection"}, {"content": "Phase 6.1: INTEGRATION CHECK - Verify MIDI queue integration with VoiceManager", "status": "pending", "priority": "low", "id": "phase-6-1-midi-queue-voice-integration"}, {"content": "Phase 6.2: INTEGRATION CHECK - Verify sequencer timing affects voice envelope timing", "status": "pending", "priority": "low", "id": "phase-6-2-sequencer-voice-timing-integration"}, {"content": "Phase 6.3: INTEGRATION CHECK - Test voice allocation/stealing with MIDI priority", "status": "pending", "priority": "low", "id": "phase-6-3-voice-allocation-midi-integration"}, {"content": "Phase 7.1: Create web/src/ui-controls.ts for play/pause/stop interface", "status": "pending", "priority": "low", "id": "phase-7-1-ui-controls"}, {"content": "Phase 7.2: Update index.html to load TypeScript modules and MIDI interface", "status": "pending", "priority": "low", "id": "phase-7-2-html-typescript-integration"}, {"content": "Phase 7.3: Build and test MIDI input\u2192WASM\u2192audio output pipeline", "status": "pending", "priority": "low", "id": "phase-7-3-end-to-end-midi-test"}, {"content": "Phase 8.1: Test virtual keyboard: 88 keys + GM instruments + CC controls", "status": "pending", "priority": "low", "id": "phase-8-1-virtual-keyboard-test"}, {"content": "Phase 8.2: Test MIDI file loading: multi-track, tempo changes, complex timing", "status": "pending", "priority": "low", "id": "phase-8-2-midi-file-test"}, {"content": "Phase 8.3: INTEGRATION CHECK - Verify MIDI file events affect synthesis parameters", "status": "pending", "priority": "low", "id": "phase-8-3-midi-file-integration"}, {"content": "Phase 8.4: Test with real MIDI hardware device and verify sample-accurate timing", "status": "pending", "priority": "low", "id": "phase-8-4-hardware-midi-test"}]