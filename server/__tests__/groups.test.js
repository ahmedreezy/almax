'use strict'

/**
 * Unit tests for the Groups API (VIP packages).
 *
 * Covers:
 *  GET  /api/groups          — public listing with visibility rules
 *  GET  /api/groups/admin    — admin listing (all groups)
 *  PATCH /api/groups/:id     — admin update (price, betslip, special_price, is_active)
 *
 * The five required packages:
 *  1. Daily Odd 5            — 15,000 UGX / daily / odds_type '5'
 *  2. Weekly Odd 5           — 60,000 UGX / weekly / odds_type '5'
 *  3. Big Staker Weekly Odd 2 — 50,000 UGX / weekly / odds_type '2'
 *  4. Monthly Odd 1.5        — 45,000 UGX / monthly / odds_type '1.5'
 *  5. Special Odds           — admin-set price + odds / is_special=true
 */

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV   = 'test'

const { newDb } = require('pg-mem')
const jwt        = require('jsonwebtoken')

// ── In-memory DB ────────────────────────────────────────────────────────────
function buildPool () {
  const db = newDb()

  db.public.none(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
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
    CREATE TABLE IF NOT EXISTS subscriptions (
      id       SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES groups(id),
      status   VARCHAR(20) NOT NULL DEFAULT 'pending'
    )
  `)

  // Seed the 5 required packages (mirrors seed.js)
  db.public.none(`
    INSERT INTO groups (name, odds_type, plan_type, price, is_special, is_active, special_price, special_odds)
    VALUES
      ('Daily Odd 5',            '5',       'daily',   15000, false, true,  null, null),
      ('Weekly Odd 5',           '5',       'weekly',  60000, false, true,  null, null),
      ('Big Staker Weekly Odd 2','2',       'weekly',  50000, false, true,  null, null),
      ('Monthly Odd 1.5',        '1.5',     'monthly', 45000, false, true,  null, null),
      ('Special Odds',           'special', 'special', 0,     true,  false, null, null)
  `)

  db.public.none(`INSERT INTO admin_users (id, username, password_hash) VALUES (1, 'admin', 'hash')`)

  const PgPool = db.adapters.createPg().Pool
  return new PgPool()
}

jest.mock('../db', () => ({ get pool () { return global.__groupTestPool } }))

let request
let adminToken

beforeAll(() => {
  global.__groupTestPool = buildPool()
  const app = require('../app')
  request    = require('supertest')(app)
  adminToken = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
})

afterAll(async () => {
  if (global.__groupTestPool) await global.__groupTestPool.end()
})

function authHeader () {
  return { Authorization: `Bearer ${adminToken}` }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/groups — Public listing
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/groups — public', () => {
  test('returns 200 with an array', async () => {
    const res = await request.get('/api/groups')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('hides inactive regular groups', async () => {
    // Mark "Daily Odd 5" inactive for this test
    await global.__groupTestPool.query(`UPDATE groups SET is_active = false WHERE name = 'Daily Odd 5'`)

    const res = await request.get('/api/groups')
    expect(res.status).toBe(200)
    const names = res.body.map(g => g.name)
    expect(names).not.toContain('Daily Odd 5')

    // Restore
    await global.__groupTestPool.query(`UPDATE groups SET is_active = true WHERE name = 'Daily Odd 5'`)
  })

  test('hides Special Odds when special_price is null', async () => {
    // Ensure special group has no price
    await global.__groupTestPool.query(`UPDATE groups SET special_price = null, is_active = false WHERE name = 'Special Odds'`)

    const res = await request.get('/api/groups')
    expect(res.status).toBe(200)
    const names = res.body.map(g => g.name)
    expect(names).not.toContain('Special Odds')
  })

  test('shows Special Odds when admin has set a special_price', async () => {
    await global.__groupTestPool.query(`UPDATE groups SET special_price = 30000, is_active = true WHERE name = 'Special Odds'`)

    const res = await request.get('/api/groups')
    expect(res.status).toBe(200)
    const special = res.body.find(g => g.isSpecial)
    expect(special).toBeDefined()
    expect(special.specialPrice).toBe(30000)

    // Reset
    await global.__groupTestPool.query(`UPDATE groups SET special_price = null, is_active = false WHERE name = 'Special Odds'`)
  })

  test('response items have expected fields', async () => {
    const res = await request.get('/api/groups')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    const item = res.body[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('name')
    expect(item).toHaveProperty('oddsType')
    expect(item).toHaveProperty('planType')
    expect(item).toHaveProperty('price')
    expect(item).toHaveProperty('isSpecial')
    expect(item).toHaveProperty('isActive')
    expect(item).toHaveProperty('specialPrice')
  })

  // ── Verify each required package ─────────────────────────────────────────

  test.each([
    { name: 'Daily Odd 5',            oddsType: '5',       planType: 'daily',   price: 15000 },
    { name: 'Weekly Odd 5',           oddsType: '5',       planType: 'weekly',  price: 60000 },
    { name: 'Big Staker Weekly Odd 2', oddsType: '2',      planType: 'weekly',  price: 50000 },
    { name: 'Monthly Odd 1.5',        oddsType: '1.5',     planType: 'monthly', price: 45000 },
  ])('package "$name" exists and is visible with correct price $price', async ({ name, oddsType, planType, price }) => {
    const res = await request.get('/api/groups')
    expect(res.status).toBe(200)

    const pkg = res.body.find(g => g.name === name)
    expect(pkg).toBeDefined()
    expect(pkg.oddsType).toBe(oddsType)
    expect(pkg.planType).toBe(planType)
    expect(pkg.price).toBe(price)
    expect(pkg.isActive).toBe(true)
    expect(pkg.isSpecial).toBe(false)
  })

  test('Special Odds package exists in the DB as a special group', async () => {
    const { rows } = await global.__groupTestPool.query(`SELECT * FROM groups WHERE name = 'Special Odds'`)
    expect(rows.length).toBe(1)
    expect(rows[0].is_special).toBe(true)
    expect(rows[0].odds_type).toBe('special')
    expect(rows[0].plan_type).toBe('special')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// GET /api/groups/admin — Admin listing
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/groups/admin — admin', () => {
  test('returns all groups including inactive and unpriced special', async () => {
    const res = await request.get('/api/groups/admin').set(authHeader())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)

    const names = res.body.map(g => g.name)
    expect(names).toContain('Special Odds')  // hidden from public but visible to admin
    expect(names).toContain('Daily Odd 5')
    expect(names).toContain('Weekly Odd 5')
    expect(names).toContain('Big Staker Weekly Odd 2')
    expect(names).toContain('Monthly Odd 1.5')
  })

  test('returns 401 without auth', async () => {
    const res = await request.get('/api/groups/admin')
    expect(res.status).toBe(401)
  })

  test('returns 401 with invalid token', async () => {
    const res = await request.get('/api/groups/admin').set({ Authorization: 'Bearer bad-token' })
    expect(res.status).toBe(401)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/groups/:id — Admin update
// ════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/groups/:id — admin update', () => {
  let weeklyOdd5Id

  beforeAll(async () => {
    const { rows } = await global.__groupTestPool.query(`SELECT id FROM groups WHERE name = 'Weekly Odd 5'`)
    weeklyOdd5Id = rows[0].id
  })

  test('admin can update a group price', async () => {
    const res = await request.patch(`/api/groups/${weeklyOdd5Id}`)
      .set(authHeader())
      .send({ price: 65000 })

    expect(res.status).toBe(200)
    expect(res.body.price).toBe(65000)

    // Restore
    await global.__groupTestPool.query(`UPDATE groups SET price = 60000 WHERE id = ${weeklyOdd5Id}`)
  })

  test('admin can activate Special Odds with a price and odds', async () => {
    const { rows } = await global.__groupTestPool.query(`SELECT id FROM groups WHERE name = 'Special Odds'`)
    const specialId = rows[0].id

    const res = await request.patch(`/api/groups/${specialId}`)
      .set(authHeader())
      .send({ isActive: true, specialPrice: 40000, specialOdds: '4.0' })

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(true)
    expect(res.body.specialPrice).toBe(40000)
    expect(res.body.specialOdds ?? res.body.special_odds).toBeDefined()

    // Now it should appear in public listing
    const pub = await request.get('/api/groups')
    const found = pub.body.find(g => g.isSpecial)
    expect(found).toBeDefined()
    expect(found.specialPrice).toBe(40000)

    // Reset
    await global.__groupTestPool.query(`UPDATE groups SET is_active = false, special_price = null WHERE id = ${specialId}`)
  })

  test('admin can reset Special Odds (hide from users)', async () => {
    const { rows } = await global.__groupTestPool.query(`SELECT id FROM groups WHERE name = 'Special Odds'`)
    const specialId = rows[0].id

    // Activate first
    await global.__groupTestPool.query(`UPDATE groups SET is_active = true, special_price = 25000 WHERE id = ${specialId}`)

    // Now reset
    const res = await request.patch(`/api/groups/${specialId}`)
      .set(authHeader())
      .send({ isActive: false, specialPrice: null })

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(false)

    // Should be hidden from public again
    const pub = await request.get('/api/groups')
    const found = pub.body.find(g => g.isSpecial)
    expect(found).toBeUndefined()
  })

  test('admin can deactivate a package after its deadline has passed', async () => {
    await global.__groupTestPool.query(
      `UPDATE groups SET is_active = true, subscription_deadline = '2000-01-01T12:00' WHERE id = $1`,
      [weeklyOdd5Id]
    )

    const res = await request.patch(`/api/groups/${weeklyOdd5Id}`)
      .set(authHeader())
      .send({ isActive: false })

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(false)
    expect(res.body.subscriptionDeadline).toBe('2000-01-01T12:00')

    await global.__groupTestPool.query(
      `UPDATE groups SET is_active = true, subscription_deadline = NULL WHERE id = $1`,
      [weeklyOdd5Id]
    )
  })

  test('admin cannot activate a package with a past deadline', async () => {
    await global.__groupTestPool.query(
      `UPDATE groups SET is_active = false, subscription_deadline = '2000-01-01T12:00' WHERE id = $1`,
      [weeklyOdd5Id]
    )

    const res = await request.patch(`/api/groups/${weeklyOdd5Id}`)
      .set(authHeader())
      .send({ isActive: true })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/past deadlines/)

    await global.__groupTestPool.query(
      `UPDATE groups SET is_active = true, subscription_deadline = NULL WHERE id = $1`,
      [weeklyOdd5Id]
    )
  })

  test('admin can update betslip link and code', async () => {
    const res = await request.patch(`/api/groups/${weeklyOdd5Id}`)
      .set(authHeader())
      .send({ betslipLink: 'https://bet.example.com/abc', betslipCode: 'SLIP-XYZ' })

    expect(res.status).toBe(200)
    expect(res.body.betslipLink ?? res.body.betslip_link).toBe('https://bet.example.com/abc')
  })

  test('returns 404 for a non-existent group', async () => {
    const res = await request.patch('/api/groups/99999')
      .set(authHeader())
      .send({ price: 1000 })

    expect(res.status).toBe(404)
  })

  test('returns 400 when no fields to update', async () => {
    const res = await request.patch(`/api/groups/${weeklyOdd5Id}`)
      .set(authHeader())
      .send({})

    expect(res.status).toBe(400)
  })

  test('returns 401 without auth', async () => {
    const res = await request.patch(`/api/groups/${weeklyOdd5Id}`).send({ price: 1 })
    expect(res.status).toBe(401)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/groups/:id — Admin delete
// ════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/groups/:id — admin delete', () => {
  test('admin can delete a group referenced by subscriptions', async () => {
    const { rows: [created] } = await global.__groupTestPool.query(`
      INSERT INTO groups (name, odds_type, plan_type, price)
      VALUES ('Temporary VIP', '2', 'daily', 5000)
      RETURNING id
    `)
    await global.__groupTestPool.query(
      `INSERT INTO subscriptions (group_id, status) VALUES ($1, 'pending')`,
      [created.id]
    )

    const res = await request.delete(`/api/groups/${created.id}`).set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.detachedSubscriptions).toBe(1)
    expect(res.body.message).toContain('linked subscription')

    const { rows: groupRows } = await global.__groupTestPool.query('SELECT id FROM groups WHERE id = $1', [created.id])
    expect(groupRows.length).toBe(0)

    const { rows: subRows } = await global.__groupTestPool.query('SELECT group_id FROM subscriptions WHERE status = $1', ['pending'])
    expect(subRows.some(s => s.group_id === created.id)).toBe(false)
  })

  test('returns 404 for a non-existent group', async () => {
    const res = await request.delete('/api/groups/99999').set(authHeader())
    expect(res.status).toBe(404)
  })

  test('returns 401 without auth', async () => {
    const res = await request.delete('/api/groups/1')
    expect(res.status).toBe(401)
  })
})
