import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './dashboard.css'

const PRIORITIES = ['low', 'medium', 'high']
const TASKS_PER_PAGE = 10

const CATEGORIES = [
    { label: 'Food',      emoji: '🍔' },
    { label: 'Transport', emoji: '🚗' },
    { label: 'Household', emoji: '🏠' },
    { label: 'Shopping',  emoji: '🛒' },
    { label: 'Health',    emoji: '❤️' },
    { label: 'Education', emoji: '📚' },
    { label: 'Other',     emoji: '📌' },
]

function formatDate(dateStr) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr, completed) {
    if (!dateStr || completed) return false
    return new Date(dateStr) < new Date(new Date().toDateString())
}

export default function Dashboard({ setToken }) {
    const { theme, toggleTheme } = useTheme()

    // Task state
    const [tasks, setTasks]               = useState([])
    const [expandedTask, setExpandedTask] = useState(null) // task _id whose desc is shown

    // Add-task form state
    const [title, setTitle]             = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate]         = useState('')
    const [priority, setPriority]       = useState('medium')
    const [selectedCat, setSelectedCat] = useState('')

    // Filter / search / pagination
    const [search, setSearch]     = useState('')
    const [filter, setFilter]     = useState('all')
    const [catFilter, setCatFilter] = useState('')
    const [catDropOpen, setCatDropOpen] = useState(false)
    const [page, setPage]         = useState(1)

    const catDropRef = useRef(null)
    const navigate   = useNavigate()
    const token      = localStorage.getItem('token')
    const config     = { headers: { Authorization: `Bearer ${token}` } }

    // Close category dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (catDropRef.current && !catDropRef.current.contains(e.target))
                setCatDropOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const getUserName = () => {
        try { return JSON.parse(atob(token.split('.')[1])).name || 'there' }
        catch { return 'there' }
    }

    useEffect(() => {
        axios.get('http://localhost:5000/api/tasks', config)
            .then(res => setTasks(res.data))
            .catch(() => {})
    }, [])

    // Reset to page 1 whenever filters/search change
    useEffect(() => { setPage(1) }, [search, filter, catFilter])

    const pickCat = (label) => setSelectedCat(prev => prev === label ? '' : label)

    const addTask = async () => {
        if (!title.trim()) return
        const body = { title: title.trim(), priority, categories: selectedCat ? [selectedCat] : [] }
        if (description.trim()) body.description = description.trim()
        if (dueDate) body.dueDate = dueDate
        const res = await axios.post('http://localhost:5000/api/tasks', body, config)
        setTasks([res.data, ...tasks])
        setTitle(''); setDescription(''); setDueDate('')
        setPriority('medium'); setSelectedCat('')
    }

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) addTask() }

    const toggleComplete = async (task) => {
        const res = await axios.put(`http://localhost:5000/api/tasks/${task._id}`,
            { completed: !task.completed }, config)
        setTasks(tasks.map(t => t._id === task._id ? res.data : t))
    }

    const deleteTask = async (id) => {
        await axios.delete(`http://localhost:5000/api/tasks/${id}`, config)
        setTasks(tasks.filter(t => t._id !== id))
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        navigate('/')
    }

    // Derived filtered list (before pagination)
    const filtered = tasks
        .filter(t => filter === 'pending' ? !t.completed : filter === 'completed' ? t.completed : true)
        .filter(t => !catFilter || (t.categories && t.categories.includes(catFilter)))
        .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

    // Pagination
    const totalPages  = Math.max(1, Math.ceil(filtered.length / TASKS_PER_PAGE))
    const paginated   = filtered.slice((page - 1) * TASKS_PER_PAGE, page * TASKS_PER_PAGE)

    const total     = tasks.length
    const completed = tasks.filter(t => t.completed).length
    const remaining = total - completed

    // Active category label for dropdown button
    const activeCat = CATEGORIES.find(c => c.label === catFilter)

    return (
        <div>
            {/* ── Header ─────────────────────────────── */}
            <header className="dash-header">
                <div className="dash-logo">
                    <span className="dash-logo-icon">✅</span>
                    TaskManager
                </div>
                <div className="dash-header-right">
                    <span className="dash-greeting">Hey, {getUserName()} 👋</span>
                    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <button className="dash-logout-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            <main className="dash-main">
                {/* ── Stats ──────────────────────────────── */}
                <div className="dash-stats">
                    {[['Total', total], ['Done', completed], ['Left', remaining]].map(([label, val]) => (
                        <div key={label} className="stat-card">
                            <div className="stat-value">{val}</div>
                            <div className="stat-label">{label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Add Task ───────────────────────────── */}
                <div className="dash-add-card">
                    <p className="dash-add-title">➕ New Task</p>
                    <div className="dash-add-row">
                        <input
                            className="dash-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What needs to be done?"
                        />
                        <button className="dash-add-btn" onClick={addTask}>Add Task</button>
                    </div>

                    {/* Description */}
                    <textarea
                        className="dash-desc-input"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add more details about this task (optional)…"
                        rows={2}
                    />

                    {/* Due date + Priority */}
                    <div className="dash-add-meta">
                        <div className="dash-meta-field">
                            <label className="dash-meta-label">📅 Due Date</label>
                            <input
                                type="date"
                                className="dash-date-input"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            />
                        </div>
                        <div className="dash-meta-field">
                            <label className="dash-meta-label">🚦 Priority</label>
                            <div className="dash-priority-group">
                                {PRIORITIES.map(p => (
                                    <button key={p} type="button"
                                        className={`dash-priority-pick priority-pick-${p} ${priority === p ? 'selected' : ''}`}
                                        onClick={() => setPriority(p)}>{p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Categories picker — single choice */}
                    <div className="dash-meta-field" style={{ marginTop: '0.85rem' }}>
                        <label className="dash-meta-label">🏷️ Category <span style={{ opacity: 0.5, textTransform: 'none', fontSize: '0.75rem' }}>(optional)</span></label>
                        <div className="dash-cat-picker">
                            {CATEGORIES.map(({ label, emoji }) => (
                                <button key={label} type="button"
                                    className={`dash-cat-chip ${selectedCat === label ? 'active' : ''}`}
                                    onClick={() => pickCat(label)}>
                                    {emoji} {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Toolbar: Search + Status filters + Category dropdown ─── */}
                <div className="dash-toolbar">
                    <div className="dash-toolbar-row">
                        {/* Search */}
                        <div className="dash-search-wrap" style={{ flex: 1 }}>
                            <span className="dash-search-icon">🔍</span>
                            <input className="dash-search" value={search}
                                onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" />
                            {search && <button className="dash-search-clear" onClick={() => setSearch('')}>✕</button>}
                        </div>

                        {/* Category dropdown */}
                        <div className="dash-cat-dropdown" ref={catDropRef}>
                            <button
                                className={`dash-cat-drop-btn ${catFilter ? 'active' : ''}`}
                                onClick={() => setCatDropOpen(p => !p)}
                            >
                                {activeCat ? `${activeCat.emoji} ${activeCat.label}` : '🏷️ Category'}
                                <span className="dash-drop-arrow">{catDropOpen ? '▴' : '▾'}</span>
                            </button>
                            {catDropOpen && (
                                <div className="dash-cat-drop-menu">
                                    <button className={`dash-drop-item ${!catFilter ? 'active' : ''}`}
                                        onClick={() => { setCatFilter(''); setCatDropOpen(false) }}>
                                        🗂️ All Categories
                                    </button>
                                    {CATEGORIES.map(({ label, emoji }) => (
                                        <button key={label}
                                            className={`dash-drop-item ${catFilter === label ? 'active' : ''}`}
                                            onClick={() => { setCatFilter(label); setCatDropOpen(false) }}>
                                            {emoji} {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status filters */}
                    <div className="dash-filters">
                        {['all', 'pending', 'completed'].map(f => (
                            <button key={f}
                                className={`dash-filter-btn ${filter === f ? 'active' : ''}`}
                                onClick={() => setFilter(f)}>
                                {f === 'all' ? '☰ All' : f === 'pending' ? '⏳ Pending' : '✅ Done'}
                                <span className="dash-filter-count">
                                    {f === 'all' ? total : f === 'pending' ? remaining : completed}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Section header ─────────────────────── */}
                <div className="dash-section-header">
                    <span className="dash-section-title">📋 Tasks
                        {filtered.length > 0 && <span className="dash-result-count"> ({filtered.length})</span>}
                    </span>
                    {totalPages > 1 && (
                        <span className="dash-page-info">Page {page} of {totalPages}</span>
                    )}
                </div>

                {/* ── Task list ──────────────────────────── */}
                {paginated.length === 0 ? (
                    <div className="dash-empty">
                        <span className="dash-empty-icon">{search ? '🔍' : filter !== 'all' ? '🎯' : '🗂️'}</span>
                        <p className="dash-empty-text">
                            {search ? `No tasks match "${search}"` :
                             filter === 'pending' ? 'No pending tasks' :
                             filter === 'completed' ? 'No completed tasks yet' :
                             catFilter ? `No tasks in ${catFilter}` : 'No tasks yet'}
                        </p>
                        {!search && filter === 'all' && !catFilter &&
                            <p className="dash-empty-sub">Add your first task above to get started</p>}
                    </div>
                ) : (
                    <div className="dash-task-list">
                        {paginated.map(task => {
                            const overdue    = isOverdue(task.dueDate, task.completed)
                            const expanded   = expandedTask === task._id
                            const hasDesc    = task.description && task.description.trim()
                            const hasCats    = task.categories?.length > 0
                            const hasDetails = hasDesc || hasCats
                            return (
                                <div key={task._id}
                                    className={`task-card ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}>
                                    <input type="checkbox" className="task-checkbox"
                                        checked={task.completed} onChange={() => toggleComplete(task)} />

                                    <div className="task-body">
                                        <div className="task-title-row">
                                            <span className={`task-title ${task.completed ? 'done' : ''}`}>
                                                {task.title}
                                            </span>
                                            {hasDetails && (
                                                <button
                                                    className={`task-desc-toggle ${expanded ? 'open' : ''}`}
                                                    onClick={() => setExpandedTask(expanded ? null : task._id)}
                                                    title={expanded ? 'Collapse' : 'Show details'}
                                                >
                                                    {expanded ? '▴' : '▾'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded: description + category shown together */}
                                        {expanded && hasDetails && (
                                            <div className="task-expanded">
                                                {hasDesc && (
                                                    <p className="task-description">{task.description}</p>
                                                )}
                                                {hasCats && (
                                                    <div className="task-cats">
                                                        {task.categories.map(cat => {
                                                            const found = CATEGORIES.find(c => c.label === cat)
                                                            return (
                                                                <span key={cat} className="task-cat-tag">
                                                                    {found?.emoji ?? '🏷️'} {cat}
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Always-visible: due date only */}
                                        {task.dueDate && (
                                            <span className={`task-due ${overdue ? 'task-due-overdue' : ''}`}>
                                                {overdue ? '🔴' : '📅'} {formatDate(task.dueDate)}
                                                {overdue && ' · Overdue'}
                                            </span>
                                        )}
                                    </div>

                                    {task.priority && (
                                        <span className={`task-priority priority-${task.priority}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                    <button className="task-delete-btn" onClick={() => deleteTask(task._id)} title="Delete">🗑</button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* ── Pagination ─────────────────────────── */}
                {totalPages > 1 && (
                    <div className="dash-pagination">
                        <button
                            className="dash-page-btn"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            ← Previous
                        </button>
                        <div className="dash-page-dots">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n}
                                    className={`dash-page-dot ${n === page ? 'active' : ''}`}
                                    onClick={() => setPage(n)}
                                >{n}</button>
                            ))}
                        </div>
                        <button
                            className="dash-page-btn"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}