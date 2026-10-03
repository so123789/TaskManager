import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
    LayoutDashboard, ListTodo, FolderKanban, CalendarDays, Users, Bell, Settings,
    PanelLeftClose, PanelLeftOpen, Plus, X,
} from 'lucide-react'
import Logo from './Logo'
import { Avatar } from '../ui/Avatar'
import ProjectModal from '../projects/ProjectModal'
import { useAuth } from '../../context/AuthContext'
import { useProjects, useNotifications } from '../../hooks/queries'
import { cx } from '../../lib/utils'

const NAV = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'My Tasks', icon: ListTodo },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/team', label: 'Team', icon: Users },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, canCollapse, onToggleCollapse, mobile, open, onClose }) {
    const { user } = useAuth()
    const { data: projects } = useProjects()
    const { data: notifications } = useNotifications()
    const [creating, setCreating] = useState(false)
    const unread = notifications?.unreadCount || 0
    const recentProjects = (projects || []).filter(p => p.status !== 'completed').slice(0, 6)

    return (
        <aside
            className={cx('sidebar', collapsed && 'sidebar--collapsed', mobile && 'sidebar--drawer', open && 'is-open')}
            aria-label="Main navigation"
            aria-hidden={mobile && !open ? true : undefined}
            inert={mobile && !open ? true : undefined}
        >
            <div className="sidebar__header">
                <Link to="/dashboard" className="sidebar__brand" aria-label="TaskManager home">
                    <Logo showName={!collapsed} />
                </Link>
                {mobile && (
                    <button className="icon-btn" onClick={onClose} aria-label="Close navigation">
                        <X size={18} />
                    </button>
                )}
                {canCollapse && !collapsed && (
                    <button className="icon-btn sidebar__collapse" onClick={onToggleCollapse} aria-label="Collapse sidebar" title="Collapse sidebar">
                        <PanelLeftClose size={17} />
                    </button>
                )}
            </div>

            <nav className="sidebar__nav">
                {NAV.map(({ to, label, icon: Icon, badge }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => cx('nav-item', isActive && 'is-active')} title={collapsed ? label : undefined}>
                        <span className="nav-item__icon">
                            <Icon size={18} aria-hidden="true" />
                            {badge && unread > 0 && collapsed && <span className="nav-item__dot" />}
                        </span>
                        {!collapsed && <span className="nav-item__label">{label}</span>}
                        {badge && unread > 0 && !collapsed && (
                            <span className="nav-item__badge" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {!collapsed && (
                <div className="sidebar__section">
                    <div className="sidebar__section-header">
                        <span>Projects</span>
                        <button className="icon-btn icon-btn--sm" onClick={() => setCreating(true)} aria-label="New project" title="New project">
                            <Plus size={15} />
                        </button>
                    </div>
                    {recentProjects.length ? recentProjects.map(p => (
                        <NavLink key={p._id} to={`/projects/${p._id}`} className={({ isActive }) => cx('nav-item nav-item--project', isActive && 'is-active')}>
                            <span className="project-swatch" style={{ background: p.color }} aria-hidden="true" />
                            <span className="nav-item__label truncate">{p.name}</span>
                        </NavLink>
                    )) : (
                        <button className="sidebar__empty" onClick={() => setCreating(true)}>
                            <Plus size={14} /> Create a project
                        </button>
                    )}
                </div>
            )}

            <div className="sidebar__footer">
                {canCollapse && collapsed && (
                    <button className="nav-item" onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar">
                        <span className="nav-item__icon"><PanelLeftOpen size={18} /></span>
                    </button>
                )}
                {user && (
                    <NavLink to="/settings" className="sidebar__user" title={collapsed ? user.name : undefined}>
                        <Avatar user={user} size={32} />
                        {!collapsed && (
                            <span className="sidebar__user-text">
                                <span className="sidebar__user-name truncate">{user.name}</span>
                                <span className="sidebar__user-email truncate">{user.email}</span>
                            </span>
                        )}
                    </NavLink>
                )}
            </div>

            <ProjectModal open={creating} onClose={() => setCreating(false)} />
        </aside>
    )
}
