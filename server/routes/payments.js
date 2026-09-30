const express  = require('express')
const router   = express.Router()
const { pool } = require('../db')
const auth     = require('../middleware/authMiddleware')
const { trackCommissionForSubscription } = require('../utils/commission')

function rowToPayment(row) {
  return {
    id:             row.id,
    subscriptionId: row.subscription_id,
    userId:         row.user_id,
    amount:         parseFloat(row.amount),
    planType:       row.plan_type,
    paymentMethod:  row.payment_method,
    phone:          row.phone,
    status:         row.status,
    createdAt:      row.created_at ? new Date(row.created_at).getTime() : null,
    // Payer info (joined from users)
    userName:       row.user_name  || null,
    userPhone:      row.user_phone || null,
    userEmail:      row.user_email || null,
    // Subscription proof (joined from subscriptions)
    proofUrl:         row.proof_url        || '',
    subStatus:        row.sub_status       || null,
    rejectionReason:  row.rejection_reason || '',
    betslipLink:      row.betslip_link     || '',
    betslipCode:      row.betslip_code     || '',
    expiresAt:        row.expires_at ? new Date(row.expires_at).getTime() : null
  }
}

function normalizeProviderStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  if (['approved', 'approve', 'success', 'successful', 'completed', 'ok', 'paid'].includes(value)) return 'approved'
  if (['failed', 'failure', 'declined', 'rejected', 'cancelled', 'canceled', 'error'].includes(value)) return 'failed'
  if (['closed', 'close'].includes(value)) return 'closed'
  return 'unknown'
}

async function findPendingSubscription({ reference, txnId }) {
  const ref = String(reference || '').trim()
  const tid = String(txnId || '').trim()

  if (ref) {
    const { rows } = await pool.query(
      `SELECT s.*, g.plan_type AS g_plan_type, g.betslip_link AS g_betslip_link, g.betslip_code AS g_betslip_code
       FROM subscriptions s
       LEFT JOIN groups g ON g.id = s.group_id
       WHERE s.payment_reference = $1 AND s.status = 'pending'
       LIMIT 1`,
      [ref]
    )
    if (rows.length > 0) return rows[0]
  }

  if (tid) {
    const { rows } = await pool.query(
      `SELECT s.*, g.plan_type AS g_plan_type, g.betslip_link AS g_betslip_link, g.betslip_code AS g_betslip_code
       FROM subscriptions s
       LEFT JOIN groups g ON g.id = s.group_id
       LEFT JOIN payments p ON p.subscription_id = s.id
       WHERE s.status = 'pending'
         AND (p.transaction_id = $1 OR s.payment_reference = $1 OR p.payment_reference = $1)
       LIMIT 1`,
      [tid]
    )
    if (rows.length > 0) return rows[0]
  }

  return null
}

async function applyPaymentOutcome(sub, status, transactionId, source) {
  if (status === 'approved') {
    const intervalMap = { daily: '24 hours', weekly: '7 days', monthly: '30 days', special: '24 hours' }
    const interval    = intervalMap[sub.plan_type] || '24 hours'
    const betslipLink = sub.g_betslip_link || sub.betslip_link || ''
    const betslipCode = sub.g_betslip_code || sub.betslip_code || ''

    await pool.query(
      `UPDATE subscriptions SET
         status       = 'active',
         betslip_link = $1,
         betslip_code = $2,
         started_at   = NOW(),
         expires_at   = NOW() + $3::interval
       WHERE id = $4`,
      [betslipLink, betslipCode, interval, sub.id]
    )
    await pool.query(
      `UPDATE payments SET status = 'confirmed', transaction_id = $1
       WHERE subscription_id = $2 AND status = 'pending'`,
      [transactionId || '', sub.id]
    )
    await trackCommissionForSubscription(pool, sub.id)
    console.info(`[Webhook] Subscription ${sub.id} activated via ${source}. ref=${sub.payment_reference} txn=${transactionId || ''}`)
    return
  }

  if (status === 'failed') {
    await pool.query(`UPDATE subscriptions SET status = 'failed' WHERE id = $1`, [sub.id])
    await pool.query(
      `UPDATE payments SET status = 'failed', transaction_id = COALESCE(NULLIF($1, ''), transaction_id)
       WHERE subscription_id = $2`,
      [transactionId || '', sub.id]
    )
    console.info(`[Webhook] Payment failed via ${source} for subscription ${sub.id}. ref=${sub.payment_reference}`)
  }
}

async function handleCallbackOutcome({ reference, status, transactionId, source }, res) {
  const normalizedStatus = normalizeProviderStatus(status)
  const txnId = String(transactionId || '').trim()

  if (normalizedStatus === 'closed') {
    console.info(`[Webhook] Closed status ignored. source=${source} ref=${reference || ''} txn=${txnId}`)
    return res.status(200).send('OK')
  }

  if (!reference && !txnId) return res.status(200).send('OK')

  const sub = await findPendingSubscription({ reference, txnId })
  if (!sub) return res.status(200).send('OK')

  if (['approved', 'failed'].includes(normalizedStatus)) {
    await applyPaymentOutcome(sub, normalizedStatus, txnId, source)
  }

  return res.status(200).send('OK')
}

// GET mobile money webhook callback (no auth).
// Jpesa calls this URL with ?tid=<transaction id>&status=approved|failed|closed.
router.get('/webhook', async (req, res) => {
  try {
    const tid = req.query.tid || ''
    const status = req.query.status || ''

    if (!tid && !status) {
      return res.status(200).json({
        ok: true,
        endpoint: '/api/payments/webhook',
        message: 'Payment callback endpoint is reachable'
      })
    }

    return handleCallbackOutcome({
      reference: req.query.tx || req.query.reference || '',
      status,
      transactionId: tid,
      source: 'jpesa-get'
    }, res)
  } catch (err) {
    console.error('[Webhook] GET Error:', err)
    return res.status(200).send('OK')
  }
})

// GET all payments with payer info and proof (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.*,
        u.username   AS user_name,
        u.phone      AS user_phone,
        u.email      AS user_email,
        s.proof_url,
        s.status     AS sub_status,
        s.rejection_reason,
        s.betslip_link,
        s.betslip_code,
        s.expires_at
      FROM payments p
      LEFT JOIN users u        ON u.id = p.user_id
      LEFT JOIN subscriptions s ON s.id = p.subscription_id
      ORDER BY p.created_at DESC
    `)
    res.json(rows.map(rowToPayment))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET single payment (admin only)
router.get('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  try {
    const { rows } = await pool.query(`
      SELECT
        p.*,
        u.username   AS user_name,
        u.phone      AS user_phone,
        u.email      AS user_email,
        s.proof_url,
        s.status     AS sub_status,
        s.rejection_reason,
        s.betslip_link,
        s.betslip_code,
        s.expires_at
      FROM payments p
      LEFT JOIN users u        ON u.id = p.user_id
      LEFT JOIN subscriptions s ON s.id = p.subscription_id
      WHERE p.id = $1
    `, [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' })
    res.json(rowToPayment(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST mobile money webhook callback (no auth — must return 200 always)
// Jpesa sends an XML POST to this URL (Content-Type: text/xml)
router.post('/webhook', express.raw({ type: ['application/json', 'text/xml', 'application/xml', 'text/plain', '*/*'] }), async (req, res) => {
  try {
    const raw = typeof req.body === 'string' ? req.body : req.body.toString('utf8')

    // ── Parse payload — Jpesa sends XML, fall back to JSON ──────────────────
    let reference = '', status = '', transactionId = ''

    if (raw.trim().startsWith('<')) {
      // XML response from Jpesa — extract fields with simple regex (no extra deps)
      const tag = (name) => {
        const m = raw.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`, 'i'))
        return m ? m[1].trim() : ''
      }
      reference     = tag('tx') || tag('reference') || tag('order_id')
      status        = tag('status') || tag('payment_status')
      transactionId = tag('transaction_id') || tag('txn_id') || tag('mpesa_code') || tag('code')
    } else {
      // JSON fallback
      let payload = {}
      try { payload = JSON.parse(raw) } catch { return res.status(200).send('OK') }
      reference     = payload.tx || payload.reference || payload.external_reference || payload.order_id || ''
      status        = payload.status || payload.payment_status || ''
      transactionId = payload.transaction_id || payload.txn_id || payload.mpesa_code || ''
    }

    status = status.toLowerCase()
    if (!reference) return res.status(200).send('OK')

    // Find matching pending subscription
    const { rows } = await pool.query(
      `SELECT s.*, g.plan_type AS g_plan_type, g.betslip_link AS g_betslip_link, g.betslip_code AS g_betslip_code
       FROM subscriptions s
       LEFT JOIN groups g ON g.id = s.group_id
       WHERE s.payment_reference = $1 AND s.status = 'pending'
       LIMIT 1`,
      [reference]
    )

    if (rows.length === 0) return res.status(200).send('OK')
    const sub = rows[0]

    const isSuccess = ['success', 'successful', 'completed', 'paid'].includes(status)
    const isFailure = ['failed', 'failure', 'cancelled', 'rejected', 'declined'].includes(status)

    if (isSuccess) {
      const intervalMap = { daily: '24 hours', weekly: '7 days', monthly: '30 days', special: '24 hours' }
      const interval    = intervalMap[sub.plan_type] || '24 hours'
      const betslipLink = sub.g_betslip_link || sub.betslip_link || ''
      const betslipCode = sub.g_betslip_code || sub.betslip_code || ''

      await pool.query(
        `UPDATE subscriptions SET
           status       = 'active',
           betslip_link = $1,
           betslip_code = $2,
           started_at   = NOW(),
           expires_at   = NOW() + $3::interval
         WHERE id = $4`,
        [betslipLink, betslipCode, interval, sub.id]
      )
      await pool.query(
        `UPDATE payments SET status = 'confirmed', transaction_id = $1
         WHERE subscription_id = $2 AND status = 'pending'`,
        [transactionId, sub.id]
      )
      await trackCommissionForSubscription(pool, sub.id)
      console.info(`[Webhook] Subscription ${sub.id} activated. ref=${reference} txn=${transactionId}`)
    } else if (isFailure) {
      await pool.query(`UPDATE subscriptions SET status = 'failed' WHERE id = $1`, [sub.id])
      await pool.query(`UPDATE payments SET status = 'failed' WHERE subscription_id = $1`, [sub.id])
      console.info(`[Webhook] Payment failed for subscription ${sub.id}. ref=${reference}`)
    }

    res.status(200).send('OK')
  } catch (err) {
    console.error('[Webhook] Error:', err)
    res.status(200).send('OK')
  }
})

module.exports = router
