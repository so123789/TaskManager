import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { tasksApi, projectsApi, notificationsApi, dashboardApi, usersApi } from '../api'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'

// Server state lives in React Query. Every query key is defined here so
// invalidation after a mutation stays consistent across the app.
export const keys = {
    tasks: ['tasks'],
    taskList: (filters) => ['tasks', 'list', filters],
    task: (id) => ['tasks', 'detail', id],
    labels: ['tasks', 'labels'],
    projects: ['projects'],
    projectList: ['projects', 'list'],
    project: (id) => ['projects', 'detail', id],
    activity: (id) => ['projects', 'activity', id],
    dashboard: ['dashboard'],
    notifications: ['notifications'],
    team: ['team'],
}

// Shared error toast for mutations
function useErrorToast() {
    const toast = useToast()
    return (error) => toast.error(getErrorMessage(error))
}

// Task edits affect project progress, dashboard stats and notifications too
function useInvalidateWork() {
    const queryClient = useQueryClient()
    return () => Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.tasks }),
        queryClient.invalidateQueries({ queryKey: keys.projects }),
        queryClient.invalidateQueries({ queryKey: keys.dashboard }),
        queryClient.invalidateQueries({ queryKey: keys.team }),
    ])
}

/* ── Tasks ─────────────────────────────────────────────── */

export const useTasks = (filters = {}, options = {}) => useQuery({
    queryKey: keys.taskList(filters),
    queryFn: () => tasksApi.list(filters),
    placeholderData: keepPreviousData,
    ...options,
})

export const useTask = (id) => useQuery({
    queryKey: keys.task(id),
    queryFn: () => tasksApi.get(id),
    enabled: Boolean(id),
})

export const useLabels = () => useQuery({ queryKey: keys.labels, queryFn: tasksApi.labels, staleTime: 60_000 })

export function useCreateTask() {
    const toast = useToast()
    const onError = useErrorToast()
    const invalidate = useInvalidateWork()
    return useMutation({
        mutationFn: tasksApi.create,
        onSuccess: () => toast.success('Task created successfully'),
        onError,
        onSettled: invalidate,
    })
}

// Fields that can be applied to cached list items before the server responds
const OPTIMISTIC_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate', 'labels', 'order']

export function useUpdateTask({ successMessage } = {}) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const invalidate = useInvalidateWork()

    return useMutation({
        mutationFn: ({ id, patch }) => tasksApi.update(id, patch),
        // Optimistic update so Kanban moves and checkbox toggles feel instant
        onMutate: async ({ id, patch }) => {
            await queryClient.cancelQueries({ queryKey: keys.tasks })
            const snapshot = queryClient.getQueriesData({ queryKey: keys.tasks })
            const optimistic = Object.fromEntries(Object.entries(patch).filter(([k]) => OPTIMISTIC_FIELDS.includes(k)))
            if ('status' in patch) optimistic.completed = patch.status === 'completed'
            if ('completed' in patch && !('status' in patch)) {
                optimistic.completed = patch.completed
                optimistic.status = patch.completed ? 'completed' : 'todo'
            }
            const apply = (task) => (task?._id === id ? { ...task, ...optimistic } : task)
            queryClient.setQueriesData({ queryKey: ['tasks', 'list'] }, (old) => (Array.isArray(old) ? old.map(apply) : old))
            queryClient.setQueryData(keys.task(id), (old) => (old ? apply(old) : old))
            return { snapshot }
        },
        onError: (error, vars, context) => {
            context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value))
            toast.error(getErrorMessage(error, 'Could not update the task'))
        },
        onSuccess: (task) => {
            queryClient.setQueryData(keys.task(task._id), task)
            if (successMessage) toast.success(successMessage)
        },
        onSettled: invalidate,
    })
}

export function useDeleteTask() {
    const queryClient = useQueryClient()
    const toast = useToast()
    const onError = useErrorToast()
    const invalidate = useInvalidateWork()
    return useMutation({
        mutationFn: tasksApi.remove,
        onSuccess: (data, id) => {
            queryClient.setQueriesData({ queryKey: ['tasks', 'list'] }, (old) => (Array.isArray(old) ? old.filter(t => t._id !== id) : old))
            queryClient.removeQueries({ queryKey: keys.task(id) })
            toast.success('Task deleted')
        },
        onError,
        onSettled: invalidate,
    })
}

export function useAddComment(taskId) {
    const queryClient = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: (text) => tasksApi.addComment(taskId, text),
        onSuccess: (task) => {
            queryClient.setQueryData(keys.task(taskId), task)
            queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
            queryClient.invalidateQueries({ queryKey: keys.projects })
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Could not post comment')),
    })
}

export function useDeleteComment(taskId) {
    const queryClient = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: (commentId) => tasksApi.removeComment(taskId, commentId),
        onSuccess: (task) => {
            queryClient.setQueryData(keys.task(taskId), task)
            toast.success('Comment deleted')
        },
        onError: (error) => toast.error(getErrorMessage(error)),
    })
}

/* ── Projects ──────────────────────────────────────────── */

export const useProjects = () => useQuery({ queryKey: keys.projectList, queryFn: projectsApi.list })

export const useProject = (id) => useQuery({
    queryKey: keys.project(id),
    queryFn: () => projectsApi.get(id),
    enabled: Boolean(id),
    retry: (count, error) => error?.response?.status !== 404 && count < 2,
})

export const useProjectActivity = (id, limit) => useQuery({
    queryKey: [...keys.activity(id), limit],
    queryFn: () => projectsApi.activity(id, limit),
    enabled: Boolean(id),
})

function useProjectMutation(mutationFn, successMessage) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const onError = useErrorToast()
    const invalidate = useInvalidateWork()
    return useMutation({
        mutationFn,
        onSuccess: (project) => {
            if (project?._id) queryClient.setQueryData(keys.project(project._id), project)
            toast.success(successMessage)
        },
        onError,
        onSettled: invalidate,
    })
}

export const useCreateProject = () => useProjectMutation(projectsApi.create, 'Project created successfully')
export const useUpdateProject = () => useProjectMutation(({ id, ...body }) => projectsApi.update(id, body), 'Project updated successfully')
export const useDeleteProject = () => useProjectMutation(projectsApi.remove, 'Project deleted')
export const useAddMember = () => useProjectMutation(({ id, email }) => projectsApi.addMember(id, email), 'Member added')
export const useRemoveMember = () => useProjectMutation(({ id, userId }) => projectsApi.removeMember(id, userId), 'Member removed')

/* ── Dashboard, team, notifications ────────────────────── */

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: dashboardApi.get })

export const useTeam = () => useQuery({ queryKey: keys.team, queryFn: usersApi.team })

export const useNotifications = (params = {}) => useQuery({
    queryKey: [...keys.notifications, params],
    queryFn: () => notificationsApi.list(params),
    // Polling keeps the bell current until a push channel (e.g. WebSockets) exists
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
})

function useNotificationMutation(mutationFn) {
    const queryClient = useQueryClient()
    const onError = useErrorToast()
    return useMutation({
        mutationFn,
        onSettled: () => queryClient.invalidateQueries({ queryKey: keys.notifications }),
        onError,
    })
}

export const useMarkNotificationRead = () => useNotificationMutation(({ id, read }) => notificationsApi.markRead(id, read))
export const useMarkAllNotificationsRead = () => useNotificationMutation(notificationsApi.markAllRead)
export const useDeleteNotification = () => useNotificationMutation(notificationsApi.remove)
