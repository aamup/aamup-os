import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AudioCaptureEngine,
  type AudioFrame,
} from '../modules/audio/engine'

export type AudioEngineStatus =
  | 'idle'
  | 'requesting'
  | 'live'
  | 'error'

export function useAudioEngine() {
  const engineRef = useRef<AudioCaptureEngine | null>(null)
  const [status, setStatus] = useState<AudioEngineStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sampleRate, setSampleRate] = useState(0)

  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioCaptureEngine()
    }

    return engineRef.current
  }, [])

  const start = useCallback(async () => {
    setStatus('requesting')
    setError(null)

    try {
      const engine = ensureEngine()
      await engine.start()
      setSampleRate(engine.sampleRate)
      setStatus('live')
    } catch (reason) {
      setSampleRate(0)
      setStatus('error')
      setError(String(reason))
    }
  }, [ensureEngine])

  const stop = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.stop()
    }

    setSampleRate(0)
    setStatus('idle')
    setError(null)
  }, [])

  const readFrame = useCallback((): AudioFrame | null => {
    return engineRef.current?.readFrame() ?? null
  }, [])

  useEffect(() => {
    return () => {
      void engineRef.current?.stop()
    }
  }, [])

  return {
    status,
    error,
    sampleRate,
    start,
    stop,
    readFrame,
  }
}
