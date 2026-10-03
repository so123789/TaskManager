import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
    DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
    useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'
import { StatusDot } from '../ui/Badge'
import { Skeleton } from '../ui/Feedback'
import { TASK_STATUSES, STATUS_LABEL } from '../../lib/constants'
import { useUpdateTask } from '../../hooks/queries'
import { useTaskModal } from '../../context/TaskModalContext'
import { cx } from '../../lib/utils'

const COLUMN_PREFIX = 'column:'
const GAP = 1024

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || new Date(a.createdAt) - new Date(b.createdAt)

function groupByStatus(tasks) {
    const groups = Object.fromEntries(TASK_STATUSES.map(s => [s.value, []]))
    ;[...tasks].sort(byOrder).forEach(t => (groups[t.status] || groups.todo).push(t._id))
    return groups
}

// Position between the neighbours at `index`; null when they share an order
// value (e.g. legacy tasks) and the column has to be renumbered
function orderAt(ids, index, byId) {
    const orderOf = (id) => (id === undefined ? undefined : byId[id]?.order ?? 0)
    const prev = orderOf(ids[index - 1])
    const next = orderOf(ids[index + 1])
    if (prev === undefined && next === undefined) return Date.now()
    if (prev === undefined) return next - GAP
    if (next === undefined) return prev + GAP
    return next - prev > 1e-6 ? (prev + next) / 2 : null
}

function SortableTask({ task, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id })
    return (
        <TaskCard
            task={task}
            innerRef={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            dragging={isDragging}
            dragProps={{ ...attributes, ...listeners, role: 'listitem' }}
            {...props}
        />
    )
}

function Column({ status, ids, onAdd, children }) {
    const { setNodeRef, isOver } = useDroppable({ id: COLUMN_PREFIX + status })
    return (
        <section className={cx('board-column', isOver && 'is-over')} aria-label={`${STATUS_LABEL[status]} column`}>
            <header className="board-column__header">
                <StatusDot status={status} />
                <h2>{STATUS_LABEL[status]}</h2>
                <span className="board-column__count">{ids.length}</span>
                {onAdd && (
                    <button className="icon-btn icon-btn--sm board-column__add" onClick={() => onAdd(status)} aria-label={`Add task to ${STATUS_LABEL[status]}`}>
                        <Plus size={15} />
                    </button>
                )}
            </header>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="board-column__body" role="list">
                    {children}
                    {!ids.length && (
                        <div className="board-column__empty">
                            {status === 'completed' ? 'Drag tasks here to complete them' : 'No tasks'}
                        </div>
                    )}
                </div>
            </SortableContext>
        </section>
    )
}

export default function TaskBoard({ tasks, loading, projectId, showProject }) {
    const { openTask, createTask } = useTaskModal()
    const updateTask = useUpdateTask()
    const byId = useMemo(() => Object.fromEntries(tasks.map(t => [t._id, t])), [tasks])
    const [columns, setColumns] = useState(() => groupByStatus(tasks))
    const [activeId, setActiveId] = useState(null)
    const dragging = useRef(false)

    // Re-sync from server data whenever it changes, unless a drag is in progress.
    // Keyed on `tasks` only: after a drop the local order is kept until the
    // optimistic cache update arrives, so the card never flickers back.
    useEffect(() => { if (!dragging.current) setColumns(groupByStatus(tasks)) }, [tasks])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        // Long-press on touch so the board can still be scrolled with a finger
        useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
        // Space picks up / drops; Enter is left free for opening the task
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
            keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
        })
    )

    const findColumn = useCallback((id) => {
        if (!id) return null
        if (String(id).startsWith(COLUMN_PREFIX)) return String(id).slice(COLUMN_PREFIX.length)
        return Object.keys(columns).find(status => columns[status].includes(id)) || null
    }, [columns])

    const onDragOver = ({ active, over }) => {
        const from = findColumn(active.id)
        const to = findColumn(over?.id)
        if (!from || !to || from === to) return
        // Move the card into the hovered column so it previews in place
        setColumns(prev => {
            const fromIds = prev[from].filter(id => id !== active.id)
            const toIds = [...prev[to]]
            const overIndex = toIds.indexOf(over.id)
            toIds.splice(overIndex >= 0 ? overIndex : toIds.length, 0, active.id)
            return { ...prev, [from]: fromIds, [to]: toIds }
        })
    }

    const onDragEnd = ({ active, over }) => {
        dragging.current = false
        setActiveId(null)
        const column = findColumn(active.id)
        const target = findColumn(over?.id)
        if (!column || !target) return setColumns(groupByStatus(tasks))

        let ids = columns[column]
        if (column === target && over.id !== active.id && !String(over.id).startsWith(COLUMN_PREFIX)) {
            ids = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id))
            setColumns(prev => ({ ...prev, [column]: ids }))
        }

        const task = byId[active.id]
        const index = ids.indexOf(active.id)
        const statusChanged = task.status !== column
        // Dropped back where it started: nothing to save
        if (!statusChanged && groupByStatus(tasks)[column].indexOf(active.id) === index) return

        const order = orderAt(ids, index, byId)

        if (order === null) {
            // Renumber the whole column, only sending tasks whose order changed
            ids.forEach((id, i) => {
                const patch = { order: (i + 1) * GAP }
                if (id === active.id && statusChanged) patch.status = column
                if (byId[id].order !== patch.order || patch.status) updateTask.mutate({ id, patch })
            })
            return
        }
        updateTask.mutate({ id: active.id, patch: statusChanged ? { status: column, order } : { order } })
    }

    const toggleComplete = useCallback((task) => {
        updateTask.mutate({ id: task._id, patch: { status: task.status === 'completed' ? 'todo' : 'completed' } })
    }, [updateTask])

    const addTask = (status) => createTask({ status, project: projectId })

    if (loading) {
        return (
            <div className="board">
                {TASK_STATUSES.map(s => (
                    <section key={s.value} className="board-column">
                        <header className="board-column__header"><Skeleton width={90} /></header>
                        <div className="board-column__body">
                            {Array.from({ length: s.value === 'todo' ? 3 : 2 }, (_, i) => <Skeleton key={i} height={92} radius={12} />)}
                        </div>
                    </section>
                ))}
            </div>
        )
    }

    const activeTask = activeId ? byId[activeId] : null

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => { dragging.current = true; setActiveId(active.id) }}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => { dragging.current = false; setActiveId(null); setColumns(groupByStatus(tasks)) }}
            accessibility={{
                screenReaderInstructions: { draggable: 'To move a task, press Space. Use the arrow keys to move it, then press Space again to drop it, or Escape to cancel.' },
            }}
        >
            <div className="board">
                {TASK_STATUSES.map(({ value }) => (
                    <Column key={value} status={value} ids={columns[value]} onAdd={addTask}>
                        {columns[value].map(id => byId[id] && (
                            <SortableTask
                                key={id}
                                task={byId[id]}
                                onOpen={openTask}
                                onToggleComplete={toggleComplete}
                                showProject={showProject}
                            />
                        ))}
                    </Column>
                ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
                {activeTask && <TaskCard task={activeTask} showProject={showProject} overlay />}
            </DragOverlay>
        </DndContext>
    )
}
