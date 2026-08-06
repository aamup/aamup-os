import { invoke } from '@tauri-apps/api/core'

export interface MediaSession {
  available: boolean
  player: string
  status: string
  artist: string
  title: string
  album: string
  artUrl: string
  positionSeconds: number
  durationSeconds: number
}

export type MediaAction =
  | 'play-pause'
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'

export function getMediaSession() {
  return invoke<MediaSession>('get_media_session')
}

export function mediaControl(
  player: string,
  action: MediaAction,
) {
  return invoke<void>('media_control', {
    player,
    action,
  })
}
