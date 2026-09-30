const express  = require('express')
const path     = require('path')
const fs       = require('fs')
const multer   = require('multer')
const router   = express.Router()
const { pool } = require('../db')
const auth     = require('../middleware/authMiddleware')

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  }
})
const fileFilter = (_req, file, cb) => {
  cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

function rowToWin(row) {
  return {
    id:         row.id,
    betType:    row.bet_type,
    date:       row.date,
    staked:     row.staked,
    returned:   row.returned,
    odds:       row.odds,
    memberName: row.member_name,
    caption:    row.caption || '',
    imageUrl:   row.image_url,
    createdAt:  row.created_at ? new Date(row.created_at).getTime() : null
  }
}

// GET all wins (public)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM recent_wins ORDER BY created_at DESC')
    res.json(rows.map(rowToWin))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST a new win (admin)
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { betType, date, staked, returned, odds, memberName, caption } = req.body
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''
    const { rows: [win] } = await pool.query(`
      INSERT INTO recent_wins (bet_type, date, staked, returned, odds, member_name, image_url, caption)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [betType || 'Winning Proof', date || '', staked || '', returned || '', odds || '', memberName || '', imageUrl, caption || ''])
    res.status(201).json(rowToWin(win))
  } catch (err) {
    if (req.file) try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)) } catch {}
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT update a win (admin)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const { rows } = await pool.query('SELECT * FROM recent_wins WHERE id = $1', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Win not found' })

    const win = rows[0]
    const sets = []; const vals = []; let i = 1
    const fields = { bet_type: 'betType', date: 'date', staked: 'staked', returned: 'returned', odds: 'odds', member_name: 'memberName', caption: 'caption' }
    for (const [col, key] of Object.entries(fields)) {
      if (req.body[key] !== undefined) { sets.push(`${col} = $${i++}`); vals.push(req.body[key]) }
    }
    if (req.file) {
      if (win.image_url) try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(win.image_url))) } catch {}
      sets.push(`image_url = $${i++}`)
      vals.push(`/uploads/${req.file.filename}`)
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })
    vals.push(id)
    const { rows: [updated] } = await pool.query(
      `UPDATE recent_wins SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    )
    res.json(rowToWin(updated))
  } catch (err) {
    if (req.file) try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)) } catch {}
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE a win (admin)
router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const { rows } = await pool.query('SELECT image_url FROM recent_wins WHERE id = $1', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Win not found' })
    if (rows[0].image_url) try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(rows[0].image_url))) } catch {}
    await pool.query('DELETE FROM recent_wins WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
