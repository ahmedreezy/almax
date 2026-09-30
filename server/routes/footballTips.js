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
    cb(null, `tip_${Date.now()}_${safe}`)
  }
})
const fileFilter = (_req, file, cb) => {
  cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

function rowToTip(row) {
  return {
    id:         row.id,
    home:       row.home,
    away:       row.away,
    competition: row.competition,
    kickoff:    row.kickoff,
    winProb:    row.win_prob,
    kitColor:   row.kit_color,
    kitNumber:  row.kit_number,
    prediction: row.prediction,
    caption:    row.caption || '',
    accent:     row.accent,
    imageUrl:   row.image_url,
    createdAt:  row.created_at ? new Date(row.created_at).getTime() : null
  }
}

// GET all tips (public)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM football_tips ORDER BY created_at ASC')
    res.json(rows.map(rowToTip))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST a new tip (admin)
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { home, away, competition, kickoff, winProb, kitColor, kitNumber, prediction, accent, caption } = req.body
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''
    const { rows: [tip] } = await pool.query(`
      INSERT INTO football_tips (home, away, competition, kickoff, win_prob, kit_color, kit_number, prediction, accent, image_url, caption)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      home || '', away || '', competition || '', kickoff || '',
      parseInt(winProb) || 75,
      kitColor   || '#FFD700',
      kitNumber  || '10',
      prediction || '',
      accent     || kitColor || '#FFD700',
      imageUrl,
      caption    || ''
    ])
    res.status(201).json(rowToTip(tip))
  } catch (err) {
    if (req.file) try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)) } catch {}
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT update a tip (admin)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { caption, kickoff, winProb, prediction } = req.body
  try {
    // fetch existing first
    const { rows: existing } = await pool.query('SELECT * FROM football_tips WHERE id = $1', [id])
    if (existing.length === 0) {
      if (req.file) try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)) } catch {}
      return res.status(404).json({ error: 'Tip not found' })
    }
    let imageUrl = existing[0].image_url
    if (req.file) {
      // delete old image
      if (imageUrl) try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(imageUrl))) } catch {}
      imageUrl = `/uploads/${req.file.filename}`
    }
    const { rows: [tip] } = await pool.query(`
      UPDATE football_tips
      SET caption=$1, kickoff=$2, win_prob=$3, prediction=$4, image_url=$5
      WHERE id=$6 RETURNING *
    `, [
      caption    !== undefined ? caption    : (existing[0].caption    || ''),
      kickoff    !== undefined ? kickoff    : existing[0].kickoff,
      winProb    !== undefined ? parseInt(winProb) : existing[0].win_prob,
      prediction !== undefined ? prediction : (existing[0].prediction || ''),
      imageUrl,
      id
    ])
    res.json(rowToTip(tip))
  } catch (err) {
    if (req.file) try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)) } catch {}
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})


router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const { rows } = await pool.query('SELECT image_url FROM football_tips WHERE id = $1', [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Tip not found' })
    if (rows[0].image_url) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(rows[0].image_url))) } catch {}
    }
    await pool.query('DELETE FROM football_tips WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
