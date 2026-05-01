const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const auth = require('../middleware/auth')

// All task routes require authentication
router.use(auth)

// GET /api/tasks - get all tasks for logged-in user
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.userId }).sort({ createdAt: -1 })
        res.json(tasks)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

// POST /api/tasks - create a new task
router.post('/', async (req, res) => {
    try {
        const { title, description, dueDate, priority, categories } = req.body
        const task = new Task({
            user: req.userId,
            title,
            description,
            dueDate,
            priority: priority || 'medium',
            categories: Array.isArray(categories) ? categories : []
        })
        await task.save()
        res.status(201).json(task)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

// PUT /api/tasks/:id - update a task
router.put('/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            req.body,
            { new: true }
        )
        if (!task) return res.status(404).json({ message: 'Task not found' })
        res.json(task)
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

// DELETE /api/tasks/:id - delete a task
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId })
        if (!task) return res.status(404).json({ message: 'Task not found' })
        res.json({ message: 'Task deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

module.exports = router
