import { useEffect, useState } from 'react'
import { eventBus } from '../core/events/eventBus'
import type { AamupEvent } from '../core/events/types'
import '../styles/activity-events.css'

function eventTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function ActivityPanel() {
  const [activities, setActivities] = useState<AamupEvent[]>(() =>
    eventBus.getHistory(8),
  )

  useEffect(() => {
    return eventBus.subscribe((event) => {
      setActivities((current) => [event, ...current].slice(0, 8))
    })
  }, [])

  return (
    <section className="panel activity-panel">
      <header className="panel__header">
        <span>ACTIVITY</span>
        <span>EVENT BUS</span>
      </header>

      <div className="activity-list">
        {activities.map((activity) => (
          <div className="activity" key={activity.id}>
            <span
              className={`activity__pulse activity__pulse--${activity.level}`}
            />

            <div>
              <div className="activity__heading">
                <strong>{activity.source}</strong>
                <span className="activity__time">
                  {eventTime(activity.timestamp)}
                </span>
              </div>

              <p>{activity.message}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
