import { NavLink } from 'react-router-dom'
import { cx } from '../../lib/utils'

// Route-driven tabs: each tab is a link so tabs are bookmarkable and work with back/forward
export default function Tabs({ tabs, label }) {
    return (
        <nav className="tabs" aria-label={label}>
            {tabs.map(({ to, label: text, icon: Icon, count, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('tabs__item', isActive && 'is-active')}>
                    {Icon && <Icon size={15} aria-hidden="true" />}
                    {text}
                    {count !== undefined && <span className="tabs__count">{count}</span>}
                </NavLink>
            ))}
        </nav>
    )
}
