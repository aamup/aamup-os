import type { TelemetrySnapshot, TelemetryStatus } from '../../hooks/useSystemTelemetry'
import type { AamupModule } from '../types/module'

export interface CommandContext {
  telemetry: TelemetrySnapshot | null
  telemetryStatus: TelemetryStatus
  modules: AamupModule[]
}

export interface CommandResult {
  ok: boolean
  output: string[]
  clear?: boolean
}

export interface CommandDefinition {
  name: string
  aliases?: string[]
  description: string
  usage?: string
  execute: (
    args: string[],
    context: CommandContext,
  ) => CommandResult | Promise<CommandResult>
}
