export const TASK_STATUSES = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'in_review', label: 'In Review' },
    { value: 'completed', label: 'Completed' },
]

export const PRIORITIES = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
]

export const PROJECT_STATUSES = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On hold' },
    { value: 'completed', label: 'Completed' },
]

export const PROJECT_COLORS = [
    '#5b4fe9', '#2f6fed', '#0e9f8e', '#15994a',
    '#d97706', '#e5484d', '#d6409f', '#64748b',
]

export const SORT_OPTIONS = [
    { value: 'createdAt', label: 'Created date' },
    { value: 'updatedAt', label: 'Last updated' },
    { value: 'dueDate', label: 'Due date' },
    { value: 'priority', label: 'Priority' },
]

export const DUE_FILTERS = [
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Due today' },
    { value: 'week', label: 'Next 7 days' },
    { value: 'none', label: 'No due date' },
]

const toLabelMap = (list) => Object.fromEntries(list.map(item => [item.value, item.label]))
export const STATUS_LABEL = toLabelMap(TASK_STATUSES)
export const PRIORITY_LABEL = toLabelMap(PRIORITIES)
export const PROJECT_STATUS_LABEL = toLabelMap(PROJECT_STATUSES)
