# AWE Player User Guide

## Welcome to AWE Player! 🎵

AWE Player is a browser-based EMU8000 synthesizer emulator that brings the authentic sound of Creative Sound Blaster AWE32/64 cards to your web browser. Experience classic MIDI playback with authentic SoundFont 2.0 synthesis.

## 🚀 Quick Start

### Getting Started in 3 Steps

1. **Open AWE Player** in your web browser
2. **Load a SoundFont** file (.sf2) by dragging and dropping
3. **Play MIDI files** or use your MIDI keyboard

That's it! You're ready to make music with authentic EMU8000 synthesis.

### First Time Setup

#### System Requirements
- **Browser**: Chrome 67+, Edge 79+, Safari 14.1+, Firefox 89+
- **Memory**: 4GB RAM recommended (8GB for large SoundFonts)
- **Audio**: Sound card or USB audio interface
- **MIDI** (optional): USB MIDI keyboard or interface

#### Browser Permissions
AWE Player may request these permissions:
- **Microphone**: For audio analysis features (optional)
- **MIDI**: To access connected MIDI devices (optional)

Click "Allow" when prompted to enable full functionality.

## 🎹 Basic Usage

### Loading SoundFonts

#### Method 1: Drag & Drop
1. Download a SoundFont (.sf2) file
2. Drag the file onto the AWE Player window
3. Wait for loading to complete
4. Ready to play!

#### Method 2: File Browser
1. Click the "Load SoundFont" button
2. Browse and select your .sf2 file
3. Click "Open"
4. Wait for parsing and loading

#### Recommended SoundFonts
- **FluidSynth GM** (142MB) - Excellent all-around collection
- **TimGM6mb** (5.7MB) - Compact, high-quality GM set
- **Crisis GM** (34MB) - Detailed General MIDI instruments

### Playing MIDI Files

#### Loading MIDI Files
1. Click "Load MIDI File"
2. Select a .mid or .midi file
3. Use playback controls:
   - ▶️ **Play** - Start playback
   - ⏸️ **Pause** - Pause playback
   - ⏹️ **Stop** - Stop and reset
   - ⏭️ **Seek** - Jump to position

#### MIDI Playback Features
- **Multi-track support** - Complex MIDI arrangements
- **Tempo control** - Adjust playback speed
- **Channel visualization** - See which channels are active
- **Real-time effects** - Reverb and chorus processing

### Using MIDI Keyboards

#### Connecting Your Keyboard
1. Connect USB MIDI keyboard to computer
2. Open AWE Player
3. Click "Scan MIDI Devices"
4. Select your keyboard from the list
5. Start playing!

#### MIDI Features
- **32-voice polyphony** - Play complex chords and passages
- **Velocity sensitivity** - Dynamic expression
- **Sustain pedal** - Natural piano playing
- **Program changes** - Switch instruments
- **Real-time effects** - Reverb, chorus, and filtering

## 🎛️ Interface Guide

### Main Controls

#### Transport Controls
- **⏮️ Previous** - Previous MIDI file or preset
- **▶️ Play/Pause** - Start/pause MIDI playback  
- **⏹️ Stop** - Stop playback and reset position
- **⏭️ Next** - Next MIDI file or preset
- **🔄 Loop** - Loop current MIDI file

#### Volume & Effects
- **Master Volume** - Overall output level
- **Reverb Send** - Add spacious reverb effect
- **Chorus Send** - Add rich chorus effect
- **Low-Pass Filter** - Warm, analog-style filtering

#### Information Panel
- **Current Instrument** - Selected GM program
- **Polyphony** - Active voices (max 32)
- **CPU Usage** - Real-time performance monitor
- **Memory Usage** - SoundFont memory consumption

### Settings Panel

#### Audio Settings
- **Sample Rate**: 44.1kHz (recommended)
- **Buffer Size**: 512 samples (adjust for latency)
- **Audio Device**: Select output device

#### MIDI Settings  
- **Input Device**: Choose MIDI keyboard
- **Channel**: Select MIDI channel (1-16)
- **Velocity Curve**: Adjust touch sensitivity

#### Display Settings
- **Theme**: Light or dark interface
- **Visualizations**: Enable spectrum analyzer
- **Debug Info**: Show technical details

## 🎵 Musical Features

### Instrument Selection

#### General MIDI Programs
AWE Player supports all 128 General MIDI instruments:

**Piano Family (1-8)**
- Acoustic Grand Piano, Bright Piano, Electric Grand, etc.

**Chromatic Percussion (9-16)**  
- Celesta, Glockenspiel, Music Box, Vibraphone, etc.

**Organ Family (17-24)**
- Drawbar Organ, Percussive Organ, Rock Organ, etc.

**Guitar Family (25-32)**
- Acoustic Guitar, Electric Guitar, Distortion Guitar, etc.

**Bass Family (33-40)**
- Acoustic Bass, Electric Bass, Fretless Bass, etc.

**Strings (41-48)**
- Violin, Viola, Cello, Contrabass, Harp, etc.

**Ensemble (49-56)**
- String Ensemble, Brass Section, Choir, etc.

**Brass (57-64)**
- Trumpet, Trombone, Tuba, French Horn, etc.

**Reed (65-72)**
- Soprano Sax, Clarinet, Oboe, Bassoon, etc.

**Pipe (73-80)**
- Piccolo, Flute, Pan Flute, Blown Bottle, etc.

**Synth Lead (81-88)**
- Sawtooth, Square Wave, Calliope, etc.

**Synth Pad (89-96)**
- Warm Pad, Polysynth, Choir Pad, etc.

**Synth Effects (97-104)**
- Rain, Soundtrack, Crystal, Atmosphere, etc.

**Ethnic (105-112)**
- Sitar, Banjo, Shamisen, Koto, etc.

**Percussive (113-120)**
- Tinkle Bell, Agogo, Steel Drums, etc.

**Sound Effects (121-128)**
- Guitar Fret Noise, Seashore, Bird Tweet, etc.

### Drum Kits

#### Standard Drum Map (Channel 10)
- **Kick Drums**: C1, C#1
- **Snare Drums**: D1, E1
- **Hi-Hats**: F#1, G#1, A#1
- **Toms**: A1, B1, C2, D2, F2, G2
- **Cymbals**: C#2, D#2, F#2, G#2, A#2
- **Percussion**: Various ethnic and orchestral percussion

### Effects Processing

#### Reverb System
- **Type**: Multi-tap delay reverb (EMU8000 style)
- **Controls**: Send level per voice
- **Character**: Warm, spacious digital reverb
- **Range**: 0-127 (MIDI standard)

#### Chorus System  
- **Type**: Modulated delay chorus
- **Controls**: Send level per voice
- **Character**: Rich, shimmering modulation
- **Range**: 0-127 (MIDI standard)

#### Low-Pass Filter
- **Type**: 24dB/octave resonant filter
- **Range**: 100Hz - 8kHz (EMU8000 spec)
- **Resonance**: 0-960 centibels
- **Modulation**: LFO and envelope control

## 🔧 Advanced Features

### SoundFont Management

#### SoundFont Browser
- **Library View**: Browse loaded SoundFonts
- **Preset List**: View available instruments
- **Sample Inspector**: Examine individual samples
- **Memory Monitor**: Track memory usage

#### SoundFont Optimization
- **Auto-Loading**: Load samples on demand
- **Memory Cleanup**: Automatic garbage collection
- **Quality Settings**: Balance quality vs. performance
- **Streaming Mode**: Handle large SoundFonts efficiently

### MIDI Recording

#### Recording Features
- **Real-time Recording**: Capture MIDI input
- **Multi-track**: Record multiple MIDI channels
- **Overdub**: Layer additional parts
- **Export**: Save as standard MIDI files

#### Recording Controls
1. Click **Record** button
2. Play your MIDI keyboard
3. Click **Stop** to finish
4. **Save** or **Export** your recording

### Performance Optimization

#### CPU Optimization
- **Voice Limiting**: Automatic 32-voice management
- **Dynamic Loading**: Load samples as needed
- **Efficient Mixing**: Optimized audio processing
- **Smart Caching**: Keep frequently used samples in memory

#### Memory Management
- **Progressive Loading**: Stream large SoundFonts
- **Automatic Cleanup**: Free unused samples
- **Memory Monitoring**: Real-time usage display
- **Cache Optimization**: Smart sample management

## 🎛️ Keyboard Shortcuts

### Playback Control
- **Spacebar** - Play/Pause
- **Enter** - Stop
- **← →** - Seek backward/forward
- **↑ ↓** - Volume up/down

### MIDI Control
- **1-8** - Select octave
- **Q-I** - Play notes (piano layout)
- **Z-M** - Play notes (lower octave)
- **Shift** - Sustain/hold notes

### Interface
- **Tab** - Switch between panels
- **Escape** - Close dialogs
- **F11** - Toggle fullscreen
- **Ctrl+O** - Open file dialog

## 🚨 Troubleshooting

### Common Issues

#### No Sound Output
**Problem**: AWE Player loads but produces no audio
**Solutions**:
1. Check system volume and audio device
2. Try clicking "Start Audio" if required
3. Check browser audio permissions
4. Verify SoundFont is loaded correctly
5. Test with different audio buffer size

#### SoundFont Won't Load
**Problem**: Error loading .sf2 files
**Solutions**:
1. Verify file is valid SoundFont 2.0 format
2. Check available system memory (need 2x file size)
3. Try smaller SoundFont file first
4. Close other browser tabs to free memory
5. Refresh page and try again

#### MIDI Keyboard Not Detected
**Problem**: Connected MIDI keyboard doesn't appear
**Solutions**:
1. Check USB connection
2. Install device drivers if needed
3. Grant MIDI permissions in browser
4. Click "Scan MIDI Devices" to refresh
5. Try different USB port

#### High Latency/Lag
**Problem**: Delay between key press and sound
**Solutions**:
1. Reduce audio buffer size (256 or 128 samples)
2. Close other applications
3. Use ASIO drivers on Windows
4. Check CPU usage in task manager
5. Try smaller SoundFont files

#### Browser Compatibility
**Problem**: AWE Player doesn't work in your browser
**Solutions**:
1. Use Chrome, Edge, or Safari (recommended)
2. Update browser to latest version
3. Enable WebAssembly support
4. Clear browser cache and cookies
5. Disable browser extensions temporarily

### Performance Tips

#### Optimize for Low Latency
1. Use **256 samples** buffer size
2. Close unnecessary browser tabs
3. Use **dedicated audio interface** if available
4. Adjust **CPU performance** settings
5. Choose **smaller SoundFonts** for real-time use

#### Handle Large SoundFonts
1. Ensure **8GB+ system RAM** available
2. Close other applications before loading
3. Use **progressive loading** when available
4. Monitor **memory usage** in AWE Player
5. Consider using **streaming mode**

## 📱 Mobile Usage

### Supported Devices
- **iOS**: Safari 14.1+ on iPhone/iPad
- **Android**: Chrome 67+ on modern devices
- **Performance**: Better on tablets than phones
- **Memory**: Requires 4GB+ device RAM

### Mobile Limitations
- **WebMIDI**: Limited browser support
- **File Access**: Restricted file system access
- **Audio Latency**: Higher than desktop
- **CPU Power**: May struggle with complex SoundFonts

### Mobile Tips
1. Use **smaller SoundFonts** (under 50MB)
2. Close **other apps** before use
3. Keep device **plugged in** for best performance
4. Use **headphones** for better audio quality
5. Enable **"Do Not Disturb"** to prevent interruptions

## 🎯 Best Practices

### For Musicians
1. **Start with General MIDI** SoundFonts for compatibility
2. **Use sustain pedal** for expressive piano playing
3. **Experiment with effects** sends for different sounds
4. **Record MIDI** performances for playback and editing
5. **Layer instruments** using different MIDI channels

### For Developers
1. **Monitor memory usage** when loading large SoundFonts
2. **Use streaming mode** for very large files
3. **Test across browsers** for compatibility
4. **Optimize for target devices** (mobile vs desktop)
5. **Cache frequently used** SoundFonts locally

### For Content Creators
1. **Choose appropriate SoundFonts** for your genre
2. **Balance quality vs file size** based on audience
3. **Test playback** across different devices
4. **Provide fallback options** for unsupported browsers
5. **Document MIDI file requirements** for users

## 📚 Additional Resources

### SoundFont Libraries
- **FreePats**: Free General MIDI SoundFonts
- **FluidSynth**: High-quality free SoundFonts
- **Personal Copy**: Classical music SoundFonts
- **Timbres of Heaven**: Comprehensive orchestral collection

### MIDI Resources
- **MIDI.org**: Official MIDI specifications
- **GM Standard**: General MIDI instrument list
- **Free MIDI Files**: Public domain MIDI collections
- **MIDI Tools**: Editing and conversion software

### Community
- **GitHub**: Source code and issues
- **Discord**: Community chat and support
- **YouTube**: Tutorials and demonstrations
- **Wiki**: Detailed technical documentation

## 🆘 Getting Help

### Self-Help Resources
1. **Check this User Guide** for common questions
2. **Review troubleshooting section** for known issues
3. **Test with different files** to isolate problems
4. **Check browser console** for error messages
5. **Try incognito/private mode** to test clean environment

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Discord Server**: Chat with other users and developers
- **Stack Overflow**: Technical questions and answers
- **Reddit**: Community discussions and tips

### Contact Information
- **Email**: support@aweplayer.com
- **GitHub**: https://github.com/spetrequin/awe-synth
- **Website**: https://aweplayer.com
- **Documentation**: https://docs.aweplayer.com

---

**Welcome to the AWE Player community!** 🎵

Whether you're a musician, developer, or music enthusiast, AWE Player brings the authentic sound of EMU8000 synthesis to your fingertips. Start exploring the rich world of SoundFont synthesis and MIDI music today!

*Last Updated: August 2025 | Version 1.0 | User Guide v1.0*