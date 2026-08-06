import { useMemo, useState } from 'react'
import { useNewsIntelligence } from '../hooks/useNewsIntelligence'
import type { NewsCategory } from '../modules/news/client'
import '../styles/news-dashboard.css'

type NewsFilter = 'ALL' | NewsCategory
const filters: NewsFilter[] = ['ALL', 'LOCAL', 'AI', 'TECH']

function timeLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'TIME UNKNOWN'
    : date.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).toUpperCase()
}

export function NewsDashboard() {
  const { news, status, lastUpdated, error, refresh } =
    useNewsIntelligence()
  const [filter, setFilter] = useState<NewsFilter>('ALL')

  const visible = useMemo(
    () => (news?.articles ?? []).filter(
      (article) => filter === 'ALL' || article.category === filter,
    ),
    [news, filter],
  )

  const featured = visible[0]
  const sourceCount = new Set(
    (news?.articles ?? []).map((article) => article.source),
  ).size

  return (
    <main className="news-dashboard">
      <header className="news-dashboard__header">
        <div>
          <span className="news-eyebrow">NEWS INTELLIGENCE / LIVE</span>
          <h1>SIGNAL FEED</h1>
          <p>LOCAL / ARTIFICIAL INTELLIGENCE / TECHNOLOGY</p>
        </div>
        <div className="news-controls">
          <div className={`news-live news-live--${status}`}>
            <i />
            {status === 'loading'
              ? 'SYNCING'
              : status === 'live'
                ? 'NEWS LIVE'
                : status === 'degraded'
                  ? 'PARTIAL DATA'
                  : 'LINK ERROR'}
          </div>
          <button type="button" onClick={() => void refresh()}>
            REFRESH
          </button>
        </div>
      </header>

      <section className="news-kpis">
        <article><span>HEADLINES</span><strong>{news?.articles.length ?? '—'}</strong><small>ACTIVE SIGNALS</small></article>
        <article><span>LOCAL</span><strong>{news?.articles.filter((a) => a.category === 'LOCAL').length ?? '—'}</strong><small>PORTLAND / OREGON</small></article>
        <article><span>AI</span><strong>{news?.articles.filter((a) => a.category === 'AI').length ?? '—'}</strong><small>INTELLIGENCE WATCH</small></article>
        <article><span>SOURCES</span><strong>{news ? sourceCount : '—'}</strong><small>{news?.feedCount ?? 0} FEEDS ONLINE</small></article>
      </section>

      <nav className="news-filter">
        {filters.map((item) => (
          <button
            className={filter === item ? 'news-filter__active' : ''}
            key={item}
            type="button"
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="news-dashboard__main">
        <section className="news-featured">
          <div className="news-section-title">
            <span>PRIMARY SIGNAL</span>
            <small>{filter}</small>
          </div>
          {featured ? (
            <article>
              <div className="news-featured__category">{featured.category}</div>
              <h2>{featured.title}</h2>
              <div className="news-featured__meta">
                <span>{featured.source}</span>
                <time>{timeLabel(featured.published)}</time>
              </div>
            </article>
          ) : (
            <div className="news-empty">
              {status === 'loading' ? 'SYNCHRONIZING NEWS FEEDS...' : 'NO HEADLINES IN THIS CHANNEL'}
            </div>
          )}
        </section>

        <section className="news-stream">
          <div className="news-section-title">
            <span>HEADLINE STREAM</span>
            <small>{visible.length} ITEMS</small>
          </div>
          <div className="news-stream__list">
            {visible.slice(1).map((article, index) => (
              <article key={`${article.category}-${article.title}`}>
                <div className="news-stream__index">{String(index + 2).padStart(2, '0')}</div>
                <div className="news-stream__body">
                  <div className="news-stream__meta">
                    <span>{article.category}</span>
                    <time>{timeLabel(article.published)}</time>
                  </div>
                  <strong>{article.title}</strong>
                  <small>{article.source}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="news-dashboard__footer">
        <span>SOURCE // {news?.source?.toUpperCase() ?? 'CONNECTING'}</span>
        <span>
          {error
            ? error.toUpperCase()
            : lastUpdated
              ? `UPDATED ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} // RUST TRANSPORT`
              : 'NATIVE NEWS TRANSPORT'}
        </span>
      </footer>
    </main>
  )
}
