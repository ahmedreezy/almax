const isoDay = daysAgo => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

const isoTime = (daysAgo, hour = 10) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 18, 0, 0)
  return date.toISOString()
}

const revenue = [82000, 144000, 97000, 186000, 121000, 234000, 178000, 205000, 262000, 191000, 316000, 284000, 339000, 248000]
const signups = [8, 13, 11, 17, 14, 22, 18, 25, 21, 29, 24, 31, 27, 36]

const paymentStatuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'confirmed', 'failed']
const paymentMethods = ['mtn', 'airtel', 'mtn', 'airtel']
const plans = ['daily', 'weekly', 'monthly']

const payments = Array.from({ length: 34 }, (_, index) => {
  const status = paymentStatuses[index % paymentStatuses.length]
  const createdAt = isoTime(index, 16 - (index % 7))
  return {
    id: 4206 - index,
    amount: [10000, 25000, 50000][index % 3],
    plan_type: plans[index % plans.length],
    payment_method: paymentMethods[index % paymentMethods.length],
    provider: index % 4 === 0 ? 'relworx' : 'jpesa',
    phone: `******${String(7011 + index).slice(-4)}`,
    status,
    payment_reference: `ALX-${String(87420 - index).padStart(6, '0')}`,
    transaction_id: `TX-${String(634810 + index)}`,
    created_at: createdAt,
    confirmed_at: status === 'confirmed' ? createdAt : null,
    failed_at: status === 'failed' ? createdAt : null
  }
})

const commissionStatuses = ['completed', 'completed', 'pending', 'processing', 'failed']
const commissions = payments.slice(0, 30).map((payment, index) => ({
  id: payment.id,
  amount: payment.amount,
  plan_type: payment.plan_type,
  payment_method: payment.payment_method,
  agent_commission_amount: payment.amount * 0.2,
  agent_commission_ratio: 0.2,
  agent_commission_status: commissionStatuses[index % commissionStatuses.length],
  agent_commission_reference: `COM-${payment.id}`,
  agent_commission_processed_at: payment.confirmed_at,
  agent_commission_error: index % commissionStatuses.length === 4 ? 'Provider balance was temporarily unavailable.' : null,
  created_at: payment.created_at
}))

export const previewAnalytics = {
  finance: {
    attempted_count: 184,
    attempted_amount: 6425000,
    total_revenue: 5875000,
    revenue_today: 316000,
    revenue_this_week: 1284000,
    revenue_this_month: 4127000,
    confirmation_rate: 91.8,
    by_status: {
      confirmed: { count: 169, amount: 5875000 },
      pending: { count: 6, amount: 185000 },
      failed: { count: 9, amount: 365000 }
    },
    today: {
      confirmed_count: 13, confirmed_amount: 316000,
      attempted_count: 15, attempted_amount: 366000,
      pending_count: 1, pending_amount: 25000,
      failed_count: 1, failed_amount: 25000
    },
    by_plan: { daily: 1845000, weekly: 2410000, monthly: 1620000 },
    by_method: { mtn: 3365000, airtel: 2510000 },
    by_provider: { jpesa: { count: 124, amount: 4215000 }, relworx: { count: 45, amount: 1660000 } },
    unclassified_count: 0,
    unclassified_amount: 0,
    reconciliation_difference: 0,
    failures_by_category: { provider: { count: 6, amount: 240000 }, customer: { count: 3, amount: 125000 } },
    audit: {
      as_of: new Date().toISOString(), timezone: 'Africa/Kampala',
      ledger_count: 184, ledger_amount: 6425000,
      status_count_difference: 0, status_amount_difference: 0,
      confirmed_missing_timestamp_count: 0, confirmed_missing_transaction_count: 0,
      preserved_without_subscription_count: 2, preserved_without_user_count: 0
    }
  },
  commission: {
    enabled: true,
    ratio: 0.2,
    wallet_account: '+256 700 000 222',
    total_earned: 1175000,
    overall_total: 1175000,
    total_paid: 1015000,
    wallet_received: 1015000,
    total_withdrawn: 475000,
    available: 540000,
    current_total: 540000,
    outstanding: 160000,
    tracked_payment_count: 169,
    tracked_payment_revenue: 5875000,
    confirmed_payment_count: 169,
    confirmed_payment_revenue: 5875000,
    untracked_payment_count: 0,
    untracked_payment_revenue: 0,
    reconciliation_difference: 0,
    by_status: {
      completed: { count: 142, amount: 1015000 },
      processing: { count: 8, amount: 65000 },
      accrued: { count: 6, amount: 45000 },
      pending: { count: 9, amount: 72000 },
      failed: { count: 4, amount: 38000 }
    },
    by_plan: { daily: 369000, weekly: 482000, monthly: 324000 },
    by_method: { mtn: 673000, airtel: 502000 },
    withdrawals: [
      { id: 3, amount: 225000, reference: 'November settlement', withdrawn_at: isoTime(3) },
      { id: 2, amount: 150000, reference: 'October settlement', withdrawn_at: isoTime(18) },
      { id: 1, amount: 100000, reference: 'Initial settlement', withdrawn_at: isoTime(34) }
    ]
  },
  users: { total: 2847, new_today: 18, new_this_week: 96, new_this_month: 318 },
  subscriptions: {
    active_total: 734,
    by_status: { active: 734, pending: 42, expired: 1186, cancelled: 64 },
    active_by_plan: { daily: 286, weekly: 302, monthly: 146 }
  },
  payments: { pending_count: 6 },
  charts: {
    revenue: revenue.map((amount, index) => ({ date: isoDay(13 - index), amount })),
    signups: signups.map((count, index) => ({ date: isoDay(13 - index), count }))
  }
}

const previewSupport = {
  period: { days: 30, from: isoDay(29), to: isoDay(0) },
  summary: { total_conversations: 146, feedback_signals: 38, escalated: 7, resolved: 121, resolution_rate: 82.9, negative_rate: 13.7 },
  brief: {
    headline: 'Payment confirmations are healthy; package clarity is the main opportunity.',
    highlights: ['Faster MTN confirmation noted', 'Weekly package questions increased', 'Seven conversations need follow-up']
  },
  by_category: {
    payment: { label: 'Payments', count: 52 },
    subscription: { label: 'Subscriptions', count: 34 },
    account: { label: 'Accounts', count: 18 },
    prediction_content: { label: 'Prediction content', count: 21 },
    technical: { label: 'Technical issues', count: 12 },
    suggestion: { label: 'Suggestions', count: 9 }
  },
  by_sentiment: { positive: 78, neutral: 48, frustrated: 15, angry: 5 },
  themes: [
    { category: 'subscription', label: 'Package clarity', count: 34, negative: 8, escalated: 2, recommended_action: 'Clarify renewal dates and package duration before payment.' },
    { category: 'payment', label: 'Payment confirmation', count: 29, negative: 5, escalated: 3, recommended_action: 'Keep confirmation status visible while providers process payment.' },
    { category: 'prediction_content', label: 'Prediction timing', count: 21, negative: 4, escalated: 1, recommended_action: 'Show the next publishing time near each package.' }
  ],
  trend: Array.from({ length: 14 }, (_, index) => ({ date: isoDay(13 - index), conversations: [4, 7, 5, 9, 8, 13, 10, 14, 11, 16, 12, 15, 13, 18][index] })),
  recent_feedback: [
    { reference: 'SUP-2048', category_label: 'Subscriptions', sentiment: 'neutral', priority: 'normal', status: 'resolved', summary: 'Customer asked when a weekly package expires after activation.', last_message_at: isoTime(0) },
    { reference: 'SUP-2041', category_label: 'Payments', sentiment: 'frustrated', priority: 'high', status: 'waiting_human', summary: 'MTN payment took longer than expected to confirm.', last_message_at: isoTime(1) },
    { reference: 'SUP-2033', category_label: 'Suggestions', sentiment: 'positive', priority: 'normal', status: 'resolved', summary: 'Customer requested clearer publishing times for daily predictions.', last_message_at: isoTime(2) }
  ]
}

const previewGateway = {
  activeProvider: 'relworx',
  lastChangedAt: isoTime(2),
  lastChangedBy: 'almaxdev',
  providers: {
    jpesa: { name: 'JPesa', configured: true, ready: true, message: 'Configuration is valid and ready for collections.', capabilities: { collections: true, payouts: true }, missing: [] },
    relworx: { name: 'Relworx', configured: true, ready: true, message: 'Live collections and developer payouts are available.', capabilities: { collections: true, payouts: true }, missing: [] }
  }
}

const previewWallet = {
  execution_mode: 'immediate',
  destination_configured: true,
  minimum_payout: 500,
  wallet: { today_credited: 63200, credited: 1175000, available: 540000, reserved: 85000 },
  requests: [
    { id: 11, amount: 125000, status: 'completed', reference: 'PAY-8821', destination: '+256 *** 0222', created_at: isoTime(2), message: 'Paid through Relworx.' },
    { id: 12, amount: 85000, status: 'pending', reference: 'PAY-8840', destination: '+256 *** 0222', created_at: isoTime(0), message: 'Reserved for processing.' },
    { id: 10, amount: 95000, status: 'completed', reference: 'PAY-8796', destination: '+256 *** 0222', created_at: isoTime(7), message: 'Paid through Relworx.' },
    { id: 9, amount: 60000, status: 'failed', reference: 'PAY-8754', destination: '+256 *** 0222', created_at: isoTime(12), message: 'Provider temporarily declined the payout.' },
    { id: 8, amount: 150000, status: 'completed', reference: 'PAY-8702', destination: '+256 *** 0222', created_at: isoTime(18), message: 'Paid through Relworx.' }
  ]
}

const paged = (rows, cursor) => {
  const start = Math.max(0, Number(cursor || 0))
  const data = rows.slice(start, start + 10)
  const next = start + data.length
  return {
    data,
    meta: { total: rows.length, count: data.length, next_cursor: next < rows.length ? String(next) : null, has_more: next < rows.length }
  }
}

export const createDevPreviewResponse = config => {
  const url = String(config.url || '').split('?')[0]
  const cursor = config.params?.cursor
  let data = {}

  if (url.endsWith('/api/analytics/developer/payments')) data = paged(payments, cursor)
  else if (url.endsWith('/api/analytics/developer/commission-transactions')) data = paged(commissions, cursor)
  else if (url.endsWith('/api/analytics/developer/support-insights')) data = previewSupport
  else if (url.endsWith('/api/analytics/developer')) data = previewAnalytics
  else if (url.endsWith('/api/developer/payment-gateway')) data = previewGateway
  else if (url.includes('/api/developer/payment-gateway/') && url.endsWith('/check')) data = { configured: true, ready: true, message: 'Preview connection is healthy.' }
  else if (url.endsWith('/api/developer/wallet')) data = previewWallet
  else if (url.includes('/retry-commission')) data = { success: true, message: 'Preview commission marked as completed.' }
  else if (url.includes('/payout-requests')) data = { message: 'Preview request recorded locally.' }

  return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: null })
}
