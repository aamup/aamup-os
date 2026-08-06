interface MetricProps {
  label: string
  value: number
  suffix?: string
}

export function Metric({ label, value, suffix = '%' }: MetricProps) {
  const normalized = Math.round(value)

  return (
    <div className="metric">
      <div className="metric__row">
        <span>{label}</span>
        <strong>{normalized}{suffix}</strong>
      </div>
      <div className="metric__track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, normalized)}%` }} />
      </div>
    </div>
  )
}
