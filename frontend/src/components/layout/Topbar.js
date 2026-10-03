import { Menu as MenuIcon, Search, Plus, Sun, Moon } from 'lucide-react'
import Button from '../ui/Button'
import NotificationsMenu from './NotificationsMenu'
import ProfileMenu from './ProfileMenu'
import Logo from './Logo'
import { useTheme } from '../../context/ThemeContext'
import { useTaskModal } from '../../context/TaskModalContext'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function Topbar({ onOpenMenu, onOpenSearch, mobile }) {
    const { theme, toggleTheme } = useTheme()
    const { createTask } = useTaskModal()

    return (
        <header className="topbar">
            {mobile && (
                <>
                    <button className="icon-btn" onClick={onOpenMenu} aria-label="Open navigation">
                        <MenuIcon size={20} />
                    </button>
                    <Logo showName={false} />
                </>
            )}

            <button className="search-trigger" onClick={onOpenSearch} aria-label="Search tasks and projects">
                <Search size={16} aria-hidden="true" />
                <span className="search-trigger__text">Search tasks and projects…</span>
                <kbd className="search-trigger__kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
            </button>

            <div className="topbar__actions">
                <Button variant="primary" icon={Plus} onClick={() => createTask()} className="topbar__new" aria-label="New task">
                    <span className="topbar__new-label">New task</span>
                </Button>
                <button
                    className="icon-btn icon-btn--bordered topbar__theme"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    title="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <NotificationsMenu />
                <ProfileMenu />
            </div>
        </header>
    )
}
