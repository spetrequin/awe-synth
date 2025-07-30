#[derive(Debug, Clone, Copy)]
pub struct Voice {
    pub note: u8,
    pub velocity: u8,
    pub phase: f64,
    pub is_active: bool,
}

impl Voice {
    pub fn new() -> Self {
        Voice {
            note: 0,
            velocity: 0,
            phase: 0.0,
            is_active: false,
        }
    }
    
    pub fn start_note(&mut self, note: u8, velocity: u8) {
        self.note = note;
        self.velocity = velocity;
        self.phase = 0.0;
        self.is_active = true;
    }
    
    pub fn stop_note(&mut self) {
        self.is_active = false;
    }
}