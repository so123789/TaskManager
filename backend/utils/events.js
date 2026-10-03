const Activity = require('../models/Activity')
const Notification = require('../models/Notification')

// Activity and notifications are side effects: a failure here must never fail
// the request that triggered it, so errors are logged and swallowed.

async function logActivity({ project, task, actor, type, message }) {
    try {
        await Activity.create({ project, task, actor, type, message })
    } catch (err) {
        console.error('Failed to log activity:', err.message)
    }
}

// Sends one notification per recipient, skipping the user who caused the event
async function notify(recipients, { actor, type, message, task, project }) {
    const unique = [...new Set(recipients.filter(Boolean).map(String))]
        .filter(id => id !== String(actor))
    if (!unique.length) return
    try {
        await Notification.insertMany(unique.map(recipient => ({
            recipient, actor, type, message, task, project
        })))
    } catch (err) {
        console.error('Failed to create notifications:', err.message)
    }
}

module.exports = { logActivity, notify }
