import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import type { AudioFrame } from '../modules/audio/engine'
import { BeatDetector } from '../modules/audio/beat'
import {
  audioPresets,
  getAudioPreset,
  type AudioPresetId,
} from '../modules/audio/presets'
import '../styles/audio-dashboard.css'

interface AudioMetrics {
  rms: number
  peak: number
  dominantFrequency: number
  bpm: number | null
  beatStrength: number
}

type VisualMode = 'spectrum' | 'wave' | 'radial'

const EMPTY_METRICS: AudioMetrics = {
  rms: 0,
  peak: 0,
  dominantFrequency: 0,
  bpm: null,
  beatStrength: 0,
}

const visualModes: VisualMode[] = [
  'spectrum',
  'wave',
  'radial',
]

function meter(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)))
}

function frequencyLabel(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kHz`
  }

  return `${Math.round(value)} Hz`
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.strokeStyle = 'rgba(255,255,255,0.035)'
  context.lineWidth = 1

  for (let x = 0; x <= width; x += 36) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }

  for (let y = 0; y <= height; y += 36) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
}

function drawSpectrum(
  context: CanvasRenderingContext2D,
  frame: AudioFrame,
  width: number,
  height: number,
) {
  const bars = 88
  const usableBins = Math.min(frame.frequencies.length, 700)
  const gap = 2
  const barWidth =
    Math.max(1, (width - (bars - 1) * gap) / bars)
  const spectrumHeight = height * 0.76

  for (let index = 0; index < bars; index += 1) {
    const start = Math.floor(index / bars * usableBins)
    const end = Math.max(
      start + 1,
      Math.floor((index + 1) / bars * usableBins),
    )

    let total = 0
    for (let bin = start; bin < end; bin += 1) {
      total += frame.frequencies[bin]
    }

    const amplitude =
      total / Math.max(1, end - start) / 255
    const barHeight =
      Math.max(1, amplitude * spectrumHeight)

    context.fillStyle =
      index % 8 === 0
        ? 'rgba(255,48,79,0.98)'
        : 'rgba(226,226,226,0.78)'

    context.fillRect(
      index * (barWidth + gap),
      height - barHeight,
      barWidth,
      barHeight,
    )
  }
}

function drawWave(
  context: CanvasRenderingContext2D,
  frame: AudioFrame,
  width: number,
  height: number,
) {
  context.strokeStyle = '#ff304f'
  context.lineWidth = 2
  context.shadowColor = 'rgba(255,48,79,0.72)'
  context.shadowBlur = 12
  context.beginPath()

  const step =
    Math.max(1, Math.floor(frame.waveform.length / 520))
  const pointCount =
    Math.ceil(frame.waveform.length / step)

  let point = 0

  for (
    let index = 0;
    index < frame.waveform.length;
    index += step
  ) {
    const x =
      point / Math.max(1, pointCount - 1) * width
    const normalized =
      (frame.waveform[index] - 128) / 128
    const y =
      height / 2 +
      normalized * height * 0.40

    if (point === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }

    point += 1
  }

  context.stroke()
  context.shadowBlur = 0

  context.strokeStyle = 'rgba(255,255,255,0.07)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, height / 2)
  context.lineTo(width, height / 2)
  context.stroke()
}

function drawRadial(
  context: CanvasRenderingContext2D,
  frame: AudioFrame,
  width: number,
  height: number,
) {
  const cx = width / 2
  const cy = height / 2
  const radius =
    Math.min(width, height) * 0.18
  const bars = 128
  const usableBins =
    Math.min(frame.frequencies.length, 720)

  context.save()
  context.translate(cx, cy)

  context.strokeStyle = 'rgba(255,48,79,0.42)'
  context.lineWidth = 1
  context.beginPath()
  context.arc(0, 0, radius, 0, Math.PI * 2)
  context.stroke()

  for (let index = 0; index < bars; index += 1) {
    const bin =
      Math.floor(index / bars * usableBins)
    const amplitude =
      frame.frequencies[bin] / 255
    const angle =
      index / bars * Math.PI * 2 - Math.PI / 2
    const inner = radius
    const outer =
      radius + amplitude * Math.min(width, height) * 0.24

    const x1 = Math.cos(angle) * inner
    const y1 = Math.sin(angle) * inner
    const x2 = Math.cos(angle) * outer
    const y2 = Math.sin(angle) * outer

    context.strokeStyle =
      index % 12 === 0
        ? 'rgba(255,48,79,1)'
        : 'rgba(225,225,225,0.68)'

    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
  }

  const pulse =
    radius * (0.5 + Math.min(1, frame.rms * 5) * 0.35)

  context.fillStyle = 'rgba(255,48,79,0.08)'
  context.beginPath()
  context.arc(0, 0, pulse, 0, Math.PI * 2)
  context.fill()

  context.restore()
}

export function AudioDashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const metricsUpdatedAt = useRef(0)
  const beatDetectorRef = useRef(new BeatDetector())
  const beatPulseRef = useRef(0)

  const {
    status,
    error,
    sampleRate,
    devices,
    selectedDeviceId,
    activeDeviceLabel,
    start,
    stop,
    selectDevice,
    refreshDevices,
    readFrame,
  } = useAudioEngine()

  const [metrics, setMetrics] =
    useState<AudioMetrics>(EMPTY_METRICS)
  const [mode, setMode] =
    useState<VisualMode>('spectrum')
  const [presetId, setPresetId] =
    useState<AudioPresetId>('precision')
  const [immersive, setImmersive] = useState(false)

  const preset = getAudioPreset(presetId)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImmersive(false)
      }

      if (event.key.toLowerCase() === 'f') {
        setImmersive((current) => !current)
      }

      if (event.key === '1') setMode('spectrum')
      if (event.key === '2') setMode('wave')
      if (event.key === '3') setMode('radial')
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    let animationFrame = 0

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width =
        Math.max(1, Math.round(rect.width * dpr))
      const height =
        Math.max(1, Math.round(rect.height * dpr))

      if (
        canvas.width !== width ||
        canvas.height !== height
      ) {
        canvas.width = width
        canvas.height = height
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cssWidth = rect.width
      const cssHeight = rect.height

      context.fillStyle =
        preset.trailAlpha >= 1
          ? '#070707'
          : `rgba(7,7,7,${preset.trailAlpha})`
      context.fillRect(0, 0, cssWidth, cssHeight)
      drawGrid(context, cssWidth, cssHeight)

      const frame = readFrame()

      if (!frame) {
        context.strokeStyle = 'rgba(255,48,79,0.22)'
        context.beginPath()
        context.moveTo(0, cssHeight / 2)
        context.lineTo(cssWidth, cssHeight / 2)
        context.stroke()

        context.fillStyle = 'rgba(255,255,255,0.22)'
        context.font = '10px monospace'
        context.textAlign = 'center'
        context.fillText(
          'LOCAL INPUT DISCONNECTED',
          cssWidth / 2,
          cssHeight / 2 - 16,
        )

        context.fillStyle = 'rgba(255,48,79,0.55)'
        context.fillText(
          'SELECT SOURCE // START INPUT',
          cssWidth / 2,
          cssHeight / 2 + 16,
        )

        animationFrame =
          requestAnimationFrame(render)
        return
      }

      const beat = beatDetectorRef.current.process(
        frame.frequencies,
        time,
      )

      if (beat.onset) {
        beatPulseRef.current = Math.max(
          beatPulseRef.current,
          0.6 + beat.strength * 0.4,
        )
      }

      const pulse = beatPulseRef.current

      if (pulse > 0.01) {
        context.fillStyle =
          `rgba(255,48,79,${pulse * preset.beatFlash})`
        context.fillRect(0, 0, cssWidth, cssHeight)

        context.strokeStyle =
          `rgba(255,48,79,${0.22 + pulse * 0.45})`
        context.lineWidth = 1.5
        context.beginPath()
        context.arc(
          cssWidth / 2,
          cssHeight / 2,
          Math.min(cssWidth, cssHeight) *
            (0.12 + (1 - pulse) * 0.34),
          0,
          Math.PI * 2,
        )
        context.stroke()

        beatPulseRef.current *= 0.90
      }

      if (mode === 'spectrum') {
        drawSpectrum(
          context,
          frame,
          cssWidth,
          cssHeight,
        )
      } else if (mode === 'wave') {
        drawWave(
          context,
          frame,
          cssWidth,
          cssHeight,
        )
      } else {
        drawRadial(
          context,
          frame,
          cssWidth,
          cssHeight,
        )
      }

      if (time - metricsUpdatedAt.current > 100) {
        metricsUpdatedAt.current = time
        setMetrics({
          rms: frame.rms,
          peak: frame.peak,
          dominantFrequency:
            frame.dominantFrequency,
          bpm: beat.bpm,
          beatStrength: beat.onset
            ? Math.max(beat.strength, 0.25)
            : Math.max(0, metrics.beatStrength * 0.82),
        })
      }

      animationFrame =
        requestAnimationFrame(render)
    }

    animationFrame =
      requestAnimationFrame(render)

    return () =>
      cancelAnimationFrame(animationFrame)
  }, [mode, preset, readFrame])

  const statusLabel =
    status === 'live'
      ? 'INPUT LIVE'
      : status === 'requesting'
        ? 'REQUESTING INPUT'
        : status === 'error'
          ? 'INPUT ERROR'
          : 'INPUT IDLE'

  const selectedDevice =
    devices.find(
      (device) =>
        device.deviceId === selectedDeviceId,
    )

  return (
    <main
      className={`audio-dashboard${immersive ? ' audio-dashboard--immersive' : ''}`}
    >
      <header className="audio-dashboard__header">
        <div>
          <span className="audio-eyebrow">
            AUDIO ENGINE / LOCAL FFT
          </span>
          <h1>SPECTRUM CORE</h1>
          <p>
            DEVICE ROUTING / REAL-TIME ANALYSIS / VISUAL MODES
          </p>
        </div>

        <div className="audio-controls">
          <div className={`audio-live audio-live--${status}`}>
            <i />
            {statusLabel}
          </div>

          {status === 'live' ? (
            <button
              type="button"
              onClick={() => void stop()}
            >
              STOP
            </button>
          ) : (
            <button
              type="button"
              disabled={status === 'requesting'}
              onClick={() => void start()}
            >
              START INPUT
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setImmersive((current) => !current)
            }
          >
            {immersive ? 'EXIT VIEW' : 'IMMERSIVE'}
          </button>
        </div>
      </header>

      <section className="audio-kpis audio-kpis--five">
        <article>
          <span>RMS LEVEL</span>
          <strong>{meter(metrics.rms)}%</strong>
          <small>REAL-TIME ENERGY</small>
        </article>

        <article>
          <span>PEAK</span>
          <strong>{meter(metrics.peak)}%</strong>
          <small>INPUT AMPLITUDE</small>
        </article>

        <article>
          <span>DOMINANT</span>
          <strong>
            {metrics.dominantFrequency > 0
              ? frequencyLabel(metrics.dominantFrequency)
              : '—'}
          </strong>
          <small>STRONGEST FFT BIN</small>
        </article>

        <article>
          <span>TEMPO</span>
          <strong>{metrics.bpm ? `${metrics.bpm}` : '—'}</strong>
          <small>BPM ESTIMATE</small>
        </article>

        <article>
          <span>BEAT</span>
          <strong>{meter(metrics.beatStrength)}%</strong>
          <small>ONSET STRENGTH</small>
        </article>
      </section>

      <section className="audio-routing">
        <div className="audio-routing__source">
          <label htmlFor="audio-source">
            AUDIO SOURCE
          </label>

          <select
            id="audio-source"
            value={selectedDeviceId}
            onChange={(event) =>
              void selectDevice(event.target.value)
            }
          >
            {devices.length === 0 ? (
              <option value="">
                DEFAULT INPUT
              </option>
            ) : (
              devices.map((device) => (
                <option
                  key={device.deviceId}
                  value={device.deviceId}
                >
                  {device.isMonitor
                    ? `MONITOR // ${device.label}`
                    : device.label}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={() => void refreshDevices()}
          >
            RESCAN
          </button>
        </div>

        <div className="audio-mode-switcher">
          {visualModes.map((visualMode, index) => (
            <button
              className={
                mode === visualMode
                  ? 'audio-mode-switcher__active'
                  : ''
              }
              key={visualMode}
              type="button"
              onClick={() => setMode(visualMode)}
            >
              {index + 1} // {visualMode.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="audio-preset-switcher">
          {audioPresets.map((item) => (
            <button
              className={
                presetId === item.id
                  ? 'audio-preset-switcher__active'
                  : ''
              }
              key={item.id}
              type="button"
              title={item.description}
              onClick={() => setPresetId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="audio-visualizer">
        <div className="audio-visualizer__labels">
          <span>
            {selectedDevice?.isMonitor
              ? 'DESKTOP MONITOR'
              : 'LOCAL SOURCE'}
          </span>
          <span>
            {mode.toUpperCase()} // {preset.label}
          </span>
          <span>
            F // IMMERSIVE
          </span>
        </div>

        <canvas ref={canvasRef} />

        <div className="audio-visualizer__footer">
          <span>2048 FFT WINDOW</span>
          <span>
            {activeDeviceLabel || selectedDevice?.label || 'NO ACTIVE SOURCE'}
          </span>
          <span>ESC // EXIT</span>
        </div>
      </section>

      {!immersive && (
        <section className="audio-input-note">
          <div>
            <span>DESKTOP ROUTE</span>
            <strong>
              {selectedDevice?.isMonitor
                ? 'MONITOR SOURCE DETECTED'
                : 'INPUT SOURCE SELECTED'}
            </strong>
          </div>

          <p>
            If PipeWire exposes a monitor source, choose the entry marked
            MONITOR to drive the visualizer from Spotify, YouTube, or other
            desktop playback. Otherwise the selected microphone/input is
            analyzed. Processing remains local.
          </p>
        </section>
      )}

      <footer className="audio-dashboard__footer">
        <span>
          PROCESSING // LOCAL ONLY // NO CLOUD TRANSPORT
        </span>
        <span>
          {error
            ? error.toUpperCase()
            : 'FFT ANALYZER v0.2 READY'}
        </span>
      </footer>
    </main>
  )
}
