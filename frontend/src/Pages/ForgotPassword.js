import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, MailCheck } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { authApi } from '../api'
import { getErrorMessage } from '../api/client'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [resetLink, setResetLink] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!email.trim()) return setError('Enter your email address')
        setLoading(true)
        try {
            const res = await authApi.forgotPassword({ email: email.trim() })
            setSent(true)
            // Only returned by a development backend (no email provider yet)
            setResetLink(res.resetLink || '')
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to send reset link'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Reset your password"
            subtitle="Enter your account email and we'll send you a reset link."
            footer={<>Remember your password? <Link to="/">Sign in</Link></>}
        >
            {sent ? (
                <div className="auth__success" role="status">
                    <MailCheck size={28} />
                    <h2>Check your inbox</h2>
                    <p>If an account exists for that email, a password reset link is on its way.</p>
                    {resetLink && (
                        <p className="auth__dev-note">
                            Development mode: <a href={resetLink}>open the reset link</a>
                        </p>
                    )}
                </div>
            ) : (
                <>
                    {error && <div className="auth__alert" role="alert"><AlertCircle size={16} />{error}</div>}
                    <form className="form-stack" onSubmit={handleSubmit} noValidate>
                        <Field label="Email">
                            <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus />
                        </Field>
                        <Button type="submit" variant="primary" size="lg" loading={loading} className="auth__submit">
                            Send reset link
                        </Button>
                    </form>
                </>
            )}
        </AuthLayout>
    )
}
