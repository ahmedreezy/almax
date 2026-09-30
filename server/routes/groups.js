const express  = require('express')
const router   = express.Router()
const { pool } = require('../db')
const auth     = require('../middleware/authMiddleware')

function kampalaNowInput() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

function normalizeDeadlineForCompare(value) {
  if (!value) return ''
  const deadline = String(value)
  if (/^\d{2}:\d{2}$/.test(deadline)) return `${kampalaNowInput().slice(0, 10)}T${deadline}`
  return deadline.slice(0, 16)
}

function isDeadlineClosed(value) {
  const deadline = normalizeDeadlineForCompare(value)
  return !!deadline && kampalaNowInput() > deadline
}

function isPastOrCurrentDeadline(value) {
  const deadline = normalizeDeadlineForCompare(value)
  return !!deadline && kampalaNowInput() >= deadline
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

function requireAdmin(req, res, next) {
  if (req.admin?.role === 'user') return res.status(403).json({ error: 'Forbidden' })
  next()
}

function formatGroup(g) {
  return {
    id:                   g.id,
    name:                 g.name,
    oddsType:             g.odds_type,
    planType:             g.plan_type,
    price:                parseFloat(g.price),
    betslipLink:          g.betslip_link  || '',
    betslipCode:          g.betslip_code  || '',
    isSpecial:            g.is_special    || false,
    isActive:             g.is_active     !== false,
    specialPrice:         g.special_price != null ? parseFloat(g.special_price) : null,
    specialOdds:          g.special_odds  || null,
    subscriptionDeadline: g.subscription_deadline || null,
    isClosed:             isDeadlineClosed(g.subscription_deadline)
  }
}

// GET all groups (public) — hides special groups that aren't active/priced today
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM groups ORDER BY price ASC')
    // Hide: inactive regular groups, and special groups that aren't priced today
    const visible = rows.filter(g => {
      if (!g.is_active) return false
      if (g.is_special) return g.special_price != null
      return true
    })
    res.json(visible.map(formatGroup))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET all groups including hidden special ones (admin only)
router.get('/admin', auth, requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM groups ORDER BY price ASC')
    res.json(rows.map(formatGroup))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH update a group (admin)
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

  const body = req.body || {}
  const name = body.name
  const price = body.price
  const betslipLink = body.betslipLink ?? body.betslip_link
  const betslipCode = body.betslipCode ?? body.betslip_code
  const isActive = body.isActive ?? body.is_active
  const isSpecial = body.isSpecial ?? body.is_special
  const specialPrice = body.specialPrice ?? body.special_price
  const specialOdds = body.specialOdds ?? body.special_odds
  const subscriptionDeadline = body.subscriptionDeadline ?? body.subscription_deadline
  const parsedIsActive = toBoolean(isActive)
  const parsedIsSpecial = toBoolean(isSpecial)

  const sets = []; const vals = []; let i = 1
  if (name         !== undefined) { sets.push(`name = $${i++}`);          vals.push(name) }
  if (price        !== undefined) { sets.push(`price = $${i++}`);         vals.push(parseFloat(price)) }
  if (betslipLink  !== undefined) { sets.push(`betslip_link = $${i++}`);  vals.push(betslipLink) }
  if (betslipCode  !== undefined) { sets.push(`betslip_code = $${i++}`);  vals.push(betslipCode) }
  if (isActive     !== undefined) { sets.push(`is_active = $${i++}`);     vals.push(parsedIsActive) }
  if (isSpecial    !== undefined) { sets.push(`is_special = $${i++}`);    vals.push(parsedIsSpecial) }
  if (specialPrice !== undefined) { sets.push(`special_price = $${i++}`); vals.push(specialPrice !== null && specialPrice !== '' ? parseFloat(specialPrice) : null) }
  if (specialOdds  !== undefined) { sets.push(`special_odds = $${i++}`);  vals.push(specialOdds !== null && specialOdds !== '' ? String(specialOdds) : null) }
  if (subscriptionDeadline !== undefined) { sets.push(`subscription_deadline = $${i++}`); vals.push(subscriptionDeadline || null) }
  sets.push(`updated_at = NOW()`)

  if (sets.length === 1) return res.status(400).json({ error: 'No fields to update' })

  try {
    const { rows: currentRows } = await pool.query('SELECT * FROM groups WHERE id = $1', [id])
    if (currentRows.length === 0) return res.status(404).json({ error: 'Group not found' })

    const current = currentRows[0]
    const nextActive = parsedIsActive !== undefined ? parsedIsActive : current.is_active !== false
    const nextDeadline = subscriptionDeadline !== undefined
      ? (subscriptionDeadline || null)
      : current.subscription_deadline

    if (nextActive && isPastOrCurrentDeadline(nextDeadline)) {
      return res.status(400).json({ error: 'Packages with past deadlines cannot be activated. Set a future deadline first.' })
    }

    vals.push(id)
    const { rows } = await pool.query(
      `UPDATE groups SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Group not found' })
    res.json(formatGroup(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST create a new group (admin)
router.post('/', auth, requireAdmin, async (req, res) => {
  const body = req.body || {}
  const name = body.name
  const oddsType = body.oddsType ?? body.odds_type
  const planType = body.planType ?? body.plan_type
  const price = body.price
  const betslipLink = body.betslipLink ?? body.betslip_link
  const betslipCode = body.betslipCode ?? body.betslip_code
  const isSpecial = body.isSpecial ?? body.is_special
  const isActive = body.isActive ?? body.is_active
  const specialPrice = body.specialPrice ?? body.special_price
  if (!name || !oddsType || !planType || price == null) {
    return res.status(400).json({ error: 'name, oddsType, planType, and price are required' })
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO groups (name, odds_type, plan_type, price, betslip_link, betslip_code, is_special, is_active, special_price)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      name,
      oddsType,
      planType,
      parseFloat(price),
      betslipLink  || '',
      betslipCode  || '',
      toBoolean(isSpecial) === true,
      isActive === undefined ? true : toBoolean(isActive),
      (toBoolean(isSpecial) === true && specialPrice != null && specialPrice !== '') ? parseFloat(specialPrice) : null
    ])
    res.status(201).json(formatGroup(rows[0]))
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A package with that name already exists' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE a group (admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query('SELECT id FROM groups WHERE id = $1', [id])
    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Group not found' })
    }

    const detached = await client.query('UPDATE subscriptions SET group_id = NULL WHERE group_id = $1', [id])
    await client.query('DELETE FROM groups WHERE id = $1', [id])
    await client.query('COMMIT')

    res.json({
      success: true,
      detachedSubscriptions: detached.rowCount,
      message: detached.rowCount > 0
        ? `Package deleted. ${detached.rowCount} linked subscription${detached.rowCount === 1 ? '' : 's'} were kept and detached from this package.`
        : 'Package deleted.'
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

module.exports = router
