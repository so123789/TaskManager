// Joins truthy class names: cx('a', cond && 'b')
export const cx = (...classes) => classes.filter(Boolean).join(' ')

export function initials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '?'
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const AVATAR_COLORS = ['#5b4fe9', '#2f6fed', '#0e9f8e', '#15994a', '#d97706', '#e5484d', '#d6409f', '#7c3aed', '#0891b2']

// Stable colour per user so the same person always looks the same
export function colorFor(seed = '') {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const plural = (count, word, pluralWord = `${word}s`) => `${count} ${count === 1 ? word : pluralWord}`

export const idOf = (value) => (value && typeof value === 'object' ? value._id || value.id : value)
