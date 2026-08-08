import type { AamupModule } from '../types/module'

export const modules: AamupModule[] = [
  {
    id: 'system',
    label: 'System Telemetry',
    shortLabel: 'SYSTEM',
    state: 'online',
    description: 'Native CPU, memory, storage, uptime, and process telemetry.',
  },
  {
    id: 'github',
    label: 'GitHub Intelligence',
    shortLabel: 'GITHUB',
    state: 'online',
    description: 'Local branch, commit, working-tree, remote, and sync intelligence.',
  },
  {
    id: 'weather',
    label: 'Weather Intelligence',
    shortLabel: 'WEATHER',
    state: 'online',
    description: 'Native current conditions, hourly outlook, and seven-day forecast signals.',
  },
  {
    id: 'markets',
    label: 'Markets Intelligence',
    shortLabel: 'MARKETS',
    state: 'online',
    description: 'Live equity, ETF, and digital-asset watchlist intelligence.',
  },
  {
    id: 'news',
    label: 'News Intelligence',
    shortLabel: 'NEWS',
    state: 'online',
    description: 'Local and topic-focused information feeds.',
  },
  {
    id: 'music',
    label: 'Audio Engine',
    shortLabel: 'AUDIO',
    state: 'online',
    description: 'Local real-time FFT spectrum and waveform analysis.',
  },
  {
    id: 'memory',
    label: 'Memory Core',
    shortLabel: 'MEMORY',
    state: 'online',
    description: 'Persistent local SQLite memory for facts, preferences, and decisions.',
  },
  {
    id: 'assistant',
    label: 'Assistant Core',
    shortLabel: 'ASSIST',
    state: 'online',
    description: 'Local natural-language routing across live intelligence modules.',
  },
]
