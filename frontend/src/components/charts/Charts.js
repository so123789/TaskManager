import { TASK_STATUSES } from '../../lib/constants'
import { keyToDate } from '../../lib/dates'

// Paired bar chart of tasks completed vs created per day. Built with plain
// elements: it's seven bars, so a chart library would be pure overhead.
export function WeeklyChart({ data }) {
    const max = Math.max(1, ...data.flatMap(d => [d.completed, d.created]))
    return (
        <figure className="weekly-chart">
            <div className="weekly-chart__plot" role="img" aria-label={`Tasks completed per day: ${data.map(d => d.completed).join(', ')}`}>
                {data.map(day => {
                    const date = keyToDate(day.date)
                    return (
                        <div key={day.date} className="weekly-chart__day">
                            <div className="weekly-chart__bars">
                                <span
                                    className="weekly-chart__bar weekly-chart__bar--created"
                                    style={{ height: `${(day.created / max) * 100}%` }}
                                    title={`${day.created} created`}
                                />
                                <span
                                    className="weekly-chart__bar weekly-chart__bar--completed"
                                    style={{ height: `${(day.completed / max) * 100}%` }}
                                    title={`${day.completed} completed`}
                                />
                            </div>
                            <span className="weekly-chart__label">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                        </div>
                    )
                })}
            </div>
            <figcaption className="chart-legend">
                <span><i className="chart-legend__swatch chart-legend__swatch--completed" /> Completed</span>
                <span><i className="chart-legend__swatch chart-legend__swatch--created" /> Created</span>
            </figcaption>
        </figure>
    )
}

const STATUS_COLORS = {
    todo: 'var(--status-todo)',
    in_progress: 'var(--status-progress)',
    in_review: 'var(--status-review)',
    completed: 'var(--status-done)',
}

// Single stacked bar with a legend: how work is distributed across statuses
export function StatusBreakdown({ counts = {} }) {
    const total = TASK_STATUSES.reduce((sum, s) => sum + (counts[s.value] || 0), 0)
    return (
        <div className="status-breakdown">
            <div className="status-breakdown__bar" role="img" aria-label="Tasks by status">
                {total === 0 ? <span className="status-breakdown__empty" /> : TASK_STATUSES.map(s => counts[s.value] ? (
                    <span key={s.value} style={{ width: `${(counts[s.value] / total) * 100}%`, background: STATUS_COLORS[s.value] }} />
                ) : null)}
            </div>
            <ul className="status-breakdown__legend">
                {TASK_STATUSES.map(s => (
                    <li key={s.value}>
                        <span className="status-breakdown__swatch" style={{ background: STATUS_COLORS[s.value] }} />
                        <span className="status-breakdown__name">{s.label}</span>
                        <span className="status-breakdown__value tabular">{counts[s.value] || 0}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
