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

function requireAdmin(req, res, next) {
  if (req.admin?.role === 'user') return res.status(403).json({ error: 'Forbidden' })
  next()
}

function toBoolean(value) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false
  return Boolean(value)
}

function rowToUser(row) {
  return {
    id:            row.id,
    username:      row.username,
    phone:         row.phone,
    email:         row.email || '',
    dob:           row.dob || '',
    scamWarning:   row.scam_warning === true,
    blacklisted:   row.blacklisted === true,
    blacklistedAt: row.blacklisted_at ? new Date(row.blacklisted_at).getTime() : null,
    createdAt:     row.created_at ? new Date(row.created_at).getTime() : null
  }
}

function rowToSub(row) {
  return {
    id:        row.id,
    planType:  row.plan_type,
    status:    row.status,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null
  }
}

// GET all users with subscription info (admin)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { rows: users } = await pool.query('SELECT * FROM users ORDER BY created_at DESC')
    if (users.length === 0) return res.json([])

    const ids = users.map(u => u.id)
    const { rows: subs } = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = ANY($1) ORDER BY created_at DESC',
      [ids]
    )

    const enriched = users.map(u => {
      const userSubs = subs.filter(s => s.user_id === u.id)
      const activeSub  = userSubs.find(s => s.status === 'active')  || null
      const pendingSub = userSubs.find(s => s.status === 'pending') || null
      return {
        ...rowToUser(u),
        activeSub:  activeSub  ? rowToSub(activeSub)  : null,
        pendingSub: pendingSub ? rowToSub(pendingSub) : null
      }
    })
    res.json(enriched)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST register a new user (public)
router.post('/', async (req, res) => {
  const { username, phone, password, securityAnswer } = req.body
  if (!username || !phone || !password) {
    return res.status(400).json({ error: 'username, phone, and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  if (!securityAnswer || securityAnswer.trim().length < 2) {
    return res.status(400).json({ error: 'A security answer is required for account recovery' })
  }

  const jwtSecret = getJwtSecret(res)
  if (!jwtSecret) return

  try {
    const { rows: existingRows } = await pool.query('SELECT blacklisted FROM users WHERE phone = $1', [phone])
    if (existingRows[0]?.blacklisted) {
      return res.status(403).json({ error: 'This phone number has been blacklisted. Please contact support.' })
    }

    const passwordHash     = await bcrypt.hash(password, 12)
    const answerHash       = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 12)
    const { rows } = await pool.query(`
      INSERT INTO users (username, phone, password_hash, security_answer_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [username, phone, passwordHash, answerHash])
    const user = rowToUser(rows[0])
    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'user' },
      jwtSecret,
      { expiresIn: '30d' }
    )
    res.status(201).json({ ...user, token })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Phone number already registered' })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST login (public)
router.post('/login', async (req, res) => {
  const { phone, password } = req.body
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' })
  }

  const jwtSecret = getJwtSecret(res)
  if (!jwtSecret) return

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone])
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Phone number not found' })
    }
    const user = rows[0]
    if (user.blacklisted) {
      return res.status(403).json({ error: 'This phone number has been blacklisted. Please contact support.' })
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account has no password set. Please register again.' })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' })
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'user' },
      jwtSecret,
      { expiresIn: '30d' }
    )
    res.json({ ...rowToUser(user), token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET the site-wide magic question (public — for password recovery)
router.get('/magic-question', (req, res) => {
  const question = process.env.USER_MAGIC_QUESTION
  if (!question) {
    return res.status(503).json({ error: 'Password recovery is not configured on this server.' })
  }
  res.json({ question })
})

// POST reset password via security answer (public)
router.post('/reset-password', async (req, res) => {
  const { phone, answer, newPassword } = req.body
  if (!phone || !answer || !newPassword) {
    return res.status(400).json({ error: 'phone, answer, and newPassword are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone])
    // Generic 401 for both unknown phone and wrong answer — prevents user enumeration
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect phone number or security answer.' })
    }
    const user = rows[0]
    if (!user.security_answer_hash) {
      return res.status(400).json({ error: 'No recovery answer on file for this account. Please contact support.' })
    }
    const valid = await bcrypt.compare(answer.trim().toLowerCase(), user.security_answer_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect phone number or security answer.' })
    }
    const newHash = await bcrypt.hash(newPassword, 12)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id])
    res.json({ message: 'Password reset successfully. You can now log in with your new password.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET user by phone (public — returning users)
router.get('/by-phone/:phone', async (req, res) => {
  try {
    const { rows: users } = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [req.params.phone]
    )
    if (users.length === 0) return res.status(404).json({ error: 'User not found' })
    const user = users[0]
    if (user.blacklisted) {
      return res.status(403).json({ error: 'This phone number has been blacklisted. Please contact support.' })
    }
    res.json(rowToUser(user))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH member warning/blacklist flags (admin)
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

  const body = req.body || {}
  const scamWarning = body.scamWarning ?? body.scam_warning
  const blacklisted = body.blacklisted ?? body.isBlacklisted ?? body.is_blacklisted

  const sets = []
  const vals = []
  let i = 1

  if (scamWarning !== undefined) {
    sets.push(`scam_warning = $${i++}`)
    vals.push(toBoolean(scamWarning))
  }

  if (blacklisted !== undefined) {
    const nextBlacklisted = toBoolean(blacklisted)
    sets.push(`blacklisted = $${i++}`)
    vals.push(nextBlacklisted)
    sets.push(`blacklisted_at = ${nextBlacklisted ? 'NOW()' : 'NULL'}`)
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })

  try {
    vals.push(id)
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    )
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(rowToUser(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE a user (admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id])
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
