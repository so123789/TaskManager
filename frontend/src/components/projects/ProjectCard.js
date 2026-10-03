import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ListChecks, AlertTriangle } from 'lucide-react'
import { ProjectStatusBadge, PriorityBadge } from '../ui/Badge'
import { AvatarGroup } from '../ui/Avatar'
import { ProgressBar, Skeleton } from '../ui/Feedback'
import { formatDate, daysFromToday } from '../../lib/dates'
import { cx } from '../../lib/utils'

function ProjectCard({ project }) {
    const due = project.dueDate
    const late = due && project.status !== 'completed' && daysFromToday(due) < 0

    return (
        <Link to={`/projects/${project._id}`} className="project-card card">
            <div className="project-card__top">
                <span className="project-card__icon" style={{ background: project.color }} aria-hidden="true">
                    {project.name.charAt(0).toUpperCase()}
                </span>
                <ProjectStatusBadge status={project.status} />
            </div>
            <h3 className="project-card__name">{project.name}</h3>
            <p className="project-card__description">{project.description || 'No description yet.'}</p>

            <div className="project-card__progress">
                <div className="project-card__progress-label">
                    <span>Progress</span>
                    <strong className="tabular">{project.progress}%</strong>
                </div>
                <ProgressBar value={project.progress} color={project.color} label={`${project.name} progress`} />
            </div>

            <div className="project-card__stats">
                <span title="Tasks completed"><ListChecks size={14} /> {project.completedCount}/{project.taskCount}</span>
                {project.overdueCount > 0 && (
                    <span className="project-card__overdue"><AlertTriangle size={14} /> {project.overdueCount} overdue</span>
                )}
                <PriorityBadge priority={project.priority} compact />
            </div>

            <footer className="project-card__footer">
                <AvatarGroup users={project.members} size={26} max={4} />
                {due ? (
                    <span className={cx('due', late && 'due--overdue')}>
                        <Calendar size={13} /> {formatDate(due)}
                    </span>
                ) : <span className="muted project-card__no-date">No due date</span>}
            </footer>
        </Link>
    )
}

export default memo(ProjectCard)

export function ProjectCardSkeleton() {
    return (
        <div className="project-card card" aria-hidden="true">
            <div className="project-card__top"><Skeleton width={36} height={36} radius={10} /><Skeleton width={60} height={20} radius={10} /></div>
            <Skeleton width="70%" height={16} />
            <Skeleton width="95%" height={12} />
            <Skeleton width="100%" height={6} style={{ marginTop: 12 }} />
            <div className="project-card__footer"><Skeleton width={80} height={24} radius={12} /><Skeleton width={60} /></div>
        </div>
    )
}
