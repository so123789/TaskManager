import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarCheck } from 'lucide-react'
import Button from '../ui/Button'
import { StatusDot, PriorityIcon } from '../ui/Badge'
import { ErrorState, EmptyState } from '../ui/Feedback'
import { useTasks } from '../../hooks/queries'
import { useTaskModal } from '../../context/TaskModalContext'
import { monthGrid, localKey, todayKey, dueKey, addDays, keyToDate, isOverdue, WEEKDAYS } from '../../lib/dates'
import { cx, plural } from '../../lib/utils'

const MAX_PILLS = 3

export default function CalendarMonth({ projectId }) {
    const today = todayKey()
    const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
    const [selected, setSelected] = useState(today)
    const { openTask, createTask } = useTaskModal()

    const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
    // Due dates are stored as UTC midnight, so the window is expressed the same way
    const range = useMemo(() => ({
        from: `${localKey(days[0])}T00:00:00.000Z`,
        to: `${localKey(addDays(days[days.length - 1], 1))}T00:00:00.000Z`,
    }), [days])

    const { data: tasks = [], isLoading, isError, error, refetch } = useTasks({ ...range, project: projectId, sort: 'dueDate', limit: 1000 })

    const byDay = useMemo(() => {
        const map = {}
        tasks.forEach(t => { (map[dueKey(t.dueDate)] ||= []).push(t) })
        return map
    }, [tasks])

    const move = (delta) => {
        const date = new Date(cursor.year, cursor.month + delta, 1)
        setCursor({ year: date.getFullYear(), month: date.getMonth() })
        setSelected(localKey(date))
    }
    const goToday = () => {
        const d = new Date()
        setCursor({ year: d.getFullYear(), month: d.getMonth() })
        setSelected(today)
    }

    const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const selectedTasks = byDay[selected] || []
    const selectedLabel = keyToDate(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    const monthTotal = tasks.filter(t => keyToDate(dueKey(t.dueDate)).getMonth() === cursor.month).length

    return (
        <div className="calendar-layout">
            <section className="calendar card" aria-label="Calendar">
                <header className="calendar__header">
                    <div>
                        <h2 className="calendar__title">{monthLabel}</h2>
                        <p className="calendar__subtitle">{isLoading ? 'Loading…' : `${plural(monthTotal, 'task')} due this month`}</p>
                    </div>
                    <div className="calendar__nav">
                        <Button size="sm" onClick={goToday}>Today</Button>
                        <button className="icon-btn icon-btn--bordered" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
                        <button className="icon-btn icon-btn--bordered" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={16} /></button>
                    </div>
                </header>

                {isError ? <ErrorState error={error} title="Couldn't load the calendar" onRetry={refetch} /> : (
                    <div className="calendar__grid" role="grid" aria-label={monthLabel}>
                        {WEEKDAYS.map(d => <div key={d} className="calendar__weekday" role="columnheader">{d}</div>)}
                        {days.map(date => {
                            const key = localKey(date)
                            const dayTasks = byDay[key] || []
                            const outside = date.getMonth() !== cursor.month
                            const hasOverdue = dayTasks.some(isOverdue)
                            return (
                                <div
                                    key={key}
                                    role="gridcell"
                                    className={cx('calendar__day', outside && 'is-outside', key === today && 'is-today', key === selected && 'is-selected')}
                                    onClick={() => setSelected(key)}
                                >
                                    <button
                                        className="calendar__date"
                                        onClick={(e) => { e.stopPropagation(); setSelected(key) }}
                                        aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, ${plural(dayTasks.length, 'task')}`}
                                        aria-pressed={key === selected}
                                    >
                                        {date.getDate()}
                                    </button>
                                    {!isLoading && (
                                        <>
                                            <div className="calendar__pills">
                                                {dayTasks.slice(0, MAX_PILLS).map(t => (
                                                    <button
                                                        key={t._id}
                                                        className={cx('calendar-pill', `calendar-pill--${t.status}`, isOverdue(t) && 'is-overdue')}
                                                        onClick={(e) => { e.stopPropagation(); openTask(t._id) }}
                                                        title={t.title}
                                                    >
                                                        <span className="truncate">{t.title}</span>
                                                    </button>
                                                ))}
                                                {dayTasks.length > MAX_PILLS && (
                                                    <span className="calendar__more">+{dayTasks.length - MAX_PILLS} more</span>
                                                )}
                                            </div>
                                            {dayTasks.length > 0 && (
                                                <span className={cx('calendar__dots', hasOverdue && 'is-overdue')} aria-hidden="true">
                                                    {dayTasks.slice(0, 3).map(t => <span key={t._id} />)}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <aside className="agenda card" aria-label="Selected day">
                <header className="agenda__header">
                    <div>
                        <h2 className="agenda__title">{selected === today ? 'Today' : selectedLabel}</h2>
                        {selected === today && <p className="agenda__subtitle">{selectedLabel}</p>}
                    </div>
                    <Button size="sm" icon={Plus} onClick={() => createTask({ dueDate: selected, project: projectId })}>Add</Button>
                </header>
                {selectedTasks.length ? (
                    <ul className="agenda__list">
                        {selectedTasks.map(t => (
                            <li key={t._id}>
                                <button className={cx('agenda-item', t.status === 'completed' && 'is-done')} onClick={() => openTask(t._id)}>
                                    <StatusDot status={t.status} />
                                    <span className="agenda-item__text">
                                        <span className="agenda-item__title">{t.title}</span>
                                        {t.project && !projectId && <span className="agenda-item__project">{t.project.name}</span>}
                                    </span>
                                    {isOverdue(t) && <span className="agenda-item__overdue">Overdue</span>}
                                    <PriorityIcon priority={t.priority} />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState compact icon={CalendarCheck} title="Nothing due" description="No tasks are due on this day." />
                )}
            </aside>
        </div>
    )
}
