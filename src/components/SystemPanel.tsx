import type {
  TelemetrySnapshot,
  TelemetryStatus,
} from '../hooks/useSystemTelemetry'
import { Metric } from './Metric'

interface SystemPanelProps {
  telemetry: TelemetrySnapshot | null
  status: TelemetryStatus
}

function formatUptime(seconds: number) {
  const totalHours = Math.floor(seconds / 3600)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days > 0) {
    return `${days}D ${hours}H`
  }

  return `${hours}H`
}

export function SystemPanel({
  telemetry,
  status,
}: SystemPanelProps) {
  return (
    <section className="panel system-panel">
      <header className="panel__header">
        <span>SYSTEM</span>

        <span
          className={`telemetry-flag telemetry-flag--${status}`}
        >
          {status === 'live'
            ? 'LIVE NATIVE'
            : status === 'connecting'
              ? 'CONNECTING'
              : 'OFFLINE'}
        </span>
      </header>

      <div className="panel__body metric-stack">
        <Metric
          label="CPU"
          value={telemetry?.cpu ?? 0}
        />

        <Metric
          label="MEMORY"
          value={telemetry?.memory ?? 0}
        />

        <Metric
          label="DISK"
          value={telemetry?.disk ?? 0}
        />

        <div className="system-facts">
          <div>
            <span>HOST</span>
            <strong>
              {telemetry?.hostname ?? '—'}
            </strong>
          </div>

          <div>
            <span>PROCESSES</span>
            <strong>
              {telemetry?.processCount ?? '—'}
            </strong>
          </div>

          <div>
            <span>UPTIME</span>
            <strong>
              {telemetry
                ? formatUptime(
                    telemetry.uptimeSeconds,
                  )
                : '—'}
            </strong>
          </div>

          <div className="system-facts__wide">
            <span>PLATFORM</span>
            <strong>
              {telemetry?.osName ?? '—'}
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}
