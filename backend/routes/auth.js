const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const auth = require('../middleware/auth')
const { HttpError } = require('../utils/access')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, createdAt: user.createdAt })

// Emails are stored lowercase for new accounts; older accounts may have mixed case
const findByEmail = (email) => User.findOne({ email: { $in: [email, email.toLowerCase()] } })

const readString = (value) => (typeof value === 'string' ? value.trim() : '')

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const name = readString(req.body.name)
    const email = readString(req.body.email).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''

    if (!name) throw new HttpError(400, 'Name is required')
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address')
    if (password.length < MIN_PASSWORD) throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`)

    // Check if user already exists
    const existing = await findByEmail(email)
    if (existing) throw new HttpError(400, 'Email already in use')

    // Hash password
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10))
    const user = await User.create({ name: name.slice(0, 80), email, password: hashedPassword })

    res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const email = readString(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!email || !password) throw new HttpError(400, 'Email and password are required')

    const user = await findByEmail(email)
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new HttpError(400, 'Invalid credentials')
    }
    res.json({ token: signToken(user), user: publicUser(user) })
})

// GET /api/auth/me - current user, used to restore the session on page load
router.get('/me', auth, async (req, res) => {
    const user = await User.findById(req.userId)
    if (!user) throw new HttpError(401, 'Account no longer exists')
    res.json({ user: publicUser(user) })
})

// PUT /api/auth/me - update profile details
router.put('/me', auth, async (req, res) => {
    const user = await User.findById(req.userId)
    if (!user) throw new HttpError(401, 'Account no longer exists')

    if (req.body.name !== undefined) {
        const name = readString(req.body.name)
        if (!name) throw new HttpError(400, 'Name is required')
        user.name = name.slice(0, 80)
    }
    if (req.body.email !== undefined) {
        const email = readString(req.body.email).toLowerCase()
        if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address')
        if (email !== user.email.toLowerCase()) {
            const taken = await findByEmail(email)
            if (taken && String(taken._id) !== req.userId) throw new HttpError(400, 'Email already in use')
            user.email = email
        }
    }
    await user.save()
    res.json({ user: publicUser(user) })
})

// PUT /api/auth/me/password - change password while signed in
router.put('/me/password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD) {
        throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`)
    }
    const user = await User.findById(req.userId)
    if (!user) throw new HttpError(401, 'Account no longer exists')
    if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new HttpError(400, 'Current password is incorrect')
    }
    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10))
    await user.save()
    res.json({ message: 'Password updated successfully' })
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const email = readString(req.body.email)
    if (!email) throw new HttpError(400, 'Email is required')

    const user = await findByEmail(email)
    if (!user) throw new HttpError(404, 'User not found')

    // Generate reset token; only its hash is stored
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // valid for 1 hour
    await user.save()

    // No email provider is configured yet. Returning the token lets anyone reset
    // any account, so it is only exposed outside production for local testing.
    const response = { message: 'Password reset link sent to email' }
    if (process.env.NODE_ENV !== 'production') {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
        response.resetToken = resetToken
        response.resetLink = `${clientUrl}/reset-password?token=${resetToken}`
    }
    res.json(response)
})

// PUT /api/auth/reset-password
router.put('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body
    if (typeof token !== 'string' || !token) throw new HttpError(400, 'Invalid or expired reset token')
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD) {
        throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`)
    }

    // Find user with valid reset token
    const user = await User.findOne({
        passwordResetToken: crypto.createHash('sha256').update(token).digest('hex'),
        passwordResetExpires: { $gt: new Date() }
    })
    if (!user) throw new HttpError(400, 'Invalid or expired reset token')

    // Update password and clear reset token
    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10))
    user.passwordResetToken = null
    user.passwordResetExpires = null
    await user.save()

    res.json({ message: 'Password reset successful' })
})

module.exports = router
