const mongoose = require('mongoose')

// Append-only audit trail shown in a project's Activity tab
const activitySchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // e.g. task_created, task_status, task_assigned, comment_added, project_updated
    type: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, { timestamps: { createdAt: true, updatedAt: false } })

module.exports = mongoose.model('Activity', activitySchema)
