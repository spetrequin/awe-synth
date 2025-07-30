# SoundFont Resources Directory

This directory is for storing SoundFont (.sf2) files used for development and testing.

## Directory Structure

```
resources/sf2/
├── README.md          # This file
├── test/              # Small test SoundFonts for development
├── gm/                # General MIDI compatible SoundFonts
└── samples/           # Individual sample SoundFonts for specific testing
```

## Git Ignore Policy

**All .sf2 files in this directory are ignored by Git** to prevent large binary files from being committed to the repository.

This is configured in `.gitignore`:
```
# SoundFont files - ignore in resources but allow test SoundFonts elsewhere  
/resources/sf2/*.sf2
/resources/sf2/**/*.sf2
```

## Recommended SoundFonts for Development

### Test SoundFonts (Small)
- **FluidR3_GM.sf2** - Basic General MIDI set (~140MB)
- **TimGM6mb.sf2** - Minimal GM set (~6MB) - good for quick testing
- **test_piano.sf2** - Single piano instrument for basic testing

### Full SoundFonts (Large)
- **FluidR3_GS.sf2** - Complete General MIDI/GS set (~240MB)
- **Arachno SoundFont** - High quality GM set (~150MB)
- **Creative Labs AWE32** - Original AWE32 SoundFont for authenticity testing

## Usage Notes

1. **Place your .sf2 files in appropriate subdirectories**
2. **Update your local documentation** with SoundFont sources and licenses
3. **Test with various sizes** - from small (6MB) to large (500MB+) SoundFonts
4. **Verify EMU8000 compatibility** - some modern SoundFonts may use advanced features

## Memory Management Testing

Use this directory to test the memory management system with:
- **Small SoundFonts** (~10MB) - Test basic loading
- **Medium SoundFonts** (~100MB) - Test progressive loading
- **Large SoundFonts** (~500MB+) - Test memory pressure handling
- **Multiple SoundFonts** - Test cache eviction and switching

## Legal Notice

Ensure you have proper licensing rights for any SoundFont files you place in this directory. Many SoundFonts have specific licensing requirements for distribution and use.