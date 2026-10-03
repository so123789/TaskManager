const mongoose = require('mongoose')

const STATUSES = ['todo', 'in_progress', 'in_review', 'completed']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const commentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    }
}, { timestamps: true })

const taskSchema = new mongoose.Schema({
    // Creator of the task (kept as `user` for backward compatibility)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: 5000
    },
    status: {
        type: String,
        enum: STATUSES,
        default: 'todo'
    },
    // Legacy flag, kept in sync with `status` so older clients keep working
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    priority: {
        type: String,
        enum: PRIORITIES,
        default: 'medium'
    },
    dueDate: {
        type: Date
    },
    labels: {
        type: [String],
        default: []
    },
    // Legacy field from the first version of the app; migrated into `labels`
    categories: {
        type: [String],
        default: undefined
    },
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    // Sort position inside a Kanban column (lower = higher up)
    order: {
        type: Number,
        default: 0
    },
    comments: [commentSchema]
}, { timestamps: true })

// Keep `status`, `completed` and `completedAt` consistent whichever one the client changed
taskSchema.pre('validate', function () {
    if (this.isModified('status')) {
        this.completed = this.status === 'completed'
    } else if (this.isModified('completed')) {
        if (this.completed) this.status = 'completed'
        else if (this.status === 'completed') this.status = 'todo'
    }
    if (this.completed && !this.completedAt) this.completedAt = new Date()
    if (!this.completed) this.completedAt = null
})

taskSchema.index({ project: 1, status: 1, order: 1 })

module.exports = mongoose.model('Task', taskSchema)
module.exports.STATUSES = STATUSES
module.exports.PRIORITIES = PRIORITIES
