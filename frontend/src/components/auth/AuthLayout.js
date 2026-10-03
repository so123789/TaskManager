import { Sun, Moon, CheckCircle2, Kanban, CalendarDays, Bell } from 'lucide-react'
import Logo from '../layout/Logo'
import { useTheme } from '../../context/ThemeContext'
import './auth.css'

const HIGHLIGHTS = [
    { icon: Kanban, text: 'Plan work on Kanban boards and lists' },
    { icon: CalendarDays, text: 'See every deadline on a shared calendar' },
    { icon: Bell, text: 'Stay in sync with assignments and comments' },
]

// Split-screen shell shared by every auth page
export default function AuthLayout({ title, subtitle, children, footer }) {
    const { theme, toggleTheme } = useTheme()
    return (
        <div className="auth">
            <aside className="auth__brand" aria-hidden="true">
                <Logo />
                <div className="auth__pitch">
                    <h2>Projects, tasks and teams. All in one calm workspace.</h2>
                    <ul>
                        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                            <li key={text}><span><Icon size={16} /></span>{text}</li>
                        ))}
                    </ul>
                </div>
                <div className="auth__preview">
                    {[['Design review', 'In Review', 72], ['Launch checklist', 'In Progress', 45], ['User interviews', 'Completed', 100]].map(([name, status, pct]) => (
                        <div key={name} className="auth__preview-card">
                            <div className="auth__preview-row">
                                <strong>{name}</strong>
                                {pct === 100 ? <CheckCircle2 size={15} /> : <span>{status}</span>}
                            </div>
                            <div className="auth__preview-bar"><span style={{ width: `${pct}%` }} /></div>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="auth__panel">
                <div className="auth__topbar">
                    <span className="auth__mobile-logo"><Logo /></span>
                    <button
                        className="icon-btn icon-btn--bordered"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                </div>
                <div className="auth__form-wrap">
                    <h1 className="auth__title">{title}</h1>
                    {subtitle && <p className="auth__subtitle">{subtitle}</p>}
                    {children}
                    {footer && <p className="auth__footer">{footer}</p>}
                </div>
            </main>
        </div>
    )
}
