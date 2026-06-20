const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body

        // Check if user already exists
        const existing = await User.findOne({ email })
        if (existing) return res.status(400).json({ message: 'Email already in use' })

        // Hash password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        // Create user
        const user = new User({ name, email, password: hashedPassword })
        await user.save()

        // Sign token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({ message: 'Invalid credentials' })

        const match = await bcrypt.compare(password, user.password)
        if (!match) return res.status(400).json({ message: 'Invalid credentials' })

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

        res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ email })
        if (!user) return res.status(404).json({ message: 'User not found' })

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex')
        
        // Hash token for storage
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

        // Set token and expiry (valid for 1 hour)
        user.passwordResetToken = resetTokenHash
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
        await user.save()

        // In production, send email with reset link
        // For now, return the token (in real app, send via email)
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`

        res.json({ 
            message: 'Password reset link sent to email',
            resetToken, // For testing only - remove in production
            resetLink   // For testing only - remove in production
        })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

// PUT /api/auth/reset-password
router.put('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body

        // Hash the token to match stored version
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex')

        // Find user with valid reset token
        const user = await User.findOne({
            passwordResetToken: resetTokenHash,
            passwordResetExpires: { $gt: new Date() }
        })

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' })
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        // Update password and clear reset token
        user.password = hashedPassword
        user.passwordResetToken = null
        user.passwordResetExpires = null
        await user.save()

        res.json({ message: 'Password reset successful' })
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message })
    }
})

module.exports = router
