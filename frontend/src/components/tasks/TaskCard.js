import { memo } from 'react'
import { Calendar, MessageSquare, Check } from 'lucide-react'
import { PriorityIcon, LabelChip } from '../ui/Badge'
import { AvatarGroup } from '../ui/Avatar'
import { dueLabel, isOverdue } from '../../lib/dates'
import { PRIORITY_LABEL } from '../../lib/constants'
import { cx } from '../../lib/utils'

// Presentational card used by the Kanban board (and its drag overlay)
function TaskCard({ task, onOpen, onToggleComplete, showProject, dragging, overlay, dragProps, style, innerRef }) {
    const overdue = isOverdue(task)
    const done = task.status === 'completed'

    return (
        <article
            ref={innerRef}
            style={style}
            className={cx('task-card', dragging && 'is-dragging', overlay && 'is-overlay', done && 'is-done')}
            onClick={() => onOpen?.(task._id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(task._id) }}
            tabIndex={0}
            aria-label={`${task.title}. ${PRIORITY_LABEL[task.priority]} priority${task.dueDate ? `, due ${dueLabel(task.dueDate)}` : ''}`}
            {...dragProps}
        >
            {showProject && task.project && (
                <div className="task-card__project">
                    <span className="project-swatch project-swatch--sm" style={{ background: task.project.color }} />
                    <span className="truncate">{task.project.name}</span>
                </div>
            )}
            <div className="task-card__title-row">
                <button
                    type="button"
                    className={cx('check-circle', done && 'is-checked')}
                    aria-label={done ? 'Reopen task' : 'Mark task complete'}
                    onPointerDown={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onToggleComplete?.(task) }}
                >
                    {done && <Check size={11} strokeWidth={3} />}
                </button>
                <h3 className="task-card__title">{task.title}</h3>
            </div>
            {task.labels?.length > 0 && (
                <div className="task-card__labels">
                    {task.labels.slice(0, 3).map(l => <LabelChip key={l}>{l}</LabelChip>)}
                    {task.labels.length > 3 && <span className="task-card__more">+{task.labels.length - 3}</span>}
                </div>
            )}
            <footer className="task-card__footer">
                <span className="task-card__meta">
                    <span title={`${PRIORITY_LABEL[task.priority]} priority`}><PriorityIcon priority={task.priority} /></span>
                    {task.dueDate && (
                        <span className={cx('due', overdue && 'due--overdue', done && 'due--done')}>
                            <Calendar size={13} aria-hidden="true" />
                            {dueLabel(task.dueDate)}
                        </span>
                    )}
                    {task.commentCount > 0 && (
                        <span className="task-card__comments" aria-label={`${task.commentCount} comments`}>
                            <MessageSquare size={13} aria-hidden="true" /> {task.commentCount}
                        </span>
                    )}
                </span>
                <AvatarGroup users={task.assignees} size={22} max={3} />
            </footer>
        </article>
    )
}

export default memo(TaskCard)
