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
        'COMMANDS :: help | system | status | modules | github | version | clear',
        'TIP :: module names such as github or weather return their current state',
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
    description: 'Inspect the AAMUP OS Git repository.',
    execute: async () => {
      const repo = await getGitRepositoryState()

      return {
        ok: true,
        output: [
          `REPOSITORY :: ${repo.branch} @ ${repo.headShort}`,
          `HEAD :: ${repo.headMessage}`,
          `COMMITS ${repo.commitCount} // CHANGED ${repo.changedFiles} // ${repo.clean ? 'CLEAN' : 'DIRTY'}`,
          `SYNC :: AHEAD ${repo.ahead} // BEHIND ${repo.behind}`,
          `ORIGIN :: ${repo.remote ?? 'NOT CONFIGURED'}`,
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
