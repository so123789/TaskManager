import client from './client'
import { todayKey, tzOffset } from '../lib/dates'

// Thin wrappers around the REST API. Components never call axios directly;
// they go through the React Query hooks in src/hooks/queries.js.

const data = (promise) => promise.then(res => res.data)

// The server needs the user's calendar date to compute "overdue" / "due today"
const dayParams = () => ({ today: todayKey(), tz: tzOffset() })

// Drops empty filter values so URLs stay clean
const clean = (params = {}) => Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
)

export const authApi = {
    login: (body) => data(client.post('/api/auth/login', body)),
    register: (body) => data(client.post('/api/auth/register', body)),
    me: () => data(client.get('/api/auth/me')),
    updateProfile: (body) => data(client.put('/api/auth/me', body)),
    changePassword: (body) => data(client.put('/api/auth/me/password', body)),
    forgotPassword: (body) => data(client.post('/api/auth/forgot-password', body)),
    resetPassword: (body) => data(client.put('/api/auth/reset-password', body)),
}

export const tasksApi = {
    list: (filters) => data(client.get('/api/tasks', { params: clean({ ...filters, ...dayParams() }) })),
    get: (id) => data(client.get(`/api/tasks/${id}`)),
    labels: () => data(client.get('/api/tasks/labels')),
    create: (body) => data(client.post('/api/tasks', body)),
    update: (id, body) => data(client.put(`/api/tasks/${id}`, body)),
    remove: (id) => data(client.delete(`/api/tasks/${id}`)),
    addComment: (id, text) => data(client.post(`/api/tasks/${id}/comments`, { text })),
    removeComment: (id, commentId) => data(client.delete(`/api/tasks/${id}/comments/${commentId}`)),
}

export const projectsApi = {
    list: () => data(client.get('/api/projects', { params: dayParams() })),
    get: (id) => data(client.get(`/api/projects/${id}`, { params: dayParams() })),
    create: (body) => data(client.post('/api/projects', body)),
    update: (id, body) => data(client.put(`/api/projects/${id}`, body)),
    remove: (id) => data(client.delete(`/api/projects/${id}`)),
    addMember: (id, email) => data(client.post(`/api/projects/${id}/members`, { email })),
    removeMember: (id, userId) => data(client.delete(`/api/projects/${id}/members/${userId}`)),
    activity: (id, limit) => data(client.get(`/api/projects/${id}/activity`, { params: clean({ limit }) })),
}

export const notificationsApi = {
    list: (params) => data(client.get('/api/notifications', { params: clean({ ...params, today: todayKey() }) })),
    markRead: (id, read = true) => data(client.patch(`/api/notifications/${id}`, { read })),
    markAllRead: () => data(client.patch('/api/notifications/read-all')),
    remove: (id) => data(client.delete(`/api/notifications/${id}`)),
}

export const dashboardApi = {
    get: () => data(client.get('/api/dashboard', { params: dayParams() })),
}

export const usersApi = {
    team: () => data(client.get('/api/users/team')),
}
