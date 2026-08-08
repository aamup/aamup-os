import { useEffect, useState } from 'react'
import { ActivityPanel } from '../components/ActivityPanel'
import { AssistantDashboard } from '../components/AssistantDashboard'
import { AudioDashboard } from '../components/AudioDashboard'
import { CommandBar } from '../components/CommandBar'
import { GitHubDashboard } from '../components/GitHubDashboard'
import { MarketsDashboard } from '../components/MarketsDashboard'
import { MemoryDashboard } from '../components/MemoryDashboard'
import { NewsDashboard } from '../components/NewsDashboard'
import { WeatherDashboard } from '../components/WeatherDashboard'
import { ModulePanel } from '../components/ModulePanel'
import { StatusPanel } from '../components/StatusPanel'
import { SystemPanel } from '../components/SystemPanel'
import { brand } from '../core/config/brand'
import { useClock } from '../hooks/useClock'
import { useSystemTelemetry } from '../hooks/useSystemTelemetry'

type ActiveModule =
  | 'github'
  | 'weather'
  | 'markets'
  | 'news'
  | 'music'
  | 'memory'
  | 'assistant'

export function App() {
  const now = useClock()
  const [activeModule, setActiveModule] = useState<ActiveModule>('github')
  const { telemetry, status: telemetryStatus } = useSystemTelemetry()


  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const module =
        (event as CustomEvent<{ module?: string }>).detail?.module

      if (
        module === 'github' ||
        module === 'weather' ||
        module === 'markets' ||
        module === 'news' ||
        module === 'music' ||
        module === 'memory' ||
        module === 'assistant'
      ) {
        setActiveModule(module)
      }
    }

    window.addEventListener('aamup:navigate', handleNavigation)
    return () => window.removeEventListener('aamup:navigate', handleNavigation)
  }, [])

  const time = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const date = now.toLocaleDateString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <div className="os-frame">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-lockup__mark">A</div>
          <div>
            <strong>{brand.displayName}</strong>
            <span>{brand.tagline.toUpperCase()}</span>
          </div>
        </div>

        <div className="build-label">{brand.statusLabel} / V{brand.version}</div>

        <div className="clock">
          <span>{date}</span>
          <strong>{time}</strong>
          <span className="online"><i /> ONLINE</span>
        </div>
      </header>

      <div className="dashboard-grid">
        <aside className="left-rail">
          <SystemPanel telemetry={telemetry} status={telemetryStatus} />
          <ModulePanel activeModule={activeModule} onSelect={setActiveModule} />
        </aside>

        {activeModule === 'github'
          ? <GitHubDashboard />
          : activeModule === 'weather'
            ? <WeatherDashboard />
            : activeModule === 'markets'
              ? <MarketsDashboard />
              : activeModule === 'news'
                ? <NewsDashboard />
                : activeModule === 'music'
                  ? <AudioDashboard />
                  : activeModule === 'memory'
                    ? <MemoryDashboard />
                    : <AssistantDashboard />}

        <aside className="right-rail">
          <ActivityPanel />
          <StatusPanel />
        </aside>
      </div>

      <CommandBar telemetry={telemetry} telemetryStatus={telemetryStatus} />
      <footer className="footer-line">
        <span>AAMUP CORE / SECURE LOCAL SESSION</span>
        <span>{activeModule.toUpperCase()} INTELLIGENCE / REMOTE LINK ACTIVE</span>
      </footer>
    </div>
  )
}
