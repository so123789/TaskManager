import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    FolderKanban, Activity, CheckCircle2, CircleDashed, AlertTriangle, Plus, FolderPlus, ArrowRight, PartyPopper,
} from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { Skeleton, EmptyState, ErrorState, ProgressBar, ProgressRing } from '../components/ui/Feedback'
import { StatusDot, PriorityIcon } from '../components/ui/Badge'
import { AvatarGroup } from '../components/ui/Avatar'
import { WeeklyChart, StatusBreakdown } from '../components/charts/Charts'
import ProjectCard, { ProjectCardSkeleton } from '../components/projects/ProjectCard'
import ProjectModal from '../components/projects/ProjectModal'
import { useDashboard, useProjects, useTasks } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useTaskModal } from '../context/TaskModalContext'
import { greeting, dueLabel, isOverdue } from '../lib/dates'
import { cx, plural } from '../lib/utils'

function StatCard({ icon: Icon, label, value, hint, tone = 'neutral', loading }) {
    return (
        <div className={cx('stat-card card', `stat-card--${tone}`)}>
            <div className="stat-card__top">
                <span className="stat-card__label">{label}</span>
                <span className="stat-card__icon"><Icon size={16} aria-hidden="true" /></span>
            </div>
            {loading ? <Skeleton width={56} height={30} /> : <div className="stat-card__value tabular">{value}</div>}
            <div className="stat-card__hint">{loading ? <Skeleton width={90} height={12} /> : hint}</div>
        </div>
    )
}

function Productivity({ data, loading }) {
    const weekCompleted = data?.weekly.reduce((sum, d) => sum + d.completed, 0) || 0
    const weekCreated = data?.weekly.reduce((sum, d) => sum + d.created, 0) || 0
    return (
        <section className="card dashboard__productivity">
            <header className="card__header">
                <div>
                    <h2 className="card__title">Weekly productivity</h2>
                    <p className="card__subtitle">Tasks created and completed over the last 7 days</p>
                </div>
            </header>
            <div className="card__body">
                {loading ? <Skeleton height={190} /> : (
                    <div className="productivity">
                        <div className="productivity__summary">
                            <ProgressRing value={data.tasks.completionRate} size={88} stroke={8}>
                                <span className="productivity__rate">{data.tasks.completionRate}%</span>
                            </ProgressRing>
                            <dl className="productivity__figures">
                                <div><dt>Completed</dt><dd className="tabular">{data.tasks.completed}</dd></div>
                                <div><dt>Remaining</dt><dd className="tabular">{data.tasks.pending}</dd></div>
                                <div><dt>This week</dt><dd className="tabular">{weekCompleted} <span>done</span> · {weekCreated} <span>new</span></dd></div>
                            </dl>
                        </div>
                        <WeeklyChart data={data.weekly} />
                    </div>
                )}
            </div>
        </section>
    )
}

function ProjectProgress({ projects, loading }) {
    const active = projects.filter(p => p.status !== 'completed').slice(0, 5)
    return (
        <section className="card">
            <header className="card__header">
                <h2 className="card__title">Project progress</h2>
                <Link to="/projects" className="text-btn">All projects</Link>
            </header>
            <div className="card__body">
                {loading ? <Skeleton height={140} /> : active.length ? (
                    <ul className="progress-list">
                        {active.map(p => (
                            <li key={p._id}>
                                <Link to={`/projects/${p._id}`} className="progress-list__item">
                                    <div className="progress-list__row">
                                        <span className="progress-list__name">
                                            <span className="project-swatch" style={{ background: p.color }} />
                                            <span className="truncate">{p.name}</span>
                                        </span>
                                        <span className="progress-list__value tabular">{p.progress}%</span>
                                    </div>
                                    <ProgressBar value={p.progress} color={p.color} size="sm" label={`${p.name} progress`} />
                                    <span className="progress-list__meta">{p.completedCount} of {plural(p.taskCount, 'task')} done</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState compact icon={FolderKanban} title="No active projects" description="Active projects and their progress appear here." />}
            </div>
        </section>
    )
}

function UpcomingDeadlines() {
    const { openTask } = useTaskModal()
    const overdue = useTasks({ due: 'overdue', sort: 'dueDate', limit: 5 })
    const upcoming = useTasks({ due: 'week', status: 'todo,in_progress,in_review', sort: 'dueDate', limit: 8 })
    const loading = overdue.isLoading || upcoming.isLoading
    const items = [...(overdue.data || []), ...(upcoming.data || [])].slice(0, 8)

    return (
        <section className="card">
            <header className="card__header">
                <h2 className="card__title">Upcoming deadlines</h2>
                <Link to="/calendar" className="text-btn">Calendar</Link>
            </header>
            <div className="card__body">
                {loading ? <Skeleton height={140} /> : overdue.isError || upcoming.isError ? (
                    <ErrorState compact error={overdue.error || upcoming.error} onRetry={() => { overdue.refetch(); upcoming.refetch() }} />
                ) : items.length ? (
                    <ul className="deadline-list">
                        {items.map(t => (
                            <li key={t._id}>
                                <button className="deadline-item" onClick={() => openTask(t._id)}>
                                    <StatusDot status={t.status} />
                                    <span className="deadline-item__text">
                                        <span className="deadline-item__title truncate">{t.title}</span>
                                        {t.project && <span className="deadline-item__project truncate">{t.project.name}</span>}
                                    </span>
                                    <AvatarGroup users={t.assignees} size={20} max={2} />
                                    <PriorityIcon priority={t.priority} />
                                    <span className={cx('deadline-item__due', isOverdue(t) && 'is-overdue')}>{dueLabel(t.dueDate)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState compact icon={PartyPopper} title="Nothing due this week" description="Enjoy the breathing room, or plan what's next." />}
            </div>
        </section>
    )
}

export default function Dashboard() {
    const { user } = useAuth()
    const { createTask } = useTaskModal()
    const [creatingProject, setCreatingProject] = useState(false)
    const dashboard = useDashboard()
    const projectsQuery = useProjects()
    const d = dashboard.data
    const loading = dashboard.isLoading
    const projects = projectsQuery.data || []
    const firstName = user?.name?.split(' ')[0]

    const subtitle = d
        ? d.tasks.dueToday
            ? `You have ${plural(d.tasks.dueToday, 'task')} due today.`
            : d.tasks.overdue ? `${plural(d.tasks.overdue, 'task')} need attention.` : "You're all caught up for today."
        : new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

    return (
        <div className="dashboard">
            <PageHeader
                title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
                description={subtitle}
                actions={(
                    <>
                        <Button icon={FolderPlus} onClick={() => setCreatingProject(true)}>New project</Button>
                        <Button variant="primary" icon={Plus} onClick={() => createTask()}>New task</Button>
                    </>
                )}
            />

            {dashboard.isError ? (
                <div className="card"><ErrorState error={dashboard.error} title="Couldn't load your dashboard" onRetry={dashboard.refetch} /></div>
            ) : (
                <>
                    <div className="stat-grid">
                        <StatCard icon={FolderKanban} label="Total projects" loading={loading} value={d?.projects.total}
                            hint={d && `${d.projects.completed} completed`} />
                        <StatCard icon={Activity} label="Active projects" tone="accent" loading={loading} value={d?.projects.active}
                            hint={d && (d.projects.byStatus.on_hold ? `${d.projects.byStatus.on_hold} on hold` : 'In progress now')} />
                        <StatCard icon={CheckCircle2} label="Completed tasks" tone="success" loading={loading} value={d?.tasks.completed}
                            hint={d && `${d.tasks.completionRate}% completion rate`} />
                        <StatCard icon={CircleDashed} label="Pending tasks" tone="info" loading={loading} value={d?.tasks.pending}
                            hint={d && `${d.tasks.dueThisWeek} due in the next 7 days`} />
                        <StatCard icon={AlertTriangle} label="Overdue tasks" tone={d?.tasks.overdue ? 'danger' : 'neutral'} loading={loading} value={d?.tasks.overdue}
                            hint={d && (d.tasks.overdue ? 'Past their due date' : 'Nothing overdue')} />
                    </div>

                    <div className="dashboard__row">
                        <Productivity data={d} loading={loading} />
                        <section className="card">
                            <header className="card__header">
                                <div>
                                    <h2 className="card__title">Task status</h2>
                                    <p className="card__subtitle">{d ? plural(d.tasks.total, 'task') : '…'} across your workspace</p>
                                </div>
                            </header>
                            <div className="card__body">
                                {loading ? <Skeleton height={150} /> : <StatusBreakdown counts={d.byStatus} />}
                            </div>
                        </section>
                    </div>
                </>
            )}

            <section className="dashboard__projects">
                <div className="section-header">
                    <h2>Recent projects</h2>
                    {projects.length > 0 && <Link to="/projects" className="text-btn">View all <ArrowRight size={14} /></Link>}
                </div>
                {projectsQuery.isError ? (
                    <div className="card"><ErrorState compact error={projectsQuery.error} onRetry={projectsQuery.refetch} /></div>
                ) : projectsQuery.isLoading ? (
                    <div className="project-grid">{[1, 2, 3].map(i => <ProjectCardSkeleton key={i} />)}</div>
                ) : projects.length ? (
                    <div className="project-grid">{projects.slice(0, 3).map(p => <ProjectCard key={p._id} project={p} />)}</div>
                ) : (
                    <div className="card">
                        <EmptyState
                            icon={FolderKanban}
                            title="No projects yet"
                            description="Create your first project to get started."
                            action={<Button variant="primary" icon={FolderPlus} onClick={() => setCreatingProject(true)}>Create project</Button>}
                        />
                    </div>
                )}
            </section>

            <div className="dashboard__row dashboard__row--even">
                <ProjectProgress projects={projects} loading={projectsQuery.isLoading} />
                <UpcomingDeadlines />
            </div>

            <ProjectModal open={creatingProject} onClose={() => setCreatingProject(false)} />
        </div>
    )
}
