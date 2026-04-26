import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './auth.css'

export default function Login({ setToken }) {
    const { theme, toggleTheme } = useTheme()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [pendingToken, setPendingToken] = useState(null)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', form)
            localStorage.setItem('token', res.data.token)
            setPendingToken(res.data.token)
            setShowModal(true)
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.msg || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            {/* Header */}
            <header className="auth-header">
                <span className="auth-logo">
                    <span className="auth-logo-icon">✅</span>
                    TaskManager
                </span>
                <nav className="auth-header-nav">
                    <Link to="/" className="active">Login</Link>
                    <Link to="/register">Register</Link>
                </nav>
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </header>

            {/* Card */}
            <div className="auth-card">
                <h1 className="auth-card-title">Welcome back 👋</h1>
                <p className="auth-card-subtitle">Sign in to continue to your tasks</p>

                {error && <p className="auth-error">⚠️ {error}</p>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label>Password</label>
                        <div className="auth-password-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                className="auth-eye-btn"
                                onClick={() => setShowPassword(p => !p)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>
                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Register</Link>
                </p>
            </div>

            {/* Success Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <span className="modal-icon">🎉</span>
                        <h2 className="modal-title">Welcome back!</h2>
                        <p className="modal-message">You've successfully signed in. Let's get things done.</p>
                        <button className="modal-btn" onClick={() => { setToken(pendingToken); navigate('/dashboard') }}>
                            Go to Dashboard →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}