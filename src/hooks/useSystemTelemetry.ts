import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

export interface TelemetrySnapshot {
  cpu: number
  memory: number
  disk: number
  processCount: number
  uptimeSeconds: number
  hostname: string
  osName: string
}

export type TelemetryStatus = 'connecting' | 'live' | 'error'

export function useSystemTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null)
  const [status, setStatus] = useState<TelemetryStatus>('connecting')

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const snapshot = await invoke<TelemetrySnapshot>(
          'get_system_telemetry',
        )

        if (!active) return

        setTelemetry(snapshot)
        setStatus('live')
      } catch (error) {
        if (!active) return

        console.error('Native telemetry unavailable:', error)
        setStatus('error')
      }
    }

    void refresh()

    const timer = window.setInterval(() => {
      void refresh()
    }, 1500)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  return {
    telemetry,
    status,
  }
}
