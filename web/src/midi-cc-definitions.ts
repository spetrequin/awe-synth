/**
 * MIDI CC Control Definitions
 * Part of AWE Player EMU8000 Emulator
 */

import { MIDI_CC, MIDI_VALUES } from './midi-constants.js';

export interface CCControl {
    cc: number;
    name: string;
    type: 'slider' | 'knob' | 'button';
    min: number;
    max: number;
    default: number;
    bipolar?: boolean; // For pitch bend style controls
    category?: string;
}

// Main CC Control Definitions
export const CC_CONTROL_DEFINITIONS: CCControl[] = [
    // Performance Controls
    {
        cc: -1, // Special case for pitch bend
        name: 'Pitch Bend',
        type: 'slider',
        min: MIDI_VALUES.PITCH_BEND_MIN,
        max: MIDI_VALUES.PITCH_BEND_MAX,
        default: MIDI_VALUES.PITCH_BEND_CENTER,
        bipolar: true,
        category: 'performance'
    },
    {
        cc: MIDI_CC.MODULATION_WHEEL,
        name: 'Modulation',
        type: 'slider',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 0,
        category: 'performance'
    },
    {
        cc: MIDI_CC.SUSTAIN_PEDAL,
        name: 'Sustain Pedal',
        type: 'button',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 0,
        category: 'performance'
    },
    
    // Mix Controls
    {
        cc: MIDI_CC.CHANNEL_VOLUME,
        name: 'Volume',
        type: 'slider',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 100,
        category: 'mix'
    },
    {
        cc: MIDI_CC.PAN,
        name: 'Pan',
        type: 'knob',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 64,
        bipolar: true,
        category: 'mix'
    },
    {
        cc: MIDI_CC.EXPRESSION,
        name: 'Expression',
        type: 'slider',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 127,
        category: 'mix'
    },
    
    // Effects
    {
        cc: MIDI_CC.REVERB_SEND,
        name: 'Reverb',
        type: 'knob',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 40,
        category: 'effects'
    },
    {
        cc: MIDI_CC.CHORUS_SEND,
        name: 'Chorus',
        type: 'knob',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 0,
        category: 'effects'
    },
    {
        cc: MIDI_CC.SOUND_CONTROLLER_5,
        name: 'Brightness',
        type: 'knob',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 64,
        category: 'effects'
    },
    
    // Envelope Controls
    {
        cc: MIDI_CC.SOUND_CONTROLLER_3,
        name: 'Release Time',
        type: 'knob',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 64,
        category: 'envelope'
    },
    {
        cc: MIDI_CC.SOUND_CONTROLLER_4,
        name: 'Attack Time',
        type: 'knob',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 64,
        category: 'envelope'
    },
    {
        cc: MIDI_CC.PORTAMENTO_ON_OFF,
        name: 'Portamento',
        type: 'button',
        min: MIDI_VALUES.MIN,
        max: MIDI_VALUES.MAX,
        default: 0,
        category: 'envelope'
    }
];

// Control Groups for UI Organization
export const CONTROL_GROUPS = {
    performance: {
        title: 'Performance Controls',
        controls: CC_CONTROL_DEFINITIONS.filter(c => c.category === 'performance')
    },
    mix: {
        title: 'Effects & Mix',
        controls: CC_CONTROL_DEFINITIONS.filter(c => c.category === 'mix' || c.category === 'effects')
    },
    envelope: {
        title: 'Sound Shaping',
        controls: CC_CONTROL_DEFINITIONS.filter(c => c.category === 'envelope')
    }
} as const;

// Quick Access Methods
export const getControlByCC = (ccNumber: number): CCControl | undefined => 
    CC_CONTROL_DEFINITIONS.find(control => control.cc === ccNumber);

export const getControlsByType = (type: CCControl['type']): CCControl[] => 
    CC_CONTROL_DEFINITIONS.filter(control => control.type === type);

export const getControlsByCategory = (category: string): CCControl[] => 
    CC_CONTROL_DEFINITIONS.filter(control => control.category === category);

// Common Control Presets
export const QUICK_SELECT_CONTROLS = {
    piano: { volume: 100, pan: 64, reverb: 20, chorus: 0 },
    organ: { volume: 90, pan: 64, reverb: 40, chorus: 10 },
    guitar: { volume: 85, pan: 45, reverb: 30, chorus: 15 },
    bass: { volume: 95, pan: 55, reverb: 10, chorus: 0 },
    strings: { volume: 80, pan: 64, reverb: 50, chorus: 20 },
    brass: { volume: 90, pan: 64, reverb: 25, chorus: 5 },
    pad: { volume: 70, pan: 64, reverb: 70, chorus: 30 },
    lead: { volume: 95, pan: 64, reverb: 20, chorus: 10 }
} as const;