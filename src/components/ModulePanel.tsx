import { modules } from '../core/modules/registry'

export function ModulePanel() {
  return (
    <section className="panel modules-panel">
      <header className="panel__header">
        <span>MODULES</span>
        <span>{String(modules.length).padStart(2, '0')}</span>
      </header>
      <div className="module-list">
        {modules.map((module) => (
          <div className="module-row" key={module.id} title={module.description}>
            <span>{module.shortLabel}</span>
            <span className={`module-state module-state--${module.state}`}>
              {module.state === 'planned' ? '○' : '●'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
