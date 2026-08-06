import { useCallback, useEffect, useState } from 'react'
import {
  getGitHubRemoteState,
  type GitHubRemoteState,
} from '../modules/github/remote'
import {
  getGitRepositoryState,
  type GitRepositoryState,
} from '../modules/github/repository'

export type GitHubIntelligenceStatus =
  | 'loading'
  | 'live'
  | 'degraded'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function useGitHubIntelligence() {
  const [remote, setRemote] = useState<GitHubRemoteState | null>(null)
  const [local, setLocal] = useState<GitRepositoryState | null>(null)
  const [status, setStatus] =
    useState<GitHubIntelligenceStatus>('loading')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setStatus((current) => current === 'live' ? 'live' : 'loading')

    const [localResult, remoteResult] = await Promise.allSettled([
      getGitRepositoryState(),
      getGitHubRemoteState(),
    ])

    if (localResult.status === 'fulfilled') {
      setLocal(localResult.value)
    }

    if (remoteResult.status === 'fulfilled') {
      setRemote(remoteResult.value)
      setStatus('live')
      setError(null)
    } else {
      setStatus('degraded')
      setError(String(remoteResult.reason))
    }

    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    void refresh()

    const timer = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [refresh])

  return {
    remote,
    local,
    status,
    lastUpdated,
    error,
    refresh,
  }
}
