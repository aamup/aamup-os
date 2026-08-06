import { useWeatherIntelligence } from '../hooks/useWeatherIntelligence'
import '../styles/weather-dashboard.css'

function condition(code: number) {
  if (code === 0) return 'CLEAR'
  if ([1, 2].includes(code)) return 'PARTLY CLOUDY'
  if (code === 3) return 'OVERCAST'
  if ([45, 48].includes(code)) return 'FOG'
  if ([51, 53, 55, 56, 57].includes(code)) return 'DRIZZLE'
  if ([61, 63, 65, 66, 67].includes(code)) return 'RAIN'
  if ([71, 73, 75, 77].includes(code)) return 'SNOW'
  if ([80, 81, 82].includes(code)) return 'SHOWERS'
  if ([85, 86].includes(code)) return 'SNOW SHOWERS'
  if ([95, 96, 99].includes(code)) return 'THUNDERSTORM'
  return 'VARIABLE'
}

function dayLabel(date: string) {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString([], { weekday: 'short' }).toUpperCase()
}

function hourLabel(time: string) {
  const value = new Date(time)
  return value.toLocaleTimeString([], {
    hour: 'numeric',
    hour12: true,
  })
}

function clockLabel(time: string) {
  const value = new Date(time)
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function windCompass(degrees: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return directions[Math.round(degrees / 45) % 8]
}

export function WeatherDashboard() {
  const {
    weather,
    status,
    error,
    lastUpdated,
    refresh,
  } = useWeatherIntelligence()

  const current = weather?.current
  const today = weather?.daily[0]
  const precip = Math.round(current?.precipitation ?? 0)

  return (
    <main className="weather-dashboard">
      <div className="weather-dashboard__grid" />

      <header className="weather-dashboard__header">
        <div>
          <span className="weather-eyebrow">
            WEATHER INTELLIGENCE / LIVE
          </span>
          <h1>{weather?.locationLabel ?? 'WEATHER LINK'}</h1>
          <p>
            {weather
              ? `${weather.latitude.toFixed(3)} / ${weather.longitude.toFixed(3)} // ${weather.timezone}`
              : 'SYNCHRONIZING NATIVE WEATHER DATA'}
          </p>
        </div>

        <div className="weather-controls">
          <div className={`weather-live weather-live--${status}`}>
            <i />
            {status === 'loading'
              ? 'SYNCING'
              : status === 'live'
                ? 'WEATHER LIVE'
                : 'LINK ERROR'}
          </div>
          <button type="button" onClick={() => void refresh()}>
            REFRESH
          </button>
        </div>
      </header>

      <section className="weather-hero">
        <div className="weather-temperature">
          <span className="weather-temperature__value">
            {current ? Math.round(current.temperature) : '—'}
          </span>
          <span className="weather-temperature__unit">°F</span>
        </div>

        <div className="weather-condition">
          <span>CURRENT SIGNAL</span>
          <strong>
            {current ? condition(current.weatherCode) : 'CONNECTING'}
          </strong>
          <small>
            FEELS LIKE{' '}
            {current ? `${Math.round(current.apparentTemperature)}°` : '—'}
          </small>
        </div>

        <div className="weather-radar">
          <div className="weather-radar__sweep" />
          <div className="weather-radar__ring weather-radar__ring--one" />
          <div className="weather-radar__ring weather-radar__ring--two" />
          <div className="weather-radar__cross weather-radar__cross--x" />
          <div className="weather-radar__cross weather-radar__cross--y" />
          <i className="weather-radar__point weather-radar__point--one" />
          <i className="weather-radar__point weather-radar__point--two" />
          <span>{current?.isDay ? 'DAYLIGHT' : 'NIGHT CYCLE'}</span>
        </div>

        <div className="weather-kpis">
          <article>
            <span>HUMIDITY</span>
            <strong>{current ? `${Math.round(current.humidity)}%` : '—'}</strong>
          </article>
          <article>
            <span>WIND</span>
            <strong>
              {current
                ? `${Math.round(current.windSpeed)} ${windCompass(current.windDirection)}`
                : '—'}
            </strong>
            <small>MPH</small>
          </article>
          <article>
            <span>PRECIP</span>
            <strong>{current ? `${current.precipitation.toFixed(2)}"` : '—'}</strong>
          </article>
          <article>
            <span>RAIN PROB.</span>
            <strong>{today ? `${Math.round(today.precipitationProbability)}%` : `${precip}%`}</strong>
          </article>
        </div>
      </section>

      <div className="weather-dashboard__main">
        <section className="weather-hourly-panel">
          <div className="weather-section-title">
            <span>12 HOUR OUTLOOK</span>
            <small>TEMPERATURE / PRECIPITATION SIGNAL</small>
          </div>

          <div className="weather-hourly">
            {(weather?.hourly ?? []).map((hour) => (
              <article key={hour.time}>
                <time>{hourLabel(hour.time)}</time>
                <div className="weather-hourly__bar">
                  <span
                    style={{
                      height: `${Math.max(
                        4,
                        Math.min(100, hour.precipitationProbability),
                      )}%`,
                    }}
                  />
                </div>
                <strong>{Math.round(hour.temperature)}°</strong>
                <small>{Math.round(hour.precipitationProbability)}%</small>
              </article>
            ))}
          </div>
        </section>

        <section className="weather-daily-panel">
          <div className="weather-section-title">
            <span>7 DAY FORECAST</span>
            <small>HIGH / LOW</small>
          </div>

          <div className="weather-daily">
            {(weather?.daily ?? []).map((day) => (
              <article key={day.date}>
                <div>
                  <span>{dayLabel(day.date)}</span>
                  <small>{condition(day.weatherCode)}</small>
                </div>

                <div className="weather-daily__rain">
                  <i
                    style={{
                      width: `${Math.min(
                        100,
                        day.precipitationProbability,
                      )}%`,
                    }}
                  />
                </div>

                <strong>
                  {Math.round(day.high)}°
                  <span>{Math.round(day.low)}°</span>
                </strong>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="weather-dashboard__footer">
        <span>
          {today
            ? `SUNRISE ${clockLabel(today.sunrise)} // SUNSET ${clockLabel(today.sunset)}`
            : 'SOLAR DATA CONNECTING'}
        </span>

        <span>
          {error
            ? 'WEATHER SERVICE DEGRADED'
            : lastUpdated
              ? `UPDATED ${lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} // OPEN-METEO / RUST TRANSPORT`
              : 'OPEN-METEO / RUST TRANSPORT'}
        </span>
      </footer>
    </main>
  )
}
