import { useState, useRef, useCallback } from 'react'
import useClickOutside from '../../hooks/useClickOutside'
import { cx } from '../../lib/utils'

// Lightweight dropdown. `trigger` receives { open, toggle, props } so any
// element can be the trigger; `children` receives { close }.
export default function Menu({ trigger, children, align = 'end', className, panelClassName }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const close = useCallback(() => setOpen(false), [])
    useClickOutside(ref, close, open)

    return (
        <div className={cx('menu', className)} ref={ref}>
            {trigger({
                open,
                toggle: () => setOpen(o => !o),
                props: { 'aria-haspopup': 'menu', 'aria-expanded': open, onClick: () => setOpen(o => !o) },
            })}
            {open && (
                <div className={cx('menu__panel', `menu__panel--${align}`, panelClassName)} role="menu">
                    {typeof children === 'function' ? children({ close }) : children}
                </div>
            )}
        </div>
    )
}

export function MenuItem({ icon: Icon, children, onClick, danger, active, ...props }) {
    return (
        <button
            type="button"
            role="menuitem"
            className={cx('menu__item', danger && 'menu__item--danger', active && 'is-active')}
            onClick={onClick}
            {...props}
        >
            {Icon && <Icon size={15} aria-hidden="true" />}
            <span className="truncate">{children}</span>
        </button>
    )
}

export const MenuDivider = () => <div className="menu__divider" role="separator" />
export const MenuLabel = ({ children }) => <div className="menu__label">{children}</div>
