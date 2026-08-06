import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  AudioCaptureEngine,
  listAudioInputDevices,
  type AudioFrame,
  type AudioInputDevice,
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
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [activeDeviceLabel, setActiveDeviceLabel] = useState('')

  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioCaptureEngine()
    }

    return engineRef.current
  }, [])

  const refreshDevices = useCallback(async () => {
    try {
      const next = await listAudioInputDevices()
      setDevices(next)

      setSelectedDeviceId((current) => {
        if (current && next.some((device) => device.deviceId === current)) {
          return current
        }

        const monitor = next.find((device) => device.isMonitor)
        return monitor?.deviceId ?? next[0]?.deviceId ?? ''
      })
    } catch {
      setDevices([])
    }
  }, [])

  const start = useCallback(
    async (deviceId?: string) => {
      setStatus('requesting')
      setError(null)

      try {
        const engine = ensureEngine()
        const targetDeviceId = deviceId ?? selectedDeviceId

        await engine.start(targetDeviceId || undefined)

        setSampleRate(engine.sampleRate)
        setActiveDeviceLabel(engine.activeDeviceLabel || 'LOCAL AUDIO INPUT')
        setStatus('live')

        await refreshDevices()

        const actualDeviceId = engine.activeDeviceId
        if (actualDeviceId) {
          setSelectedDeviceId(actualDeviceId)
        }
      } catch (reason) {
        setSampleRate(0)
        setActiveDeviceLabel('')
        setStatus('error')
        setError(String(reason))
      }
    },
    [ensureEngine, refreshDevices, selectedDeviceId],
  )

  const stop = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.stop()
    }

    setSampleRate(0)
    setActiveDeviceLabel('')
    setStatus('idle')
    setError(null)
  }, [])

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId)

      if (status === 'live') {
        await start(deviceId)
      }
    },
    [start, status],
  )

  const readFrame = useCallback((): AudioFrame | null => {
    return engineRef.current?.readFrame() ?? null
  }, [])

  useEffect(() => {
    void refreshDevices()

    const mediaDevices = navigator.mediaDevices
    const handleDeviceChange = () => {
      void refreshDevices()
    }

    mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)

    return () => {
      mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
      void engineRef.current?.stop()
    }
  }, [refreshDevices])

  return {
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
  }
}
