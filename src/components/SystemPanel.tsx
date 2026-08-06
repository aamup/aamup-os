import type { TelemetrySnapshot } from '../hooks/useDemoTelemetry'
import { Metric } from './Metric'

interface SystemPanelProps {
  telemetry: TelemetrySnapshot
}

export function SystemPanel({ telemetry }: SystemPanelProps) {
  return (
    <section className="panel system-panel">
      <header className="panel__header">
        <span>SYSTEM</span>
        <span className="demo-flag">DEMO DATA</span>
      </header>
      <div className="panel__body metric-stack">
        <Metric label="CPU" value={telemetry.cpu} />
        <Metric label="MEMORY" value={telemetry.memory} />
        <Metric label="DISK" value={telemetry.disk} />
        <Metric label="NETWORK" value={telemetry.network} suffix=" ms" />
      </div>
    </section>
  )
}
