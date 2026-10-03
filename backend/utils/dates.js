// Due dates are stored as date-only values (UTC midnight of the chosen day).
// The client sends its local calendar date (`today=YYYY-MM-DD`) and UTC offset
// (`tz=+05:30`) so "overdue" and "this week" match what the user sees.

const DAY_MS = 24 * 60 * 60 * 1000

function parseToday(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T00:00:00.000Z`)
        if (!Number.isNaN(date.getTime())) return date
    }
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function parseTimezone(value) {
    return typeof value === 'string' && /^[+-]\d{2}:\d{2}$/.test(value) ? value : '+00:00'
}

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS)

module.exports = { DAY_MS, parseToday, parseTimezone, addDays }
