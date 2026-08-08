import { invoke } from '@tauri-apps/api/core'
import { getGitHubRemoteState } from '../github/remote'
import { getGitRepositoryState } from '../github/repository'
import { getMarketsIntelligence } from '../markets/client'
import { listMemories, type MemoryEntry } from '../memory/client'
import { getNewsIntelligence } from '../news/client'
import { getWeatherIntelligence } from '../weather/client'

export type BriefingSourceStatus = 'online' | 'error'

export interface BriefingWeather {
  status: BriefingSourceStatus
  locationLabel: string
  temperature: number | null
  apparentTemperature: number | null
  high: number | null
  low: number | null
  precipitationProbability: number | null
  error?: string
}

export interface BriefingMarketQuote {
  symbol: string
  price: number
  currency: string
  changePercent: number
}

export interface BriefingMarkets {
  status: BriefingSourceStatus
  quotes: BriefingMarketQuote[]
  error?: string
}

export interface BriefingHeadline {
  category: string
  title: string
  source: string
}

export interface BriefingNews {
  status: BriefingSourceStatus
  headlines: BriefingHeadline[]
  error?: string
}

export interface BriefingGitHub {
  status: BriefingSourceStatus
  branch: string
  headShort: string
  clean: boolean | null
  changedFiles: number | null
  ahead: number | null
  behind: number | null
  remoteRepository: string | null
  ci: string | null
  error?: string
}

export interface BriefingSystem {
  status: BriefingSourceStatus
  hostname: string
  osName: string
  cpu: number | null
  memory: number | null
  disk: number | null
  processCount: number | null
  uptimeSeconds: number | null
  error?: string
}

export interface BriefingMemory {
  status: BriefingSourceStatus
  entries: MemoryEntry[]
  error?: string
}

export interface DailyBriefing {
  generatedAt: string
  sourceCount: number
  healthySources: number
  weather: BriefingWeather
  markets: BriefingMarkets
  news: BriefingNews
  github: BriefingGitHub
  system: BriefingSystem
  memory: BriefingMemory
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

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : String(reason)
}

function formatUptime(seconds: number | null) {
  if (seconds === null) return 'UNKNOWN'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return `${days}d ${hours}h ${minutes}m`
}

export async function getDailyBriefing(): Promise<DailyBriefing> {
  const results = await Promise.allSettled([
    getWeatherIntelligence(),
    getMarketsIntelligence(),
    getNewsIntelligence(),
    Promise.all([
      getGitRepositoryState(),
      getGitHubRemoteState().catch(() => null),
    ]),
    invoke<SystemTelemetry>('get_system_telemetry'),
    listMemories(5),
  ])

  const [
    weatherResult,
    marketsResult,
    newsResult,
    githubResult,
    systemResult,
    memoryResult,
  ] = results

  const weather: BriefingWeather =
    weatherResult.status === 'fulfilled'
      ? {
          status: 'online',
          locationLabel: weatherResult.value.locationLabel,
          temperature: weatherResult.value.current.temperature,
          apparentTemperature:
            weatherResult.value.current.apparentTemperature,
          high: weatherResult.value.daily[0]?.high ?? null,
          low: weatherResult.value.daily[0]?.low ?? null,
          precipitationProbability:
            weatherResult.value.daily[0]?.precipitationProbability ?? null,
        }
      : {
          status: 'error',
          locationLabel: 'UNAVAILABLE',
          temperature: null,
          apparentTemperature: null,
          high: null,
          low: null,
          precipitationProbability: null,
          error: errorMessage(weatherResult.reason),
        }

  const markets: BriefingMarkets =
    marketsResult.status === 'fulfilled'
      ? {
          status: 'online',
          quotes: marketsResult.value.quotes
            .slice(0, 6)
            .map((quote) => ({
              symbol: quote.symbol,
              price: quote.price,
              currency: quote.currency,
              changePercent: quote.changePercent,
            })),
        }
      : {
          status: 'error',
          quotes: [],
          error: errorMessage(marketsResult.reason),
        }

  const news: BriefingNews =
    newsResult.status === 'fulfilled'
      ? {
          status: 'online',
          headlines: newsResult.value.articles
            .slice(0, 5)
            .map((article) => ({
              category: article.category,
              title: article.title,
              source: article.source,
            })),
        }
      : {
          status: 'error',
          headlines: [],
          error: errorMessage(newsResult.reason),
        }

  const github: BriefingGitHub =
    githubResult.status === 'fulfilled'
      ? {
          status: 'online',
          branch: githubResult.value[0].branch,
          headShort: githubResult.value[0].headShort,
          clean: githubResult.value[0].clean,
          changedFiles: githubResult.value[0].changedFiles,
          ahead: githubResult.value[0].ahead,
          behind: githubResult.value[0].behind,
          remoteRepository:
            githubResult.value[1]?.repository.fullName ?? null,
          ci: githubResult.value[1]?.latestWorkflow
            ? `${githubResult.value[1].latestWorkflow.status.toUpperCase()}/${(
                githubResult.value[1].latestWorkflow.conclusion ||
                'PENDING'
              ).toUpperCase()}`
            : null,
        }
      : {
          status: 'error',
          branch: 'UNKNOWN',
          headShort: 'UNKNOWN',
          clean: null,
          changedFiles: null,
          ahead: null,
          behind: null,
          remoteRepository: null,
          ci: null,
          error: errorMessage(githubResult.reason),
        }

  const system: BriefingSystem =
    systemResult.status === 'fulfilled'
      ? {
          status: 'online',
          hostname: systemResult.value.hostname,
          osName: systemResult.value.osName,
          cpu: systemResult.value.cpu,
          memory: systemResult.value.memory,
          disk: systemResult.value.disk,
          processCount: systemResult.value.processCount,
          uptimeSeconds: systemResult.value.uptimeSeconds,
        }
      : {
          status: 'error',
          hostname: 'UNKNOWN',
          osName: 'UNKNOWN',
          cpu: null,
          memory: null,
          disk: null,
          processCount: null,
          uptimeSeconds: null,
          error: errorMessage(systemResult.reason),
        }

  const memory: BriefingMemory =
    memoryResult.status === 'fulfilled'
      ? {
          status: 'online',
          entries: memoryResult.value,
        }
      : {
          status: 'error',
          entries: [],
          error: errorMessage(memoryResult.reason),
        }

  const sourceCount = 6
  const healthySources = [
    weather,
    markets,
    news,
    github,
    system,
    memory,
  ].filter((source) => source.status === 'online').length

  return {
    generatedAt: new Date().toISOString(),
    sourceCount,
    healthySources,
    weather,
    markets,
    news,
    github,
    system,
    memory,
  }
}

export function formatDailyBriefingLines(
  briefing: DailyBriefing,
) {
  const lines: string[] = [
    `SOURCES ${briefing.healthySources}/${briefing.sourceCount} ONLINE`,
  ]

  if (briefing.weather.status === 'online') {
    lines.push(
      `WEATHER // ${briefing.weather.locationLabel} // ${Math.round(briefing.weather.temperature ?? 0)}F // HIGH ${briefing.weather.high !== null ? Math.round(briefing.weather.high) : '?'}F // LOW ${briefing.weather.low !== null ? Math.round(briefing.weather.low) : '?'}F // RAIN ${briefing.weather.precipitationProbability !== null ? Math.round(briefing.weather.precipitationProbability) : '?'}%`,
    )
  } else {
    lines.push('WEATHER // UNAVAILABLE')
  }

  if (briefing.markets.status === 'online') {
    const marketLine = briefing.markets.quotes
      .slice(0, 4)
      .map(
        (quote) =>
          `${quote.symbol} ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
      )
      .join(' // ')

    lines.push(`MARKETS // ${marketLine || 'NO QUOTES'}`)
  } else {
    lines.push('MARKETS // UNAVAILABLE')
  }

  if (briefing.news.status === 'online') {
    const headline = briefing.news.headlines[0]
    lines.push(
      headline
        ? `TOP SIGNAL // [${headline.category}] ${headline.title} // ${headline.source}`
        : 'TOP SIGNAL // NO HEADLINES',
    )
  } else {
    lines.push('NEWS // UNAVAILABLE')
  }

  if (briefing.github.status === 'online') {
    lines.push(
      `GITHUB // ${briefing.github.branch} @ ${briefing.github.headShort} // ${briefing.github.clean ? 'CLEAN' : 'DIRTY'} // AHEAD ${briefing.github.ahead ?? '?'} // BEHIND ${briefing.github.behind ?? '?'} // CI ${briefing.github.ci ?? 'UNKNOWN'}`,
    )
  } else {
    lines.push('GITHUB // UNAVAILABLE')
  }

  if (briefing.system.status === 'online') {
    lines.push(
      `SYSTEM // CPU ${briefing.system.cpu?.toFixed(1) ?? '?'}% // MEMORY ${briefing.system.memory?.toFixed(1) ?? '?'}% // DISK ${briefing.system.disk?.toFixed(1) ?? '?'}% // UPTIME ${formatUptime(briefing.system.uptimeSeconds)}`,
    )
  } else {
    lines.push('SYSTEM // UNAVAILABLE')
  }

  if (briefing.memory.status === 'online') {
    lines.push(
      `MEMORY // ${briefing.memory.entries.length} RECENT RECORDS`,
      ...briefing.memory.entries
        .slice(0, 3)
        .map((entry) => `#${entry.id} ${entry.content}`),
    )
  } else {
    lines.push('MEMORY // UNAVAILABLE')
  }

  return lines
}
