/**
 * Mock MIDI Router Implementation
 * 
 * External mock for testing MIDI router functionality without
 * contaminating production code.
 */

use crate::mocks::MockMidiEvent;
use std::collections::{HashMap, VecDeque};

/// Mock MIDI source types for testing
#[derive(Debug, Clone, PartialEq, Hash, Eq)]
pub enum MockMidiSource {
    VirtualKeyboard,
    HardwareInput,
    FilePlayback,
    Test,
}

impl MockMidiSource {
    pub fn priority(&self) -> u8 {
        match self {
            MockMidiSource::HardwareInput => 100,
            MockMidiSource::VirtualKeyboard => 90,
            MockMidiSource::FilePlayback => 80,
            MockMidiSource::Test => 10,
        }
    }

    pub fn name(&self) -> &str {
        match self {
            MockMidiSource::VirtualKeyboard => "virtual-keyboard",
            MockMidiSource::HardwareInput => "hardware-input",
            MockMidiSource::FilePlayback => "file-playback",
            MockMidiSource::Test => "test",
        }
    }
}

/// Mock input source registration
#[derive(Debug, Clone)]
pub struct MockInputSource {
    pub source: MockMidiSource,
    pub name: String,
    pub enabled: bool,
    pub event_count: usize,
}

impl MockInputSource {
    pub fn new(source: MockMidiSource, name: &str) -> Self {
        Self {
            source,
            name: name.to_string(),
            enabled: true,
            event_count: 0,
        }
    }
}

/// Mock processed MIDI event for router output
#[derive(Debug, Clone)]
pub struct MockProcessedEvent {
    pub sample_timestamp: u64,
    pub source: MockMidiSource,
    pub channel: u8,
    pub message_type: u8,
    pub data1: u8,
    pub data2: u8,
}

/// Mock MIDI router for testing
#[derive(Debug)]
pub struct MockMidiRouter {
    pub sources: HashMap<MockMidiSource, MockInputSource>,
    pub event_queue: VecDeque<MockMidiEvent>,
    pub processed_events: Vec<MockProcessedEvent>,
    pub sample_rate: u32,
    pub base_timestamp: u64,
    pub max_queue_size: usize,
    pub dropped_events: usize,
    pub debug_logging: bool,
    pub stats: RouterStats,
}

#[derive(Debug, Clone)]
pub struct RouterStats {
    pub total_events: usize,
    pub events_by_source: HashMap<MockMidiSource, usize>,
    pub average_latency: f64,
    pub current_queue_length: usize,
}

impl MockMidiRouter {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sources: HashMap::new(),
            event_queue: VecDeque::new(),
            processed_events: Vec::new(),
            sample_rate,
            base_timestamp: Self::current_timestamp(),
            max_queue_size: 1000,
            dropped_events: 0,
            debug_logging: false,
            stats: RouterStats {
                total_events: 0,
                events_by_source: HashMap::new(),
                average_latency: 0.0,
                current_queue_length: 0,
            },
        }
    }

    pub fn with_debug_logging(mut self, enabled: bool) -> Self {
        self.debug_logging = enabled;
        self
    }

    pub fn with_max_queue_size(mut self, size: usize) -> Self {
        self.max_queue_size = size;
        self
    }

    /// Register a MIDI input source
    pub fn register_source(&mut self, source: MockMidiSource, name: &str) -> Result<(), String> {
        let input_source = MockInputSource::new(source.clone(), name);
        self.sources.insert(source.clone(), input_source);
        self.stats.events_by_source.insert(source.clone(), 0);
        
        if self.debug_logging {
            println!("MockRouter: Registered source '{}' ({})", name, source.name());
        }
        
        Ok(())
    }

    /// Unregister a MIDI input source
    pub fn unregister_source(&mut self, source: &MockMidiSource) -> Result<(), String> {
        if let Some(input_source) = self.sources.remove(source) {
            if self.debug_logging {
                println!("MockRouter: Unregistered source '{}'", input_source.name);
            }
            Ok(())
        } else {
            Err(format!("Source {:?} not registered", source))
        }
    }

    /// Enable or disable a source
    pub fn set_source_enabled(&mut self, source: &MockMidiSource, enabled: bool) -> Result<(), String> {
        if let Some(input_source) = self.sources.get_mut(source) {
            input_source.enabled = enabled;
            if self.debug_logging {
                println!("MockRouter: Source '{}' {}", 
                    input_source.name, if enabled { "enabled" } else { "disabled" });
            }
            Ok(())
        } else {
            Err(format!("Source {:?} not registered", source))
        }
    }

    /// Check if source is enabled
    pub fn is_source_enabled(&self, source: &MockMidiSource) -> bool {
        self.sources.get(source)
            .map(|s| s.enabled)
            .unwrap_or(false)
    }

    /// Queue a MIDI event from a source
    pub fn queue_event(&mut self, mut event: MockMidiEvent, source: MockMidiSource) -> Result<(), String> {
        // Check if source is registered and enabled
        if !self.is_source_enabled(&source) {
            return Err(format!("Source {:?} not enabled", source));
        }

        // Check queue capacity
        if self.event_queue.len() >= self.max_queue_size {
            self.drop_low_priority_event();
        }

        // Set event source and timestamp
        event.source = source.name().to_string();
        if event.timestamp == 0 {
            event.timestamp = Self::current_timestamp();
        }

        self.event_queue.push_back(event.clone());
        
        // Update statistics
        self.stats.total_events += 1;
        *self.stats.events_by_source.entry(source.clone()).or_insert(0) += 1;
        self.stats.current_queue_length = self.event_queue.len();

        if let Some(input_source) = self.sources.get_mut(&source) {
            input_source.event_count += 1;
        }

        if self.debug_logging {
            println!("MockRouter: Queued {:?} from {:?}", event, source);
        }

        Ok(())
    }

    /// Process all queued events
    pub fn process_events(&mut self) -> Vec<MockProcessedEvent> {
        if self.event_queue.is_empty() {
            return Vec::new();
        }

        let start_time = std::time::Instant::now();

        // Sort events by priority and timestamp
        let mut events: Vec<_> = self.event_queue.drain(..).collect();
        events.sort_by(|a, b| {
            let source_a = self.parse_source(&a.source);
            let source_b = self.parse_source(&b.source);
            
            let priority_cmp = source_b.priority().cmp(&source_a.priority());
            if priority_cmp != std::cmp::Ordering::Equal {
                return priority_cmp;
            }
            
            a.timestamp.cmp(&b.timestamp)
        });

        // Process events
        let mut processed = Vec::new();
        let _current_time = Self::current_timestamp();

        for event in events {
            let source = self.parse_source(&event.source);
            let sample_timestamp = self.convert_to_sample_time(event.timestamp);
            
            let processed_event = MockProcessedEvent {
                sample_timestamp,
                source,
                channel: event.channel,
                message_type: event.message_type,
                data1: event.data1,
                data2: event.data2,
            };

            processed.push(processed_event);
        }

        // Update statistics
        self.processed_events.extend(processed.clone());
        self.stats.current_queue_length = 0;
        
        let processing_time = start_time.elapsed().as_micros() as f64 / 1000.0;
        self.stats.average_latency = (self.stats.average_latency + processing_time) / 2.0;

        if self.debug_logging && !processed.is_empty() {
            println!("MockRouter: Processed {} events in {:.2}ms", 
                processed.len(), processing_time);
        }

        processed
    }

    /// Clear event queue
    pub fn clear_queue(&mut self) {
        let cleared_count = self.event_queue.len();
        self.event_queue.clear();
        self.stats.current_queue_length = 0;
        
        if self.debug_logging && cleared_count > 0 {
            println!("MockRouter: Cleared {} events", cleared_count);
        }
    }

    /// Get router statistics
    pub fn get_stats(&self) -> RouterStats {
        self.stats.clone()
    }

    /// Reset statistics
    pub fn reset_stats(&mut self) {
        self.stats = RouterStats {
            total_events: 0,
            events_by_source: HashMap::new(),
            average_latency: 0.0,
            current_queue_length: self.event_queue.len(),
        };
        
        // Reset source event counts
        for source in self.sources.values_mut() {
            source.event_count = 0;
        }
        
        self.processed_events.clear();
        self.dropped_events = 0;
    }

    /// Get list of registered sources
    pub fn get_sources(&self) -> Vec<MockInputSource> {
        self.sources.values().cloned().collect()
    }

    /// Drop lowest priority event from queue
    fn drop_low_priority_event(&mut self) {
        if self.event_queue.is_empty() {
            return;
        }

        let mut lowest_priority = 255u8;
        let mut drop_index = 0;

        for (i, event) in self.event_queue.iter().enumerate() {
            let source = self.parse_source(&event.source);
            let priority = source.priority();
            
            if priority < lowest_priority {
                lowest_priority = priority;
                drop_index = i;
            }
        }

        if let Some(dropped_event) = self.event_queue.remove(drop_index) {
            self.dropped_events += 1;
            if self.debug_logging {
                println!("MockRouter: Dropped low priority event: {:?}", dropped_event);
            }
        }
    }

    /// Parse source string back to enum
    fn parse_source(&self, source_str: &str) -> MockMidiSource {
        match source_str {
            "virtual-keyboard" => MockMidiSource::VirtualKeyboard,
            "hardware-input" => MockMidiSource::HardwareInput,
            "file-playback" => MockMidiSource::FilePlayback,
            "test" => MockMidiSource::Test,
            _ => MockMidiSource::Test,
        }
    }

    /// Convert timestamp to sample-accurate timing
    fn convert_to_sample_time(&self, timestamp: u64) -> u64 {
        let relative_time = timestamp.saturating_sub(self.base_timestamp);
        let seconds = relative_time as f64 / 1000.0;
        (seconds * self.sample_rate as f64).round() as u64
    }

    /// Get current timestamp in milliseconds
    fn current_timestamp() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }

    /// Simulate processing latency for testing
    pub fn simulate_processing_delay(&self, _duration_ms: u64) {
        // In real tests, this could introduce artificial delay
        // For now, this is just a placeholder
    }
}