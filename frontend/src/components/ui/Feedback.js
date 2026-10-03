import { AlertTriangle, RotateCw } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { cx } from '../../lib/utils'
import Button from './Button'

export function Skeleton({ width, height = 14, radius, className, style }) {
    return <span className={cx('skeleton', className)} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />
}

export function EmptyState({ icon: Icon, title, description, action, compact }) {
    return (
        <div className={cx('empty-state', compact && 'empty-state--compact')}>
            {Icon && <span className="empty-state__icon"><Icon size={compact ? 20 : 24} aria-hidden="true" /></span>}
            <h3 className="empty-state__title">{title}</h3>
            {description && <p className="empty-state__description">{description}</p>}
            {action && <div className="empty-state__action">{action}</div>}
        </div>
    )
}

export function ErrorState({ error, title = 'Something went wrong', description, onRetry, compact }) {
    return (
        <div className={cx('empty-state empty-state--error', compact && 'empty-state--compact')} role="alert">
            <span className="empty-state__icon"><AlertTriangle size={22} aria-hidden="true" /></span>
            <h3 className="empty-state__title">{title}</h3>
            <p className="empty-state__description">{description || getErrorMessage(error)}</p>
            {onRetry && (
                <div className="empty-state__action">
                    <Button icon={RotateCw} onClick={onRetry}>Try again</Button>
                </div>
            )}
        </div>
    )
}

export function ProgressBar({ value = 0, color, size = 'md', label }) {
    const pct = Math.max(0, Math.min(100, value))
    return (
        <div className={cx('progress', `progress--${size}`)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <span className="progress__fill" style={{ width: `${pct}%`, background: color }} />
        </div>
    )
}

export function ProgressRing({ value = 0, size = 64, stroke = 6, color = 'var(--accent)', children }) {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const pct = Math.max(0, Math.min(100, value))
    return (
        <div className="progress-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-subtle)" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct / 100)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }}
                />
            </svg>
            <span className="progress-ring__label">{children ?? `${pct}%`}</span>
        </div>
    )
}
