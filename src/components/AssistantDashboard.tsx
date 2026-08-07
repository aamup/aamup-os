import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createAssistantContext,
  runAssistantSessionQuery,
  type AssistantContext,
  type AssistantSessionResult,
} from '../modules/assistant/session'
import '../styles/assistant-dashboard.css'

interface AssistantEntry {
  id: number
  query: string
  result: AssistantSessionResult
}

interface StoredSession {
  entries: AssistantEntry[]
  context: AssistantContext
}

const STORAGE_KEY = 'aamup.assistant.session.v2'

const suggestions = [
  'What is the weather?',
  'What about tomorrow?',
  'Show me the markets.',
  'Latest AI news.',
  'Open GitHub.',
  'What is playing?',
]

function loadSession(): StoredSession {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { entries: [], context: createAssistantContext() }
    }

    const parsed = JSON.parse(raw) as Partial<StoredSession>
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries.slice(0, 20) : [],
      context: parsed.context ?? createAssistantContext(),
    }
  } catch {
    return { entries: [], context: createAssistantContext() }
  }
}

export function AssistantDashboard() {
  const initial = useMemo(() => loadSession(), [])
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<AssistantEntry[]>(initial.entries)
  const [context, setContext] = useState<AssistantContext>(initial.context)
  const [running, setRunning] = useState(false)

  const latest = entries[0]

  const capabilities = useMemo(
    () => ['WEATHER', 'MARKETS', 'NEWS', 'GITHUB', 'SYSTEM', 'MEDIA'],
    [],
  )

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ entries, context }),
    )
  }, [entries, context])

  const submit = async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed || running) return

    setRunning(true)

    try {
      const result = await runAssistantSessionQuery(trimmed, context)
      setContext(result.context)

      if (result.action?.type === 'navigate') {
        window.dispatchEvent(
          new CustomEvent('aamup:navigate', {
            detail: { module: result.action.module },
          }),
        )
      }

      setEntries((current) => [
        { id: Date.now(), query: trimmed, result },
        ...current,
      ].slice(0, 20))
    } finally {
      setRunning(false)
      setQuery('')
    }
  }

  const clearSession = () => {
    setEntries([])
    setContext(createAssistantContext())
    window.localStorage.removeItem(STORAGE_KEY)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit(query)
  }

  return (
    <main className="assistant-dashboard">
      <div className="assistant-dashboard__mesh" />

      <header className="assistant-dashboard__header">
        <div>
          <span className="assistant-eyebrow">
            ASSISTANT CORE / CONTEXT ROUTER v0.2
          </span>
          <h1>COMMAND INTELLIGENCE</h1>
          <p>NATURAL LANGUAGE → CONTEXT → LIVE AAMUP MODULES</p>
        </div>

        <div className="assistant-status-stack">
          <div className="assistant-status">
            <i />
            CONTEXT ROUTER ONLINE
          </div>
          <button className="assistant-clear" type="button" onClick={clearSession}>
            CLEAR SESSION
          </button>
        </div>
      </header>

      <section className="assistant-capabilities">
        {capabilities.map((capability) => (
          <div key={capability}><i />{capability}</div>
        ))}
      </section>

      <section className="assistant-context-strip">
        <span>CONTEXT</span>
        <strong>{context.lastIntent?.toUpperCase() ?? 'NONE'}</strong>
        <span>MODULE</span>
        <strong>{context.lastModule?.toUpperCase() ?? 'NONE'}</strong>
        <span>TURNS</span>
        <strong>{context.turnCount}</strong>
        {context.lastNewsCategory && (
          <><span>NEWS FILTER</span><strong>{context.lastNewsCategory}</strong></>
        )}
      </section>

      <section className="assistant-query">
        <form onSubmit={onSubmit}>
          <span>&gt;</span>
          <input
            autoComplete="off"
            placeholder="Ask AAMUP OS..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={running || !query.trim()}>
            {running ? 'ROUTING...' : 'EXECUTE'}
          </button>
        </form>

        <div className="assistant-suggestions">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => void submit(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <div className="assistant-main">
        <section className="assistant-response">
          <div className="assistant-section-title">
            <span>ACTIVE RESPONSE</span>
            <small>{latest ? latest.result.intent.toUpperCase() : 'IDLE'}</small>
          </div>

          {latest ? (
            <article className={latest.result.ok ? '' : 'assistant-response--error'}>
              <span className="assistant-response__query">USER // {latest.query}</span>
              <h2>{latest.result.title}</h2>

              {latest.result.action && (
                <div className="assistant-action-chip">
                  ACTION // OPEN {latest.result.action.module.toUpperCase()}
                </div>
              )}

              <div className="assistant-response__lines">
                {latest.result.lines.map((line, index) => (
                  <p key={`${latest.id}-${index}`}><i />{line}</p>
                ))}
              </div>
            </article>
          ) : (
            <div className="assistant-empty">
              <strong>CONTEXT ASSISTANT READY</strong>
              <span>Ask a question or select a suggested command.</span>
            </div>
          )}
        </section>

        <section className="assistant-history">
          <div className="assistant-section-title">
            <span>SESSION HISTORY</span>
            <small>{entries.length} EVENTS</small>
          </div>

          <div className="assistant-history__list">
            {entries.map((entry) => (
              <article key={entry.id}>
                <div>
                  <span>{entry.result.intent.toUpperCase()}</span>
                  <small>{entry.result.ok ? 'COMPLETED' : 'DEGRADED'}</small>
                </div>
                <strong>{entry.query}</strong>
              </article>
            ))}

            {entries.length === 0 && (
              <div className="assistant-history__empty">NO ROUTES EXECUTED</div>
            )}
          </div>
        </section>
      </div>

      <footer className="assistant-dashboard__footer">
        <span>ENGINE // CONTEXTUAL LOCAL INTENT ROUTER</span>
        <span>PERSISTENT SESSION // LIVE MODULE DATA // NO CLOUD MODEL</span>
      </footer>
    </main>
  )
}
