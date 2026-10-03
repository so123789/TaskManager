import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import {
    ChevronLeft, Pencil, Trash2, MoreHorizontal, UserPlus, LayoutGrid, List, Kanban, CalendarDays, History, Plus,
    FolderX, Calendar, Crown, LogOut,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import Menu, { MenuItem, MenuDivider } from '../components/ui/Menu'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { ProjectStatusBadge, PriorityBadge, StatusDot } from '../components/ui/Badge'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { Skeleton, EmptyState, ErrorState, ProgressRing } from '../components/ui/Feedback'
import TaskWorkspace from '../components/tasks/TaskWorkspace'
import CalendarMonth from '../components/calendar/CalendarMonth'
import ProjectModal from '../components/projects/ProjectModal'
import MembersModal from '../components/projects/MembersModal'
import ActivityFeed from '../components/projects/ActivityFeed'
import { useProject, useTasks, useDeleteProject, useRemoveMember } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useTaskModal } from '../context/TaskModalContext'
import { TASK_STATUSES, PRIORITY_LABEL } from '../lib/constants'
import { formatDate, formatTimestamp, daysFromToday, dueLabel, isOverdue } from '../lib/dates'
import { cx, idOf, plural } from '../lib/utils'

const TABS = ['overview', 'tasks', 'board', 'calendar', 'activity']

function Overview({ project, onManageMembers }) {
    const { openTask, createTask } = useTaskModal()
    const { data: tasks = [], isLoading } = useTasks({ project: project._id })
    const counts = useMemo(() => tasks.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {}), [tasks])
    const upcoming = useMemo(() => tasks
        .filter(t => t.status !== 'completed' && t.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5), [tasks])
    const daysLeft = project.dueDate ? daysFromToday(project.dueDate) : null
    const ownerId = String(idOf(project.owner))

    return (
        <div className="project-overview">
            <div className="project-overview__main">
                <section className="card">
                    <header className="card__header"><h2 className="card__title">About this project</h2></header>
                    <div className="card__body">
                        <p className={cx('project-overview__description', !project.description && 'muted')}>
                            {project.description || 'No description yet. Edit the project to add context for your team.'}
                        </p>
                    </div>
                </section>

                <section className="card">
                    <header className="card__header"><h2 className="card__title">Progress</h2></header>
                    <div className="card__body project-progress">
                        <ProgressRing value={project.progress} size={104} stroke={9} color={project.color} />
                        <div className="project-progress__stats">
                            {TASK_STATUSES.map(s => (
                                <div key={s.value} className="project-progress__stat">
                                    <span className="project-progress__label"><StatusDot status={s.value} /> {s.label}</span>
                                    <strong className="tabular">{isLoading ? '–' : counts[s.value] || 0}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="card">
                    <header className="card__header">
                        <h2 className="card__title">Upcoming tasks</h2>
                        <Button size="sm" icon={Plus} onClick={() => createTask({ project: project._id })}>Add task</Button>
                    </header>
                    <div className="card__body">
                        {isLoading ? <Skeleton height={100} /> : upcoming.length ? (
                            <ul className="deadline-list">
                                {upcoming.map(t => (
                                    <li key={t._id}>
                                        <button className="deadline-item" onClick={() => openTask(t._id)}>
                                            <StatusDot status={t.status} />
                                            <span className="deadline-item__text"><span className="deadline-item__title truncate">{t.title}</span></span>
                                            <AvatarGroup users={t.assignees} size={20} max={2} />
                                            <span className={cx('deadline-item__due', isOverdue(t) && 'is-overdue')}>{dueLabel(t.dueDate)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : <EmptyState compact icon={Calendar} title="No upcoming deadlines" description="Open tasks with due dates will show up here." />}
                    </div>
                </section>
            </div>

            <aside className="project-overview__side">
                <section className="card">
                    <header className="card__header"><h2 className="card__title">Details</h2></header>
                    <dl className="card__body details-list">
                        <div><dt>Status</dt><dd><ProjectStatusBadge status={project.status} /></dd></div>
                        <div><dt>Priority</dt><dd><PriorityBadge priority={project.priority} /></dd></div>
                        <div>
                            <dt>Due date</dt>
                            <dd>
                                {project.dueDate ? (
                                    <span className={cx(daysLeft < 0 && project.status !== 'completed' && 'text-danger')}>
                                        {formatDate(project.dueDate, { withYear: true })}
                                        {project.status !== 'completed' && <span className="muted"> · {daysLeft < 0 ? `${-daysLeft}d late` : daysLeft === 0 ? 'today' : `${daysLeft}d left`}</span>}
                                    </span>
                                ) : <span className="muted">Not set</span>}
                            </dd>
                        </div>
                        <div><dt>Tasks</dt><dd>{project.completedCount}/{project.taskCount} done</dd></div>
                        <div><dt>Owner</dt><dd>{project.owner?.name}</dd></div>
                        <div><dt>Created</dt><dd>{formatTimestamp(project.createdAt)}</dd></div>
                    </dl>
                </section>

                <section className="card">
                    <header className="card__header">
                        <h2 className="card__title">Members <span className="muted">{project.members.length}</span></h2>
                        <Button size="sm" icon={UserPlus} onClick={onManageMembers}>Manage</Button>
                    </header>
                    <ul className="card__body member-mini">
                        {project.members.map(m => (
                            <li key={m._id}>
                                <Avatar user={m} size={28} />
                                <span className="truncate">{m.name}</span>
                                {String(m._id) === ownerId && <Crown size={13} className="member-mini__owner" aria-label="Owner" />}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="card">
                    <header className="card__header">
                        <h2 className="card__title">Recent activity</h2>
                        <Link to={`/projects/${project._id}/activity`} className="text-btn">View all</Link>
                    </header>
                    <div className="card__body"><ActivityFeed projectId={project._id} limit={5} /></div>
                </section>
            </aside>
        </div>
    )
}

export default function ProjectDetail() {
    const { projectId, tab = 'overview' } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { data: project, isLoading, isError, error, refetch } = useProject(projectId)
    const deleteProject = useDeleteProject()
    const removeMember = useRemoveMember()
    const [editing, setEditing] = useState(false)
    const [managingMembers, setManagingMembers] = useState(false)
    const [confirm, setConfirm] = useState(null) // 'delete' | 'leave'

    if (!TABS.includes(tab)) return <Navigate to={`/projects/${projectId}`} replace />

    if (isLoading) {
        return (
            <div className="project-detail">
                <Skeleton width={120} height={14} />
                <div className="project-hero"><Skeleton width={48} height={48} radius={12} /><div style={{ flex: 1 }}><Skeleton width="40%" height={24} /><Skeleton width="25%" height={14} style={{ marginTop: 8 }} /></div></div>
                <Skeleton height={40} />
                <Skeleton height={240} radius={14} />
            </div>
        )
    }

    if (isError) {
        const notFound = error?.response?.status === 404
        return (
            <div className="card">
                {notFound ? (
                    <EmptyState icon={FolderX} title="Project not found" description="It may have been deleted, or you're no longer a member."
                        action={<Button onClick={() => navigate('/projects')}>Back to projects</Button>} />
                ) : <ErrorState error={error} title="Couldn't load this project" onRetry={refetch} />}
            </div>
        )
    }

    const isOwner = String(idOf(project.owner)) === String(user?.id)
    const base = `/projects/${project._id}`
    const tabs = [
        { to: base, label: 'Overview', icon: LayoutGrid, end: true },
        { to: `${base}/tasks`, label: 'Tasks', icon: List, count: project.taskCount },
        { to: `${base}/board`, label: 'Board', icon: Kanban },
        { to: `${base}/calendar`, label: 'Calendar', icon: CalendarDays },
        { to: `${base}/activity`, label: 'Activity', icon: History },
    ]

    return (
        <div className="project-detail">
            <Link to="/projects" className="back-link"><ChevronLeft size={15} /> Projects</Link>

            <header className="project-hero">
                <span className="project-hero__icon" style={{ background: project.color }} aria-hidden="true">
                    {project.name.charAt(0).toUpperCase()}
                </span>
                <div className="project-hero__text">
                    <h1 className="project-hero__title">{project.name}</h1>
                    <div className="project-hero__meta">
                        <ProjectStatusBadge status={project.status} />
                        <span>{PRIORITY_LABEL[project.priority]} priority</span>
                        {project.dueDate && <span><Calendar size={13} /> Due {formatDate(project.dueDate)}</span>}
                        <span>{plural(project.taskCount, 'task')} · {project.progress}% complete</span>
                    </div>
                </div>
                <div className="project-hero__actions">
                    <button className="avatar-button" onClick={() => setManagingMembers(true)} aria-label={`${project.members.length} members, manage`}>
                        <AvatarGroup users={project.members} size={30} max={4} />
                    </button>
                    <Button icon={Pencil} onClick={() => setEditing(true)}><span className="hide-sm">Edit</span></Button>
                    <Menu
                        trigger={({ props }) => (
                            <button className="icon-btn icon-btn--bordered" {...props} aria-label="More project actions"><MoreHorizontal size={17} /></button>
                        )}
                    >
                        {({ close }) => (
                            <>
                                <MenuItem icon={UserPlus} onClick={() => { close(); setManagingMembers(true) }}>Manage members</MenuItem>
                                <MenuDivider />
                                {isOwner ? (
                                    <MenuItem icon={Trash2} danger onClick={() => { close(); setConfirm('delete') }}>Delete project</MenuItem>
                                ) : (
                                    <MenuItem icon={LogOut} danger onClick={() => { close(); setConfirm('leave') }}>Leave project</MenuItem>
                                )}
                            </>
                        )}
                    </Menu>
                </div>
            </header>

            <Tabs tabs={tabs} label="Project sections" />

            <div className="project-detail__content">
                {tab === 'overview' && <Overview project={project} onManageMembers={() => setManagingMembers(true)} />}
                {tab === 'tasks' && <TaskWorkspace projectId={project._id} view="list" />}
                {tab === 'board' && <TaskWorkspace projectId={project._id} view="board" />}
                {tab === 'calendar' && <CalendarMonth projectId={project._id} />}
                {tab === 'activity' && (
                    <section className="card">
                        <header className="card__header">
                            <div>
                                <h2 className="card__title">Activity</h2>
                                <p className="card__subtitle">Everything that happened in {project.name}</p>
                            </div>
                        </header>
                        <div className="card__body"><ActivityFeed projectId={project._id} limit={100} /></div>
                    </section>
                )}
            </div>

            <ProjectModal open={editing} onClose={() => setEditing(false)} project={project} />
            <MembersModal open={managingMembers} onClose={() => setManagingMembers(false)} project={project} onLeft={() => navigate('/projects')} />
            <ConfirmDialog
                open={confirm === 'delete'}
                title="Delete project?"
                message={`"${project.name}" and all ${plural(project.taskCount, 'task')} in it will be permanently deleted. This can't be undone.`}
                confirmLabel="Delete project"
                loading={deleteProject.isPending}
                onCancel={() => setConfirm(null)}
                onConfirm={() => deleteProject.mutate(project._id, { onSuccess: () => navigate('/projects', { replace: true }) })}
            />
            <ConfirmDialog
                open={confirm === 'leave'}
                title="Leave project?"
                message={`You'll lose access to "${project.name}" and be unassigned from its tasks.`}
                confirmLabel="Leave project"
                loading={removeMember.isPending}
                onCancel={() => setConfirm(null)}
                onConfirm={() => removeMember.mutate({ id: project._id, userId: user.id }, { onSuccess: () => navigate('/projects', { replace: true }) })}
            />
        </div>
    )
}
