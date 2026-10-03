import { colorFor, initials, idOf, cx } from '../../lib/utils'

export function Avatar({ user, size = 28, className, ring }) {
    if (!user) return null
    const name = user.name || user.email || '?'
    return (
        <span
            className={cx('avatar', ring && 'avatar--ring', className)}
            style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4), background: colorFor(String(idOf(user) || name)) }}
            title={name}
            aria-label={name}
            role="img"
        >
            {initials(name)}
        </span>
    )
}

export function AvatarGroup({ users = [], max = 4, size = 26 }) {
    const shown = users.slice(0, max)
    const extra = users.length - shown.length
    if (!users.length) return null
    return (
        <span className="avatar-group">
            {shown.map(u => <Avatar key={idOf(u)} user={u} size={size} ring />)}
            {extra > 0 && (
                <span className="avatar avatar--ring avatar--more" style={{ width: size, height: size, fontSize: size * 0.38 }}>
                    +{extra}
                </span>
            )}
        </span>
    )
}
