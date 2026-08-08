import { modules } from '../core/modules/registry'

interface ModulePanelProps {
  activeModule: 'github' | 'weather' | 'markets' | 'news' | 'music' | 'memory' | 'assistant'
  onSelect: (module: 'github' | 'weather' | 'markets' | 'news' | 'music' | 'memory' | 'assistant') => void
}

export function ModulePanel({
  activeModule,
  onSelect,
}: ModulePanelProps) {
  return (
    <section className="panel modules-panel">
      <header className="panel__header">
        <span>MODULES</span>
        <span>{String(modules.length).padStart(2, '0')}</span>
      </header>

      <div className="module-list">
        {modules.map((module) => {
          const selectableId =
            module.id === 'github' || module.id === 'weather' || module.id === 'markets' || module.id === 'news' || module.id === 'music' || module.id === 'memory' || module.id === 'assistant'
              ? module.id
              : null

          const selectable =
            module.state === 'online' && selectableId !== null

          const active =
            selectableId !== null && activeModule === selectableId

          if (!selectable) {
            return (
              <div
                className="module-row module-row--disabled"
                key={module.id}
                title={module.description}
              >
                <span>{module.shortLabel}</span>
                <span className={`module-state module-state--${module.state}`}>
                  {module.state === 'planned' ? '○' : '●'}
                </span>
              </div>
            )
          }

          return (
            <button
              className={`module-row module-row--selectable${active ? ' module-row--active' : ''}`}
              key={module.id}
              title={module.description}
              type="button"
              onClick={() => {
                if (selectableId) onSelect(selectableId)
              }}
            >
              <span>{module.shortLabel}</span>
              <span className={`module-state module-state--${module.state}`}>
                ●
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
