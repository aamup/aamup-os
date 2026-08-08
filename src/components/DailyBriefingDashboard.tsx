import { useCallback, useEffect, useState } from 'react'
import {
  getDailyBriefing,
  type DailyBriefing,
} from '../modules/briefing/client'
import '../styles/daily-briefing-dashboard.css'

function SourceState({
  status,
}: {
  status: 'online' | 'error'
}) {
  return (
    <span
      className={`brief-source-state brief-source-state--${status}`}
    >
      {status.toUpperCase()}
    </span>
  )
}

export function DailyBriefingDashboard() {
  const [briefing, setBriefing] =
    useState<DailyBriefing | null>(null)
  const [status, setStatus] =
    useState<'loading' | 'online' | 'partial' | 'error'>(
      'loading',
    )
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const next = await getDailyBriefing()
      setBriefing(next)

      setStatus(
        next.healthySources === next.sourceCount
          ? 'online'
          : next.healthySources > 0
            ? 'partial'
            : 'error',
      )
    } catch (caught) {
      setStatus('error')
      setError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      )
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const generated = briefing
    ? new Date(briefing.generatedAt).toLocaleString()
    : 'PENDING'

  return (
    <main className="daily-briefing">
      <section className="brief-hero">
        <div>
          <span className="brief-kicker">
            DAILY INTELLIGENCE / v0.5
          </span>
          <h1>Operational brief</h1>
          <p>
            Live signals from weather, markets, news, GitHub,
            system telemetry, and local memory.
          </p>
        </div>

        <div className="brief-hero__actions">
          <span
            className={`brief-health brief-health--${status}`}
          >
            {status.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
          >
            REFRESH
          </button>
        </div>
      </section>

      <section className="brief-meta">
        <span>GENERATED // {generated}</span>
        <span>
          SOURCES // {briefing?.healthySources ?? 0}/
          {briefing?.sourceCount ?? 6} ONLINE
        </span>
      </section>

      {error ? (
        <div className="brief-error">
          BRIEFING ERROR // {error}
        </div>
      ) : null}

      {briefing ? (
        <section className="brief-grid">
          <article className="brief-card">
            <header>
              <span>WEATHER</span>
              <SourceState status={briefing.weather.status} />
            </header>
            {briefing.weather.status === 'online' ? (
              <>
                <strong>
                  {Math.round(
                    briefing.weather.temperature ?? 0,
                  )}
                  F
                </strong>
                <p>{briefing.weather.locationLabel}</p>
                <div className="brief-stat-row">
                  <span>
                    HIGH{' '}
                    {briefing.weather.high !== null
                      ? Math.round(briefing.weather.high)
                      : '?'}
                    F
                  </span>
                  <span>
                    LOW{' '}
                    {briefing.weather.low !== null
                      ? Math.round(briefing.weather.low)
                      : '?'}
                    F
                  </span>
                  <span>
                    RAIN{' '}
                    {briefing.weather
                      .precipitationProbability !== null
                      ? Math.round(
                          briefing.weather
                            .precipitationProbability,
                        )
                      : '?'}
                    %
                  </span>
                </div>
              </>
            ) : (
              <p>{briefing.weather.error}</p>
            )}
          </article>

          <article className="brief-card">
            <header>
              <span>SYSTEM</span>
              <SourceState status={briefing.system.status} />
            </header>
            {briefing.system.status === 'online' ? (
              <>
                <strong>{briefing.system.hostname}</strong>
                <p>{briefing.system.osName}</p>
                <div className="brief-stat-row">
                  <span>
                    CPU {briefing.system.cpu?.toFixed(1)}%
                  </span>
                  <span>
                    MEM {briefing.system.memory?.toFixed(1)}%
                  </span>
                  <span>
                    DISK {briefing.system.disk?.toFixed(1)}%
                  </span>
                </div>
              </>
            ) : (
              <p>{briefing.system.error}</p>
            )}
          </article>

          <article className="brief-card brief-card--wide">
            <header>
              <span>MARKETS</span>
              <SourceState status={briefing.markets.status} />
            </header>
            {briefing.markets.status === 'online' ? (
              <div className="brief-market-grid">
                {briefing.markets.quotes.map((quote) => (
                  <div
                    className="brief-market"
                    key={quote.symbol}
                  >
                    <b>{quote.symbol}</b>
                    <span>
                      {quote.price.toFixed(
                        quote.price < 10 ? 3 : 2,
                      )}{' '}
                      {quote.currency}
                    </span>
                    <span>
                      {quote.changePercent >= 0 ? '+' : ''}
                      {quote.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>{briefing.markets.error}</p>
            )}
          </article>

          <article className="brief-card brief-card--wide">
            <header>
              <span>NEWS SIGNALS</span>
              <SourceState status={briefing.news.status} />
            </header>
            {briefing.news.status === 'online' ? (
              <div className="brief-headlines">
                {briefing.news.headlines.map(
                  (headline, index) => (
                    <div
                      className="brief-headline"
                      key={`${headline.title}-${index}`}
                    >
                      <span>
                        [{headline.category}]
                      </span>
                      <p>{headline.title}</p>
                      <small>{headline.source}</small>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p>{briefing.news.error}</p>
            )}
          </article>

          <article className="brief-card">
            <header>
              <span>GITHUB</span>
              <SourceState status={briefing.github.status} />
            </header>
            {briefing.github.status === 'online' ? (
              <>
                <strong>
                  {briefing.github.branch} @{' '}
                  {briefing.github.headShort}
                </strong>
                <p>
                  {briefing.github.clean
                    ? 'WORKTREE CLEAN'
                    : `${briefing.github.changedFiles ?? '?'} CHANGED FILES`}
                </p>
                <div className="brief-stat-row">
                  <span>
                    AHEAD {briefing.github.ahead ?? '?'}
                  </span>
                  <span>
                    BEHIND {briefing.github.behind ?? '?'}
                  </span>
                  <span>
                    CI {briefing.github.ci ?? 'UNKNOWN'}
                  </span>
                </div>
              </>
            ) : (
              <p>{briefing.github.error}</p>
            )}
          </article>

          <article className="brief-card">
            <header>
              <span>RECENT MEMORY</span>
              <SourceState status={briefing.memory.status} />
            </header>
            {briefing.memory.status === 'online' ? (
              <div className="brief-memory-list">
                {briefing.memory.entries.length ? (
                  briefing.memory.entries.map((entry) => (
                    <div
                      className="brief-memory"
                      key={entry.id}
                    >
                      <span>#{entry.id}</span>
                      <p>{entry.content}</p>
                    </div>
                  ))
                ) : (
                  <p>NO SAVED MEMORY</p>
                )}
              </div>
            ) : (
              <p>{briefing.memory.error}</p>
            )}
          </article>
        </section>
      ) : (
        <div className="brief-loading">
          BUILDING DAILY INTELLIGENCE...
        </div>
      )}
    </main>
  )
}
