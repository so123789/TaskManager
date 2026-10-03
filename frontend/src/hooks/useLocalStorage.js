import { useCallback, useState } from 'react'

// useState that persists to localStorage. Storage failures (private mode,
// blocked storage) fall back to in-memory state.
export default function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key)
            return stored !== null ? JSON.parse(stored) : initialValue
        } catch {
            return initialValue
        }
    })

    const update = useCallback((next) => {
        setValue(prev => {
            const resolved = typeof next === 'function' ? next(prev) : next
            try { localStorage.setItem(key, JSON.stringify(resolved)) } catch { /* ignore */ }
            return resolved
        })
    }, [key])

    return [value, update]
}
