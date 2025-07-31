use crate::error::AweError;
use crate::midi::parser::{MidiFile, MidiEvent, MidiEventType, MetaEventType};

/// Playback state for the MIDI sequencer
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PlaybackState {
    Stopped,
    Playing,
    Paused,
}

/// MIDI sequencer for real-time playback of MIDI files
pub struct MidiSequencer {
    /// The loaded MIDI file
    midi_file: Option<MidiFile>,
    
    /// Current playback state
    state: PlaybackState,
    
    /// Current playback position in ticks
    current_tick: u64,
    
    /// Playback start position in ticks (for seek)
    seek_tick: u64,
    
    /// Ticks per quarter note from MIDI file
    ticks_per_quarter: u16,
    
    /// Current tempo in microseconds per quarter note
    current_tempo: u32,
    
    /// Tempo multiplier (1.0 = original speed, 2.0 = double speed)
    tempo_multiplier: f64,
    
    /// Sample rate for timing calculations
    sample_rate: f64,
    
    /// Current sample position (for precise timing)
    current_sample: u64,
    
    /// Sample position when playback started
    playback_start_sample: u64,
    
    /// Track event indices for each track (optimization)
    track_event_indices: Vec<usize>,
    
    /// Duration of the MIDI file in ticks
    duration_ticks: u64,
    
    /// Duration in seconds (calculated)
    duration_seconds: f64,
}

impl MidiSequencer {
    /// Create a new MIDI sequencer
    pub fn new(sample_rate: f64) -> Self {
        crate::log("MidiSequencer::new() - Creating MIDI sequencer");
        
        Self {
            midi_file: None,
            state: PlaybackState::Stopped,
            current_tick: 0,
            seek_tick: 0,
            ticks_per_quarter: 480, // Default value
            current_tempo: 500_000, // Default 120 BPM (500,000 microseconds per quarter)
            tempo_multiplier: 1.0,
            sample_rate,
            current_sample: 0,
            playback_start_sample: 0,
            track_event_indices: Vec::new(),
            duration_ticks: 0,
            duration_seconds: 0.0,
        }
    }
    
    /// Load a MIDI file into the sequencer
    pub fn load_midi_file(&mut self, data: &[u8]) -> Result<(), AweError> {
        crate::log("MidiSequencer::load_midi_file() - Loading MIDI file");
        
        let midi_file = MidiFile::parse(data)?;
        
        // Initialize track indices
        self.track_event_indices = vec![0; midi_file.tracks.len()];
        
        // Set timing parameters
        self.ticks_per_quarter = midi_file.division;
        self.current_tempo = 500_000; // Reset to default 120 BPM
        self.tempo_multiplier = 1.0;
        
        // Calculate duration
        self.calculate_duration(&midi_file);
        
        crate::log(&format!("MIDI file loaded: {} tracks, {} ticks/quarter, {:.1}s duration", 
            midi_file.tracks.len(), self.ticks_per_quarter, self.duration_seconds));
        
        self.midi_file = Some(midi_file);
        self.reset_playback_position();
        
        Ok(())
    }
    
    /// Start playback from current position
    pub fn play(&mut self, current_sample: u64) {
        if self.midi_file.is_none() {
            crate::log("Cannot play: No MIDI file loaded");
            return;
        }
        
        match self.state {
            PlaybackState::Stopped => {
                crate::log("Starting playback from beginning");
                self.playback_start_sample = current_sample;
                self.current_sample = current_sample;
                self.state = PlaybackState::Playing;
            },
            PlaybackState::Paused => {
                crate::log("Resuming playback");
                // Adjust start sample to account for paused time
                let paused_samples = current_sample - self.current_sample;
                self.playback_start_sample += paused_samples;
                self.current_sample = current_sample;
                self.state = PlaybackState::Playing;
            },
            PlaybackState::Playing => {
                crate::log("Already playing");
            }
        }
    }
    
    /// Pause playback at current position
    pub fn pause(&mut self, current_sample: u64) {
        if self.state == PlaybackState::Playing {
            crate::log("Pausing playback");
            self.current_sample = current_sample;
            self.state = PlaybackState::Paused;
        }
    }
    
    /// Stop playback and reset to beginning
    pub fn stop(&mut self) {
        crate::log("Stopping playback");
        self.state = PlaybackState::Stopped;
        self.reset_playback_position();
    }
    
    /// Seek to a specific position (0.0 to 1.0)
    pub fn seek(&mut self, position: f64, current_sample: u64) {
        let position = position.clamp(0.0, 1.0);
        self.seek_tick = (position * self.duration_ticks as f64) as u64;
        self.current_tick = self.seek_tick;
        
        crate::log(&format!("Seeking to position {:.1}% (tick {})", position * 100.0, self.seek_tick));
        
        // Reset track indices to find events at new position
        self.reset_track_indices_for_seek();
        
        // If playing, adjust timing
        if self.state == PlaybackState::Playing {
            self.playback_start_sample = current_sample;
            self.current_sample = current_sample;
        }
    }
    
    /// Set tempo multiplier (1.0 = original, 2.0 = double speed)
    pub fn set_tempo_multiplier(&mut self, multiplier: f64) {
        let old_multiplier = self.tempo_multiplier;
        self.tempo_multiplier = multiplier.clamp(0.25, 4.0); // 25% to 400% speed
        
        crate::log(&format!("Tempo multiplier changed: {:.2} → {:.2}", old_multiplier, self.tempo_multiplier));
    }
    
    /// Get current playback state
    pub fn get_state(&self) -> PlaybackState {
        self.state
    }
    
    /// Get current position as a percentage (0.0 to 1.0)
    pub fn get_position(&self) -> f64 {
        if self.duration_ticks == 0 {
            return 0.0;
        }
        (self.current_tick as f64 / self.duration_ticks as f64).clamp(0.0, 1.0)
    }
    
    /// Get current position in seconds
    pub fn get_position_seconds(&self) -> f64 {
        self.get_position() * self.duration_seconds
    }
    
    /// Get total duration in seconds
    pub fn get_duration_seconds(&self) -> f64 {
        self.duration_seconds
    }
    
    /// Get current tempo in BPM
    pub fn get_current_tempo_bpm(&self) -> f64 {
        (60_000_000.0 / self.current_tempo as f64) * self.tempo_multiplier
    }
    
    /// Get original tempo in BPM (without multiplier)
    pub fn get_original_tempo_bpm(&self) -> f64 {
        60_000_000.0 / self.current_tempo as f64
    }
    
    /// Process MIDI events for the current sample buffer
    /// Returns events that should be triggered
    pub fn process(&mut self, current_sample: u64, _buffer_size: usize) -> Vec<ProcessedMidiEvent> {
        if self.state != PlaybackState::Playing || self.midi_file.is_none() {
            return Vec::new();
        }
        
        let mut events = Vec::new();
        self.current_sample = current_sample;
        
        // Calculate current tick based on elapsed samples
        let samples_elapsed = current_sample - self.playback_start_sample;
        let seconds_elapsed = samples_elapsed as f64 / self.sample_rate;
        
        // Convert seconds to ticks using current tempo and multiplier
        let effective_tempo = self.current_tempo as f64 / self.tempo_multiplier;
        let quarters_elapsed = seconds_elapsed * 1_000_000.0 / effective_tempo;
        let ticks_elapsed = quarters_elapsed * self.ticks_per_quarter as f64;
        
        let target_tick = self.seek_tick + ticks_elapsed as u64;
        
        // Process events between current_tick and target_tick
        if let Some(ref midi_file) = self.midi_file {
            for (track_idx, track) in midi_file.tracks.iter().enumerate() {
                while self.track_event_indices[track_idx] < track.events.len() {
                    let event = &track.events[self.track_event_indices[track_idx]];
                    
                    if event.absolute_time <= target_tick {
                        // Convert MIDI event to processed event directly (avoiding mutable borrow)
                        if let Some(processed_event) = Self::convert_midi_event(event, &mut self.current_tempo) {
                            events.push(processed_event);
                        }
                        self.track_event_indices[track_idx] += 1;
                    } else {
                        break;
                    }
                }
            }
        }
        
        self.current_tick = target_tick;
        
        // Check if we've reached the end
        if self.current_tick >= self.duration_ticks {
            crate::log("Reached end of MIDI file");
            self.stop();
        }
        
        events
    }
    
    /// Reset playback position to beginning
    fn reset_playback_position(&mut self) {
        self.current_tick = 0;
        self.seek_tick = 0;
        self.current_sample = 0;
        self.playback_start_sample = 0;
        self.track_event_indices.fill(0);
    }
    
    /// Reset track indices for seeking
    fn reset_track_indices_for_seek(&mut self) {
        if let Some(ref midi_file) = self.midi_file {
            for (track_idx, track) in midi_file.tracks.iter().enumerate() {
                // Find the first event at or after the seek position
                let mut event_idx = 0;
                for (idx, event) in track.events.iter().enumerate() {
                    if event.absolute_time >= self.seek_tick {
                        event_idx = idx;
                        break;
                    }
                }
                self.track_event_indices[track_idx] = event_idx;
            }
        }
    }
    
    /// Calculate the total duration of the MIDI file
    fn calculate_duration(&mut self, midi_file: &MidiFile) {
        let mut max_tick = 0u64;
        
        for track in &midi_file.tracks {
            if let Some(last_event) = track.events.last() {
                max_tick = max_tick.max(last_event.absolute_time);
            }
        }
        
        self.duration_ticks = max_tick;
        
        // Calculate approximate duration in seconds (using default tempo)
        let quarters = max_tick as f64 / self.ticks_per_quarter as f64;
        self.duration_seconds = quarters * (self.current_tempo as f64 / 1_000_000.0);
        
        crate::log(&format!("MIDI duration calculated: {} ticks, {:.1} seconds", 
            self.duration_ticks, self.duration_seconds));
    }
    
    /// Convert a MIDI event to a processed event (static method to avoid borrowing issues)
    fn convert_midi_event(event: &MidiEvent, current_tempo: &mut u32) -> Option<ProcessedMidiEvent> {
        match &event.event_type {
            MidiEventType::NoteOn { channel, note, velocity } => {
                Some(ProcessedMidiEvent {
                    sample_offset: 0, // TODO: Calculate precise sample offset within buffer
                    event_type: ProcessedEventType::NoteOn {
                        channel: *channel,
                        note: *note,
                        velocity: *velocity,
                    },
                })
            },
            MidiEventType::NoteOff { channel, note, velocity } => {
                Some(ProcessedMidiEvent {
                    sample_offset: 0,
                    event_type: ProcessedEventType::NoteOff {
                        channel: *channel,
                        note: *note,
                        velocity: *velocity,
                    },
                })
            },
            MidiEventType::ProgramChange { channel, program } => {
                Some(ProcessedMidiEvent {
                    sample_offset: 0,
                    event_type: ProcessedEventType::ProgramChange {
                        channel: *channel,
                        program: *program,
                    },
                })
            },
            MidiEventType::ControlChange { channel, controller, value } => {
                Some(ProcessedMidiEvent {
                    sample_offset: 0,
                    event_type: ProcessedEventType::ControlChange {
                        channel: *channel,
                        controller: *controller,
                        value: *value,
                    },
                })
            },
            MidiEventType::MetaEvent(MetaEventType::SetTempo { microseconds_per_quarter }) => {
                // Update current tempo
                *current_tempo = *microseconds_per_quarter;
                let bpm = 60_000_000.0 / *microseconds_per_quarter as f64;
                crate::log(&format!("Tempo change: {} BPM", bpm));
                None // Meta events don't generate output
            },
            _ => {
                // Other events not processed yet
                None
            }
        }
    }
}

/// Processed MIDI event ready for synthesis
#[derive(Debug, Clone)]
pub struct ProcessedMidiEvent {
    /// Sample offset within the current buffer
    pub sample_offset: usize,
    /// The processed event type
    pub event_type: ProcessedEventType,
}

/// Types of processed MIDI events
#[derive(Debug, Clone)]
pub enum ProcessedEventType {
    NoteOn { channel: u8, note: u8, velocity: u8 },
    NoteOff { channel: u8, note: u8, velocity: u8 },
    ProgramChange { channel: u8, program: u8 },
    ControlChange { channel: u8, controller: u8, value: u8 },
}