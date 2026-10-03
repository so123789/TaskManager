import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { TOKEN_KEY, SESSION_EXPIRED_EVENT } from '../api/client'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

const readToken = () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

// status: 'loading' while an existing token is verified, then
// 'authenticated' or 'anonymous'
export function AuthProvider({ children }) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const [token, setToken] = useState(readToken)
    const [user, setUser] = useState(null)
    const [status, setStatus] = useState(() => (readToken() ? 'loading' : 'anonymous'))

    const clearSession = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
        setStatus('anonymous')
        queryClient.clear()
    }, [queryClient])

    // Restore the session on page load
    useEffect(() => {
        if (!token || user) return
        let cancelled = false
        authApi.me()
            .then(res => { if (!cancelled) { setUser(res.user); setStatus('authenticated') } })
            .catch(err => {
                if (cancelled) return
                // Keep the user signed in on network errors; only a 401 ends the session
                if (err.response?.status === 401) clearSession()
                else setStatus('authenticated')
            })
        return () => { cancelled = true }
    }, [token, user, clearSession])

    useEffect(() => {
        const onExpired = () => {
            if (!readToken()) return
            clearSession()
            toast.error('Your session has expired. Please sign in again.')
        }
        window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
    }, [clearSession, toast])

    const signIn = useCallback(({ token: newToken, user: newUser }) => {
        localStorage.setItem(TOKEN_KEY, newToken)
        queryClient.clear()
        setToken(newToken)
        setUser(newUser)
        setStatus('authenticated')
    }, [queryClient])

    const value = useMemo(() => ({
        token, user, status,
        isAuthenticated: status === 'authenticated',
        signIn,
        signOut: clearSession,
        setUser,
    }), [token, user, status, signIn, clearSession])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}
