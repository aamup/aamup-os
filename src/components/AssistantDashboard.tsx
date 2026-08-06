import {
  type FormEvent,
  useMemo,
  useState,
} from 'react'
import {
  runAssistantQuery,
  type AssistantResult,
} from '../modules/assistant/router'
import '../styles/assistant-dashboard.css'

interface AssistantEntry {
  id: number
  query: string
  result: AssistantResult
}

const suggestions = [
  'What is the weather?',
  'Show me the markets.',
  'Latest AI news.',
  'What is playing?',
  'Repository status.',
  'How is the system doing?',
]

export function AssistantDashboard() {
  const [query, setQuery] = useState('')
  const [entries, setEntries] =
    useState<AssistantEntry[]>([])
  const [running, setRunning] = useState(false)

  const latest = entries[0]

  const detectedCapabilities = useMemo(
    () => [
      'WEATHER',
      'MARKETS',
      'NEWS',
      'GITHUB',
      'SYSTEM',
      'MEDIA',
    ],
    [],
  )

  const submit = async (
    input: string,
  ) => {
    const trimmed = input.trim()

    if (!trimmed || running) {
      return
    }

    setRunning(true)

    try {
      const result =
        await runAssistantQuery(trimmed)

      setEntries((current) => [
        {
          id: Date.now(),
          query: trimmed,
          result,
        },
        ...current,
      ].slice(0, 12))
    } finally {
      setRunning(false)
      setQuery('')
    }
  }

  const onSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    void submit(query)
  }

  return (
    <main className="assistant-dashboard">
      <div className="assistant-dashboard__mesh" />

      <header className="assistant-dashboard__header">
        <div>
          <span className="assistant-eyebrow">
            ASSISTANT CORE / LOCAL ROUTER
          </span>
          <h1>COMMAND INTELLIGENCE</h1>
          <p>
            NATURAL LANGUAGE → LIVE AAMUP MODULES
          </p>
        </div>

        <div className="assistant-status">
          <i />
          LOCAL ROUTER ONLINE
        </div>
      </header>

      <section className="assistant-capabilities">
        {detectedCapabilities.map((capability) => (
          <div key={capability}>
            <i />
            {capability}
          </div>
        ))}
      </section>

      <section className="assistant-query">
        <form onSubmit={onSubmit}>
          <span>&gt;</span>
          <input
            autoComplete="off"
            placeholder="Ask AAMUP OS..."
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
          <button
            type="submit"
            disabled={running || !query.trim()}
          >
            {running ? 'ROUTING...' : 'EXECUTE'}
          </button>
        </form>

        <div className="assistant-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void submit(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <div className="assistant-main">
        <section className="assistant-response">
          <div className="assistant-section-title">
            <span>ACTIVE RESPONSE</span>
            <small>
              {latest
                ? latest.result.intent.toUpperCase()
                : 'IDLE'}
            </small>
          </div>

          {latest ? (
            <article
              className={
                latest.result.ok
                  ? ''
                  : 'assistant-response--error'
              }
            >
              <span className="assistant-response__query">
                USER // {latest.query}
              </span>

              <h2>{latest.result.title}</h2>

              <div className="assistant-response__lines">
                {latest.result.lines.map(
                  (line, index) => (
                    <p
                      key={`${latest.id}-${index}`}
                    >
                      <i />
                      {line}
                    </p>
                  ),
                )}
              </div>
            </article>
          ) : (
            <div className="assistant-empty">
              <strong>LOCAL ASSISTANT READY</strong>
              <span>
                Ask a question or select a suggested command.
              </span>
            </div>
          )}
        </section>

        <section className="assistant-history">
          <div className="assistant-section-title">
            <span>ROUTING HISTORY</span>
            <small>{entries.length} EVENTS</small>
          </div>

          <div className="assistant-history__list">
            {entries.map((entry) => (
              <article key={entry.id}>
                <div>
                  <span>
                    {entry.result.intent.toUpperCase()}
                  </span>
                  <small>
                    {entry.result.ok
                      ? 'COMPLETED'
                      : 'DEGRADED'}
                  </small>
                </div>
                <strong>{entry.query}</strong>
              </article>
            ))}

            {entries.length === 0 && (
              <div className="assistant-history__empty">
                NO ROUTES EXECUTED
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="assistant-dashboard__footer">
        <span>
          ENGINE // DETERMINISTIC LOCAL INTENT ROUTER
        </span>
        <span>
          NO CLOUD MODEL // NO API KEY // LIVE MODULE DATA
        </span>
      </footer>
    </main>
  )
}
