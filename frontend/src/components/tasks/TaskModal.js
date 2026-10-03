import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    CheckCircle2, RotateCcw, Trash2, MoreHorizontal, Link2, Send, CircleDot, Flag, Users, Calendar, Tag, FolderOpen, MessageSquare,
} from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Menu, { MenuItem, MenuDivider } from '../ui/Menu'
import { Field, Input, Textarea, Select } from '../ui/Form'
import { Skeleton, ErrorState } from '../ui/Feedback'
import { Avatar } from '../ui/Avatar'
import Spinner from '../ui/Spinner'
import { StatusMenu, PriorityMenu, AssigneePicker, LabelsInput } from './TaskPickers'
import { useTask, useCreateTask, useUpdateTask, useDeleteTask, useAddComment, useDeleteComment, useProjects } from '../../hooks/queries'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { dueKey, relativeTime, formatTimestamp, isOverdue } from '../../lib/dates'
import { idOf, cx } from '../../lib/utils'

// People who can be assigned: members of the selected project, or only you
function useAssigneeCandidates(projectId) {
    const { user } = useAuth()
    const { data: projects = [] } = useProjects()
    return useMemo(() => {
        const project = projects.find(p => p._id === projectId)
        if (project) return project.members
        return user ? [{ _id: user.id, name: user.name, email: user.email }] : []
    }, [projects, projectId, user])
}

function PropertyRow({ icon: Icon, label, children }) {
    return (
        <div className="property-row">
            <span className="property-row__label"><Icon size={15} aria-hidden="true" />{label}</span>
            <div className="property-row__value">{children}</div>
        </div>
    )
}

// Shared property editor for both creating and editing a task
function TaskProperties({ values, onChange }) {
    const { data: projects = [] } = useProjects()
    const candidates = useAssigneeCandidates(values.project)
    const overdue = isOverdue({ dueDate: values.dueDate, status: values.status })

    return (
        <div className="task-properties">
            <PropertyRow icon={CircleDot} label="Status">
                <StatusMenu value={values.status} onChange={status => onChange({ status })} />
            </PropertyRow>
            <PropertyRow icon={Flag} label="Priority">
                <PriorityMenu value={values.priority} onChange={priority => onChange({ priority })} />
            </PropertyRow>
            <PropertyRow icon={FolderOpen} label="Project">
                <Select
                    className="select--inline"
                    value={values.project || ''}
                    placeholder="No project"
                    options={projects.map(p => ({ value: p._id, label: p.name }))}
                    onChange={e => onChange({ project: e.target.value || null })}
                    aria-label="Project"
                />
            </PropertyRow>
            <PropertyRow icon={Users} label="Assignees">
                <AssigneePicker value={values.assignees} candidates={candidates} onChange={assignees => onChange({ assignees })} />
            </PropertyRow>
            <PropertyRow icon={Calendar} label="Due date">
                <input
                    type="date"
                    className={cx('input input--inline', overdue && 'is-overdue')}
                    value={values.dueDate || ''}
                    onChange={e => onChange({ dueDate: e.target.value || null })}
                    aria-label="Due date"
                />
            </PropertyRow>
            <PropertyRow icon={Tag} label="Labels">
                <LabelsInput value={values.labels} onChange={labels => onChange({ labels })} />
            </PropertyRow>
        </div>
    )
}

/* ── Create ──────────────────────────────────────────────── */

function CreateTaskModal({ defaults, onClose }) {
    const createTask = useCreateTask()
    const { data: projects = [] } = useProjects()
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        title: '',
        description: '',
        status: defaults.status || 'todo',
        priority: defaults.priority || 'medium',
        project: defaults.project || null,
        assignees: defaults.assignees || [],
        dueDate: defaults.dueDate || '',
        labels: [],
    })

    const update = (patch) => setForm(prev => {
        const next = { ...prev, ...patch }
        // Changing project drops assignees who aren't members of the new one
        if ('project' in patch) {
            const members = projects.find(p => p._id === patch.project)?.members.map(m => m._id) || []
            next.assignees = prev.assignees.filter(id => members.includes(String(idOf(id))))
        }
        return next
    })

    const submit = (e) => {
        e?.preventDefault()
        if (!form.title.trim()) return setError('Give the task a title')
        createTask.mutate(
            { ...form, title: form.title.trim(), dueDate: form.dueDate || null },
            { onSuccess: onClose }
        )
    }

    return (
        <Modal
            open
            onClose={onClose}
            title="New task"
            size="md"
            footer={(
                <>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={createTask.isPending}>Create task</Button>
                </>
            )}
        >
            <form className="task-form" onSubmit={submit} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e) }}>
                <Field label="Title" error={error}>
                    <Input
                        data-autofocus
                        value={form.title}
                        onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError('') }}
                        placeholder="What needs to be done?"
                        maxLength={200}
                    />
                </Field>
                <Field label="Description" optional>
                    <Textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Add more detail, context or acceptance criteria…"
                        rows={3}
                    />
                </Field>
                <TaskProperties values={form} onChange={update} />
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    )
}

/* ── Edit / details ──────────────────────────────────────── */

function Comments({ task }) {
    const { user } = useAuth()
    const [text, setText] = useState('')
    const addComment = useAddComment(task._id)
    const deleteComment = useDeleteComment(task._id)

    const submit = (e) => {
        e.preventDefault()
        if (!text.trim()) return
        addComment.mutate(text.trim(), { onSuccess: () => setText('') })
    }

    return (
        <section className="comments" aria-label="Comments">
            <h3 className="task-section-title"><MessageSquare size={15} /> Comments <span className="muted">{task.comments.length}</span></h3>
            {task.comments.length > 0 && (
                <ol className="comments__list">
                    {task.comments.map(c => (
                        <li key={c._id} className="comment">
                            <Avatar user={c.author} size={28} />
                            <div className="comment__body">
                                <div className="comment__meta">
                                    <strong>{c.author?.name || 'Deleted user'}</strong>
                                    <time dateTime={c.createdAt} title={new Date(c.createdAt).toLocaleString()}>{relativeTime(c.createdAt)}</time>
                                    {String(idOf(c.author)) === String(user?.id) && (
                                        <button
                                            className="comment__delete"
                                            onClick={() => deleteComment.mutate(c._id)}
                                            aria-label="Delete comment"
                                            disabled={deleteComment.isPending}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                                <p className="comment__text">{c.text}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            <form className="comment-composer" onSubmit={submit}>
                <Avatar user={user} size={28} />
                <div className="comment-composer__box">
                    <Textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Write a comment…"
                        rows={2}
                        maxLength={2000}
                        aria-label="Write a comment"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e) }}
                    />
                    <div className="comment-composer__actions">
                        <span className="comment-composer__hint">Ctrl + Enter to send</span>
                        <Button type="submit" size="sm" variant="primary" icon={Send} loading={addComment.isPending} disabled={!text.trim()}>
                            Comment
                        </Button>
                    </div>
                </div>
            </form>
        </section>
    )
}

function EditTaskModal({ id, onClose }) {
    const { data: task, isLoading, isError, error, refetch } = useTask(id)
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()
    const toast = useToast()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [savedAt, setSavedAt] = useState(null)

    // Initialise the editable text fields once the task loads (or changes remotely)
    useEffect(() => {
        if (task) { setTitle(task.title); setDescription(task.description || '') }
    }, [task?._id, task?.title, task?.description]) // eslint-disable-line react-hooks/exhaustive-deps

    const save = (patch) => updateTask.mutate({ id, patch }, { onSuccess: () => setSavedAt(Date.now()) })

    const saveTitle = () => {
        const next = title.trim()
        if (!next) { setTitle(task.title); return toast.error('Title cannot be empty') }
        if (next !== task.title) save({ title: next })
    }
    const saveDescription = () => {
        if (description.trim() !== (task.description || '')) save({ description: description.trim() })
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            toast.success('Link copied to clipboard')
        } catch {
            toast.error('Could not copy the link')
        }
    }

    if (isLoading || isError) {
        return (
            // Same Fragment > Modal shape as the loaded view, so React keeps one
            // dialog instance (and its focus handling) when the task arrives
            <>
                <Modal open onClose={onClose} title="Task" size="lg" initialFocus={false}>
                    {isLoading ? (
                        <div className="task-detail__loading">
                            <Skeleton height={28} width="60%" />
                            <Skeleton height={80} />
                            <Skeleton height={14} width="40%" />
                            <Skeleton height={14} width="50%" />
                        </div>
                    ) : (
                        <ErrorState
                            error={error}
                            title={error?.response?.status === 404 ? 'Task not found' : "Couldn't load task"}
                            description={error?.response?.status === 404 ? 'It may have been deleted, or you no longer have access to it.' : undefined}
                            onRetry={error?.response?.status === 404 ? undefined : refetch}
                        />
                    )}
                </Modal>
            </>
        )
    }

    const done = task.status === 'completed'
    const values = {
        status: task.status,
        priority: task.priority,
        project: idOf(task.project) || null,
        assignees: (task.assignees || []).map(a => String(idOf(a))),
        dueDate: dueKey(task.dueDate),
        labels: task.labels || [],
    }

    const crumb = (
        <span className="task-detail__crumb">
            {task.project ? (
                <Link to={`/projects/${idOf(task.project)}`} onClick={onClose}>
                    <span className="project-swatch project-swatch--sm" style={{ background: task.project.color }} />
                    {task.project.name}
                </Link>
            ) : <span>Personal task</span>}
        </span>
    )

    return (
        <>
            <Modal open onClose={onClose} title={crumb} size="lg" className="task-detail" initialFocus={false}>
                <div className="task-detail__toolbar">
                    <Button
                        size="sm"
                        variant={done ? 'secondary' : 'primary'}
                        icon={done ? RotateCcw : CheckCircle2}
                        onClick={() => save({ status: done ? 'todo' : 'completed' })}
                    >
                        {done ? 'Reopen' : 'Mark complete'}
                    </Button>
                    <span className="task-detail__save-state" aria-live="polite">
                        {updateTask.isPending ? <><Spinner size={11} /> Saving…</> : savedAt ? 'All changes saved' : ''}
                    </span>
                    <Menu
                        trigger={({ props }) => (
                            <button className="icon-btn icon-btn--sm" {...props} aria-label="More actions"><MoreHorizontal size={16} /></button>
                        )}
                    >
                        {({ close }) => (
                            <>
                                <MenuItem icon={Link2} onClick={() => { close(); copyLink() }}>Copy link</MenuItem>
                                <MenuDivider />
                                <MenuItem icon={Trash2} danger onClick={() => { close(); setConfirmDelete(true) }}>Delete task</MenuItem>
                            </>
                        )}
                    </Menu>
                </div>

                <textarea
                    className="task-detail__title"
                    value={title}
                    rows={1}
                    maxLength={200}
                    aria-label="Task title"
                    onChange={e => setTitle(e.target.value.replace(/\n/g, ''))}
                    onBlur={saveTitle}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                />

                <div className="task-detail__layout">
                    <div className="task-detail__main">
                        <Textarea
                            className="task-detail__description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            onBlur={saveDescription}
                            placeholder="Add a description…"
                            aria-label="Description"
                            rows={4}
                        />
                        <Comments task={task} />
                    </div>

                    <aside className="task-detail__side">
                        <TaskProperties values={values} onChange={save} />
                        <dl className="task-detail__meta">
                            <div><dt>Created by</dt><dd>{task.user?.name || '—'}</dd></div>
                            <div><dt>Created</dt><dd>{formatTimestamp(task.createdAt)}</dd></div>
                            <div><dt>Updated</dt><dd>{relativeTime(task.updatedAt)}</dd></div>
                            {task.completedAt && <div><dt>Completed</dt><dd>{formatTimestamp(task.completedAt)}</dd></div>}
                        </dl>
                    </aside>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmDelete}
                title="Delete task?"
                message={`"${task.title}" and its comments will be permanently deleted.`}
                loading={deleteTask.isPending}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => deleteTask.mutate(id, { onSuccess: () => { setConfirmDelete(false); onClose() } })}
            />
        </>
    )
}

export default function TaskModal({ taskId, defaults, onClose }) {
    return taskId
        ? <EditTaskModal id={taskId} onClose={onClose} />
        : <CreateTaskModal defaults={defaults || {}} onClose={onClose} />
}
