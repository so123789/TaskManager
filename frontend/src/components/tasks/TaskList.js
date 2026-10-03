import { useState, useEffect, useCallback, memo } from 'react'
import { MoreHorizontal, Pencil, Trash2, RotateCcw, CheckCircle2, Calendar, MessageSquare, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Menu, { MenuItem, MenuDivider } from '../ui/Menu'
import { AvatarGroup } from '../ui/Avatar'
import { LabelChip } from '../ui/Badge'
import { Skeleton } from '../ui/Feedback'
import ConfirmDialog from '../ui/ConfirmDialog'
import { StatusMenu, PriorityMenu } from './TaskPickers'
import { useUpdateTask, useDeleteTask } from '../../hooks/queries'
import { useTaskModal } from '../../context/TaskModalContext'
import { dueLabel, isOverdue, formatDate } from '../../lib/dates'
import { cx } from '../../lib/utils'

const PAGE_SIZE = 25

const TaskRow = memo(function TaskRow({ task, showProject, onOpen, onUpdate, onDelete }) {
    const done = task.status === 'completed'
    const overdue = isOverdue(task)
    return (
        <tr className={cx('task-row', done && 'is-done')}>
            <td className="task-row__main">
                <button
                    type="button"
                    className={cx('check-circle', done && 'is-checked')}
                    aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    onClick={() => onUpdate(task._id, { status: done ? 'todo' : 'completed' })}
                >
                    {done && <Check size={11} strokeWidth={3} />}
                </button>
                <div className="task-row__title-wrap">
                    <button className="task-row__title" onClick={() => onOpen(task._id)}>{task.title}</button>
                    <div className="task-row__sub">
                        {task.labels?.slice(0, 2).map(l => <LabelChip key={l}>{l}</LabelChip>)}
                        {task.commentCount > 0 && (
                            <span className="task-row__comments"><MessageSquare size={12} /> {task.commentCount}</span>
                        )}
                    </div>
                </div>
            </td>
            <td data-label="Status">
                <StatusMenu value={task.status} onChange={status => onUpdate(task._id, { status })} />
            </td>
            <td data-label="Priority">
                <PriorityMenu value={task.priority} onChange={priority => onUpdate(task._id, { priority })} />
            </td>
            <td data-label="Assignee">
                {task.assignees?.length ? <AvatarGroup users={task.assignees} size={24} max={3} /> : <span className="muted">—</span>}
            </td>
            <td data-label="Due date">
                {task.dueDate ? (
                    <span className={cx('due', overdue && 'due--overdue', done && 'due--done')} title={formatDate(task.dueDate, { withYear: true })}>
                        <Calendar size={13} aria-hidden="true" /> {dueLabel(task.dueDate)}
                    </span>
                ) : <span className="muted">—</span>}
            </td>
            {showProject && (
                <td data-label="Project" className="task-row__project">
                    {task.project ? (
                        <span className="project-tag">
                            <span className="project-swatch project-swatch--sm" style={{ background: task.project.color }} />
                            <span className="truncate">{task.project.name}</span>
                        </span>
                    ) : <span className="muted">—</span>}
                </td>
            )}
            <td className="task-row__actions">
                <Menu
                    trigger={({ props }) => (
                        <button className="icon-btn icon-btn--sm" {...props} aria-label={`Actions for ${task.title}`}>
                            <MoreHorizontal size={16} />
                        </button>
                    )}
                >
                    {({ close }) => (
                        <>
                            <MenuItem icon={Pencil} onClick={() => { close(); onOpen(task._id) }}>Open task</MenuItem>
                            <MenuItem
                                icon={done ? RotateCcw : CheckCircle2}
                                onClick={() => { close(); onUpdate(task._id, { status: done ? 'todo' : 'completed' }) }}
                            >
                                {done ? 'Reopen' : 'Mark complete'}
                            </MenuItem>
                            <MenuDivider />
                            <MenuItem icon={Trash2} danger onClick={() => { close(); onDelete(task) }}>Delete</MenuItem>
                        </>
                    )}
                </Menu>
            </td>
        </tr>
    )
})

export default function TaskList({ tasks, loading, showProject = true }) {
    const { openTask } = useTaskModal()
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()
    const [page, setPage] = useState(1)
    const [pendingDelete, setPendingDelete] = useState(null)

    const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE))
    useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
    const visible = tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const onUpdate = useCallback((id, patch) => updateTask.mutate({ id, patch }), [updateTask])

    if (loading) {
        return (
            <div className="task-table-wrap card">
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="task-table__skeleton">
                        <Skeleton width={18} height={18} radius={9} />
                        <Skeleton height={14} style={{ flex: 1, maxWidth: 360 }} />
                        <Skeleton width={80} />
                        <Skeleton width={60} />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <>
            <div className="task-table-wrap card">
                <table className="task-table">
                    <thead>
                        <tr>
                            <th scope="col">Task</th>
                            <th scope="col">Status</th>
                            <th scope="col">Priority</th>
                            <th scope="col">Assignee</th>
                            <th scope="col">Due date</th>
                            {showProject && <th scope="col" className="task-row__project">Project</th>}
                            <th scope="col"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(task => (
                            <TaskRow
                                key={task._id}
                                task={task}
                                showProject={showProject}
                                onOpen={openTask}
                                onUpdate={onUpdate}
                                onDelete={setPendingDelete}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                    <span className="pagination__info">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tasks.length)} of {tasks.length}
                    </span>
                    <div className="pagination__controls">
                        <button className="icon-btn icon-btn--bordered" onClick={() => setPage(p => p - 1)} disabled={page === 1} aria-label="Previous page">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="pagination__page">Page {page} of {totalPages}</span>
                        <button className="icon-btn icon-btn--bordered" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} aria-label="Next page">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </nav>
            )}

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete task?"
                message={pendingDelete && `"${pendingDelete.title}" and its comments will be permanently deleted.`}
                loading={deleteTask.isPending}
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => deleteTask.mutate(pendingDelete._id, { onSuccess: () => setPendingDelete(null) })}
            />
        </>
    )
}
