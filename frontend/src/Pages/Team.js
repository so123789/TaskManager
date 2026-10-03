import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserPlus, Mail, ListTodo } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Form'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Skeleton, EmptyState, ErrorState } from '../components/ui/Feedback'
import { useTeam, useProjects, useAddMember } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { plural, idOf } from '../lib/utils'

function InviteModal({ open, onClose }) {
    const { user } = useAuth()
    const { data: projects = [] } = useProjects()
    const addMember = useAddMember()
    const owned = projects.filter(p => String(idOf(p.owner)) === String(user?.id))
    const [projectId, setProjectId] = useState('')
    const [email, setEmail] = useState('')
    const selected = projectId || owned[0]?._id || ''

    const submit = (e) => {
        e.preventDefault()
        if (!selected || !email.trim()) return
        addMember.mutate({ id: selected, email: email.trim() }, { onSuccess: () => { setEmail(''); onClose() } })
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Add a teammate"
            description="Add someone with an existing account to one of your projects."
            footer={owned.length ? (
                <>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={addMember.isPending} disabled={!email.trim()}>Add to project</Button>
                </>
            ) : null}
        >
            {owned.length ? (
                <form className="form-stack" onSubmit={submit}>
                    <Field label="Email">
                        <Input data-autofocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" />
                    </Field>
                    <Field label="Project">
                        <Select value={selected} onChange={e => setProjectId(e.target.value)} options={owned.map(p => ({ value: p._id, label: p.name }))} />
                    </Field>
                    <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                </form>
            ) : (
                <EmptyState compact icon={Users} title="Create a project first" description="Teammates join through projects you own." />
            )}
        </Modal>
    )
}

export default function Team() {
    const { data: team = [], isLoading, isError, error, refetch } = useTeam()
    const [inviting, setInviting] = useState(false)
    const others = team.filter(m => !m.isMe)

    return (
        <>
            <PageHeader
                title="Team"
                description="People you collaborate with across your projects."
                actions={<Button variant="primary" icon={UserPlus} onClick={() => setInviting(true)}>Add teammate</Button>}
            />

            {isError ? (
                <div className="card"><ErrorState error={error} title="Couldn't load your team" onRetry={refetch} /></div>
            ) : isLoading ? (
                <div className="team-grid">{[1, 2, 3].map(i => <div key={i} className="card team-card"><Skeleton width={48} height={48} radius={24} /><Skeleton width="60%" /><Skeleton width="80%" height={12} /></div>)}</div>
            ) : (
                <>
                    <div className="team-grid">
                        {team.map(member => (
                            <article key={member._id} className="card team-card">
                                <Avatar user={member} size={52} />
                                <h2 className="team-card__name">{member.name}{member.isMe && <Badge tone="accent">You</Badge>}</h2>
                                <a className="team-card__email" href={`mailto:${member.email}`}><Mail size={13} /> <span className="truncate">{member.email}</span></a>
                                <div className="team-card__stats">
                                    <span><ListTodo size={14} /> {plural(member.openTasks, 'open task')}</span>
                                </div>
                                {member.projects.length > 0 && (
                                    <ul className="team-card__projects">
                                        {member.projects.slice(0, 4).map(p => (
                                            <li key={p._id}>
                                                <Link to={`/projects/${p._id}`}>
                                                    <span className="project-swatch project-swatch--sm" style={{ background: p.color }} />
                                                    <span className="truncate">{p.name}</span>
                                                </Link>
                                                {p.role === 'owner' && <span className="muted">Owner</span>}
                                            </li>
                                        ))}
                                        {member.projects.length > 4 && <li className="muted">+{member.projects.length - 4} more</li>}
                                    </ul>
                                )}
                            </article>
                        ))}
                    </div>
                    {!others.length && (
                        <div className="card team-empty">
                            <EmptyState
                                icon={Users}
                                title="It's just you for now"
                                description="Add teammates to a project to assign tasks and collaborate."
                                action={<Button icon={UserPlus} onClick={() => setInviting(true)}>Add teammate</Button>}
                            />
                        </div>
                    )}
                </>
            )}

            <InviteModal open={inviting} onClose={() => setInviting(false)} />
        </>
    )
}
