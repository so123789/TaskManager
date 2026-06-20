import { useState } from 'react'
import API from '../api'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './auth.css'

export default function ForgotPassword() {
    const { theme, toggleTheme } = useTheme()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [resetLink, setResetLink] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await API.post('/api/auth/forgot-password', { email })
            setSuccess(true)
            setResetLink(res.data.resetLink)
            setEmail('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset link')
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
                    <Link to="/register">Register</Link>
                </nav>
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </header>

            {/* Card */}
            <div className="auth-card">
                <h1 className="auth-card-title">Reset Password 🔐</h1>
                <p className="auth-card-subtitle">Enter your email to receive a reset link</p>

                {error && <p className="auth-error">⚠️ {error}</p>}

                {success ? (
                    <div className="auth-success-box">
                        <p className="auth-success-icon">✅</p>
                        <h2>Reset link sent!</h2>
                        <p>Check your email for the password reset link.</p>
                        <p className="auth-reset-link-info">
                            For testing: <a href={resetLink} target="_blank" rel="noreferrer" className="auth-link">Click here to reset</a>
                        </p>
                        <button 
                            className="auth-btn" 
                            onClick={() => navigate('/')}
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <p className="auth-footer">
                    Remember your password? <Link to="/">Login</Link>
                </p>
            </div>

            {/* Loading Modal */}
            {loading && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="loading-spinner"></div>
                        <h2 className="modal-title">Sending reset link...</h2>
                        <p className="modal-message">Please wait ⏳</p>
                    </div>
                </div>
            )}
        </div>
    )
}
