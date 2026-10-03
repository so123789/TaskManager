const mongoose = require('mongoose')
const Project = require('../models/Project')

// Error type that the central error handler turns into a JSON response
class HttpError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
    }
}

const isId = (value) => mongoose.isValidObjectId(value)

// Projects the user owns or is a member of
async function accessibleProjectIds(userId) {
    return Project.find({ members: userId }).distinct('_id')
}

// Mongo filter for every task a user may see: ones they created, ones assigned
// to them, and every task inside a project they belong to
// (ids are cast explicitly because aggregation pipelines don't auto-cast strings)
async function taskVisibilityFilter(userId) {
    const projectIds = await accessibleProjectIds(userId)
    const id = new mongoose.Types.ObjectId(String(userId))
    return {
        $or: [
            { user: id },
            { assignees: id },
            { project: { $in: projectIds } }
        ]
    }
}

async function loadProjectForMember(projectId, userId) {
    if (!isId(projectId)) throw new HttpError(404, 'Project not found')
    const project = await Project.findOne({ _id: projectId, members: userId })
    if (!project) throw new HttpError(404, 'Project not found')
    return project
}

module.exports = { HttpError, isId, accessibleProjectIds, taskVisibilityFilter, loadProjectForMember }
