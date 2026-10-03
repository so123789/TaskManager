import { useMemo } from 'react'
import { Kanban, List, ListTodo, SearchX, Plus } from 'lucide-react'
import TaskFilters from './TaskFilters'
import TaskBoard from './TaskBoard'
import TaskList from './TaskList'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { SegmentedControl } from '../ui/Form'
import { EmptyState, ErrorState } from '../ui/Feedback'
import useTaskFilters from '../../hooks/useTaskFilters'
import useLocalStorage from '../../hooks/useLocalStorage'
import { useTasks } from '../../hooks/queries'
import { useTaskModal } from '../../context/TaskModalContext'
import { plural } from '../../lib/utils'

const VIEWS = [
    { value: 'board', label: 'Board', icon: Kanban },
    { value: 'list', label: 'List', icon: List },
]

// Filterable task collection with Board / List views. Used by My Tasks and
// by a project's Tasks and Board tabs (`projectId` scopes it to a project).
export default function TaskWorkspace({ projectId, view: fixedView, storageKey = 'tasks' }) {
    const filterState = useTaskFilters()
    const { filters, activeCount, clearFilters } = filterState
    const [savedView, setSavedView] = useLocalStorage(`tm:view:${storageKey}`, 'board')
    const view = fixedView || savedView
    const { createTask } = useTaskModal()

    const params = useMemo(() => (projectId ? { ...filters, project: projectId } : filters), [filters, projectId])
    const { data: tasks = [], isLoading, isError, error, refetch, isFetching, isPlaceholderData } = useTasks(params)
    const filtered = activeCount > 0 || Boolean(filters.q)
    const showProject = !projectId

    let content
    if (isError) {
        content = <div className="card"><ErrorState error={error} title="Couldn't load tasks" onRetry={refetch} /></div>
    } else if (!isLoading && !tasks.length) {
        content = (
            <div className="card">
                {filtered ? (
                    <EmptyState
                        icon={SearchX}
                        title="No tasks match your filters"
                        description="Try a different search term or remove some filters."
                        action={<Button onClick={clearFilters}>Clear filters</Button>}
                    />
                ) : (
                    <EmptyState
                        icon={ListTodo}
                        title="No tasks yet"
                        description={projectId ? 'Break this project down into tasks to start tracking progress.' : 'Create your first task to get started.'}
                        action={<Button variant="primary" icon={Plus} onClick={() => createTask({ project: projectId })}>Create task</Button>}
                    />
                )}
            </div>
        )
    } else if (view === 'board') {
        content = <TaskBoard tasks={tasks} loading={isLoading} projectId={projectId} showProject={showProject} />
    } else {
        content = <TaskList tasks={tasks} loading={isLoading} showProject={showProject} />
    }

    return (
        <div className="task-workspace">
            <TaskFilters
                {...filterState}
                scopedProject={Boolean(projectId)}
                viewSwitcher={!fixedView && (
                    <SegmentedControl options={VIEWS} value={view} onChange={setSavedView} label="Task view" />
                )}
            />
            <div className="task-workspace__summary" aria-live="polite">
                {!isLoading && !isError && <span>{plural(tasks.length, 'task')}{filtered && ' found'}</span>}
                {isFetching && (isPlaceholderData || !isLoading) && <Spinner size={12} label="Updating" />}
            </div>
            {content}
        </div>
    )
}
