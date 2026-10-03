const Task = require('./models/Task')

// Idempotent data migrations for documents created by the first version of the
// app. They only touch tasks that are missing the new fields, so running them
// on every start is safe and cheap.
async function runMigrations() {
    const tasks = Task.collection

    // `completed` boolean -> `status`
    const status = await tasks.updateMany(
        { status: { $exists: false } },
        [{ $set: { status: { $cond: ['$completed', 'completed', 'todo'] } } }]
    )
    // `categories` -> `labels`
    const labels = await tasks.updateMany(
        { labels: { $exists: false } },
        [{ $set: { labels: { $ifNull: ['$categories', []] } } }]
    )
    // Completed tasks need a completion time for productivity stats
    const completedAt = await tasks.updateMany(
        { status: 'completed', completedAt: { $exists: false } },
        [{ $set: { completedAt: '$updatedAt' } }]
    )

    const migrated = status.modifiedCount + labels.modifiedCount + completedAt.modifiedCount
    if (migrated) console.log(`Migrated ${migrated} legacy task field(s)`)
}

module.exports = runMigrations
