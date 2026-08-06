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
    state: 'planned',
    description: 'Current conditions, alerts, and forecast signals.',
  },
  {
    id: 'markets',
    label: 'Market Watch',
    shortLabel: 'MARKETS',
    state: 'planned',
    description: 'User-configurable market and digital asset watchlists.',
  },
  {
    id: 'news',
    label: 'News Intelligence',
    shortLabel: 'NEWS',
    state: 'planned',
    description: 'Local and topic-focused information feeds.',
  },
  {
    id: 'music',
    label: 'Audio Engine',
    shortLabel: 'AUDIO',
    state: 'planned',
    description: 'Playback metadata and real-time visualization pipeline.',
  },
  {
    id: 'assistant',
    label: 'AAMUP Assistant',
    shortLabel: 'ASSIST',
    state: 'planned',
    description: 'Natural-language command and automation interface.',
  },
]
