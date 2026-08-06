import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  getMediaSession,
  mediaControl,
  type MediaAction,
  type MediaSession,
} from '../modules/audio/media'

const POLL_INTERVAL_MS = 2000

export function useMediaSession() {
  const [session, setSession] =
    useState<MediaSession | null>(null)
  const [error, setError] =
    useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await getMediaSession()
      setSession(next)
      setError(null)
    } catch (reason) {
      setError(String(reason))
    }
  }, [])

  const control = useCallback(
    async (action: MediaAction) => {
      if (!session?.available || !session.player) {
        return
      }

      try {
        await mediaControl(session.player, action)
        window.setTimeout(() => {
          void refresh()
        }, 150)
      } catch (reason) {
        setError(String(reason))
      }
    },
    [refresh, session],
  )

  useEffect(() => {
    void refresh()

    const timer = window.setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [refresh])

  return {
    session,
    error,
    refresh,
    control,
  }
}
