# AWE Player Memory Management System

**⚠️ CRITICAL: Real-time audio synthesis requires sophisticated memory management to handle large SoundFonts (500MB+) while maintaining zero-allocation guarantee in audio thread.**

## 🎯 **Memory Management Goals**

### **Primary Objectives:**
1. **Zero Audio Thread Allocation** - No memory allocation during synthesis
2. **Large SoundFont Support** - Handle 500MB+ SoundFont files efficiently  
3. **Progressive Loading** - Load samples on-demand to minimize memory footprint
4. **Intelligent Caching** - Keep frequently used samples in memory
5. **Graceful Degradation** - Handle memory pressure without crashing

### **Performance Requirements:**
- **Sample Loading**: <10ms to load individual samples during synthesis pause
- **Cache Hit Rate**: >95% for frequently used samples during active performance
- **Memory Efficiency**: <50% of total SoundFont size resident at any time
- **Voice Startup**: <1ms sample lookup and voice initialization
- **Memory Pressure Response**: <100ms to free memory when system under pressure

## 🏗️ **Memory Architecture Overview**

### **Multi-Tier Memory System:**

```
┌─────────────────────────────────────────────────────────────┐
│                 Memory Management Layers                    │
├─────────────────────────────────────────────────────────────┤
│  Audio Thread Pool    │  Pre-allocated sample buffers      │
│  (Zero Allocation)    │  Static voice memory pools         │
├─────────────────────────────────────────────────────────────┤
│  Hot Sample Cache     │  Frequently accessed samples       │
│  (LRU + Usage Stats)  │  Immediate access (<1μs)          │
├─────────────────────────────────────────────────────────────┤
│  Warm Sample Cache    │  Recently used samples             │
│  (Compressed)         │  Fast decompression (<1ms)        │
├─────────────────────────────────────────────────────────────┤
│  Cold Storage         │  On-demand sample loading          │
│  (SoundFont File)     │  Background streaming (<10ms)     │
└─────────────────────────────────────────────────────────────┘
```

## 💾 **Smart SoundFont Loading System**

### **Progressive SoundFont Loader:**

```rust
// src/memory/soundfont_loader.rs

use std::collections::{HashMap, BTreeMap};
use std::sync::{Arc, Mutex, RwLock};
use std::time::Instant;
use crate::soundfont::{SoundFont, Sample, Preset, Instrument};
use crate::error::MemoryError;

#[derive(Debug, Clone)]
pub struct SampleReference {
    pub sample_id: u32,
    pub offset: u64,              // Offset in SoundFont file
    pub length: u32,              // Sample length in bytes
    pub loop_start: u32,          // Loop start point
    pub loop_end: u32,            // Loop end point
    pub sample_rate: u32,         // Original sample rate
    pub original_key: u8,         // Root key (MIDI note)
    pub priority: SamplePriority, // Loading priority
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SamplePriority {
    Critical,    // Always keep in memory (piano C4, drum samples)
    High,        // Keep in hot cache (commonly used velocity layers)
    Normal,      // Standard caching behavior
    Low,         // Load on-demand only
}

pub struct ProgressiveSoundFontLoader {
    // File handling
    soundfont_data: Arc<Vec<u8>>,
    file_offset_map: HashMap<u32, SampleReference>,
    
    // Memory pools
    hot_cache: Arc<RwLock<SampleCache>>,
    warm_cache: Arc<RwLock<CompressedSampleCache>>,
    audio_thread_pool: Arc<Mutex<AudioThreadMemoryPool>>,
    
    // Loading strategy
    preload_strategy: PreloadStrategy,
    memory_limits: MemoryLimits,
    
    // Statistics
    cache_stats: Arc<Mutex<CacheStatistics>>,
    loading_stats: Arc<Mutex<LoadingStatistics>>,
}

#[derive(Debug)]
pub struct MemoryLimits {
    pub total_memory_mb: usize,
    pub hot_cache_mb: usize,        // 25% of total
    pub warm_cache_mb: usize,       // 25% of total  
    pub audio_pool_mb: usize,       // 10% of total
    pub system_reserve_mb: usize,   // 40% kept free
}

impl Default for MemoryLimits {
    fn default() -> Self {
        Self {
            total_memory_mb: 2048,         // 2GB default
            hot_cache_mb: 512,             // 512MB hot cache
            warm_cache_mb: 512,            // 512MB warm cache
            audio_pool_mb: 204,            // 204MB audio pool
            system_reserve_mb: 820,        // 820MB system reserve
        }
    }
}

impl ProgressiveSoundFontLoader {
    pub fn new(soundfont_data: Vec<u8>, limits: MemoryLimits) -> Result<Self, MemoryError> {
        // Parse SoundFont metadata without loading samples
        let metadata = Self::parse_soundfont_metadata(&soundfont_data)?;
        
        Ok(Self {
            soundfont_data: Arc::new(soundfont_data),
            file_offset_map: metadata.sample_references,
            hot_cache: Arc::new(RwLock::new(SampleCache::new(limits.hot_cache_mb))),
            warm_cache: Arc::new(RwLock::new(CompressedSampleCache::new(limits.warm_cache_mb))),
            audio_thread_pool: Arc::new(Mutex::new(AudioThreadMemoryPool::new(limits.audio_pool_mb))),
            preload_strategy: PreloadStrategy::new(),
            memory_limits: limits,
            cache_stats: Arc::new(Mutex::new(CacheStatistics::new())),
            loading_stats: Arc::new(Mutex::new(LoadingStatistics::new())),
        })
    }

    /// Parse SoundFont file to extract sample metadata without loading sample data
    fn parse_soundfont_metadata(data: &[u8]) -> Result<SoundFontMetadata, MemoryError> {
        let mut offset = 0;
        let mut sample_references = HashMap::new();
        
        // Parse RIFF header
        if &data[0..4] != b"RIFF" || &data[8..12] != b"sfbk" {
            return Err(MemoryError::InvalidSoundFont);
        }
        
        offset = 12;
        
        // Parse chunks to find sample data locations
        while offset < data.len() {
            if offset + 8 > data.len() {
                break;
            }
            
            let chunk_id = &data[offset..offset + 4];
            let chunk_size = u32::from_le_bytes([
                data[offset + 4], data[offset + 5], 
                data[offset + 6], data[offset + 7]
            ]) as usize;
            
            match chunk_id {
                b"sdta" => {
                    // Sample data chunk - record sample locations
                    Self::parse_sample_locations(&data[offset + 8..offset + 8 + chunk_size], 
                                               &mut sample_references)?;
                }
                b"pdta" => {
                    // Preset data chunk - get sample parameters
                    Self::parse_preset_data(&data[offset + 8..offset + 8 + chunk_size], 
                                          &mut sample_references)?;
                }
                _ => {
                    // Skip unknown chunks
                }
            }
            
            offset += 8 + chunk_size;
            if chunk_size % 2 == 1 {
                offset += 1; // RIFF padding
            }
        }
        
        Ok(SoundFontMetadata {
            sample_references,
            total_samples: sample_references.len(),
            estimated_size_mb: data.len() / 1024 / 1024,
        })
    }

    /// Load sample with specified priority and caching strategy
    pub async fn load_sample(&self, sample_id: u32, priority: LoadPriority) -> Result<Arc<SampleData>, MemoryError> {
        // 1. Check hot cache first
        {
            let hot_cache = self.hot_cache.read().unwrap();
            if let Some(sample) = hot_cache.get(sample_id) {
                self.update_cache_stats(CacheHit::Hot);
                return Ok(sample.clone());
            }
        }

        // 2. Check warm cache (compressed)
        {
            let warm_cache = self.warm_cache.read().unwrap();
            if let Some(compressed_sample) = warm_cache.get(sample_id) {
                let sample = self.decompress_sample(compressed_sample)?;
                
                // Promote to hot cache if high priority
                if priority >= LoadPriority::High {
                    let mut hot_cache = self.hot_cache.write().unwrap();
                    hot_cache.insert(sample_id, sample.clone());
                }
                
                self.update_cache_stats(CacheHit::Warm);
                return Ok(sample);
            }
        }

        // 3. Load from file (cold storage)
        self.update_cache_stats(CacheHit::Miss);
        let sample = self.load_sample_from_file(sample_id).await?;
        
        // Cache based on priority
        match priority {
            LoadPriority::Critical | LoadPriority::High => {
                let mut hot_cache = self.hot_cache.write().unwrap();
                hot_cache.insert(sample_id, sample.clone());
            }
            LoadPriority::Normal => {
                let mut warm_cache = self.warm_cache.write().unwrap();
                let compressed = self.compress_sample(&sample)?;
                warm_cache.insert(sample_id, compressed);
            }
            LoadPriority::Low => {
                // Don't cache - load on demand only
            }
        }
        
        Ok(sample)
    }

    /// Preload samples based on current MIDI activity and usage patterns
    pub async fn preload_samples(&self, active_presets: &[u32], note_range: (u8, u8)) -> Result<(), MemoryError> {
        let start_time = Instant::now();
        let mut preload_list = Vec::new();
        
        // Analyze which samples are likely to be needed
        for &preset_id in active_presets {
            let samples = self.get_preset_samples(preset_id, note_range)?;
            for sample_ref in samples {
                preload_list.push((sample_ref.sample_id, sample_ref.priority));
            }
        }
        
        // Sort by priority and load
        preload_list.sort_by_key(|(_, priority)| *priority);
        
        let mut loaded_count = 0;
        for (sample_id, priority) in preload_list {
            if self.should_continue_preloading(&start_time) {
                if let Ok(_) = self.load_sample(sample_id, LoadPriority::from(priority)).await {
                    loaded_count += 1;
                }
            } else {
                break; // Time limit exceeded
            }
        }
        
        crate::log(&format!("Preloaded {} samples in {}ms", 
            loaded_count, start_time.elapsed().as_millis()));
        
        Ok(())
    }

    /// Handle memory pressure by evicting less important samples
    pub fn handle_memory_pressure(&self, pressure_level: MemoryPressureLevel) -> Result<usize, MemoryError> {
        let mut freed_bytes = 0;
        
        match pressure_level {
            MemoryPressureLevel::Low => {
                // Evict least recently used samples from warm cache
                let mut warm_cache = self.warm_cache.write().unwrap();
                freed_bytes += warm_cache.evict_lru(0.25); // Evict 25%
            }
            MemoryPressureLevel::Medium => {
                // Evict from both caches
                let mut warm_cache = self.warm_cache.write().unwrap();
                freed_bytes += warm_cache.evict_lru(0.5); // Evict 50%
                
                let mut hot_cache = self.hot_cache.write().unwrap();
                freed_bytes += hot_cache.evict_non_critical(0.25); // Evict 25% non-critical
            }
            MemoryPressureLevel::High => {
                // Aggressive eviction - keep only critical samples
                let mut warm_cache = self.warm_cache.write().unwrap();
                freed_bytes += warm_cache.clear();
                
                let mut hot_cache = self.hot_cache.write().unwrap();
                freed_bytes += hot_cache.evict_non_critical(0.75); // Keep only 25%
            }
            MemoryPressureLevel::Critical => {
                // Emergency eviction - keep only currently playing samples
                freed_bytes += self.emergency_eviction()?;
            }
        }
        
        crate::log(&format!("Memory pressure {} - freed {}MB", 
            pressure_level.as_str(), freed_bytes / 1024 / 1024));
        
        Ok(freed_bytes)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LoadPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

#[derive(Debug, Clone, Copy)]
pub enum MemoryPressureLevel {
    Low,      // >75% available
    Medium,   // 50-75% available
    High,     // 25-50% available
    Critical, // <25% available
}

impl MemoryPressureLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "LOW",
            Self::Medium => "MEDIUM", 
            Self::High => "HIGH",
            Self::Critical => "CRITICAL",
        }
    }
}
```

## 🚀 **Smart Caching System**

### **Multi-Level Sample Cache:**

```rust
// src/memory/sample_cache.rs

use std::collections::{HashMap, BTreeMap};
use std::sync::{Arc, Weak};
use std::time::{Instant, Duration};
use lz4::{Encoder, Decoder}; // For sample compression

#[derive(Debug, Clone)]
pub struct SampleData {
    pub id: u32,
    pub data: Arc<Vec<i16>>,      // 16-bit sample data
    pub sample_rate: u32,
    pub loop_start: u32,
    pub loop_end: u32,
    pub original_key: u8,
    pub size_bytes: usize,
    pub load_time: Instant,
}

/// Hot cache - uncompressed samples for immediate access
pub struct SampleCache {
    samples: HashMap<u32, Arc<SampleData>>,
    access_times: BTreeMap<Instant, u32>,  // LRU tracking
    usage_count: HashMap<u32, u32>,        // Frequency tracking
    max_size_bytes: usize,
    current_size_bytes: usize,
}

impl SampleCache {
    pub fn new(max_size_mb: usize) -> Self {
        Self {
            samples: HashMap::new(),
            access_times: BTreeMap::new(),
            usage_count: HashMap::new(),
            max_size_bytes: max_size_mb * 1024 * 1024,
            current_size_bytes: 0,
        }
    }

    pub fn get(&mut self, sample_id: u32) -> Option<Arc<SampleData>> {
        if let Some(sample) = self.samples.get(&sample_id) {
            // Update access time and usage count
            let now = Instant::now();
            self.access_times.insert(now, sample_id);
            *self.usage_count.entry(sample_id).or_insert(0) += 1;
            
            Some(sample.clone())
        } else {
            None
        }
    }

    pub fn insert(&mut self, sample_id: u32, sample: Arc<SampleData>) {
        // Make room if necessary
        while self.current_size_bytes + sample.size_bytes > self.max_size_bytes {
            if !self.evict_lru_single() {
                break; // Cache is empty
            }
        }

        // Insert sample
        if let Some(old_sample) = self.samples.insert(sample_id, sample.clone()) {
            self.current_size_bytes -= old_sample.size_bytes;
        }
        
        self.current_size_bytes += sample.size_bytes;
        let now = Instant::now();
        self.access_times.insert(now, sample_id);
        *self.usage_count.entry(sample_id).or_insert(0) += 1;
    }

    pub fn evict_lru(&mut self, fraction: f32) -> usize {
        let target_eviction = (self.current_size_bytes as f32 * fraction) as usize;
        let mut freed_bytes = 0;
        
        // Sort by combined LRU + usage frequency score
        let mut candidates: Vec<_> = self.samples.keys().cloned().collect();
        candidates.sort_by_key(|&id| {
            let usage = self.usage_count.get(&id).unwrap_or(&0);
            let recency_score = self.get_recency_score(id);
            
            // Lower score = higher eviction priority
            recency_score + (*usage as u64 * 1000) // Heavily weight usage frequency
        });
        
        for sample_id in candidates {
            if freed_bytes >= target_eviction {
                break;
            }
            
            if let Some(sample) = self.samples.remove(&sample_id) {
                freed_bytes += sample.size_bytes;
                self.current_size_bytes -= sample.size_bytes;
                self.usage_count.remove(&sample_id);
                
                // Remove from access times (expensive but necessary for accuracy)
                self.access_times.retain(|_, &mut id| id != sample_id);
            }
        }
        
        freed_bytes
    }

    pub fn evict_non_critical(&mut self, fraction: f32) -> usize {
        let target_eviction = (self.current_size_bytes as f32 * fraction) as usize;
        let mut freed_bytes = 0;
        
        // Only evict samples that aren't marked as critical
        let non_critical_samples: Vec<_> = self.samples.iter()
            .filter(|(_, sample)| !self.is_critical_sample(sample))
            .map(|(&id, _)| id)
            .collect();
        
        for sample_id in non_critical_samples {
            if freed_bytes >= target_eviction {
                break;
            }
            
            if let Some(sample) = self.samples.remove(&sample_id) {
                freed_bytes += sample.size_bytes;
                self.current_size_bytes -= sample.size_bytes;
                self.usage_count.remove(&sample_id);
                self.access_times.retain(|_, &mut id| id != sample_id);
            }
        }
        
        freed_bytes
    }

    fn evict_lru_single(&mut self) -> bool {
        if let Some((&oldest_time, &sample_id)) = self.access_times.iter().next() {
            if let Some(sample) = self.samples.remove(&sample_id) {
                self.current_size_bytes -= sample.size_bytes;
                self.usage_count.remove(&sample_id);
                self.access_times.remove(&oldest_time);
                return true;
            }
        }
        false
    }

    fn get_recency_score(&self, sample_id: u32) -> u64 {
        // Find most recent access time for this sample
        self.access_times.iter()
            .rev()
            .find(|(_, &id)| id == sample_id)
            .map(|(time, _)| time.elapsed().as_secs())
            .unwrap_or(u64::MAX)
    }

    fn is_critical_sample(&self, sample: &SampleData) -> bool {
        // Heuristics for critical samples:
        // 1. Piano C4 (middle C) - most commonly used reference note
        // 2. Drum samples (channel 9/10)
        // 3. Highly used samples (usage_count > threshold)
        
        sample.original_key == 60 || // Middle C
        self.usage_count.get(&sample.id).unwrap_or(&0) > &100
    }
}

/// Warm cache - compressed samples for fast decompression
pub struct CompressedSampleCache {
    compressed_samples: HashMap<u32, CompressedSampleData>,
    access_times: BTreeMap<Instant, u32>,
    max_size_bytes: usize,
    current_size_bytes: usize,
}

#[derive(Debug)]
pub struct CompressedSampleData {
    pub id: u32,
    pub compressed_data: Vec<u8>,
    pub original_size: usize,
    pub compression_ratio: f32,
    pub sample_rate: u32,
    pub loop_start: u32,
    pub loop_end: u32,
    pub original_key: u8,
}

impl CompressedSampleCache {
    pub fn new(max_size_mb: usize) -> Self {
        Self {
            compressed_samples: HashMap::new(),
            access_times: BTreeMap::new(),
            max_size_bytes: max_size_mb * 1024 * 1024,
            current_size_bytes: 0,
        }
    }

    pub fn get(&mut self, sample_id: u32) -> Option<&CompressedSampleData> {
        if let Some(sample) = self.compressed_samples.get(&sample_id) {
            let now = Instant::now();
            self.access_times.insert(now, sample_id);
            Some(sample)
        } else {
            None
        }
    }

    pub fn insert(&mut self, sample_id: u32, compressed_sample: CompressedSampleData) {
        // Make room if necessary
        while self.current_size_bytes + compressed_sample.compressed_data.len() > self.max_size_bytes {
            if !self.evict_lru_single() {
                break;
            }
        }

        if let Some(old_sample) = self.compressed_samples.insert(sample_id, compressed_sample) {
            self.current_size_bytes -= old_sample.compressed_data.len();
        }
        
        self.current_size_bytes += self.compressed_samples[&sample_id].compressed_data.len();
        let now = Instant::now();
        self.access_times.insert(now, sample_id);
    }

    pub fn evict_lru(&mut self, fraction: f32) -> usize {
        let target_eviction = (self.current_size_bytes as f32 * fraction) as usize;
        let mut freed_bytes = 0;
        
        // Sort by access time (LRU)
        let mut candidates: Vec<_> = self.access_times.iter()
            .map(|(_, &id)| id)
            .collect();
        candidates.reverse(); // Oldest first
        
        for sample_id in candidates {
            if freed_bytes >= target_eviction {
                break;
            }
            
            if let Some(sample) = self.compressed_samples.remove(&sample_id) {
                freed_bytes += sample.compressed_data.len();
                self.current_size_bytes -= sample.compressed_data.len();
                self.access_times.retain(|_, &mut id| id != sample_id);
            }
        }
        
        freed_bytes
    }

    pub fn clear(&mut self) -> usize {
        let freed_bytes = self.current_size_bytes;
        self.compressed_samples.clear();
        self.access_times.clear();
        self.current_size_bytes = 0;
        freed_bytes
    }

    fn evict_lru_single(&mut self) -> bool {
        if let Some((&oldest_time, &sample_id)) = self.access_times.iter().next() {
            if let Some(sample) = self.compressed_samples.remove(&sample_id) {
                self.current_size_bytes -= sample.compressed_data.len();
                self.access_times.remove(&oldest_time);
                return true;
            }
        }
        false
    }
}
```

## 🔄 **Audio Thread Memory Pool**

### **Zero-Allocation Audio Processing:**

```rust
// src/memory/audio_memory_pool.rs

use std::sync::atomic::{AtomicUsize, Ordering};
use std::ptr::NonNull;
use std::alloc::{Layout, alloc, dealloc};

/// Memory pool for audio thread - pre-allocated blocks to avoid runtime allocation
pub struct AudioThreadMemoryPool {
    // Sample buffer pools (different sizes for different use cases)
    small_buffers: BufferPool<1024>,    // 1KB buffers for short samples
    medium_buffers: BufferPool<8192>,   // 8KB buffers for medium samples  
    large_buffers: BufferPool<65536>,   // 64KB buffers for long samples
    
    // Voice data pools
    voice_data_pool: VoiceDataPool,
    
    // Statistics
    allocations_prevented: AtomicUsize,
    pool_hits: AtomicUsize,
    pool_misses: AtomicUsize,
}

impl AudioThreadMemoryPool {
    pub fn new(max_size_mb: usize) -> Self {
        let bytes_per_mb = 1024 * 1024;
        let total_bytes = max_size_mb * bytes_per_mb;
        
        // Distribute memory across pools
        let small_pool_size = total_bytes / 4;    // 25% for small buffers
        let medium_pool_size = total_bytes / 2;   // 50% for medium buffers
        let large_pool_size = total_bytes / 8;    // 12.5% for large buffers
        let voice_pool_size = total_bytes / 8;    // 12.5% for voice data
        
        Self {
            small_buffers: BufferPool::new(small_pool_size / 1024),
            medium_buffers: BufferPool::new(medium_pool_size / 8192),
            large_buffers: BufferPool::new(large_pool_size / 65536),
            voice_data_pool: VoiceDataPool::new(voice_pool_size),
            allocations_prevented: AtomicUsize::new(0),
            pool_hits: AtomicUsize::new(0),
            pool_misses: AtomicUsize::new(0),
        }
    }

    /// Get pre-allocated buffer for sample data (audio thread safe)
    pub fn get_sample_buffer(&self, size_bytes: usize) -> Option<PooledBuffer> {
        let buffer = if size_bytes <= 1024 {
            self.small_buffers.acquire().map(|b| PooledBuffer::Small(b))
        } else if size_bytes <= 8192 {
            self.medium_buffers.acquire().map(|b| PooledBuffer::Medium(b))
        } else if size_bytes <= 65536 {
            self.large_buffers.acquire().map(|b| PooledBuffer::Large(b))
        } else {
            None // Too large for pool
        };

        if buffer.is_some() {
            self.pool_hits.fetch_add(1, Ordering::Relaxed);
            self.allocations_prevented.fetch_add(1, Ordering::Relaxed);
        } else {
            self.pool_misses.fetch_add(1, Ordering::Relaxed);
        }

        buffer
    }

    /// Get pre-allocated voice data structure
    pub fn get_voice_data(&self) -> Option<PooledVoiceData> {
        if let Some(voice_data) = self.voice_data_pool.acquire() {
            self.pool_hits.fetch_add(1, Ordering::Relaxed);
            self.allocations_prevented.fetch_add(1, Ordering::Relaxed);
            Some(voice_data)
        } else {
            self.pool_misses.fetch_add(1, Ordering::Relaxed);
            None
        }
    }

    /// Return buffer to pool (audio thread safe)
    pub fn return_buffer(&self, buffer: PooledBuffer) {
        match buffer {
            PooledBuffer::Small(b) => self.small_buffers.release(b),
            PooledBuffer::Medium(b) => self.medium_buffers.release(b),
            PooledBuffer::Large(b) => self.large_buffers.release(b),
        }
    }

    /// Return voice data to pool
    pub fn return_voice_data(&self, voice_data: PooledVoiceData) {
        self.voice_data_pool.release(voice_data);
    }

    /// Get pool statistics
    pub fn get_stats(&self) -> MemoryPoolStats {
        MemoryPoolStats {
            allocations_prevented: self.allocations_prevented.load(Ordering::Relaxed),
            pool_hits: self.pool_hits.load(Ordering::Relaxed),
            pool_misses: self.pool_misses.load(Ordering::Relaxed),
            small_buffers_available: self.small_buffers.available_count(),
            medium_buffers_available: self.medium_buffers.available_count(),
            large_buffers_available: self.large_buffers.available_count(),
            voice_data_available: self.voice_data_pool.available_count(),
        }
    }
}

pub enum PooledBuffer {
    Small(Buffer<1024>),
    Medium(Buffer<8192>),
    Large(Buffer<65536>),
}

impl PooledBuffer {
    pub fn as_slice(&self) -> &[u8] {
        match self {
            Self::Small(b) => b.as_slice(),
            Self::Medium(b) => b.as_slice(),
            Self::Large(b) => b.as_slice(),
        }
    }

    pub fn as_mut_slice(&mut self) -> &mut [u8] {
        match self {
            Self::Small(b) => b.as_mut_slice(),
            Self::Medium(b) => b.as_mut_slice(),
            Self::Large(b) => b.as_mut_slice(),
        }
    }
}

/// Lock-free buffer pool for specific buffer size
pub struct BufferPool<const SIZE: usize> {
    buffers: crossbeam::queue::ArrayQueue<Buffer<SIZE>>,
    total_count: usize,
}

impl<const SIZE: usize> BufferPool<SIZE> {
    pub fn new(count: usize) -> Self {
        let buffers = crossbeam::queue::ArrayQueue::new(count);
        
        // Pre-allocate all buffers
        for _ in 0..count {
            if let Ok(_) = buffers.push(Buffer::new()) {
                // Buffer added successfully
            } else {
                break; // Queue full (shouldn't happen)
            }
        }
        
        Self {
            buffers,
            total_count: count,
        }
    }

    pub fn acquire(&self) -> Option<Buffer<SIZE>> {
        self.buffers.pop()
    }

    pub fn release(&self, buffer: Buffer<SIZE>) {
        let _ = self.buffers.push(buffer); // Ignore if queue is full
    }

    pub fn available_count(&self) -> usize {
        self.buffers.len()
    }
}

/// Fixed-size buffer for memory pool
pub struct Buffer<const SIZE: usize> {
    data: [u8; SIZE],
}

impl<const SIZE: usize> Buffer<SIZE> {
    fn new() -> Self {
        Self {
            data: [0; SIZE],
        }
    }

    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }

    pub fn as_mut_slice(&mut self) -> &mut [u8] {
        &mut self.data
    }
}

#[derive(Debug)]
pub struct MemoryPoolStats {
    pub allocations_prevented: usize,
    pub pool_hits: usize,
    pub pool_misses: usize,
    pub small_buffers_available: usize,
    pub medium_buffers_available: usize,
    pub large_buffers_available: usize,
    pub voice_data_available: usize,
}
```

This comprehensive memory management system ensures the EMU8000 emulator can handle large SoundFonts efficiently while maintaining real-time audio performance with zero allocation guarantees in the audio thread.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Design memory management strategy for large SoundFonts", "status": "completed", "priority": "high", "id": "memory-management-strategy"}, {"content": "Design error recovery system for audio thread failures", "status": "pending", "priority": "high", "id": "error-recovery-system"}, {"content": "Design configuration system for hardware capabilities", "status": "pending", "priority": "high", "id": "configuration-system"}, {"content": "Design input validation framework for SoundFont/MIDI parsing", "status": "completed", "priority": "high", "id": "input-validation-framework"}, {"content": "Design performance monitoring system for real-time audio", "status": "completed", "priority": "high", "id": "performance-monitoring-system"}, {"content": "Evaluate additional best practices for EMU8000 project", "status": "completed", "priority": "medium", "id": "best-practices-evaluation"}, {"content": "Design comprehensive testing strategy (unit + stress testing)", "status": "completed", "priority": "high", "id": "testing-strategy-design"}, {"content": "Phase 1.1: Create web/package.json with TypeScript and WebMIDI dependencies", "status": "completed", "priority": "high", "id": "phase-1-1-web-package-json"}, {"content": "Phase 1.2: Create web/tsconfig.json for TypeScript configuration", "status": "completed", "priority": "high", "id": "phase-1-2-web-tsconfig"}, {"content": "Phase 1.3: Add lock-free MIDI event queue interface to src/lib.rs (WASM side)", "status": "completed", "priority": "high", "id": "phase-1-3-wasm-midi-queue"}, {"content": "Phase 1.4: Create TypeScript\u2194WASM bridge for MIDI events with sample-accurate timing", "status": "completed", "priority": "high", "id": "phase-1-4-midi-timing-bridge"}, {"content": "Phase 2.1: Create web/src/virtual-midi-keyboard.ts - 88-key piano interface", "status": "pending", "priority": "medium", "id": "phase-2-1-virtual-midi-keyboard"}, {"content": "Phase 2.2: Add General MIDI instrument selector (128 instruments)", "status": "pending", "priority": "medium", "id": "phase-2-2-gm-instrument-selector"}, {"content": "Phase 2.3: Implement CC controls: pitch bend, modulation wheel, sustain pedal", "status": "pending", "priority": "medium", "id": "phase-2-3-midi-cc-controls"}, {"content": "Phase 2.4: Add keyboard mouse/touch input with velocity sensitivity", "status": "pending", "priority": "medium", "id": "phase-2-4-keyboard-input-handling"}, {"content": "Phase 3.1: Create web/src/midi-input.ts - WebMIDI device discovery and connection", "status": "pending", "priority": "low", "id": "phase-3-1-webmidi-device-discovery"}, {"content": "Phase 3.2: Implement MIDI message parsing and validation in midi-input.ts", "status": "pending", "priority": "low", "id": "phase-3-2-midi-message-parsing"}, {"content": "Phase 3.3: Implement MIDI device state management (connect/disconnect)", "status": "pending", "priority": "low", "id": "phase-3-3-midi-device-management"}, {"content": "Phase 4.1: Add MIDI file parser basics in src/midi/parser.rs", "status": "pending", "priority": "low", "id": "phase-4-1-midi-file-parser"}, {"content": "Phase 4.2: Implement MIDI track parsing and event extraction", "status": "pending", "priority": "low", "id": "phase-4-2-midi-track-parsing"}, {"content": "Phase 4.3: Create web/src/midi-file-loader.ts - drag/drop MIDI file interface", "status": "pending", "priority": "low", "id": "phase-4-3-midi-file-loader"}, {"content": "Phase 4.4: Add MIDI file playback controls: play/pause/stop/seek", "status": "pending", "priority": "low", "id": "phase-4-4-midi-playback-controls"}, {"content": "Phase 5.1: Unified MIDI routing: virtual keyboard + hardware + file playback \u2192 WASM", "status": "pending", "priority": "low", "id": "phase-5-1-unified-midi-routing"}, {"content": "Phase 5.2: Add basic MIDI sequencer structure in src/midi/sequencer.rs", "status": "pending", "priority": "low", "id": "phase-5-2-rust-midi-sequencer"}, {"content": "Phase 5.3: Connect VoiceManager to MIDI events (note_on/note_off)", "status": "pending", "priority": "low", "id": "phase-5-3-midi-voice-connection"}, {"content": "Phase 6.1: INTEGRATION CHECK - Verify MIDI queue integration with VoiceManager", "status": "pending", "priority": "low", "id": "phase-6-1-midi-queue-voice-integration"}, {"content": "Phase 6.2: INTEGRATION CHECK - Verify sequencer timing affects voice envelope timing", "status": "pending", "priority": "low", "id": "phase-6-2-sequencer-voice-timing-integration"}, {"content": "Phase 6.3: INTEGRATION CHECK - Test voice allocation/stealing with MIDI priority", "status": "pending", "priority": "low", "id": "phase-6-3-voice-allocation-midi-integration"}, {"content": "Phase 7.1: Create web/src/ui-controls.ts for play/pause/stop interface", "status": "pending", "priority": "low", "id": "phase-7-1-ui-controls"}, {"content": "Phase 7.2: Update index.html to load TypeScript modules and MIDI interface", "status": "pending", "priority": "low", "id": "phase-7-2-html-typescript-integration"}, {"content": "Phase 7.3: Build and test MIDI input\u2192WASM\u2192audio output pipeline", "status": "pending", "priority": "low", "id": "phase-7-3-end-to-end-midi-test"}, {"content": "Phase 8.1: Test virtual keyboard: 88 keys + GM instruments + CC controls", "status": "pending", "priority": "low", "id": "phase-8-1-virtual-keyboard-test"}, {"content": "Phase 8.2: Test MIDI file loading: multi-track, tempo changes, complex timing", "status": "pending", "priority": "low", "id": "phase-8-2-midi-file-test"}, {"content": "Phase 8.3: INTEGRATION CHECK - Verify MIDI file events affect synthesis parameters", "status": "pending", "priority": "low", "id": "phase-8-3-midi-file-integration"}, {"content": "Phase 8.4: Test with real MIDI hardware device and verify sample-accurate timing", "status": "pending", "priority": "low", "id": "phase-8-4-hardware-midi-test"}]