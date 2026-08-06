import type { MarketQuote } from '../modules/markets/client'
import { useMarketsIntelligence } from '../hooks/useMarketsIntelligence'
import '../styles/markets-dashboard.css'

const names: Record<string, string> = {
  SPY: 'S&P 500 ETF',
  QQQ: 'NASDAQ 100 ETF',
  AAPL: 'APPLE',
  NVDA: 'NVIDIA',
  'BTC-USD': 'BITCOIN',
  'ETH-USD': 'ETHEREUM',
}

function formatPrice(value: number) {
  if (value >= 1000) {
    return value.toLocaleString([], {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
  }

  return value.toFixed(value < 10 ? 3 : 2)
}

function Sparkline({ quote }: { quote: MarketQuote }) {
  const values = quote.sparkline

  if (values.length < 2) {
    return <div className="market-sparkline market-sparkline--empty" />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 0.0001)

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 92 - ((value - min) / range) * 84
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      className={`market-sparkline${quote.change >= 0 ? ' market-sparkline--up' : ' market-sparkline--down'}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} />
    </svg>
  )
}

export function MarketsDashboard() {
  const {
    markets,
    status,
    lastUpdated,
    error,
    refresh,
  } = useMarketsIntelligence()

  const quotes = markets?.quotes ?? []
  const leader = [...quotes].sort(
    (a, b) => b.changePercent - a.changePercent,
  )[0]
  const laggard = [...quotes].sort(
    (a, b) => a.changePercent - b.changePercent,
  )[0]
  const positive = quotes.filter((quote) => quote.change >= 0).length

  return (
    <main className="markets-dashboard">
      <div className="markets-dashboard__grid" />

      <header className="markets-dashboard__header">
        <div>
          <span className="markets-eyebrow">
            MARKETS INTELLIGENCE / LIVE
          </span>
          <h1>GLOBAL WATCHLIST</h1>
          <p>
            EQUITIES / INDEX ETFs / DIGITAL ASSETS
          </p>
        </div>

        <div className="markets-controls">
          <div className={`markets-live markets-live--${status}`}>
            <i />
            {status === 'loading'
              ? 'SYNCING'
              : status === 'live'
                ? 'MARKETS LIVE'
                : status === 'degraded'
                  ? 'PARTIAL DATA'
                  : 'LINK ERROR'}
          </div>

          <button type="button" onClick={() => void refresh()}>
            REFRESH
          </button>
        </div>
      </header>

      <section className="markets-kpis">
        <article>
          <span>WATCHLIST</span>
          <strong>{quotes.length || '—'}</strong>
          <small>LIVE SYMBOLS</small>
        </article>

        <article>
          <span>ADVANCING</span>
          <strong>{quotes.length ? `${positive}/${quotes.length}` : '—'}</strong>
          <small>POSITIVE SESSION</small>
        </article>

        <article>
          <span>LEADER</span>
          <strong>{leader?.symbol ?? '—'}</strong>
          <small>
            {leader ? `${leader.changePercent >= 0 ? '+' : ''}${leader.changePercent.toFixed(2)}%` : 'WAITING'}
          </small>
        </article>

        <article>
          <span>LAGGARD</span>
          <strong>{laggard?.symbol ?? '—'}</strong>
          <small>
            {laggard ? `${laggard.changePercent >= 0 ? '+' : ''}${laggard.changePercent.toFixed(2)}%` : 'WAITING'}
          </small>
        </article>
      </section>

      <section className="markets-board">
        {quotes.length === 0 ? (
          <div className="markets-empty">
            {status === 'loading'
              ? 'SYNCHRONIZING MARKET FEEDS...'
              : 'NO MARKET DATA AVAILABLE'}
          </div>
        ) : (
          quotes.map((quote) => (
            <article
              className={`market-card${quote.change >= 0 ? ' market-card--up' : ' market-card--down'}`}
              key={quote.symbol}
            >
              <header>
                <div>
                  <strong>{quote.symbol}</strong>
                  <span>{names[quote.symbol] ?? quote.instrumentType}</span>
                </div>

                <small>{quote.exchange}</small>
              </header>

              <div className="market-card__price">
                <strong>{formatPrice(quote.price)}</strong>
                <span>{quote.currency}</span>
              </div>

              <div className="market-card__change">
                <span>
                  {quote.change >= 0 ? '+' : ''}
                  {quote.change.toFixed(2)}
                </span>
                <strong>
                  {quote.changePercent >= 0 ? '+' : ''}
                  {quote.changePercent.toFixed(2)}%
                </strong>
              </div>

              <div className="market-card__chart">
                <Sparkline quote={quote} />
                <div className="market-card__baseline" />
              </div>

              <footer>
                <span>PREV {formatPrice(quote.previousClose)}</span>
                <span>{quote.instrumentType}</span>
              </footer>
            </article>
          ))
        )}
      </section>

      <footer className="markets-dashboard__footer">
        <span>
          SOURCE // {markets?.source?.toUpperCase() ?? 'CONNECTING'}
        </span>

        <span>
          {error
            ? error.toUpperCase()
            : lastUpdated
              ? `UPDATED ${lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} // RUST TRANSPORT`
              : 'NATIVE MARKET TRANSPORT'}
        </span>
      </footer>
    </main>
  )
}
