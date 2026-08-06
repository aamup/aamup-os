import { useCallback, useEffect, useState } from 'react'
import {
  getMarketsIntelligence,
  type MarketsIntelligence,
} from '../modules/markets/client'

export type MarketsStatus = 'loading' | 'live' | 'degraded' | 'error'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useMarketsIntelligence() {
  const [markets, setMarkets] =
    useState<MarketsIntelligence | null>(null)
  const [status, setStatus] = useState<MarketsStatus>('loading')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await getMarketsIntelligence()
      setMarkets(next)
      setStatus(next.errors.length > 0 ? 'degraded' : 'live')
      setError(next.errors.length > 0
        ? `${next.errors.length} symbol request(s) failed`
        : null)
      setLastUpdated(new Date())
    } catch (reason) {
      setStatus('error')
      setError(String(reason))
      setLastUpdated(new Date())
    }
  }, [])

  useEffect(() => {
    void refresh()

    const timer = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [refresh])

  return {
    markets,
    status,
    lastUpdated,
    error,
    refresh,
  }
}
