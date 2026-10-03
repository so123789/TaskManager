import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
const MIN_PASSWORD = 6

function passwordStrength(password) {
    let score = 0
    if (password.length >= MIN_PASSWORD) score++
    if (password.length >= 10) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
    return score
}
const STRENGTH = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']

export default function Register() {
    const { signIn } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const slow = useSlowRequestHint(loading)
    const strength = passwordStrength(form.password)

    const set = (key) => (e) => {
        setForm(f => ({ ...f, [key]: e.target.value }))
        setErrors(errs => ({ ...errs, [key]: undefined }))
    }

    const validate = () => {
        const next = {}
        if (!form.name.trim()) next.name = 'Enter your name'
        if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address'
        if (form.password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters`
        setErrors(next)
        return !Object.keys(next).length
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!validate()) return
        setLoading(true)
        try {
            const res = await authApi.register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
            signIn(res)
            toast.success(`Account created. Welcome aboard, ${res.user.name.split(' ')[0]}!`)
            navigate('/dashboard', { replace: true })
        } catch (err) {
            setError(getErrorMessage(err, 'Registration failed'))
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Start organising projects and tasks in minutes."
            footer={<>Already have an account? <Link to="/">Sign in</Link></>}
        >
            {error && <div className="auth__alert" role="alert"><AlertCircle size={16} />{error}</div>}
            <form className="form-stack" onSubmit={handleSubmit} noValidate>
                <Field label="Full name" error={errors.name}>
                    <Input placeholder="Jane Doe" value={form.name} onChange={set('name')} autoComplete="name" autoFocus maxLength={80} />
                </Field>
                <Field label="Email" error={errors.email}>
                    <Input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                </Field>
                <Field label="Password" error={errors.password} hint={!errors.password && form.password ? `Strength: ${STRENGTH[strength]}` : `At least ${MIN_PASSWORD} characters`}>
                    <PasswordInput placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="new-password" />
                </Field>
                {form.password && (
                    <div className="strength-meter" aria-hidden="true">
                        {[1, 2, 3, 4].map(i => <span key={i} className={i <= strength ? `is-on strength-${strength}` : ''} />)}
                    </div>
                )}
                <Button type="submit" variant="primary" size="lg" loading={loading} className="auth__submit">
                    {loading ? 'Creating account…' : 'Create account'}
                </Button>
                {slow && <p className="auth__hint" role="status">Waking up the server. The first request can take up to a minute.</p>}
            </form>
        </AuthLayout>
    )
}
