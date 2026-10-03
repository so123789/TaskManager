import { forwardRef } from 'react'
import { cx } from '../../lib/utils'
import Spinner from './Spinner'

// variant: primary | secondary | ghost | danger;  size: sm | md | lg
const Button = forwardRef(function Button(
    { variant = 'secondary', size = 'md', icon: Icon, iconOnly, loading, className, children, type = 'button', ...props },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cx('btn', `btn--${variant}`, `btn--${size}`, iconOnly && 'btn--icon', loading && 'is-loading', className)}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? <Spinner size={size === 'sm' ? 12 : 14} /> : Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
            {!iconOnly && children}
        </button>
    )
})

export default Button
