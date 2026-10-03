import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordInput from '../components/auth/PasswordInput'
import Button from '../components/ui/Button'
import { Field } from '../components/ui/Form'
import { authApi } from '../api'
import { getErrorMessage } from '../api/client'

export default function ResetPassword() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(token ? '' : 'This reset link is invalid. Request a new one.')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (newPassword.length < 6) return setError('Password must be at least 6 characters')
        if (newPassword !== confirmPassword) return setError('Passwords do not match')
        setLoading(true)
        try {
            await authApi.resetPassword({ token, newPassword })
            setSuccess(true)
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to reset password'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Choose a new password"
            subtitle="Make it something you haven't used before."
            footer={<>Remember your password? <Link to="/">Sign in</Link></>}
        >
            {success ? (
                <div className="auth__success" role="status">
                    <ShieldCheck size={28} />
                    <h2>Password updated</h2>
                    <p>You can now sign in with your new password.</p>
                    <Button variant="primary" onClick={() => navigate('/')}>Go to sign in</Button>
                </div>
            ) : (
                <>
                    {error && <div className="auth__alert" role="alert"><AlertCircle size={16} />{error}</div>}
                    <form className="form-stack" onSubmit={handleSubmit} noValidate>
                        <Field label="New password">
                            <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" autoFocus disabled={!token} />
                        </Field>
                        <Field label="Confirm password">
                            <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" disabled={!token} />
                        </Field>
                        <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!token} className="auth__submit">
                            Reset password
                        </Button>
                    </form>
                </>
            )}
        </AuthLayout>
    )
}
