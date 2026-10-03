import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input, Textarea, Select } from '../ui/Form'
import { useCreateProject, useUpdateProject } from '../../hooks/queries'
import { PROJECT_STATUSES, PRIORITIES, PROJECT_COLORS } from '../../lib/constants'
import { dueKey } from '../../lib/dates'
import { cx } from '../../lib/utils'

const emptyForm = () => ({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    dueDate: '',
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
})

// Create a project, or edit one when `project` is passed
export default function ProjectModal({ open, onClose, project }) {
    const editing = Boolean(project)
    const navigate = useNavigate()
    const createProject = useCreateProject()
    const updateProject = useUpdateProject()
    const mutation = editing ? updateProject : createProject
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        setError('')
        setForm(project ? {
            name: project.name,
            description: project.description || '',
            status: project.status,
            priority: project.priority,
            dueDate: dueKey(project.dueDate),
            color: project.color,
        } : emptyForm())
    }, [open, project])

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

    const submit = (e) => {
        e?.preventDefault()
        if (!form.name.trim()) return setError('Project name is required')
        const body = { ...form, name: form.name.trim(), dueDate: form.dueDate || null }
        if (editing) {
            updateProject.mutate({ id: project._id, ...body }, { onSuccess: onClose })
        } else {
            createProject.mutate(body, {
                onSuccess: (created) => { onClose(); navigate(`/projects/${created._id}`) },
            })
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={editing ? 'Edit project' : 'New project'}
            description={editing ? undefined : 'Projects group related tasks and the people working on them.'}
            footer={(
                <>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={mutation.isPending}>
                        {editing ? 'Save changes' : 'Create project'}
                    </Button>
                </>
            )}
        >
            <form className="form-stack" onSubmit={submit}>
                <Field label="Project name" error={error}>
                    <Input data-autofocus value={form.name} onChange={e => { set('name')(e); setError('') }} placeholder="e.g. Website redesign" maxLength={120} />
                </Field>
                <Field label="Description" optional>
                    <Textarea value={form.description} onChange={set('description')} placeholder="What is this project about?" rows={3} />
                </Field>
                <div className="form-grid">
                    <Field label="Status">
                        <Select value={form.status} onChange={set('status')} options={PROJECT_STATUSES} />
                    </Field>
                    <Field label="Priority">
                        <Select value={form.priority} onChange={set('priority')} options={PRIORITIES} />
                    </Field>
                    <Field label="Due date" optional>
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>
                </div>
                <fieldset className="field">
                    <legend className="field__label">Colour</legend>
                    <div className="color-swatches">
                        {PROJECT_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                className={cx('color-swatch', form.color === color && 'is-selected')}
                                style={{ background: color }}
                                onClick={() => setForm(f => ({ ...f, color }))}
                                aria-label={`Colour ${color}`}
                                aria-pressed={form.color === color}
                            >
                                {form.color === color && <Check size={14} strokeWidth={3} />}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    )
}
