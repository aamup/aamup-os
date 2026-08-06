const activities = [
  ['CORE', 'application shell initialized'],
  ['SYSTEM', 'demo telemetry stream active'],
  ['MODULES', 'registry loaded'],
  ['UI', 'command interface standing by'],
]

export function ActivityPanel() {
  return (
    <section className="panel activity-panel">
      <header className="panel__header">
        <span>ACTIVITY</span>
        <span>LIVE</span>
      </header>
      <div className="activity-list">
        {activities.map(([source, message], index) => (
          <div className="activity" key={`${source}-${message}`}>
            <span className="activity__pulse" style={{ animationDelay: `${index * 180}ms` }} />
            <div>
              <strong>{source}</strong>
              <p>{message}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
