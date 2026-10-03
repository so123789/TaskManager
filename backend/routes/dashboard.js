const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Project = require('../models/Project')
const auth = require('../middleware/auth')
const { taskVisibilityFilter } = require('../utils/access')
const { DAY_MS, parseToday, parseTimezone, addDays } = require('../utils/dates')

router.use(auth)

const offsetMs = (tz) => {
    const sign = tz.startsWith('-') ? -1 : 1
    const [h, m] = tz.slice(1).split(':').map(Number)
    return sign * (h * 60 + m) * 60 * 1000
}

// GET /api/dashboard?today=YYYY-MM-DD&tz=+05:30
// Aggregated workspace overview computed in MongoDB with a single $facet pass
router.get('/', async (req, res) => {
    const today = parseToday(req.query.today)
    const tz = parseTimezone(req.query.tz)
    // Local midnight six days ago, expressed in UTC
    const weekStart = new Date(addDays(today, -6).getTime() - offsetMs(tz))
    const visibility = await taskVisibilityFilter(req.userId)
    const open = { $ne: ['$status', 'completed'] }
    const hasDue = { $ne: [{ $ifNull: ['$dueDate', null] }, null] }
    const countIf = (cond) => ({ $sum: { $cond: [cond, 1, 0] } })

    const [[facets], projects] = await Promise.all([
        Task.aggregate([
            { $match: visibility },
            {
                $facet: {
                    totals: [{
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            completed: countIf({ $eq: ['$status', 'completed'] }),
                            overdue: countIf({ $and: [open, hasDue, { $lt: ['$dueDate', today] }] }),
                            dueToday: countIf({ $and: [open, hasDue, { $gte: ['$dueDate', today] }, { $lt: ['$dueDate', addDays(today, 1)] }] }),
                            dueThisWeek: countIf({ $and: [open, hasDue, { $gte: ['$dueDate', today] }, { $lt: ['$dueDate', addDays(today, 7)] }] }),
                            assignedToMe: countIf({ $and: [open, { $in: [{ $toObjectId: req.userId }, { $ifNull: ['$assignees', []] }] }] })
                        }
                    }],
                    byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                    byPriority: [
                        { $match: { status: { $ne: 'completed' } } },
                        { $group: { _id: '$priority', count: { $sum: 1 } } }
                    ],
                    completedPerDay: [
                        { $match: { completedAt: { $gte: weekStart } } },
                        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: tz } }, count: { $sum: 1 } } }
                    ],
                    createdPerDay: [
                        { $match: { createdAt: { $gte: weekStart } } },
                        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } }, count: { $sum: 1 } } }
                    ]
                }
            }
        ]),
        Project.find({ members: req.userId }).select('status').lean()
    ])

    const totals = facets.totals[0] || { total: 0, completed: 0, overdue: 0, dueToday: 0, dueThisWeek: 0, assignedToMe: 0 }
    delete totals._id
    const toMap = (rows) => Object.fromEntries(rows.map(r => [r._id, r.count]))
    const completedMap = toMap(facets.completedPerDay)
    const createdMap = toMap(facets.createdPerDay)

    const weekly = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today.getTime() - (6 - i) * DAY_MS).toISOString().slice(0, 10)
        return { date, completed: completedMap[date] || 0, created: createdMap[date] || 0 }
    })

    const projectsByStatus = projects.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {})

    res.json({
        tasks: {
            ...totals,
            pending: totals.total - totals.completed,
            completionRate: totals.total ? Math.round((totals.completed / totals.total) * 100) : 0
        },
        projects: {
            total: projects.length,
            active: projectsByStatus.active || 0,
            completed: projectsByStatus.completed || 0,
            byStatus: projectsByStatus
        },
        byStatus: toMap(facets.byStatus),
        byPriority: toMap(facets.byPriority),
        weekly
    })
})

module.exports = router
