import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  forgetMemory,
  listMemories,
  rememberMemory,
  searchMemories,
  type MemoryEntry,
} from '../modules/memory/client'
import '../styles/memory-dashboard.css'

export function MemoryDashboard() {
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('LOADING')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (search = query) => {
    setStatus('SYNCING')
    setError(null)

    try {
      const next = search.trim()
        ? await searchMemories(search.trim(), 50)
        : await listMemories(50)

      setEntries(next)
      setStatus('ONLINE')
    } catch (caught) {
      setStatus('ERROR')
      setError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      )
    }
  }, [query])

  useEffect(() => {
    void load('')
  }, [load])

  async function handleRemember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const content = draft.trim()

    if (!content) return

    setStatus('WRITING')
    setError(null)

    try {
      await rememberMemory(content)
      setDraft('')
      await load(query)
    } catch (caught) {
      setStatus('ERROR')
      setError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      )
    }
  }

  async function handleForget(id: number) {
    setStatus('WRITING')
    setError(null)

    try {
      await forgetMemory(id)
      await load(query)
    } catch (caught) {
      setStatus('ERROR')
      setError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      )
    }
  }

  return (
    <main className="memory-dashboard">
      <section className="memory-hero">
        <div>
          <span className="memory-kicker">MEMORY CORE / v0.4</span>
          <h1>Persistent local memory</h1>
          <p>
            SQLite-backed facts and decisions stored on this device.
          </p>
        </div>

        <div className={`memory-status memory-status--${status.toLowerCase()}`}>
          {status}
        </div>
      </section>

      <section className="memory-control-panel">
        <form
          className="memory-compose"
          onSubmit={handleRemember}
        >
          <label htmlFor="memory-draft">REMEMBER</label>
          <div className="memory-compose__row">
            <input
              id="memory-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Store a fact, preference, or decision..."
              autoComplete="off"
            />
            <button type="submit" disabled={!draft.trim()}>
              SAVE
            </button>
          </div>
        </form>

        <div className="memory-search">
          <label htmlFor="memory-search">SEARCH</label>
          <div className="memory-compose__row">
            <input
              id="memory-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search local memory..."
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void load(query)}
            >
              FIND
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="memory-error">
          MEMORY ERROR // {error}
        </div>
      ) : null}

      <section className="memory-list-panel">
        <header>
          <span>MEMORIES</span>
          <span>{String(entries.length).padStart(2, '0')} SHOWN</span>
        </header>

        <div className="memory-list">
          {entries.length ? entries.map((entry) => (
            <article className="memory-card" key={entry.id}>
              <div className="memory-card__meta">
                <span>#{entry.id}</span>
                <span>{entry.category.toUpperCase()}</span>
                <span>{entry.createdAt}</span>
              </div>

              <p>{entry.content}</p>

              <button
                type="button"
                onClick={() => void handleForget(entry.id)}
              >
                FORGET
              </button>
            </article>
          )) : (
            <div className="memory-empty">
              NO MEMORY RECORDS MATCH THE CURRENT VIEW
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
