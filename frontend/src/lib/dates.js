// Due dates are date-only values stored as UTC midnight ("2026-10-02T00:00:00Z").
// They are always compared as YYYY-MM-DD keys so a task due "today" never
// flips to overdue (or to yesterday) because of the user's timezone.

const pad = (n) => String(n).padStart(2, '0')

export const localKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const dueKey = (value) => (value ? String(value).slice(0, 10) : '')

export const todayKey = () => localKey(new Date())

export const keyToDate = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d)
}

export const addDays = (date, days) => {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

// The user's UTC offset in "+05:30" form, sent to the API for date bucketing
export function tzOffset() {
    const minutes = -new Date().getTimezoneOffset()
    const sign = minutes >= 0 ? '+' : '-'
    const abs = Math.abs(minutes)
    return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export function isOverdue(task) {
    return Boolean(task?.dueDate) && task.status !== 'completed' && dueKey(task.dueDate) < todayKey()
}

export function daysFromToday(value) {
    const diff = keyToDate(dueKey(value)) - keyToDate(todayKey())
    return Math.round(diff / 86400000)
}

export function formatDate(value, { withYear } = {}) {
    if (!value) return ''
    const date = keyToDate(dueKey(value))
    const sameYear = date.getFullYear() === new Date().getFullYear()
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(withYear || !sameYear ? { year: 'numeric' } : {}),
    })
}

// For real timestamps (createdAt etc.), shown in the user's local date
export function formatTimestamp(value) {
    if (!value) return ''
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// "Today", "Tomorrow", "Yesterday", "3 days ago" or a short date
export function dueLabel(value) {
    if (!value) return ''
    const days = daysFromToday(value)
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days === -1) return 'Yesterday'
    if (days < -1 && days > -7) return `${-days} days ago`
    return formatDate(value)
}

export function relativeTime(value) {
    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
    if (seconds < 45) return 'just now'
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function greeting(date = new Date()) {
    const hour = date.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
}

// 6x7 grid of dates for a month view, weeks starting on Monday
export function monthGrid(year, month) {
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7
    const start = addDays(first, -offset)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
