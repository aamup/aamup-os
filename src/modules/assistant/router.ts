import { invoke } from '@tauri-apps/api/core'
import { getGitHubRemoteState } from '../github/remote'
import { getGitRepositoryState } from '../github/repository'
import { getMarketsIntelligence } from '../markets/client'
import { getNewsIntelligence } from '../news/client'
import { getWeatherIntelligence } from '../weather/client'
import {
  getMediaSession,
  mediaControl,
  type MediaAction,
} from '../audio/media'

export type AssistantIntent =
  | 'help'
  | 'weather'
  | 'markets'
  | 'news'
  | 'github'
  | 'system'
  | 'media'
  | 'media-control'
  | 'model'
  | 'unknown'

export interface AssistantResult {
  intent: AssistantIntent
  title: string
  lines: string[]
  ok: boolean
}

interface SystemTelemetry {
  cpu: number
  memory: number
  disk: number
  processCount: number
  uptimeSeconds: number
  hostname: string
  osName: string
}

function normalize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
}

function includesAny(
  value: string,
  terms: string[],
) {
  return terms.some((term) => value.includes(term))
}

function weatherIntent(value: string) {
  return includesAny(value, [
    'weather',
    'temperature',
    'forecast',
    'rain',
    'outside',
  ])
}

function marketIntent(value: string) {
  return includesAny(value, [
    'market',
    'markets',
    'stock',
    'stocks',
    'crypto',
    'bitcoin',
    'ethereum',
    'spy',
    'qqq',
    'nvda',
  ])
}

function newsIntent(value: string) {
  return includesAny(value, [
    'news',
    'headline',
    'headlines',
    'local news',
    'ai news',
    'tech news',
  ])
}

function githubIntent(value: string) {
  return includesAny(value, [
    'github',
    'git ',
    'repo',
    'repository',
    'commit',
    'branch',
    'ci ',
  ])
}

function systemIntent(value: string) {
  return includesAny(value, [
    'system',
    'cpu',
    'memory',
    'disk',
    'process',
    'uptime',
    'computer',
    'machine',
  ])
}

function mediaIntent(value: string) {
  return includesAny(value, [
    'playing',
    'song',
    'track',
    'spotify',
    'media',
    'music',
    'pause',
    'resume',
    'next',
    'previous',
    'skip',
  ])
}

function detectMediaAction(
  value: string,
): MediaAction | null {
  if (
    includesAny(value, [
      'next',
      'skip',
      'skip song',
      'next song',
      'next track',
    ])
  ) {
    return 'next'
  }

  if (
    includesAny(value, [
      'previous',
      'back track',
      'last song',
      'previous song',
    ])
  ) {
    return 'previous'
  }

  if (
    includesAny(value, [
      'pause',
      'resume',
      'play pause',
      'play-pause',
    ])
  ) {
    return 'play-pause'
  }

  return null
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return `${days}d ${hours}h ${minutes}m`
}

async function handleWeather(): Promise<AssistantResult> {
  const weather = await getWeatherIntelligence()
  const current = weather.current
  const today = weather.daily[0]

  return {
    intent: 'weather',
    title: `WEATHER // ${weather.locationLabel}`,
    ok: true,
    lines: [
      `${Math.round(current.temperature)}F // FEELS ${Math.round(current.apparentTemperature)}F`,
      `HUMIDITY ${Math.round(current.humidity)}% // WIND ${Math.round(current.windSpeed)} MPH`,
      today
        ? `TODAY HIGH ${Math.round(today.high)}F // LOW ${Math.round(today.low)}F // RAIN ${Math.round(today.precipitationProbability)}%`
        : 'TODAY // FORECAST UNAVAILABLE',
    ],
  }
}

async function handleMarkets(): Promise<AssistantResult> {
  const markets = await getMarketsIntelligence()

  return {
    intent: 'markets',
    title: 'MARKETS // LIVE WATCHLIST',
    ok: markets.quotes.length > 0,
    lines: markets.quotes.slice(0, 8).map(
      (quote) =>
        `${quote.symbol} ${quote.price.toFixed(quote.price < 10 ? 3 : 2)} ${quote.currency} // ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
    ),
  }
}

async function handleNews(
  value: string,
): Promise<AssistantResult> {
  const news = await getNewsIntelligence()

  const category =
    value.includes('local')
      ? 'LOCAL'
      : value.includes(' ai ') ||
          value.startsWith('ai ') ||
          value.endsWith(' ai') ||
          value.includes('artificial intelligence')
        ? 'AI'
        : value.includes('tech')
          ? 'TECH'
          : null

  const articles = category
    ? news.articles.filter(
        (article) => article.category === category,
      )
    : news.articles

  return {
    intent: 'news',
    title: `NEWS // ${category ?? 'ALL SIGNALS'}`,
    ok: articles.length > 0,
    lines: articles.slice(0, 6).map(
      (article) =>
        `[${article.category}] ${article.title} // ${article.source}`,
    ),
  }
}

async function handleGitHub(): Promise<AssistantResult> {
  const [local, remote] = await Promise.all([
    getGitRepositoryState(),
    getGitHubRemoteState().catch(() => null),
  ])

  const lines = [
    `LOCAL ${local.branch} @ ${local.headShort} // ${local.clean ? 'CLEAN' : 'DIRTY'}`,
    `COMMITS ${local.commitCount} // CHANGED ${local.changedFiles} // AHEAD ${local.ahead} // BEHIND ${local.behind}`,
  ]

  if (remote) {
    const workflow = remote.latestWorkflow

    lines.push(
      `REMOTE ${remote.repository.fullName} // STARS ${remote.repository.stars} // FORKS ${remote.repository.forks}`,
      workflow
        ? `CI ${workflow.status.toUpperCase()} / ${(workflow.conclusion || 'PENDING').toUpperCase()}`
        : 'CI // NO WORKFLOW DATA',
    )
  }

  return {
    intent: 'github',
    title: 'GITHUB // REPOSITORY INTELLIGENCE',
    ok: true,
    lines,
  }
}

async function handleSystem(): Promise<AssistantResult> {
  const telemetry =
    await invoke<SystemTelemetry>('get_system_telemetry')

  return {
    intent: 'system',
    title: `SYSTEM // ${telemetry.hostname}`,
    ok: true,
    lines: [
      telemetry.osName,
      `CPU ${telemetry.cpu.toFixed(1)}% // MEMORY ${telemetry.memory.toFixed(1)}% // DISK ${telemetry.disk.toFixed(1)}%`,
      `PROCESSES ${telemetry.processCount} // UPTIME ${formatUptime(telemetry.uptimeSeconds)}`,
    ],
  }
}

async function handleMedia(
  value: string,
): Promise<AssistantResult> {
  const session = await getMediaSession()
  const action = detectMediaAction(value)

  if (!session.available) {
    return {
      intent: action ? 'media-control' : 'media',
      title: 'MEDIA // OFFLINE',
      ok: false,
      lines: [
        'No active MPRIS media session detected.',
      ],
    }
  }

  if (action) {
    await mediaControl(session.player, action)

    return {
      intent: 'media-control',
      title: `MEDIA // ${action.toUpperCase()}`,
      ok: true,
      lines: [
        `${action.toUpperCase()} sent to ${session.player.toUpperCase()}.`,
      ],
    }
  }

  return {
    intent: 'media',
    title: `NOW PLAYING // ${session.player.toUpperCase()}`,
    ok: true,
    lines: [
      session.title || 'Unknown track',
      session.artist || 'Unknown artist',
      session.album || 'Unknown album',
      `STATE ${session.status.toUpperCase()}`,
    ],
  }
}

function helpResult(): AssistantResult {
  return {
    intent: 'help',
    title: 'ASSISTANT CORE // CAPABILITIES',
    ok: true,
    lines: [
      'Ask about weather, forecasts, rain, or temperature.',
      'Ask for markets, stocks, crypto, or watchlist status.',
      'Ask for local, AI, or technology headlines.',
      'Ask for GitHub, repository, branch, commit, or CI status.',
      'Ask for CPU, memory, disk, processes, or uptime.',
      'Ask what is playing, or say pause / next / previous.',
    ],
  }
}

export async function runAssistantQuery(
  input: string,
): Promise<AssistantResult> {
  const value = ` ${normalize(input)} `

  if (!value.trim()) {
    return helpResult()
  }

  try {
    if (
      value.trim() === 'help' ||
      includesAny(value, [
        ' what can you do ',
        ' capabilities ',
      ])
    ) {
      return helpResult()
    }

    if (weatherIntent(value)) {
      return await handleWeather()
    }

    if (marketIntent(value)) {
      return await handleMarkets()
    }

    if (newsIntent(value)) {
      return await handleNews(value)
    }

    if (githubIntent(value)) {
      return await handleGitHub()
    }

    if (systemIntent(value)) {
      return await handleSystem()
    }

    if (mediaIntent(value)) {
      return await handleMedia(value)
    }

    return {
      intent: 'unknown',
      title: 'ASSISTANT CORE // NO MATCH',
      ok: false,
      lines: [
        'I could not map that request to a local module.',
        'Try: weather, markets, news, GitHub, system, or media.',
      ],
    }
  } catch (error) {
    return {
      intent: 'unknown',
      title: 'ASSISTANT CORE // MODULE ERROR',
      ok: false,
      lines: [String(error)],
    }
  }
}
