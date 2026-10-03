import axios from 'axios'

export const TOKEN_KEY = 'token'
export const SESSION_EXPIRED_EVENT = 'auth:expired'

const client = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 30000,
})

// Attach the JWT to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// A 401 on an authenticated request means the session is gone; let the
// AuthProvider log the user out instead of every caller handling it
client.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadToken = Boolean(error.config?.headers?.Authorization)
        if (error.response?.status === 401 && hadToken) {
            window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
        }
        return Promise.reject(error)
    }
)

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
    if (error?.response?.data?.message) return error.response.data.message
    if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    if (error?.request && !error.response) return 'Unable to reach the server. Check your connection and try again.'
    return fallback
}

export default client
