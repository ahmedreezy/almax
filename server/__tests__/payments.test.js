'use strict'

/**
 * Unit tests for GET /api/payments (admin) and
 * POST /api/subscriptions creating an associated payment record.
 *
 * Verifies that payment records are created alongside subscriptions,
 * and that the payment response reflects the correct plan details.
 */

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV   = 'test'

const jwt    = require('jsonwebtoken')
const { newDb } = require('pg-mem')

function buildMemPool() {
  const db = newDb()
  db.public.none(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(200) NOT NULL,
      phone         VARCHAR(30)  UNIQUE NOT NULL,
      email         VARCHAR(255),
      password_hash VARCHAR(255),
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    )
  `)
  db.public.none(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL,
      group_id          INTEGER,
      plan_type         VARCHAR(20) NOT NULL DEFAULT 'daily',
      odds_type         VARCHAR(20) NOT NULL DEFAULT '2',
      payment_method    VARCHAR(20) NOT NULL,
      phone             VARCHAR(30) DEFAULT '',
      amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
      status            VARCHAR(20) NOT NULL DEFAULT 'pending',
      proof_url         TEXT,
      secret_code_hash  TEXT DEFAULT '',
      betslip_link      TEXT,
      betslip_code      TEXT,
      rejection_reason  TEXT,
      payment_reference VARCHAR(100),
      started_at        TIMESTAMPTZ,
      expires_at        TIMESTAMPTZ,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  db.public.none(`
    CREATE TABLE IF NOT EXISTS payments (
      id               SERIAL PRIMARY KEY,
      subscription_id  INTEGER,
      user_id          INTEGER NOT NULL,
      amount           NUMERIC(10,2),
      plan_type        VARCHAR(20),
      payment_method   VARCHAR(20),
      phone            VARCHAR(30),
      status           VARCHAR(20) DEFAULT 'pending',
      payment_reference VARCHAR(100),
      transaction_id    VARCHAR(200),
      agent_commission_amount NUMERIC(12,2),
      agent_commission_status VARCHAR(20),
      agent_commission_tracked_at TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  db.public.none(`
    CREATE TABLE IF NOT EXISTS groups (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) UNIQUE NOT NULL,
      odds_type     VARCHAR(20)  NOT NULL,
      plan_type     VARCHAR(20)  NOT NULL,
      price         NUMERIC(12,2) NOT NULL DEFAULT 0,
      betslip_link  VARCHAR(500)  NOT NULL DEFAULT '',
      betslip_code  VARCHAR(100)  NOT NULL DEFAULT '',
      is_special    BOOLEAN       NOT NULL DEFAULT FALSE,
      is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
      special_price NUMERIC(12,2),
      special_odds  VARCHAR(50),
      subscription_deadline VARCHAR(16),
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `)
  db.public.none(`
    INSERT INTO groups (id, name, odds_type, plan_type, price, is_special, is_active, special_price)
    VALUES
      (1, 'Daily Odd 5',            '5',       'daily',   15000, false, true,  null),
      (2, 'Weekly Odd 5',           '5',       'weekly',  60000, false, true,  null),
      (3, 'Big Staker Weekly Odd 2','2',       'weekly',  50000, false, true,  null),
      (4, 'Monthly Odd 1.5',        '1.5',     'monthly', 45000, false, true,  null),
      (5, 'Special Odds',           'special', 'special', 0,     true,  false, null)
  `)
  db.public.none(`INSERT INTO users (id, username, phone) VALUES (1, 'Testuser', '0700000001')`)
  const PgPool = db.adapters.createPg().Pool
  return new PgPool()
}

jest.mock('../db', () => {
  return { get pool() { return global.__payTestPool } }
})

let request
let app

const ADMIN_TOKEN = jwt.sign({ id: 0, role: 'admin' }, 'test-secret-key', { expiresIn: '1h' })

beforeAll(() => {
  global.__payTestPool = buildMemPool()
  app = require('../app')
  request = require('supertest')(app)
})

afterAll(async () => {
  if (global.__payTestPool) await global.__payTestPool.end()
})

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/payments (admin-only)
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /api/payments', () => {
  test('returns 401 without admin token', async () => {
    const res = await request.get('/api/payments')
    expect([401, 403]).toContain(res.status)
  })

  test('returns empty array when no payments exist', async () => {
    const res = await request
      .get('/api/payments')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Payment record is created when subscription is submitted
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/subscriptions creates associated payment record', () => {
  async function createSub(groupId) {
    await global.__payTestPool.query(`UPDATE payments SET status = 'failed' WHERE status = 'pending'`)
    await global.__payTestPool.query(`UPDATE subscriptions SET status = 'failed' WHERE status = 'pending'`)
    return request.post('/api/subscriptions').send({
      userId: '1', groupId, paymentMethod: 'mtn', phone: '0700000001'
    })
  }

  test('payment record is returned alongside subscription in response', async () => {
    const res = await createSub(1)
    expect(res.status).toBe(201)
    expect(res.body.payment).toBeDefined()
    // payment is a raw DB row returned from INSERT — has snake_case keys
    const subId = res.body.payment.subscription_id || res.body.payment.subscriptionId
    expect(subId).toBeTruthy()
  })

  test('payment amount matches subscription amount for 5 odds weekly (60000)', async () => {
    const res = await createSub(2)
    expect(res.status).toBe(201)
    expect(res.body.payment.amount).toBe(60000)
  })

  test('payment plan_type reflects the selected period', async () => {
    const res = await createSub(1)
    expect(res.status).toBe(201)
    expect(res.body.payment.planType || res.body.payment.plan_type).toBe('daily')
  })

  test('GET /api/payments returns the newly created payment after submission', async () => {
    await createSub(1)
    const res = await request
      .get('/api/payments')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    // Verify standard payment fields are present
    const p = res.body[0]
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('amount')
    expect(p).toHaveProperty('planType')
    expect(p).toHaveProperty('status')
  })
})
