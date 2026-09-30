const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const router   = express.Router()
const { pool } = require('../db')
const auth     = require('../middleware/authMiddleware')

function getJwtSecret(res) {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set')
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  return process.env.JWT_SECRET
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const jwtSecret = getJwtSecret(res)
  if (!jwtSecret) return

  try {
    const { rows } = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const admin = rows[0]
    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const role = admin.role || (admin.username === 'almaxdev' ? 'developer' : 'owner')
    const adminPayload = { id: admin.id, username: admin.username, role }
    const token = jwt.sign(
      adminPayload,
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    )
    res.json({ token, username: admin.username, admin: adminPayload })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/change-password  (requires valid JWT)
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' })
  }
  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters' })
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM admin_users WHERE id = $1',
      [req.admin.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' })
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [hash, req.admin.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Change-password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
