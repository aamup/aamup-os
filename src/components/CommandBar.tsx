import {
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { executeCommand } from '../core/commands/engine'
import { modules } from '../core/modules/registry'
import type {
  TelemetrySnapshot,
  TelemetryStatus,
} from '../hooks/useSystemTelemetry'
import '../styles/command-console.css'

interface CommandBarProps {
  telemetry: TelemetrySnapshot | null
  telemetryStatus: TelemetryStatus
}

interface ConsoleEntry {
  id: number
  input: string
  output: string[]
  ok: boolean
}

export function CommandBar({
  telemetry,
  telemetryStatus,
}: CommandBarProps) {
  const [command, setCommand] = useState('')
  const [entries, setEntries] = useState<ConsoleEntry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  async function submit(event: FormEvent) {
    event.preventDefault()

    const clean = command.trim()
    if (!clean) return

    const result = await executeCommand(clean, {
      telemetry,
      telemetryStatus,
      modules,
    })

    setHistory((current) => [...current, clean].slice(-50))
    setHistoryIndex(-1)
    setCommand('')

    if (result.clear) {
      setEntries([])
      return
    }

    setEntries((current) => [
      ...current,
      {
        id: Date.now(),
        input: clean,
        output: result.output,
        ok: result.ok,
      },
    ].slice(-5))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setCommand('')
      setHistoryIndex(-1)
      return
    }

    if (event.key === 'ArrowUp') {
      if (history.length === 0) return

      event.preventDefault()

      const nextIndex = historyIndex < 0
        ? history.length - 1
        : Math.max(0, historyIndex - 1)

      setHistoryIndex(nextIndex)
      setCommand(history[nextIndex])
      return
    }

    if (event.key === 'ArrowDown') {
      if (historyIndex < 0) return

      event.preventDefault()

      const nextIndex = historyIndex + 1

      if (nextIndex >= history.length) {
        setHistoryIndex(-1)
        setCommand('')
        return
      }

      setHistoryIndex(nextIndex)
      setCommand(history[nextIndex])
    }
  }

  return (
    <section className="command-console">
      <div className="command-console__history" aria-live="polite">
        {entries.length === 0 ? (
          <div className="command-console__empty">
            COMMAND ENGINE READY // TYPE help
          </div>
        ) : (
          entries.map((entry) => (
            <div
              className={`command-console__entry ${entry.ok ? '' : 'command-console__entry--error'}`}
              key={entry.id}
            >
              <div className="command-console__input">
                <span>›</span>{entry.input}
              </div>

              <div className="command-console__output">
                {entry.output.map((line, index) => (
                  <div key={`${entry.id}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <form className="command-bar" onSubmit={submit}>
        <span className="command-bar__prompt">›</span>

        <input
          aria-label="AAMUP OS command"
          autoComplete="off"
          spellCheck={false}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ENTER AAMUP COMMAND"
        />

        <span className="command-bar__hint">
          ENGINE READY // ↑↓ HISTORY // ESC CLEAR
        </span>
      </form>
    </section>
  )
}
