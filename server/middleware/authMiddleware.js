const jwt = require('jsonwebtoken')
const { pool } = require('../db')

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — missing token' })
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role === 'user') {
      try {
        const { rows } = await pool.query('SELECT blacklisted FROM users WHERE id = $1', [decoded.id])
        if (rows.length === 0) return res.status(401).json({ error: 'Unauthorized — user not found' })
        if (rows[0].blacklisted) return res.status(403).json({ error: 'This phone number has been blacklisted. Please contact support.' })
      } catch (err) {
        if (err.code !== '42703' && err.code !== '42P01') throw err
      }
    }
    req.admin = decoded
    next()
  } catch (err) {
    if (err?.name !== 'JsonWebTokenError' && err?.name !== 'TokenExpiredError') {
      console.error('Auth middleware error:', err)
      return res.status(500).json({ error: 'Server error' })
    }
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' })
  }
}
