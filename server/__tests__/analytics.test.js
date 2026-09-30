'use strict'

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV = 'test'
process.env.JPESA_AGENT_COMMISSION_ENABLED = 'true'
process.env.JPESA_AGENT_COMMISSION_RATE = '0.10'

const jwt = require('jsonwebtoken')
const { newDb } = require('pg-mem')

function buildMemPool() {
  const db = newDb()

  db.public.none(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(200) NOT NULL,
      phone         VARCHAR(30) UNIQUE NOT NULL,
      scam_warning  BOOLEAN NOT NULL DEFAULT FALSE,
      blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  db.public.none(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER,
      plan_type  VARCHAR(20),
      status     VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  db.public.none(`
    CREATE TABLE IF NOT EXISTS payments (
      id             SERIAL PRIMARY KEY,
      subscription_id INTEGER,
      user_id        INTEGER,
      amount         NUMERIC(12,2),
      plan_type      VARCHAR(20),
      payment_method VARCHAR(20),
      phone          VARCHAR(30),
      status         VARCHAR(20),
      agent_commission_amount NUMERIC(12,2),
      agent_commission_status VARCHAR(20),
      agent_commission_tracked_at TIMESTAMPTZ,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  db.public.none(`INSERT INTO users (id, username, phone) VALUES (1, 'Dev Test', '0700000001')`)
  db.public.none(`INSERT INTO subscriptions (id, user_id, plan_type, status) VALUES (1, 1, 'weekly', 'active')`)
  db.public.none(`
    INSERT INTO payments
      (subscription_id, user_id, amount, plan_type, payment_method, phone, status, agent_commission_amount, agent_commission_status, agent_commission_tracked_at)
    VALUES
      (1, 1, 10000, 'daily', 'airtel', '0700000001', 'confirmed', 1000, 'pending', NOW()),
      (1, 1, 520000, 'weekly', 'airtel', '0700000001', 'confirmed', NULL, NULL, NULL),
      (1, 1, 20000, 'daily', 'airtel', '0700000001', 'failed', 2000, 'failed', NOW())
  `)

  const PgPool = db.adapters.createPg().Pool
  return new PgPool()
}

jest.mock('../db', () => ({ get pool() { return global.__analyticsTestPool } }))

let request

beforeAll(() => {
  global.__analyticsTestPool = buildMemPool()
  const app = require('../app')
  request = require('supertest')(app)
})

afterAll(async () => {
  if (global.__analyticsTestPool) await global.__analyticsTestPool.end()
})

describe('GET /api/analytics/developer', () => {
  const devToken = jwt.sign({ id: 2, username: 'almaxdev', role: 'developer' }, process.env.JWT_SECRET)
  const ownerToken = jwt.sign({ id: 1, username: 'admin', role: 'owner' }, process.env.JWT_SECRET)

  test('reports only tracked confirmed 10% commission and ignores old or failed rows', async () => {
    const res = await request
      .get('/api/analytics/developer')
      .set('Authorization', `Bearer ${devToken}`)

    expect(res.status).toBe(200)
    expect(res.body.finance.total_revenue).toBe(530000)
    expect(res.body.commission.ratio).toBe(0.1)
    expect(res.body.commission.tracked_payments_total).toBe(10000)
    expect(res.body.commission.total_earned).toBe(1000)
    expect(res.body.commission.outstanding).toBe(1000)
    expect(res.body.commission.by_status.pending.amount).toBe(1000)
    expect(res.body.commission.recent).toHaveLength(1)
  })

  test('rejects non-developer admin tokens', async () => {
    const res = await request
      .get('/api/analytics/developer')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(403)
  })
})
