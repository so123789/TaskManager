import { useState } from 'react'
import { UserPlus, Crown, X, LogOut } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input } from '../ui/Form'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { useAddMember, useRemoveMember } from '../../hooks/queries'
import { useAuth } from '../../context/AuthContext'
import { idOf } from '../../lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function MembersModal({ open, onClose, project, onLeft }) {
    const { user } = useAuth()
    const addMember = useAddMember()
    const removeMember = useRemoveMember()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const ownerId = String(idOf(project.owner))
    const isOwner = ownerId === String(user?.id)

    const invite = (e) => {
        e.preventDefault()
        if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address')
        // Server errors (unknown email, already a member) are shown as a toast by the hook
        addMember.mutate({ id: project._id, email: email.trim() }, { onSuccess: () => setEmail('') })
    }

    const remove = (member) => {
        const leaving = String(member._id) === String(user?.id)
        removeMember.mutate({ id: project._id, userId: member._id }, {
            onSuccess: () => { if (leaving) { onClose(); onLeft?.() } },
        })
    }

    return (
        <Modal open={open} onClose={onClose} title="Project members" description={`People in ${project.name} can view and update its tasks.`}>
            {isOwner && (
                <form className="member-invite" onSubmit={invite}>
                    <Field label="Add by email" error={error} hint="They need an existing account.">
                        <Input
                            data-autofocus
                            type="email"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError('') }}
                            placeholder="teammate@company.com"
                        />
                    </Field>
                    <Button type="submit" variant="primary" icon={UserPlus} loading={addMember.isPending}>Add</Button>
                </form>
            )}
            <ul className="member-list">
                {project.members.map(member => {
                    const memberIsOwner = String(member._id) === ownerId
                    const isMe = String(member._id) === String(user?.id)
                    return (
                        <li key={member._id} className="member-list__item">
                            <Avatar user={member} size={34} />
                            <div className="member-list__text">
                                <span className="member-list__name">{member.name}{isMe && <span className="muted"> (you)</span>}</span>
                                <span className="member-list__email truncate">{member.email}</span>
                            </div>
                            {memberIsOwner ? (
                                <Badge tone="accent"><Crown size={12} /> Owner</Badge>
                            ) : isOwner ? (
                                <Button size="sm" variant="ghost" icon={X} onClick={() => remove(member)} disabled={removeMember.isPending} aria-label={`Remove ${member.name}`}>
                                    <span className="hide-sm">Remove</span>
                                </Button>
                            ) : isMe ? (
                                <Button size="sm" variant="ghost" icon={LogOut} onClick={() => remove(member)} disabled={removeMember.isPending}>Leave</Button>
                            ) : <Badge>Member</Badge>}
                        </li>
                    )
                })}
            </ul>
        </Modal>
    )
}
