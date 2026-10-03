import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
    } catch {
        return 'system'
    }
}

// Theme preference is 'light' | 'dark' | 'system'; `theme` is what's applied
export function ThemeProvider({ children }) {
    const [preference, setPreference] = useState(readPreference)
    const [systemDark, setSystemDark] = useState(() => media().matches)

    useEffect(() => {
        const query = media()
        const onChange = (e) => setSystemDark(e.matches)
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [])

    const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

    // Apply theme to <html> data-theme attribute whenever it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        document.querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', theme === 'dark' ? '#0d0f13' : '#f4f5f8')
    }, [theme])

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, preference) } catch { /* storage unavailable */ }
    }, [preference])

    const toggleTheme = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [theme])

    const value = useMemo(
        () => ({ theme, preference, setPreference, toggleTheme }),
        [theme, preference, toggleTheme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Convenience hook
export function useTheme() {
    return useContext(ThemeContext)
}
