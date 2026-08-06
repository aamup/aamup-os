import { useCallback, useEffect, useState } from 'react'
import {
  getNewsIntelligence,
  type NewsIntelligence,
} from '../modules/news/client'

export type NewsStatus = 'loading' | 'live' | 'degraded' | 'error'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function useNewsIntelligence() {
  const [news, setNews] = useState<NewsIntelligence | null>(null)
  const [status, setStatus] = useState<NewsStatus>('loading')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await getNewsIntelligence()
      setNews(next)
      setStatus(next.errors.length ? 'degraded' : 'live')
      setError(next.errors.length ? `${next.errors.length} feed request(s) failed` : null)
      setLastUpdated(new Date())
    } catch (reason) {
      setStatus('error')
      setError(String(reason))
      setLastUpdated(new Date())
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { news, status, lastUpdated, error, refresh }
}
