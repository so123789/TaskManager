import { useState, useEffect } from 'react'
import API from '../api'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './auth.css'

export default function ResetPassword() {
    const { theme, toggleTheme } = useTheme()
    const [searchParams] = useSearchParams()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const navigate = useNavigate()
    const token = searchParams.get('token')

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            await API.put('/api/auth/reset-password', {
                token,
                newPassword
            })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password')
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
                <h1 className="auth-card-title">Create New Password 🔒</h1>
                <p className="auth-card-subtitle">Enter your new password</p>

                {error && <p className="auth-error">⚠️ {error}</p>}

                {success ? (
                    <div className="auth-success-box">
                        <p className="auth-success-icon">✅</p>
                        <h2>Password Reset Successful!</h2>
                        <p>Your password has been updated. You can now login with your new password.</p>
                        <button 
                            className="auth-btn" 
                            onClick={() => navigate('/')}
                        >
                            Go to Login
                        </button>
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label>New Password</label>
                            <div className="auth-password-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
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

                        <div className="auth-field">
                            <label>Confirm Password</label>
                            <div className="auth-password-wrap">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowConfirm(p => !p)}
                                    tabIndex={-1}
                                >
                                    {showConfirm ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
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
                        <h2 className="modal-title">Resetting password...</h2>
                        <p className="modal-message">Please wait ⏳</p>
                    </div>
                </div>
            )}
        </div>
    )
}
