# Audio Engine

Audio Engine v0.3 is a local-only real-time audio analysis and visualization system.

## Pipeline

```text
Selectable local audio source
           ↓
Web Audio API
           ↓
2048-sample FFT analyzer
           ↓
Spectral-flux onset detector
           ↓
Adaptive threshold + interval history
           ↓
BPM estimate + beat-reactive visualization
```

No captured audio is uploaded or sent to a server.

## Current capabilities

- audio input device discovery
- selectable capture source
- automatic monitor-source hinting
- spectrum / waveform / radial visualization
- RMS and peak amplitude
- dominant-frequency estimate
- spectral-flux onset detection
- adaptive beat threshold
- onset-strength telemetry
- rolling BPM estimate
- beat-reactive visual pulse
- immersive visualization
- local-only processing

## Visualization presets

### PRECISION
Clean technical response with restrained glow.

### PULSE
Higher red emphasis and stronger transient response on detected onsets.

### VOID
Long visual persistence with minimal structure.

All effects are driven by live measured audio frames.

## Controls

```text
1     Spectrum mode
2     Wave mode
3     Radial mode
F     Toggle immersive view
Esc   Exit immersive view
```

## Tempo note

The BPM value is an estimate derived from detected onset intervals. It becomes more stable
after several consistent transients and can still report half-time/double-time relationships
for rhythmically ambiguous material.

## Linux desktop playback

If PipeWire/Pulse exposes a monitor source, select the `MONITOR // ...` device to analyze
desktop playback such as Spotify or YouTube.

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
- preset persistence
- onset visualization history
- Spotify playback metadata and controls
- album art and track context

## v0.4 — Linux media-session integration

AAMUP OS now reads local MPRIS media sessions through `playerctl`.

Supported players depend on the Linux application, but commonly include Spotify,
Firefox, Chromium-based browsers, VLC, and other MPRIS-compatible players.

### Now Playing

The Audio dashboard shows:

- active player
- playback status
- track title
- artist
- album
- playback progress
- previous / play-pause / next controls

This path is local and does not require Spotify OAuth or a Spotify developer application.

### Media commands

```text
media
now
nowplaying
media play-pause
media previous
media next
```
