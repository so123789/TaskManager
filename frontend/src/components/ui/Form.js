import { forwardRef, useId, cloneElement, isValidElement } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '../../lib/utils'

// Label + control + hint/error, wired up with ids and aria attributes
export function Field({ label, hint, error, children, className, optional }) {
    const id = useId()
    const messageId = `${id}-msg`
    const control = isValidElement(children)
        ? cloneElement(children, {
            id: children.props.id || id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': error || hint ? messageId : undefined,
        })
        : children
    return (
        <div className={cx('field', error && 'field--error', className)}>
            {label && (
                <label className="field__label" htmlFor={children?.props?.id || id}>
                    {label}{optional && <span className="field__optional">Optional</span>}
                </label>
            )}
            {control}
            {(error || hint) && <p id={messageId} className={error ? 'field__error' : 'field__hint'}>{error || hint}</p>}
        </div>
    )
}

export const Input = forwardRef(function Input({ className, icon: Icon, ...props }, ref) {
    if (!Icon) return <input ref={ref} className={cx('input', className)} {...props} />
    return (
        <div className="input-wrap">
            <Icon size={16} className="input-wrap__icon" aria-hidden="true" />
            <input ref={ref} className={cx('input input--with-icon', className)} {...props} />
        </div>
    )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cx('input textarea', className)} {...props} />
})

// Native select keeps keyboard and mobile pickers working for free
export const Select = forwardRef(function Select({ className, options, placeholder, ...props }, ref) {
    return (
        <div className={cx('select', className)}>
            <select ref={ref} className="input select__control" {...props}>
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={15} className="select__chevron" aria-hidden="true" />
        </div>
    )
})

export function SegmentedControl({ options, value, onChange, label, size }) {
    return (
        <div className={cx('segmented', size && `segmented--${size}`)} role="radiogroup" aria-label={label}>
            {options.map(({ value: v, label: l, icon: Icon }) => (
                <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={value === v}
                    className={cx('segmented__item', value === v && 'is-active')}
                    onClick={() => onChange(v)}
                >
                    {Icon && <Icon size={15} aria-hidden="true" />}
                    <span>{l}</span>
                </button>
            ))}
        </div>
    )
}
