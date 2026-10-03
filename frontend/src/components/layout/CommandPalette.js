import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
    Search, CornerDownLeft, LayoutDashboard, ListTodo, FolderKanban, CalendarDays, Users, Bell, Settings, Plus,
} from 'lucide-react'
import useDebounce from '../../hooks/useDebounce'
import { useTasks, useProjects } from '../../hooks/queries'
import { useTaskModal } from '../../context/TaskModalContext'
import { StatusDot } from '../ui/Badge'
import Spinner from '../ui/Spinner'
import { cx } from '../../lib/utils'

const PAGES = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Tasks', to: '/tasks', icon: ListTodo },
    { label: 'Projects', to: '/projects', icon: FolderKanban },
    { label: 'Calendar', to: '/calendar', icon: CalendarDays },
    { label: 'Team', to: '/team', icon: Users },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Settings', to: '/settings', icon: Settings },
]

// Global search (Ctrl/⌘+K). Task search hits the API (debounced); projects
// and pages are filtered locally since they're already cached.
export default function CommandPalette({ open, onClose }) {
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const debounced = useDebounce(query.trim(), 250)
    const navigate = useNavigate()
    const { openTask, createTask } = useTaskModal()
    const inputRef = useRef(null)
    const listRef = useRef(null)

    const { data: projects = [] } = useProjects()
    const tasksQuery = useTasks({ q: debounced, limit: 8, sort: 'updatedAt' }, { enabled: open && debounced.length > 0 })
    const searching = debounced.length > 0 && tasksQuery.isFetching

    useEffect(() => {
        if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0) }
    }, [open])

    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        const go = (to) => () => navigate(to)
        const sections = []
        if (!q) {
            sections.push({ title: 'Quick actions', items: [{ id: 'new-task', label: 'Create new task', icon: Plus, run: () => createTask() }] })
            sections.push({ title: 'Go to', items: PAGES.map(p => ({ id: p.to, label: p.label, icon: p.icon, run: go(p.to) })) })
            return sections
        }
        const tasks = debounced ? (tasksQuery.data || []) : []
        if (tasks.length) {
            sections.push({
                title: 'Tasks',
                items: tasks.map(t => ({
                    id: t._id, label: t.title, status: t.status,
                    hint: t.project?.name, run: () => openTask(t._id),
                })),
            })
        }
        const matchedProjects = projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5)
        if (matchedProjects.length) {
            sections.push({
                title: 'Projects',
                items: matchedProjects.map(p => ({ id: p._id, label: p.name, color: p.color, run: go(`/projects/${p._id}`) })),
            })
        }
        const pages = PAGES.filter(p => p.label.toLowerCase().includes(q))
        if (pages.length) sections.push({ title: 'Pages', items: pages.map(p => ({ id: p.to, label: p.label, icon: p.icon, run: go(p.to) })) })
        return sections
    }, [query, debounced, tasksQuery.data, projects, navigate, openTask, createTask])

    const flat = results.flatMap(s => s.items)
    useEffect(() => { setActive(0) }, [query])

    useEffect(() => {
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
    }, [active])

    if (!open) return null

    const run = (item) => { onClose(); item.run() }
    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, flat.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
        else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); run(flat[active]) }
        else if (e.key === 'Escape') onClose()
    }

    let index = -1
    return createPortal(
        <div className="modal-backdrop palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="palette" role="dialog" aria-modal="true" aria-label="Search">
                <div className="palette__input-row">
                    <Search size={18} aria-hidden="true" />
                    <input
                        ref={inputRef}
                        className="palette__input"
                        placeholder="Search tasks, projects or pages…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="palette-results"
                        aria-activedescendant={flat[active] ? `palette-${flat[active].id}` : undefined}
                    />
                    {searching && <Spinner size={14} />}
                    <kbd className="palette__esc" onClick={onClose}>Esc</kbd>
                </div>
                <div className="palette__results" id="palette-results" role="listbox" ref={listRef}>
                    {results.map(section => (
                        <div key={section.title} className="palette__section">
                            <div className="palette__section-title">{section.title}</div>
                            {section.items.map(item => {
                                index += 1
                                const i = index
                                const Icon = item.icon
                                return (
                                    <button
                                        key={item.id}
                                        id={`palette-${item.id}`}
                                        role="option"
                                        aria-selected={active === i}
                                        data-active={active === i}
                                        className={cx('palette__item', active === i && 'is-active')}
                                        onMouseMove={() => setActive(i)}
                                        onClick={() => run(item)}
                                    >
                                        {Icon && <Icon size={16} aria-hidden="true" />}
                                        {item.status && <StatusDot status={item.status} />}
                                        {item.color && <span className="project-swatch" style={{ background: item.color }} />}
                                        <span className="truncate">{item.label}</span>
                                        {item.hint && <span className="palette__hint truncate">{item.hint}</span>}
                                        {active === i && <CornerDownLeft size={14} className="palette__enter" aria-hidden="true" />}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                    {query.trim() && !flat.length && !searching && debounced === query.trim() && (
                        <p className="palette__empty">No results for "{query.trim()}"</p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
