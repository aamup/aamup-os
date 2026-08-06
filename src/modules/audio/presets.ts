export type AudioPresetId =
  | 'precision'
  | 'pulse'
  | 'void'

export interface AudioPreset {
  id: AudioPresetId
  label: string
  description: string
  accentEvery: number
  trailAlpha: number
  glow: number
  beatFlash: number
}

export const audioPresets: AudioPreset[] = [
  {
    id: 'precision',
    label: 'PRECISION',
    description: 'Clean technical response with restrained glow.',
    accentEvery: 8,
    trailAlpha: 1,
    glow: 6,
    beatFlash: 0.08,
  },
  {
    id: 'pulse',
    label: 'PULSE',
    description: 'Beat-reactive red emphasis and stronger transient glow.',
    accentEvery: 4,
    trailAlpha: 0.88,
    glow: 16,
    beatFlash: 0.22,
  },
  {
    id: 'void',
    label: 'VOID',
    description: 'Minimal field with long motion persistence.',
    accentEvery: 12,
    trailAlpha: 0.24,
    glow: 10,
    beatFlash: 0.12,
  },
]

export function getAudioPreset(id: AudioPresetId) {
  return audioPresets.find((preset) => preset.id === id) ?? audioPresets[0]
}
