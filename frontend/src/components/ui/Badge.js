import { STATUS_LABEL, PRIORITY_LABEL, PROJECT_STATUS_LABEL } from '../../lib/constants'
import { cx } from '../../lib/utils'

export function Badge({ tone = 'neutral', children, className }) {
    return <span className={cx('badge', `badge--${tone}`, className)}>{children}</span>
}

export function StatusDot({ status }) {
    return <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
}

export function StatusBadge({ status }) {
    return (
        <span className="status-badge">
            <StatusDot status={status} />
            {STATUS_LABEL[status] || status}
        </span>
    )
}

// Signal-strength style bars: shape carries meaning, colour only for high/urgent
export function PriorityIcon({ priority, size = 14 }) {
    if (priority === 'urgent') {
        return (
            <svg width={size} height={size} viewBox="0 0 16 16" className="priority-icon priority-icon--urgent" aria-hidden="true">
                <rect x="1" y="1" width="14" height="14" rx="3.5" fill="currentColor" />
                <rect x="7.1" y="4" width="1.8" height="5.2" rx=".9" fill="var(--surface)" />
                <circle cx="8" cy="11.4" r="1.05" fill="var(--surface)" />
            </svg>
        )
    }
    const level = { low: 1, medium: 2, high: 3 }[priority] || 0
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" className={`priority-icon priority-icon--${priority}`} aria-hidden="true">
            {[0, 1, 2].map(i => (
                <rect key={i} x={2 + i * 4.5} y={10 - i * 3.5} width="3" height={4 + i * 3.5} rx="1"
                    fill="currentColor" opacity={i < level ? 1 : 0.22} />
            ))}
        </svg>
    )
}

export function PriorityBadge({ priority, compact }) {
    return (
        <span className={cx('priority-badge', `priority-badge--${priority}`)} title={`${PRIORITY_LABEL[priority]} priority`}>
            <PriorityIcon priority={priority} />
            {!compact && PRIORITY_LABEL[priority]}
        </span>
    )
}

const PROJECT_TONE = { planning: 'info', active: 'accent', on_hold: 'warning', completed: 'success' }

export function ProjectStatusBadge({ status }) {
    return <Badge tone={PROJECT_TONE[status]}>{PROJECT_STATUS_LABEL[status] || status}</Badge>
}

export function LabelChip({ children, onRemove }) {
    return (
        <span className="label-chip">
            {children}
            {onRemove && (
                <button type="button" onClick={onRemove} aria-label={`Remove label ${children}`}>×</button>
            )}
        </span>
    )
}
