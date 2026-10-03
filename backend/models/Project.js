const mongoose = require('mongoose')

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed']

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: 5000
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Always includes the owner
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    status: {
        type: String,
        enum: PROJECT_STATUSES,
        default: 'active'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    dueDate: {
        type: Date
    },
    color: {
        type: String,
        match: /^#[0-9a-fA-F]{6}$/,
        default: '#6366f1'
    }
}, { timestamps: true })

module.exports = mongoose.model('Project', projectSchema)
module.exports.PROJECT_STATUSES = PROJECT_STATUSES
