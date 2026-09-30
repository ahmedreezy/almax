'use strict'

/**
 * Unit tests for POST /api/users (register) and POST /api/users/login
 *
 * Strategy: jest.mock('../db') replaces the real pg pool with a pg-mem
 * in-memory pool so no real database connection is needed.
 * The users table is created fresh before each test suite.
 */

process.env.JWT_SECRET = 'test-secret-key'

const { newDb } = require('pg-mem')
const jwt = require('jsonwebtoken')

// ── Build an in-memory pg pool ──────────────────────────────────────────────
function buildMemPool() {
  const db = newDb()
  db.public.none(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(200) NOT NULL,
      phone         VARCHAR(30) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      security_answer_hash VARCHAR(255),
      scam_warning  BOOLEAN NOT NULL DEFAULT FALSE,
      blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
      blacklisted_at TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Return an object that matches the { pool } export of ../db
  return db.adapters.createPg().Pool
}

// ── Mock ../db before any routes are required ───────────────────────────────
let PoolClass
jest.mock('../db', () => {
  // The factory runs once; we expose a getter so tests can swap the pool
  return { get pool() { return global.__testPool } }
})

// ── Lazy-require app AFTER mock is registered ────────────────────────────────
let request
let app
const ADMIN_TOKEN = jwt.sign({ id: 1, username: 'admin', role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' })

beforeAll(() => {
  const PoolCtor = buildMemPool()
  global.__testPool = new PoolCtor()
  // Now it's safe to require the app
  app     = require('../app')
  request = require('supertest')(app)
})

afterAll(async () => {
  await global.__testPool.end()
})

// ── Helper: register a baseline user ─────────────────────────────────────────
async function registerBase() {
  return request
    .post('/api/users')
    .send({ username: 'Alice', phone: '0700000001', password: 'secret123', securityAnswer: 'blue' })
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRATION  POST /api/users
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/users — registration', () => {

  test('201: registers with valid username, phone, password', async () => {
    const res = await request
      .post('/api/users')
      .send({ username: 'Bob', phone: '0700000010', password: 'pass1234', securityAnswer: 'blue' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      username: 'Bob',
      phone:    '0700000010',
    })
    expect(typeof res.body.id).toBe('number')
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.split('.').length).toBe(3)       // valid JWT shape
    expect(res.body).not.toHaveProperty('password_hash')   // never exposed
  })

  test('400: missing username', async () => {
    const res = await request
      .post('/api/users')
      .send({ phone: '0700000011', password: 'pass1234', securityAnswer: 'blue' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  test('400: missing phone', async () => {
    const res = await request
      .post('/api/users')
      .send({ username: 'Carol', password: 'pass1234', securityAnswer: 'blue' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  test('400: missing password', async () => {
    const res = await request
      .post('/api/users')
      .send({ username: 'Carol', phone: '0700000012', securityAnswer: 'blue' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  test('400: password shorter than 6 characters', async () => {
    const res = await request
      .post('/api/users')
      .send({ username: 'Dave', phone: '0700000013', password: 'abc', securityAnswer: 'blue' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/6 characters/)
  })

  test('409: duplicate phone number', async () => {
    await registerBase()
    const res = await request
      .post('/api/users')
      .send({ username: 'Alice2', phone: '0700000001', password: 'other123', securityAnswer: 'blue' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already registered/)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ADMIN FLAGS  PATCH /api/users/:id
// ════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/users/:id — warning and blacklist flags', () => {
  let aliceId

  beforeAll(async () => {
    const { rows } = await global.__testPool.query(`SELECT id FROM users WHERE phone = $1`, ['0700000001'])
    aliceId = rows[0].id
  })

  test('admin can add and clear the scam warning badge', async () => {
    const warned = await request.patch(`/api/users/${aliceId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ scam_warning: true })

    expect(warned.status).toBe(200)
    expect(warned.body.scamWarning).toBe(true)

    const cleared = await request.patch(`/api/users/${aliceId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ scam_warning: false })

    expect(cleared.status).toBe(200)
    expect(cleared.body.scamWarning).toBe(false)
  })

  test('blacklist blocks login and can be reversed', async () => {
    const blocked = await request.patch(`/api/users/${aliceId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ blacklisted: true })

    expect(blocked.status).toBe(200)
    expect(blocked.body.blacklisted).toBe(true)

    const deniedLogin = await request.post('/api/users/login')
      .send({ phone: '0700000001', password: 'secret123' })

    expect(deniedLogin.status).toBe(403)
    expect(deniedLogin.body.error).toMatch(/blacklisted/)

    const unblocked = await request.patch(`/api/users/${aliceId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ blacklisted: false })

    expect(unblocked.status).toBe(200)
    expect(unblocked.body.blacklisted).toBe(false)

    const allowedLogin = await request.post('/api/users/login')
      .send({ phone: '0700000001', password: 'secret123' })

    expect(allowedLogin.status).toBe(200)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// LOGIN  POST /api/users/login
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/users/login', () => {

  // Ensure the base user exists before login tests
  beforeAll(async () => { await registerBase() })

  test('200: login with correct phone and password', async () => {
    const res = await request
      .post('/api/users/login')
      .send({ phone: '0700000001', password: 'secret123' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      username: 'Alice',
      phone:    '0700000001',
    })
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.split('.').length).toBe(3)
    expect(res.body).not.toHaveProperty('password_hash')
  })

  test('401: wrong password', async () => {
    const res = await request
      .post('/api/users/login')
      .send({ phone: '0700000001', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Incorrect password/)
  })

  test('401: phone number not found', async () => {
    const res = await request
      .post('/api/users/login')
      .send({ phone: '0799999999', password: 'doesntmatter' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/not found/)
  })

  test('400: missing phone', async () => {
    const res = await request
      .post('/api/users/login')
      .send({ password: 'secret123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })

  test('400: missing password', async () => {
    const res = await request
      .post('/api/users/login')
      .send({ phone: '0700000001' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/)
  })
})
