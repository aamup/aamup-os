import { useEffect, useState } from 'react'

export interface TelemetrySnapshot {
  cpu: number
  memory: number
  disk: number
  network: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const jitter = (value: number, amount: number, min: number, max: number) =>
  clamp(value + (Math.random() - 0.5) * amount, min, max)

export function useDemoTelemetry(): TelemetrySnapshot {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>({
    cpu: 24,
    memory: 38,
    disk: 51,
    network: 7,
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSnapshot((current) => ({
        cpu: jitter(current.cpu, 13, 8, 76),
        memory: jitter(current.memory, 4, 29, 58),
        disk: current.disk,
        network: jitter(current.network, 11, 1, 42),
      }))
    }, 1400)

    return () => window.clearInterval(timer)
  }, [])

  return snapshot
}
