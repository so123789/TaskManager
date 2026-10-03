const mongoose = require('mongoose')

const NOTIFICATION_TYPES = [
    'task_assigned',
    'task_status',
    'task_comment',
    'deadline_soon',
    'overdue',
    'project_update',
    'project_member'
]

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    read: {
        type: Boolean,
        default: false
    },
    // Dedupe key for system-generated notifications (deadline / overdue)
    key: {
        type: String
    }
}, { timestamps: true })

notificationSchema.index({ recipient: 1, createdAt: -1 })
notificationSchema.index(
    { recipient: 1, key: 1 },
    { unique: true, partialFilterExpression: { key: { $type: 'string' } } }
)

module.exports = mongoose.model('Notification', notificationSchema)
