import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, Sun, Moon, Monitor, Users } from 'lucide-react'
import Menu, { MenuItem, MenuDivider, MenuLabel } from '../ui/Menu'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'

const THEMES = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
]

export default function ProfileMenu() {
    const { user, signOut } = useAuth()
    const { preference, setPreference } = useTheme()
    const toast = useToast()
    const navigate = useNavigate()

    const logout = () => {
        signOut()
        toast.success('You have been signed out')
        navigate('/')
    }

    return (
        <Menu
            trigger={({ props }) => (
                <button className="profile-trigger" {...props} aria-label="Account menu">
                    <Avatar user={user || { name: '?' }} size={32} />
                </button>
            )}
        >
            {({ close }) => (
                <>
                    {user && (
                        <div className="profile-menu__header">
                            <Avatar user={user} size={36} />
                            <div className="truncate">
                                <div className="profile-menu__name truncate">{user.name}</div>
                                <div className="profile-menu__email truncate">{user.email}</div>
                            </div>
                        </div>
                    )}
                    <MenuDivider />
                    <MenuItem icon={Settings} onClick={() => { close(); navigate('/settings') }}>Settings</MenuItem>
                    <MenuItem icon={Users} onClick={() => { close(); navigate('/team') }}>Team</MenuItem>
                    <MenuDivider />
                    <MenuLabel>Theme</MenuLabel>
                    {THEMES.map(({ value, label, icon }) => (
                        <MenuItem key={value} icon={icon} active={preference === value} aria-checked={preference === value} onClick={() => setPreference(value)}>
                            {label}
                        </MenuItem>
                    ))}
                    <MenuDivider />
                    <MenuItem icon={LogOut} danger onClick={logout}>Log out</MenuItem>
                </>
            )}
        </Menu>
    )
}
