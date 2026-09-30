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
    const prefix = file.fieldname === 'ad_file' ? 'ad_' : 'freetip_'
    cb(null, `${prefix}${Date.now()}_${safe}`)
  }
})
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const adMimeTypes = [
  ...imageMimeTypes,
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
]
const fileFilter = (_req, file, cb) => {
  cb(null, imageMimeTypes.includes(file.mimetype))
}
const adFileFilter = (_req, file, cb) => cb(null, adMimeTypes.includes(file.mimetype))
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })
const adUpload = multer({ storage, fileFilter: adFileFilter, limits: { fileSize: 50 * 1024 * 1024 } })

async function getVipConfig(client) {
  const { rows } = await (client || pool).query('SELECT key, value FROM vip_config')
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]))
  // Parse numeric price fields
  const priceKeys = [
    'daily_price', 'weekly_price',
    'odds_1_5_weekly_price',
    'odds_2_daily_price', 'odds_2_weekly_price',
    'odds_5_daily_price', 'odds_5_weekly_price'
  ]
  for (const k of priceKeys) { if (cfg[k]) cfg[k] = parseFloat(cfg[k]) }
  return cfg
}

async function setVipConfig(client, key, value) {
  await client.query(`
    INSERT INTO vip_config (key, value) VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `, [key, String(value)])
}

function isLocalUpload(url) {
  return typeof url === 'string' && url.startsWith('/uploads/')
}

function deleteLocalUpload(url) {
  if (!isLocalUpload(url)) return
  try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(url))) } catch {}
}

// GET the free_odd2 config (public)
router.get('/free-odd2', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM free_odd2 WHERE id = 1')
    if (rows.length === 0) return res.json({})
    const r = rows[0]
    res.json({ teamA: r.team_a, teamB: r.team_b, pick: r.pick, odd: r.odd, time: r.time, competition: r.competition, caption: r.caption || r.pick || '', imageUrl: r.image_url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT free_odd2 config (admin)
router.put('/free-odd2', auth, upload.single('image'), async (req, res) => {
  const { teamA, teamB, pick, odd, time, competition, caption } = req.body
  try {
    const { rows: existing } = await pool.query('SELECT image_url FROM free_odd2 WHERE id = 1')
    let imageUrl = existing.length > 0 ? (existing[0].image_url || '') : ''
    if (req.file) {
      if (imageUrl) try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(imageUrl))) } catch {}
      imageUrl = `/uploads/${req.file.filename}`
    }
    await pool.query(`
      INSERT INTO free_odd2 (id, team_a, team_b, pick, odd, time, competition, image_url, caption, updated_at)
      VALUES (1, $1,$2,$3,$4,$5,$6,$7,$8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        team_a = EXCLUDED.team_a, team_b = EXCLUDED.team_b,
        pick = EXCLUDED.pick, odd = EXCLUDED.odd,
        time = EXCLUDED.time, competition = EXCLUDED.competition,
        image_url = EXCLUDED.image_url, caption = EXCLUDED.caption, updated_at = NOW()
    `, [teamA || 'Free Daily Tip', teamB || '', pick || caption || '', String(odd || ''), time || '', competition || '', imageUrl, caption || pick || ''])
    res.json({ teamA: teamA || 'Free Daily Tip', teamB: teamB || '', pick: pick || caption || '', odd: String(odd || ''), time: time || '', competition: competition || '', caption: caption || pick || '', imageUrl })
  } catch (err) {
    if (req.file) try { fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename)) } catch {}
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/ad-media', auth, adUpload.single('ad_file'), async (req, res) => {
  const type = String(req.body.ad_media_type || req.body.type || '').trim()
  const allowedTypes = ['image', 'video', 'link']

  if (!allowedTypes.includes(type)) {
    if (req.file) deleteLocalUpload(`/uploads/${req.file.filename}`)
    return res.status(422).json({ error: 'Advertisement type must be image, video, or link.' })
  }

  const client = await pool.connect()
  try {
    const { rows } = await client.query(`
      SELECT key, value FROM vip_config
      WHERE key IN ('ad_media_type', 'ad_media_url', 'ad_video_url')
    `)
    const current = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const currentUrl = current.ad_media_url || current.ad_video_url || ''
    const currentType = current.ad_media_type || (currentUrl ? 'video' : '')
    let mediaUrl = currentUrl

    if (type === 'link') {
      mediaUrl = String(req.body.ad_url || '').trim()
      if (!/^https?:\/\//i.test(mediaUrl)) {
        if (req.file) deleteLocalUpload(`/uploads/${req.file.filename}`)
        return res.status(422).json({ error: 'Enter a valid advertisement link.' })
      }
      deleteLocalUpload(currentUrl)
    } else if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`
      const fileIsVideo = req.file.mimetype.startsWith('video/')
      if ((type === 'video') !== fileIsVideo) {
        deleteLocalUpload(mediaUrl)
        return res.status(422).json({ error: type === 'video' ? 'Choose a valid video file.' : 'Choose a valid picture file.' })
      }
      deleteLocalUpload(currentUrl)
    } else if (!mediaUrl || currentType !== type) {
      return res.status(422).json({ error: type === 'video' ? 'Choose a video file.' : 'Choose a picture file.' })
    }

    await client.query('BEGIN')
    await setVipConfig(client, 'ad_media_type', type)
    await setVipConfig(client, 'ad_media_url', mediaUrl)
    await setVipConfig(client, 'ad_video_url', type === 'video' ? mediaUrl : '')
    await client.query('COMMIT')

    res.json({
      ad_media_type: type,
      ad_media_url: mediaUrl,
      ad_video_url: type === 'video' ? mediaUrl : ''
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (req.file) deleteLocalUpload(`/uploads/${req.file.filename}`)
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// GET VIP config (public)
router.get('/vip-config', async (req, res) => {
  try {
    res.json(await getVipConfig())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT VIP config (admin)
router.put('/vip-config', auth, async (req, res) => {
  const allowed = [
    'daily_price', 'weekly_price', 'currency',
    'mtn_number', 'airtel_number', 'whatsapp_link',
    'current_betslip_link', 'current_betslip_code',
    'daily_betslip_link', 'daily_betslip_code',
    'weekly_betslip_link', 'weekly_betslip_code',
    'ad_video_url', 'ad_media_type', 'ad_media_url',
    // Per-package prices
    'odds_1_5_weekly_price',
    'odds_2_daily_price', 'odds_2_weekly_price',
    'odds_5_daily_price', 'odds_5_weekly_price',
    // Per-package betslip links/codes
    'odds_1_5_weekly_betslip_link', 'odds_1_5_weekly_betslip_code',
    'odds_2_daily_betslip_link',    'odds_2_daily_betslip_code',
    'odds_2_weekly_betslip_link',   'odds_2_weekly_betslip_code',
    'odds_5_daily_betslip_link',    'odds_5_daily_betslip_code',
    'odds_5_weekly_betslip_link',   'odds_5_weekly_betslip_code'
  ]
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await client.query(`
          INSERT INTO vip_config (key, value) VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [key, String(req.body[key])])
      }
    }
    await client.query('COMMIT')
    res.json(await getVipConfig())
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

module.exports = router
