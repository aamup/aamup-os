export type EventSource = 'CORE' | 'SYSTEM' | 'COMMAND' | 'MODULES' | 'UI'
export type EventLevel = 'info' | 'success' | 'warning' | 'error'

export interface AamupEvent {
  id: string
  timestamp: string
  source: EventSource
  level: EventLevel
  message: string
}

export type AamupEventInput = Omit<AamupEvent, 'id' | 'timestamp'>
