'use strict'

/**
 * Unit tests for POST /api/subscriptions
 *
 * The subscriptions endpoint expects: { userId, groupId, paymentMethod, phone }
 * Price is always taken from the group record — never from client input.
 * Special groups require special_price to be set (admin activates per-day).
 */

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV   = 'test'

const { newDb } = require('pg-mem')

// ── Build an in-memory pg pool ──────────────────────────────────────────────
function buildMemPool () {
  const db = newDb()

  db.public.none(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(200) NOT NULL,
      phone         VARCHAR(30)  UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      created_at    TIMESTAMPTZ  DEFAULT NOW()
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
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
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
      phone             VARCHAR(30)  DEFAULT '',
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

  // Seed the 5 required packages
  db.public.none(`
    INSERT INTO groups (id, name, odds_type, plan_type, price, is_special, is_active, special_price)
    VALUES
      (1, 'Daily Odd 5',            '5',       'daily',   15000, false, true,  null),
      (2, 'Weekly Odd 5',           '5',       'weekly',  60000, false, true,  null),
      (3, 'Big Staker Weekly Odd 2','2',       'weekly',  50000, false, true,  null),
      (4, 'Monthly Odd 1.5',        '1.5',     'monthly', 45000, false, true,  null),
      (5, 'Special Odds',           'special', 'special', 0,     true,  false, null)
  `)

  // Seed test user
  db.public.none(`INSERT INTO users (id, username, phone) VALUES (1, 'Testuser', '0700000001')`)

  const PgPool = db.adapters.createPg().Pool
  return new PgPool()
}

jest.mock('../db', () => ({ get pool () { return global.__subTestPool } }))

let request
let app

beforeAll(() => {
  global.__subTestPool = buildMemPool()
  app     = require('../app')
  request = require('supertest')(app)
})

afterAll(async () => {
  if (global.__subTestPool) await global.__subTestPool.end()
})

const BASE = { userId: '1', paymentMethod: 'airtel', phone: '0700000001' }

async function post (body) {
  await global.__subTestPool.query(`UPDATE payments SET status = 'failed' WHERE status = 'pending'`)
  await global.__subTestPool.query(`UPDATE subscriptions SET status = 'failed' WHERE status = 'pending'`)
  return request.post('/api/subscriptions').send(body)
}

// ════════════════════════════════════════════════════════════════════════════
// The 5 required packages — via groupId
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/subscriptions — all 5 required packages', () => {
  test.each([
    { groupId: 1, name: 'Daily Odd 5',            expectedAmount: 15000 },
    { groupId: 2, name: 'Weekly Odd 5',            expectedAmount: 60000 },
    { groupId: 3, name: 'Big Staker Weekly Odd 2', expectedAmount: 50000 },
    { groupId: 4, name: 'Monthly Odd 1.5',         expectedAmount: 45000 },
  ])('groupId $groupId ($name) → 201 with amount $expectedAmount', async ({ groupId, expectedAmount }) => {
    const res = await post({ ...BASE, groupId })
    expect(res.status).toBe(201)
    expect(res.body.subscription).toBeDefined()
    expect(res.body.subscription.amount).toBe(expectedAmount)
    expect(res.body.paymentReference).toMatch(/^ALX-/)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Price integrity — server always uses group price
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/subscriptions — price integrity', () => {
  test('client-supplied amount is ignored; group price is used', async () => {
    const res = await post({ ...BASE, groupId: 2, amount: 1 }) // try to underpay
    expect(res.status).toBe(201)
    expect(res.body.subscription.amount).toBe(60000) // Weekly Odd 5 price
  })

  test('plan_type comes from the group, not the client', async () => {
    const res = await post({ ...BASE, groupId: 4 }) // Monthly Odd 1.5
    expect(res.status).toBe(201)
    expect(res.body.subscription.planType).toBe('monthly')
  })

  test('odds_type comes from the group, not the client', async () => {
    const res = await post({ ...BASE, groupId: 1 }) // Daily Odd 5
    expect(res.status).toBe(201)
    expect(res.body.subscription.oddsType).toBe('5')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Special Odds
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/subscriptions — Special Odds', () => {
  test('Special Odds returns 400 when no special_price is set', async () => {
    const res = await post({ ...BASE, groupId: 5 }) // Special Odds, no special_price
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/not available/i)
  })

  test('Special Odds succeeds and uses special_price when admin has set it', async () => {
    // Admin sets a special_price for today
    await global.__subTestPool.query(`UPDATE groups SET is_active = true, special_price = 35000 WHERE id = 5`)

    const res = await post({ ...BASE, groupId: 5 })
    expect(res.status).toBe(201)
    expect(res.body.subscription.amount).toBe(35000) // NOT the base price (0)
    expect(res.body.subscription.planType).toBe('special')

    // Reset
    await global.__subTestPool.query(`UPDATE groups SET is_active = false, special_price = null WHERE id = 5`)
  })

  test('Special Odds returns 400 again after admin resets the price', async () => {
    // Ensure it's inactive with no price
    await global.__subTestPool.query(`UPDATE groups SET is_active = false, special_price = null WHERE id = 5`)

    const res = await post({ ...BASE, groupId: 5 })
    expect(res.status).toBe(400)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Validation errors
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/subscriptions — validation', () => {
  test('missing userId → 400', async () => {
    const res = await post({ groupId: 1, paymentMethod: 'airtel', phone: '0700000001' })
    expect(res.status).toBe(400)
  })

  test('missing groupId → 400', async () => {
    const res = await post({ userId: '1', paymentMethod: 'airtel', phone: '0700000001' })
    expect(res.status).toBe(400)
  })

  test('missing phone → 400', async () => {
    const res = await post({ userId: '1', groupId: 1, paymentMethod: 'airtel' })
    expect(res.status).toBe(400)
  })

  test('invalid paymentMethod → 400', async () => {
    const res = await post({ ...BASE, groupId: 1, paymentMethod: 'visa' })
    expect(res.status).toBe(400)
  })

  test('non-existent groupId → 400', async () => {
    const res = await post({ ...BASE, groupId: 99999 })
    expect(res.status).toBe(400)
  })

  test('non-existent userId → 400', async () => {
    const res = await post({ userId: '99999', groupId: 1, paymentMethod: 'airtel', phone: '0700000001' })
    expect(res.status).toBe(400)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Response structure
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/subscriptions — response shape', () => {
  test('response contains subscription, payment, and paymentReference', async () => {
    const res = await post({ ...BASE, groupId: 1 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('subscription')
    expect(res.body).toHaveProperty('payment')
    expect(res.body).toHaveProperty('paymentReference')
  })

  test('subscription status is pending on creation', async () => {
    const res = await post({ ...BASE, groupId: 2 })
    expect(res.status).toBe(201)
    expect(res.body.subscription.status).toBe('pending')
  })

  test('betslip is empty while subscription is pending', async () => {
    const res = await post({ ...BASE, groupId: 1 })
    expect(res.status).toBe(201)
    expect(res.body.subscription.betslipLink).toBe('')
    expect(res.body.subscription.betslipCode).toBe('')
  })
})

