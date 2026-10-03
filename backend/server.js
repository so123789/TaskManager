const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()
const runMigrations = require('./migrations')

const app = express()

// Allow the React app to call this API. CLIENT_URL (comma separated) restricts
// the allowed origins; when unset every origin is allowed, as before.
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}))

// Allow reading JSON from request body
app.use(express.json({ limit: '100kb' }))

// Connect to MongoDB, then bring legacy documents up to the current schema
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB connected')
        await runMigrations()
    })
    .catch((err) => console.log('❌ DB Error:', err))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/projects', require('./routes/projects'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/users', require('./routes/users'))

app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }))

// Central error handler. Express 5 forwards errors thrown in async handlers here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' })
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message })
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid request data' })
    }
    console.error(err)
    res.status(500).json({ message: 'Server error' })
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
