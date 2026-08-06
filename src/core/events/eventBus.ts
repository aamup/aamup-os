import type { AamupEvent, AamupEventInput } from './types'

type EventListener = (event: AamupEvent) => void

class AamupEventBus {
  private listeners = new Set<EventListener>()
  private events: AamupEvent[] = []

  emit(input: AamupEventInput): AamupEvent {
    const event: AamupEvent = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
    }

    this.events = [event, ...this.events].slice(0, 50)

    for (const listener of this.listeners) {
      listener(event)
    }

    return event
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getHistory(limit = 10): AamupEvent[] {
    return this.events.slice(0, limit)
  }
}

export const eventBus = new AamupEventBus()

const bootstrapEvents: AamupEventInput[] = [
  { source: 'CORE', level: 'success', message: 'native application shell initialized' },
  { source: 'SYSTEM', level: 'success', message: 'native telemetry bridge registered' },
  { source: 'MODULES', level: 'info', message: 'module registry loaded' },
  { source: 'COMMAND', level: 'success', message: 'command engine standing by' },
]

for (const event of bootstrapEvents) {
  eventBus.emit(event)
}
