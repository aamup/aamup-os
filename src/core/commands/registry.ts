import {
  formatDailyBriefingLines,
  getDailyBriefing,
} from '../../modules/briefing/client'
import {
  getEmbeddingStatus,
} from '../../modules/memory/embeddings'
import {
  recallRelevantMemories,
} from '../../modules/memory/retrieval'
import {
  forgetMemory,
  listMemories,
  rememberMemory,
  searchMemories,
} from '../../modules/memory/client'
import { getAssistantModelStatus } from '../../modules/assistant/model'
import { runAssistantSessionQuery } from '../../modules/assistant/session'
import { getMediaSession, mediaControl } from '../../modules/audio/media'
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
        'COMMANDS :: help | system | status | modules | github | weather | markets | news | audio | media | brief | memory | recall | embedding | remember | forget | ask | model | version | clear',
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
    name: 'media',
    aliases: ['now', 'nowplaying'],
    description: 'Inspect or control the active Linux MPRIS media session.',
    usage: 'media [play-pause|next|previous]',
    execute: async (args) => {
      const session = await getMediaSession()

      if (!session.available) {
        return {
          ok: false,
          output: ['MEDIA :: NO ACTIVE MPRIS PLAYER'],
        }
      }

      const action = args[0]?.toLowerCase()

      if (
        action === 'play-pause' ||
        action === 'next' ||
        action === 'previous'
      ) {
        await mediaControl(session.player, action)

        return {
          ok: true,
          output: [
            `MEDIA :: ${action.toUpperCase()} SENT TO ${session.player.toUpperCase()}`,
          ],
        }
      }

      if (action) {
        return {
          ok: false,
          output: ['USAGE :: media [play-pause|next|previous]'],
        }
      }

      return {
        ok: true,
        output: [
          `MEDIA :: ${session.player.toUpperCase()} // ${session.status.toUpperCase()}`,
          `TRACK :: ${session.title || 'UNKNOWN'}`,
          `ARTIST :: ${session.artist || 'UNKNOWN'}`,
          `ALBUM :: ${session.album || 'UNKNOWN'}`,
        ],
      }
    },
  },
  {
    name: 'brief',
    aliases: ['briefing'],
    description: 'Generate a grounded Daily Intelligence snapshot.',
    usage: 'brief [me]',
    execute: async () => {
      const briefing = await getDailyBriefing()

      window.dispatchEvent(
        new CustomEvent('aamup:navigate', {
          detail: { module: 'briefing' },
        }),
      )

      return {
        ok: briefing.healthySources > 0,
        output: [
          'DAILY INTELLIGENCE // v0.5',
          ...formatDailyBriefingLines(briefing),
        ],
      }
    },
  },
  {
    name: 'embedding',
    aliases: ['embed'],
    description: 'Inspect the optional semantic-memory embedding provider.',
    execute: async () => {
      const status = await getEmbeddingStatus()

      return {
        ok: true,
        output: status.configured
          ? [
              `EMBEDDING :: ${status.model}`,
              `PROVIDER :: ${status.provider}`,
              `ENDPOINT :: ${status.baseUrl}`,
              `AUTH :: ${status.hasApiKey ? 'CONFIGURED' : 'NONE'}`,
              'RETRIEVAL :: HYBRID SEMANTIC + LEXICAL',
            ]
          : [
              'EMBEDDING :: NOT CONFIGURED',
              'SET AAMUP_EMBED_MODEL',
              'OPTIONAL :: SET AAMUP_EMBED_BASE_URL',
              'RETRIEVAL :: LEXICAL FALLBACK',
            ],
      }
    },
  },
  {
    name: 'recall',
    description: 'Preview memories relevant to a model query.',
    usage: 'recall <query>',
    execute: async (args) => {
      const query = args.join(' ').trim()

      if (!query) {
        return {
          ok: false,
          output: ['USAGE :: recall <query>'],
        }
      }

      const entries =
        await recallRelevantMemories(query, 5)

      return {
        ok: true,
        output: entries.length
          ? [
              `RECALL // ${entries.length} RELEVANT MEMORIES`,
              ...entries.map(
                (entry) =>
                  `#${entry.id} ${entry.retrievalMode.toUpperCase()} SCORE ${entry.score.toFixed(2)}${entry.semanticSimilarity !== null ? ` // COS ${entry.semanticSimilarity.toFixed(3)}` : ''} // ${entry.content}`,
              ),
            ]
          : [
              'RECALL // NO RELEVANT MEMORY',
            ],
      }
    },
  },
  {
    name: 'remember',
    description: 'Store a persistent local memory.',
    usage: 'remember <text>',
    execute: async (args) => {
      const content = args.join(' ').trim()

      if (!content) {
        return {
          ok: false,
          output: ['USAGE :: remember <text>'],
        }
      }

      const entry = await rememberMemory(content)

      return {
        ok: true,
        output: [
          `MEMORY // SAVED #${entry.id}`,
          entry.content,
        ],
      }
    },
  },
  {
    name: 'memory',
    aliases: ['memories'],
    description: 'List or search persistent local memory.',
    usage: 'memory [search text]',
    execute: async (args) => {
      const query = args.join(' ').trim()
      const entries = query
        ? await searchMemories(query, 20)
        : await listMemories(20)

      return {
        ok: true,
        output: entries.length
          ? [
              `MEMORY // ${entries.length} RECORDS`,
              ...entries.map(
                (entry) =>
                  `#${entry.id} [${entry.category.toUpperCase()}] ${entry.content}`,
              ),
            ]
          : ['MEMORY // NO RECORDS'],
      }
    },
  },
  {
    name: 'forget',
    description: 'Delete a persistent memory by id.',
    usage: 'forget <id>',
    execute: async (args) => {
      const id = Number(args[0])

      if (
        args.length !== 1 ||
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return {
          ok: false,
          output: ['USAGE :: forget <id>'],
        }
      }

      const deleted = await forgetMemory(id)

      return {
        ok: deleted,
        output: [
          deleted
            ? `MEMORY // FORGOT #${id}`
            : `MEMORY // #${id} NOT FOUND`,
        ],
      }
    },
  },
  {
    name: 'ask',
    aliases: ['assistant', 'query'],
    description: 'Route a natural-language request through Assistant Core.',
    usage: 'ask <request>',
    execute: async (args) => {
      const input = args.join(' ').trim()

      if (!input) {
        return {
          ok: false,
          output: ['USAGE :: ask <request>'],
        }
      }

      const result = await runAssistantSessionQuery(input)

      if (result.action?.type === 'navigate') {
        window.dispatchEvent(
          new CustomEvent('aamup:navigate', {
            detail: { module: result.action.module },
          }),
        )
      }

      return {
        ok: result.ok,
        output: [
          result.title,
          ...result.lines,
        ],
      }
    },
  },
  {
    name: 'model',
    aliases: ['llm'],
    description: 'Inspect the optional Assistant model provider.',
    execute: async () => {
      const status = await getAssistantModelStatus()

      return {
        ok: true,
        output: status.configured
          ? [
              `MODEL :: ${status.model}`,
              `PROVIDER :: ${status.provider}`,
              `ENDPOINT :: ${status.baseUrl}`,
              `AUTH :: ${status.hasApiKey ? 'CONFIGURED' : 'NONE'}`,
            ]
          : [
              'MODEL :: NOT CONFIGURED',
              'SET AAMUP_LLM_BASE_URL AND AAMUP_LLM_MODEL',
              'LOCAL ROUTER :: ONLINE',
            ],
      }
    },
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
