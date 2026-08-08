import { invoke } from '@tauri-apps/api/core'
import {
  formatDailyBriefingLines,
  getDailyBriefing,
} from '../briefing/client'
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
  | 'briefing'
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

type NativeIntent = Exclude<
  AssistantIntent,
  'help' | 'model' | 'unknown'
>

interface IntentCandidate {
  intent: NativeIntent
  score: number
}

const NATIVE_INTENT_THRESHOLD = 6

function normalize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[?!.,:;]/g, ' ')
    .replace(/\s+/g, ' ')
}

function words(value: string) {
  return new Set(value.split(' ').filter(Boolean))
}

function hasAnyWord(wordSet: Set<string>, terms: string[]) {
  return terms.some((term) => wordSet.has(term))
}

function hasAnyPhrase(value: string, phrases: string[]) {
  return phrases.some((phrase) => value.includes(phrase))
}

function isHelpRequest(value: string) {
  return [
    'help',
    'capabilities',
    'what can you do',
    'show capabilities',
  ].includes(value)
}

function detectMediaAction(value: string): MediaAction | null {
  const exactControls: Record<string, MediaAction> = {
    next: 'next',
    skip: 'next',
    previous: 'previous',
    back: 'previous',
    pause: 'play-pause',
    resume: 'play-pause',
    'play pause': 'play-pause',
    'play-pause': 'play-pause',
  }

  const exact = exactControls[value]
  if (exact) return exact

  if (hasAnyPhrase(value, [
    'next song',
    'next track',
    'skip song',
    'skip track',
  ])) return 'next'

  if (hasAnyPhrase(value, [
    'previous song',
    'previous track',
    'last song',
    'back track',
  ])) return 'previous'

  if (hasAnyPhrase(value, [
    'pause music',
    'pause song',
    'resume music',
    'resume song',
  ])) return 'play-pause'

  return null
}

function rankNativeIntent(value: string): IntentCandidate | null {
  const wordSet = words(value)
  const candidates: IntentCandidate[] = []

  if (
    value === 'brief me' ||
    value === 'brief' ||
    hasAnyPhrase(value, [
      'daily brief',
      'daily briefing',
      'morning brief',
      'give me my brief',
      'give me a brief',
    ])
  ) {
    candidates.push({ intent: 'briefing', score: 14 })
  }

  const mediaAction = detectMediaAction(value)
  const mediaTarget = hasAnyWord(wordSet, [
    'song',
    'track',
    'spotify',
    'media',
    'music',
    'audio',
    'player',
  ])
  const mediaQuery = hasAnyPhrase(value, [
    'what is playing',
    "what's playing",
    'now playing',
    'currently playing',
  ])

  if (mediaAction) {
    candidates.push({ intent: 'media-control', score: 12 })
  } else if (mediaQuery) {
    candidates.push({ intent: 'media', score: 11 })
  } else if (
    mediaTarget &&
    hasAnyWord(wordSet, [
      'playing',
      'play',
      'pause',
      'resume',
      'next',
      'previous',
      'skip',
    ])
  ) {
    candidates.push({ intent: 'media', score: 8 })
  }

  if (hasAnyWord(wordSet, [
    'weather',
    'forecast',
    'temperature',
  ])) {
    candidates.push({ intent: 'weather', score: 10 })
  } else if (
    hasAnyWord(wordSet, [
      'rain',
      'snow',
      'precipitation',
      'humidity',
      'wind',
    ]) &&
    hasAnyWord(wordSet, [
      'what',
      'will',
      'is',
      'today',
      'tomorrow',
      'current',
      'outside',
    ])
  ) {
    candidates.push({ intent: 'weather', score: 7 })
  }

  if (hasAnyWord(wordSet, [
    'markets',
    'stocks',
    'crypto',
    'bitcoin',
    'ethereum',
    'spy',
    'qqq',
    'nvda',
  ])) {
    candidates.push({ intent: 'markets', score: 10 })
  } else if (
    hasAnyWord(wordSet, ['market', 'stock']) &&
    hasAnyWord(wordSet, [
      'price',
      'prices',
      'watchlist',
      'today',
      'current',
      'show',
      'check',
    ])
  ) {
    candidates.push({ intent: 'markets', score: 7 })
  }

  if (hasAnyWord(wordSet, [
    'news',
    'headline',
    'headlines',
  ])) {
    candidates.push({ intent: 'news', score: 10 })
  }

  if (
    hasAnyWord(wordSet, [
      'github',
      'repo',
      'repository',
    ]) ||
    value === 'git' ||
    value.startsWith('git ')
  ) {
    candidates.push({ intent: 'github', score: 10 })
  } else if (
    hasAnyWord(wordSet, [
      'commit',
      'commits',
      'branch',
      'ci',
    ]) &&
    hasAnyWord(wordSet, [
      'what',
      'show',
      'current',
      'latest',
      'status',
      'check',
    ])
  ) {
    candidates.push({ intent: 'github', score: 7 })
  }

  if (hasAnyWord(wordSet, [
    'cpu',
    'memory',
    'disk',
    'uptime',
    'process',
    'processes',
    'telemetry',
  ])) {
    candidates.push({ intent: 'system', score: 10 })
  } else if (
    hasAnyWord(wordSet, ['system']) &&
    hasAnyWord(wordSet, [
      'status',
      'health',
      'performance',
      'telemetry',
      'doing',
    ])
  ) {
    candidates.push({ intent: 'system', score: 7 })
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return best && best.score >= NATIVE_INTENT_THRESHOLD
    ? best
    : null
}

async function handleBriefing(): Promise<AssistantResult> {
  const briefing = await getDailyBriefing()

  return {
    intent: 'briefing',
    title: 'DAILY INTELLIGENCE // v0.5',
    ok: briefing.healthySources > 0,
    lines: formatDailyBriefingLines(briefing),
  }
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return `${days}d ${hours}h ${minutes}m`
}

async function handleWeather(
  value: string,
): Promise<AssistantResult> {
  const weather = await getWeatherIntelligence()
  const tomorrowRequested =
    value.includes('tomorrow') ||
    value.includes('next day')

  if (tomorrowRequested) {
    const tomorrow = weather.daily[1]

    return tomorrow
      ? {
          intent: 'weather',
          title: `WEATHER // TOMORROW // ${weather.locationLabel}`,
          ok: true,
          lines: [
            `HIGH ${Math.round(tomorrow.high)}F // LOW ${Math.round(tomorrow.low)}F`,
            `RAIN ${Math.round(tomorrow.precipitationProbability)}%`,
            `SUNRISE ${tomorrow.sunrise.slice(-5)} // SUNSET ${tomorrow.sunset.slice(-5)}`,
          ],
        }
      : {
          intent: 'weather',
          title: `WEATHER // TOMORROW // ${weather.locationLabel}`,
          ok: false,
          lines: ['Tomorrow forecast is unavailable.'],
        }
  }

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
  const wordSet = words(value)
  const news = await getNewsIntelligence()

  const category =
    wordSet.has('local') || wordSet.has('portland')
      ? 'LOCAL'
      : wordSet.has('ai') ||
          value.includes('artificial intelligence')
        ? 'AI'
        : wordSet.has('tech') ||
            wordSet.has('technology')
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
      'Relevant saved memories are automatically supplied to model conversations.',
      'Ask for a grounded daily brief across all live modules.',
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
  const value = normalize(input)

  if (!value || isHelpRequest(value)) {
    return helpResult()
  }

  try {
    const candidate = rankNativeIntent(value)

    switch (candidate?.intent) {
      case 'briefing':
        return await handleBriefing()
      case 'weather':
        return await handleWeather(value)
      case 'markets':
        return await handleMarkets()
      case 'news':
        return await handleNews(value)
      case 'github':
        return await handleGitHub()
      case 'system':
        return await handleSystem()
      case 'media':
      case 'media-control':
        return await handleMedia(value)
      default:
        return {
          intent: 'unknown',
          title: 'ASSISTANT CORE // NO MATCH',
          ok: false,
          lines: [
            'No high-confidence local intent matched this request.',
            'Passing unmatched conversation to the configured model layer.',
          ],
        }
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
