import { eventBus } from '../events/eventBus'
import { commandDefinitions } from './registry'
import type { CommandContext, CommandDefinition, CommandResult } from './types'

function resolveCommand(name: string): CommandDefinition | undefined {
  return commandDefinitions.find(
    (command) =>
      command.name === name || command.aliases?.includes(name),
  )
}

export async function executeCommand(
  rawCommand: string,
  context: CommandContext,
): Promise<CommandResult> {
  const tokens = rawCommand.trim().split(/\s+/).filter(Boolean)
  const name = (tokens.shift() ?? '').toLowerCase()
  const args = tokens

  const definition = resolveCommand(name)

  if (definition) {
    try {
      const result = await definition.execute(args, context)

      eventBus.emit({
        source: 'COMMAND',
        level: result.ok ? 'success' : 'warning',
        message: `${name} command executed`,
      })

      return result
    } catch (error) {
      eventBus.emit({
        source: 'COMMAND',
        level: 'error',
        message: `${name} command failed`,
      })

      return {
        ok: false,
        output: [
          `COMMAND ERROR :: ${error instanceof Error ? error.message : String(error)}`,
        ],
      }
    }
  }

  const module = context.modules.find(
    (candidate) => candidate.id.toLowerCase() === name,
  )

  if (module) {
    eventBus.emit({
      source: 'MODULES',
      level: module.state === 'planned' ? 'info' : 'success',
      message: `${module.shortLabel.toLowerCase()} module inspected`,
    })

    return {
      ok: true,
      output: [
        `${module.shortLabel} :: ${module.state.toUpperCase()}`,
        module.description,
      ],
    }
  }

  eventBus.emit({
    source: 'COMMAND',
    level: 'warning',
    message: `unknown command rejected: ${name}`,
  })

  return {
    ok: false,
    output: [`UNKNOWN COMMAND :: ${name}`, 'TYPE help FOR AVAILABLE COMMANDS'],
  }
}
