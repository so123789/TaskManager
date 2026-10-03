const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Project = require('../models/Project')
const User = require('../models/User')
const auth = require('../middleware/auth')
const { HttpError, isId, taskVisibilityFilter, loadProjectForMember } = require('../utils/access')
const { logActivity, notify } = require('../utils/events')
const { parseToday, addDays } = require('../utils/dates')

const { STATUSES, PRIORITIES } = Task
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', completed: 'Completed' }
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 }

const POPULATE = [
    { path: 'assignees', select: 'name email' },
    { path: 'project', select: 'name color' },
    { path: 'user', select: 'name email' }
]

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const csv = (value) => (typeof value === 'string' && value ? value.split(',').map(s => s.trim()).filter(Boolean) : [])

// All task routes require authentication
router.use(auth)

// Validates and whitelists task fields from a request body. Unknown fields
// (including `user`, `comments`, timestamps) are ignored.
async function parseTaskBody(body, userId, { creating, existing } = {}) {
    const fields = {}

    if (creating || body.title !== undefined) {
        if (typeof body.title !== 'string' || !body.title.trim()) throw new HttpError(400, 'Title is required')
        fields.title = body.title.trim().slice(0, 200)
    }
    if (body.description !== undefined) fields.description = String(body.description ?? '').trim().slice(0, 5000)
    if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) throw new HttpError(400, 'Invalid status')
        fields.status = body.status
    }
    if (body.completed !== undefined && body.status === undefined) fields.completed = Boolean(body.completed)
    if (body.priority !== undefined) {
        if (!PRIORITIES.includes(body.priority)) throw new HttpError(400, 'Invalid priority')
        fields.priority = body.priority
    }
    if (body.dueDate !== undefined) {
        if (body.dueDate === null || body.dueDate === '') fields.dueDate = null
        else {
            const date = new Date(body.dueDate)
            if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Invalid due date')
            fields.dueDate = date
        }
    }
    // `categories` is accepted from older clients and stored as labels
    const rawLabels = body.labels !== undefined ? body.labels : body.categories
    if (rawLabels !== undefined) {
        if (!Array.isArray(rawLabels)) throw new HttpError(400, 'Labels must be a list')
        fields.labels = [...new Set(rawLabels.map(l => String(l).trim().slice(0, 30)).filter(Boolean))].slice(0, 10)
    }
    if (body.order !== undefined) {
        const order = Number(body.order)
        if (!Number.isFinite(order)) throw new HttpError(400, 'Invalid order')
        fields.order = order
    }

    // Project + assignees are validated together: assignees must belong to the project
    let project = existing ? existing.project : null
    if (body.project !== undefined) {
        project = body.project ? (await loadProjectForMember(body.project, userId))._id : null
        fields.project = project
    }
    const allowedAssignees = project
        ? (await Project.findById(project).select('members')).members.map(String)
        : [String(userId)]

    if (body.assignees !== undefined) {
        if (!Array.isArray(body.assignees)) throw new HttpError(400, 'Assignees must be a list')
        const ids = [...new Set(body.assignees.map(String))]
        const invalid = ids.find(id => !isId(id) || !allowedAssignees.includes(id))
        if (invalid) throw new HttpError(400, 'Assignees must be members of the project')
        fields.assignees = ids
    } else if (existing && body.project !== undefined) {
        // Moving a task between projects drops assignees who can't see the new project
        fields.assignees = existing.assignees.map(String).filter(id => allowedAssignees.includes(id))
    }

    return fields
}

async function findVisibleTask(id, userId) {
    if (!isId(id)) throw new HttpError(404, 'Task not found')
    const task = await Task.findOne({ _id: id, ...(await taskVisibilityFilter(userId)) })
    if (!task) throw new HttpError(404, 'Task not found')
    return task
}

const populateTask = (id) => Task.findById(id)
    .populate(POPULATE)
    .populate({ path: 'comments.author', select: 'name email' })

const actorName = async (userId) => (await User.findById(userId).select('name'))?.name || 'Someone'

// GET /api/tasks - list tasks visible to the user, with filtering and sorting
// Query: project, status, priority, assignee (me|unassigned|<id>), label, q,
//        due (overdue|today|week|none), from, to, sort, dir, today, limit
router.get('/', async (req, res) => {
    const { project, assignee, q, due, from, to } = req.query
    const and = [await taskVisibilityFilter(req.userId)]

    if (project === 'none') and.push({ project: null })
    else if (project) {
        if (!isId(project)) throw new HttpError(400, 'Invalid project')
        and.push({ project })
    }

    const statuses = csv(req.query.status).filter(s => STATUSES.includes(s))
    if (statuses.length) and.push({ status: { $in: statuses } })

    const priorities = csv(req.query.priority).filter(p => PRIORITIES.includes(p))
    if (priorities.length) and.push({ priority: { $in: priorities } })

    if (assignee === 'me') and.push({ assignees: req.userId })
    else if (assignee === 'unassigned') and.push({ assignees: { $size: 0 } })
    else if (assignee && isId(assignee)) and.push({ assignees: assignee })

    const labels = csv(req.query.label)
    if (labels.length) and.push({ labels: { $in: labels } })

    if (typeof q === 'string' && q.trim()) {
        const regex = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i')
        and.push({ $or: [{ title: regex }, { description: regex }, { labels: regex }] })
    }

    const today = parseToday(req.query.today)
    if (due === 'overdue') and.push({ dueDate: { $lt: today }, status: { $ne: 'completed' } })
    else if (due === 'today') and.push({ dueDate: { $gte: today, $lt: addDays(today, 1) } })
    else if (due === 'week') and.push({ dueDate: { $gte: today, $lt: addDays(today, 7) } })
    else if (due === 'none') and.push({ dueDate: null })

    // Explicit date window, used by the calendar
    const range = {}
    if (from && !Number.isNaN(new Date(from).getTime())) range.$gte = new Date(from)
    if (to && !Number.isNaN(new Date(to).getTime())) range.$lt = new Date(to)
    if (Object.keys(range).length) and.push({ dueDate: range })

    const sort = ['dueDate', 'priority', 'createdAt', 'updatedAt', 'order', 'title'].includes(req.query.sort)
        ? req.query.sort : 'createdAt'
    const dir = req.query.dir === 'asc' ? 1 : req.query.dir === 'desc' ? -1 : (sort === 'createdAt' || sort === 'updatedAt' ? -1 : 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000)

    let query = Task.find({ $and: and })
        .select({ 'comments.text': 0 })
        .populate(POPULATE)
        .limit(limit)
        .lean()
    // Priority and due date need custom ordering (rank / empty dates last), done below
    if (!['priority', 'dueDate'].includes(sort)) query = query.sort({ [sort]: dir, _id: -1 })

    let tasks = await query
    if (sort === 'priority') {
        tasks.sort((a, b) => dir * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]))
    } else if (sort === 'dueDate') {
        tasks.sort((a, b) => {
            if (!a.dueDate) return b.dueDate ? 1 : 0
            if (!b.dueDate) return -1
            return dir * (new Date(a.dueDate) - new Date(b.dueDate))
        })
    }

    res.json(tasks.map(({ comments, ...task }) => ({ ...task, commentCount: comments?.length || 0 })))
})

// GET /api/tasks/labels - distinct labels across the user's visible tasks
router.get('/labels', async (req, res) => {
    const labels = await Task.distinct('labels', await taskVisibilityFilter(req.userId))
    res.json(labels.filter(Boolean).sort((a, b) => a.localeCompare(b)))
})

// GET /api/tasks/:id - full task including comments
router.get('/:id', async (req, res) => {
    const task = await findVisibleTask(req.params.id, req.userId)
    res.json(await populateTask(task._id))
})

// POST /api/tasks - create a new task
router.post('/', async (req, res) => {
    const fields = await parseTaskBody(req.body, req.userId, { creating: true })
    const task = new Task({ order: Date.now(), ...fields, user: req.userId })
    await task.save()

    const name = await actorName(req.userId)
    if (task.project) {
        await logActivity({
            project: task.project, task: task._id, actor: req.userId,
            type: 'task_created', message: `${name} created task "${task.title}"`
        })
    }
    await notify(task.assignees, {
        actor: req.userId, type: 'task_assigned', task: task._id, project: task.project,
        message: `${name} assigned you to "${task.title}"`
    })

    res.status(201).json(await populateTask(task._id))
})

// PUT /api/tasks/:id - update a task (partial updates supported)
router.put('/:id', async (req, res) => {
    const task = await findVisibleTask(req.params.id, req.userId)
    const fields = await parseTaskBody(req.body, req.userId, { existing: task })

    const previousStatus = task.status
    const previousAssignees = task.assignees.map(String)
    task.set(fields)
    const changed = task.modifiedPaths().filter(p => !['order', 'updatedAt'].includes(p))
    await task.save()

    if (changed.length) {
        const name = await actorName(req.userId)
        const base = { actor: req.userId, task: task._id, project: task.project }

        if (task.status !== previousStatus) {
            const message = `${name} moved "${task.title}" to ${STATUS_LABELS[task.status]}`
            if (task.project) await logActivity({ ...base, type: 'task_status', message })
            await notify([task.user, ...task.assignees], { ...base, type: 'task_status', message })
        }

        const added = task.assignees.map(String).filter(id => !previousAssignees.includes(id))
        if (added.length) {
            await notify(added, { ...base, type: 'task_assigned', message: `${name} assigned you to "${task.title}"` })
            if (task.project) {
                await logActivity({ ...base, type: 'task_assigned', message: `${name} updated assignees on "${task.title}"` })
            }
        }

        const otherEdits = changed.filter(p => !['status', 'completed', 'completedAt', 'assignees'].includes(p))
        if (task.project && otherEdits.length) {
            await logActivity({ ...base, type: 'task_updated', message: `${name} updated "${task.title}"` })
        }
    }

    res.json(await populateTask(task._id))
})

// DELETE /api/tasks/:id - delete a task (creator or project owner only)
router.delete('/:id', async (req, res) => {
    const task = await findVisibleTask(req.params.id, req.userId)
    const project = task.project ? await Project.findById(task.project).select('owner') : null
    const canDelete = String(task.user) === req.userId || (project && String(project.owner) === req.userId)
    if (!canDelete) throw new HttpError(403, 'Only the task creator or project owner can delete this task')

    await task.deleteOne()
    if (task.project) {
        await logActivity({
            project: task.project, actor: req.userId, type: 'task_deleted',
            message: `${await actorName(req.userId)} deleted task "${task.title}"`
        })
    }
    res.json({ message: 'Task deleted' })
})

// POST /api/tasks/:id/comments - add a comment
router.post('/:id/comments', async (req, res) => {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : ''
    if (!text) throw new HttpError(400, 'Comment cannot be empty')

    const task = await findVisibleTask(req.params.id, req.userId)
    task.comments.push({ author: req.userId, text: text.slice(0, 2000) })
    await task.save()

    const name = await actorName(req.userId)
    const base = { actor: req.userId, task: task._id, project: task.project }
    if (task.project) await logActivity({ ...base, type: 'comment_added', message: `${name} commented on "${task.title}"` })
    await notify([task.user, ...task.assignees], { ...base, type: 'task_comment', message: `${name} commented on "${task.title}"` })

    res.status(201).json(await populateTask(task._id))
})

// DELETE /api/tasks/:id/comments/:commentId - authors can delete their own comments
router.delete('/:id/comments/:commentId', async (req, res) => {
    const task = await findVisibleTask(req.params.id, req.userId)
    const comment = task.comments.id(req.params.commentId)
    if (!comment) throw new HttpError(404, 'Comment not found')
    if (String(comment.author) !== req.userId) throw new HttpError(403, 'You can only delete your own comments')

    comment.deleteOne()
    await task.save()
    res.json(await populateTask(task._id))
})

module.exports = router
