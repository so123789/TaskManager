import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '../../lib/utils'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessible dialog: focus is moved in and trapped, Escape / backdrop close,
// focus returns to the trigger on close. Becomes a bottom sheet on mobile.
export default function Modal({ open, onClose, title, description, size = 'md', children, footer, className, initialFocus = true }) {
    const panelRef = useRef(null)
    const titleId = useId()

    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement
        const panel = panelRef.current
        document.body.style.overflow = 'hidden'

        if (initialFocus) {
            const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE)
            ;(first || panel)?.focus()
        } else {
            panel?.focus()
        }

        const onKeyDown = (e) => {
            // Only the topmost dialog reacts (e.g. a confirm opened over a task)
            const layers = document.querySelectorAll('.modal-backdrop')
            if (layers[layers.length - 1] !== panel?.parentElement) return
            if (e.key === 'Escape') {
                // An open dropdown inside the dialog closes first
                if (panel.querySelector('.menu__panel')) return
                e.stopPropagation()
                onClose()
            }
            if (e.key === 'Tab' && panel) {
                const items = [...panel.querySelectorAll(FOCUSABLE)]
                if (!items.length) return
                const first = items[0]
                const last = items[items.length - 1]
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = ''
            previouslyFocused?.focus?.()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    if (!open) return null

    return createPortal(
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div
                ref={panelRef}
                className={cx('modal', `modal--${size}`, className)}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
            >
                {title && (
                    <header className="modal__header">
                        <div>
                            <h2 id={titleId} className="modal__title">{title}</h2>
                            {description && <p className="modal__description">{description}</p>}
                        </div>
                        <button className="modal__close" onClick={onClose} aria-label="Close dialog">
                            <X size={18} />
                        </button>
                    </header>
                )}
                <div className="modal__body">{children}</div>
                {footer && <footer className="modal__footer">{footer}</footer>}
            </div>
        </div>,
        document.body
    )
}
