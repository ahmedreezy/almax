require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')

const authRouter             = require('./routes/auth')
const footballTipsRouter     = require('./routes/footballTips')
const recentWinsRouter       = require('./routes/recentWins')
const configRouter           = require('./routes/config')
const almaxPredictionsRouter = require('./routes/almaxPredictions')
const usersRouter            = require('./routes/users')
const subscriptionsRouter    = require('./routes/subscriptions')
const testimonialsRouter     = require('./routes/testimonials')
const paymentsRouter         = require('./routes/payments')
const notificationsRouter    = require('./routes/notifications')
const groupsRouter           = require('./routes/groups')
const analyticsRouter        = require('./routes/analytics')
const webhookRouter          = require('./routes/webhook')

const app = express()
// cPanel sets PORT via environment; fall back to 3001 for local dev
const PORT = process.env.PORT || 3001

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
  'https://almaxpredictions.com',
  'http://almaxpredictions.com',
  'https://www.almaxpredictions.com',
  process.env.ALLOWED_ORIGIN
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  }
}))

// GitHub auto-deploy webhook — registered BEFORE express.json() so it gets the raw body for signature verification
app.use('/webhook/github', webhookRouter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
// Alias: frontend fetches /api/uploads/... so also expose under /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')))

// API routes
app.use('/api/auth',              authRouter)
app.use('/api/football-tips',      footballTipsRouter)
app.use('/api/recent-wins',        recentWinsRouter)
app.use('/api/config',             configRouter)
app.use('/api/almax-predictions',  almaxPredictionsRouter)
app.use('/api/users',              usersRouter)
app.use('/api/subscriptions',      subscriptionsRouter)
app.use('/api/testimonials',       testimonialsRouter)
app.use('/api/payments',           paymentsRouter)
app.use('/api/notifications',      notificationsRouter)
app.use('/api/groups',             groupsRouter)
app.use('/api/analytics',          analyticsRouter)

// Serve Vue frontend (production build)
const DIST = path.join(__dirname, '..', 'dist')
app.use(express.static(DIST))
// SPA catch-all — return index.html for any non-API route
app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

// Start server
async function start() {
  const { pool: dbPool } = require('./db')
  const { migrate } = require('./migrate')
  const { seed }    = require('./seed')

  try {
    await migrate()
  } catch (err) {
    console.error('⚠ DB migration warning:', err.message)
  }

  if (!process.env.DATABASE_URL) {
    const { restoreSnapshot, registerShutdownHook } = require('./persistence')
    try {
      await restoreSnapshot(dbPool)
      const { rows } = await dbPool.query('SELECT COUNT(*) FROM admin_users')
      if (parseInt(rows[0].count, 10) === 0) await seed()
    } catch (err) {
      console.error('⚠ DB init warning:', err.message)
    }
    registerShutdownHook(dbPool)
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
    if (!process.env.SCORES_API_KEY) {
      console.warn('⚠  SCORES_API_KEY is not set — live scores will be disabled.')
    } else {
      console.log('✓  SCORES_API_KEY loaded — live scores proxy active.')
    }

    const { pool: dbPool } = require('./db')
    setInterval(async () => {
      try {
        const result = await dbPool.query(`
          DELETE FROM users
          WHERE id IN (
            SELECT u.id FROM users u
            WHERE NOT EXISTS (
              SELECT 1 FROM subscriptions s
              WHERE s.user_id = u.id
              AND s.status IN ('pending','active')
            )
            AND EXISTS (
              SELECT 1 FROM subscriptions s
              WHERE s.user_id = u.id
            )
            AND (
              SELECT MAX(s.expires_at) FROM subscriptions s WHERE s.user_id = u.id
            ) < NOW()
          )
        `)
        if (result.rowCount > 0) {
          console.log(`[cleanup] Removed ${result.rowCount} expired user(s).`)
        }
      } catch (err) {
        console.error('[cleanup] Error during auto-cleanup:', err.message)
      }
    }, 60 * 60 * 1000)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

