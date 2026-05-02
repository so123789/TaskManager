import { useState } from 'react'
import API from '../api'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './auth.css'

export default function Register({ setToken }) {
    const { theme, toggleTheme } = useTheme()
    const [form, setForm] = useState({ name: '', email: '', password: '' })
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
            const res = await API.post('/api/auth/register', form)
            localStorage.setItem('token', res.data.token)
            setPendingToken(res.data.token)
            setShowModal(true)
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.msg || 'Registration failed')
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
                    <Link to="/">Login</Link>
                    <Link to="/register" className="active">Register</Link>
                </nav>
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </header>

            {/* Card */}
            <div className="auth-card">
                <h1 className="auth-card-title">Create account 🚀</h1>
                <p className="auth-card-subtitle">Start managing your tasks today</p>

                {error && <p className="auth-error">⚠️ {error}</p>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
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
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/">Sign in</Link>
                </p>
            </div>

            {/* Success Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <span className="modal-icon">✨</span>
                        <h2 className="modal-title">Account Created!</h2>
                        <p className="modal-message">
                            Welcome aboard, <strong style={{ color: '#c4b5fd' }}>{form.name}</strong>!
                            Your account is ready to go.
                        </p>
                        <button className="modal-btn" onClick={() => { setToken(pendingToken); navigate('/dashboard') }}>
                            Go to Dashboard →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
