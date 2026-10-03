const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const Task = require('../models/Task')
const auth = require('../middleware/auth')
const { HttpError, isId } = require('../utils/access')
const { parseToday, addDays } = require('../utils/dates')

router.use(auth)

// Deadline notifications are generated lazily when the user checks their
// notifications, so no background scheduler is needed. The unique `key`
// guarantees each reminder is only created once per task and due date.
async function syncDeadlineNotifications(userId, today) {
    const tasks = await Task.find({
        status: { $ne: 'completed' },
        dueDate: { $ne: null, $lt: addDays(today, 2) },
        $or: [{ assignees: userId }, { user: userId, assignees: { $size: 0 } }]
    }).select('title dueDate project').lean()

    const ops = tasks.map(task => {
        const overdue = task.dueDate < today
        const type = overdue ? 'overdue' : 'deadline_soon'
        const dueKey = task.dueDate.toISOString().slice(0, 10)
        const dueToday = dueKey === today.toISOString().slice(0, 10)
        const message = overdue
            ? `"${task.title}" is overdue`
            : `"${task.title}" is due ${dueToday ? 'today' : 'tomorrow'}`
        return {
            updateOne: {
                filter: { recipient: userId, key: `${type}:${task._id}:${dueKey}` },
                update: {
                    $setOnInsert: {
                        recipient: userId, type, message, task: task._id,
                        project: task.project || null, read: false
                    }
                },
                upsert: true
            }
        }
    })
    if (ops.length) await Notification.bulkWrite(ops, { ordered: false })
}

// GET /api/notifications?today=YYYY-MM-DD&limit=30
router.get('/', async (req, res) => {
    await syncDeadlineNotifications(req.userId, parseToday(req.query.today))
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100)
    const filter = { recipient: req.userId }
    if (req.query.unread === 'true') filter.read = false

    const [items, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('actor', 'name email')
            .populate('project', 'name color'),
        Notification.countDocuments({ recipient: req.userId, read: false })
    ])
    res.json({ items, unreadCount })
})

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
    await Notification.updateMany({ recipient: req.userId, read: false }, { read: true })
    res.json({ message: 'All notifications marked as read' })
})

// PATCH /api/notifications/:id - { read: boolean }
router.patch('/:id', async (req, res) => {
    if (!isId(req.params.id)) throw new HttpError(404, 'Notification not found')
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.userId },
        { read: req.body.read !== false },
        { new: true }
    )
    if (!notification) throw new HttpError(404, 'Notification not found')
    res.json(notification)
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
    if (!isId(req.params.id)) throw new HttpError(404, 'Notification not found')
    const result = await Notification.deleteOne({ _id: req.params.id, recipient: req.userId })
    if (!result.deletedCount) throw new HttpError(404, 'Notification not found')
    res.json({ message: 'Notification deleted' })
})

module.exports = router
