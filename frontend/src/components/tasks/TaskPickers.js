import { useState, useId } from 'react'
import { Check, UserPlus, Tag } from 'lucide-react'
import Menu, { MenuItem } from '../ui/Menu'
import { StatusBadge, StatusDot, PriorityBadge, PriorityIcon, LabelChip } from '../ui/Badge'
import { Avatar, AvatarGroup } from '../ui/Avatar'
import { TASK_STATUSES, PRIORITIES } from '../../lib/constants'
import { useLabels } from '../../hooks/queries'
import { cx, idOf } from '../../lib/utils'

// Inline status picker (used in the list view and task modal)
export function StatusMenu({ value, onChange, align = 'start' }) {
    return (
        <Menu
            align={align}
            trigger={({ props }) => (
                <button type="button" className="inline-picker" {...props} aria-label="Change status">
                    <StatusBadge status={value} />
                </button>
            )}
        >
            {({ close }) => TASK_STATUSES.map(s => (
                <MenuItem key={s.value} active={s.value === value} onClick={() => { close(); if (s.value !== value) onChange(s.value) }}>
                    <span className="picker-option"><StatusDot status={s.value} /> {s.label}</span>
                </MenuItem>
            ))}
        </Menu>
    )
}

export function PriorityMenu({ value, onChange, align = 'start', compact }) {
    return (
        <Menu
            align={align}
            trigger={({ props }) => (
                <button type="button" className="inline-picker" {...props} aria-label="Change priority">
                    <PriorityBadge priority={value} compact={compact} />
                </button>
            )}
        >
            {({ close }) => PRIORITIES.map(p => (
                <MenuItem key={p.value} active={p.value === value} onClick={() => { close(); if (p.value !== value) onChange(p.value) }}>
                    <span className="picker-option"><PriorityIcon priority={p.value} /> {p.label}</span>
                </MenuItem>
            ))}
        </Menu>
    )
}

// Multi-select of people who can be assigned (project members, or just you)
export function AssigneePicker({ value = [], candidates = [], onChange, align = 'start' }) {
    const selectedIds = value.map(v => String(idOf(v)))
    const selectedUsers = candidates.filter(c => selectedIds.includes(String(idOf(c))))
    const toggle = (id) => onChange(
        selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    )

    return (
        <Menu
            align={align}
            trigger={({ props }) => (
                <button type="button" className="inline-picker inline-picker--block" {...props} aria-label="Change assignees">
                    {selectedUsers.length ? (
                        <span className="assignee-summary">
                            <AvatarGroup users={selectedUsers} size={22} max={3} />
                            <span className="truncate">{selectedUsers.length === 1 ? selectedUsers[0].name : `${selectedUsers.length} people`}</span>
                        </span>
                    ) : (
                        <span className="inline-picker__placeholder"><UserPlus size={15} /> Unassigned</span>
                    )}
                </button>
            )}
        >
            {candidates.length ? candidates.map(user => {
                const id = String(idOf(user))
                const checked = selectedIds.includes(id)
                return (
                    <MenuItem key={id} role="menuitemcheckbox" aria-checked={checked} onClick={() => toggle(id)}>
                        <span className="picker-option picker-option--user">
                            <Avatar user={user} size={22} />
                            <span className="truncate">{user.name}</span>
                            {checked && <Check size={15} className="picker-option__check" />}
                        </span>
                    </MenuItem>
                )
            }) : <p className="menu__empty">Add the task to a project to assign teammates.</p>}
        </Menu>
    )
}

// Free-form labels with suggestions from labels already used in the workspace
export function LabelsInput({ value = [], onChange, max = 10 }) {
    const [draft, setDraft] = useState('')
    const { data: suggestions = [] } = useLabels()
    const listId = useId()

    const add = (raw) => {
        const label = raw.trim().slice(0, 30)
        if (!label || value.includes(label) || value.length >= max) return setDraft('')
        onChange([...value, label])
        setDraft('')
    }

    return (
        <div className={cx('labels-input', value.length && 'has-values')}>
            {value.map(label => (
                <LabelChip key={label} onRemove={() => onChange(value.filter(l => l !== label))}>{label}</LabelChip>
            ))}
            {value.length < max && (
                <span className="labels-input__field">
                    {!value.length && <Tag size={14} aria-hidden="true" />}
                    <input
                        list={listId}
                        value={draft}
                        placeholder={value.length ? 'Add…' : 'Add labels'}
                        aria-label="Add label"
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft) }
                            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
                        }}
                        onBlur={() => draft && add(draft)}
                    />
                    <datalist id={listId}>
                        {suggestions.filter(s => !value.includes(s)).map(s => <option key={s} value={s} />)}
                    </datalist>
                </span>
            )}
        </div>
    )
}
