import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Monitor, LogOut, Check } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { Avatar } from '../components/ui/Avatar'
import PasswordInput from '../components/auth/PasswordInput'
import { authApi } from '../api'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { formatTimestamp } from '../lib/dates'
import { cx } from '../lib/utils'

const THEMES = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
]

function SettingsSection({ title, description, children }) {
    return (
        <section className="settings-section card">
            <div className="settings-section__intro">
                <h2>{title}</h2>
                {description && <p>{description}</p>}
            </div>
            <div className="settings-section__content">{children}</div>
        </section>
    )
}

function ProfileForm() {
    const { user, setUser } = useAuth()
    const toast = useToast()
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
    const [saving, setSaving] = useState(false)
    const dirty = form.name.trim() !== user?.name || form.email.trim() !== user?.email

    const submit = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) return toast.error('Name is required')
        setSaving(true)
        try {
            const res = await authApi.updateProfile({ name: form.name.trim(), email: form.email.trim() })
            setUser(res.user)
            toast.success('Profile updated successfully')
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="form-stack" onSubmit={submit}>
            <div className="settings-profile">
                <Avatar user={user} size={56} />
                <div>
                    <strong>{user?.name}</strong>
                    {user?.createdAt && <p className="muted">Member since {formatTimestamp(user.createdAt)}</p>}
                </div>
            </div>
            <div className="form-grid form-grid--2">
                <Field label="Full name">
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoComplete="name" maxLength={80} />
                </Field>
                <Field label="Email">
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" />
                </Field>
            </div>
            <div><Button type="submit" variant="primary" loading={saving} disabled={!dirty}>Save profile</Button></div>
        </form>
    )
}

function PasswordForm() {
    const toast = useToast()
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError('') }

    const submit = async (e) => {
        e.preventDefault()
        if (form.newPassword.length < 6) return setError('New password must be at least 6 characters')
        if (form.newPassword !== form.confirm) return setError('Passwords do not match')
        setSaving(true)
        try {
            await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
            setForm({ currentPassword: '', newPassword: '', confirm: '' })
            toast.success('Password updated successfully')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="form-stack" onSubmit={submit}>
            <Field label="Current password">
                <PasswordInput value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" />
            </Field>
            <div className="form-grid form-grid--2">
                <Field label="New password">
                    <PasswordInput value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password" error={error}>
                    <PasswordInput value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                </Field>
            </div>
            <div>
                <Button type="submit" loading={saving} disabled={!form.currentPassword || !form.newPassword}>Update password</Button>
            </div>
        </form>
    )
}

export default function Settings() {
    const { preference, setPreference } = useTheme()
    const { signOut } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()

    return (
        <div className="settings">
            <PageHeader title="Settings" description="Manage your profile, security and appearance." />

            <SettingsSection title="Profile" description="How you appear to teammates.">
                <ProfileForm />
            </SettingsSection>

            <SettingsSection title="Password" description="Use a password you don't use anywhere else.">
                <PasswordForm />
            </SettingsSection>

            <SettingsSection title="Appearance" description="Choose a theme, or follow your system setting.">
                <div className="theme-options" role="radiogroup" aria-label="Theme">
                    {THEMES.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            role="radio"
                            aria-checked={preference === value}
                            className={cx('theme-option', preference === value && 'is-active')}
                            onClick={() => setPreference(value)}
                        >
                            <span className={`theme-option__preview theme-option__preview--${value}`} aria-hidden="true"><span /><span /></span>
                            <span className="theme-option__label"><Icon size={15} /> {label}{preference === value && <Check size={14} className="theme-option__check" />}</span>
                        </button>
                    ))}
                </div>
            </SettingsSection>

            <SettingsSection title="Session" description="Sign out of TaskManager on this device.">
                <div>
                    <Button variant="danger" icon={LogOut} onClick={() => { signOut(); toast.success('You have been signed out'); navigate('/') }}>
                        Log out
                    </Button>
                </div>
            </SettingsSection>
        </div>
    )
}
