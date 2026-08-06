import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import '../styles/audio-dashboard.css'

interface AudioMetrics {
  rms: number
  peak: number
  dominantFrequency: number
}

const EMPTY_METRICS: AudioMetrics = {
  rms: 0,
  peak: 0,
  dominantFrequency: 0,
}

function meter(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)))
}

function frequencyLabel(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kHz`
  }

  return `${Math.round(value)} Hz`
}

export function AudioDashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const metricsUpdatedAt = useRef(0)
  const {
    status,
    error,
    sampleRate,
    start,
    stop,
    readFrame,
  } = useAudioEngine()

  const [metrics, setMetrics] =
    useState<AudioMetrics>(EMPTY_METRICS)

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

    const drawGrid = (
      width: number,
      height: number,
    ) => {
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

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cssWidth = rect.width
      const cssHeight = rect.height

      context.fillStyle = '#070707'
      context.fillRect(0, 0, cssWidth, cssHeight)
      drawGrid(cssWidth, cssHeight)

      const frame = readFrame()

      if (!frame) {
        context.strokeStyle = 'rgba(255,48,79,0.2)'
        context.beginPath()
        context.moveTo(0, cssHeight * 0.66)
        context.lineTo(cssWidth, cssHeight * 0.66)
        context.stroke()

        context.fillStyle = 'rgba(255,255,255,0.20)'
        context.font = '10px monospace'
        context.textAlign = 'center'
        context.fillText(
          'LOCAL INPUT DISCONNECTED',
          cssWidth / 2,
          cssHeight / 2,
        )

        animationFrame = requestAnimationFrame(render)
        return
      }

      const bars = 72
      const usableBins = Math.min(
        frame.frequencies.length,
        620,
      )
      const barGap = 2
      const barWidth =
        Math.max(1, (cssWidth - (bars - 1) * barGap) / bars)
      const spectrumHeight = cssHeight * 0.62

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
          index % 6 === 0
            ? 'rgba(255,48,79,0.96)'
            : 'rgba(220,220,220,0.78)'

        context.fillRect(
          index * (barWidth + barGap),
          spectrumHeight - barHeight,
          barWidth,
          barHeight,
        )
      }

      const waveformTop = cssHeight * 0.68
      const waveformHeight = cssHeight * 0.24

      context.strokeStyle = '#ff304f'
      context.lineWidth = 1.35
      context.shadowColor = 'rgba(255,48,79,0.5)'
      context.shadowBlur = 6
      context.beginPath()

      const step =
        Math.max(1, Math.floor(frame.waveform.length / 420))

      let point = 0

      for (
        let index = 0;
        index < frame.waveform.length;
        index += step
      ) {
        const x =
          point /
          Math.max(1, Math.ceil(frame.waveform.length / step) - 1) *
          cssWidth

        const normalized =
          (frame.waveform[index] - 128) / 128

        const y =
          waveformTop +
          waveformHeight / 2 +
          normalized * waveformHeight * 0.45

        if (point === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }

        point += 1
      }

      context.stroke()
      context.shadowBlur = 0

      if (time - metricsUpdatedAt.current > 100) {
        metricsUpdatedAt.current = time
        setMetrics({
          rms: frame.rms,
          peak: frame.peak,
          dominantFrequency: frame.dominantFrequency,
        })
      }

      animationFrame = requestAnimationFrame(render)
    }

    animationFrame = requestAnimationFrame(render)

    return () => cancelAnimationFrame(animationFrame)
  }, [readFrame])

  const statusLabel =
    status === 'live'
      ? 'INPUT LIVE'
      : status === 'requesting'
        ? 'REQUESTING INPUT'
        : status === 'error'
          ? 'INPUT ERROR'
          : 'INPUT IDLE'

  return (
    <main className="audio-dashboard">
      <header className="audio-dashboard__header">
        <div>
          <span className="audio-eyebrow">
            AUDIO ENGINE / LOCAL FFT
          </span>
          <h1>SPECTRUM CORE</h1>
          <p>
            REAL-TIME INPUT / FREQUENCY ANALYSIS / WAVEFORM
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
        </div>
      </header>

      <section className="audio-kpis">
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
          <span>SAMPLE RATE</span>
          <strong>
            {sampleRate
              ? `${(sampleRate / 1000).toFixed(1)}k`
              : '—'}
          </strong>
          <small>HZ / LOCAL INPUT</small>
        </article>
      </section>

      <section className="audio-visualizer">
        <div className="audio-visualizer__labels">
          <span>20 HZ</span>
          <span>FREQUENCY SPECTRUM</span>
          <span>20 KHZ</span>
        </div>

        <canvas ref={canvasRef} />

        <div className="audio-visualizer__footer">
          <span>72-BAND DISPLAY</span>
          <span>2048 FFT WINDOW</span>
          <span>LIVE WAVEFORM</span>
        </div>
      </section>

      <section className="audio-input-note">
        <div>
          <span>INPUT ROUTE</span>
          <strong>
            {status === 'live'
              ? 'LOCAL CAPTURE ACTIVE'
              : 'SELECT START INPUT'}
          </strong>
        </div>

        <p>
          Uses the local Web Audio input only. On Linux, a PipeWire
          monitor source can be selected as the input route when available
          to visualize desktop playback without sending audio to a server.
        </p>
      </section>

      <footer className="audio-dashboard__footer">
        <span>
          PROCESSING // LOCAL ONLY // NO CLOUD TRANSPORT
        </span>
        <span>
          {error
            ? error.toUpperCase()
            : 'FFT ANALYZER READY'}
        </span>
      </footer>
    </main>
  )
}
