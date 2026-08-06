import { modules } from '../core/modules/registry'

export function StatusPanel() {
  const active = modules.filter((module) => module.state !== 'planned').length
  const planned = modules.filter((module) => module.state === 'planned').length

  return (
    <section className="panel status-panel">
      <header className="panel__header">
        <span>STATUS</span>
        <span>NOMINAL</span>
      </header>
      <div className="status-grid">
        <div><span>REGISTERED</span><strong>{String(modules.length).padStart(2, '0')}</strong></div>
        <div><span>ACTIVE</span><strong>{String(active).padStart(2, '0')}</strong></div>
        <div><span>PLANNED</span><strong>{String(planned).padStart(2, '0')}</strong></div>
        <div><span>ERRORS</span><strong>00</strong></div>
      </div>
    </section>
  )
}
