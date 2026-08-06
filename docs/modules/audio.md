# Audio Engine

Audio Engine v0.1 is a local-only real-time visualization module.

## Pipeline

```text
Local audio input
      ↓
Web Audio API
      ↓
2048-sample FFT analyzer
      ↓
72-band spectrum + waveform
      ↓
RMS / peak / dominant-frequency telemetry
```

No captured audio is uploaded or sent to a server.

## Current capabilities

- user-initiated local audio capture
- real-time FFT spectrum
- real-time waveform
- RMS amplitude
- peak amplitude
- dominant-frequency estimate
- sample-rate display
- local-only processing
- start/stop controls

## Linux desktop audio

When a PipeWire or PulseAudio monitor source is exposed as an input device,
selecting that monitor source allows the analyzer to visualize desktop playback.
Availability depends on the host audio configuration and WebView permissions.

## Commands

```text
audio
music
visualizer
fft
```

## Planned

- native PipeWire capture
- input-device selection inside the app
- fullscreen visualization
- multiple visualization modes
- beat/onset detection
- Spotify playback metadata and controls
- album art and track context
