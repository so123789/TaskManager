const express = require('express')
const router = express.Router()
const Project = require('../models/Project')
const Task = require('../models/Task')
const User = require('../models/User')
const auth = require('../middleware/auth')

router.use(auth)

// GET /api/users/team - everyone who shares at least one project with the user,
// with the projects they share and their open workload
router.get('/team', async (req, res) => {
    const projects = await Project.find({ members: req.userId }).select('name color members owner').lean()

    const shared = new Map() // userId -> [{ _id, name, color, role }]
    for (const project of projects) {
        for (const memberId of project.members) {
            const key = String(memberId)
            if (!shared.has(key)) shared.set(key, [])
            shared.get(key).push({
                _id: project._id, name: project.name, color: project.color,
                role: String(project.owner) === key ? 'owner' : 'member'
            })
        }
    }
    if (!shared.has(req.userId)) shared.set(req.userId, [])

    const ids = [...shared.keys()]
    const [users, workload] = await Promise.all([
        User.find({ _id: { $in: ids } }).select('name email createdAt').lean(),
        Task.aggregate([
            { $match: { project: { $in: projects.map(p => p._id) }, status: { $ne: 'completed' } } },
            { $unwind: '$assignees' },
            { $group: { _id: '$assignees', openTasks: { $sum: 1 } } }
        ])
    ])
    const openByUser = new Map(workload.map(w => [String(w._id), w.openTasks]))

    res.json(users
        .map(u => ({
            ...u,
            isMe: String(u._id) === req.userId,
            projects: shared.get(String(u._id)) || [],
            openTasks: openByUser.get(String(u._id)) || 0
        }))
        .sort((a, b) => (b.isMe - a.isMe) || a.name.localeCompare(b.name)))
})

module.exports = router
