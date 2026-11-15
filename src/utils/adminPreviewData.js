const isoDate = daysAgo => { const date = new Date(); date.setDate(date.getDate() - daysAgo); date.setHours(10 + (daysAgo % 7), 18, 0, 0); return date.toISOString() }
const names = ['Amina Kato', 'Daniel Okello', 'Sarah Namusoke', 'Brian Mugisha', 'Ruth Atim', 'Joel Ssemanda', 'Patricia Nakiwala', 'Isaac Ouma', 'Lydia Akello', 'Moses Kiggundu']
const statuses = ['confirmed', 'confirmed', 'pending', 'confirmed', 'failed', 'confirmed']
const plans = ['daily', 'weekly', 'monthly', 'special']

const payments = Array.from({ length: 36 }, (_, index) => {
  const status = statuses[index % statuses.length]
  const createdAt = isoDate(Math.floor(index / 18))
  const plan = plans[index % plans.length]
  return {
    id: 940 - index,
    subscription_id: 1200 - index,
    user_id: 300 - index,
    amount: [10000, 25000, 50000, 18000][index % 4],
    status,
    plan_type: plan,
    payment_method: index % 2 ? 'airtel' : 'mtn',
    provider: index % 4 === 0 ? 'relworx' : 'jpesa',
    phone: `0701${String(820000 + index).slice(-6)}`,
    payment_reference: `ALX-${String(88210 - index)}`,
    transaction_id: status === 'confirmed' ? `TX-${String(102930 + index)}` : null,
    created_at: createdAt,
    confirmed_at: status === 'confirmed' ? createdAt : null,
    failed_at: status === 'failed' ? createdAt : null,
    failure_reason: status === 'failed' ? 'The mobile money provider declined the collection attempt.' : null,
    user: { id: 300 - index, username: names[index % names.length], phone: `0701${String(820000 + index).slice(-6)}` },
    subscription: {
      id: 1200 - index,
      status: status === 'confirmed' ? 'active' : status,
      plan_type: plan,
      expires_at: isoDate(index - (plan === 'monthly' ? 30 : 7)),
      group: { id: (index % 5) + 1, name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} ${index % 3 === 0 ? '5 Odds' : 'VIP'}`, odds_type: index % 3 === 0 ? '5' : '2' }
    }
  }
})

const chart = [82000, 144000, 97000, 186000, 121000, 234000, 178000, 205000, 262000, 191000, 316000, 284000, 339000, 248000]
  .map((amount, index) => ({ date: isoDate(13 - index).slice(0, 10), amount }))

const overview = {
  finance: { revenue_today: 316000, revenue_this_month: 4127000, pending_payments: 6, failed_payments: 5 },
  customers: { members: 2847, active_subscriptions: 734 },
  wallet: { available: 2340000, reserved: 185000, pending_payouts: 2 },
  attention: { support_waiting: 7 },
  chart,
  recent_payments: payments.slice(0, 5),
  as_of: new Date().toISOString(),
  timezone: 'Africa/Kampala'
}

const financialReport = {
  range: { period: 'month', from: isoDate(29).slice(0, 10), to: isoDate(0).slice(0, 10) },
  timezone: 'Africa/Kampala', generated_at: new Date().toISOString(),
  summary: { attempted_count: 184, attempted_amount: 6425000, confirmed_count: 169, confirmed_revenue: 5875000, confirmation_rate: 91.8, average_payment: 34763, pending_amount: 185000, failed_amount: 365000 },
  trend: chart,
  breakdowns: {
    status: [{ label: 'confirmed', count: 169, amount: 5875000 }, { label: 'pending', count: 6, amount: 185000 }, { label: 'failed', count: 9, amount: 365000 }],
    method: [{ label: 'mtn', count: 106, amount: 3685000 }, { label: 'airtel', count: 78, amount: 2740000 }],
    plan: [{ label: 'daily', count: 82, amount: 820000 }, { label: 'weekly', count: 51, amount: 1275000 }, { label: 'monthly', count: 32, amount: 3200000 }, { label: 'special', count: 19, amount: 1130000 }],
    gateway: [{ label: 'jpesa', count: 133, amount: 4680000 }, { label: 'relworx', count: 51, amount: 1745000 }]
  },
  wallet: { available: 2340000, reserved: 185000 },
  payouts: [{ status: 'completed', count: 4, amount: 1600000 }, { status: 'pending', count: 2, amount: 480000 }]
}

const previewUsers = Array.from({ length: 27 }, (_, index) => ({
  id: 500 - index, username: names[index % names.length], phone: `0701${String(820000 + index).slice(-6)}`,
  scam_warning: index === 8, blacklisted: index === 17, created_at: isoDate(index),
  subscriptions: index % 4 === 3 ? [] : [{ id: 700 - index, status: index % 5 === 2 ? 'pending' : 'active', plan_type: plans[index % plans.length], expires_at: isoDate(-(7 + index)) }]
}))

const groups = [
  { id: 1, name: 'Daily Odd 5', oddsType: '5', planType: 'daily', price: 15000, isActive: true, subscriptionDeadline: null, betslipCode: 'DEMO-D5' },
  { id: 2, name: 'Weekly Odd 5', oddsType: '5', planType: 'weekly', price: 60000, isActive: true, subscriptionDeadline: null, betslipCode: 'DEMO-W5' },
  { id: 3, name: 'Big Staker Weekly Odd 2', oddsType: '2', planType: 'weekly', price: 50000, isActive: true, subscriptionDeadline: null, betslipCode: 'DEMO-BS2' },
  { id: 4, name: 'Monthly Odd 1.5', oddsType: '1.5', planType: 'monthly', price: 45000, isActive: true, subscriptionDeadline: null, betslipCode: 'DEMO-M15' },
  { id: 5, name: 'Special Odds', oddsType: 'special', planType: 'special', price: 0, specialPrice: 18000, specialOdds: '4.35', isSpecial: true, isActive: true, subscriptionDeadline: null, betslipCode: 'DEMO-SPECIAL' }
]
const predictions = [
  { id: 1, home: 'Arsenal', away: 'Brentford', competition: 'Premier League', kickoff: '18:30', tip: 'Home win', odds: '1.72', result: 'pending' },
  { id: 2, home: 'Atalanta', away: 'Lazio', competition: 'Serie A', kickoff: '21:45', tip: 'Over 1.5 goals', odds: '1.41', result: 'won' },
  { id: 3, home: 'Girona', away: 'Getafe', competition: 'La Liga', kickoff: '20:00', tip: 'Girona draw no bet', odds: '1.58', result: 'pending' }
]
const mediaEntries = {
  tips: [{ id: 1, caption: 'Today’s carefully selected Daily Odd 5 accumulator', winProb: 78, groupId: 1, imageUrl: '' }, { id: 2, caption: 'Weekly Odd 5 value selections for consistent players', winProb: 74, groupId: 2, imageUrl: '' }, { id: 3, caption: 'Big Staker Weekly Odd 2 high-confidence selection', winProb: 81, groupId: 3, imageUrl: '' }, { id: 4, caption: 'Monthly Odd 1.5 package preview', winProb: 84, groupId: 4, imageUrl: '' }, { id: 5, caption: 'Today’s Special Odds package at 4.35 total odds', winProb: 76, groupId: 5, imageUrl: '' }],
  wins: [{ id: 1, caption: 'Weekly VIP ticket landed at 6.48 total odds', member_name: 'Amina K.', returned: 'UGX 324,000', odds: '6.48', imageUrl: '' }, { id: 2, caption: 'Daily double confirmed before full time', member_name: 'Daniel O.', returned: 'UGX 86,000', odds: '2.15', imageUrl: '' }],
  testimonials: [{ id: 1, caption: 'The updates are clear and the daily package fits my routine.', member_name: 'Ruth A.', imageUrl: '' }, { id: 2, caption: 'Support helped me confirm my subscription in minutes.', member_name: 'Brian M.', imageUrl: '' }]
}
const conversations = Array.from({ length: 18 }, (_, index) => ({ id: 800 - index, status: index > 13 ? 'resolved' : 'open', mode: index % 4 === 0 ? 'human' : 'ai', category: index % 3 === 0 ? 'payment' : 'subscription', priority: index % 5 === 0 ? 'high' : 'normal', summary: index % 3 === 0 ? 'Payment pending after mobile money approval' : 'Question about package access', messages_count: 3 + (index % 5), last_message_at: isoDate(Math.floor(index / 4)), contact: { display_name: names[index % names.length], phone: `0701${String(820000 + index).slice(-6)}` } }))
const conversationDetail = item => ({ ...item, messages: [{ id: 1, direction: 'inbound', sender_type: 'customer', body: item.summary, sent_at: item.last_message_at, attachments: [] }, { id: 2, direction: 'outbound', sender_type: item.mode === 'human' ? 'admin' : 'assistant', body: 'I have checked your account. Your payment is visible and we are confirming the final provider status.', sent_at: new Date().toISOString(), attachments: [] }] })

const paginated = (rows, config, perPageKey = 'per_page') => {
  const params = config.params || {}; const page = Math.max(1, Number(params.page || 1)); const perPage = Number(params[perPageKey] || 10); const q = String(params.search || '').toLowerCase()
  const filtered = q ? rows.filter(row => JSON.stringify(row).toLowerCase().includes(q)) : rows
  const start = (page - 1) * perPage; const data = filtered.slice(start, start + perPage)
  return { data, current_page: page, last_page: Math.max(1, Math.ceil(filtered.length / perPage)), per_page: perPage, total: filtered.length, from: data.length ? start + 1 : null, to: data.length ? start + data.length : null }
}

const report = {
  summary: { totalPayments: 184, totalAmount: 6425000, confirmedPayments: 169, confirmedAmount: 5875000 },
  byStatus: [
    { status: 'confirmed', count: 169, amount: 5875000 },
    { status: 'pending', count: 6, amount: 185000 },
    { status: 'failed', count: 9, amount: 365000 }
  ],
  byMethod: [], byPlan: []
}

const filteredPayments = config => {
  const params = config.params || {}
  const page = Math.max(1, Number(params.page || 1))
  const perPage = [10, 25, 50].includes(Number(params.per_page)) ? Number(params.per_page) : 10
  const search = String(params.search || '').toLowerCase()
  let rows = [...payments]
  if (params.period === 'today') rows = rows.filter(row => row.created_at.slice(0, 10) === isoDate(0).slice(0, 10))
  if (params.subscription_id) rows = rows.filter(row => row.subscription_id === Number(params.subscription_id))
  if (params.status) rows = rows.filter(row => row.status === params.status)
  if (search) rows = rows.filter(row => [row.user.username, row.user.phone, row.payment_reference, row.transaction_id].some(value => String(value || '').toLowerCase().includes(search)))
  const total = rows.length
  const start = (page - 1) * perPage
  const data = rows.slice(start, start + perPage)
  return { data, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total, from: data.length ? start + 1 : null, to: data.length ? start + data.length : null }
}

export const createAdminPreviewResponse = config => {
  const url = String(config.url || '').split('?')[0]
  let data = {}
  if (url.endsWith('/api/admin/overview')) data = overview
  else if (url.endsWith('/api/admin/financial-report/export')) data = 'Attempted at,Customer,Phone,Reference,Plan,Status,Amount\n2026-11-15T10:18:00Z,Amina Kato,0701820000,ALX-88210,daily,confirmed,10000\n'
  else if (url.endsWith('/api/admin/financial-report')) data = financialReport
  else if (url.endsWith('/api/notifications/unread-count')) data = { count: 3 }
  else if (url.endsWith('/api/notifications')) data = []
  else if (url.endsWith('/api/payments/report')) data = report
  else if (/\/api\/payments\/\d+$/.test(url)) data = payments.find(row => url.endsWith(`/api/payments/${row.id}`)) || payments[0]
  else if (url.endsWith('/api/payments')) data = filteredPayments(config)
  else if (url.includes('/api/payments/reconcile')) data = { message: 'Preview payment updated.', subscription: payments[0].subscription }
  else if (url.includes('/api/subscriptions/')) data = { ...payments[0].subscription, status: 'active' }
  else if (url.endsWith('/api/admin/wallet')) data = { wallet: overview.wallet, requests: [], minimum_payout: 500, destination_configured: true, execution_mode: 'request_only' }
  else if (url.endsWith('/api/users')) data = paginated(previewUsers, config)
  else if (url.endsWith('/api/groups/admin')) data = groups
  else if (url.endsWith('/api/almax-predictions')) data = predictions
  else if (url.endsWith('/api/football-tips')) data = mediaEntries.tips
  else if (url.endsWith('/api/recent-wins')) data = mediaEntries.wins
  else if (url.endsWith('/api/testimonials')) data = mediaEntries.testimonials
  else if (url.endsWith('/api/config/free-odd2')) data = { caption: 'Today’s free selection: Arsenal to win · 1.72 odds', imageUrl: '' }
  else if (url.endsWith('/api/config/vip-config')) data = { ad_media_type: 'link', ad_media_url: 'https://almaxpredictions.com' }
  else if (url.endsWith('/api/package-releases')) data = []
  else if (url.endsWith('/api/support/admin/conversations')) data = paginated(conversations.filter(item => !config.params?.status || item.status === config.params.status), config)
  else if (/\/api\/support\/admin\/conversations\/\d+$/.test(url)) { const id = Number(url.split('/').pop()); data = conversationDetail(conversations.find(item => item.id === id) || conversations[0]) }
  else if (url.includes('/api/support/admin')) data = {}
  return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config, request: null })
}
