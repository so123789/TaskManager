import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const DURATION = 4000

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef(new Map())

    const dismiss = useCallback((id) => {
        setToasts(list => list.filter(t => t.id !== id))
        clearTimeout(timers.current.get(id))
        timers.current.delete(id)
    }, [])

    const show = useCallback((type, message, options = {}) => {
        const id = Math.random().toString(36).slice(2)
        // Cap the stack so a burst of errors doesn't cover the screen
        setToasts(list => [...list.slice(-3), { id, type, message, action: options.action }])
        timers.current.set(id, setTimeout(() => dismiss(id), options.duration || DURATION))
        return id
    }, [dismiss])

    useEffect(() => {
        const active = timers.current
        return () => active.forEach(clearTimeout)
    }, [])

    // Stable API object so consumers don't re-render when toasts change
    const api = useMemo(() => ({
        success: (msg, opts) => show('success', msg, opts),
        error: (msg, opts) => show('error', msg, opts),
        info: (msg, opts) => show('info', msg, opts),
        dismiss,
    }), [show, dismiss])

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
                {toasts.map(({ id, type, message, action }) => {
                    const Icon = ICONS[type]
                    return (
                        <div key={id} className={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'}>
                            <Icon size={18} className="toast__icon" aria-hidden="true" />
                            <p className="toast__message">{message}</p>
                            {action && (
                                <button className="toast__action" onClick={() => { action.onClick(); dismiss(id) }}>
                                    {action.label}
                                </button>
                            )}
                            <button className="toast__close" onClick={() => dismiss(id)} aria-label="Dismiss">
                                <X size={14} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    return useContext(ToastContext)
}
