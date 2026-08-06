import { getNewsIntelligence } from '../../modules/news/client'
import { getMarketsIntelligence } from '../../modules/markets/client'
import { getWeatherIntelligence } from '../../modules/weather/client'
import { getGitHubRemoteState } from '../../modules/github/remote'
import { getGitRepositoryState } from '../../modules/github/repository'
import { brand } from '../config/brand'
import type { CommandDefinition } from './types'

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return `${days}d ${hours}h ${minutes}m`
}

export const commandDefinitions: CommandDefinition[] = [
  {
    name: 'help',
    aliases: ['?'],
    description: 'List available AAMUP commands.',
    execute: () => ({
      ok: true,
      output: [
        'COMMANDS :: help | system | status | modules | github | weather | markets | news | audio | version | clear',
        'TIP :: github [local|remote|commits|issues|prs|ci]',
      ],
    }),
  },
  {
    name: 'system',
    aliases: ['sys'],
    description: 'Inspect live native system telemetry.',
    execute: (_args, context) => {
      if (!context.telemetry) {
        return {
          ok: false,
          output: [`NATIVE TELEMETRY :: ${context.telemetryStatus.toUpperCase()}`],
        }
      }

      const t = context.telemetry

      return {
        ok: true,
        output: [
          `HOST :: ${t.hostname} // ${t.osName}`,
          `CPU ${t.cpu.toFixed(1)}% // MEMORY ${t.memory.toFixed(1)}% // DISK ${t.disk.toFixed(1)}%`,
          `PROCESSES ${t.processCount} // UPTIME ${formatUptime(t.uptimeSeconds)}`,
        ],
      }
    },
  },
  {
    name: 'status',
    description: 'Show AAMUP core and module state.',
    execute: (_args, context) => {
      const active = context.modules.filter((module) => module.state !== 'planned').length
      const planned = context.modules.length - active
      const coreState = context.telemetryStatus === 'error' ? 'DEGRADED' : 'NOMINAL'

      return {
        ok: coreState === 'NOMINAL',
        output: [
          `CORE :: ${coreState}`,
          `TELEMETRY :: ${context.telemetryStatus.toUpperCase()}`,
          `MODULES :: ${active} ACTIVE // ${planned} PLANNED // ${context.modules.length} REGISTERED`,
        ],
      }
    },
  },
  {
    name: 'modules',
    aliases: ['mod'],
    description: 'List registered intelligence modules.',
    execute: (_args, context) => ({
      ok: true,
      output: context.modules.map(
        (module) => `${module.shortLabel.padEnd(8, ' ')} :: ${module.state.toUpperCase()}`,
      ),
    }),
  },
  {
    name: 'github',
    aliases: ['git', 'repo'],
    description: 'Inspect local and remote AAMUP OS repository intelligence.',
    usage: 'github [local|remote|commits|issues|prs|ci]',
    execute: async (args) => {
      const mode = args[0]?.toLowerCase() ?? 'summary'

      if (mode === 'local') {
        const repo = await getGitRepositoryState()

        return {
          ok: true,
          output: [
            `LOCAL :: ${repo.branch} @ ${repo.headShort}`,
            `HEAD :: ${repo.headMessage}`,
            `COMMITS ${repo.commitCount} // CHANGED ${repo.changedFiles} // ${repo.clean ? 'CLEAN' : 'DIRTY'}`,
            `SYNC :: AHEAD ${repo.ahead} // BEHIND ${repo.behind}`,
            `ORIGIN :: ${repo.remote ?? 'NOT CONFIGURED'}`,
          ],
        }
      }

      let remote

      try {
        remote = await getGitHubRemoteState()
      } catch (error) {
        const local = await getGitRepositoryState()

        return {
          ok: false,
          output: [
            'GITHUB REMOTE :: UNAVAILABLE',
            `${error}`,
            `LOCAL FALLBACK :: ${local.branch} @ ${local.headShort} // ${local.clean ? 'CLEAN' : 'DIRTY'}`,
          ],
        }
      }

      if (mode === 'commits') {
        return {
          ok: true,
          output: [
            `RECENT COMMITS :: ${remote.repository.fullName}`,
            ...remote.recentCommits.map(
              (commit) => `${commit.sha} :: ${commit.message} // ${commit.author}`,
            ),
          ],
        }
      }

      if (mode === 'issues') {
        return {
          ok: true,
          output: remote.openIssues.length
            ? [
                `OPEN ISSUES :: ${remote.openIssues.length}`,
                ...remote.openIssues.map(
                  (issue) => `#${issue.number} :: ${issue.title}`,
                ),
              ]
            : ['OPEN ISSUES :: 0'],
        }
      }

      if (mode === 'prs') {
        return {
          ok: true,
          output: remote.openPullRequests.length
            ? [
                `OPEN PRS :: ${remote.openPullRequests.length}`,
                ...remote.openPullRequests.map(
                  (pr) => `#${pr.number} :: ${pr.draft ? 'DRAFT // ' : ''}${pr.title}`,
                ),
              ]
            : ['OPEN PRS :: 0'],
        }
      }

      if (mode === 'ci') {
        const workflow = remote.latestWorkflow

        return {
          ok: workflow?.conclusion !== 'failure',
          output: workflow
            ? [
                `CI :: ${workflow.name.toUpperCase()}`,
                `STATE :: ${workflow.status.toUpperCase()} // ${(workflow.conclusion || 'PENDING').toUpperCase()}`,
                `BRANCH :: ${workflow.branch} // EVENT :: ${workflow.event.toUpperCase()}`,
              ]
            : ['CI :: NO WORKFLOW RUNS FOUND'],
        }
      }

      if (mode !== 'summary' && mode !== 'remote') {
        return {
          ok: false,
          output: ['USAGE :: github [local|remote|commits|issues|prs|ci]'],
        }
      }

      const repo = remote.repository
      const workflow = remote.latestWorkflow
      const ci = workflow
        ? `${workflow.status.toUpperCase()}/${(workflow.conclusion || 'PENDING').toUpperCase()}`
        : 'UNKNOWN'

      return {
        ok: true,
        output: [
          `REMOTE :: ${repo.fullName} // ${repo.visibility.toUpperCase()} // ${repo.defaultBranch}`,
          `STARS ${repo.stars} // FORKS ${repo.forks} // OPEN ITEMS ${repo.openItems}`,
          `COMMITS SHOWN ${remote.recentCommits.length} // ISSUES ${remote.openIssues.length} // PRS ${remote.openPullRequests.length}`,
          `CI :: ${ci}`,
          `API :: ${remote.rateLimitRemaining ?? '?'} REQUESTS REMAINING`,
        ],
      }
    },
  },
  {
    name: 'weather',
    aliases: ['wx'],
    description: 'Inspect live weather intelligence.',
    execute: async () => {
      try {
        const weather = await getWeatherIntelligence()
        const current = weather.current
        const today = weather.daily[0]

        return {
          ok: true,
          output: [
            `WEATHER :: ${weather.locationLabel}`,
            `TEMP ${Math.round(current.temperature)}F // FEELS ${Math.round(current.apparentTemperature)}F // HUMIDITY ${Math.round(current.humidity)}%`,
            `WIND ${Math.round(current.windSpeed)} MPH // PRECIP ${current.precipitation.toFixed(2)} IN`,
            `TODAY :: HIGH ${today ? Math.round(today.high) : '?'}F // LOW ${today ? Math.round(today.low) : '?'}F // RAIN ${today ? Math.round(today.precipitationProbability) : '?'}%`,
          ],
        }
      } catch (error) {
        return {
          ok: false,
          output: [
            'WEATHER :: UNAVAILABLE',
            `${error}`,
          ],
        }
      }
    },
  },
  {
    name: 'markets',
    aliases: ['market', 'stocks', 'crypto'],
    description: 'Inspect live market watchlist intelligence.',
    execute: async () => {
      try {
        const markets = await getMarketsIntelligence()

        return {
          ok: true,
          output: [
            `MARKETS :: ${markets.quotes.length} SYMBOLS // ${markets.errors.length} ERRORS`,
            ...markets.quotes.map(
              (quote) =>
                `${quote.symbol.padEnd(7, ' ')} ${quote.price.toFixed(quote.price < 10 ? 3 : 2)} ${quote.currency} // ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
            ),
          ],
        }
      } catch (error) {
        return {
          ok: false,
          output: [
            'MARKETS :: UNAVAILABLE',
            `${error}`,
          ],
        }
      }
    },
  },
  {
    name: 'news',
    aliases: ['headlines', 'feed'],
    description: 'Inspect live news intelligence.',
    usage: 'news [local|ai|tech]',
    execute: async (args) => {
      try {
        const news = await getNewsIntelligence()
        const mode = args[0]?.toLowerCase()
        const category =
          mode === 'local' ? 'LOCAL'
          : mode === 'ai' ? 'AI'
          : mode === 'tech' ? 'TECH'
          : null

        if (mode && category === null) {
          return { ok: false, output: ['USAGE :: news [local|ai|tech]'] }
        }

        const articles = category
          ? news.articles.filter((article) => article.category === category)
          : news.articles

        return {
          ok: true,
          output: [
            `NEWS :: ${articles.length} HEADLINES // ${news.feedCount} FEEDS // ${news.errors.length} ERRORS`,
            ...articles.slice(0, 8).map(
              (article) => `[${article.category}] ${article.title} // ${article.source}`,
            ),
          ],
        }
      } catch (error) {
        return { ok: false, output: ['NEWS :: UNAVAILABLE', `${error}`] }
      }
    },
  },
  {
    name: 'audio',
    aliases: ['music', 'visualizer', 'fft'],
    description: 'Inspect the local Audio Engine.',
    execute: () => ({
      ok: true,
      output: [
        'AUDIO ENGINE :: LOCAL FFT VISUALIZER READY',
        'INPUT :: USER-GESTURE CAPTURE REQUIRED',
        'OPEN AUDIO MODULE // SELECT START INPUT',
        'PIPELINE :: MEDIA INPUT -> WEB AUDIO FFT -> LIVE SPECTRUM/WAVEFORM',
      ],
    }),
  },
  {
    name: 'version',
    aliases: ['ver'],
    description: 'Show AAMUP OS build identity.',
    execute: () => ({
      ok: true,
      output: [
        `${brand.displayName} // V${brand.version}`,
        `${brand.statusLabel} // ${brand.tagline.toUpperCase()}`,
      ],
    }),
  },
  {
    name: 'clear',
    aliases: ['cls'],
    description: 'Clear command output.',
    execute: () => ({
      ok: true,
      output: [],
      clear: true,
    }),
  },
]
