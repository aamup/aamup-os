# Audio Engine

Audio Engine v0.2 is a local-only real-time audio analysis and visualization module.

## Pipeline

```text
Selectable local audio source
           ↓
Web Audio API
           ↓
2048-sample FFT analyzer
           ↓
Spectrum / Wave / Radial visual modes
           ↓
RMS / peak / dominant-frequency telemetry
```

No captured audio is uploaded or sent to a server.

## Current capabilities

- audio input device discovery
- selectable capture source
- automatic monitor-source hinting
- real-time FFT spectrum
- oscilloscope waveform mode
- radial frequency visualization
- RMS amplitude
- peak amplitude
- dominant-frequency estimate
- sample-rate display
- immersive visualization view
- keyboard mode switching
- local-only processing

## Controls

```text
1     Spectrum mode
2     Wave mode
3     Radial mode
F     Toggle immersive view
Esc   Exit immersive view
```

## Linux desktop playback

AAMUP OS checks input labels for monitor/PipeWire/Pulse-style sources. If the host exposes
a desktop monitor as an audio input, it is marked `MONITOR // ...` in the source selector.

Selecting that source can drive the visualizer from desktop playback such as Spotify or YouTube.

Exact source availability depends on the PipeWire/PulseAudio configuration exposed to the WebView.

## Commands

```text
audio
music
visualizer
fft
```

## Next audio milestones

- native PipeWire source enumeration/capture
- persistent preferred source
- beat/onset detection
- visualization presets
- Spotify playback metadata and controls
- album art and track context
