const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const auth = require('../middleware/authMiddleware')
const {
  amount,
  getCommissionRate,
  isCommissionEnabled
} = require('../utils/commission')

function requireDeveloper(req, res, next) {
  const role = req.admin?.role || (req.admin?.username === 'almaxdev' ? 'developer' : 'owner')
  if (role !== 'developer') return res.status(403).json({ error: 'Developer access required' })
  next()
}

function dateValue(value) {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

function dayKey(value) {
  const d = dateValue(value) || new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day}`
}

function sum(rows, selector) {
  return rows.reduce((total, row) => total + amount(selector(row)), 0)
}

function countBy(rows, selector) {
  return rows.reduce((acc, row) => {
    const key = selector(row) || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function sumBy(rows, keySelector, valueSelector) {
  return rows.reduce((acc, row) => {
    const key = keySelector(row) || 'unknown'
    acc[key] = (acc[key] || 0) + amount(valueSelector(row))
    return acc
  }, {})
}

function statusTotals(rows) {
  const totals = {
    confirmed: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 }
  }
  rows.forEach(row => {
    const status = row.status || 'unknown'
    if (!totals[status]) totals[status] = { count: 0, amount: 0 }
    totals[status].count += 1
    totals[status].amount += amount(row.amount)
  })
  return totals
}

function lastThirtyDaySeries(now) {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push({ date: dayKey(d), amount: 0, count: 0 })
  }
  return days
}

function commissionStatus(row) {
  const status = String(row.agent_commission_status || 'pending').toLowerCase()
  if (['completed', 'processing', 'pending'].includes(status)) return status
  return 'pending'
}

router.get('/developer', auth, requireDeveloper, async (_req, res) => {
  try {
    const [
      { rows: paymentRows },
      { rows: userRows },
      { rows: subscriptionRows }
    ] = await Promise.all([
      pool.query('SELECT * FROM payments ORDER BY created_at DESC'),
      pool.query('SELECT * FROM users ORDER BY created_at DESC'),
      pool.query('SELECT * FROM subscriptions ORDER BY created_at DESC')
    ])

    const now = new Date()
    const today = dayKey(now)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 6)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const confirmedPayments = paymentRows.filter(p => p.status === 'confirmed')
    const revenueToday = confirmedPayments.filter(p => dayKey(p.created_at) === today)
    const revenueThisWeek = confirmedPayments.filter(p => {
      const d = dateValue(p.created_at)
      return d && d >= weekStart
    })
    const revenueThisMonth = confirmedPayments.filter(p => {
      const d = dateValue(p.created_at)
      return d && d >= monthStart
    })

    const revenueSeries = lastThirtyDaySeries(now)
    const revenueByDate = Object.fromEntries(revenueSeries.map(point => [point.date, point]))
    confirmedPayments.forEach(payment => {
      const key = dayKey(payment.created_at)
      if (revenueByDate[key]) revenueByDate[key].amount += amount(payment.amount)
    })

    const signupSeries = lastThirtyDaySeries(now)
    const signupsByDate = Object.fromEntries(signupSeries.map(point => [point.date, point]))
    userRows.forEach(user => {
      const key = dayKey(user.created_at)
      if (signupsByDate[key]) signupsByDate[key].count += 1
    })

    const enabled = isCommissionEnabled()
    const commissionRate = getCommissionRate()
    const trackedCommissionRows = enabled
      ? paymentRows.filter(row =>
          row.status === 'confirmed' &&
          row.agent_commission_amount !== null &&
          row.agent_commission_amount !== undefined &&
          amount(row.agent_commission_amount) > 0 &&
          String(row.agent_commission_status || '').toLowerCase() !== 'failed'
        )
      : []
    const trackedPaymentsTotal = sum(trackedCommissionRows, p => p.amount)
    const confirmedCommission = sum(trackedCommissionRows, p => p.agent_commission_amount)
    const completedCommissionRows = trackedCommissionRows.filter(row => commissionStatus(row) === 'completed')
    const processingCommissionRows = trackedCommissionRows.filter(row => commissionStatus(row) === 'processing')
    const pendingCommissionRows = trackedCommissionRows.filter(row => commissionStatus(row) === 'pending')

    const activeSubscriptions = subscriptionRows.filter(s => s.status === 'active')

    const analytics = {
      generated_at: now.toISOString(),
      payments: {
        total_count: paymentRows.length,
        pending_count: paymentRows.filter(p => p.status === 'pending').length,
        confirmed_count: confirmedPayments.length,
        failed_count: paymentRows.filter(p => p.status === 'failed').length
      },
      finance: {
        total_revenue: sum(confirmedPayments, p => p.amount),
        revenue_today: sum(revenueToday, p => p.amount),
        revenue_this_week: sum(revenueThisWeek, p => p.amount),
        revenue_this_month: sum(revenueThisMonth, p => p.amount),
        by_status: statusTotals(paymentRows),
        by_plan: sumBy(confirmedPayments, p => p.plan_type, p => p.amount),
        by_method: sumBy(confirmedPayments, p => p.payment_method, p => p.amount)
      },
      commission: {
        enabled,
        ratio: commissionRate,
        gross_ratio: commissionRate,
        tracked_payments_total: trackedPaymentsTotal,
        total_earned: confirmedCommission,
        gross_total_earned: confirmedCommission,
        total_paid: sum(completedCommissionRows, p => p.agent_commission_amount),
        outstanding: sum([...pendingCommissionRows, ...processingCommissionRows], p => p.agent_commission_amount),
        by_status: {
          completed: {
            count: completedCommissionRows.length,
            amount: sum(completedCommissionRows, p => p.agent_commission_amount)
          },
          processing: {
            count: processingCommissionRows.length,
            amount: sum(processingCommissionRows, p => p.agent_commission_amount)
          },
          pending: {
            count: pendingCommissionRows.length,
            amount: sum(pendingCommissionRows, p => p.agent_commission_amount)
          },
          failed: { count: 0, amount: 0 }
        },
        by_plan: sumBy(trackedCommissionRows, p => p.plan_type, p => p.agent_commission_amount),
        by_method: sumBy(trackedCommissionRows, p => p.payment_method, p => p.agent_commission_amount),
        recent: trackedCommissionRows.slice(0, 25).map(row => ({
          id: row.id,
          created_at: row.created_at,
          plan_type: row.plan_type,
          payment_method: row.payment_method,
          amount: amount(row.amount),
          agent_commission_amount: amount(row.agent_commission_amount),
          agent_commission_status: commissionStatus(row)
        }))
      },
      users: {
        total: userRows.length,
        new_today: userRows.filter(u => dayKey(u.created_at) === today).length,
        new_this_week: userRows.filter(u => {
          const d = dateValue(u.created_at)
          return d && d >= weekStart
        }).length,
        new_this_month: userRows.filter(u => {
          const d = dateValue(u.created_at)
          return d && d >= monthStart
        }).length,
        blacklisted: userRows.filter(u => u.blacklisted === true).length,
        warned: userRows.filter(u => u.scam_warning === true).length
      },
      subscriptions: {
        active_total: activeSubscriptions.length,
        by_status: countBy(subscriptionRows, s => s.status),
        active_by_plan: countBy(activeSubscriptions, s => s.plan_type)
      },
      charts: {
        revenue: revenueSeries,
        signups: signupSeries
      }
    }

    res.json(analytics)
  } catch (err) {
    console.error('Developer analytics error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
