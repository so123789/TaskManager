const jwt = require('jsonwebtoken')

// Verifies Bearer token and attaches req.userId for downstream route handlers
module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // "Bearer <token>"

    if (!token) return res.status(401).json({ message: 'No token, authorization denied' })

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.id
        next()
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' })
    }
}