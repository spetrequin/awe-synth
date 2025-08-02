// Effects module - per-voice EMU8000 effects processing

pub mod filter;
pub mod modulation; // Phase 14A - Modulation routing system
pub mod reverb; // Phase 15A - Global reverb with send/return architecture
pub mod chorus; // Phase 15B - Global chorus with send/return architecture