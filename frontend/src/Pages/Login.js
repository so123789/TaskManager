import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordInput from '../components/auth/PasswordInput'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { authApi } from '../api'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import useSlowRequestHint from '../hooks/useSlowRequestHint'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
    const { signIn } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()
    const location = useLocation()
    const [form, setForm] = useState({ email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const slow = useSlowRequestHint(loading)

    const set = (key) => (e) => {
        setForm(f => ({ ...f, [key]: e.target.value }))
        setErrors(errs => ({ ...errs, [key]: undefined }))
    }

    const validate = () => {
        const next = {}
        if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address'
        if (!form.password) next.password = 'Enter your password'
        setErrors(next)
        return !Object.keys(next).length
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!validate()) return
        setLoading(true)
        try {
            const res = await authApi.login({ email: form.email.trim(), password: form.password })
            signIn(res)
            toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`)
            // Return to the page the user originally tried to open
            navigate(location.state?.from || '/dashboard', { replace: true })
        } catch (err) {
            setError(getErrorMessage(err, 'Login failed'))
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to continue to your workspace."
            footer={<>Don't have an account? <Link to="/register">Create one</Link></>}
        >
            {error && <div className="auth__alert" role="alert"><AlertCircle size={16} />{error}</div>}
            <form className="form-stack" onSubmit={handleSubmit} noValidate>
                <Field label="Email" error={errors.email}>
                    <Input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" autoFocus />
                </Field>
                <Field label="Password" error={errors.password}>
                    <PasswordInput placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="current-password" />
                </Field>
                <Button type="submit" variant="primary" size="lg" loading={loading} className="auth__submit">
                    {loading ? 'Signing in…' : 'Sign in'}
                </Button>
                {slow && <p className="auth__hint" role="status">Waking up the server. The first request can take up to a minute.</p>}
            </form>
        </AuthLayout>
    )
}
