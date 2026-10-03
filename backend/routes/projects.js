const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Project = require('../models/Project')
const Task = require('../models/Task')
const User = require('../models/User')
const Activity = require('../models/Activity')
const auth = require('../middleware/auth')
const { HttpError, isId, loadProjectForMember } = require('../utils/access')
const { logActivity, notify } = require('../utils/events')
const { parseToday } = require('../utils/dates')

const { PROJECT_STATUSES } = Project
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

router.use(auth)

function parseProjectBody(body, { creating } = {}) {
    const fields = {}
    if (creating || body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) throw new HttpError(400, 'Project name is required')
        fields.name = body.name.trim().slice(0, 120)
    }
    if (body.description !== undefined) fields.description = String(body.description ?? '').trim().slice(0, 5000)
    if (body.status !== undefined) {
        if (!PROJECT_STATUSES.includes(body.status)) throw new HttpError(400, 'Invalid status')
        fields.status = body.status
    }
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
    if (body.color !== undefined) {
        if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) throw new HttpError(400, 'Invalid color')
        fields.color = body.color
    }
    return fields
}

// Task counts per project in a single aggregation instead of one query per project
async function taskStats(projectIds, today) {
    const rows = await Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
            $group: {
                _id: '$project',
                taskCount: { $sum: 1 },
                completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                overdueCount: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $ne: ['$status', 'completed'] },
                                { $ne: [{ $ifNull: ['$dueDate', null] }, null] },
                                { $lt: ['$dueDate', today] }
                            ]
                        }, 1, 0]
                    }
                }
            }
        }
    ])
    return new Map(rows.map(r => [String(r._id), r]))
}

function withStats(project, stats) {
    const s = stats.get(String(project._id)) || { taskCount: 0, completedCount: 0, overdueCount: 0 }
    const json = project.toJSON ? project.toJSON() : project
    return {
        ...json,
        taskCount: s.taskCount,
        completedCount: s.completedCount,
        overdueCount: s.overdueCount,
        progress: s.taskCount ? Math.round((s.completedCount / s.taskCount) * 100) : 0
    }
}

const populateMembers = (query) => query
    .populate('members', 'name email')
    .populate('owner', 'name email')

async function projectResponse(id, today) {
    const project = await populateMembers(Project.findById(id))
    return withStats(project, await taskStats([project._id], today))
}

function requireOwner(project, userId) {
    if (String(project.owner) !== userId) throw new HttpError(403, 'Only the project owner can do this')
}

// GET /api/projects - projects the user belongs to, with progress stats
router.get('/', async (req, res) => {
    const projects = await populateMembers(Project.find({ members: req.userId }).sort({ updatedAt: -1 }))
    const stats = await taskStats(projects.map(p => p._id), parseToday(req.query.today))
    res.json(projects.map(p => withStats(p, stats)))
})

// POST /api/projects
router.post('/', async (req, res) => {
    const fields = parseProjectBody(req.body, { creating: true })
    const project = await Project.create({ ...fields, owner: req.userId, members: [req.userId] })
    const user = await User.findById(req.userId).select('name')
    await logActivity({
        project: project._id, actor: req.userId, type: 'project_created',
        message: `${user?.name || 'Someone'} created the project`
    })
    res.status(201).json(await projectResponse(project._id, parseToday(req.query.today)))
})

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    const project = await loadProjectForMember(req.params.id, req.userId)
    res.json(await projectResponse(project._id, parseToday(req.query.today)))
})

// PUT /api/projects/:id - any member can edit project details
router.put('/:id', async (req, res) => {
    const project = await loadProjectForMember(req.params.id, req.userId)
    const previousStatus = project.status
    project.set(parseProjectBody(req.body))
    const changed = project.modifiedPaths()
    await project.save()

    if (changed.length) {
        const user = await User.findById(req.userId).select('name')
        const name = user?.name || 'Someone'
        const message = project.status !== previousStatus
            ? `${name} changed the status of ${project.name} to ${project.status.replace('_', ' ')}`
            : `${name} updated ${project.name}`
        await logActivity({ project: project._id, actor: req.userId, type: 'project_updated', message })
        await notify(project.members, { actor: req.userId, project: project._id, type: 'project_update', message })
    }
    res.json(await projectResponse(project._id, parseToday(req.query.today)))
})

// DELETE /api/projects/:id - owner only; removes the project's tasks and activity
router.delete('/:id', async (req, res) => {
    const project = await loadProjectForMember(req.params.id, req.userId)
    requireOwner(project, req.userId)
    await Promise.all([
        Task.deleteMany({ project: project._id }),
        Activity.deleteMany({ project: project._id })
    ])
    await project.deleteOne()
    res.json({ message: 'Project deleted' })
})

// POST /api/projects/:id/members - owner adds an existing user by email
router.post('/:id/members', async (req, res) => {
    const project = await loadProjectForMember(req.params.id, req.userId)
    requireOwner(project, req.userId)

    const email = typeof req.body.email === 'string' ? req.body.email.trim() : ''
    if (!email) throw new HttpError(400, 'Email is required')
    const member = await User.findOne({ email: { $in: [email, email.toLowerCase()] } }).select('name')
    if (!member) throw new HttpError(404, 'No user is registered with that email')
    if (project.members.some(id => String(id) === String(member._id))) {
        throw new HttpError(400, `${member.name} is already a member`)
    }

    project.members.push(member._id)
    await project.save()

    const owner = await User.findById(req.userId).select('name')
    await logActivity({
        project: project._id, actor: req.userId, type: 'member_added',
        message: `${owner?.name || 'Someone'} added ${member.name} to the project`
    })
    await notify([member._id], {
        actor: req.userId, project: project._id, type: 'project_member',
        message: `${owner?.name || 'Someone'} added you to ${project.name}`
    })
    res.status(201).json(await projectResponse(project._id, parseToday(req.query.today)))
})

// DELETE /api/projects/:id/members/:userId - owner removes a member, or a member leaves
router.delete('/:id/members/:userId', async (req, res) => {
    const project = await loadProjectForMember(req.params.id, req.userId)
    const { userId } = req.params
    if (!isId(userId)) throw new HttpError(404, 'Member not found')
    if (userId !== req.userId) requireOwner(project, req.userId)
    if (String(project.owner) === userId) throw new HttpError(400, 'The owner cannot be removed from the project')

    project.members = project.members.filter(id => String(id) !== userId)
    await project.save()
    // Removed members can no longer see the project, so unassign them from its tasks
    await Task.updateMany({ project: project._id }, { $pull: { assignees: new mongoose.Types.ObjectId(userId) } })

    const [actor, removed] = await Promise.all([
        User.findById(req.userId).select('name'),
        User.findById(userId).select('name')
    ])
    await logActivity({
        project: project._id, actor: req.userId, type: 'member_removed',
        message: userId === req.userId
            ? `${actor?.name || 'Someone'} left the project`
            : `${actor?.name || 'Someone'} removed ${removed?.name || 'a member'} from the project`
    })
    res.json(await projectResponse(project._id, parseToday(req.query.today)))
})

// GET /api/projects/:id/activity - most recent project activity
router.get('/:id/activity', async (req, res) => {
    const project = await loadProjectForMember(req.params.id, req.userId)
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
    const activity = await Activity.find({ project: project._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('actor', 'name email')
    res.json(activity)
})

module.exports = router
