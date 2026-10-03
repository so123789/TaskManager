import { createContext, useContext, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'

const TaskModal = lazy(() => import('../components/tasks/TaskModal'))
const TaskModalContext = createContext(null)

// Opens the task modal from anywhere (board, list, calendar, search,
// notifications). The open task id lives in the URL (?task=<id>) so task
// links can be shared and the back button closes the modal.
export function TaskModalProvider({ children }) {
    const [searchParams, setSearchParams] = useSearchParams()
    const [createDefaults, setCreateDefaults] = useState(null)
    const taskId = searchParams.get('task')

    const openTask = useCallback((id) => {
        setCreateDefaults(null)
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('task', id)
            return next
        })
    }, [setSearchParams])

    const close = useCallback(() => {
        setCreateDefaults(null)
        if (!searchParams.has('task')) return
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.delete('task')
            return next
        }, { replace: true })
    }, [searchParams, setSearchParams])

    // defaults: { project, status, dueDate, assignees }
    const createTask = useCallback((defaults = {}) => setCreateDefaults(defaults), [])

    const value = useMemo(() => ({ openTask, createTask, closeTask: close }), [openTask, createTask, close])

    return (
        <TaskModalContext.Provider value={value}>
            {children}
            {(taskId || createDefaults) && (
                <Suspense fallback={null}>
                    <TaskModal
                        key={createDefaults ? 'new' : taskId}
                        taskId={createDefaults ? null : taskId}
                        defaults={createDefaults}
                        onClose={close}
                    />
                </Suspense>
            )}
        </TaskModalContext.Provider>
    )
}

export function useTaskModal() {
    return useContext(TaskModalContext)
}
