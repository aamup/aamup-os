import { useCallback, useEffect, useState } from 'react'
import {
  getWeatherIntelligence,
  type WeatherIntelligence,
} from '../modules/weather/client'

export type WeatherStatus = 'loading' | 'live' | 'error'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

export function useWeatherIntelligence() {
  const [weather, setWeather] =
    useState<WeatherIntelligence | null>(null)
  const [status, setStatus] = useState<WeatherStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await getWeatherIntelligence()
      setWeather(next)
      setStatus('live')
      setError(null)
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
    weather,
    status,
    error,
    lastUpdated,
    refresh,
  }
}
