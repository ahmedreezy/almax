const DEFAULT_COMMISSION_RATE = 0.10

function parseBooleanEnv(value, fallback = true) {
  if (value === undefined) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function parseRate(value, fallback = DEFAULT_COMMISSION_RATE) {
  if (value === undefined || value === '') return fallback
  const parsed = Number(String(value).replace('%', '').trim())
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed > 1 ? parsed / 100 : parsed
}

function isCommissionEnabled() {
  return parseBooleanEnv(process.env.JPESA_AGENT_COMMISSION_ENABLED, true)
}

function getCommissionRate() {
  const raw = process.env.JPESA_AGENT_COMMISSION_RATE ?? process.env.JPESA_AGENT_COMMISSION_GROSS_RATE
  return parseRate(raw, DEFAULT_COMMISSION_RATE)
}

function amount(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function commissionAmount(value) {
  if (!isCommissionEnabled()) return 0
  return Math.round(amount(value) * getCommissionRate())
}

async function trackCommissionForSubscription(pool, subscriptionId) {
  if (!isCommissionEnabled()) return

  await pool.query(`
    UPDATE payments
    SET agent_commission_amount = COALESCE(agent_commission_amount, ROUND(amount * $1::numeric)),
        agent_commission_status = CASE
          WHEN agent_commission_status IN ('completed', 'processing') THEN agent_commission_status
          ELSE 'pending'
        END,
        agent_commission_tracked_at = COALESCE(agent_commission_tracked_at, NOW())
    WHERE subscription_id = $2
      AND status = 'confirmed'
  `, [getCommissionRate(), subscriptionId])
}

module.exports = {
  DEFAULT_COMMISSION_RATE,
  amount,
  commissionAmount,
  getCommissionRate,
  isCommissionEnabled,
  trackCommissionForSubscription
}
