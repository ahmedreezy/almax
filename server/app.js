const express = require('express')
const path    = require('path')
const cors    = require('cors')

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

const app = express()

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth',             authRouter)
app.use('/api/football-tips',    footballTipsRouter)
app.use('/api/recent-wins',      recentWinsRouter)
app.use('/api/config',           configRouter)
app.use('/api/almax-predictions', almaxPredictionsRouter)
app.use('/api/users',            usersRouter)
app.use('/api/subscriptions',    subscriptionsRouter)
app.use('/api/testimonials',     testimonialsRouter)
app.use('/api/payments',         paymentsRouter)
app.use('/api/notifications',    notificationsRouter)
app.use('/api/groups',           groupsRouter)
app.use('/api/analytics',        analyticsRouter)

module.exports = app
